import { NS } from '@ns';

/**
 * Update scripts on remote purchased servers.
 */

/** @param {NS} ns */
export async function main(ns: NS) {
  ns.getPurchasedServers().forEach((host) => {
    ns.tprintf('updating script on %s', host);
    ns.scp(
      [
        'grow.js',
        'hack.js',
        'weaken.js',
        'run-batches.js',
        'prepare.js',
        'hgw-batch.js',
      ],
      host,
    );
  });
}
