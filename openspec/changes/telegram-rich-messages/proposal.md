# Proposal

## Why

Currently, the Telegram Bot relies on legacy 4,096-character plain text and Markdown formatting (`sendMessage`), causing financial reports (`/stock`, `/fund`) to misalign on mobile screens, providing zero structured visibility during multi-step tool execution, and offering no native way to cancel runaway LLM completions. Telegram Bot API 10.1 introduced Rich Messages (up to 32,768 characters), 10.2 added structured blocks (`table`, `details`, `map`, `thinking`), and 10.3 (August 24, 2026) added compact tables (`is_compact: true`), inline rich buttons, `disabled: {}` button states, and native streaming stop controls (`can_stop: true` with `stopped_message_generation`). Adopting these capabilities modernizes the Bot UI, eliminates text wrapping degradation on mobile, and significantly conserves Cloudflare Worker execution time and API tokens.

## What Changes

This change introduces Telegram Rich Message support and progressive enhancement across three implementation phases, strictly aligned with Telegram Bot API 10.3 schemas and Cloudflare Workers serverless constraints:

- **Phase 1: Transport Foundation, Disabled Menus & Financial Tabular Views**
  - Implement `sendRichMessage` in `src/telegram/telegram.js` with structured error classification and dual-mode fallback (including 32K-to-4K chunked splitting) to standard `sendMessage`.
  - Implement `InputRichBlockTable` (`is_compact: true`, `is_striped: true`) for `/stock`, `/stock2`, and `/fund` (aligned with the existing AI hedge fund analyst consensus data in `src/features/stock.js`: Ticker, Decision, Confidence, and Analyst Signals).
  - Update inline keyboard generation to support `DisabledButton` schema (`"disabled": {}`) without conflicting `callback_data` for active items in `/model` and `/setimg`.

- **Phase 2: Interactive Details, Thinking Visibility & Inline Buttons**
  - Implement collapsible blocks (`InputRichBlockDetails` / `<details>`) in `src/telegram/rich.js` to neatly encapsulate ReAct tool execution traces (for `/web`, `/wt`, `/stock` inside `src/agent/llm.js`) and deep prompt rationale.
  - Implement inline action rows (`InputRichBlockButtons` containing `RichMessageButton` with 1-8 buttons per row) for contextual quick actions (e.g., jump to technical chart or related quotes) within `/stock2`.
  - Clarify that `InputRichBlockThinking` is strictly restricted to streaming drafts (Phase 3) per Telegram API specifications, using `<details>` for finalized messages.

- **Phase 3: Private-Chat Streaming Drafts, Distributed Cancellation & Native Maps**
  - Implement `sendRichMessageDraft` strictly for private chats (`chat_id > 0`), including an 800ms debounce rate limiter to preserve Cloudflare Workers subrequest limits.
  - Enforce draft lifecycle management: recognize the 30-second draft TTL and execute final persistence via `sendRichMessage` when streaming completes.
  - Implement cross-isolate cancellation: dispatch `stopped_message_generation` updates from `src/index.js` into `DATABASE` (KV) with a 60-second TTL; the streaming loop polls this signal, raises `UserAbortError`, and **strictly halts downstream model fallback chains**.
  - Implement `InputRichBlockMap` for coordinates in `/gps`.

## Capabilities

### New Capabilities
- `telegram-rich-messages`: Complete Telegram Rich Message transport, structured block generation (compact tables, details, buttons, maps), cross-isolate cancellation via KV, and streaming draft lifecycle management.

### Modified Capabilities
<!-- None: This project currently has no prior OpenSpec capabilities tracked. -->

## Impact

- **Transport & Telegram Routing**: Enhances `src/telegram/telegram.js`, dispatches new update types in `src/index.js` and `src/telegram/message.js`.
- **Features Enhanced**: `/stock` and `/fund` in `src/features/stock.js`, `/model` in `src/features/llm.js`, `/setimg` in `src/features/image-gen.js`, `/gps` in `src/features/location.js`, and the ReAct autonomous tool engine in `src/agent/llm.js`.
- **Backward Compatibility**: Fully backward compatible. All rich message methods automatically degrade to chunked `sendMessage` (max 4,096 chars per message) upon HTTP 400 or unsupported clients.
- **Dependencies & Environment**: Zero external npm dependencies. Standard Cloudflare Workers Fetch API and Workers KV storage.
