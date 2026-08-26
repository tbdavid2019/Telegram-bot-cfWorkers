# 🤖 AI Agent 開發與維護指南 (AGENT.md)

> 本文件為 AI 輔助開發（如 Google Antigravity、Claude Code、Cursor 等 Agent）在維護本專案時的**強制性規範與核心守則**。

---

## 🚨 核心必備守則 (Strict Requirements)

### 1. 📝 文檔同步更新原則（每次變更必做！）
每次完成任何功能新增、Bug 修復、指令重構或設定變更後，**務必同步更新以下文檔**：
- **`CHANGELOG.md`**：在最頂部加入或更新版本號與日期，條列新增（Added）、修復（Fixed）、改善（Improved）項目。
- **`README.md`**：若涉及新指令、新功能或新環境變數，必須同步更新「最新功能」與「指令列表/使用說明」。

---

### 2. ⚡ 指令處理器（Command Handlers）規範
所有位於 `src/features/` 中的指令處理函數，**簽名一律必須為四個參數**：
```javascript
export async function commandXXX(message, command, subcommand, context) {
  // message: Telegram 訊息物件
  // command: 觸發的指令名稱（如 "/bazi"）
  // subcommand: 指令後方的參數/問題字串
  // context: 上下文物件（包含 SHARE_CONTEXT, CURRENT_CHAT_CONTEXT, env 等）
}
```
> ⚠️ **注意**：即使函數內不需要使用 `command` 或 `subcommand`，也**絕對不能省略**，否則 `context` 參數會錯位變成 `undefined`。

---

### 3. 🧩 新增指令時的「五處同步註冊」清單
當新增一個 Bot 指令時，必須同步確認以下 5 個位置：
1. **`src/features/`**：實作指令處理函數（需具備參數驗證、錯誤處理、結果排版）。
2. **`src/telegram/commands.js`**：
   - 引入該函數。
   - 加入 `commandSortList`（決定 Telegram 官方選單排序）。
   - 在 `commandHandlers` 中註冊（定義 `scopes`、`fn`、`description`）。
3. **`src/agent/command-discovery.js`**：
   - 將指令加入 `cachedCategories` 分類中。
   - 在 `generateCommandSystemPrompt` 補充 `[CALL:/指令 ...]` 的範例與多輪引導規則（例如需要特定參數時引導 LLM 先追問使用者）。
4. **`src/index.js`**：在 `i18nData`（`zh-tw`、`zh-cn`、`en`）中補齊指令說明。
5. **`test/`**：編寫對應的單元測試。

---

### 4. ☁️ Cloudflare Workers Bindings 規範
- **資源 Binding**（KV `DATABASE`、R2 `MEMORY_BUCKET`、`AI` 等）：
  - 只能從 Workers 的 `env` 取得，或使用 `src/config/env.js` 匯出的 `WORKER_ENV` / `DATABASE`。
  - ❌ **絕對不能**從 `ENV.USER_CONFIG` 取得 Binding。
- **環境變數設定值**：
  - 透過 `src/config/env.js` 中的 `UserConfig` 與 `ENV.USER_CONFIG` 讀取。

---

### 5. 🧪 測試與打包驗證
在提交任何修改前，必須在終端執行並確保兩項檢查通過：
```bash
# 1. 執行單元測試
node --test test/*.test.js

# 2. 執行模組化打包
node build.js
```

---

## 📌 專案架構概覽

```
├── src/
│   ├── agent/               # LLM 核心、Profile 切換、指令發現 (Command Discovery)
│   ├── config/              # 環境變數定義 (UserConfig) 與全域狀態
│   ├── features/            # 各類功能模組 (divination, weather, stock, memory, soul, etc.)
│   ├── telegram/            # Telegram API 互動、中介層、指令路由
│   └── utils/               # 工具函式 (router, stats, image, timezone, etc.)
├── test/                    # Node.js 內建原生測試套件 (node:test)
├── build.js                 # esbuild 模組化打包腳本
├── CHANGELOG.md             # 版本變更紀錄（每次修改必更新）
├── README.md                # 專案使用者文檔（每次修改必更新）
└── DEVELOPMENT_NOTES.md     # 開發避坑指南與詳細技術細節
```
