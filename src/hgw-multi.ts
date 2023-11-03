import { NS } from "@ns";

export async function main(ns: NS) {
  ns.args.forEach((a) => {
    if (typeof a !== "string") {
      throw new Error("requires a string");
    }
    ns.run("hgw.js", 1, a);
  });
}
