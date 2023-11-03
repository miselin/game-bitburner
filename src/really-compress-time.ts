import { NS } from "@ns";

export async function main(ns: NS) {
  // safety net
  if (!window.origSetTimeout) {
    window.origSetTimeout = setTimeout;
  }
  if (!window.origSetInterval) {
    window.origSetInterval = setInterval;
  }

  /*
  setTimeout = (handler, timeout, ...args) => {
    window.origSetTimeout(handler, Math.floor(timeout / 1000), ...args);
  };
  setInterval = (handler, timeout, ...args) => {
    window.origSetInterval(handler, Math.floor(timeout / 1000), ...args);
  };
  */

  window.setTimeout = window.origSetTimeout;
  window.setInterval = window.origSetInterval;
}
