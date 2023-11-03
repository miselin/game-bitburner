import { NS } from "@ns";

import { killallOnServer } from "./run-batches-everywhere";

export async function main(ns: NS) {
  const host = ns.getHostname();
  await killallOnServer(ns, host);
}
