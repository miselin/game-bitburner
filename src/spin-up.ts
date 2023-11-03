import { NS } from '@ns';

/**
 * Start all the necessary "home" scripts.
 *
 * After installing augs, wake up, run spin-up.js. EZ!
 */

export async function main(ns: NS) {
  let player = ns.getPlayer();
  if (player.skills.hacking < 50) {
    ns.tprint(
      'Your hacking skill is not yet 50. Study up, spin-up will continue once hacking level hits 50.',
    );
    while (player.skills.hacking < 50) {
      await ns.sleep(1000);
      player = ns.getPlayer();
    }
  }

  const homeRam = ns.getServerMaxRam('home');

  ns.run('gain-access.js');
  ns.run('update-scripts.js');
  ns.run('buy-servers.js');
  if (homeRam < 1024) {
    // early game, we need the extra income from hacknet
    ns.run('upgrade-hacknet.js');
  }
  if (homeRam > 64) {
    ns.run('hud-stats.js');
  }
  // make sure we always have at least one server to target
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

  if (homeRam < 128) {
    // low RAM, use the cheap manager
    ns.run('manager.js', 1, 'joesguns', 0, 1);
  } else {
    // enough RAM to kick off the HWGW batch manager!
    ns.run('batch-manager.js');
  }
}
