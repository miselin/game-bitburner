import { NS } from '@ns';

/**
 * Upgrade the home server to max RAM
 */

export async function main(ns: NS) {
  let targetRam = 32;

  // eslint-disable-next-line
  while (true) {
    // eslint-disable-next-line
    while (true) {
      let stillNeedingUpdate = 0;
      if (ns.getServerMaxRam('home') < targetRam) {
        stillNeedingUpdate++;

        ns.printf('want to upgrade home if we have enough money');

        if (ns.upgradePurchasedServer('home', targetRam)) {
          ns.tprintf('UPGR: upgraded home to %dGB', targetRam);
        }
      }

      if (stillNeedingUpdate === 0) {
        break;
      }

      // wait a bit, this helps avoid accidentally spending money that might go to darkweb or whatever
      await ns.sleep(10000);
    }

    targetRam *= 2;

    // finish up once we hit max RAM
    if (targetRam > ns.getPurchasedServerMaxRam()) {
      return;
    }

    ns.printf('increased target RAM for home to %d', targetRam);
  }
}
