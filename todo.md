# 長期記憶功能 (R2 + KV) 實作待辦

## 目標
- 支援 R2 或 KV 作為記憶儲存（由設定決定，預設 KV，不雙寫）
- 記憶功能可開關，未開啟時不讀寫
- 採用「個人記憶 + 全域知識庫」雙層設計
  - global.md: 所有用戶共享的知識（家庭資訊、公開設定等）
  - user_{telegramId}.md: 個人專屬記憶（偏好、身份等）
  - LLM 讀取時：global.md + 當前用戶的 user_xxx.md

## 實作步驟

1. 盤點現有流程與設定
   - 確認 LLM 系統提示詞注入點
   - 確認指令路由與訊息處理流程
   - 檢查 ENV / UserConfig 擴充方式

2. 設計儲存策略與格式
   - R2 / KV 的 key 命名規則
     - KV: `memory:global`, `memory:user:{telegramId}`
     - R2: `memory/global.md`, `memory/user_{telegramId}.md`
   - memory.md 內容格式與範例
   - 雙層策略: global.md (共享) + user_{id}.md (個人)

3. 環境變數與開關設計
   - ENABLE_LONG_TERM_MEMORY (true/false，預設 false)
   - MEMORY_STORAGE_MODE (kv/r2，預設 kv)
   - MEMORY_AUTO_SAVE (true/false，預設 true)
   - 自動讀取 global + user 記憶（無需額外設定範圍）

4. 新增記憶模組
   - src/features/memory.js
   - getGlobalMemory(): 讀取 global.md
   - getUserMemory(userId): 讀取 user_{userId}.md
   - saveGlobalMemory(content): 寫入全域記憶
   - saveUserMemory(userId, content): 寫入個人記憶
   - clearUserMemory(userId): 清除個人記憶
   - 依 MEMORY_STORAGE_MODE 選擇單一儲存（KV 或 R2），不做雙寫

5. 將記憶注入 LLM
   - 在 LLM 系統提示詞中加入 memory.md
   - 對話結束後自動提取並更新記憶（不需人工指令）
   - 確保關閉時不讀取、不寫入

6. 指令與操作介面
   - 僅保留可選的查看/清除
   - /memory (顯示)
   - /memoryclear (清除)
   - 不提供手動新增指令，開關由設定檔控制

7. wrangler 設定
   - R2 bucket binding
   - KV namespace (若未存在則新增)

8. 驗證與測試
   - LSP diagnostics
   - 本地 wrangler dev 測試
   - KV 模式可正常讀寫
   - R2 模式可正常讀寫

## 交付物
- src/features/memory.js
- src/agent/llm.js (注入記憶)
- src/telegram/commands.js (可選: 查看/清除指令)
- src/config/env.js (新增設定)
- wrangler.toml (R2 / KV 綁定)
- README 補充設定說明
