import { NS } from "@ns";

export async function main(ns: NS) {
  const filename = ns.args[0] as string;
  const host = ns.args[1] as string;
  const contractType = ns.codingcontract.getContractType(filename, host);
  const desc = ns.codingcontract.getDescription(filename, host);
  const data = ns.codingcontract.getData(filename, host);
  const tries = ns.codingcontract.getNumTriesRemaining(filename, host);

  ns.tprintf("Contract Type: %s, %d tries remain", contractType, tries);
  ns.tprintf("Description: %s", desc);
  ns.tprintf("Data: <<%v>>", data);
}
