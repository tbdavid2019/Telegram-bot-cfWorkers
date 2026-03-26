## Context

The current system is a modular Telegram bot running on Cloudflare Workers. It supports multiple LLM providers (Gemini, OpenAI, etc.) and various features (Weather, Search, Stocks). However, these bots cannot communicate with each other. This design introduces the A2A (Agent-to-Agent) protocol to enable collaborative multi-agent workflows.

## Goals / Non-Goals

**Goals:**
- Implement the A2A v1.0 protocol for incoming and outgoing messages.
- Enable the bot to discover and communicate with peer bots using natural language.
- Provide a standardized `/a2a` endpoint for external agent access.
- Support agent aliases for intuitive user interaction.

**Non-Goals:**
- Implementing a central discovery server (this phase uses static/environment-based peer lists).
- Complex multi-hop orchestration (limited to direct 1-to-1 delegation for now).

## Decisions

### 1. Protocol Implementation: @a2a-js/sdk
We will use the official `@a2a-js/sdk`. This ensures compliance with the A2A specification (JSON-RPC 2.0, Agent Cards, Task lifecycle) and simplifies future updates as the protocol evolves.
- **Rationale**: Building a custom A2A handler is error-prone and harder to maintain as the spec changes.

### 2. Endpoint: `/a2a`
A new POST route `/a2a` will be added to the main router in `src/index.js`.
- **Rationale**: Standardizing on `/a2a` makes discovery and configuration consistent across all instances.

### 3. Agent Delegation Tool
We will implement an LLM tool (function calling) called `delegate_to_agent`.
- **Tool Signature**: `delegate_to_agent(agent_name: string, task_description: string)`.
- **Rationale**: This allows the LLM to decide when another bot's specialty is needed based on the user's natural language input.

### 4. Peer Configuration (A2A_PEERS)
Peers are configured via a JSON string in environment variables.
- **Structure**: `{"Alias": {"url": "...", "token": "...", "names": ["..."]}}`.
- **Rationale**: Allows flexible configuration without code changes and supports the multi-tenant nature of the existing `wrangler.toml` setup.

## Risks / Trade-offs

- **[Risk] Execution Timeouts** → Cloudflare Workers have a 30s default timeout. Long agent-to-agent calls might exceed this.
  - **Mitigation**: Implement A2A "Task" status polling or SSE (Server-Sent Events) for longer tasks.
- **[Risk] Infinite Loops** → Bot A calls Bot B, which calls Bot A...
  - **Mitigation**: Include a `max_hops` field in the A2A message metadata and decrement it on each delegation.
- **[Risk] Bundle Size** → Adding the SDK and its dependencies might increase the worker size.
  - **Mitigation**: Use `esbuild` tree-shaking and minify the output.
