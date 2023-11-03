import { NS } from "@ns";
import React from "./lib/react";

const TestComponent = (props) => {
  console.log(props);
  return <span>Hello world</span>;
};

export async function main(ns: NS) {
  ns.tprintRaw(<TestComponent></TestComponent>);
}
