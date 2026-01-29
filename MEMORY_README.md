# 長期記憶功能使用說明

## 功能概述

Bot 現在支援長期記憶功能，可以記住與用戶的對話內容、偏好設定等資訊，提供更個性化的服務。

## 架構設計

### 雙層記憶系統

- **全域知識庫 (global.md)**: 所有用戶共享的知識（家庭資訊、公開設定等）
- **個人記憶 (user_{id}.md)**: 每個用戶專屬的記憶（偏好、身份、對話記錄等）

### 儲存模式

- **KV 模式（預設）**: 使用 Cloudflare KV，無需綁定信用卡
- **R2 模式（可選）**: 使用 Cloudflare R2，需綁定信用卡

---

## 快速開始

### 1. 啟用記憶功能

在 `wrangler.toml` 的對應 Bot 環境中設定：

```toml
[env.aws.vars]
# ... 其他設定 ...

# 開啟長期記憶功能
ENABLE_LONG_TERM_MEMORY = "true"

# 儲存模式: kv 或 r2（預設 kv）
MEMORY_STORAGE_MODE = "kv"

# 自動保存記憶（對話結束後自動更新）
MEMORY_AUTO_SAVE = "true"
```

### 2. KV 模式（推薦，免費）

KV 模式使用現有的 `DATABASE` KV namespace，無需額外設定：

```toml
[[env.aws.kv_namespaces]]
binding = "DATABASE"
id = "你的KV ID"
```

### 3. R2 模式（可選，需綁信用卡）

如果你的 Cloudflare 帳號已綁定信用卡，可使用 R2 模式：

```toml
# 設定儲存模式為 r2
MEMORY_STORAGE_MODE = "r2"

# 取消註解以下 R2 綁定
[[env.aws.r2_buckets]]
binding = "MEMORY_BUCKET"
bucket_name = "telegram-bot-memories"
```

然後在 Cloudflare Dashboard 建立名為 `telegram-bot-memories` 的 R2 bucket。

### 4. 部署

```bash
npm run build
npx wrangler deploy --env aws
```

部署完成後，點擊 Worker 首頁的 **`>>>>> click here <<<<<`** 連結重新綁定 Webhook。

---

## 使用指令

### `/memory`

查看你的長期記憶（包含全域知識庫 + 個人記憶）

```
/memory
```

### `/memoryclear`

清除你的個人記憶（全域知識庫保持不變）

```
/memoryclear
```

### `/memoryglobal`

查看全域知識庫（所有用戶共享的知識）

```
/memoryglobal
```

---

## 記憶內容範例

### 全域知識庫

```markdown
# 全域知識庫

## 最後更新
2026-01-29

## 家庭資訊
- **地址**: 台北市信義區
- **成員**: David (650289664)、成員B (280274865)

## 公開設定
- **常用語言**: 繁體中文
- **時區**: Asia/Taipei (UTC+8)
```

### 個人記憶

```markdown
# 用戶記憶 - David (650289664)

## 最後更新
2026-01-29

## 身份與角色
- **名稱**: David
- **身份**: 開發者、專案擁有者

## 偏好設定
- **語言**: 繁體中文
- **預設 LLM**: Bedrock Claude Sonnet 4.5

## 對話記錄 (2026-01-29)
**用戶**: 我喜歡喝咖啡
**助手**: 已記住您的偏好！
```

---

## 自動記憶更新

當 `MEMORY_AUTO_SAVE = "true"` 時，Bot 會自動記錄對話內容到個人記憶中。

**自動記錄內容**：
- 對話摘要
- 重要資訊（身份、偏好等）

**未來擴展**（可選）：
- 使用 LLM 分析對話，提取關鍵資訊
- 自動分類記憶（身份、偏好、習慣等）

---

## 儲存位置

### KV 模式

- **全域**: `memory:global`
- **個人**: `memory:user:{telegramId}`

### R2 模式

- **全域**: `memory/global.md`
- **個人**: `memory/user_{telegramId}.md`

---

## 隱私與安全

### 資料控制權

- ✅ 使用者可隨時查看自己的記憶 (`/memory`)
- ✅ 使用者可隨時清除自己的記憶 (`/memoryclear`)
- ✅ 全域知識庫僅管理員可編輯

### 資料儲存

- 所有記憶儲存在你的 Cloudflare 帳號中
- KV/R2 資料僅你可存取
- Bot 不會將記憶分享給第三方

---

## 成本說明

### KV 模式（免費）

- **儲存空間**: 1 GB 免費
- **讀取**: 100,000 次/天 免費
- **寫入**: 1,000 次/天 免費

**結論**: 個人使用完全免費

### R2 模式（幾乎免費）

- **儲存空間**: 10 GB 免費
- **Class A 操作（寫入）**: 100 萬次/月 免費
- **Class B 操作（讀取）**: 1000 萬次/月 免費

**結論**: 個人使用幾乎免費

---

## 故障排除

### 記憶功能無效？

1. 確認 `ENABLE_LONG_TERM_MEMORY = "true"`
2. 確認已重新部署並綁定 Webhook
3. 檢查 KV/R2 是否正確綁定

### R2 模式無法使用？

1. 確認 Cloudflare 帳號已綁定信用卡
2. 確認已在 Dashboard 建立 R2 bucket
3. 確認 bucket 名稱與 `wrangler.toml` 設定一致

### 記憶內容錯誤？

使用 `/memoryclear` 清除個人記憶後重新開始。

---

## 進階功能（未來擴展）

- **智能記憶提取**: 使用 LLM 自動分析對話，提取關鍵資訊
- **記憶搜尋**: 搜尋歷史記憶中的特定資訊
- **記憶分類**: 自動分類為身份、偏好、習慣等
- **記憶壓縮**: 自動摘要舊記憶，節省儲存空間
- **記憶導出**: 匯出記憶為 Markdown 檔案

---

## 技術文件

詳細格式設計請參考：[MEMORY_FORMAT.md](./MEMORY_FORMAT.md)
