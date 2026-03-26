## Why

This change enables "Agent-to-Agent" (A2A) communication, allowing the Telegram bot to collaborate with other AI agents. Currently, the bot operates as an isolated assistant. By implementing the A2A open protocol, it can delegate tasks to other specialized bots or offer its own specialized services (like Bazi calculation or Law Q&A) to the wider A2A ecosystem, forming a collaborative mesh network.

## What Changes

- **New A2A Endpoint**: Implement a `/a2a` POST route in the Cloudflare Worker to handle incoming A2A JSON-RPC requests.
- **SDK Integration**: Add and bundle the `@a2a-js/sdk` to handle protocol handshakes, Agent Cards, and task lifecycles.
- **Natural Language Delegation**: Add a new tool/capability for the LLM that allows it to "call" other agents when a user's request requires external collaboration.
- **Peer Configuration**: Extend the bot configuration (via `wrangler.toml`) to support a registry of peer A2A agents and their aliases.
- **Agent Card**: Generate a dynamic/static `Agent Card` that describes the bot's unique capabilities (e.g., "Web Search", "Stock Info").

## Capabilities

### New Capabilities
- `a2a-protocol`: Implementation of the A2A JSON-RPC 2.0 transport layer, authentication, and Agent Card hosting.
- `agent-collaboration`: Capability for the LLM to recognize when to delegate a task to a peer agent and handle the resulting data.
- `peer-registry`: A management system for A2A peer URLs, tokens, and user-friendly aliases.

### Modified Capabilities
- `llm-interaction`: Update the LLM prompt and toolset to include agent delegation as a first-class citizen.

## Impact

- **API**: Adds a new public endpoint `/a2a`.
- **Dependencies**: Adds `@a2a-js/sdk` to `package.json` (bundled via `esbuild`).
- **Configuration**: New environment variables `A2A_AGENT_NAME` and `A2A_PEERS` in `wrangler.toml`.
- **Latency**: Agent-to-agent calls add external network latency which needs to be handled via proper timeouts or async A2A tasks.
