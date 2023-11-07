import { NS } from '@ns';

import { OVERGROW_FACTOR, MONEY_PERCENT_PER_HACK } from './constants';

export function growThreads(
  ns: NS,
  target: string,
  money: number,
  maxMoney: number,
  cores?: number,
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

export function weakenThreads(ns: NS, neededReduction: number, cores?: number) {
  let threads = 1;
  let reduction = 0;
  do {
    reduction = ns.weakenAnalyze(threads++, cores);
  } while (reduction < neededReduction && threads < 131072);

  return threads - 1;
}

export function growThreadsFor(ns: NS, target: string, cores?: number) {
  const money = ns.getServerMoneyAvailable(target);
  const maxMoney = ns.getServerMaxMoney(target);

  return growThreads(ns, target, money, maxMoney, cores);
}

export function weakenThreadsFor(ns: NS, target: string, cores?: number) {
  const security = ns.getServerSecurityLevel(target);
  const minSecurity = ns.getServerMinSecurityLevel(target);

  const neededReduction = security - minSecurity;
  if (neededReduction === 0) {
    return 0;
  }

  return weakenThreads(ns, neededReduction, cores);
}

export function analyzeTarget(ns: NS, target: string, cores?: number) {
  // TODO: need to figure out how to account for hack XP
  // e.g. lower # of hacks if the XP will cause a level-up in hacking skill
  // otherwise leveling up causes major overhacks

  const maxMoney = ns.getServerMaxMoney(target);
  const minSecurity = ns.getServerMinSecurityLevel(target);
  const baseSecurity = ns.getServerBaseSecurityLevel(target);

  // Formulas version, which only works if server is actually at lowest sec, max money
  // eslint-disable-next-line
  if (ns.fileExists('Formulas.exe', 'home')) {
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
      cores,
    );

    const growTime = ns.formulas.hacking.growTime(server, player);

    server.moneyAvailable = maxMoney;

    const hackPercent = ns.formulas.hacking.hackPercent(server, player);
    const hacks = Math.floor(MONEY_PERCENT_PER_HACK / hackPercent);
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
      hackPercent,
    };
  }

  const grows = growThreads(
    ns,
    target,
    Math.ceil(maxMoney * (1 - MONEY_PERCENT_PER_HACK)),
    maxMoney,
    cores,
  );
  // const hacks = Math.floor(ns.hackAnalyzeThreads(target, maxMoney * MONEY_PERCENT_PER_HACK));

  // hackAnalyzeThreads will return -1 if the server does not have
  // the money passed in currently, which could happen if we start a batch
  // while another batch has finished its hack. instead, we'll use math!
  const hacks = Math.floor(
    ns.hackAnalyzeThreads(target, 1) * maxMoney * MONEY_PERCENT_PER_HACK,
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
    hackPercent: -1, // unknown without formulas.exe
  };
}

export function hacksNeededForPercent(ns: NS, target: string, percent: number) {
  return Math.ceil(percent / 100 / ns.hackAnalyze(target));
}

export function hacksNeededForPercentFormulas(
  ns: NS,
  target: string,
  percent: number,
) {
  return (
    percent /
    100 /
    ns.formulas.hacking.hackPercent(ns.getServer(target), ns.getPlayer())
  );
}

export function hasFormulas(ns: NS) {
  return ns.fileExists('Formulas.exe', 'home');
}

export type HostAnalysis = ReturnType<typeof analyzeTarget>;
