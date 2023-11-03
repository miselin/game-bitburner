import { NS, AutocompleteData } from "@ns";

import { analyzeTarget, GAP } from "./hgw-batch";

export function autocomplete(data: AutocompleteData) {
  return [...data.servers];
}

const GAP_BETWEEN_BATCHES = GAP * 4;

async function prepare(ns: NS, target: string) {
  const pid = ns.run("prepare.js", 1, target);
  while (ns.isRunning(pid)) await ns.sleep(1000);
}

export async function main(ns: NS) {
  ns.disableLog("ALL");

  const target = ns.args[0] as string;

  await prepare(ns, target);

  let batch = 0;

  // eslint-disable-next-line
  while (true) {
    // sanity check that the host is ready after the last batch
    await prepare(ns, target);

    const cores = ns.getServer().cpuCores;

    // run on every batch of batches - our hacking skill changes the numbers
    const { totalThreads, weakenTime, growTime } = analyzeTarget(
      ns,
      target,
      cores
    );

    // need to account for the gap between batches when considering the duration
    // this stops us from taking too long to spin up all the batches and overlapping with old batches
    // this needs to be the gap between the first two scripts so we never overlap batches
    const longestBatch = weakenTime + GAP - growTime;
    const maxBatchesBasedOnTime = longestBatch / GAP_BETWEEN_BATCHES;

    ns.printf(
      "RUNB: %s longest batch will take %.2f seconds (due to %.2f seconds weaken), meaning we can run at most %.2f batches concurrently, gap is %.4f seconds",
      target,
      longestBatch / 1000.0,
      weakenTime / 1000.0,
      maxBatchesBasedOnTime,
      GAP_BETWEEN_BATCHES / 1000.0
    );

    const neededRamPerBatch =
      totalThreads * 2 + ns.getScriptRam("hgw-batch.js");

    // server RAM available
    const availableRam =
      ns.getServerMaxRam(ns.getHostname()) -
      ns.getServerUsedRam(ns.getHostname());

    const maxBatches = Math.min(
      Math.floor(availableRam / neededRamPerBatch)
      // Math.floor(maxBatchesBasedOnTime)
    );

    if (maxBatches === 0) {
      ns.printf(
        "RUNB: %s, not enough RAM (need %.2f per batch, only have %.2f!)...",
        target,
        neededRamPerBatch,
        availableRam
      );
      await ns.sleep(10000);
      continue;
    }

    ns.printf(
      "RUNB: %s, this server's RAM can run %.2f batches concurrently",
      target,
      maxBatches
    );

    ns.printf(
      "RUNB: %s, running batch %d of %d concurrent batches",
      target,
      batch++,
      maxBatches
    );

    const pids = [];
    for (let i = 0; i < maxBatches; i++) {
      const pid = ns.run("hgw-batch.js", 1, target, i);
      if (!pid) {
        continue;
      }
      pids.push(pid);
      await ns.sleep(GAP_BETWEEN_BATCHES);
    }

    if (pids.length === 0) {
      ns.printf("RUNB: %s, no batches started? aborting!");
      return;
    }

    // wait for the every script in the batch to complete before continuing
    for (let i = 0; i < pids.length; i++) {
      while (ns.isRunning(pids[i])) {
        await ns.sleep(1000);
      }
    }
  }
}
