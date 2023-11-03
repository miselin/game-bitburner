import { NS } from '@ns';

export async function main(ns: NS) {
  const numServers = ns.getPurchasedServers().length;

  // early on, just hit one server with _everything_
  // that has the best profitability. then later we can shard!
  // we really need to have all our purchased servers first, anyway
  if (ns.getPlayer().skills.hacking < 100 && numServers < 25) {
    ns.run('manager.js', 1, 'joesguns', 0, 1);
  } else {
    // divide into chunks of 4 slots to hit 4 different targets simultaneously
    // spread the difficulty arounnd too
    ns.run('manager.js', 1, 'neo-net', 0, 4);
    // ns.run("manager.js", 1, "phantasy", 1, 4);
    ns.run('manager.js', 1, 'max-hardware', 1, 4);
    ns.run('manager.js', 1, 'sigma-cosmetics', 2, 4);
    ns.run('manager.js', 1, 'joesguns', 3, 4); // TODO: detect when this has root and add it then
  }
}
