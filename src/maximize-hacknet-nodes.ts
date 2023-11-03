import { NS } from '@ns';

/**
 * Upgrade the hacknet node RAM/CPUs (it's expected they're at level 100 already)
 */

export async function main(ns: NS) {
  // eslint-disable-next-line
  while (true) {
    let purchased = false;
    if (ns.getServerMoneyAvailable('home') > ns.hacknet.getPurchaseNodeCost()) {
      if (ns.hacknet.purchaseNode() === -1) {
        break;
      }

      ns.tprint('HACKNET: purchased node');
      purchased = true;
    }
    await ns.sleep(purchased ? 50 : 1000);
  }
}
