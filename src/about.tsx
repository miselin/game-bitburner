import { NS, AutocompleteData } from '@ns';
import React from './lib/react';
import { analyzeTarget } from './lib/hacks';

export function autocomplete(data: AutocompleteData) {
  return [...data.servers];
}

function Analysis({
  analysis,
}: {
  analysis: ReturnType<typeof analyzeTarget>;
}) {
  return (
    <div>
      <table>
        <tr>
          <th colSpan={2} style={{ textAlign: 'center' }}>
            <h3>Analysis of {analysis.target}</h3>
          </th>
        </tr>
        <tr>
          <td>growTime</td>
          <td>{analysis.growTime}</td>
        </tr>
        <tr>
          <td>hackTime</td>
          <td>{analysis.hackTime}</td>
        </tr>
        <tr>
          <td>weakenTime</td>
          <td>{analysis.weakenTime}</td>
        </tr>
        <tr>
          <td>grows</td>
          <td>{analysis.grows}</td>
        </tr>
        <tr>
          <td>hacks</td>
          <td>{analysis.hacks}</td>
        </tr>
        <tr>
          <td>hacks2</td>
          <td>
            {analysis.hacks2}, {analysis.hacks2 * analysis.goalMoney}
          </td>
        </tr>
        <tr>
          <td>weakensAfterGrow</td>
          <td>{analysis.weakensAfterGrow}</td>
        </tr>
        <tr>
          <td>weakensAfterHack</td>
          <td>{analysis.weakensAfterHack}</td>
        </tr>
        <tr>
          <td>total threads</td>
          <td>{analysis.totalThreads}</td>
        </tr>
        <tr>
          <td>total RAM</td>
          <td>{analysis.totalRam}</td>
        </tr>
      </table>
    </div>
  );
}

export async function main(ns: NS) {
  const host = ns.args[0] as string;
  if (!host) {
    ns.tprint('a host must be provided');
    return;
  }

  const cores = ns.getServer().cpuCores;
  const analysis = analyzeTarget(ns, host, cores);

  ns.tprintRaw(<Analysis analysis={analysis} />);
}
