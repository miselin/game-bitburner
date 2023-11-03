import { NS } from '@ns';

export async function main(ns: NS) {
  if (!ns.args[0]) {
    throw new Error('a target must be specified');
  }

  ns.scriptKill('manager.js', 'home');
  ns.run('manager.js', 1, ns.args[0]);
}
