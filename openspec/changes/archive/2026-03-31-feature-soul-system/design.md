## Context

Bot 目前的 system prompt 由 `SYSTEM_INIT_MESSAGE` 全域設定，在 `src/agent/llm.js` 的 `requestCompletionsFromLLM()` 中組裝。使用者可透過 `/setenv` 修改，但每次部署會被 wrangler.toml 的值覆蓋。

現有的 `LLM_PROFILES` 機制只切換 API 後端（引擎），不影響人格。兩者正交。

DATABASE 已有 per-chat 的 user_config 儲存機制（key: `user_config:{chatId}:{botId}`），soul 資料可用類似的 key pattern。

### 相關約束（來自 DEVELOPMENT_NOTES.md）

- 指令處理器必須使用 `(message, command, subcommand, context)` 四參數簽名
- Cloudflare Workers binding 透過 `WORKER_ENV` 取得，不是 `ENV.USER_CONFIG`
- Soul 儲存只需要 KV（DATABASE），不需要 R2

## Goals / Non-Goals

**Goals:**

- 使用者在 Telegram 裡貼上 URL 即可載入外部 SOUL.md 人格模板
- 隨時 `/soul reset` 恢復預設，零摩擦
- 與現有 LLM_PROFILES、長期記憶、Command Discovery 完全相容
- 安全：限制內容大小、純文字驗證

**Non-Goals:**

- 不做本地 soul 模板庫（不在 wrangler.toml 預設多組 soul）
- 不做 soul 的編輯功能（要改就重新貼 URL）
- 不做記憶隔離（不同 soul 共用同一份使用者記憶）
- 不做多 soul 同時生效（一次只有一個 active soul）
- 不做 soul 模板的版本管理或自動更新

## Decisions

### 1. 儲存位置：DATABASE (KV)

**選擇**: 使用現有 DATABASE（KV namespace），key 為 `soul:{chatId}:{botId}`
**替代方案**: R2 bucket、新增 KV namespace、環境變數 JSON
**理由**: DATABASE 已存在且所有 bot 都有綁定，不需要額外 binding 設定。Soul 資料很小（< 10KB JSON），KV 完全足夠。

### 2. Key 格式參考 chatHistoryKey

**選擇**: `soul:{chatId}:{botId}` — 與 `history:{chatId}:{botId}` 同構
**理由**: 保持 per-chat per-bot 的隔離，複用已建立的 key pattern。`context.SHARE_CONTEXT` 裡已有 `chatId` 和 `botId` 可用。

### 3. Prompt 覆蓋策略：取代而非追加

**選擇**: 有自訂 soul 時完全取代 `SYSTEM_INIT_MESSAGE`
**替代方案**: 在 SYSTEM_INIT_MESSAGE 之後追加 soul 內容
**理由**: Soul 本身就是完整的 system prompt 定義。追加會導致人格衝突（預設 prompt 說「你是得力助手」，soul 說「你是 Orion 協調者」）。

### 4. 切換時清除歷史

**選擇**: 載入新 soul 或 reset 時自動清除聊天歷史
**理由**: 舊歷史中的對話風格與新 soul 不一致，LLM 會感到人格混亂。清除是最乾淨的做法。

### 5. URL 抓取限制

**選擇**: 限制 response body 最大 10KB，Content-Type 不限制但只取 text
**替代方案**: 白名單只允許 GitHub raw URL
**理由**: 白名單太嚴格會破壞靈活性。10KB 限制已足夠防止濫用（正常 SOUL.md 約 1-3KB）。fetch 只做一次，存入 DB 後不再請求，SSRF 風險可控。

### 6. Soul 資料結構

```json
{
  "name": "Orion - The Coordinator",
  "source": "https://raw.githubusercontent.com/.../SOUL.md",
  "content": "# Orion - The Coordinator\n\nYou are Orion...",
  "loadedAt": "2026-03-31T10:00:00Z"
}
```

- `name`: 從 markdown 第一個 `# ` 標題解析，若無則用 "自訂人格"
- `source`: 原始 URL，供 `/soul info` 顯示
- `content`: 完整的 SOUL.md 文字，作為 system prompt 使用
- `loadedAt`: 載入時間

### 7. 指令設計

| 指令 | 行為 |
|------|------|
| `/soul` | 顯示使用說明 + 推薦模板 repo URL |
| `/soul <url>` | fetch URL → 驗證 → 存入 DB → 清歷史 → 確認 |
| `/soul reset` | 刪除 DB 中的 soul → 清歷史 → 確認回到預設 |
| `/soul info` | 顯示目前 soul 名稱、來源 URL、載入時間 |

## Risks / Trade-offs

- **[Prompt injection via SOUL.md]** → 使用者本身就有權修改 system prompt（via `/setenv`），soul 機制是同等權限，不是新的攻擊面。
- **[URL 指向惡意內容]** → 限制 10KB + 只取純文字 + 一次性 fetch。不會持續請求外部 URL。
- **[Soul 內容太長消耗 token]** → 限制 content 最大 5000 字元（約 2500 tokens），超過則截斷並提示。
- **[KV 額外讀取成本]** → 每次對話多一次 KV get，成本可忽略（KV 免費方案每天 10 萬次讀取）。
- **[歷史清除可能讓使用者不滿]** → 在切換確認訊息中明確告知歷史已清除。
