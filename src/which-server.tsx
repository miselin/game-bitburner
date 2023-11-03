import { NS } from "@ns";
import { Host, analyzeHackableHosts } from "./lib/hosts";
import React from "./lib/react";
import { TableCell, TableHeader } from "./lib/components";

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
      <TableCell>{(host.moneyPerMs / 1000).toFixed(4)}</TableCell>
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
  const hosts = analyzeHackableHosts(ns);
  ns.tprintRaw(<HostTable hosts={hosts} />);
}
// foo
