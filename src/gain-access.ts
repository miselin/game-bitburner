import { NS } from "@ns";
import { getAllHosts, hasRootP } from "./lib/hosts";

/**
 * Loop forever, trying to gain access to machines that we don't yet have root on.
 */

export async function main(ns: NS) {
  // eslint-disable-next-line
  while (true) {
    // enumerate all the potential machines out there
    getAllHosts(ns)
      .filter(hasRootP(ns))
      .forEach((host) => {
        try {
          ns.brutessh(host);
          ns.ftpcrack(host);
          ns.relaysmtp(host);
          ns.httpworm(host);
          ns.sqlinject(host);
        } catch {
          console.error("failed - probably do not yet have the program");
        }

        try {
          ns.nuke(host);
        } catch {
          // ignore
        }

        // nuke didn't work, probs not enough ports yet
        if (!ns.hasRootAccess(host)) {
          return;
        }

        ns.scp(["hack.js", "grow.js", "weaken.js"], host);

        ns.tprintf("GAIN: acquired root access to %s", host);
      });

    await ns.sleep(10000);
  }
}
