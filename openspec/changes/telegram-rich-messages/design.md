# Design

## Context

The Telegram Bot runs serverless in Cloudflare Workers under `nodejs_compat`. Telegram Bot API 10.1–10.3 introduced rich message capabilities (`sendRichMessage`, `sendRichMessageDraft`) supporting up to 32,768 characters and rich blocks (`table`, `details`, `thinking`, `buttons`, `map`). This design establishes a robust, zero-external-dependency layer in `src/telegram/` that guarantees schema conformity, respects serverless execution boundaries, and coordinates cancellation across stateless isolates.

## Goals / Non-Goals

**Goals:**
- Provide a clean, declarative block builder API (`createRichTable`, `createRichDetails`, `createRichButtons`, `createRichMap`) in `src/telegram/rich.js`.
- Deliver progressive enhancements across 3 distinct phases without breaking changes.
- Implement resilient fallback: if `/sendRichMessage` fails with HTTP 400, automatically downgrade to standard `sendMessage` with 4,096-character safe paragraph chunking.
- Implement distributed cancellation for `sendRichMessageDraft`: handle `stopped_message_generation` via `DATABASE` (KV) so cancellation succeeds across different Worker isolates, while strictly inhibiting model fallback chains upon user abort.
- Enforce Telegram Bot API 10.3 schema accuracy (`disabled: {}` for inactive buttons, `RichMessageButton` for inline button rows, and restriction of `InputRichBlockThinking` to streaming drafts).

**Non-Goals:**
- Rewriting underlying financial market data providers or inventing new synthetic data.
- Introducing heavy AST or markdown compilation libraries into Cloudflare Workers bundle.
- Using Durable Objects for simple short-lived cancel signals when lightweight Workers KV with TTL suffices.

## Decisions

### 1. Dedicated `src/telegram/rich.js` Builder Module
- **Choice**: Create `src/telegram/rich.js` providing helper functions (`sendRichMessageWithContext`, `buildRichTable`, `buildRichDetails`, `buildRichButtons`, `buildRichMap`).
- **Rationale**: Isolates Telegram API schema nuances, provides HTML escaping, validates max block constraints (500 blocks, 20 columns), and guarantees uniform fallback handling.
- **Alternatives considered**: Manually handcrafting JSON in feature modules (error-prone, leads to duplicate error handling).

### 2. Dual-Mode Rendering with 32K-to-4K Chunked Fallback
- **Choice**: Every rich builder function produces both the primary `InputRichBlock` representation and an equivalent plain/HTML text payload. If `/sendRichMessage` fails with HTTP 400 (legacy client or unsupported format), the system falls back to `sendMessage`, splitting content exceeding 4,096 characters by paragraph (and performing secondary character-limit chunking if a single paragraph exceeds 4,000 characters), while ensuring unclosed HTML tags are automatically closed per chunk using `fixUnclosedTags`.
- **Rationale**: Allows seamless presentation on modern clients while fully safeguarding legacy clients without dropping content or causing formatting parsing failures.
- **Alternatives considered**: Truncating text at 4,096 characters (causes data loss).

### 3. Distributed Cancellation via Workers KV with Short TTL
- **Choice**: When a private-chat streaming draft begins, assign a unique `draft_id = Date.now()`. When Telegram posts `stopped_message_generation` to `src/index.js`, write a key `cancel_signal:${chat_id}:${draft_id}` to `DATABASE` (Workers KV) with `expirationTtl: 60`. In the streaming worker loop (throttled at 800ms), check this key before dispatching each `sendRichMessageDraft`. If set, raise a distinct `UserAbortError` to abort both upstream fetch and downstream tool loops.
- **Rationale**: In Cloudflare Workers, the webhook update hits a stateless isolate. Workers KV provides best-effort cross-isolate coordination without requiring heavyweight Durable Object infrastructure.
- **Alternatives considered**: In-memory `Map` (fails completely in serverless multi-isolate setups).
- **Alternatives considered**: In-memory `Map` (fails completely in serverless multi-isolate setups).

### 4. User Abort Invalidation of Model Fallback Chains
- **Choice**: In `src/agent/request.js`, `src/agent/openai.js`, and `src/agent/llm.js`, catch `UserAbortError` and immediately abort the entire request chain without evaluating `fallbackProfile` or backup tiers.
- **Rationale**: When a user explicitly taps "Stop", they intend to stop all generation. Allowing fallback to trigger would paradoxically start a new model invocation.
- **Alternatives considered**: Treating abort as a general network failure (causes runaway fallback generation).

### 5. Private-Chat Guard and Draft Lifecycle Finalization
- **Choice**:
  - `sendRichMessageDraft` is exclusively executed if `chat_id > 0` (Private chat). In group chats (`chat_id < 0`), draft calls are bypassed and execution directly delivers the final message.
  - Drafts expire in Telegram clients after ~30 seconds. Upon streaming completion or tool termination, the bot unconditionally invokes `sendRichMessage` to persist the final output.
- **Rationale**: Strict conformity with Telegram Bot API specifications preventing 400 Bad Request errors in group chats and preventing message disappearance after 30 seconds.

### 6. Accurate Telegram 10.3 Schema Mapping
- **Choice**:
  - `InlineKeyboardButton.disabled`: Emit `"disabled": {}` (an empty `DisabledButton` object per schema) and omit `callback_data`.
  - Inline message buttons: Emit `InputRichBlockButtons` containing an array of `RichMessageButton` (up to 8 buttons per row).
  - Thinking blocks: Emit `InputRichBlockThinking` only within `sendRichMessageDraft` payloads. Finalized messages use `InputRichBlockDetails` (`<details>`).

## Risks / Trade-offs

- **[Risk] KV Read Latency during Streaming**: Reading KV on every token chunk could add latency.  
  → *Mitigation*: Only check KV on draft emission boundaries (every 800ms throttle tick), not per individual token.
- **[Risk] Cloudflare Subrequest Rate Limits during Streaming**: Frequent `sendRichMessageDraft` calls could exceed Cloudflare subrequest quotas.  
  → *Mitigation*: Enforce a strict minimum 800ms debounce interval between draft pushes.
- **[Risk] Table Cell Overflow on Mobile**: Tables with too many columns could wrap awkwardly even with `is_compact: true`.  
  → *Mitigation*: Limit table views to a maximum of 4-5 core columns on `/stock` and `/fund`, placing auxiliary details in collapsible `<details>`.

## Migration Plan

1. **Phase 1 Deployment**: Add core transport, enrich `/stock`, `/fund`, and `/model` / `/setimg`. Zero breaking changes; instant fallback protection.
2. **Phase 2 Deployment**: Enhance agent reasoning and tools trace views via `<details>`. Add inline buttons. Pure additive UI enhancement.
3. **Phase 3 Deployment**: Roll out private-chat streaming drafts with native stop button and embedded maps. Controlled via `ENABLE_STREAM_DRAFTS` feature flag in `wrangler.toml`.
