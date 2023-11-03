import { NS } from '@ns';

/**
 * Buy servers.
 */

/** @param {NS} ns */
export async function main(ns: NS) {
  // in early game, only buy servers if they're bigger than home
  // that gives us money to upgrade home which is a better investment for my set of scripts
  const homeRam = ns.getServerMaxRam('home');
  const ram = homeRam > 512 ? 512 : 128;

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
