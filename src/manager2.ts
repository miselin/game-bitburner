// We want this script to basically analyze the existing servers
// It will use one slot for hacks, one slot for grows, one slot for weakens
// It will decide which target for all three:
// - hack those with money > 75%
// - weaken the server with the highest security level
// - grow the server with the lowest % cash
//
// bonus points: figure out how to minimze the # of threads for hack to avoid over-hacking

import { NS } from "@ns";

export async function main(ns: NS) {
  ns.tprint("todo");
}
