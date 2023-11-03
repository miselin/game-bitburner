import { NS } from '@ns';
import { analyzeTarget } from './hacks';
import { GAP } from './constants';

export type Host = {
  name: string;
  money: number;
  currentMoney: number;
  level: number;
  securityLevel: number;
  minSecurityLevel: number;
  // total threads neded to run a HWGW batch on this server
  totalThreads: number;
  // RAM needed to run a HWGW batch on this server
  ramPerBatch: number;
  // potentially earnable money/millisecond on t his server
  moneyPerMs: number;
};

export function scanHost(
  ns: NS,
  host: string,
  machineList: Set<string>,
  maxDepth?: number,
) {
  if (maxDepth !== undefined && maxDepth === 0) {
    ns.tprint('ERROR: scanHost: recursion depth exceeded');
    return;
  }

  ns.scan(host).forEach((peer) => {
    if (machineList.has(peer)) {
      return;
    }

    machineList.add(peer);

    scanHost(ns, peer, machineList, maxDepth ? maxDepth - 1 : 100);
  });
}

/**
 * Returns a predicate function for use to filter()
 * machine lists to those that have root access
 * @param ns NS object
 * @returns a closure that can be passed to filter()
 */
export function hasRootP(ns: NS) {
  return (host: string) => ns.hasRootAccess(host);
}

/**
 * Returns a predicate function for use to filter()
 * machine lists to those that do not have root access
 * @param ns NS object
 * @returns a closure that can be passed to filter()
 */
export function hasNoRootP(ns: NS) {
  return (host: string) => !ns.hasRootAccess(host);
}

export function getAllHosts(ns: NS) {
  const machines = new Set(['home']);
  scanHost(ns, 'home', machines);
  return [...machines];
}
/**
 * Analyze all available hosts for hacking.
 * @param ns NS object
 * @returns A list of Host objects, sorted by max money descending
 * @__PURE__
 */
export function analyzeHackableHosts(ns: NS) {
  const myHackingLevel = ns.getHackingLevel();

  return getAllHosts(ns)
    .map((host) => {
      const maxMoney = ns.getServerMaxMoney(host);
      const currentMoney = ns.getServerMoneyAvailable(host);
      const hackingLevel = ns.getServerRequiredHackingLevel(host);
      const securityLevel = ns.getServerSecurityLevel(host);
      const minSecurityLevel = ns.getServerMinSecurityLevel(host);

      if (hackingLevel * 2.0 > myHackingLevel) {
        return null;
      }

      if (maxMoney === 0) {
        return null;
      }

      if (!ns.hasRootAccess(host)) {
        return null;
      }

      const { totalThreads, weakenTime } = analyzeTarget(ns, host, 1);

      return {
        name: host,
        money: maxMoney,
        currentMoney: currentMoney,
        level: hackingLevel,
        securityLevel,
        minSecurityLevel,
        totalThreads,
        ramPerBatch: totalThreads * 2 + ns.getScriptRam('hgw-batch.js'),
        moneyPerMs: (maxMoney * 0.5) / (weakenTime + 2 * GAP),
      };
    })
    .filter((h): h is Host => h !== null)
    .slice(0)
    .sort((a, b) => b.money - a.money);
}

export function getTotalPurchasedThreads(ns: NS) {
  return (
    ['home', ...ns.getPurchasedServers()]
      .map((server) => ns.getServerMaxRam(server))
      .reduce((accum, v) => accum + v, 0) / 2
  );
}

export async function prepare(ns: NS, target: string) {
  const pid = ns.run('prepare.js', 1, target);
  while (ns.isRunning(pid)) await ns.sleep(1000);
}
