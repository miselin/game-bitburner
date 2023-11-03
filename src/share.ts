import { NS } from "@ns";

export async function main(ns: NS) {
  // eslint-disable-next-line
  while (true) {
    await ns.share();
  }
}
