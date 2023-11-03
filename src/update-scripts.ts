import { NS } from '@ns';
import { analyzeHackableHosts } from './lib/hosts';

/**
 * Update scripts on remote servers that we have access to.
 */

/** @param {NS} ns */
export async function main(ns: NS) {
  analyzeHackableHosts(ns).forEach((host) => {
    ns.tprintf('updating script on %s', host.name);
    ns.scp(['grow.js', 'hack.js', 'weaken.js'], host.name);
  });
}
