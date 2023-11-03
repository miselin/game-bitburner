import { NS } from "@ns";

/**
 * Kill all scripts on remote purchased servers.
 */

/** @param {NS} ns */
export async function main(ns: NS) {
  ns.getPurchasedServers().forEach((host) => {
    ns.tprintf("killing all scripts on %s", host);
    ns.killall(host);
  });
}
