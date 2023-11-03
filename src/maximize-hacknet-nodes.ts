import { NS } from "@ns";

/**
 * Upgrade the hacknet node RAM/CPUs (it's expected they're at level 100 already)
 */

export async function main(ns: NS) {
  // eslint-disable-next-line
  while (true) {
    let purchased = false;
    if (ns.getServerMoneyAvailable("home") > ns.hacknet.getPurchaseNodeCost()) {
      if (ns.hacknet.purchaseNode() === -1) {
        break;
      }

      ns.tprint("HACKNET: purchased node");
      purchased = true;
    }
    await ns.sleep(purchased ? 50 : 1000);
  }

  return;

  // eslint-disable-next-line
  while (true) {
    let purchased = false;
    let atMax = 0;
    for (let i = 0; i < 10; i++) {
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

    if (atMax >= 30) {
      break;
    }

    await ns.sleep(purchased ? 50 : 1000);
  }
}
