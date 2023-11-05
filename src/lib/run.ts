import { NS } from '@ns';
import { DEBUG } from './constants';

export type RunnableServer = {
  hostname: string;
  cpuCores: number;
  ramUsed: number;
  maxRam: number;
};

// get servers, sorted by amount of RAM available
export function getRunnableServers(ns: NS, includeHome?: boolean) {
  const servers = [
    ...(includeHome ? ['home'] : []),
    ...ns.getPurchasedServers(),
  ].map((s): RunnableServer => {
    return {
      hostname: s,
      cpuCores: ns.getServer(s).cpuCores,
      maxRam: ns.getServerMaxRam(s),
      ramUsed: ns.getServerUsedRam(s),
    };
  });
  servers.sort((a, b) => {
    const availA = a.maxRam - a.ramUsed;
    const availB = b.maxRam - b.ramUsed;
    return availB - availA;
  });
  return servers;
}

export function findWhereFits(
  ns: NS,
  servers: Array<RunnableServer>,
  totalRam: number,
): RunnableServer | null {
  for (let i = 0; i < servers.length; i++) {
    const availRam = servers[i].maxRam - servers[i].ramUsed;
    if (DEBUG) {
      ns.tprintf(
        'checking server %s: %.2f vs %.2f < %.2f?',
        servers[i].hostname,
        servers[i].maxRam,
        servers[i].ramUsed,
        totalRam,
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
export function runWhereFits(
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
      'WARN: script %s needing %d RAM does not fit anywhere',
      script,
      totalRam,
    );
    return 0;
  }

  return ns.exec(script, server.hostname, threads, ...args, server.cpuCores);
}

export async function killallOnServer(ns: NS, server: string) {
  // make sure we're the only show in town
  while (ns.scriptKill('run-batches.js', server)) {
    await ns.sleep(1000);
  }

  while (ns.scriptKill('hgw-batch.js', server)) {
    await ns.sleep(1000);
  }

  while (ns.scriptKill('prepare.js', server)) {
    await ns.sleep(1000);
  }

  while (ns.scriptKill('grow.js', server)) {
    await ns.sleep(1000);
  }

  while (ns.scriptKill('hack.js', server)) {
    await ns.sleep(1000);
  }

  while (ns.scriptKill('weaken.js', server)) {
    await ns.sleep(1000);
  }
}

export function allDone(ns: NS, pids: Array<number | null>) {
  return (
    pids.map((p) => p !== null && ns.isRunning(p)).filter((p) => p).length === 0
  );
}
