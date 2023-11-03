import { NS } from "@ns";
import { analyzeTarget, GAP } from "./hgw-batch";
import React from "./lib/react";

type Host = {
  name: string;
  ram: number;
};

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
