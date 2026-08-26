# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

## [1.7.0] - 2026-08-26

### Added
- **AI 對沖基金投資分析 (`/fund`)**：串接 `http://dns.glsoft.ai:6000/api/analysis`，提供 14 位傳奇投資大師（巴菲特、蒙格、木頭姐、麥可·貝瑞、彼得·林區等）多維度量化與質化評級，並支援多輪圓桌會議辯論、共識整合與多空倉位決策。
  - `/fund [股票代碼]` — 支援美股 (TSLA, NVDA)、台股 (2330.TW)、港股與多標的組合分析 (AAPL,MSFT)。
- **四大占卜與術數功能整合**：串接 `https://qi.david888.com/api/`，新增塔羅占卜、生辰八字2、八宅風水、月老姻緣功能。
  - `/tarot [問題]` — 塔羅牌抽牌與 AI 心理指引解讀（支援 `single`, `three`, `diamond`, `moon`, `horseshoe`, `celtic` 六種牌陣）。
  - `/bazi [YYYY-MM-DD] [男/女] [問題]` — 生辰八字排盤、四柱干支、十神、五行分佈統計與 AI 大師深度解盤。
  - `/fengshui [座向] [問題]` — 八宅風水宅卦分析、本命卦、九運與流年飛星吉凶佈局建議。
  - `/yinyuan [問題 或 年份 年份]` — 月老靈籤求籤、生肖合婚契合度測算、個人桃花方位指引三合一。
- **雙軌制（Dual-Track）智能引導機制**：
  - 指令層：自動進行正則容錯提取（如股票代號格式、出生年月日、性別、朝向、生肖年份），參數不齊全時回傳清晰範例引導。
  - 對話層：LLM 指令發現系統配置多輪對話引導規則，當使用者在聊天中提出算命/合婚/選股需求時，LLM 會先親切追問必要參數，收集完畢後自動觸發指令按鈕。
- **單元測試**：新增 `test/divination.test.js` 與 `test/stock-fund.test.js` 涵蓋完整測試套件。
## [1.6.2] - 2026-08-07

### Added
- **Workers AI model profile**: Added `nemotron` (`@cf/nvidia/nemotron-3-120b-a12b`) as an additional selectable Workers AI model for every deployment.

### Fixed
- **Workers Free compatibility**: Removed the unavailable `@cf/moonshotai/kimi-k2.6` profile. The `gemini` deployment now defaults to its existing Gemini Flash profile instead of an unavailable model.

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
