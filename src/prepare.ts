/**
Weak, Hack, and Grow only affect the server *once they execute*.
Time for execution is calculated at *launch of the process*

You can run multiple Weak, Hack, and Grow commands on the same server *in parallel*.

For example, if you've fully weaken and grown your servers first (which you must do for this to work)
you could get something like this

WeakenTime = 1 minuteGrowTime = 45 secondHackTime = 15 seconds

You can execute a command to weaken the server, grow the server (with a sleep that is the difference
of WeakenTime and GrowTime) and hack (with a sleep that is the difference between WeakenTime and HackTime).

Then you adjust the sleeps by 100-200ms, making sure Hack fires first ( which needs to only take 50% of the funds),
then Grow (which needs to grow at least 100% to replace funds hacked) then Weaken which will reset the security
level back to the minimum.

Then repeat that script every 1 second, and you'll get 50% of the server's maximum money per second.

To maintain stability:
- Math.floor() for hacks threads
- Math.ceil for grows/weakens threads

Don't sleep forever, sleep for shorter time and check the deadline of the script(s)
This handles level-ups during the batch!

** need to get the server to min security and max money before batching! **
 */
import { NS } from "@ns";
import { growThreadsFor, weakenThreadsFor } from "./lib/hacks";

export async function main(ns: NS) {
  ns.disableLog("ALL");

  const target = ns.args[0] as string;

  // eslint-disable-next-line
  while (true) {
    const maxRam =
      ns.getServerMaxRam(ns.getHostname()) -
      ns.getServerUsedRam(ns.getHostname());
    const maxThreads = Math.floor(maxRam / 2);
    if (maxThreads < 0) {
      ns.printf(
        "ERROR: PREP: maxThreads was < 0 on %s for target %s!",
        ns.getHostname(),
        target
      );
      return;
    }

    const maxMoney = ns.getServerMaxMoney(target);
    const availableMoney = ns.getServerMoneyAvailable(target);

    const minSecurity = ns.getServerMinSecurityLevel(target);
    const currentSecurity = ns.getServerSecurityLevel(target);

    let grows = growThreadsFor(ns, target);
    const origGrows = grows;
    if (grows > maxThreads) {
      grows = maxThreads;
    }
    let weakens = weakenThreadsFor(ns, target);
    const origWeakens = weakens;
    if (weakens > maxThreads) {
      weakens = maxThreads;
    }

    if (maxMoney === availableMoney && minSecurity === currentSecurity) {
      ns.printf("PREP: server %s is prepared", target);
      break;
    }

    if (grows === 0 && weakens === 0) {
      ns.printf(
        "PREP: server %s is prepared, unexpected result (%.2f %.2f %.2f %.2f)",
        target,
        maxMoney,
        availableMoney,
        minSecurity,
        currentSecurity
      );
      break;
    }

    if (weakens > 0) {
      ns.printf(
        "PREP: weakening %s with %d threads (wanted %d threads)",
        target,
        weakens,
        origWeakens
      );
      const weaken = ns.run("weaken.js", weakens, target);
      if (weaken === 0) {
        ns.printf("PREP: server %s failed to weaken", target);
        return;
      }
      while (ns.isRunning(weaken)) {
        await ns.sleep(1000);
      }
    }

    if (grows > 0) {
      ns.printf(
        "PREP: growing %s with %d threads (wanted %d threads)",
        target,
        grows,
        origGrows
      );
      const grow = ns.run("grow.js", grows, target);
      if (grow === 0) {
        ns.printf("PREP: server %s failed to grow", target);
        return;
      }
      while (ns.isRunning(grow)) {
        await ns.sleep(1000);
      }
    }

    // safety net
    await ns.sleep(10);
  }
}
