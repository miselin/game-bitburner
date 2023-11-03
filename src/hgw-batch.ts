/**
Weak, Hack, and Grow only affect the server *once they execute*.
Time for execution is calculated at *launch of the process*

You can run multiple Weak, Hack, and Grow commands on the same server *in parallel*.

For example, if you've fully weaken and grown your servers first (which you must do for this to work)
you could get something like this

WeakenTime = 1 minuteGrowTime = 45 secondHackTime = 15 seconds

You can execute a command to weaken the server, grow the server (with a sleep that is the difference
of WeakenTime and GrowTime) and hack (with a sleep that is the difference between WeakenTime and HackTime).

Then you adjust the sleeps by 100-200ms, making sure Hack fires first ( which needs to only take 50% of the funds),
then Grow (which needs to grow at least 100% to replace funds hacked) then Weaken which will reset the security
level back to the minimum.

Then repeat that script every 1 second, and you'll get 50% of the server's maximum money per second.

To maintain stability:
- Math.floor() for hacks threads
- Math.ceil for grows/weakens threads

Don't sleep forever, sleep for shorter time and check the deadline of the script(s)
This handles level-ups during the batch!

** need to get the server to min security and max money before batching! **
 */
import { NS } from "@ns";

// Gap between the end of each script to keep
// Lower gaps speed things up but risk causing out-of-order runs
export const GAP = 50.0;

// Overgrow servers a little bit just to handle errors in hack amount
// Errors cane come up from increasing hack levels mid-batch
const OVERGROW_FACTOR = 1.1;

// How much money do we want to take from the server each iteration?
// Value is a percentage of the maximum money on the server.
// Higher values will mean faster iterations but less money.
const MONEY_PERCENT_PER_HACK = 0.025;

const DEBUG = false;

function growThreads(
  ns: NS,
  target: string,
  money: number,
  maxMoney: number,
  cores?: number
) {
  if (money === 0) {
    return 0;
  }

  const factor = (maxMoney * OVERGROW_FACTOR) / money;
  if (factor <= 1) {
    return 0;
  }
  return Math.ceil(ns.growthAnalyze(target, factor, cores));
}

function weakenThreads(ns: NS, neededReduction: number, cores?: number) {
  let threads = 1;
  let reduction = 0;
  do {
    reduction = ns.weakenAnalyze(threads++, cores);
  } while (reduction < neededReduction && threads < 131072);

  return threads - 1;
}

export function analyzeTarget(ns: NS, target: string, cores?: number) {
  const maxMoney = ns.getServerMaxMoney(target);
  const minSecurity = ns.getServerMinSecurityLevel(target);
  const baseSecurity = ns.getServerMinSecurityLevel(target);

  // Formulas version, which only works if server is actually at lowest sec, max money
  // eslint-disable-next-line
  if (ns.fileExists("Formulas.exe", "home")) {
    const player = ns.getPlayer();

    // grab the server and fudge the numbers to make formulas.exe work
    // this means it doesn't use the real current numbers
    // const server = ns.getServer(target);
    const server = ns.formulas.mockServer();
    server.hackDifficulty = minSecurity;
    server.minDifficulty = minSecurity;
    server.baseDifficulty = baseSecurity;
    server.serverGrowth = ns.getServerGrowth(target);
    server.moneyMax = maxMoney;
    server.moneyAvailable = maxMoney * (1 - MONEY_PERCENT_PER_HACK);
    server.requiredHackingSkill = ns.getServerRequiredHackingLevel(target);

    const grows = ns.formulas.hacking.growThreads(
      server,
      player,
      maxMoney,
      cores
    );

    const growTime = ns.formulas.hacking.growTime(server, player);

    server.moneyAvailable = maxMoney;

    const hacks = Math.floor(
      MONEY_PERCENT_PER_HACK / ns.formulas.hacking.hackPercent(server, player)
    );
    const hacks2 = hacks;

    const weakenTime = ns.formulas.hacking.weakenTime(server, player);
    const hackTime = ns.formulas.hacking.hackTime(server, player);

    const securityFromGrows = ns.growthAnalyzeSecurity(grows, undefined, cores);
    const securityFromHacks = ns.hackAnalyzeSecurity(hacks);

    const weakensAfterHack = weakenThreads(ns, securityFromHacks, cores);
    const weakensAfterGrow = weakenThreads(ns, securityFromGrows, cores);

    const totalThreads = weakensAfterHack + weakensAfterGrow + grows + hacks;
    const totalRam = totalThreads * 2;

    return {
      target,
      grows,
      hacks,
      hacks2,
      growTime,
      weakenTime,
      hackTime,
      weakensAfterGrow,
      weakensAfterHack,
      totalThreads,
      totalRam,
      goalMoney: maxMoney * (1 - MONEY_PERCENT_PER_HACK),
    };
  }

  const grows = growThreads(
    ns,
    target,
    Math.ceil(maxMoney * (1 - MONEY_PERCENT_PER_HACK)),
    maxMoney,
    cores
  );
  // const hacks = Math.floor(ns.hackAnalyzeThreads(target, maxMoney * MONEY_PERCENT_PER_HACK));

  // hackAnalyzeThreads will return -1 if the server does not have
  // the money passed in currently, which could happen if we start a batch
  // while another batch has finished its hack. instead, we'll use math!
  const hacks = Math.floor(
    ns.hackAnalyzeThreads(target, 1) * maxMoney * MONEY_PERCENT_PER_HACK
  );
  const hacks2 = ns.hackAnalyzeThreads(target, 1);

  const growTime = ns.getGrowTime(target);
  const weakenTime = ns.getWeakenTime(target);
  const hackTime = ns.getHackTime(target);

  const securityFromGrows = ns.growthAnalyzeSecurity(grows, undefined, cores);
  const securityFromHacks = ns.hackAnalyzeSecurity(hacks);

  const weakensAfterHack = weakenThreads(ns, securityFromHacks, cores);
  const weakensAfterGrow = weakenThreads(ns, securityFromGrows, cores);

  const totalThreads = weakensAfterHack + weakensAfterGrow + grows + hacks;
  const totalRam = totalThreads * 2;

  return {
    target,
    grows,
    hacks,
    hacks2,
    growTime,
    weakenTime,
    hackTime,
    weakensAfterGrow,
    weakensAfterHack,
    totalThreads,
    totalRam,
    goalMoney: maxMoney * (1 - MONEY_PERCENT_PER_HACK),
  };
}

