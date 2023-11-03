import { NS } from "@ns";

export async function main(ns: NS) {
  /** undocumented function */
  ns.exploit();

  /**
   * click the unclickable
   * bypass document ram cost
   */
  const doc = globalThis["document"];
  const elem = doc.getElementById("unclickable");
  if (!elem) {
    return;
  }

  const orig = elem.onclick;
  // wrap the onclick event so we can ninja hide it
  elem.onclick = (ev) => {
    console.log("hey");
    elem.style.display = "none";
    elem.style.visibility = "hidden";
    orig(ev);
    elem.onclick = orig;
  };
  elem.style.display = "block";
  elem.style.visibility = "";
}
