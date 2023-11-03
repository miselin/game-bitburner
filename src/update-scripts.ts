import { NS } from "@ns";

/**
 * Update scripts on remote servers that we have access to.
 */

function scanHost(ns: NS, host: string, machineList: Set<string>) {
  ns.scan(host).forEach((peer) => {
    if (machineList.has(peer)) {
      return;
    }

    machineList.add(peer);

    scanHost(ns, peer, machineList);
  });
}

/** @param {NS} ns */
export async function main(ns: NS) {
  const me = ns.getHostname();

  // enumerate all the potential machines out there
  const machines = new Set([me]);
  scanHost(ns, me, machines);

  machines.forEach((host) => {
    if (!ns.hasRootAccess(host)) {
      return;
    }

    ns.tprintf("updating script on %s", host);
    ns.scp(["grow.js", "hack.js", "weaken.js"], host);
  });
}
