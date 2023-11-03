import { NS } from "@ns";

export async function main(ns: NS) {
  if (!performance.__MONKEY_PATCHED__) {
    performance.origNow = performance.now;
    performance.__MONKEY_PATCHED__ = true;
  }

  performance.now = (...args) => {
    return performance.origNow(...args) / 100000.0;
  };
}
