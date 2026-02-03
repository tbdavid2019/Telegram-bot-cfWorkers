本專案來自 fork https://github.com/TBXark/ChatGPT-Telegram-Workers

---

## 🆕 最新功能

### 🧠 長期記憶功能 (2026-01-29)

**讓 Bot 記住你的身份、偏好與對話內容！**

#### 功能特點

- ✅ **雙層記憶系統** - 全域知識庫 + 個人記憶
- ✅ **自動記憶** - 對話後自動保存重要資訊
- ✅ **隱私控制** - 使用者可隨時查看/清除自己的記憶
- ✅ **雙儲存模式** - KV（預設，免費）+ R2（可選，需綁卡）
- ✅ **完全免費** - KV 模式完全免費使用

#### 支援的指令

- 📚 `/memory` - 查看你的長期記憶（全域知識庫 + 個人記憶）
- 🗑️ `/memoryclear` - 清除個人記憶（全域知識庫保留）
- 🌍 `/memoryglobal` - 查看全域知識庫（所有用戶共享的知識）

#### 快速啟用

在 `wrangler.toml` 中設定：

```toml
[env.aws.vars]
# 開啟長期記憶功能
ENABLE_LONG_TERM_MEMORY = "true"

# 儲存模式: kv 或 r2（預設 kv，免費）
MEMORY_STORAGE_MODE = "kv"

# 自動保存記憶
MEMORY_AUTO_SAVE = "true"
```

#### 記憶內容範例

**全域知識庫**（所有用戶共享）：
- 家庭資訊、公開設定、共享知識

**個人記憶**（每人專屬）：
- 身份與角色、偏好設定、興趣與習慣、重要對話記錄

#### 技術架構

- **記憶模組** (`src/features/memory.js`) - KV/R2 讀寫核心
- **自動注入** (`src/agent/llm.js`) - 記憶自動注入到 LLM 系統提示詞
- **指令系統** (`src/features/memory-commands.js`) - 查看/清除記憶

詳細說明請參考 [MEMORY_README.md](./MEMORY_README.md) | 格式設計請參考 [MEMORY_FORMAT.md](./MEMORY_FORMAT.md)

---

### 🔧 Tool Calling 模式 - 家庭管理智能助手 (2026-01-02)

**讓 LLM 自動獲取並分析家庭收支與行程資料！**

#### 功能特點

- ✅ **自動資料獲取** - LLM 自動調用 Google Sheets 和 Calendar API
- ✅ **智能分析** - LLM 直接分析原始資料，提供深度洞察
- ✅ **無需按鈕確認** - 查詢和寫入操作自動執行
- ✅ **時間感知** - LLM 知道當前日期，正確計算相對時間
- ✅ **全天活動支援** - 行程自動設為全天事件

#### 支援的指令

**查詢類（自動獲取資料）**：
- 💰 **家庭收支查詢** - 「統計4~6月玉山與中信的支出總計」
- 📅 **行程查詢** - 「這個月有什麼行程？」

**寫入類（自動執行）**：
- 💸 **記帳** - 「記帳：12月房租 15000」
- 📝 **新增行程** - 「新增下週一 讀書日」

#### 技術架構

- **Tool Calling** (`src/agent/llm.js`) - 自動執行指令並將結果提供給 LLM
- **資料整合** - 直接調用 `readBudgetSheet`、`listCalendarEvents` 等函數
- **LLM 二次調用** - 獲取資料後再次調用 LLM 進行分析

#### 📅 行事曆自動通知系統 (New)

**不會錯過任何家庭活動！**

- ✅ **每日早安彙總** - 預設每天早上 6:00 (台北時間) 發送當日行程
- ✅ **每小時提醒** - (可選) 每小時檢查未來 1 小時內即將開始的活動
- ✅ **雙重通知** - 同時發送給設定的家庭群組及相關此活動的參與者
- ✅ **時區自動校正** - 預設以 `Asia/Taipei` 為準，可透過 `USER_TIMEZONE` 改成其他時區

**新增指令：**
- `/getid` - 查詢個人 Telegram ID
- `/getgroupid` - 查詢群組 ID (需將 Bot 加入群組)

**環境變數設定 (wrangler.toml)：**
```toml
ENABLE_SCHEDULED_NOTIFICATIONS = "true"  # 總開關
DAILY_SUMMARY_TIME = "6"               # 每日彙總時間 (使用者時區 0-23)
ENABLE_HOURLY_REMINDER = "false"       # 每小時提醒開關 (預設關閉)
FAMILY_GROUP_ID = "-100xxxx"           # 通知群組 ID
USER_TIMEZONE = "Asia/Taipei"          # 使用者時區 (IANA 格式，如 "America/Los_Angeles")
```

**說明**
- `USER_TIMEZONE` 未設定時預設為 `Asia/Taipei`。
- 每日彙總與「今天/明天/本週」查詢的日期邊界，會以 `USER_TIMEZONE` 計算。
- 全天事件會在每日彙總中顯示為「全天」，不會進入每小時提醒。

---

### 🎤 語音訊息支援 (2026-01-01)

**完全免費的語音轉文字 + 文字轉語音功能！**

#### 功能特點

- ✅ **語音轉文字 (ASR)** - 使用 Groq 免費 API,支援中英雙語
- ✅ **文字轉語音 (TTS)** - Groq TTS 實測可講中文!
- ✅ **智能回覆模式** - 透過 `/voicereply` 指令切換文字/語音回覆
- ✅ **Inline Keyboard** - 直觀的按鈕介面切換模式
- ✅ **多供應商架構** - 可輕鬆切換到 OpenAI/Google 等其他服務
- ✅ **完全免費** - 使用 Groq 免費額度

#### 使用方式

1. **發送語音訊息** - Bot 自動轉錄為文字並用 LLM 處理
2. **切換回覆模式** - 使用 `/voicereply` 選擇文字或語音回覆
3. **語音對話** - 開啟語音回覆後,Bot 會用語音回應

#### 配置

在 `wrangler.toml` 中設定:

```toml
# Groq API Key (免費)
GROQ_API_KEY = "gsk-YOUR-KEY"

# 語音轉錄 (ASR)
ENABLE_VOICE_TRANSCRIPTION = "true"
ASR_API_BASE = "https://api.groq.com/openai/v1"
ASR_MODEL = "whisper-large-v3"

# 語音回覆 (TTS)
ENABLE_VOICE_REPLY = "true"
TTS_API_BASE = "https://api.groq.com/openai/v1"
TTS_MODEL = "canopylabs/orpheus-v1-english"  # 實測可講中文!
```

詳細說明請參考 [VOICE_MESSAGE_IMPLEMENTATION_PLAN.md](./VOICE_MESSAGE_IMPLEMENTATION_PLAN.md)

---

### 🤖 LLM 指令發現系統

**讓 LLM 自動理解並建議使用 Bot 指令！**

### 功能特點

- ✅ **自動指令發現** - LLM 自動了解所有可用的 Bot 指令
- ✅ **智能權限檢查** - 只顯示用戶有權限使用的指令
- ✅ **一鍵執行** - 透過 Inline Keyboard 按鈕快速執行指令
- ✅ **無超時問題** - 完美適配 Cloudflare Workers 環境
- ✅ **動態 LLM 切換** - 支援 `/llmchange` 切換不同 LLM

### 使用範例

**用戶**：「台積電股價如何？」

**Bot 回應**：
```
正在為您查詢台積電（2330）的最新股價資訊 📊

[🔹 /stock 2330] ← 點擊按鈕執行
```

用戶點擊按鈕後，Bot 自動執行 `/stock 2330` 指令並回覆股價資訊。

### 啟用方式

在 `wrangler.toml` 中設定：

```toml
[env.your_env.vars]
ENABLE_COMMAND_DISCOVERY = "true"
```

