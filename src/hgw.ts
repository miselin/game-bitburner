import { NS } from "@ns";

export const colors = {
  black: "\u001b[30m",
  red: "\u001b[31m",
  green: "\u001b[32m",
  yellow: "\u001b[33m",
  blue: "\u001b[34m",
  magenta: "\u001b[35m",
  cyan: "\u001b[36m",
  white: "\u001b[37m",
  brightBlack: "\u001b[30;1m",
  brightRed: "\u001b[31;1m",
  brightGreen: "\u001b[32;1m",
  brightYellow: "\u001b[33;1m",
  brightBlue: "\u001b[34;1m",
  brightMagenta: "\u001b[35;1m",
  brightCyan: "\u001b[36;1m",
  brightWhite: "\u001b[37;1m",
  default: "\u001b[0m",
};

// at this percent, we'll hack instead of grow
const MONEY_THRESHOLD = 0.9;

// percent of max money to keep on the target to avoid overhacking
// early on this should be close to MONEY_THRESHOLD, later on this can
// shift when there's RAM to burn on grow()s
const MINIMUM_REMAINING_MONEY = 0.25;

const PERCENT_HACK = (MONEY_THRESHOLD - MINIMUM_REMAINING_MONEY) * 100;

function printTargetStats(ns: NS, target: string) {
  ns.tprintf("\n== HGW analyze %s ==", target);

  const growthThreads = growThreads(ns, target);

  ns.tprintf(
    "- need %d grow threads (%.2f seconds)",
    growthThreads,
    ns.getGrowTime(target) / 1000
  );

  const threadsToWeaken = weakenThreads(ns, target);

  ns.tprintf(
    "- need %d weaken threads (%.2f seconds)",
    threadsToWeaken,
    ns.getWeakenTime(target) / 1000
  );

  const hacksForFiftyPercent = hacksNeededForPercent(ns, target, PERCENT_HACK);

  ns.tprintf(
    "- need %d hack threads to take %d%% (%.2f seconds)",
    hacksForFiftyPercent,
    PERCENT_HACK,
    ns.getHackTime(target) / 1000
  );

  ns.tprintf("\n");
}

function printServerStats(ns: NS, servers: Array<Server>) {
  const totalThreads =
    servers
      .map((server) => ns.getServerMaxRam(server.name))
      .reduce((accum, v) => accum + v, 0) / 2;

  ns.tprintf(
    "\n== HGW sees %d threads across all purchased servers! ==\n\n",
    totalThreads
  );
}

function growThreads(ns: NS, target: string) {
  const money = ns.getServerMoneyAvailable(target);
  const maxMoney = ns.getServerMaxMoney(target);

  const factor = (maxMoney * MONEY_THRESHOLD) / money;
  if (factor <= 1) {
    return 0;
  }
  return Math.ceil(ns.growthAnalyze(target, factor));
}

function weakenThreads(ns: NS, target: string) {
  const security = ns.getServerSecurityLevel(target);
  const minSecurity = ns.getServerMinSecurityLevel(target);

  const neededReduction = security - minSecurity;
  if (neededReduction === 0) {
    return 0;
  }

  let threads = 1;
  let reduction = 0;
  do {
    reduction = ns.weakenAnalyze(threads++);
  } while (reduction < neededReduction);

  return threads - 1;
}

function hacksNeededForPercent(ns: NS, target: string, percent: number) {
  return Math.ceil(percent / 100 / ns.hackAnalyze(target));
}

type Server = {
  name: string;
  pid: number | null;
};

function ramToThreads(ns: NS, host: string, withoutUsed?: boolean) {
  let ram =
    ns.getServerMaxRam(host) - (withoutUsed ? ns.getServerUsedRam(host) : 0);
  if (host === "home") {
    // give ourselves some room to run our scripts
    ram -= 32;
  }
  if (ram < 0) {
    return 0;
  }
  return Math.floor(ram / 2);
}

function loadServers(ns: NS) {
  const servers = ["home", ...ns.getPurchasedServers()];
  return servers.map((name): Server => {
    return {
      name,
      pid: null,
    };
  });
}

function updateState(ns: NS, servers: Array<Server>) {
  servers.forEach((server) => {
    if (server.pid === null) {
      return;
    }

    if (!ns.isRunning(server.pid, server.name)) {
      server.pid = null;
    }
  });
}

function allDone(servers: Array<Server>): boolean {
  return servers.filter((srv) => srv.pid !== null).length === 0;
}

// Runs the given script on the given servers, ceasing to run new instances after maxThreads is hit
// Waits for all to complete.
// Returns the number of threads that ran.
async function runAll(
  ns: NS,
  target: string,
  servers: Array<Server>,
  script: string,
  maxThreads: number,
  ...args: (string | number | boolean)[]
) {
  let i = 0;
  servers.forEach((server) => {
    if (i >= maxThreads) {
      return;
    }

    let threads = ramToThreads(ns, server.name, true);
    if (threads === 0) {
      // server is probably full, can't run here
      return;
    }

    if (i + threads >= maxThreads) {
      threads = maxThreads - i;
    }

    const pid = ns.exec(script, server.name, threads, ...args);

    // handle race between getting ram amount and running script
    if (pid) {
      i += threads;
      server.pid = pid;
    }
  });

  if (i < maxThreads) {
    ns.tprintf(
      "HGW %s: ** shortfall on thread count: %d < %d, another iteration will be needed",
      target,
      i,
      maxThreads
    );
  }

  while (!allDone(servers)) {
    updateState(ns, servers);
    await ns.sleep(1000);
  }

  return i;
}

export async function main(ns: NS) {
  ns.disableLog("ALL");

  const target = ns.args[0] as string;

  // eslint-disable-next-line
  while (true) {
    const servers = loadServers(ns);
    printTargetStats(ns, target);
    printServerStats(ns, servers);

    // inner HGW loop
    // eslint-disable-next-line
    while (true) {
      // if we got new servers while we were in the HGW loop, break so we can use them
      if (ns.getPurchasedServers().length > servers.length) {
        break;
      }

      updateState(ns, servers);

      // what to do?
      const needsGrow = growThreads(ns, target);
      const needsWeaken = weakenThreads(ns, target);
      const threadsToHack = hacksNeededForPercent(ns, target, PERCENT_HACK);

      if (needsWeaken > 0) {
        ns.tprintf("HGW %s: weakening with %d threads...", target, needsWeaken);
        const totalRan = await runAll(
          ns,
          target,
          servers,
          "weaken.js",
          needsWeaken,
          target
        );
        ns.tprintf("HGW %s: %d weaken threads completed", target, totalRan);
        continue;
      }

      if (needsGrow > 0) {
        ns.tprintf("HGW %s: growing with %d threads...", target, needsGrow);
        const totalRan = await runAll(
          ns,
          target,
          servers,
          "grow.js",
          needsGrow,
          target
        );
        ns.tprintf("HGW %s: %d grow threads completed", target, totalRan);
        continue;
      }

      ns.tprintf("HGW %s: hacking with %d threads...", target, threadsToHack);
      const totalHacks = await runAll(
        ns,
        target,
        servers,
        "hack.js",
        threadsToHack,
        target
      );
      ns.tprintf("HGW %s: %d hack threads completed", target, totalHacks);

      break;
    }
  }
}
