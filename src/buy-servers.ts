import { NS } from '@ns';

/**
 * Buy servers.
 */

/** @param {NS} ns */
export async function main(ns: NS) {
  ns.disableLog('ALL');

  // batch-manager.js requires at least 3000 GB of RAM for many targets
  // don't bother spending on purchased servers until we can afford that much RAM
  const ram = 4096;

  // eslint-disable-next-line
  while (true) {
    const money = ns.getServerMoneyAvailable('home');
    const cost = ns.getPurchasedServerCost(ram);
    if (money > cost) {
      const hostname = ns.purchaseServer(`local-0`, ram);
      if (hostname === '') {
        break;
      }

      ns.scp(
        [
          'hack.js',
          'grow.js',
          'weaken.js',
          'run-batches.js',
          'prepare.js',
          'hgw-batch.js',
        ],
        hostname,
      );

      ns.tprintf('BUY: purchased %s', hostname);
    } else {
      ns.printf('INFO: next server purchase requires %d money', cost);
    }

    await ns.sleep(1000);
  }

  // now that we've bought all the servers, start the upgrade script
  ns.run('upgrade-servers.js');
}
