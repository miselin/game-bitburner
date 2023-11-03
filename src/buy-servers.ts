import { NS } from '@ns';

/**
 * Buy servers.
 */

/** @param {NS} ns */
export async function main(ns: NS) {
  const ram = 512;

  // eslint-disable-next-line
  while (true) {
    if (ns.getServerMoneyAvailable('home') > ns.getPurchasedServerCost(ram)) {
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
    }

    await ns.sleep(1000);
  }

  // now that we've bought all the servers, start the upgrade script
  ns.run('upgrade-servers.js');
}
