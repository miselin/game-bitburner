import { NS } from "@ns";
import { killallOnServer } from "./lib/run";

/**
 * For when I make a mistake in run-batches-everywhere and need to undo on home.
 */

export async function main(ns: NS) {
  const host = ns.getHostname();
  await killallOnServer(ns, host);
}
