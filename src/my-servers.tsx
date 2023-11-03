import { NS } from "@ns";
import React from "./lib/react";
import { TableCell, TableHeader } from "./lib/components";

type Host = {
  name: string;
  ram: number;
};

const HostRow = ({ n, host }: { n: number; host: Host }) => {
  return (
    <tr>
      <TableCell>{n}</TableCell>
      <TableCell>{host.name}</TableCell>
      <TableCell>{host.ram} GB</TableCell>
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
        <TableHeader>RAM</TableHeader>
      </tr>
      {hosts.map((h, n) => (
        <HostRow host={h} n={n} />
      ))}
    </table>
  );
};

export async function main(ns: NS) {
  // enumerate all the potential machines out there
  const machines = ["home", ...ns.getPurchasedServers()];

  const hosts: Array<Host> = [];
  machines.forEach((host) => {
    hosts.push({
      name: host,
      ram: ns.getServerMaxRam(host),
    });
  });

  ns.tprintRaw(<HostTable hosts={hosts} />);
}
