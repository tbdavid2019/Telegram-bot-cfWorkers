# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased] - 2026-09-08

### Fixed
- **A2A (Agent-to-Agent) 連線超時與 Webhook 阻塞卡死修復**：
  - **根本原因**：遠端 Agent 呼叫大型模型（如 Nemotron 120B）耗時 45~86 秒，超過 Cloudflare Workers 30 秒生命週期限制，導致 Worker 被系統強制殺除，Telegram 上的進度佔位訊息「💬 正在為您連線...」永久無法更新。
  - **解決方案**：
    - 在 [src/agent/a2a-client.js](file:///Users/david/git/tbdavid2019/Telegram-bot-cfWorkers/src/agent/a2a-client.js) 為 Service Binding / HTTP fetch 加上 12 秒 `AbortController` 硬超時機制。超時時優雅轉換為異步任務推播提示，避免 Worker 崩潰。
    - 在 [src/features/a2a888-hub.js](file:///Users/david/git/tbdavid2019/Telegram-bot-cfWorkers/src/features/a2a888-hub.js) 將同步輪詢上限由 22 秒調降至 10 秒。
    - 在 [src/agent/llm.js](file:///Users/david/git/tbdavid2019/Telegram-bot-cfWorkers/src/agent/llm.js) 中對 `/delegate` 回傳值實施直接中繼（Direct Relay），避免重複觸發第二輪本地 LLM 浪費 15 秒導致超時。
- **修復 Telegram `Cannot read properties of undefined (reading 'length')` 崩潰**：
  - 在 [src/telegram/telegram.js](file:///Users/david/git/tbdavid2019/Telegram-bot-cfWorkers/src/telegram/telegram.js) 的 `sendMessageToTelegram` 增加對 `undefined` / `null` 的安全防禦轉換。
  - 在 [src/agent/llm.js](file:///Users/david/git/tbdavid2019/Telegram-bot-cfWorkers/src/agent/llm.js) 的 `chatWithLLM` 增加 `safeAnswer` 保底回覆機制。
- **全庫「午夜邊界問題」(Midnight Boundary Problem) 深度排查與全面防禦修復**：
  - **時區午夜錯位與重設延遲 (Stats & Memory)**：修復 [src/utils/stats.js](file:///Users/david/git/tbdavid2019/Telegram-bot-cfWorkers/src/utils/stats.js) 與 [src/features/memory.js](file:///Users/david/git/tbdavid2019/Telegram-bot-cfWorkers/src/features/memory.js) 使用 `new Date().toISOString().split('T')[0]` 導致在台北時間（UTC+8）午夜至清晨 8 點（00:00~07:59）誤判為昨日、日報與統計遲至 8 點才換日的致命缺陷。改由 [src/utils/timezone.js](file:///Users/david/git/tbdavid2019/Telegram-bot-cfWorkers/src/utils/timezone.js) 的 `getZonedDateString` 確保精確於本地午夜 00:00:00 切換。
  - **排程器午夜 0 點 (Hour 0) Falsy 陷阱**：修復 [src/features/scheduler.js](file:///Users/david/git/tbdavid2019/Telegram-bot-cfWorkers/src/features/scheduler.js) 中 `DAILY_SUMMARY_TIME || 6` 導致設定為午夜 0 點時被 JS falsy 替換為早上 6 點的邊界問題。
  - **日程查詢跨午夜邊界截斷早晨事項**：修復 [src/agent/llm.js](file:///Users/david/git/tbdavid2019/Telegram-bot-cfWorkers/src/agent/llm.js) `/schedule` 原使用 `now.toISOString()` 導致下午查詢時今日上午事件消失的問題，改自本地今日午夜 00:00 起算；並修復 `toLocaleDateString` 缺少 `timeZone` 造成凌晨時段日期倒退回昨日之 Bug。
  - **全天事件跨時區午夜倒退一日**：修復 [src/features/google-calendar.js](file:///Users/david/git/tbdavid2019/Telegram-bot-cfWorkers/src/features/google-calendar.js) 全天活動解析成 UTC 00:00:00Z 後在西半球時區格式化倒退一日的問題。
  - **天氣預報星期跨時區午夜偏移**：修復 [src/features/weather.js](file:///Users/david/git/tbdavid2019/Telegram-bot-cfWorkers/src/features/weather.js) 使用 `date.getDay()` 在非 UTC 運行時計算出前一天星期的邊界缺陷，改採 `Date.UTC` 與 `getUTCDay()`。
  - **記帳與占卜月初/跨年午夜邊界**：修復 [src/features/google-sheets.js](file:///Users/david/git/tbdavid2019/Telegram-bot-cfWorkers/src/features/google-sheets.js) 與 [src/features/divination.js](file:///Users/david/git/tbdavid2019/Telegram-bot-cfWorkers/src/features/divination.js) 在每月 1 日及元旦凌晨誤判為上個月/去年的問題。
  - **日期區間（如 9/1 ~ 9/9）閉區間閉合至 23:59:59**：強化 [src/features/google-calendar.js](file:///Users/david/git/tbdavid2019/Telegram-bot-cfWorkers/src/features/google-calendar.js) 與 [src/agent/llm.js](file:///Users/david/git/tbdavid2019/Telegram-bot-cfWorkers/src/agent/llm.js) 的 `parseNaturalTime`，全面支援「9/1 ~ 9/9」、「9月1日到9月9日」、「2026/09/01~2026/09/09」等自訂範圍。對齊人類語意之閉區間直覺，結束日（9/9）自動推進至次日 00:00:00（即 9/10 00:00:00 開區間），確保 9/9 的 23:59:59 完整納入查詢範圍，同時修復預設 7 天查詢提前於 00:00:00 截斷第七天的缺陷。

### Evaluated / Architecture Decision Record (技術架構評估決策)
- **Google Magika 深度學習檔案識別導入評估 (Magika on Cloudflare Workers Feasibility)**：
  - **評估對象**：Google 開源之 AI 檔案類型識別工具 [Google Magika](https://github.com/google/magika)（基於深度學習 ONNX / Keras 模型）。
  - **最新 Cloudflare 平台規格核實**：
    - Cloudflare Workers 已廢除早期 3 MiB (Free) / 10 MiB (Paid) 壓縮限制，正式放寬至 **64 MiB 未壓縮代碼打包上限 (Uncompressed Bundle Size)**。
    - Magika 模型與依賴庫（約 5~15 MB）在「代碼體積」上已可通過 Wrangler 部署打包，不再受打包大小限制。
  - **判定不適合直接導入 Cloudflare Worker 的核心技術原因**：
    1. **免費版 CPU 執行時間超時（10 ms Hard Limit）**：
       - Cloudflare Workers 免費方案限制每次請求純 CPU 運算時間為 **10 ms**（Standard 為 50 ms）。
       - Magika 本質為小型深層神經網路，若使用 JS/NPM 版（底層依賴 `@tensorflow/tfjs` 或 ONNX WASM）在無 GPU 的 V8 Isolate CPU 上進行推理矩陣運算，單次特徵提取與推理耗時約 **40 ~ 150 ms**，將直接觸發 `Worker exceeded CPU time limit` 致命錯誤。
    2. **運行時記憶體緊繃（128 MB RAM Ceiling）**：
       - 64 MiB 僅為「上傳佈署大小」，各 Worker Isolate 運行時實體記憶體限制仍為 **128 MB**。
       - 初始化 TensorFlow.js / ONNX 引擎及載入模型張量常駐即消耗約 50 ~ 90 MB，與 Telegram Webhook 請求處理、JSON 解析與檔案 Buffer 併發時極易觸發 OOM (Out of Memory) 被邊緣節點強制終止。
    3. **無伺服器冷啟動延遲（Cold Start Latency）**：
       - Serverless V8 Isolate 每次冷啟動需重新載入數百萬個模型參數，將造成首筆 Telegram 訊息出現 300 ~ 800 ms 額外初始化延遲。
  - **專案決策與最佳實務**：
    - **Telegram Bot 日常防偽與格式驗證**：維持採用純 JS Magic-Bytes 特徵碼比對方案（如 [`file-type`](https://github.com/sindresorhus/file-type)，約 15 KB，CPU 耗時 < 0.1 ms，0 MB 額外記憶體常駐），足以百分之百抵禦偽造副檔名攻擊（如 `.exe` 偽裝為 `.pdf`）。
    - **若未來需 Magika 高階 AI 檢測（如 Polyglot / 高級惡意軟體分析）**：應採用「邊緣與運算解耦（Microservice Separation）」架構，將 Magika 官方 Python / Rust CLI 容器化部署於 VPS / Docker / Cloud Run，Worker 僅透過極輕量之 `fetch()` 調用微服務，確保邊緣 Worker 毫秒級極速回應且不消耗運算配額。

## [1.11.0] - 2026-09-02

### Added
- **全面安全性強化與漏洞修復 (Security Hardening & Audit Fixes)**：
  - **A2A 端點認證防護**：`/a2a` 端點實作 `A2A_SECRET` Bearer Token 驗證，阻斷未授權調用與 LLM 額度消耗。
  - **中介層執行順序修正**：調整 `msgFilterWhiteList` 於 `msgHandleCallbackQuery` 之前執行，徹底杜絕非白名單用戶透過按鈕回調繞過白名單。
  - **敏感金鑰防外洩強化**：擴展 `LOCK_USER_CONFIG_KEYS` 涵蓋所有第三方服務 base URL 與金鑰欄位，全面防止 `/setenv` SSRF 與金鑰導出。
  - **清除硬編碼金鑰**：從 `network.js` 移除 Netlify 與 IPInfo 敏感 Token，改為動態讀取環境設定。
  - **Telegram 訊息與 Web 介面防注入**：全面引入 `escapeHTML` 轉義 `/getid`、`/getgroupid`、`/system` 與 `/telegram/:token/bot` 中的使用者名稱與狀態資訊。
  - **長期記憶路徑安全驗證**：新增 `sanitizeUserId` 阻斷 `userId` 路徑穿越漏洞。
  - **Google 整合權限與編碼保護**：新增 `needAuth` 權限管制並對 API 請求參數進行 `encodeURIComponent` 編碼。
- **AI 即時智慧續問按鈕 (Stateless AI Follow-up Suggestions)**：
  - **自動生成專屬深入續問**：在 LLM 回答各類主題完畢後，即時根據上下文自動生成 2~4 個具延伸性的一鍵追問按鈕。
  - **突破 Telegram 64-Byte Callback 限制（Stateless 零 KV 架構）**：採用 Telegram 原生 Payload 路由技術，0 次 KV 寫入，完全不消耗 Cloudflare KV 免費額度。
- **單元測試**：新增 `test/security-fixes.test.js` 與 `test/followup-suggestions.test.js`，全專案 **83 項測試全數通過**。

## [1.10.1] - 2026-08-29
### Changed
- **對齊 `qi.david888.com` 最新占卜 API 契約**：更新 `/qi`、`/mei`、`/tarot`、`/bazi`、`/fengshui` 與 `/yinyuan` 的參數與模式傳遞。
- `/qi` 改用無 `Z` 的 UTC+8 民用時間格式；未指定時間時交由 API 使用目前時間。
- `/mei` 改用 API 要求的 `number` 方法，支援二數、三數與漢字報字起卦。
- `/tarot` 支援 decision 變體、UTC+8 時間能量因子與自訂 seed。
- `/bazi` 支援未知時辰、十二時辰、農曆閏月、已故年份與出生地真太陽時參數；修正中文時辰辨識，避免送出多餘的 `12:00`。
- `/fengshui` 使用 24 種形煞與擇日事項的中文 canonical enum。
- `/yinyuan` 支援雙方出生日期的八字合婚，並要求紅線與紫微夫妻宮提供完整出生日期。
- 更新 Telegram 指令說明與占卜回歸測試。

### Fixed
- 修正八字輸入單獨使用「申時」等中文時辰時無法正確傳遞 `shichen` 的問題。
- 修正紅線模式只有出生年份時偽造生日的問題，改為回傳補充完整日期的引導。

### Tests
- 全專案 **73 項測試全數通過**，建置成功。

## [1.10.0] - 2026-08-28

### Added
- **對齊最新 David888 Wiki Publisher 規範 (SKILL.md)**：
  - **開頭嚴格遵循 `# Title` 鐵律**：`sanitizeWikiMarkdown` 增強自動剔除 LLM 開頭寒暄客套話（如「好的，為您整理...」），確保 Markdown 第一行即為 `# 文章主標題`（或可選 YAML frontmatter），保障 HTML `<title>` 與 Open Graph metadata 提取精準。
  - **結構與目錄順序標準化**：`[TOC]` 目錄與 `> 執行摘要` 嚴格排列於 `# 文章主標題` 之後。
  - **Mermaid 語法安全防禦**：全面引導並保障流程圖節點文字雙引號包裹 `NODE["/api/path"]`，防止未加引號的斜線路徑造成詞法解析錯誤。
  - **多章節書籍手冊 (Book Mode)**：支援標準 4-Step SOP 進行多章節教材/文檔規劃、獨立發布各章節與 Hub Manifest 筆記，無縫整合 `/book` 雙欄電子書閱讀器。
  - **完整 20 套 CSS 主題與工具 API**：匯出 20 款主題清單，新增 `extractMarkdown` 結構提取與 `lintMarkdown` 語法自動校驗工具。
- **多輪自主工具調用迴圈（Multi-turn ReAct Loop，最高支援 10 輪自主執行）**：
  - 將 LLM 原生 Tool Calling 模式升級為多輪自主推理與工具鏈式調用循環（ReAct Loop）。
  - **環境變數可配置**：新增 `MAX_REACT_ROUNDS`（預設 `10`），支援透過環境變數或 `/setenv MAX_REACT_ROUNDS 10` 動態調整最大自主探索輪數。
  - **鏈式工具協同**：支援複雜任務跨工具多輪執行（例如：第 1 輪聯網搜尋 ➔ 第 2 輪讀取深入網址/查股票行情 ➔ 第 3 輪發布 Wiki 報告 ➔ 生成最終結構化解答）。
  - **防死循環保護 (Deadlock & Loop Prevention)**：內建重複工具調用偵測，同一工具同一參數重複調用時主動熔斷並引導 LLM 基於現有資料作答；到達上限時優雅總結。
  - **單元測試**：全專案 **70 項單元測試全數通過**。

## [1.9.0] - 2026-08-27

### Added
- **David888 Wiki 長文發布與知識庫自動同步 (David888 Wiki Publisher)**：
  - 串接 `https://wiki.david888.com/api`，支援長篇產品文件、整理報告、手冊教材與長對話紀錄一鍵推送發布。
  - **全新指令支援**：
    - `/wiki <路徑> <長文Markdown>`：發布長篇文章至 Wiki，自動返回公開唯讀 `shareUrl`、2D 簡報播放連結 (`/present`) 與雙欄電子書連結 (`/book`)。
    - **回覆訊息發布**：對 Bot 回覆的任何長文、分析報告或對話訊息回覆 `/wiki [標題/代稱]`，一鍵推送到 Wiki 知識庫。
    - `/wikiread <路徑/分享網址>` 或 `/wiki read <路徑>`：讀取 Wiki 頁面的原始 Markdown 內容。
    - `/wiki append <路徑> <內容>`：追加內容至既有 Wiki 頁面。
  - **豐富 Markdown 語法支援**：自動支援 `[TOC]` 深度目錄導航、Mermaid 流程圖、代碼區塊行號與標籤、文字高亮標籤、GitHub 樣式警示區塊與多欄學術排版。
  - **LLM 自主寫入 Wiki 工具調用**：當用戶要求 Bot 整理長篇產品文檔、研究報告並發布到 Wiki 時，LLM 自主調用 `[CALL:/wiki <slug> <markdown>]` 並回傳公開分享連結。
- **888box 雲端資產管理與多媒體儲存整合 (888box Asset Storage & Multi-tier Failover)**：
  - 串接 888box 雲端儲存與資產管理系統，提供 3-Tier 自動容錯備援架構：
    - 👑 **主節點**：`https://box.david888.com`
    - 🛡️ **備援節點 1**：`https://box.glsoft.ai`
    - 🛡️ **備援節點 2**：`https://box.aiurl.tw`
  - 支援雙模存取（MCP JSON-RPC 2.0 與 REST API Gateway）。
  - **全新指令支援**：
    - `/box [URL] [標題]`：將遠端圖片、影片、音訊、文件即時轉存至 888box。
    - **回覆媒體轉存**：對任何 Telegram 圖片、影片、文件、音訊、語音訊息回覆 `/box [標題]`，自動提取 Telegram 檔案並轉存至 888box。
    - `/boxlist [type] [page]`：瀏覽資產清單（支援 image/video/audio/file/all 與分頁）。
    - `/boxsearch [關鍵字]`：全域搜尋已儲存資產。
    - `/boxstats`：即時查看 888box 儲存統計與備援節點狀態。
    - `/box podcast`：取得自動同步的 Video / Audio Podcast RSS 訂閱源。
  - **多媒體產出與下載自動備份 (`AUTO_SAVE_TO_BOX`)**：
    - 支援將 AI 生成圖片 (`/img`, `/img2`)、下載影片源、音訊與文件自動存檔至 888box 並回傳直連/分享連結。
  - **Telegram 媒體發送與中介層增強**：擴展 `msgFilterUnsupportedMessage` 與 Telegram API 客戶端（`sendDocument`, `sendVideo`, `sendAudio`），完整支援 document/video/audio/animation/voice 等多媒體處理。
  - **單元測試**：新增 `test/box.test.js` 與 `test/wiki.test.js`，全專案 **64 項單元測試全數通過**。

## [1.8.0] - 2026-08-27

### Added
- **原生底層工具自主執行引擎（Universal Autonomous Tool Execution Engine）**：
  - 將全系統所有查詢、運算、即時資訊工具全面納入 LLM 原生底層，實現完全自主、無感調用與兩階段事實接地生成（Grounding）。
  - **支援自主調用工具庫（9 大維度）**：
    - 🌐 **即時聯網與閱讀**：`/web`（2MD SERP 即時搜尋）、`/read`（AnyDoc Markdown 解析）
    - 🌤️ **氣象特報**：`/wt`（即時氣溫/降雨機率/預報）、`/weatheralert`（災害天氣特報）
    - 📈 **金融市場**：`/fund`（AI 對沖基金 14 位大師圓桌會議）、`/stock` / `/stock2` / `/stocktw`（Yahoo/TWSE 即時盤口與漲跌幅）
    - 🔮 **占卜與命理**：`/tarot`（塔羅牌陣）、`/bazi`（生辰八字排盤）、`/fengshui`（八宅與飛星風水）、`/yinyuan`（月老籤詩與生肖合婚）、`/qi`（奇門遁甲）、`/mei`（梅花易數）、`/oracle`（淺草寺百籤）、`/boa` / `/bo`（解答之書）、`/poetry`（經典唐詩）
    - ⚖️ **法律問答**：`/law`（台灣法規與實務判決要旨檢索）
    - 🛠️ **網路工具**：`/ip`（IP 地理定位與 ASN）、`/dns` / `/dns2`（DoH 解析）
    - 📖 **字典**：`/dictcn`（漢語成語辭典）、`/dicten`（英文字典）
    - 🔑 **實用工具**：`/password`（安全隨機密碼生成）
    - 👥 **協同調度**：`/delegate`（A2A 跨代理人協同）
- **全面對齊 `tbdavid2019/qimen` 7 大正統術數全息架構規範（5 層參數端到端對齊）**：
  - 🧭 **奇門遁甲 (`/qi`)**：十天干克應格局（青龍返首、飛鳥跌穴等）、三遁九遁吉格、門迫宮迫、8 大專題用神自動提取（求財/事業/感情/考試/健康/出行/官司）與主客動靜攻守策略。
  - 🌸 **梅花易數 (`/mei`)**：支援時間起卦、數字起卦（3個數字）、漢字報字起卦（`字:平安`），五卦全息（本互變錯綜）與三百八十四爻動爻爻辭。
  - 🎴 **生辰八字 (`/bazi`)**：支援四柱排盤、十神藏干、神煞、旺衰格局、命主姓名、曾用名、出生地與公曆/農曆雙曆法。
  - 🧭 **易經風水 (`/fengshui`)**：支援三元陽宅玄空飛星、8 大朝向與 24 山、8 大內外形煞化解（`shaqi`）與協紀辨方擇日（`zeri`）。
  - 🏮 **月老姻緣 (`/yinyuan`)**：支援 6 大模式（100 支月老靈籤自選/搖籤、生肖配對合婚、紫微夫妻宮、桃花運勢時效範圍、八字合婚與紅線正緣測算）。
  - 🔮 **韋特塔羅 (`/tarot`)**：支援 6 大牌陣與 3 大解讀變體維度（時間之流、現狀阻力、關係抉擇）。
  - 📖 **解答之書 (`/boa` / `/bo`)**：全面升級串接 `https://qi.david888.com/api/answerbook-question`，支援問題深度洞察與默念翻頁雙模式，並具備自動備援。
- **2MD 即時聯網搜尋與網頁/文件解析 (SERP & Web Reader)**：
  - 串接 2MD 高效能引擎，具備 3-Tier 自動容錯備援（`https://2md.aiurl.tw/` ➜ `https://2md.glsoft.ai/` ➜ `https://create360.ai/`）。
- **零幻覺自主查證鐵律（Zero-Hallucination Directive）**：
  - 靜態知識無法確定的公司上市現狀、即時股價、最新時事新聞，LLM 一律自動在背景發起 `/web` 或專屬工具查證後直接回答。
- **單元測試**：新增 `test/autonomous-tools.test.js` 與 `test/search-2md.test.js`，擴展 `test/divination.test.js`，全專案 **42 項單元測試全數通過**。

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
