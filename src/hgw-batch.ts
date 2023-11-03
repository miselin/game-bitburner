import { NS } from '@ns';
import { analyzeTarget } from './lib/hacks';
import { GAP, DEBUG } from './lib/constants';
import { allDone } from './lib/run';

export async function main(ns: NS) {
  ns.disableLog('ALL');

  const target = ns.args[0] as string;
  const batch = ns.args[1] as number;
  const cores = (ns.args[2] as number) || 0;

  let maybeDescyned = false;

  const maxMoney = ns.getServerMaxMoney(target);
  const availableMoney = ns.getServerMoneyAvailable(target);

  if (availableMoney !== maxMoney) {
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
      'BATCH %4d: we will need %.2f weaken threads after hack, %.2f weaken threads after grow, %.2f grow threads, and %.2f hack threads',
      batch,
      weakensAfterHack,
      weakensAfterGrow,
      grows,
      hacks,
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

  // first weaken
  if (DEBUG) {
    ns.printf(
      'BATCH %4d: weaken0 %s (%d threads, %d seconds, %d -> %d)',
      batch,
      target,
      threads.weaken0,
      weakenTime / 1000,
      startTimes.weaken0 / 1000,
      deadlines.weaken0 / 1000,
    );
  }
  pids.weaken0 = ns.run(
    'weaken.js',
    threads.weaken0,
    target,
    startTimes.weaken0,
    batch,
  );
  if (pids.weaken0 === 0) {
    ns.print(
      `failed to run weaken0 script for ${target} with ${threads.weaken0} threads!`,
    );
    return;
  }

  // second weaken
  if (DEBUG) {
    ns.printf(
      'BATCH %4d: weaken1 %s (%d threads, %d seconds, %d -> %d)',
      batch,
      target,
      threads.weaken1,
      weakenTime / 1000,
      startTimes.weaken1 / 1000,
      deadlines.weaken1 / 1000,
    );
  }
  pids.weaken1 = ns.run(
    'weaken.js',
    threads.weaken1,
    target,
    startTimes.weaken1,
    batch,
  );
  if (pids.weaken1 === 0) {
    ns.print(
      `failed to run weaken1 script for ${target} with ${threads.weaken1} threads!`,
    );
    return;
  }

  // grow
  if (DEBUG) {
    ns.printf(
      'BATCH %4d: grow %s (%d threads, %d seconds, %d -> %d)',
      batch,
      target,
      threads.grow,
      growTime / 1000,
      startTimes.grow / 1000,
      deadlines.grow / 1000,
    );
  }
  pids.grow = ns.run('grow.js', threads.grow, target, startTimes.grow, batch);
  if (pids.grow === 0) {
    ns.print(
      `failed to run grow script for ${target} with ${threads.grow} threads!`,
    );
    return;
  }

  // hack
  if (!maybeDescyned) {
    if (DEBUG) {
      ns.printf(
        'BATCH %4d: hack %s (%d threads, %d seconds, %d -> %d)',
        batch,
        target,
        threads.hack,
        hackTime / 1000,
        startTimes.hack / 1000,
        deadlines.hack / 1000,
      );
    }
    pids.hack = ns.run('hack.js', threads.hack, target, startTimes.hack, batch);
    if (pids.hack === 0) {
      ns.print(
        `failed to run hack script for ${target} with ${threads.hack} threads!`,
      );
      return;
    }
  } else {
    ns.print(`skipping hack of ${target} due to apparent desync`);
  }

  while (!allDone(ns, Object.values(pids))) {
    await ns.sleep(GAP);
  }

  if (DEBUG) {
    ns.tprintf('BATCH %4d: %s batch complete', batch, target);
  }
}
