import { NS } from "@ns";

/**
 * Use the "home" server to tell all purchased servers to hack a target.
 */

export async function main(ns: NS) {
  ns.scriptKill("bulk-attack.js", "home");

  const servers = ns.getPurchasedServers();
  servers.forEach((server) => {
    ns.killall(server);
    ns.run("bulk-attack.js", 1, ns.args[0], server);
  });
}
