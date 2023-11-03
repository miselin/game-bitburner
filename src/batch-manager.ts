import { NS } from "@ns";
import { growThreads, weakenThreads } from "./prepare";
import { analyzeTarget, GAP } from "./hgw-batch";

const DEBUG = false;

type RunnableServer = {
  hostname: string;
  cpuCores: number;
  ramUsed: number;
  maxRam: number;
};

type Host = {
  name: string;
  money: number;
  currentMoney: number;
  level: number;
  securityLevel: number;
  minSecurityLevel: number;
  prepared: boolean;
  currentlyPreparing: boolean;
  ramPerBatch: number;
  moneyPerMs: number;
  retryAfter: number;
  retryMs: number;
};

function scanHost(ns: NS, host: string, machineList: Set<string>) {
  ns.scan(host).forEach((peer) => {
    if (machineList.has(peer)) {
      return;
    }

    machineList.add(peer);

    scanHost(ns, peer, machineList);
  });
}

function findWhereFits(
  ns: NS,
  servers: Array<RunnableServer>,
  totalRam: number
): RunnableServer | null {
  for (let i = 0; i < servers.length; i++) {
    const availRam = servers[i].maxRam - servers[i].ramUsed;
    if (DEBUG) {
      ns.tprintf(
        "checking server %s: %.2f vs %.2f < %.2f?",
        servers[i].hostname,
        servers[i].maxRam,
        servers[i].ramUsed,
        totalRam
      );
    }
    if (availRam < totalRam) {
      continue;
    }

    return servers[i];
  }

  return null;
}

// Run the given script on the first server where it fits.
function runWhereFits(
  ns: NS,
  servers: Array<RunnableServer>,
  script: string,
  threads: number,
  totalRam: number,
  ...args: (string | number | boolean)[]
) {
  const server = findWhereFits(ns, servers, totalRam);
  if (server === null) {
    ns.printf(
      "WARN: script %s needing %d RAM does not fit anywhere",
      script,
      totalRam
    );
    return 0;
  }

  return ns.exec(script, server.hostname, threads, ...args, server.cpuCores);
}

export async function killallOnServer(ns: NS, server: string) {
  // make sure we're the only show in town
  while (ns.scriptKill("run-batches.js", server)) {
    await ns.sleep(1000);
  }

  while (ns.scriptKill("hgw-batch.js", server)) {
    await ns.sleep(1000);
  }

  while (ns.scriptKill("prepare.js", server)) {
    await ns.sleep(1000);
  }

  while (ns.scriptKill("grow.js", server)) {
    await ns.sleep(1000);
  }

  while (ns.scriptKill("hack.js", server)) {
    await ns.sleep(1000);
  }

  while (ns.scriptKill("weaken.js", server)) {
    await ns.sleep(1000);
  }
}

export async function main(ns: NS) {
  ns.disableLog("ALL");

  // General algo, looping forever
  // 1. Check targets
  // 2. If we have new targets that aren't prepared yet, run a prepare
  // 3. For the highest value target, run a batch
  // 4. Wait for TIME_BETWEEN_BATCH time

  const hostData: Record<string, Host> = {};

  let batch = 0;

  // when starting the manager, clear out everything else on this server
  await killallOnServer(ns, ns.getHostname());

  // eslint-disable-next-line
  while (true) {
    // get servers, sorted by amount of RAM available
    const servers = ["home", ...ns.getPurchasedServers()].map(
      (s): RunnableServer => {
        return {
          hostname: s,
          cpuCores: ns.getServer(s).cpuCores,
          maxRam: ns.getServerMaxRam(s),
          ramUsed: ns.getServerUsedRam(s),
        };
      }
    );
    servers.sort((a, b) => {
      const availA = a.maxRam - a.ramUsed;
      const availB = b.maxRam - b.ramUsed;
      return availB - availA;
    });

    // enumerate all the potential machines out there
    const machines = new Set(["home"]);
    scanHost(ns, "home", machines);

    const myHackingLevel = ns.getHackingLevel();

    // get info about them
    machines.forEach((host) => {
      const maxMoney = ns.getServerMaxMoney(host);
      const currentMoney = ns.getServerMoneyAvailable(host);
      const hackingLevel = ns.getServerRequiredHackingLevel(host);
      const securityLevel = ns.getServerSecurityLevel(host);
      const minSecurityLevel = ns.getServerMinSecurityLevel(host);

      if (hackingLevel * 2.0 > myHackingLevel) {
        return;
      }

      if (maxMoney === 0) {
        return;
      }

      if (!ns.hasRootAccess(host)) {
        return;
      }

      const { totalThreads, weakenTime } = analyzeTarget(ns, host, 1);

      if (!hostData[host]) {
        hostData[host] = {
          name: host,
          money: maxMoney,
          currentMoney: currentMoney,
          level: hackingLevel,
          securityLevel,
          minSecurityLevel,
          prepared:
            currentMoney === maxMoney && securityLevel === minSecurityLevel,
          currentlyPreparing: false,
          ramPerBatch: totalThreads * 2 + ns.getScriptRam("hgw-batch.js"),
          moneyPerMs: (maxMoney * 0.5) / (weakenTime + 2 * GAP),
          retryAfter: 0,
          retryMs: 5000,
        };
      }

      hostData[host].money = maxMoney;
      hostData[host].currentMoney = currentMoney;
      hostData[host].securityLevel = securityLevel;
      hostData[host].minSecurityLevel = minSecurityLevel;
      hostData[host].ramPerBatch =
        totalThreads * 2 + ns.getScriptRam("hgw-batch.js");

      if (!hostData[host].prepared && Date.now() > hostData[host].retryAfter) {
        if (currentMoney === maxMoney && securityLevel === minSecurityLevel) {
          ns.tprintf("INFO: batch-manager has successfully prepared %s", host);
          hostData[host].prepared = true;
        } else if (!hostData[host].currentlyPreparing) {
          ns.tprintf("INFO: batch-manager is preparing %s", host);

          const grows = growThreads(ns, host);
          const weakens = weakenThreads(ns, host);
          const ram = (grows + weakens) * 2 + ns.getScriptRam("prepare.js");
          const pid = runWhereFits(ns, servers, "prepare.js", 1, ram, host);
          if (pid) {
            hostData[host].currentlyPreparing = true;
          } else {
            ns.tprintf(
              "WARN: batch-manager could not prepare %s, will try again in %.2f seconds",
              host,
              hostData[host].retryMs / 1000
            );
            hostData[host].retryAfter = Date.now() + hostData[host].retryMs;
            hostData[host].retryMs *= 2;
            // cap the max retry to 1 minute
            if (hostData[host].retryMs > 60000) {
              hostData[host].retryMs = 60000;
            }
          }
        }
      }
    });

    const candidateHosts = Object.values(hostData).filter((h) => h.prepared);

    candidateHosts.sort((a, b) => b.moneyPerMs - a.moneyPerMs);

    // keep trying backup options for target until we find one that fits
    let found = false;
    for (let i = 0; i < candidateHosts.length; i++) {
      const pid = runWhereFits(
        ns,
        servers,
        "hgw-batch.js",
        1,
        candidateHosts[i].ramPerBatch,
        candidateHosts[i].name,
        batch++
      );

      if (pid > 0) {
        found = true;
        break;
      }
    }

    // sleep for a tiny bit longer if we couldn't fit any batches anywhere
    // this is just better for the host CPU, no real benefit
    if (!found) {
      await ns.sleep(1000);
      continue;
    }

    await ns.sleep(GAP * 4);
  }
}
