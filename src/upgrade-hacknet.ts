import { NS } from '@ns';

/**
 * Purchase hacknet nodes and upgrade them to an initially useful level
 * Gets cash flowing while the rest of the scripts ramp up.
 */

const TARGET_LEVEL = 25;

export async function main(ns: NS) {
  // First, make sure we have 10 hacknet nodes
  while (ns.hacknet.numNodes() < 10) {
    if (ns.getServerMoneyAvailable('home') > ns.hacknet.getPurchaseNodeCost()) {
      ns.hacknet.purchaseNode();

      ns.tprint('HACKNET: purchased node');
    }
    await ns.sleep(1000);
  }

  // Then, make sure they all hit the same level
  // eslint-disable-next-line
  while (true) {
    let atTarget = 0;
    for (let i = 0; i < 10; i++) {
      const stats = ns.hacknet.getNodeStats(i);
      if (stats.level >= TARGET_LEVEL) {
        atTarget++;
        continue;
      }

      let level = stats.level;

      while (
        ns.getServerMoneyAvailable('home') >
          ns.hacknet.getLevelUpgradeCost(i, 1) &&
        level < TARGET_LEVEL
      ) {
        ns.tprintf('HACKNET: upgraded node %d', i);
        ns.hacknet.upgradeLevel(i, 1);
        level++;
      }
    }

    if (atTarget >= 10) {
      break;
    }

    await ns.sleep(1000);
  }

  // don't go too crazy with hacknet nodes until we get a few home upgrades
  const homeRam = ns.getServerMaxRam('home');
  if (homeRam > 128) {
    ns.run('upgrade-hacknet-unbounded.js');
    ns.run('maximize-hacknet-nodes.js');
  }
}
