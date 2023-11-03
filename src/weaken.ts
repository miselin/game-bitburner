import { NS } from '@ns';

const LOG = false;

export async function main(ns: NS) {
  if (typeof ns.args[0] !== 'string') {
    throw new Error('requires a string');
  }
  const before = Date.now();
  await ns.weaken(ns.args[0], {
    additionalMsec: ns.args[1] !== undefined ? (ns.args[1] as number) : 0,
  });
  const after = Date.now();
  if (LOG) {
    let batch = -1;
    if (ns.args[2] !== undefined) {
      if (typeof ns.args[2] !== 'number') {
        throw new Error('requires a number');
      }
      batch = ns.args[2];
    }
    ns.tprintf(`INFO: weaken ${ns.args[0]} ${before}->${after} ${batch}`);
  }
}
