import { NS } from '@ns';

const solution = 'OVWGZ ZIOZM NCZGG GJBDX HZYDV';
const host = 'n00dles';
const filename = 'contract-427180.cct';

export async function main(ns: NS) {
  const reward = ns.codingcontract.attempt(solution, filename, host);
  if (reward) {
    ns.tprint(`Contract solved successfully! Reward: ${reward}`);
  } else {
    ns.tprint('Failed to solve contract.');
  }
}
