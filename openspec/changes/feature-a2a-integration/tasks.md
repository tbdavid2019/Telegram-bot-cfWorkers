## 1. Preparation

- [x] 1.1 Add `@a2a-js/sdk` to `package.json` devDependencies.
- [x] 1.2 Update `build.js` to ensure the new dependency is bundled correctly.

## 2. A2A Protocol Implementation

- [x] 2.1 Create `src/features/a2a.js` to handle A2A JSON-RPC requests and Agent Card logic.
- [x] 2.2 Add the `/a2a` route to `src/index.js` and link it to the A2A handler.
- [x] 2.3 Implement the Agent Card generation based on current bot features.

## 3. Agent Delegation & LLM Integration

- [/] 3.1 Implement the `delegate_to_agent` tool in `src/agent/request.js` or `src/agent/llm.js`.
- [ ] 3.2 Update the system prompt/toolset in `src/agent/agents.js` to expose the delegation capability.
- [ ] 3.3 Implement the A2A client logic to send `createTask` requests to other agents.

## 4. Configuration & Peer Registry

- [ ] 4.1 Implement a `PeerRegistry` class to parse `A2A_PEERS` environment variable.
- [ ] 4.2 Add alias-to-name resolution logic in the registry.

## 5. Verification & Testing

- [ ] 5.1 Create a mock A2A agent (simple script) to test incoming/outgoing calls.
- [ ] 5.2 Verify that a natural language request like "Ask no.2 to..." correctly triggers an A2A call.
