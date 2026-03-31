## Why

Bot 目前只有一個全域 `SYSTEM_INIT_MESSAGE` 作為人格 prompt，無法靈活切換身份。使用者若想嘗試不同人格（如任務協調者、行銷助手、健身教練），必須修改 wrangler.toml 然後重新部署，門檻太高。

需要一個「貼上 URL 就能換人格，隨時 reset 回來」的機制，讓使用者在 Telegram 裡即時載入外部 SOUL.md 檔案（如 OpenClaw 社群模板），並能隨時恢復預設。

## What Changes

- 新增 `/soul` 指令系統，支援從 URL 動態載入 SOUL.md 人格模板
- `/soul <url>` — fetch 遠端 SOUL.md，驗證後存入 DATABASE（per chat）
- `/soul reset` — 清除自訂 soul，恢復預設 `SYSTEM_INIT_MESSAGE`
- `/soul info` — 顯示目前使用的 soul 名稱與來源
- `/soul`（無參數）— 顯示使用說明，提示使用者可到 OpenClaw 社群 repo 挑選模板
- 修改 LLM 請求流程，在組裝 system prompt 時優先使用 DATABASE 中的自訂 soul 內容
- 切換 soul 時自動清除聊天歷史，避免人格混亂

## Capabilities

### New Capabilities

- `soul-management`: Soul 人格管理指令系統 — 包含 URL 載入、驗證、儲存、重置、狀態查詢
- `soul-prompt-override`: Soul prompt 覆蓋機制 — LLM 請求時以 DATABASE 中的自訂 soul 優先於 SYSTEM_INIT_MESSAGE

### Modified Capabilities

（無既有 spec 需修改）

## Impact

- **新增檔案**: `src/features/soul.js` — soul 管理邏輯
- **修改檔案**:
  - `src/agent/llm.js` — prompt 組裝邏輯，加入 soul 覆蓋判斷
  - `src/telegram/commands.js` — 註冊 `/soul` 指令與處理器
- **DATABASE**: 新增 key 格式 `soul:{chatId}:{botId}`，儲存 JSON（name, source, content, loadedAt）
- **外部依賴**: 無。僅使用原生 `fetch()` 抓取 URL
- **安全考量**: 限制抓取內容大小（max 10KB）、純文字驗證、SSRF 風險可控（一次性 fetch 存入 DB）
