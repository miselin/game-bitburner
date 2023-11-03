import { NS } from '@ns';

/**
 * Start all the necessary "home" scripts.
 *
 * After installing augs, wake up, run spin-up.js. EZ!
 */

export async function main(ns: NS) {
  let player = ns.getPlayer();
  if (player.skills.hacking < 20) {
    ns.tprint(
      'Your hacking skill is not yet 20. Study up, spin-up will continue once hacking level hits 20.',
    );
    while (player.skills.hacking < 20) {
      await ns.sleep(1000);
      player = ns.getPlayer();
    }
  }

  const homeRam = ns.getServerMaxRam('home');

  ns.run('gain-access.js');
  ns.run('update-scripts.js');
  if (homeRam > 256) {
    // early game we skip buying servers to maximize the home server
    ns.run('buy-servers.js');
  } else {
    // early game, upgrade home instead
    ns.run('upgrade-home.js');
  }
  if (homeRam < 1024) {
    // early game, we need the extra income from hacknet
    ns.run('upgrade-hacknet.js');
  }
  if (homeRam > 64) {
    ns.run('hud-stats.js');
  }

  if (homeRam < 1024) {
    // low RAM, use the cheap manager that doesn't require a big prepare
    ns.run('run-managers.js');
  } else {
    // make sure we always have at least one server prepped to target with the batch manager
    const pid = ns.run('prepare.js', 1, 'joesguns');
    if (pid === 0) {
      ns.tprintf(
        "ERROR: failed to prepare joesguns, batch-manager won't work, manual intervention needed",
      );
      return;
    }
    while (ns.isRunning(pid)) {
      await ns.sleep(1000);
    }

    // enough RAM to kick off the HWGW batch manager!
    ns.run('batch-manager.js');
  }
}
