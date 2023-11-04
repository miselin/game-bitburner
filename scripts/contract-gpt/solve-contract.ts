/**
 * Does NOT work inside the Bitburner environment - the 'chatgpt'
 * library expects a Node.js environment.
 *
 * No, it doesn't solve every contract perfectly.
 */

import { ChatGPTAPI } from 'chatgpt';
import { OPENAPI_KEY } from '../../src/lib/env';
import fs from 'node:fs/promises';

async function main() {
  const api = new ChatGPTAPI({
    apiKey: OPENAPI_KEY,
  });

  const prompt = `You are a coding contract solver, receiving a description of a contract that outlines a coding problem to solve. You need to provide a working TypeScript solution to the problem presented in the contract. The input data for the contract will be contained inside << and >> tags, with the prefix "Data: ". The contract is as follows.\n`;

  const contract = await fs.readFile(process.argv[2]);

  const res = await api.sendMessage(`${prompt}\n\n${contract}`);
  console.log(res.text);
}

main();
