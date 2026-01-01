# Google Sheets LLM Integration - Task List

## Phase 0: 基礎建設與認證機制 🔐

### 0.1 Google Cloud 設定
- [ ] 在 Google Cloud Console 建立專案
- [ ] 啟用 Google Sheets API
- [ ] 建立 Service Account
- [ ] 下載 Service Account JSON 金鑰
- [ ] 將 Service Account email 加入目標 Sheet 的共用權限（編輯者）

### 0.2 JWT Token 認證實作
- [ ] 建立 `src/features/google-sheets.js` 檔案
- [ ] 實作 `parseServiceAccountKey()` - 解析 JSON 金鑰
- [ ] 實作 `importPrivateKey()` - 使用 Web Crypto API 導入 PKCS#8 private key
- [ ] 實作 `createJWT()` - 生成 JWT Token（RS256 簽署）
- [ ] 實作 `getAccessToken()` - 用 JWT 換取 Access Token
- [ ] 實作 `authenticateGoogleSheets()` - 完整認證流程
- [ ] 處理 Token 快取與自動更新（全域變數）

### 0.3 基本連線測試
- [ ] 測試讀取收支表的第一行資料
- [ ] 驗證 API 回應格式
- [ ] 確認錯誤處理機制（401, 403, timeout）
- [ ] 記錄除錯資訊到 console

---

## Phase 1: 收支表讀取與查詢功能 💰

### 1.1 收支表讀取實作
- [ ] 實作 `readBudgetSheet(range = 'A:J')` - 讀取 A-J 欄
- [ ] 實作 `parseBudgetData(rawData)` - 解析並格式化資料
- [ ] 處理空值和格式錯誤
- [ ] 實作錯誤處理（Sheet 不存在、格式錯誤等）

### 1.2 查詢邏輯實作
- [ ] 實作 `filterByMonths(data, months)` - 月份篩選
- [ ] 實作 `filterByCategories(data, categories)` - 類別篩選
- [ ] 實作 `aggregateData(data, method)` - 聚合計算（sum, average, detail）
- [ ] 實作 `parseTimeRange(query)` - 時間範圍解析（「最近三個月」→ 具體月份）

### 1.3 LLM 指令整合（使用現有 [CALL:...] 機制）
- [ ] 在 `src/features/google-sheets.js` 實作 `commandQueryBudget()`
- [ ] 實作 `parseBudgetQueryParams()` - 解析 LLM 傳來的參數
- [ ] 實作 `processBudgetQuery()` - 執行查詢邏輯
- [ ] 實作 `formatBudgetResult()` - 格式化回應
- [ ] 在 `src/telegram/commands.js` 註冊 `/budget` 指令
- [ ] 在 `src/agent/command-discovery.js` 加入 `/budget` 指令說明

### 1.4 自然語言查詢測試
- [ ] 測試：「這三個月平均支出多少？」
- [ ] 測試：「11月國泰信用卡花了多少？」
- [ ] 測試：「最近半年房租總共多少？」
- [ ] 測試：「各銀行這幾個月信用卡支出多少錢？」
- [ ] 驗證回應格式清晰易讀
- [ ] 驗證計算結果正確

---

## Phase 2: 收支表寫入功能 ✍️

### 2.1 寫入邏輯實作
- [ ] 實作 `findBudgetRow(month)` - 查找指定月份的行號
- [ ] 實作 `getCategoryColumn(category)` - 取得類別對應的欄位（C-J）
- [ ] 實作 `writeBudgetEntry(month, category, amount)` - 寫入或更新資料
- [ ] 處理新月份（新增行）vs 現有月份（更新儲存格）
- [ ] 實作寫入前驗證（金額格式、月份格式等）

### 2.2 LLM 指令整合
- [ ] 在 `src/features/google-sheets.js` 實作 `commandWriteBudget()`
- [ ] 實作參數解析和驗證
- [ ] 加入白名單檢查（只有白名單成員可寫入）
- [ ] 在 `src/telegram/commands.js` 註冊 `/budgetwrite` 指令
- [ ] 在 `src/agent/command-discovery.js` 加入 `/budgetwrite` 指令說明

