# Spec Delta

## Purpose

Enables Telegram Bot to send modern Rich Messages with compact tables, expandable details, streaming drafts with distributed user stop control, and embedded maps while preserving resilient fallback and strict Telegram schema adherence.

## ADDED Requirements

### Requirement: Send Rich Message with Resilient Chunked Fallback
The system SHALL provide a `sendRichMessage` transport method that transmits structured `InputRichMessage` payloads to Telegram Bot API. If the endpoint responds with an error indicating an unsupported format or client rejection (HTTP 400), the system SHALL downgrade the content to standard `sendMessage`. If the fallback content exceeds 4,096 characters, the system SHALL chunk the text safely by paragraph into multiple messages.

#### Scenario: Successful rich message delivery
- **WHEN** a feature requests delivery of an `InputRichMessage` payload containing valid blocks or rich HTML
- **THEN** the system dispatches a POST request to `/sendRichMessage` with the serialized payload and returns the sent `Message`

#### Scenario: Graceful chunked fallback on legacy client rejection
- **WHEN** `/sendRichMessage` returns a 400 Bad Request error indicating legacy client or unsupported formatting
- **THEN** the system converts the blocks into Markdown/HTML text and transmits the content via `/sendMessage`, chunking safely if over 4,096 characters

### Requirement: Native Tabular Rendering for Market & AI Hedge Fund Analysis
The system SHALL format financial quotes and fund disclosures as `InputRichBlockTable` with customizable properties including `is_compact: true` and `is_striped: true`.

#### Scenario: Rendering stock market quotes in compact table
- **WHEN** a user issues `/stock` or `/stock2` for a valid equity ticker
- **THEN** the bot formats opening, high, low, closing prices, and institutional buy/sell volumes as cells inside an `InputRichBlockTable`

#### Scenario: Rendering AI hedge fund consensus table
- **WHEN** a user issues `/fund` for a target ticker
- **THEN** the bot formats the consensus decision, confidence percentage, and individual analyst signals (e.g. Warren Buffett, Cathie Wood) inside an `InputRichBlockTable`

### Requirement: Menu Disabled Button State Representation
The system SHALL format inactive or currently selected menu buttons using the Telegram `DisabledButton` schema (`"disabled": {}`) and SHALL omit conflicting `callback_data`.

#### Scenario: Displaying active model or provider as disabled
- **WHEN** a user opens `/model` or `/setimg` menus
- **THEN** the button corresponding to the currently active model or image provider is emitted with `"disabled": {}` and no `callback_data`, visually graying it out

### Requirement: Expandable Details for AI Reasoning and Tool Traces
The system SHALL format multi-step tool execution traces and model reasoning inside collapsible `InputRichBlockDetails` blocks for delivered messages, reserving `InputRichBlockThinking` strictly for ephemeral drafts.

#### Scenario: Collapsing ReAct autonomous tool-calling traces
- **WHEN** the LLM invokes autonomous tools across multiple rounds in `src/agent/llm.js`
- **THEN** intermediate tool execution logs and tool outputs are rendered inside an expandable `InputRichBlockDetails` block with a summary header

### Requirement: Private-Chat Streaming Drafts with Distributed Cancellation
The system SHALL support sending ephemeral preview drafts via `sendRichMessageDraft` with `can_stop: true` exclusively in private chats. Upon receiving `stopped_message_generation`, the system SHALL persist a cancellation flag in `DATABASE` KV, abort the active generation loop, and SHALL NOT trigger downstream model fallback chains.

#### Scenario: Streaming draft in private chat with finalization
- **WHEN** an LLM streams a response in a private chat (`chat_id > 0`)
- **THEN** the system throttles updates via `sendRichMessageDraft` at minimum 800ms intervals and sends a final `sendRichMessage` upon completion to persist the message

#### Scenario: User clicks native stop button
- **WHEN** Telegram delivers a webhook update with `stopped_message_generation`
- **THEN** the webhook handler records a cancellation flag in `DATABASE` KV, the streaming Worker detects it, halts generation immediately, and aborts without switching to fallback LLM profiles

#### Scenario: Group chats bypass streaming drafts
- **WHEN** an LLM streams a response inside a group chat (`chat_id < 0`)
- **THEN** the system bypasses `sendRichMessageDraft` and directly delivers the final response via `sendRichMessage`

### Requirement: Embedded Native Map for Location Service
The system SHALL support formatting geolocation coordinates as `InputRichBlockMap` with configurable latitude, longitude, and zoom level.

#### Scenario: Rendering GPS location as native map
- **WHEN** a user executes `/gps` or shares a geolocation pin
- **THEN** the bot renders the coordinates using an `InputRichBlockMap` embedded directly into the response message
