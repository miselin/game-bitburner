import { NS } from '@ns';
import { analyzeHackableHosts } from './lib/hosts';
import { killallOnServer } from './lib/run';

export async function main(ns: NS) {
  ns.disableLog('ALL');

  // eslint-disable-next-line
  while (true) {
    // put the lowest level target on home
    const servers = ['home', ...ns.getPurchasedServers()];

    // get info about them
    const hosts = analyzeHackableHosts(ns);
    hosts.sort((a, b) => a.money - b.money);

    // until we have all 25 servers + home, don't offset the hosts list
    // otherwise we try to hit big servers when we don't have the hacking skill up yet
    let offset = servers.length === 26 ? hosts.length - servers.length : 0;
    if (offset < 0) {
      offset = 0;
    }

    for (let i = 0; i < servers.length; i++) {
      const host = hosts[i + offset];
      if (!host) {
        // server can't run anything
        // need to do this in case of a shift in server list length so we don't have duplicate processes
        if (servers[i] !== 'home') {
          await killallOnServer(ns, servers[i]);
        }
        continue;
      }

      ns.printf('INFO: want server %s to target %s', servers[i], host.name);

      ns.scp(['run-batches.js', 'hgw-batch.js'], servers[i]);
      const running = ns.getRunningScript(
        'run-batches.js',
        servers[i],
        host.name,
      );
      if (running) {
        if (running.args[0] === host.name) {
          continue;
        }
      }

      // if the top 25 shifts, we might need to terminate an old batch that is no longer in the list
      await killallOnServer(ns, servers[i]);

      ns.printf(
        'INFO: now running batches on %s, targeting %s',
        servers[i],
        host.name,
      );
      ns.exec('run-batches.js', servers[i], 1, host.name);
    }

    await ns.sleep(5000);
  }
}
