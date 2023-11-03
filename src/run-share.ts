import { NS } from '@ns';

export async function main(ns: NS) {
  // run ns.share on every purchased server to increase rep gain
  // useful when just wanting to grind rep to get an aug or something
  const servers = ns.getPurchasedServers().slice(4);
  servers.forEach((server) => {
    const threads = ns.getServerMaxRam(server) / ns.getScriptRam('share.js');
    ns.killall(server);
    ns.scp('share.js', server);
    ns.exec('share.js', server, threads);
  });
}
