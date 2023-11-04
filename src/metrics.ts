/**
 * Pushes metrics to an InfluxDB server every 15 seconds.
 *
 * Requires env.ts & an InfluxDB server to be accessible.
 */

import { NS } from '@ns';
import { InfluxDB, Point } from '@influxdata/influxdb-client-browser';
import { ensureString } from './lib/typing';
import { getAllHosts } from './lib/hosts';
import { INFLUXDB_HOSTNAME, INFLUXDB_TOKEN } from './lib/env';

export async function main(ns: NS) {
  const url = ensureString(ns.args[0], INFLUXDB_HOSTNAME);
  const token = ensureString(ns.args[1], INFLUXDB_TOKEN);

  const influxApi = new InfluxDB({ url, token }).getWriteApi(
    'home',
    'Bitburner',
    'ns',
  );

  // eslint-disable-next-line
  while (true) {
    const t = new Date();

    const player = ns.getPlayer();
    const resetInfo = ns.getResetInfo();
    const servers = getAllHosts(ns).map(ns.getServer);

    // basic game metrics
    influxApi.writePoint(
      new Point('player.playtime')
        .floatField('value', player.totalPlaytime)
        .timestamp(t),
    );
    influxApi.writePoint(
      new Point('player.reset')
        .floatField('value', t.getTime() - resetInfo.lastAugReset)
        .timestamp(t),
    );
    influxApi.writePoint(
      new Point('player.money').floatField('value', player.money).timestamp(t),
    );

    // skills
    Object.entries(player.skills).forEach(([skill, value]) => {
      influxApi.writePoint(
        new Point('player.skills').floatField(skill, value).timestamp(t),
      );
    });

    // XP
    Object.entries(player.exp).forEach(([skill, value]) => {
      influxApi.writePoint(
        new Point('player.xp').floatField(skill, value).timestamp(t),
      );
    });

    // Multipliers
    Object.entries(player.mults).forEach(([skill, value]) => {
      influxApi.writePoint(
        new Point('player.multiplier').floatField(skill, value).timestamp(t),
      );
    });

    // servers
    servers.forEach((server) => {
      influxApi.writePoint(
        new Point('server')
          .tag('name', server.hostname)
          .tag('purchased', server.purchasedByPlayer ? 'yes' : 'no')
          .tag(
            'target',
            server.purchasedByPlayer || server.hostname === 'home'
              ? 'no'
              : 'yes',
          )
          .floatField('money', server.moneyAvailable)
          .floatField('max_money', server.moneyMax)
          .floatField('cores', server.cpuCores)
          .floatField('ram_used', server.ramUsed)
          .floatField('ram', server.maxRam)
          .floatField('security_level', server.hackDifficulty)
          .floatField('min_security_level', server.minDifficulty)
          .floatField('ports_needed', server.numOpenPortsRequired)
          .floatField('ports_opened', server.openPortCount)
          .floatField('hacking_skill', server.requiredHackingSkill)
          .floatField('growth', server.serverGrowth)
          .timestamp(t),
      );
    });

    await influxApi.flush();
    await ns.sleep(15000);
  }
}
