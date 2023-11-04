/**
 * Does NOT work inside the Bitburner environment - the 'chatgpt'
 * library expects a Node.js environment.
 */

import { ChatGPTAPI } from 'chatgpt';
import { OPENAPI_KEY } from '../../src/lib/env';

async function main() {
  const api = new ChatGPTAPI({
    apiKey: OPENAPI_KEY,
  });

  const res = await api.sendMessage('Hello World!');
  console.log(res.text);
}

main();
