import { NS } from '@ns';
import { getAllHosts } from './lib/hosts';

/**
 * Early game hack manager, just tries to maximize income without RAM for HWGW batching.
 *
 * Splits host RAM into "slots" so multiple managers can run in parallel.
 *
 * The "nth" argument sets which slot to use, "total" sets the total count of slots.
 *
 * e.g.
 * $ manager.js n00dles 0 2
 * $ manager.js joesguns 1 2
 *
 * This will use half the RAM on each host for n00dles, and half for joesguns.
 */

type Host = {
  // hostname
  host: string;
  // max RAM
  ram: number;
  // execution slots (stores a pid or null if nothing running)
  slots: Array<number | null>;
};

type State = {
  hosts: Array<Host>;
  machineList: Set<string>;
};

// generally powers of two work better even if it's imperfect bin-packing
const RAM_PER_SCRIPT = 2;

/**
 * Start our hack script running on servers.
 *
 * If arguments are given, those are the machines on which to run.
 */

function getInitialHostState(ns: NS, machineList: Set<string>): State {
  const hosts: Array<Host> = [];
  machineList.forEach((host) => {
    const ramAddend = host === 'home' ? -128 : 0;
    const ram = ns.getServerMaxRam(host) + ramAddend;

    const entry: Host = {
      host,
      ram,
      slots: [],
    };

    for (let i = 0; i < ram; i += RAM_PER_SCRIPT) {
      entry.slots.push(null);
    }

    ns.printf(
      'adding initial host %s with %d slots',
      entry.host,
      entry.slots.length,
    );
    hosts.push(entry);
  });

  return {
    hosts,
    machineList,
  };
}

function addNewlyFoundHosts(ns: NS, state: State, machineList: Set<string>) {
  machineList.forEach((host) => {
    if (state.machineList.has(host)) {
      return;
    }

    const ramAddend = host === 'home' ? -128 : 0;
    const ram = ns.getServerMaxRam(host) + ramAddend;

    const entry: Host = {
      host,
      ram,
      slots: [],
    };

    for (let i = 0; i < ram; i += RAM_PER_SCRIPT) {
      entry.slots.push(null);
    }

    ns.printf(
      'adding newly found host %s with %d slots',
      entry.host,
      entry.slots.length,
    );
    state.hosts.push(entry);
    state.machineList.add(host);
  });
}

function updateHostState(ns: NS, state: State) {
  state.hosts.forEach((entry) => {
    const ramAddend = entry.host === 'home' ? -128 : 0;
    const currentRam = ns.getServerMaxRam(entry.host) + ramAddend;
    if (currentRam > entry.ram) {
      // add new slots, the server upgraded
      for (let i = entry.slots.length; i < currentRam; i += RAM_PER_SCRIPT) {
        entry.slots.push(null);
      }

      entry.ram = currentRam;
    }

    // make sure pids in slots are all actually running
    entry.slots = entry.slots.map((slot) => {
      if (slot === null) {
        return null;
      }

      if (ns.isRunning(slot)) {
        return slot;
      }

      return null;
    });
  });
}

function runEverywhere(
  ns: NS,
  state: State,
  script: string,
  target: string,
  nthSlot: number,
  totalSlots: number,
) {
  state.hosts.forEach((entry) => {
    for (let i = nthSlot; i < entry.slots.length; i += totalSlots) {
      if (entry.slots[i] !== null) {
        continue;
      }

      if (!ns.hasRootAccess(entry.host)) {
        continue;
      }

      ns.printf('running %s on %s (slot %d)', script, entry.host, i);

      const pid = ns.exec(script, entry.host, 1, target);
      if (pid === 0) {
        continue;
      }

      entry.slots[i] = pid;
    }
  });
}

export async function main(ns: NS) {
  if (!ns.args[0]) {
    throw new Error(
      'manager.js requires at least one argument, the target machine',
    );
  }

  if (typeof ns.args[0] !== 'string') {
    throw new Error(
      'usage: manager.js target [nth slot] [total parallel slots]',
    );
  }

  if (
    ns.args[1] === undefined ||
    (ns.args[1] !== undefined && typeof ns.args[1] !== 'number')
  ) {
    throw new Error(
      'usage: manager.js target [nth slot] [total parallel slots]',
    );
  }
  if (
    ns.args[2] === undefined ||
    (ns.args[2] !== undefined && typeof ns.args[2] !== 'number')
  ) {
    throw new Error(
      'usage: manager.js target [nth slot] [total parallel slots]',
    );
  }

  const target = ns.args[0];

  const nthSlot = ns.args[1];
  const totalSlots = ns.args[2];

  const machines = new Set(getAllHosts(ns));

  const state = getInitialHostState(ns, machines);

  const targetMaxMoney = ns.getServerMaxMoney(target);

  // targets are minimum security, maximum money, per server
  let securityThreshold = ns.getServerMinSecurityLevel(target);
  let moneyThreshold = targetMaxMoney;

  // if we're early-game, adjust the thresholds to speed up initial income
  if (ns.getPlayer().skills.hacking < 25) {
    securityThreshold += 5;
    moneyThreshold *= 0.5;
  }

  // eslint-disable-next-line
  while (true) {
    // rebuild the list of hosts, add newly found hosts to state
    const machines = new Set(getAllHosts(ns));
    addNewlyFoundHosts(ns, state, machines);

    // update state, detect scripts that finished, etc
    updateHostState(ns, state);

    // load up current state of the target
    const targetSecurity = ns.getServerSecurityLevel(target);
    const targetMoney = ns.getServerMoneyAvailable(target);

    ns.printf(
      'target %s: money %d/%d, security %d/%d',
      target,
      targetMoney,
      moneyThreshold,
      targetSecurity,
      securityThreshold,
    );

    // what do we want to do?
    // 1. grow the server if it's below our threshold
    // 2. weaken the server if it's too secure, which will have happened while we grew it
    // 3. otherwise, hack!
    if (targetSecurity > securityThreshold) {
      runEverywhere(ns, state, 'weaken.js', target, nthSlot, totalSlots);
    } else if (targetMoney < moneyThreshold) {
      runEverywhere(ns, state, 'grow.js', target, nthSlot, totalSlots);
    } else {
      runEverywhere(ns, state, 'hack.js', target, nthSlot, totalSlots);
    }

    await ns.sleep(5000);
  }
}
