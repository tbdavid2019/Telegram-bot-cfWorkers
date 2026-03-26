import { UserConfig, mergeEnvironment } from './src/config/env.js';

const target = new UserConfig();
const source = {
  A2A_PEERS: `
{
  "no.2": {
    "url": "https://tgbotaws.oobwei.workers.dev/a2a",
    "names": ["小江管家2", "no.2"]
  }
}
`
};

mergeEnvironment(target, source);

console.log("Parsed A2A_PEERS:", target.A2A_PEERS);
console.log("Is A2A_PEERS an object?", typeof target.A2A_PEERS);
