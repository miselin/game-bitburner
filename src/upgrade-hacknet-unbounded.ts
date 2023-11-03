import { NS } from "@ns";

/**
 * Upgrade the hacknet node RAM/CPUs (it's expected they're at level 100 already)
 *
 * Won't stop until they're 100% upgraded.
 */

export async function main(ns: NS) {
  // eslint-disable-next-line
  while (true) {
    let purchased = false;
    let atMax = 0;
    for (let i = 0; i < ns.hacknet.numNodes(); i++) {
      if (
        ns.getServerMoneyAvailable("home") >
        ns.hacknet.getLevelUpgradeCost(i, 1)
      ) {
        if (!ns.hacknet.upgradeLevel(i, 1)) {
          atMax++;
        } else {
          purchased = true;
        }
      }

      if (
        ns.getServerMoneyAvailable("home") > ns.hacknet.getCoreUpgradeCost(i, 1)
      ) {
        if (!ns.hacknet.upgradeCore(i, 1)) {
          atMax++;
        } else {
          purchased = true;
        }
      }

      if (
        ns.getServerMoneyAvailable("home") > ns.hacknet.getRamUpgradeCost(i, 1)
      ) {
        if (!ns.hacknet.upgradeRam(i, 1)) {
          atMax++;
        } else {
          purchased = true;
        }
      }
    }

    if (atMax >= ns.hacknet.numNodes() * 3) {
      break;
    }

    await ns.sleep(purchased ? 50 : 1000);
  }
}
