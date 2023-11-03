import { NS } from "@ns";

type Host = {
  name: string;
  money: number;
  currentMoney: number;
  level: number;
  securityLevel: number;
  minSecurityLevel: number;
};

function printHost(ns: NS, host: Host) {
  ns.tprintf(
    "%12d: %s: %12d max money, %12d current money (%6.2f%%), %8.2f security (min %6.2f) - hacking level %d\n",
    Date.now(),
    host.name,
    host.money,
    host.currentMoney,
    (host.currentMoney / host.money) * 100.0,
    host.securityLevel,
    host.minSecurityLevel,
    host.level
  );
}

export async function main(ns: NS) {
  const host = ns.args[0] as string;
  if (!host) {
    ns.tprint("a host must be provided");
    return;
  }

  // eslint-disable-next-line
  while (true) {
    const maxMoney = ns.getServerMaxMoney(host);
    const currentMoney = ns.getServerMoneyAvailable(host);
    const hackingLevel = ns.getServerRequiredHackingLevel(host);
    const securityLevel = ns.getServerSecurityLevel(host);
    const minSecurityLevel = ns.getServerMinSecurityLevel(host);

    if (!ns.hasRootAccess(host)) {
      ns.tprint("no root access");
      return;
    }

    const hostData = {
      name: host,
      money: maxMoney,
      currentMoney: currentMoney,
      level: hackingLevel,
      securityLevel,
      minSecurityLevel,
    };

    printHost(ns, hostData);

    await ns.sleep(1000);
  }
}
