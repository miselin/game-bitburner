import { NS } from '@ns';

export async function main(ns: NS) {
  ns.disableLog('ALL');

  ns.run('prepare.js', 1, 'joesguns');

  // eslint-disable-next-line
  while (true) {
    await ns.grow('joesguns');
  }
}
