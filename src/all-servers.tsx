import { NS } from '@ns';
import React from './lib/react';
import { TableCell, TableHeader } from './lib/components';
import { getAllHosts } from './lib/hosts';

type Host = {
  name: string;
  ram: number;
  root: boolean;
};

const HostRow = ({ host }: { host: Host }) => {
  return (
    <tr>
      <TableCell>{host.name}</TableCell>
      <TableCell>{host.ram} GB</TableCell>
      <TableCell>{host.root ? 'yes' : 'no'}</TableCell>
    </tr>
  );
};

const HostTable = ({ hosts }: { hosts: Array<Host> }) => {
  return (
    <table
      style={{
        borderCollapse: 'collapse',
      }}
    >
      <tr>
        <TableHeader>Name</TableHeader>
        <TableHeader>RAM</TableHeader>
        <TableHeader>Root</TableHeader>
      </tr>
      {hosts.map((h) => (
        <HostRow host={h} />
      ))}
    </table>
  );
};

export async function main(ns: NS) {
  // enumerate all the potential machines out there
  const machines = new Set([
    'home',
    ...ns.getPurchasedServers(),
    ...getAllHosts(ns),
  ]);

  const hosts = [...machines]
    .map((host) => {
      return {
        name: host,
        ram: ns.getServerMaxRam(host),
        root: ns.hasRootAccess(host),
      };
    })
    .filter((h) => h.ram > 0);

  hosts.sort((a, b) => b.ram - a.ram);

  ns.tprintRaw(<HostTable hosts={hosts} />);
}
