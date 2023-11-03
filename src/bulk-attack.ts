import { NS } from "@ns";

/**
 * Use the "home" server to attack another server.
 */

type PidMap = {
  weaken: number | null;
  grow: number | null;
  hack: number | null;
};

export async function main(ns: NS) {
  ns.disableLog("ALL");

  const target = ns.args[0] as string;

  if (ns.args[1] && typeof ns.args[1] !== "string") {
    throw new Error("second arg must be a hostname if provided");
  }
  const host = ns.args[1] ? (ns.args[1] as string) : "home";

  const pids: PidMap = { weaken: null, grow: null, hack: null };

  // eslint-disable-next-line
  while (true) {
    // 1T of RAM split 3 ways
    const threads = Math.floor(ns.getServerMaxRam(host) / 3 / 2);
    if (threads === 0) {
      ns.printf("not enough ram on host %s", host);
    } else {
      if (pids.weaken === null) {
        pids.weaken = ns.exec("weaken.js", host, threads, target);
      } else if (!ns.isRunning(pids.weaken, host)) {
        pids.weaken = null;
      }

      if (pids.grow === null) {
        pids.grow = ns.exec("grow.js", host, threads, target);
      } else if (!ns.isRunning(pids.grow, host)) {
        pids.grow = null;
      }

      if (pids.hack === null) {
        pids.hack = ns.exec("hack.js", host, threads, target);
      } else if (!ns.isRunning(pids.hack, host)) {
        pids.hack = null;
      }
    }

    await ns.sleep(1000);
  }
}
