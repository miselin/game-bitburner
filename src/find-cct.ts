import { NS } from '@ns';
import { getAllHosts } from './lib/hosts';

/**
 * Finds all coding contracts across all the machines in the network
 */

export async function main(ns: NS) {
  getAllHosts(ns).forEach((host) => {
    const result = ns.ls(host, '.cct');
    if (result.length > 0) {
      ns.tprintf('found on %s: %v', host, result);
    }
  });
}