export async function main(ns: NS) {
  ns.disableLog("ALL");

  const target = ns.args[0] as string;
  const batch = ns.args[1] as number;
  const cores = (ns.args[2] as number) || 0;

  let maybeDescyned = false;

  const maxMoney = ns.getServerMaxMoney(target);
  const availableMoney = ns.getServerMoneyAvailable(target);

  if (availableMoney !== maxMoney) {
    /*
    ns.tprintf(
      "WARN: BATCH %4d: On %s you need to run prepare.js first, server is not at max money (%.2f > %.2f)",
      batch,
      target,
      availableMoney,
      maxMoney
    );
    */

    maybeDescyned = true;
  }

  const {
    grows,
    hacks,
    growTime,
    weakenTime,
    hackTime,
    weakensAfterHack,
    weakensAfterGrow,
  } = analyzeTarget(ns, target, cores);

  if (DEBUG) {
    ns.tprintf(
      "BATCH %4d: we will need %.2f weaken threads after hack, %.2f weaken threads after grow, %.2f grow threads, and %.2f hack threads",
      batch,
      weakensAfterHack,
      weakensAfterGrow,
      grows,
      hacks
    );
  }

  if (grows < 0 || hacks < 0) {
    // abort!
    return;
  }

  const deadlines = {
    weaken0: weakenTime,
    weaken1: weakenTime + 2 * GAP,
    grow: weakenTime + GAP,
    hack: weakenTime - GAP,
  };

  const startTimes = {
    weaken0: deadlines.weaken0 - weakenTime,
    weaken1: deadlines.weaken1 - weakenTime,
    grow: deadlines.grow - growTime,
    hack: deadlines.hack - hackTime,
  };

  const threads = {
    weaken0: weakensAfterHack, // # of threads to offset the hack
    weaken1: weakensAfterGrow, // # of threads to offset the grow
    grow: grows, // # of threads to grow back to max money
    hack: hacks, // # of threads to hack half the max money
  };

  const pids: Record<string, number | null> = {
    weaken0: null,
    weaken1: null,
    grow: null,
    hack: null,
  };

  const allDone = () => {
    return (
      Object.values(pids)
        .map((p) => p !== null && ns.isRunning(p))
        .filter((p) => p).length === 0
    );
  };

  // first weaken
  if (DEBUG) {
    ns.printf(
      "BATCH %4d: weaken0 %s (%d threads, %d seconds, %d -> %d)",
      batch,
      target,
      threads.weaken0,
      weakenTime / 1000,
      startTimes.weaken0 / 1000,
      deadlines.weaken0 / 1000
    );
  }
  pids.weaken0 = ns.run(
    "weaken.js",
    threads.weaken0,
    target,
    startTimes.weaken0,
    batch
  );
  if (pids.weaken0 === 0) {
    ns.print(
      `failed to run weaken0 script for ${target} with ${threads.weaken0} threads!`
    );
    return;
  }

  // second weaken
  if (DEBUG) {
    ns.printf(
      "BATCH %4d: weaken1 %s (%d threads, %d seconds, %d -> %d)",
      batch,
      target,
      threads.weaken1,
      weakenTime / 1000,
      startTimes.weaken1 / 1000,
      deadlines.weaken1 / 1000
    );
  }
  pids.weaken1 = ns.run(
    "weaken.js",
    threads.weaken1,
    target,
    startTimes.weaken1,
    batch
  );
  if (pids.weaken1 === 0) {
    ns.print(
      `failed to run weaken1 script for ${target} with ${threads.weaken1} threads!`
    );
    return;
  }

  // grow
  if (DEBUG) {
    ns.printf(
      "BATCH %4d: grow %s (%d threads, %d seconds, %d -> %d)",
      batch,
      target,
      threads.grow,
      growTime / 1000,
      startTimes.grow / 1000,
      deadlines.grow / 1000
    );
  }
  pids.grow = ns.run("grow.js", threads.grow, target, startTimes.grow, batch);
  if (pids.grow === 0) {
    ns.print(
      `failed to run grow script for ${target} with ${threads.grow} threads!`
    );
    return;
  }

  // hack
  if (!maybeDescyned) {
    if (DEBUG) {
      ns.printf(
        "BATCH %4d: hack %s (%d threads, %d seconds, %d -> %d)",
        batch,
        target,
        threads.hack,
        hackTime / 1000,
        startTimes.hack / 1000,
        deadlines.hack / 1000
      );
    }
    pids.hack = ns.run("hack.js", threads.hack, target, startTimes.hack, batch);
    if (pids.hack === 0) {
      ns.print(
        `failed to run hack script for ${target} with ${threads.hack} threads!`
      );
      return;
    }
  } else {
    ns.print(`skipping hack of ${target} due to apparent desync`);
  }

  while (!allDone()) {
    await ns.sleep(GAP);
  }

  if (DEBUG) {
    ns.tprintf("BATCH %4d: %s batch complete", batch, target);
  }
}