### 2.3 寫入操作測試
- [ ] 測試：「寫入 12 月份國泰信用卡 7000 元」
- [ ] 測試：「更新 2025/1 的玉山信用卡為 35000」
- [ ] 測試：寫入新月份（不存在的月份）
- [ ] 測試：更新現有月份的資料
- [ ] 驗證 Google Sheets 中的資料正確性
- [ ] 測試錯誤處理（格式錯誤、權限不足等）

---

## Phase 3: 用戶對應表與行程表讀取 📅

### 3.1 用戶對應表建立
- [ ] 在 Google Sheets 建立「用戶對應表」tab
- [ ] 設定欄位：真實姓名、Telegram User ID、Telegram Username
- [ ] 填入家庭成員資料（小茹、小苑等）

### 3.2 用戶對應表讀取實作
- [ ] 實作 `readUserMapping()` - 讀取用戶對應表
- [ ] 實作 `cacheUserMapping()` - 快取到全域變數
- [ ] 實作 `resolveUserMention(name)` - 將姓名轉為 Telegram mention
- [ ] 處理找不到對應的情況（fallback 為純文字）

### 3.3 行程表讀取實作
- [ ] 實作 `readScheduleSheet()` - 讀取行程表（A-H 欄）
- [ ] 實作 `parseScheduleData(rawData)` - 解析行程資料
- [ ] 實作 `querySchedules(filters)` - 根據條件篩選行程
  - 支援 `targetUser` 篩選
  - 支援 `dateFrom` / `dateTo` 篩選
  - 支援 `status` 篩選

### 3.4 LLM 指令整合
- [ ] 在 `src/features/google-sheets.js` 實作 `commandQuerySchedule()`
- [ ] 實作 `parseScheduleQueryParams()` - 解析參數
- [ ] 實作 `formatScheduleList()` - 格式化行程列表
- [ ] 在 `src/telegram/commands.js` 註冊 `/schedule` 指令
- [ ] 在 `src/agent/command-discovery.js` 加入 `/schedule` 指令說明

### 3.5 行程查詢測試
- [ ] 測試：「查詢小茹今天的行程」
- [ ] 測試：「查詢本週所有人的行程」
- [ ] 測試：「查詢小苑 1/15 的行程」
- [ ] 驗證篩選邏輯正確
- [ ] 驗證回應格式

---

## Phase 4: 行程表 CRUD 操作 ✏️

### 4.1 行程建立實作
- [ ] 實作 `appendScheduleRow(schedule)` - 新增行程到表格末端
- [ ] 自動填入建立時間（ISO 格式）
- [ ] 自動填入建立者（Telegram User ID）
- [ ] 預設狀態為「待處理」
- [ ] 實作 `commandCreateSchedule()` - 指令處理器
- [ ] 實作 `parseScheduleParams()` - 解析參數
- [ ] 在 `commands.js` 註冊 `/scheduleadd` 指令

### 4.2 行程修改實作
- [ ] 實作 `findScheduleByKey(targetUser, date, event)` - 使用複合鍵查找行程
- [ ] 實作 `updateScheduleByKey(targetUser, date, event, updates)` - 更新行程
- [ ] 支援部分欄位更新（只更新指定的欄位）
- [ ] 實作 `commandUpdateSchedule()` - 指令處理器
- [ ] 實作 `parseScheduleUpdateParams()` - 解析參數
- [ ] 在 `commands.js` 註冊 `/scheduleupdate` 指令

### 4.3 行程刪除實作
- [ ] 實作 `deleteScheduleByKey(targetUser, date, event)` - 刪除行程
- [ ] 實作 `commandDeleteSchedule()` - 指令處理器
- [ ] 實作 `parseScheduleDeleteParams()` - 解析參數
- [ ] 在 `commands.js` 註冊 `/scheduledelete` 指令

