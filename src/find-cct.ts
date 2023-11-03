import { NS } from "@ns";

function scanHost(ns: NS, host: string, machineList: Set<string>) {
  ns.scan(host).forEach((peer) => {
    if (machineList.has(peer)) {
      return;
    }

    machineList.add(peer);

    scanHost(ns, peer, machineList);
  });
}

export async function main(ns: NS) {
  const me = ns.getHostname();

  const machines = new Set([me]);
  scanHost(ns, me, machines);

  machines.forEach((host) => {
    const result = ns.ls(host, ".cct");
    if (result.length > 0) {
      ns.tprintf("found on %s: %v", host, result);
    }
  });
}
