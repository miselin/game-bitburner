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
import { GAP, MINUTE } from './lib/constants';
import { analyzeHackableHosts } from './lib/hosts';
import {
  RunnableServer,
  findWhereFits,
  getRunnableServers,
  killallOnServer,
  runWhereFits,
} from './lib/run';
import type { Host } from './lib/hosts';
import { growThreadsFor, weakenThreadsFor } from './lib/hacks';
import { ensureString } from './lib/typing';

type BatchHost = {
  prepared: boolean;
  currentlyPreparing: boolean;
  retryAfter: number;
  retryMs: number;
} & Host;

// BATCHER_V2 enables the newer mode of the batcher that controls all batches
// from the batch-manager script. The older mode runs hgw-batch.js to do the
// actual batching logic.
const BATCHER_V2 = true;

export async function main(ns: NS) {
  ns.disableLog('ALL');

  const targetHost = ns.args[0] !== undefined ? ensureString(ns.args[0]) : null;

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
  let serversIncludingHome: Array<RunnableServer> = [];

  // every few seconds, update our list of servers
  const updateServerData = () => {
    serversIncludingHome = getRunnableServers(ns, true);

    // try to avoid using home for batches if we can,
    // so it can be used for prepares instead
    let newServers = getRunnableServers(ns, false);
    if (newServers.length === 0) {
      newServers = serversIncludingHome;
    }

    servers = newServers;
  };

  // every few seconds, handle preparing hosts  that we haven't seen before
  const updateHostData = () => {
    // enumerate all the potential machines out there
    analyzeHackableHosts(ns).forEach((host) => {
      if (targetHost !== null && host.name !== targetHost) {
        return;
      }

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
        host.totalThreads * 2 +
        (BATCHER_V2 ? 0 : ns.getScriptRam('hgw-batch.js'));
      hostData[host.name].analysis = host.analysis;

      if (
        !hostData[host.name].prepared &&
        Date.now() > hostData[host.name].retryAfter
      ) {
        // avoid preparing the host if it's very long to do so
        // this means we'll instead wait for better hacking skill
        if (
          host.analysis.weakenTime > 3 * MINUTE ||
          host.analysis.growTime > 3 * MINUTE
        ) {
          ns.printf(
            'INFO: batch-manager delaying prepare of %s as it currently takes too long',
            host.name,
          );
          hostData[host.name].retryAfter = 60000;
          return;
        }

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
            serversIncludingHome,
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
  const runBatches = async () => {
    const candidateHosts = Object.values(hostData).filter(
      (h) => h.prepared && h.analysis.grows >= 0 && h.analysis.hacks >= 0,
    );
    candidateHosts.sort((a, b) => b.moneyPerMs - a.moneyPerMs);

    // keep trying backup options for target until we find one that fits
    for (let i = 0; i < candidateHosts.length; i++) {
      const server = findWhereFits(
        ns,
        servers,
        candidateHosts[i].ramPerBatch,
        true,
      );
      if (!server) {
        continue;
      }

      const host = server.hostname;
      const target = candidateHosts[i].name;

      const {
        weakenTime,
        weakensAfterHack,
        weakensAfterGrow,
        grows,
        hacks,
        growTime,
        hackTime,
      } = candidateHosts[i].analysis;

      const t0 = Date.now();

      let pids: Record<string, number | null> = {};

      if (BATCHER_V2) {
        // when passing the additionalMsec, make sure it's offset by the time ns.exec takes to run for max stability
        pids = {
          weaken0: ns.exec(
            'weaken.js',
            host,
            weakensAfterHack,
            target,
            0,
            batch,
          ),
          weaken1: ns.exec(
            'weaken.js',
            host,
            weakensAfterGrow,
            target,
            2 * GAP - (Date.now() - t0),
            batch,
          ),
          grow: ns.exec(
            'grow.js',
            host,
            grows,
            target,
            weakenTime + GAP - growTime - (Date.now() - t0),
            batch,
          ),
          hack: ns.exec(
            'hack.js',
            host,
            hacks,
            target,
            weakenTime - GAP - hackTime - (Date.now() - t0),
            batch,
          ),
        };
      } else {
        pids = {
          hgw: ns.exec('hgw-batch.js', host, 1, target, batch),
        };
      }

      if (Object.values(pids).filter((p) => p === 0).length === 0) {
        batch++;
        break;
      } else {
        // one of the scripts failed to run, need to kill the others
        Object.values(pids).forEach((p) => {
          if (p !== null && p > 0) {
            ns.kill(p);
          }
        });
        ns.printf(
          'WARN: failed to run batch targeting %s',
          candidateHosts[i].name,
        );
      }
    }
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
