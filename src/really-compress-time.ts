/**
 * Doesn't just fake the compress time exploit. This makes stuff go fast.
 *
 * Try to avoid the temptation, it's just a neat proof of concept.
 */

/* eslint-disable */
// @ts-nocheck

export async function main() {
  // safety net
  if (!window.origSetTimeout) {
    window.origSetTimeout = setTimeout;
  }
  if (!window.origSetInterval) {
    window.origSetInterval = setInterval;
  }

  // eslint-disable-next-line
  setTimeout = (handler, timeout, ...args) => {
    window.origSetTimeout(handler, Math.floor(timeout / 1000), ...args);
  };
  // eslint-disable-next-line
  setInterval = (handler, timeout, ...args) => {
    window.origSetInterval(handler, Math.floor(timeout / 1000), ...args);
  };

  window.setTimeout = window.origSetTimeout;
  window.setInterval = window.origSetInterval;
}