### 技術架構

- **指令發現** (`src/agent/command-discovery.js`) - 提取指令、檢查權限、生成系統提示詞
- **指令調用** (`src/agent/command-invoker.js`) - 解析 LLM 回應、生成按鈕、處理點擊
- **LLM 整合** (`src/agent/llm.js`) - 動態生成提示詞、添加按鈕到回應

---

# 📋 目錄

- [環境變數完整說明](#-環境變數完整說明)
- [快速開始](#-快速開始)
- [多 Bot 部署指南](#-多-bot-部署指南)
- [長期記憶功能](#-長期記憶功能設定)
- [LLM Profile 多模型切換](#-llm-profile-多模型切換功能)
- [圖片生成設定](#多供應商圖片生成設定指南)
- [功能指令說明](#-功能指令說明)
- [專案架構](#️-專案架構與模組化)

---

# 📦 環境變數完整說明

## 📋 完整變數總覽表

| 類別 | 變數名稱 | 說明 |
|------|----------|------|
| **Telegram** | `TELEGRAM_AVAILABLE_TOKENS` | Bot Token |
| | `TELEGRAM_BOT_NAME` | Bot 名稱 |
| **白名單** | `CHAT_WHITE_LIST` | 允許的用戶 ID |
| | `CHAT_GROUP_WHITE_LIST` | 允許的群組 ID |
| **群組設定** | `GROUP_CHAT_BOT_ENABLE` | 啟用群組聊天 |
| | `GROUP_CHAT_BOT_SHARE_MODE` | 共享對話記憶 |
| **LLM** | `OPENAI_API_BASE` | OpenAI 相容 API URL |
| | `OPENAI_API_KEY` | OpenAI API Key |
| | `OPENAI_CHAT_MODEL` | 預設模型 |
| | `OPENROUTER_API_KEY` | OpenRouter Key |
| | `GOOGLE_API_KEY` | Google/Gemini Key |
| | `GOOGLE_MAPS_API_KEY` | Google Maps Key (Places New) |
| | `BEDROCK_API_KEY` | Bedrock Key |
| **圖片生成** | `AI_IMAGE_PROVIDER` | 圖片供應商選擇 (auto/openai/gemini) |
| | `DALL_E_MODEL` | DALL-E 模型 |
| | `DALL_E_IMAGE_STYLE` | 圖片風格 (vivid/natural) |
| | `OPENAI_IMAGE_API_BASE` | 圖片 API URL |
| | `OPENAI_IMAGE_API_KEY` | 圖片 API Key |
| | `GEMINI_IMAGE_API_KEY` | Gemini 圖片 Key |
| | `GEMINI_IMAGE_MODEL` | Gemini 圖片模型 |
| | `WORKERS_IMAGE_MODEL` | CF Workers AI 模型 |
| **Cloudflare** | `CLOUDFLARE_ACCOUNT_ID` | CF 帳號 ID |
| | `CLOUDFLARE_TOKEN` | CF API Token |
| **語音功能** | `GROQ_API_KEY` | Groq API Key (免費) |
| | `ENABLE_VOICE_TRANSCRIPTION` | 啟用語音轉文字 (true/false) |
| | `SHOW_TRANSCRIPTION` | 顯示轉錄文字 (true/false) |
| | `ASR_API_KEY` | ASR 專用 Key (選填) |
| | `ASR_API_BASE` | ASR API URL |
| | `ASR_MODEL` | ASR 模型 |
| | `ASR_LANGUAGE` | ASR 語言 (zh/en) |
| | `ENABLE_VOICE_REPLY` | 啟用語音回覆 (true/false) |
| | `TTS_API_KEY` | TTS 專用 Key (選填) |
| | `TTS_API_BASE` | TTS API URL |
| | `TTS_MODEL` | TTS 模型 |
| | `TTS_VOICE` | TTS 語音 |
| | `TTS_SPEED` | TTS 速度 (1.0) |
| | `TTS_FORMAT` | TTS 格式 (wav) |
| **第三方插件** | `netlasapiKey` | Netlas DNS 查詢 |
| | `infoapiKey` | IPInfo IP 查詢 |
| | `cwaapiKey` | 臺灣天氣查詢 |
| | `FMPapiKey` | 國際股市查詢 |
| **長期記憶** | `ENABLE_LONG_TERM_MEMORY` | 啟用長期記憶功能 (true/false) |
| | `MEMORY_STORAGE_MODE` | 儲存模式 (kv/r2，預設 kv) |
| | `MEMORY_AUTO_SAVE` | 自動保存記憶 (true/false) |
| **其他** | `LANGUAGE` | 語言設定 (zh-TW) |
| | `ENABLE_COMMAND_DISCOVERY` | 啟用 LLM 指令發現 (true/false) |
| | `ENABLE_LOCATION_SERVICE` | 啟用位置服務 (true/false) |
| | `I_AM_A_GENEROUS_PERSON` | 略過白名單 |
| | `CHAT_COMPLETE_API_TIMEOUT` | API 超時秒數 |
| | `DEFAULT_LLM_PROFILE` | 預設 LLM Profile |

---

以下是各變數的詳細說明：

## Telegram 設定

| 變數名稱 | 必填 | 說明 | 範例值 |
|----------|------|------|--------|
| `TELEGRAM_AVAILABLE_TOKENS` | ✅ | Telegram Bot Token（從 @BotFather 取得） | `7511604126:AAF...` |
| `TELEGRAM_BOT_NAME` | ✅ | Bot 名稱 | `my_awesome_bot` |

## 權限控制（白名單）

| 變數名稱 | 必填 | 說明 | 範例值 |
|----------|------|------|--------|
| `CHAT_WHITE_LIST` | ❌ | 允許使用的用戶 ID，逗號分隔。留空 = 所有人 | `650289664,280274865` |
| `CHAT_GROUP_WHITE_LIST` | ❌ | 允許使用的群組 ID（負數），逗號分隔 | `-1002244643664,-1001581614602` |

## 群組聊天設定

| 變數名稱 | 必填 | 說明 | 預設值 |
|----------|------|------|--------|
| `GROUP_CHAT_BOT_ENABLE` | ❌ | 是否啟用群組聊天 | `true` |
| `GROUP_CHAT_BOT_SHARE_MODE` | ❌ | 群組中是否共享對話記憶 | `true` |

## LLM API 設定（主要對話用）

| 變數名稱 | 必填 | 說明 | 範例值 |
|----------|------|------|--------|
| `OPENAI_API_BASE` | ❌ | OpenAI 相容 API 的基礎 URL | `https://api.openai.com/v1` |
| `OPENAI_API_KEY` | ✅ | OpenAI API Key | `sk-proj-xxx` |
| `OPENAI_CHAT_MODEL` | ❌ | 預設聊天模型 | `gpt-4o` |

## LLM Profiles 用的 API Keys

這些 Key 會被 `wrangler.toml` 中 `LLM_PROFILES` 的 `apiKeyEnv` 參照：

| 變數名稱 | 必填 | 說明 | 範例值 |
|----------|------|------|--------|
| `OPENROUTER_API_KEY` | ❌ | OpenRouter API Key | `sk-or-v1-xxx` |
| `GOOGLE_API_KEY` | ❌ | Google Gemini API Key | `AIzaSy-xxx` |
| `GOOGLE_MAPS_API_KEY` | ❌ | Google Maps Places API Key | `AIzaSy-xxx` |
| `BEDROCK_API_KEY` | ❌ | AWS Bedrock 或自訂服務的 Key | `your-key` |

## 圖片生成設定

| 變數名稱 | 必填 | 說明 | 預設值 |
|----------|------|------|--------|
| `AI_IMAGE_PROVIDER` | ❌ | 圖片供應商 | `auto` |
| `DALL_E_MODEL` | ❌ | DALL-E 模型 | `gpt-image-1-mini` |
| `DALL_E_IMAGE_STYLE` | ❌ | 圖片風格（vivid / natural） | `natural` |
| `OPENAI_IMAGE_API_BASE` | ❌ | 圖片 API Base（可與對話 API 不同） | `https://api.openai.com/v1` |
| `OPENAI_IMAGE_API_KEY` | ❌ | 圖片 API Key（可與對話 API 不同） | `sk-proj-xxx` |
| `GEMINI_IMAGE_API_KEY` | ❌ | Gemini 圖片生成專用 Key | `AIzaSy-xxx` |
| `GEMINI_IMAGE_MODEL` | ❌ | Gemini 圖片模型 | `gemini-2.0-flash-exp-image-generation` |
| `WORKERS_IMAGE_MODEL` | ❌ | Cloudflare Workers AI 模型 | `@cf/stabilityai/stable-diffusion-xl-base-1.0` |

## 語音功能設定

### Groq API Key（語音功能專用）

| 變數名稱 | 必填 | 說明 | 範例值 |
|----------|------|------|--------|
| `GROQ_API_KEY` | ✅ | Groq API Key（免費,用於 ASR/TTS） | `gsk_xxx` |

### 語音轉文字 (ASR) 設定

| 變數名稱 | 必填 | 說明 | 預設值 |
|----------|------|------|--------|
| `ENABLE_VOICE_TRANSCRIPTION` | ❌ | 啟用語音轉文字功能 | `false` |
| `SHOW_TRANSCRIPTION` | ❌ | 顯示轉錄文字（調試用） | `false` |
| `ASR_API_KEY` | ❌ | ASR 專用 Key（留空則使用 GROQ_API_KEY） | `` |
| `ASR_API_BASE` | ❌ | ASR API 基礎 URL | `https://api.groq.com/openai/v1` |
| `ASR_MODEL` | ❌ | ASR 模型 | `whisper-large-v3` |
| `ASR_LANGUAGE` | ❌ | ASR 語言（zh/en/auto） | `zh` |

### 文字轉語音 (TTS) 設定

| 變數名稱 | 必填 | 說明 | 預設值 |
|----------|------|------|--------|
| `ENABLE_VOICE_REPLY` | ❌ | 啟用語音回覆功能 | `false` |
| `TTS_API_KEY` | ❌ | TTS 專用 Key（留空則使用 GROQ_API_KEY） | `` |
| `TTS_API_BASE` | ❌ | TTS API 基礎 URL | `https://api.groq.com/openai/v1` |
| `TTS_MODEL` | ❌ | TTS 模型 | `canopylabs/orpheus-v1-english` |
| `TTS_VOICE` | ❌ | TTS 語音（autumn/breeze/coral/sage） | `autumn` |
| `TTS_SPEED` | ❌ | TTS 語速（0.25-4.0） | `1.0` |
| `TTS_FORMAT` | ❌ | TTS 音訊格式（wav/mp3/opus） | `wav` |

**注意事項:**
- 使用 Groq TTS 前需在 [Groq Console](https://console.groq.com/playground?model=canopylabs%2Forpheus-v1-english) 接受模型使用條款
- Groq 免費額度: ASR 無限制, TTS 每日限額
- `canopylabs/orpheus-v1-english` 模型實測可講中文!
- 用戶可透過 `/voicereply` 指令切換文字/語音回覆模式

### ⚠️ 開發注意事項：Cloudflare Workers 環境變數引用

**重要!** 在 Cloudflare Workers 專案中,環境變數的引用方式有特殊要求:

#### 問題現象
直接使用 `ENV.YOUR_VAR` 會導致變數值為 `undefined`,即使在 `wrangler.toml` 中已正確設定。

#### 根本原因
本專案使用 `UserConfig` 類來管理用戶可配置的環境變數,環境變數需要:
1. 在 `src/config/env.js` 的 `UserConfig` 類中定義屬性
2. 在 `ENV_TYPES` 中定義變數類型
3. 透過 `mergeEnvironment()` 函數合併到 `ENV.USER_CONFIG`

#### 正確寫法

```javascript
// ❌ 錯誤 - 直接使用 ENV
import { ENV } from '../config/env.js';
const apiKey = ENV.MY_API_KEY;  // undefined!

// ✅ 正確 - 使用 ENV.USER_CONFIG
import { ENV } from '../config/env.js';
const apiKey = ENV.USER_CONFIG.MY_API_KEY;  // 正確取得值
```

#### 新增環境變數的步驟

1. **在 `UserConfig` 類中定義屬性** (`src/config/env.js`)
```javascript
export class UserConfig {
  // ... 其他屬性
  MY_API_KEY = null;
  MY_SETTING = false;
}
```

2. **在 `ENV_TYPES` 中定義類型** (`src/config/env.js`)
```javascript
const ENV_TYPES = {
  // ... 其他類型
  MY_API_KEY: "string",
  MY_SETTING: "boolean"
};
```

3. **在程式碼中使用 `ENV.USER_CONFIG`**
```javascript
const config = {
  apiKey: ENV.USER_CONFIG.MY_API_KEY,
  enabled: ENV.USER_CONFIG.MY_SETTING
};
```

4. **在 `wrangler.toml` 中設定值**
```toml
[env.your_env.vars]
MY_API_KEY = "your-key"
MY_SETTING = "true"
```

#### 參考範例
可參考現有的實現:
- `src/features/location.js` - 使用 `ENV.USER_CONFIG.GOOGLE_MAPS_API_KEY`
- `src/features/voice.js` - 使用 `ENV.USER_CONFIG.ASR_API_KEY`
- `src/features/tts.js` - 使用 `ENV.USER_CONFIG.TTS_API_KEY`


## Cloudflare 設定（Workers AI 用）

| 變數名稱 | 必填 | 說明 | 範例值 |
|----------|------|------|--------|
| `CLOUDFLARE_ACCOUNT_ID` | ❌ | Cloudflare 帳號 ID | `379570860738dd...` |
| `CLOUDFLARE_TOKEN` | ❌ | Cloudflare API Token | `wkB6jAWcbm...` |

## 語言設定

| 變數名稱 | 必填 | 說明 | 預設值 |
|----------|------|------|--------|
| `LANGUAGE` | ❌ | 回應語言 | `zh-TW` |

## 第三方 Plugin API Keys

| 變數名稱 | 功能 | 申請網站 |
|----------|------|----------|
| `netlasapiKey` | DNS 查詢 | https://netlas.io |
| `infoapiKey` | IP 查詢 | https://ipinfo.io |
| `cwaapiKey` | 臺灣天氣查詢 | https://opendata.cwa.gov.tw |
| `FMPapiKey` | 國際股市查詢 | https://financialmodelingprep.com |

## 其他設定

| 變數名稱 | 必填 | 說明 | 預設值 |
|----------|------|------|--------|
| `I_AM_A_GENEROUS_PERSON` | ❌ | 設為 true 可略過白名單 | `false` |
| `ENABLE_LOCATION_SERVICE` | ❌ | 啟用 GPS/Google Maps 功能 | `false` |
| `CHAT_COMPLETE_API_TIMEOUT` | ❌ | API 請求超時秒數 | `60` |
| `DEFAULT_LLM_PROFILE` | ❌ | 預設使用的 LLM Profile | `openai` |

## 長期記憶功能設定

| 變數名稱 | 必填 | 說明 | 預設值 |
|----------|------|------|--------|
| `ENABLE_LONG_TERM_MEMORY` | ❌ | 啟用長期記憶功能 | `false` |
| `MEMORY_STORAGE_MODE` | ❌ | 儲存模式：`kv`（免費）或 `r2`（需綁卡） | `kv` |
| `MEMORY_AUTO_SAVE` | ❌ | 對話後自動保存記憶 | `true` |

**詳細說明**：
- **KV 模式**：使用現有的 KV namespace，完全免費
- **R2 模式**：需在 Cloudflare 綁定信用卡，並建立 R2 bucket
- 完整使用說明請參考 [MEMORY_README.md](./MEMORY_README.md)

---

# 🌍 Google Maps 附近地點查詢功能

Bot 現在支援使用 Google Maps Places API (New) 查詢附近的設施！

## ✨ 功能特點

- **📍 支援位置訊息**：直接在 Telegram 聊天中傳送「位置 (Location)」，Bot 接收後會自動詢問需求
- **🤖 `/gps` 指令**：使用指令呼叫「分享位置」按鈕，操作更直覺
- **🏢 多種地點類型**：一鍵查詢附近的：
    - ⛽ 加油站
    - 🅿️ 停車場
    - 🏪 便利商店
    - ☕ 咖啡廳
    - 🍽️ 餐廳
    - 🏧 ATM
- **🔗 Google Maps 整合**：搜尋結果附帶 Google Maps 連結、評分、營業狀態和距離

## 📝 設定說明

本功能使用 **Google Maps Places API (New)**。

1. **API Key**：
    - 建議使用專用的 `GOOGLE_MAPS_API_KEY` 環境變數。
    - **相容性**：若未設定，Bot 會嘗試使用 `GOOGLE_API_KEY` (Gemini 用) 作為備用。

2. **Google Cloud Console 設定**：
    - 請前往 Google Cloud Console。
    - 確保已啟用 **"Places API (New)"**。
    - 建議為 `GOOGLE_MAPS_API_KEY` 設定嚴格的 API 限制，**只允許 Places API (New)**，以符合最小權限原則。

---

# 🚀 快速開始

## 1. 複製 wrangler.toml 範本

```bash
cp wrangler.toml.example wrangler.toml
```

## 2. 編輯 `wrangler.toml` 填入你的值

在 `[env.aws.vars]` 或 `[env.chatgpt.vars]` 區塊中填入：

必填項目：
- `TELEGRAM_AVAILABLE_TOKENS` - 從 @BotFather 取得
- `OPENAI_API_KEY` - 或其他 LLM 的 API Key

## 3. 本地測試

```bash
pnpm install
pnpm run build
npx wrangler dev --env aws
```

## 4. 部署

```bash
npx wrangler deploy --env aws
npx wrangler deploy --env chatgpt
```

## 5. 綁定 Webhook (重要！)

部署完成後，請務必執行以下步驟以生效指令：
1. 點擊 Worker 提供的首頁連結 (例如 `https://your-bot.workers.dev`)
2. 在網頁上找到並點擊 **`>>>>> click here <<<<<`** 連結
3. 看到 `Webhook: {"ok":true,...}` 代表綁定成功！
> ⚠️ **注意**：每次修改 `wrangler.toml` 中的指令或環境變數後，都建議重新執行此步驟。

> ⚠️ **注意**：`wrangler.toml` 包含敏感的 API Keys，已加入 `.gitignore`，不會提交到 Git。

---

## 本次更新重點
- 🧠 **長期記憶功能**：Bot 現在可以記住用戶身份、偏好與對話內容，支援 KV/R2 雙儲存模式
- 🆕 **Google Maps 附近地點查詢**：支援傳送位置或使用 `/gps` 查詢附近的加油站、餐廳、便利商店等
- 🆕 **`/llmchange` 指令**：支援在多個 OpenAI API 相容服務之間快速切換（Groq、DeepSeek、OpenAI 等）
- `/img` 指令可直接引用訊息內或回覆的 Telegram 照片，缺少圖片生成器時會友善回報
- 影像提取更穩定：優先度選擇合適尺寸的 file_id，並支援從回覆訊息抓圖
- 文字/圖片並送時的內容組裝更安全，若僅有圖片也會自動加入基本提示


---

# 🔄 LLM Profile 多模型切換功能

支援在多個 OpenAI API 相容服務之間快速切換，無需每次都修改環境變數！

## ✨ 功能特點

- **多 Profile 管理**：同時設定多個 LLM 服務（OpenAI、Groq、DeepSeek、Ollama 等）
- **一鍵切換**：使用 `/llmchange` 指令快速切換不同服務
- **臨時覆蓋模型**：可在切換時指定特定模型，無需修改配置
- **使用者隔離**：每個使用者/群組有獨立的 LLM 設定
- **權限控制**：群組中只有管理員可以切換

## 📝 環境變數設定

本專案所有配置都在 `wrangler.toml` 中管理，包括 API Keys。

> ⚠️ **安全提醒**：`wrangler.toml` 包含敏感資訊，已加入 `.gitignore`，不會提交到 Git。

#### LLM_PROFILES 結構

在 `wrangler.toml` 中，`LLM_PROFILES` 使用 `apiKeyEnv` 參照環境變數名稱，而不是直接存放 API Key：

```json
{
  "openai": {
    "name": "OpenAI GPT-4o",
    "apiBase": "https://api.openai.com/v1",
    "apiKeyEnv": "OPENAI_API_KEY",
    "model": "gpt-4o"
  },
  "groq": {
    "name": "Groq Llama",
    "apiBase": "https://api.groq.com/openai/v1",
    "apiKeyEnv": "GROQ_API_KEY",
    "model": "llama-3.3-70b-versatile"
  }
}
```

#### 設定 API Keys

直接在 `wrangler.toml` 的 `[env.xxx.vars]` 區塊中填入所有 API Keys。

### 方式二：Cloudflare Dashboard

直接在 Cloudflare Dashboard 的 Workers 設定頁面添加環境變數。

---

# 🚀 多 Bot 部署指南

本專案支援**同一套程式碼部署到多個 Cloudflare Workers**，每個 Worker 服務不同的 Telegram Bot。

## 📁 檔案結構

```
wrangler.toml              # 主配置檔（包含所有環境變數，不提交 Git）
wrangler.toml.example      # 範本檔案（提交 Git）
```

## ⚙️ wrangler.toml 結構

每個環境 (`[env.xxx]`) 包含該 Bot 的所有設定：

```toml
# ===== Bot 1 =====
[env.aws]
name = "tgbotaws"

[env.aws.vars]
# Telegram 設定
TELEGRAM_AVAILABLE_TOKENS = "你的Bot-Token"
TELEGRAM_BOT_NAME = "bedrockGPT"

# LLM 設定
OPENAI_API_KEY = "sk-xxx"
OPENAI_API_BASE = "https://api.openai.com/v1"
OPENROUTER_API_KEY = "sk-or-xxx"
GOOGLE_API_KEY = "AIza-xxx"
BEDROCK_API_KEY = "xxx"

# 其他設定...
DEFAULT_LLM_PROFILE = "bedrock"
LLM_PROFILES = '''
{ ... }
'''

[[env.aws.kv_namespaces]]
binding = "DATABASE"
id = "你的KV-ID"

# ===== Bot 2 =====
[env.chatgpt]
name = "tgbotchatgpt"

[env.chatgpt.vars]
# 同樣結構，填入不同的值...
```

---

## 🔧 本地開發

```bash
# 測試 Bot 1
npx wrangler dev --env aws

# 測試 Bot 2
npx wrangler dev --env chatgpt
```

---

## 🚀 生產環境部署

直接部署，所有設定都在 `wrangler.toml` 中：

```bash
pnpm run build
npx wrangler deploy --env aws
npx wrangler deploy --env chatgpt

或

npm run build && npx wrangler deploy --env aws
```

> **🔥 重要提醒**：部署完成後，別忘了點擊 Worker 首頁的 **`>>>>> click here <<<<<`** 連結來重新綁定 Webhook 並更新指令列表！

---

## ➕ 新增第三個 Bot

### 1. 在 Cloudflare 建立 KV Namespace

到 Cloudflare Dashboard → Workers & Pages → KV → Create namespace

記下新的 KV ID（例如 `abc123...`）

### 2. 在 `wrangler.toml` 新增環境

```toml
# ===== Bot 3 =====
[env.newbot]
name = "tgbot-newbot"

[env.newbot.vars]
TELEGRAM_AVAILABLE_TOKENS = "你的新Bot-Token"
TELEGRAM_BOT_NAME = "newBotName"
OPENAI_API_KEY = "sk-xxx"
# ... 其他所有變數

DEFAULT_LLM_PROFILE = "openai"
LLM_PROFILES = '''
{ ... }
'''

[[env.newbot.kv_namespaces]]
binding = "DATABASE"
id = "abc123你的新KV-ID"
```

### 3. 部署新 Bot

```bash
npx wrangler deploy --env newbot
```

---

## 📊 環境對照表

| 環境名稱 | Worker 名稱 | Bot 名稱 | 預設 LLM | 部署指令 |
|---------|------------|----------|----------|----------|
| `aws` | tgbotaws | bedrockGPT | bedrock | `npx wrangler deploy --env aws` |
| `chatgpt` | tgbotchatgpt | chatGPT | openai | `npx wrangler deploy --env chatgpt` |
| `newbot` | tgbot-newbot | (你的Bot) | (自訂) | `npx wrangler deploy --env newbot` |

---

## 🎮 使用指令

### 查看目前設定和可用選項

```
/llmchange
```

輸出範例：
```
🤖 LLM 設定
━━━━━━━━━━━━━━━
📍 目前使用: openai
📦 模型: gpt-4o

可用的 Profiles:
✓ openai - OpenAI GPT-4o (gpt-4o)
• groq - Groq Llama (llama-3.3-70b-versatile)
• deepseek - DeepSeek (deepseek-chat)

使用方式:
/llmchange <profile> [model]
例: /llmchange groq
例: /llmchange openai gpt-4-turbo
```

### 切換到其他 Profile

```
/llmchange groq
```

輸出：
```
✅ 已切換到 groq
📦 模型: llama-3.3-70b-versatile
```

### 切換並指定特定模型

```
/llmchange groq mixtral-8x7b-32768
```

輸出：
```
✅ 已切換到 groq
📦 模型: mixtral-8x7b-32768 (覆蓋預設: llama-3.3-70b-versatile)
```

### 切換回預設模型

```
/llmchange openai
```

## 🔐 權限控制

| 場景 | 誰可以使用 |
|------|-----------|
| 私聊 | 所有使用者 |
| 群組 | 僅管理員和建立者 |

## 📊 使用者隔離

每個使用者/群組的 LLM 設定是獨立的：

- ✅ 使用者 A 切換到 Groq，不會影響使用者 B
- ✅ 群組 X 使用 DeepSeek，群組 Y 可以使用 OpenAI
- ✅ 設定會持久保存，重啟 Bot 後仍有效

## 🔧 與現有設定的相容性

| 現有設定 | 影響 |
|---------|------|
| `AI_PROVIDER = gemini` | ✅ 繼續使用 Gemini 獨立模式，直到使用 `/llmchange` 切換 |
| `OPENAI_API_KEY` | ✅ 保留作為 fallback |
| `GOOGLE_API_KEY` | ✅ Gemini 獨立模式繼續有效 |

## 💡 常見服務的 API Base

| 服務 | API Base |
|------|----------|
| OpenAI | `https://api.openai.com/v1` |
| Groq | `https://api.groq.com/openai/v1` |
| DeepSeek | `https://api.deepseek.com/v1` |
| Together AI | `https://api.together.xyz/v1` |
| Ollama (本地) | `http://localhost:11434/v1` |
| Gemini (OpenAI 相容) | `https://generativelanguage.googleapis.com/v1beta/openai` |
| Azure OpenAI | `https://{resource}.openai.azure.com/openai/deployments/{model}` |

---

## 要事先準備好的 三方插件的 plugin api
要準備好這幾個 API KEY  分別去這幾個網站註冊free
- https://etlas.io  netlasapiKey DNS查詢
- https://ipinfo.io  infoapiKey IP查詢
- https://opendata.cwa.gov.tw   cwaapiKey臺灣天氣查詢 
- https://financialmodelingprep.com/   FMPapiKey 國際股市查詢


**除了經典的 ChatGPT / Claude / Gemeini 等大型語言模型功能外**
還支援

### 指令 /boa
解答之書 命運還是機會？  
<img width="492" alt="image" src="https://github.com/user-attachments/assets/791f3e33-8d2a-47aa-8f8a-e800b53f4929">
<img width="398" alt="image" src="https://github.com/user-attachments/assets/c78bf4b4-3f64-4a23-bca9-210b38de74c6">

### 指令 /dictcn 中文字典
<img width="332" alt="image" src="https://github.com/user-attachments/assets/d4a43a69-f3bd-4965-ad80-06df39e4e1e4">

### 指令 /dict 英文字典
<img width="574" alt="image" src="https://github.com/user-attachments/assets/4a85d1b3-cb6f-47b9-8aee-125eeefa9049">

### 臺股 /stocktw  ; 國際股票 /stock
<img width="392" alt="image" src="https://github.com/user-attachments/assets/878b0ac4-88ee-477b-a20a-a21b312d93d5">

### 臺灣天氣 /weather
<img width="574" alt="image" src="https://github.com/user-attachments/assets/172a425e-58c9-4d46-86ca-58fbca2419e1">

### 法律問答 /law
全新的台灣法律諮詢功能，讓您隨時獲得專業的法律建議！

**使用方式：**
```
/law AI產生的不實訊息，散播者會構成加重誹謗罪嗎？
```

**功能特點：**
- 🏛️ 專門針對台灣法律的問答系統
- 🤖 使用 GPT-4o 模型提供精確回答
- 📚 支援深度思考模式，提供更詳盡的法律分析
- ⚖️ 涵蓋民法、刑法、商法等各領域法律問題
- 💡 每次回答都會附上免責聲明，提醒使用者諮詢專業律師

**注意事項：**
所有回答僅供參考，如有具體法律問題請諮詢專業律師。


---

# 多供應商圖片生成設定指南

已成功整合多個圖片生成供應商到您的 Telegram Bot 中！

## 新功能特點

- 支援最新的 `gpt-image-1` 模型（OpenAI）
- 支援 `gemini-2.5-flash-image-preview` 模型（Google）
- **🔑 獨立 API Key**：不同供應商可使用獨立的 API Key
- **🤖 自動供應商選擇**：智慧選擇可用的圖片生成服務
- 智慧處理 base64 格式的圖片回應
- 自動兼容現有的 DALL-E-2 和 DALL-E-3 模型
- 無縫切換不同的圖片生成模型和供應商
- 針對 Telegram Bot 優化的圖片處理

## 如何使用多供應商圖片生成

### 🎯 AI 圖片供應商選擇

設定自動供應商選擇模式：

```bash
/setenv AI_IMAGE_PROVIDER=auto
```

或手動指定供應商：

```bash
# 使用 OpenAI
/setenv AI_IMAGE_PROVIDER=openai

# 使用 Gemini
/setenv AI_IMAGE_PROVIDER=gemini
```

### 1. OpenAI GPT-Image-1 設定

#### 設定圖片生成專用 API Key（推薦）

為了避免與 LLM API Key 衝突，建議設定專用的圖片生成 API Key：

```bash
/setenv OPENAI_IMAGE_API_KEY=sk-proj-your-image-api-key-here
```

#### 設定圖片生成 API Base（可選）

如果需要使用不同的 API 端點（注意：只需要填寫基礎 URL，系統會自動加上 `/images/generations`）：

```bash
/setenv OPENAI_IMAGE_API_BASE=https://api.openai.com/v1
```

**重要說明**：

- 只需填寫基礎 URL（如 `https://api.openai.com/v1`）
- 系統會自動加上 `/images/generations` 路徑
- 完整的 API 調用會是：`https://api.openai.com/v1/images/generations`

#### 設定模型為 GPT-Image-1

```bash
/setenv DALL_E_MODEL=gpt-image-1
```

或者使用新的專門配置：

```bash
/setenv GPT_IMAGE_MODEL=gpt-image-1
```

#### 設定圖片尺寸（可選）

```bash
/setenv GPT_IMAGE_SIZE=1024x1024
```

### 2. Google Gemini 圖片生成設定

#### 設定 Gemini 專用 API Key

```bash
/setenv GEMINI_IMAGE_API_KEY=AIzaSy...your-gemini-key-here
```

#### 設定 Gemini 圖片模型（可選）

```bash
/setenv GEMINI_IMAGE_MODEL=gemini-2.5-flash-image-preview
```

### 3. 生成圖片

```bash
/img 一隻在月光下的可愛海獺
```

## 配置選項

| 配置項 | 說明 | 預設值 | 示例 |
|--------|------|--------|------|
| `AI_IMAGE_PROVIDER` | 圖片生成供應商選擇 | `auto` | `auto`, `openai`, `gemini` |
| `OPENAI_IMAGE_API_KEY` | OpenAI 圖片生成專用 API Key | 空（使用 OPENAI_API_KEY） | `sk-proj-...` |
| `OPENAI_IMAGE_API_BASE` | OpenAI 圖片生成專用 API Base | 空（使用 OPENAI_API_BASE） | `https://api.openai.com/v1` |
| `GEMINI_IMAGE_API_KEY` | Gemini 圖片生成專用 API Key | 空 | `AIzaSy...` |
| `DALL_E_MODEL` | 主要圖片模型 | `dall-e-3` | `gpt-image-1` |
| `GPT_IMAGE_MODEL` | GPT-Image 專用模型 | `gpt-image-1` | `gpt-image-1` |
| `GPT_IMAGE_SIZE` | GPT-Image 圖片尺寸 | `1024x1024` | `1024x1024` |
| `GEMINI_IMAGE_MODEL` | Gemini 圖片模型 | `gemini-2.5-flash-image-preview` | `gemini-2.5-flash-image-preview` |

## 🤖 智慧供應商選擇

當設定 `AI_IMAGE_PROVIDER=auto` 時，系統會：

1. **檢查可用性**：檢測哪些供應商的 API Key 已設定
2. **自動選擇**：優先選擇可用的供應商
3. **容錯處理**：如果主要供應商失敗，自動切換到備用供應商
4. **日誌記錄**：詳細記錄供應商選擇過程

**選擇優先級**：
1. OpenAI（如果 `OPENAI_IMAGE_API_KEY` 或 `OPENAI_API_KEY` 存在）
2. Gemini（如果 `GEMINI_IMAGE_API_KEY` 存在）

## 🔑 API Key 優先級邏輯

### OpenAI 系統會按以下優先級選擇 API Key：

1. **OPENAI_IMAGE_API_KEY**：如果設定了專用的圖片 API Key
2. **OPENAI_API_KEY**：如果沒有專用 Key，則使用一般的 OpenAI Key

同樣地，API Base 的優先級：

1. **OPENAI_IMAGE_API_BASE**：如果設定了專用的圖片 API Base
2. **OPENAI_API_BASE**：如果沒有專用 Base，則使用一般的 API Base

### Gemini 系統直接使用：

- **GEMINI_IMAGE_API_KEY**：Gemini 專用的 API Key

## 📋 使用場景

### 場景 1：純 OpenAI 用戶

```bash
# 只需要設定一個 API Key
/setenv OPENAI_API_KEY=sk-your-openai-key

# 圖片和對話都會使用同一個 key
/setenv DALL_E_MODEL=gpt-image-1
/img 美麗的風景
```

### 場景 2：LLM 使用第三方，圖片使用 OpenAI

```bash
# LLM 使用第三方服務
/setenv OPENAI_API_KEY=third-party-llm-key
/setenv OPENAI_API_BASE=https://third-party-llm.com/v1

# 圖片使用真正的 OpenAI（注意：只填基礎 URL）
/setenv OPENAI_IMAGE_API_KEY=sk-real-openai-key
/setenv OPENAI_IMAGE_API_BASE=https://api.openai.com/v1

/setenv DALL_E_MODEL=gpt-image-1
/img 星空下的城市
```

**說明**：

- `OPENAI_API_BASE` 是給 LLM 對話用的，會加上 `/chat/completions`
- `OPENAI_IMAGE_API_BASE` 是給圖片生成用的，會加上 `/images/generations`

### 場景 3：多個 OpenAI API Key

```bash
# 對話使用一組 key
/setenv OPENAI_API_KEY=["sk-key1","sk-key2"]

# 圖片使用另一組 key（避免額度衝突）
/setenv OPENAI_IMAGE_API_KEY=["sk-image-key1","sk-image-key2"]
```

### 場景 4：使用 Gemini 圖片生成

```bash
# 使用 Gemini 專用圖片生成
/setenv AI_IMAGE_PROVIDER=gemini
/setenv GEMINI_IMAGE_API_KEY=AIzaSy...your-gemini-key

/img 未來科技城市的夜景
```

### 場景 5：多供應商自動切換

```bash
# 設定多個供應商
/setenv AI_IMAGE_PROVIDER=auto
/setenv OPENAI_IMAGE_API_KEY=sk-openai-key
/setenv GEMINI_IMAGE_API_KEY=AIzaSy...gemini-key

# 系統會自動選擇可用的供應商
/img 夢幻森林中的精靈
```

## 技術細節

### API 差異

- **DALL-E**: 回傳圖片 URL，Telegram 直接抓取
- **GPT-Image-1**: 回傳 base64 編碼的圖片數據
- **Gemini**: 回傳 base64 編碼的圖片數據（streaming API）

### 智慧處理機制

系統會自動檢測回應格式並進行適當處理：

- **URL 格式**: 直接傳遞給 Telegram API
- **Base64 格式**: 自動轉換為 Blob 並作為檔案上傳
- **Streaming 回應**: 正確處理 Gemini 的流式 API 回應
- **錯誤恢復**: 處理失敗時的容錯機制和自動切換
- **記憶體優化**: 有效處理大型圖片數據

### API Key 隔離好處

- **避免衝突**: LLM 和圖片生成使用不同的 API Key
- **配額管理**: 分開管理不同服務的使用配額
- **安全性**: 可以為不同功能設定不同權限的 Key
- **靈活性**: 支援混合使用不同提供商的服務
- **多供應商**: 支援同時使用多個圖片生成供應商

### 供應商特色

#### OpenAI GPT-Image-1
- **優勢**: 高品質圖片生成，穩定的 API
- **格式**: Base64 編碼圖片數據
- **支援尺寸**: 1024x1024, 1792x1024, 1024x1792

#### Google Gemini 2.5 Flash Image Preview
- **優勢**: 快速生成，與文本模型整合
- **格式**: Streaming API，Base64 編碼
- **特色**: 多模態能力，文字+圖片混合輸出

## 切換回 DALL-E

如果您想切換回 DALL-E 模型：

```bash
/setenv DALL_E_MODEL=dall-e-3
/setenv AI_IMAGE_PROVIDER=openai
```

## 故障排除

### 1. 圖片生成失敗

**OpenAI 相關**：
- 檢查 `OPENAI_IMAGE_API_KEY` 或 `OPENAI_API_KEY` 是否有效
- 確認 API Key 有圖片生成權限
- 檢查 `OPENAI_IMAGE_API_BASE` 設定

**Gemini 相關**：
- 檢查 `GEMINI_IMAGE_API_KEY` 是否有效
- 確認 Gemini API 的圖片生成權限
- 檢查是否使用正確的模型 `gemini-2.5-flash-image-preview`

### 2. API Key 衝突

- 設定 `OPENAI_IMAGE_API_KEY` 來分離圖片和對話功能
- 使用 `GEMINI_IMAGE_API_KEY` 獨立設定 Gemini 服務
- 檢查各自的 API Base 設定

### 3. 模型不可用

- 確認您的 OpenAI 帳戶有 GPT-Image-1 存取權限
- 確認您的 Google Cloud 帳戶有 Gemini 圖片生成權限
- 檢查 API Key 是否支援新模型

### 4. 自動切換不工作

- 檢查 `AI_IMAGE_PROVIDER=auto` 設定
- 確認至少有一個供應商的 API Key 已設定
- 查看日誌確認供應商檢測過程

### 5. 第三方 LLM 相容性

- 為圖片生成設定真正的 OpenAI 或 Gemini API Key
- 使用獨立的 API Base 設定
- 確保圖片和對話服務分離

## 範例用法

```bash
# 完整設定範例（第三方 LLM + OpenAI 圖片）
/setenv OPENAI_API_KEY=third-party-key
/setenv OPENAI_API_BASE=https://third-party.com/v1
/setenv OPENAI_IMAGE_API_KEY=sk-real-openai-key
/setenv OPENAI_IMAGE_API_BASE=https://api.openai.com/v1
/setenv DALL_E_MODEL=gpt-image-1

# 生成圖片
/img 一個未來主義的城市景觀，充滿霓虹燈和飛行汽車
```

**實際的 API 調用會是**：
- 對話：`https://third-party.com/v1/chat/completions`
- 圖片：`https://api.openai.com/v1/images/generations`

## 工作流程說明

```
文字對話: OPENAI_API_KEY + OPENAI_API_BASE → 第三方 LLM
    ↓
圖片生成: OPENAI_IMAGE_API_KEY + OPENAI_IMAGE_API_BASE → OpenAI GPT-Image-1
```

享受全新的 GPT-Image-1 圖片生成體驗！🎨✨

---

---



### 清除 setChatMenuButton
```
curl -X POST https://api.telegram.org/botYOUR_BOT_TOKEN/setChatMenuButton \
  -H "Content-Type: application/json" \
  -d '{"menu_button":{"type":"default"}}'
```
---

## 📄 授權

本專案採用 MIT 授權條款。詳見 [LICENSE](LICENSE) 文件。

## 🙏 致謝

- Cloudflare Workers 平台支援
- Telegram Bot API 社群
- LINE Messaging API 開發團隊
- OpenAI API 整合支援
- 所有貢獻者和使用者的回饋

---

**🎉 恭喜！你現在擁有一個完整的多平台聊天機器人系統！**

在雙平台模式下，你的使用者可以從 Telegram 或 LINE 任一平台與你的 AI 助手互動，享受完全相同的功能和體驗。系統會自動處理平台差異，確保所有功能在兩個平台上都能完美運作。


```
使用者互動流程 (UX) 的挑戰
Telegram 的指令通常是一次性的（例如 /img prompt）。要同時發送「圖片」和「指令」有幾種方式，但各有優缺點：

方案 A：引用 (Reply) 圖片模式

操作方式：使用者先傳一張圖到聊天室 -> 然後對著那張圖按「回覆 (Reply)」 -> 輸入 /img 把背景變成紅色。
優點：符合 Telegram 原生操作邏輯，不需要狀態管理（Stateless），實作相對簡單。
缺點：使用者需要知道要用「回覆」的方式。
方案 B：上下文模式 (Context Mode)

操作方式：您提到的 /image 切換模式。輸入 /image 進入「產圖模式」 -> 之後傳送的圖片和文字都會被視為產圖請求。
優點：體驗像是在跟一個專門的繪圖師對話。
缺點：需要強大的狀態管理（Session/Context）。目前的程式碼架構雖然有 Context 類別，但主要用於儲存設定，對於「當前是否處於某種特殊模式」的支援較弱。且在 Cloudflare Workers 這種 Serverless 環境下，維持長期的對話狀態比較困難（通常依賴 KV 或資料庫）。
方案 C：Caption 模式

操作方式：使用者上傳圖片時，直接在圖片的「說明文字 (Caption)」欄位輸入 /img 變更風格。
優點：一次動作完成。
缺點：使用者容易忘記打指令，或者 Telegram 客戶端壓縮圖片導致細節遺失。

```

✅ 目前 `/img` 已實作 Caption 模式：在 Telegram 上傳圖片時的 caption 內輸入 `/img 想要的風格`，機器人會同時把該圖片與文字提示送到 `gemini-2.5-flash-image-preview` 進行再生成。

---

## 🏗️ 專案架構與模組化

### 📁 專案結構

```
Telegram-bot-cfWorkers/
├── src/                          # 📦 原始碼模組 (開發用)
│   ├── config/                   # ⚙️  配置相關
│   │   └── env.js               # 環境變數、全域設定
│   ├── telegram/                 # 📱 Telegram 相關
│   │   ├── telegram.js          # Telegram API 基礎功能
│   │   ├── context.js           # Context 管理
│   │   ├── commands.js          # 指令路由系統 (17個指令)
│   │   └── message.js           # 訊息中介層 (10個處理器)
│   ├── features/                 # 🎯 功能模組
│   │   ├── weather.js           # 天氣查詢 (wttr.in + CWA)
│   │   ├── stock.js             # 股票查詢 (Yahoo + FMP)
│   │   ├── dictionary.js        # 字典 (中英文)
│   │   ├── divination.js        # 占卜 (5種系統)
│   │   ├── law.js               # 法律問答 (GPT-4o)
│   │   ├── network.js           # 網路工具 (IP/DNS)
│   │   ├── search.js            # 網路搜尋 (DuckDuckGo)
│   │   └── image-gen.js         # AI 圖片生成 (4種服務)
│   ├── agent/                    # 🤖 AI Agent
│   │   ├── openai.js            # OpenAI / DALL-E / GPT-Image
│   │   ├── gemini.js            # Google Gemini
│   │   ├── agents.js            # Agent 管理與選擇
│   │   ├── stream.js            # 串流處理
│   │   └── request.js           # HTTP 請求處理
│   ├── utils/                    # 🛠️ 工具函數
│   │   ├── cache.js             # 快取管理
│   │   ├── image.js             # 圖片處理
│   │   ├── md2tgmd.js           # Markdown 轉換
│   │   ├── router.js            # 路由處理
│   │   └── utils.js             # 通用工具
│   └── index.js                  # 🚀 主入口
│
├── dist/                         # 📦 打包輸出 (部署用)
│   └── telegram.work.js         # 打包後的單一檔案 (151KB)
│
├── telegram.work.js              # 📄 原始單檔版本 (4717行, 保留參考)
├── package.json                  # 📋 NPM 設定
└── build.js                      # 🔨 esbuild 打包腳本
```

### 🚀 開發流程

#### 1. 安裝依賴

```bash
pnpm install
```

#### 2. 開發

```bash
# 打包一次（推薦：模組化版本）
pnpm run build

# 使用完整原始檔案（備用）
pnpm run build:full

# 監聽模式 (自動重新打包)
pnpm run dev
```

**說明**：
- `pnpm run build` - 從 `src/` 打包模組化版本（推薦，完整功能）
- `pnpm run build:full` - 直接複製 `telegram.work.js`（備用方案）
- `pnpm run dev` - 開發監聯模式

---

## 🔄 打包版本差異

本專案提供兩種打包方式，功能上完全相同：

### 比較表

| 項目 | 模組化版 (`build`) | 完整版 (`build:full`) |
|------|-------------------|----------------------|
| **檔案大小** | 144 KB | 151 KB |
| **程式碼行數** | 4,342 行 | 4,717 行 |
| **打包時間** | ~15ms | < 5ms |
| **可維護性** | ✅ 高（26 個模組） | ⚠️ 低（單一檔案） |
| **Tree-shaking** | ✅ 支援 | ❌ 不支援 |

### 🔧 `pnpm run build` (推薦)

模組化版本，從 `src/` 目錄打包：

```bash
pnpm run build
# 輸出: dist/telegram.work.modular.js (144 KB)
```

**優點：**
- 檔案更小（減少 7 KB）
- 模組化架構，易於維護
- 支援 tree-shaking 優化
- 26 個獨立模組，職責分明

**支援的 AI 提供商：**
- ✅ OpenAI (GPT-4o, DALL-E, GPT-Image-1)
- ✅ Google Gemini (Chat + 原生圖片生成)

### 📦 `pnpm run build:full` (備用)

直接複製原始完整檔案：

```bash
pnpm run build:full
# 輸出: dist/telegram.work.js (151 KB)
```

**額外支援的 AI 提供商：**
- Azure OpenAI
- Mistral AI
- Cohere AI
- Anthropic (Claude)
- Workers AI

> ⚠️ **注意**: 如果你需要使用 Azure、Mistral、Cohere、Anthropic 或 Workers AI，請使用 `build:full` 版本。

### 如何選擇？

| 使用情況 | 建議版本 |
|---------|---------|
| 只使用 OpenAI + Gemini | `pnpm run build` ✅ |
| 需要 Azure/Mistral/Cohere/Anthropic/Workers AI | `pnpm run build:full` |
| 開發和除錯 | `pnpm run build` ✅ |
| 緊急部署 | `pnpm run build:full` |

---

#### 3. 部署

打包完成後，將 `dist/telegram.work.js` 或 `dist/telegram.work.modular.js` 上傳到 Cloudflare Workers。

### 📊 模組化進度 (2025-11-25 更新)

#### ✅ 已完成的模組

**配置模組 (100%)**
- `src/config/env.js` - UserConfig、Environment 類別、ENV 全域變數

**Telegram 模組 (100%)**
- `src/telegram/telegram.js` - 訊息發送、Webhook 綁定、getChatRole
- `src/telegram/context.js` - Context 管理
- `src/telegram/commands.js` (400行) - 指令路由系統、handleCommandMessage、bindCommandForTelegram
- `src/telegram/message.js` (480行) - 訊息中介層、handleMessage、loadMessage

**功能模組 (100%)**
- `src/features/weather.js` (130行) - 天氣查詢 (wttr.in + 台灣氣象局)
- `src/features/stock.js` (254行) - 股票查詢 (Yahoo Finance + FMP API)
- `src/features/dictionary.js` (100行) - 中英文字典 (moedict + dictionaryapi)
- `src/features/divination.js` (248行) - 占卜系統 (奇門遁甲、淺草籤、唐詩、解答之書、密碼生成)
- `src/features/law.js` (198行) - 台灣法律問答 (GPT-4o 後端)
- `src/features/network.js` (166行) - 網路工具 (IP查詢、DNS查詢)
- `src/features/search.js` (60行) - 網路搜尋 (DuckDuckGo)
- `src/features/image-gen.js` (293行) - AI 圖片生成 (OpenAI/Gemini)
- `src/features/system.js` (388行) - 系統指令 (help, new, setenv, version, system, redo)
- `src/features/memory.js` (180行) - 長期記憶 (KV/R2 雙儲存模式)
- `src/features/memory-commands.js` (55行) - 記憶指令 (/memory, /memoryclear, /memoryglobal)

**AI Agent 模組 (100%)**
- `src/agent/stream.js` - SSE 串流處理
- `src/agent/request.js` - 統一請求處理
- `src/agent/openai.js` - OpenAI Chat + DALL-E/GPT-Image-1
- `src/agent/gemini.js` - Gemini Chat + 原生圖片生成
- `src/agent/agents.js` - Agent 統一管理
- `src/agent/llm.js` (181行) - LLM 聊天邏輯 (loadHistory, requestCompletionsFromLLM, chatWithLLM)

**工具模組 (100%)**
- `src/utils/cache.js` - LRU 快取
- `src/utils/md2tgmd.js` - Markdown 轉換
- `src/utils/image.js` - 圖片處理工具
- `src/utils/router.js` - 路由處理
- `src/utils/utils.js` - 通用工具函數

**主入口 (100%)**
- `src/index.js` - Cloudflare Workers 入口

#### 🎯 核心功能指令 (17個)

**LLM 切換**
- `/llmchange` - 切換 LLM 模型 (支援多個 OpenAI 相容服務)

**天氣相關**
- `/wt` - 查詢天氣
- `/weatheralert` - 台灣天氣特報

**股票相關**
- `/stock` - 台灣股票查詢
- `/stock2` - 國際股票查詢

**字典相關**
- `/dictcn` - 中文字典
- `/dicten` - 英文字典

**占卜相關**
- `/qi` - 奇門遁甲
- `/oracle` - 淺草寺籤詩
- `/poetry` - 隨機唐詩
- `/boa` - 解答之書
- `/bo` - 解答之書原版
- `/password` - 隨機密碼生成

**實用工具**
- `/law` - 台灣法律問答
- `/ip` - IP 位址查詢
- `/dns` - DNS 查詢 (Cloudflare)
- `/dns2` - DNS 查詢 (Netlify)
- `/web` - 網路搜尋

**AI 圖片生成**
- `/img` - AI 圖片生成 (支援4種服務)
- `/img2` - 並行生成 (多服務同時)
- `/setimg` - 設定圖片生成服務

**系統管理**
- `/help` - 顯示幫助訊息
- `/new` - 開始新對話
- `/start` - 開始使用
- `/setenv` - 設定環境變數
- `/version` - 檢查更新
- `/system` - 顯示系統狀態
- `/redo` - 重新生成上一則回覆

### 💡 模組化優勢

| 項目 | 單檔版本 | 模組化版本 |
|------|----------|------------|
| 維護性 | ❌ 4717行難以維護 | ✅ 每個檔案100-300行 |
| 可讀性 | ❌ 難以找到特定功能 | ✅ 功能分類清楚 |
| 協作 | ❌ 多人容易衝突 | ✅ 分模組降低衝突 |
| 測試 | ❌ 難以單元測試 | ✅ 可獨立測試模組 |
| 重用 | ❌ 難以重用程式碼 | ✅ 模組可跨專案使用 |

### 🔧 esbuild 工作原理

```
開發時:
src/index.js  ──┐
src/config/*.js ├─→ esbuild ─→ dist/telegram.work.js (單一檔案)
src/utils/*.js ─┘
```

esbuild 會:
1. 從 `src/index.js` 開始
2. 追蹤所有 `import` 關係
3. 合併成單一檔案
4. 移除未使用的程式碼

### 📦 打包效能

```
打包時間:     < 100ms
檔案大小:     ~150 KB (模組化打包版本)
模組數量:     26 個
程式碼行數:   5060 行 (模組化版本)
打包方式:     pnpm run build (ES6 模組打包) 或 pnpm run build:full (直接複製)
部署目標:     Cloudflare Workers
```

### 🛠️ 常見操作

#### 新增模組
```bash
# 建立新檔案
vim src/features/weather.js

# 在檔案中使用 export
export function getWeather() {
  // ...
}

# 在其他檔案中 import
import { getWeather } from './features/weather.js';

# 重新打包
pnpm run build
```

#### 除錯打包問題
```bash
# 查看詳細打包資訊
node build.js

# 檢查檔案大小
ls -lh dist/telegram.work.js

# 查看打包內容
cat dist/telegram.work.js | head -n 50
```
