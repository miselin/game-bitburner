/**
 * This script runs a manager that finds the best target to run a HWGW batch for,
 * and then takes care of running it where it fits. It'll keep doing that forever.
 *
 * Generally needs servers with 2048+ GB of RAM! Between prepare and the batches,
 * this is pretty RAM-intensive.
 *
 * Use `run-managers.js` until `home` and purchased servers get large enough.
 */

import { NS } from '@ns';
import { GAP } from './lib/constants';
import { analyzeHackableHosts } from './lib/hosts';
import {
  RunnableServer,
  getRunnableServers,
  killallOnServer,
  runWhereFits,
} from './lib/run';
import type { Host } from './lib/hosts';
import { growThreadsFor, weakenThreadsFor } from './lib/hacks';

type BatchHost = {
  prepared: boolean;
  currentlyPreparing: boolean;
  retryAfter: number;
  retryMs: number;
} & Host;

export async function main(ns: NS) {
  ns.disableLog('ALL');

  let lastServerUpdate = null;
  let lastHostDataUpdate = null;
  let lastBatch = null;

  // General algo, looping forever
  // 1. Check targets
  // 2. If we have new targets that aren't prepared yet, run a prepare
  // 3. For the highest value target, run a batch
  // 4. Wait for TIME_BETWEEN_BATCH time

  const hostData: Record<string, BatchHost> = {};

  let batch = 0;

  // when starting the manager, clear out everything else on this server
  await killallOnServer(ns, ns.getHostname());

  let servers: Array<RunnableServer> = [];

  // every few seconds, update our list of servers
  const updateServerData = () => {
    // try to avoid using home if we can, so it can be used for prepares instead
    let newServers = getRunnableServers(ns, false);
    if (newServers.length === 0) {
      newServers = getRunnableServers(ns, true);
    }

    servers = newServers;
  };

  // every few seconds, handle preparing hosts  that we haven't seen before
  const updateHostData = () => {
    // enumerate all the potential machines out there
    analyzeHackableHosts(ns).forEach((host) => {
      if (!hostData[host.name]) {
        hostData[host.name] = {
          ...host,
          prepared:
            host.currentMoney === host.money &&
            host.securityLevel === host.minSecurityLevel,
          currentlyPreparing: false,
          retryAfter: 0,
          retryMs: 5000,
        };
      }

      hostData[host.name].money = host.money;
      hostData[host.name].currentMoney = host.currentMoney;
      hostData[host.name].securityLevel = host.securityLevel;
      hostData[host.name].minSecurityLevel = host.minSecurityLevel;
      hostData[host.name].ramPerBatch =
        host.totalThreads * 2 + ns.getScriptRam('hgw-batch.js');

      if (
        !hostData[host.name].prepared &&
        Date.now() > hostData[host.name].retryAfter
      ) {
        if (
          host.currentMoney === host.money &&
          host.securityLevel === host.minSecurityLevel
        ) {
          ns.printf(
            'INFO: batch-manager has successfully prepared %s',
            host.name,
          );
          hostData[host.name].prepared = true;
          hostData[host.name].currentlyPreparing = false;
          hostData[host.name].retryAfter = 0;
          hostData[host.name].retryMs = 5000;
        } else if (!hostData[host.name].currentlyPreparing) {
          ns.printf('INFO: batch-manager is preparing %s', host.name);

          const grows = growThreadsFor(ns, host.name);
          const weakens = weakenThreadsFor(ns, host.name);
          const ram = (grows + weakens) * 2 + ns.getScriptRam('prepare.js');
          const pid = runWhereFits(
            ns,
            servers,
            'prepare.js',
            1,
            ram,
            host.name,
          );
          if (pid) {
            hostData[host.name].currentlyPreparing = true;
          } else {
            ns.printf(
              'WARN: batch-manager could not prepare %s, will try again in %.2f seconds',
              host.name,
              hostData[host.name].retryMs / 1000,
            );
            hostData[host.name].retryAfter =
              Date.now() + hostData[host.name].retryMs;
            hostData[host.name].retryMs *= 2;
            // cap the max retry to 1 minute
            if (hostData[host.name].retryMs > 60000) {
              hostData[host.name].retryMs = 60000;
            }
          }
        }
      }
    });
  };

  // we run every batch on a set tick interval to minimize weird sync issues
  // if nothing can run on a tick, that's fine. the next one will get it
  const runBatches = () => {
    const candidateHosts = Object.values(hostData).filter((h) => h.prepared);
    candidateHosts.sort((a, b) => b.moneyPerMs - a.moneyPerMs);

    // keep trying backup options for target until we find one that fits
    for (let i = 0; i < candidateHosts.length; i++) {
      const pid = runWhereFits(
        ns,
        servers,
        'hgw-batch.js',
        1,
        candidateHosts[i].ramPerBatch,
        candidateHosts[i].name,
        batch,
      );

      if (pid > 0) {
        batch++;
        break;
      } else {
        ns.printf(
          'WARN: failed to run hgw-batch targeting %s',
          candidateHosts[i].name,
        );
      }
    }

    lastBatch = Date.now();
  };

  // eslint-disable-next-line
  while (true) {
    const now = Date.now();
    if (lastServerUpdate === null || lastServerUpdate + 10000 < now) {
      updateServerData();
      lastServerUpdate = now;
    }
    if (lastHostDataUpdate === null || lastHostDataUpdate + 5000 < now) {
      updateHostData();
      lastHostDataUpdate = now;
    }
    if (lastBatch === null || lastBatch + GAP * 4 < now) {
      runBatches();
      lastBatch = now;
    }

    // the above steps take time. we need to account for that to keep ticks correct
    const timeTaken = Date.now() - now;
    const tick = GAP - timeTaken;

    if (tick > 0) {
      await ns.sleep(tick);
    }
  }
}
