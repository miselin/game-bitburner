import { NS, AutocompleteData } from "@ns";

import { analyzeTarget } from "./lib/hacks";
import { GAP } from "./lib/constants";
import { allDone } from "./lib/run";
import { prepare } from "./lib/hosts";

export function autocomplete(data: AutocompleteData) {
  return [...data.servers];
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
    const { totalThreads } = analyzeTarget(ns, target, cores);

    const neededRamPerBatch =
      totalThreads * 2 + ns.getScriptRam("hgw-batch.js");

    // server RAM available
    const availableRam =
      ns.getServerMaxRam(ns.getHostname()) -
      ns.getServerUsedRam(ns.getHostname());

    const maxBatches = Math.floor(availableRam / neededRamPerBatch);

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
      await ns.sleep(GAP * 4);
    }

    if (pids.length === 0) {
      ns.printf("RUNB: %s, no batches started? aborting!");
      return;
    }

    // wait for the every script in the batch to complete before continuing
    while (!allDone(ns, pids)) {
      await ns.sleep(1000);
    }
  }
}
