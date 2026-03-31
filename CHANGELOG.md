# Changelog

All notable changes to this project will be documented in this file.

## [1.6.1] - 2026-03-31

### Fixed
- **Web Page Branding**: Replaced all legacy `TBXark / ChatGPT-Telegram-Workers` references with `tbdavid2019 / Telegram-Bot-Workers` across HTML title, meta author, footer links, and version check URL.

## [1.6.0] - 2026-03-31

### Added
- **Soul 人格切換系統**: 動態載入 SOUL.md 人格模板，無需重新部署即可切換 Bot 角色。
  - New command: `/soul <URL>` — 從遠端 URL 載入 SOUL.md（支援 GitHub blob URL 自動轉換為 raw URL）
  - New command: `/soul info` — 查看目前人格名稱、來源與載入時間
  - New command: `/soul reset` — 重置為預設人格，自動清除聊天歷史
  - Soul 資料以 `soul:{chatId}:{botId}` 存入 DATABASE（KV），各 chat 獨立
  - LLM prompt 自動以 soul content 取代 `SYSTEM_INIT_MESSAGE`（與 Command Discovery、長期記憶完全相容）
  - 相容 [awesome-openclaw-agents](https://github.com/mergisi/awesome-openclaw-agents) 模板庫

## [1.5.1] - 2026-03-27

### Fixed
- **A2A LLM Context Injection**: Fixed `No LLM provider enabled for A2A` error by providing the complete `ENV.USER_CONFIG` context to the receiving peer's LLM initiator. 
- **Cloudflare Error 1042 Bypass**: Bypassed same-zone worker fetch limits by utilizing Cloudflare Service Bindings (`WORKER_ENV[peer.binding]`) for internal A2A communication.
- **A2A Delegate Parameter Parsing**: Improved parsing of `[CALL:/delegate]` parameters to strip surrounding quotes and trailing whitespaces, preventing `peer not found` errors.
- **LLM Peer Discovery**: Registered `/delegate` into global command handlers and exposed `A2A_PEERS` via the dynamic system prompt so the LLM is correctly informed of peer aliases.

## [1.5.0] - 2026-03-26

### Added
- **A2A (Agent-to-Agent) Protocol Integration**: 
    - Full support for A2A 1.0 standard (JSON-RPC 2.0).
    - New `/a2a` endpoint for cross-agent communication.
    - New `/.well-known/agent.json` endpoint for Agent Card discovery.
    - Outbound delegation support via `delegate_to_agent` tool in LLM.
    - Multi-agent mesh networking support via `A2A_PEERS` configuration.

### Improved
- LLM pipeline now supports asynchronous "virtual commands" for agent collaboration.
- Tool calling system refined to handle multi-step interactions between bots.

## [1.4.0] - 2026-01-29
### Added
- **Long-term Memory**: Persistent user and global memory via KV/R2.
- Commands: `/memory`, `/memoryclear`, `/memoryglobal`.

## [1.3.0] - 2026-01-02
### Added
- **Tool Calling Mode**: Automatic integration with Google Sheets and Google Calendar.
- **Scheduled Notifications**: Daily summaries and hourly reminders for family events.

## [1.2.0] - 2026-01-01
### Added
- **Voice Message Support**: Groq-powered ASR (transcription) and TTS (voice reply).
- Command: `/voicereply`.
