import { NS } from '@ns';
import { getTotalPurchasedThreads } from './lib/hosts';

export async function main(ns: NS) {
  const doc = globalThis['document'];
  const hook0 = doc.getElementById('overview-extra-hook-0');
  const hook1 = doc.getElementById('overview-extra-hook-1');

  if (!(hook0 && hook1)) {
    throw new Error('hooks were not found');
  }

  // eslint-disable-next-line
  while (true) {
    try {
      const headers = [];
      const values = [];

      headers.push('TotalThreads');
      values.push(getTotalPurchasedThreads(ns));

      hook0.innerText = headers.join(' \n');
      hook1.innerText = values.join('\n');
    } catch (err) {
      ns.print('ERROR: Update Skipped: ' + String(err));
    }
    await ns.sleep(1000);
  }
}
