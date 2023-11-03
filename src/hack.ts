import { NS } from "@ns";

const LOG = false;

export async function main(ns: NS) {
  if (typeof ns.args[0] !== "string") {
    throw new Error("requires a string");
  }
  if (ns.args[1]) {
    if (typeof ns.args[1] !== "number") {
      throw new Error("requires a number");
    }
    await ns.sleep(ns.args[1]);
  }
  const before = Date.now();
  const amount = await ns.hack(ns.args[0]);
  const after = Date.now();
  if (LOG) {
    let batch = -1;
    if (ns.args[2] !== undefined) {
      if (typeof ns.args[2] !== "number") {
        throw new Error("requires a number");
      }
      batch = ns.args[2];
    }
    ns.tprintf(
      `INFO: hack   ${ns.args[0]} ${before}->${after} ${batch} - took ${amount}`
    );
  }
}
