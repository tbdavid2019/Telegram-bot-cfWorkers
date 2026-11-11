# Tasks

## 1. Phase 1 - Transport Foundation, Disabled Menus & Financial Tabular Views

- [x] 1.1 Implement `sendRichMessage` and `sendRichMessageWithContext` in `src/telegram/telegram.js` with structured error handling and paragraph-aware 4,096-character chunked fallback to `sendMessage`, verified by mocked HTTP 400 tests in `test/rich-messages.test.js`
- [x] 1.2 Create `src/telegram/rich.js` builder module providing `buildRichTable` supporting `is_compact: true`, `is_striped: true`, HTML escaping, and max 20 column limits, verified via unit tests
- [x] 1.3 Upgrade `/stock` and `/stock2` in `src/features/stock.js` to output native rich tables for equity price and volume data with dual-mode fallback, verified by output assertion tests
- [x] 1.4 Upgrade `/fund` in `src/features/stock.js` to render the AI hedge fund consensus decision, confidence percentage, and individual analyst signals inside `InputRichBlockTable`, verified by unit tests in `test/stock-fund.test.js`
- [x] 1.5 Update inline keyboard builder in `src/telegram/telegram.js` to support the Telegram 10.3 `DisabledButton` schema (`"disabled": {}`) omitting `callback_data`, and apply to active item indication in `/model` (`src/features/llm.js`) and `/setimg` (`src/features/image-gen.js`)

## 2. Phase 2 - Interactive Details, Thinking Visibility & Inline Buttons

- [ ] 2.1 Implement `buildRichDetails` helper in `src/telegram/rich.js` adhering to `<details>` and `<summary>` specs with recursive block support, verified via block hierarchy unit tests
- [ ] 2.2 Enhance ReAct autonomous tool-calling loop in `src/agent/llm.js` to wrap intermediate tool execution traces (e.g. `/web`, `/wt`) inside expandable `InputRichBlockDetails` blocks
- [ ] 2.3 Implement `InputRichBlockButtons` and `RichMessageButton` row builders (1-8 buttons per row) in `src/telegram/rich.js`, and wire contextual quick action buttons into `/stock2` equity summaries
- [ ] 2.4 Verify all Phase 2 rich block schemas against Telegram Bot API 10.3 specifications and verify dual-mode fallback text rendering in `test/rich-messages.test.js`

## 3. Phase 3 - Private-Chat Streaming Drafts, Distributed Cancellation & Native Maps

- [ ] 3.1 Implement `sendRichMessageDraft` in `src/telegram/telegram.js` with strict private-chat guards (`chat_id > 0`), minimum 800ms debounce throttling, and support for `InputRichBlockThinking` in ephemeral payloads, verified via mock timing tests
- [ ] 3.2 Wire `stopped_message_generation` update handling in `src/index.js` to record a cancellation flag in `DATABASE` (KV) with a 60-second TTL
- [ ] 3.3 Connect streaming loops in `src/agent/llm.js` to check the KV cancellation flag, raise `UserAbortError` upon detection, and strictly short-circuit downstream model fallback chains in `src/agent/openai.js` and `src/agent/request.js`
- [ ] 3.4 Implement draft lifecycle finalization ensuring an unconditional `sendRichMessage` is delivered upon stream completion to prevent draft expiration after 30 seconds
- [ ] 3.5 Implement `buildRichMap` in `src/telegram/rich.js` and integrate into `/gps` (`src/features/location.js`) to render native map blocks with latitude, longitude, and zoom parameters
- [ ] 3.6 Run full project test suite across all 3 phases, verify zero regressions, and update `CHANGELOG.md` with complete documentation for Telegram Bot API 10.3 Rich Message support

## Workflow follow-up

- Coordinate deployment across Workers environments with `ENABLE_RICH_MESSAGES` and `ENABLE_STREAM_DRAFTS` feature flags.
- Verify production rich message rendering across Telegram iOS, Android, and Desktop clients.
