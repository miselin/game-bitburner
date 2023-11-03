import { NS } from "@ns";

/**
 * Upgrade servers that we already own to 128 GB of RAM
 */

export async function main(ns: NS) {
  let targetRam = 1024;

  // eslint-disable-next-line
  while (true) {
    // eslint-disable-next-line
    while (true) {
      let stillNeedingUpdate = 0;
      const servers = ns.getPurchasedServers();
      for (let i = 0; i < servers.length; i++) {
        if (ns.getServerMaxRam(servers[i]) < targetRam) {
          stillNeedingUpdate++;

          ns.printf("want to upgrade %s if we have enough money", servers[i]);

          if (
            ns.getServerMoneyAvailable("home") >
            ns.getPurchasedServerUpgradeCost(servers[i], targetRam)
          ) {
            ns.tprintf("UPGR: upgrading %s to %dGB", servers[i], targetRam);
            ns.upgradePurchasedServer(servers[i], targetRam);
          }
        }
      }

      // 100% of servers are at 128G of RAM!
      if (stillNeedingUpdate === 0) {
        break;
      }

      await ns.sleep(10000);
    }

    // once all the servers hit the original RAM target (128 GB), keep doubling to maximize them
    targetRam *= 2;

    // finish up once we hit max RAM
    if (targetRam > ns.getPurchasedServerMaxRam()) {
      return;
    }

    ns.printf("increased target RAM for all servers to %d", targetRam);
  }
}