### 4.4 群組 @ 提醒機制
- [ ] 實作 `detectMessageSource(context)` - 偵測訊息來源（群組 vs 私訊）
- [ ] 實作 `formatScheduleResponse(schedule, context)` - 格式化行程回應
  - 群組：加入 Markdown mention `[@小茹](tg://user?id=123456)`
  - 私訊：不加 mention
- [ ] 確保 `parse_mode: "Markdown"` 正確設定
- [ ] 處理找不到用戶對應的情況

### 4.5 CRUD 操作測試
- [ ] 測試：「幫小茹建立行程：明天下午 3 點，去 7-11 拿包裹」
- [ ] 測試：群組中建立行程並驗證 @ 提醒
- [ ] 測試：「把小茹明天下午 3 點的行程改成下午 5 點」
- [ ] 測試：「刪除小茹明天的拿包裹行程」
- [ ] 測試：複合鍵識別的準確性
- [ ] 驗證 Google Sheets 資料正確性

---

## Phase 5: 整合測試與優化 🧪

### 5.1 功能整合測試
- [ ] 私訊測試：收支查詢
- [ ] 私訊測試：收支寫入
- [ ] 私訊測試：行程建立/查詢/修改/刪除
- [ ] 群組測試：收支查詢
- [ ] 群組測試：行程建立（含 @ 提醒）
- [ ] 跨功能測試：查詢 → 寫入 → 再查詢驗證

### 5.2 白名單授權測試
- [ ] 使用白名單帳號測試（應正常運作）
- [ ] 使用非白名單帳號測試（應被拒絕）
- [ ] 驗證錯誤訊息友善

### 5.3 功能開關測試
- [ ] 在 `wrangler.toml` 設定環境變數
  - `env.aws`: `ENABLE_FAMILY_SHEETS = "true"`
  - `env.chatgpt`: `ENABLE_FAMILY_SHEETS = "true"`
  - `env.gemini`: 不設定（或 `"false"`）
- [ ] 測試 gemini bot（應不啟用 Sheets 功能）
- [ ] 測試 aws bot（應正常啟用）
- [ ] 測試 chatgpt bot（應正常啟用）

### 5.4 錯誤處理測試
- [ ] 測試 API 超時情境
- [ ] 測試權限不足情境（403）
- [ ] 測試認證失敗情境（401）
- [ ] 測試 Sheet 不存在情境
- [ ] 測試資料格式錯誤情境
- [ ] 測試找不到對應月份/行程情境
- [ ] 驗證所有錯誤訊息友善且有幫助

### 5.5 效能優化
- [ ] 檢查 API 請求次數（應最小化）
- [ ] 優化查詢邏輯（避免重複讀取）
- [ ] 驗證 Token 快取機制正常運作
- [ ] 驗證用戶對應表快取正常運作

### 5.6 文件與部署
- [ ] 更新 README.md（使用說明）
- [ ] 撰寫 Service Account 設定指南
- [ ] 撰寫環境變數設定指南
- [ ] 部署到 Cloudflare Workers（aws 和 chatgpt 環境）
- [ ] 生產環境測試

---

## 完成檢查清單 ✅

- [ ] Google Service Account 認證成功
- [ ] 能正確讀取收支表資料（A-J 欄）
- [ ] 能正確寫入收支表資料
- [ ] 能正確讀取行程表資料
- [ ] 能新增、修改、刪除行程
- [ ] LLM 能正確理解收支查詢意圖
- [ ] LLM 能正確理解行程 CRUD 意圖
- [ ] 私訊中的回應正確
- [ ] 群組中的回應正確且有 @ 提醒
- [ ] 白名單授權機制正常運作
- [ ] 功能開關正常（aws/chatgpt 啟用，gemini 不啟用）
- [ ] 錯誤處理完善且友善
- [ ] 所有測試案例通過
