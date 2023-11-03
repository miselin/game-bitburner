import { NS } from "@ns";

type Host = {
  name: string;
  money: number;
  currentMoney: number;
  level: number;
  securityLevel: number;
  minSecurityLevel: number;
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

  // eslint-disable-next-line
  while (true) {
    // put the lowest level target on home
    const servers = ["home", ...ns.getPurchasedServers()];

    const me = ns.getHostname();

    // enumerate all the potential machines out there
    const machines = new Set([me]);
    scanHost(ns, me, machines);

    const myHackingLevel = ns.getHackingLevel();

    // get info about them
    const hosts: Array<Host> = [];
    machines.forEach((host) => {
      const maxMoney = ns.getServerMaxMoney(host);
      const currentMoney = ns.getServerMoneyAvailable(host);
      const hackingLevel = ns.getServerRequiredHackingLevel(host);
      const securityLevel = ns.getServerSecurityLevel(host);
      const minSecurityLevel = ns.getServerMinSecurityLevel(host);

      // · As a rule of thumb, your hacking target should be the server with highest max money that's required hacking level is under 1/2 of your hacking level.

      // should only target hosts that are at most 50% of our hacking level
      if (hackingLevel * 2.0 > myHackingLevel) {
        return;
      }

      if (maxMoney === 0) {
        return;
      }

      if (!ns.hasRootAccess(host)) {
        return;
      }

      hosts.push({
        name: host,
        money: maxMoney,
        currentMoney: currentMoney,
        level: hackingLevel,
        securityLevel,
        minSecurityLevel,
      });
    });

    hosts.sort((a, b) => a.money - b.money);

    let offset = servers.length == 26 ? hosts.length - servers.length : 0;
    if (offset < 0) {
      offset = 0;
    }

    for (let i = 0; i < servers.length; i++) {
      const host = hosts[i + offset];
      if (!host) {
        // server can't run anything
        // need to do this in case of a shift in server list length so we don't have duplicate processes
        if (servers[i] !== "home") {
          await killallOnServer(ns, servers[i]);
        }
        continue;
      }

      ns.printf("INFO: want server %s to target %s", servers[i], host.name);

      ns.scp(["run-batches.js", "hgw-batch.js"], servers[i]);
      const running = ns.getRunningScript(
        "run-batches.js",
        servers[i],
        host.name
      );
      if (running) {
        // if the top 25 shifts, we might need to terminate an old batch that is no longer in the list
        if (running.args[0] === host.name) {
          continue;
        }
      }

      // make sure we're the only show in town
      await killallOnServer(ns, servers[i]);

      ns.printf(
        "INFO: now running batches on %s, targeting %s",
        servers[i],
        host.name
      );
      ns.exec("run-batches.js", servers[i], 1, host.name);
    }

    await ns.sleep(5000);
  }
}
