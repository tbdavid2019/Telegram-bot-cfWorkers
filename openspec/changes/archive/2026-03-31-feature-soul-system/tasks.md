## 1. Soul 管理模組

- [x] 1.1 建立 `src/features/soul.js`，實作 `loadSoulFromUrl(url)` — fetch URL、驗證大小(10KB)、截斷內容(5000字)、解析名稱(第一個 `# ` 標題)
- [x] 1.2 實作 `saveSoul(context, soulData)` — 將 `{name, source, content, loadedAt}` JSON 存入 DATABASE key `soul:{chatId}:{botId}`
- [x] 1.3 實作 `getSoul(context)` — 從 DATABASE 讀取自訂 soul，回傳 JSON 物件或 null
- [x] 1.4 實作 `deleteSoul(context)` — 刪除 DATABASE 中的自訂 soul

## 2. 指令處理器

- [x] 2.1 在 `src/features/soul.js` 實作 `commandSoul(message, command, subcommand, context)` — 路由子指令：無參數→說明、`reset`→重置、`info`→查看、其他→視為 URL 載入
- [x] 2.2 實作載入子流程：呼叫 `loadSoulFromUrl`，成功後 `saveSoul` + 清除歷史（`DATABASE.delete(context.SHARE_CONTEXT.chatHistoryKey)`），回覆確認訊息
- [x] 2.3 實作 reset 子流程：檢查是否有自訂 soul，有則 `deleteSoul` + 清除歷史，無則提示已是預設
- [x] 2.4 實作 info 子流程：`getSoul` 後顯示名稱、來源、載入時間；無自訂 soul 則顯示預設
- [x] 2.5 實作說明子流程：顯示指令格式 + 推薦模板 repo URL

## 3. 指令註冊

- [x] 3.1 在 `src/telegram/commands.js` 引入 `commandSoul` 並在 `commandHandlers` 中註冊 `/soul` 指令，scope 設為 `all_private_chats` + `all_group_chats`
- [x] 3.2 在 `commandSortList` 中加入 `/soul` 使其顯示在選單中

## 4. LLM Prompt 覆蓋

- [x] 4.1 在 `src/agent/llm.js` 的 `requestCompletionsFromLLM()` 中，組裝 prompt 前讀取 `getSoul(context)`，若有自訂 soul 則用 `soul.content` 取代 `context.USER_CONFIG.SYSTEM_INIT_MESSAGE`

## 5. 驗證

- [ ] 5.1 手動測試：`/soul` 顯示說明、`/soul <GitHub raw URL>` 載入成功、載入後對話使用新人格
- [ ] 5.2 手動測試：`/soul info` 顯示資訊、`/soul reset` 恢復預設、reset 後對話使用預設人格
- [ ] 5.3 手動測試：URL 錯誤 / 過大 / 無法抓取時顯示適當錯誤訊息
