import { NS } from '@ns';

const solution = '5S9W2W172i2C1T3G5x1g562m9g2d2P5E4L';
const host = 'silver-helix';
const filename = 'contract-184923.cct';

export async function main(ns: NS) {
  const reward = ns.codingcontract.attempt(solution, filename, host);
  if (reward) {
    ns.tprint(`Contract solved successfully! Reward: ${reward}`);
  } else {
    ns.tprint('Failed to solve contract.');
  }
}
