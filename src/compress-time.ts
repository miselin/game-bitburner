import { NS } from "@ns";

export async function main(ns: NS) {
  // gets the compress time exploit achievement
  // @ts-expect-error monkey patching
  if (!performance.__MONKEY_PATCHED__) {
    // @ts-expect-error monkey patching
    performance.origNow = performance.now;
    // @ts-expect-error monkey patching
    performance.__MONKEY_PATCHED__ = true;
  }

  performance.now = (...args) => {
    // @ts-expect-error monkey patching
    return performance.origNow(...args) / 100000.0;
  };
}
