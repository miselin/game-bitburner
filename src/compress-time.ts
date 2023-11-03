export async function main() {
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
