import { NS } from "@ns";
import { analyzeTarget, GAP } from "./hgw-batch";
import React from "./lib/react";

type Host = {
  name: string;
  money: number;
  currentMoney: number;
  level: number;
  securityLevel: number;
  minSecurityLevel: number;
  moneyPerSecond: number;
};

function scanHost(
  ns: NS,
  host: string,
  machineList: Set<string>,
  maxDepth?: number
) {
  if (maxDepth !== undefined && maxDepth === 0) {
    ns.tprintf("recursion depth exceeded");
    return;
  }

  ns.scan(host).forEach((peer) => {
    if (machineList.has(peer)) {
      return;
    }

    machineList.add(peer);

    scanHost(ns, peer, machineList, maxDepth ? maxDepth - 1 : 100);
  });
}

export function getAllHosts(ns: NS) {
  const machines = new Set(["home"]);
  scanHost(ns, "home", machines);
  return [...machines];
}

const TableHeader = ({ children }: { children: React.ReactNode }) => {
  return (
    <th
      style={{
        paddingTop: "0.5em",
        paddingBottom: "0.5em",
        paddingLeft: "0.5em",
        paddingRight: "0.5em",
        textAlign: "center",
      }}
    >
      {children}
    </th>
  );
};

const TableCell = ({ children }: { children: React.ReactNode }) => {
  return (
    <td
      style={{
        paddingTop: "0.5em",
        paddingBottom: "0.5em",
        paddingLeft: "0.5em",
        paddingRight: "0.5em",
      }}
    >
      {children}
    </td>
  );
};

const HostRow = ({ n, host }: { n: number; host: Host }) => {
  return (
    <tr>
      <TableCell>{n}</TableCell>
      <TableCell>{host.name}</TableCell>
      <TableCell>{host.money}</TableCell>
      <TableCell>
        {host.currentMoney.toFixed(0)} (
        {((host.currentMoney / host.money) * 100.0).toFixed(2)}%)
      </TableCell>
      <TableCell>
        {host.securityLevel.toFixed(2)} (min {host.minSecurityLevel.toFixed(2)})
      </TableCell>
      <TableCell>{host.level}</TableCell>
      <TableCell>{host.moneyPerSecond.toFixed(4)}</TableCell>
    </tr>
  );
};

const HostTable = ({ hosts }: { hosts: Array<Host> }) => {
  return (
    <table
      style={{
        borderCollapse: "collapse",
      }}
    >
      <tr>
        <TableHeader>&nbsp;</TableHeader>
        <TableHeader>Name</TableHeader>
        <TableHeader>Max Money</TableHeader>
        <TableHeader>Current Money</TableHeader>
        <TableHeader>Security Level</TableHeader>
        <TableHeader>Hacking Level</TableHeader>
        <TableHeader>Money/second</TableHeader>
      </tr>
      {hosts.map((h, n) => (
        <HostRow host={h} n={n} />
      ))}
    </table>
  );
};

export async function main(ns: NS) {
  // enumerate all the potential machines out there
  const machines = getAllHosts(ns);

  // · As a rule of thumb, your hacking target should be the  with highest max money that's required hacking level is under 1/2 of your hacking level.

  const myHackingLevel = ns.getHackingLevel();

  // get info about them
  const hosts: Array<Host> = [];
  machines.forEach((host) => {
    const { weakenTime } = analyzeTarget(ns, host, 1);

    const maxMoney = ns.getServerMaxMoney(host);
    const currentMoney = ns.getServerMoneyAvailable(host);
    const hackingLevel = ns.getServerRequiredHackingLevel(host);
    const securityLevel = ns.getServerSecurityLevel(host);
    const minSecurityLevel = ns.getServerMinSecurityLevel(host);
    const moneyPerSecond = (maxMoney * 0.5) / (weakenTime + 2 * GAP) / 1000;

    // should only target hosts that are at most 50% of our hacking level
    if (hackingLevel * 2.0 > myHackingLevel) {
      return;
    }

    if (maxMoney === 0) {
      return;
    }

    if (!ns.hasRootAccess(host)) {
      return;
    }

    hosts.push({
      name: host,
      money: maxMoney,
      currentMoney: currentMoney,
      level: hackingLevel,
      securityLevel,
      minSecurityLevel,
      moneyPerSecond,
    });
  });

  hosts.sort((a, b) => b.money - a.money);

  ns.tprintRaw(<HostTable hosts={hosts} />);
}
