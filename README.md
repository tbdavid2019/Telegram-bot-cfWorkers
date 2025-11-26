本專案來自 fork https://github.com/TBXark/ChatGPT-Telegram-Workers

## 本次更新重點
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

在 Cloudflare Workers 的環境變數中新增：

### LLM_PROFILES（必填）

JSON 格式，定義所有可用的 LLM Profile：

```json
{
  "openai": {
    "name": "OpenAI GPT-4o",
    "apiBase": "https://api.openai.com/v1",
    "apiKey": "sk-xxx",
    "model": "gpt-4o"
  },
  "groq": {
    "name": "Groq Llama",
    "apiBase": "https://api.groq.com/openai/v1",
    "apiKey": "gsk-xxx",
    "model": "llama-3.3-70b-versatile"
  },
  "deepseek": {
    "name": "DeepSeek",
    "apiBase": "https://api.deepseek.com/v1",
    "apiKey": "sk-xxx",
    "model": "deepseek-chat"
  },
  "gemini": {
    "name": "Gemini OpenAI 相容",
    "apiBase": "https://generativelanguage.googleapis.com/v1beta/openai",
    "apiKey": "AIza-xxx",
    "model": "gemini-2.0-flash"
  },
  "ollama": {
    "name": "本地 Ollama",
    "apiBase": "http://localhost:11434/v1",
    "apiKey": "ollama",
    "model": "llama3.2"
  }
}
```

**在 Cloudflare Dashboard 中設定時，需要壓縮成一行：**

```
LLM_PROFILES = {"openai":{"name":"OpenAI GPT-4o","apiBase":"https://api.openai.com/v1","apiKey":"sk-xxx","model":"gpt-4o"},"groq":{"name":"Groq Llama","apiBase":"https://api.groq.com/openai/v1","apiKey":"gsk-xxx","model":"llama-3.3-70b-versatile"},"deepseek":{"name":"DeepSeek","apiBase":"https://api.deepseek.com/v1","apiKey":"sk-xxx","model":"deepseek-chat"}}
```

### DEFAULT_LLM_PROFILE（選填）

預設使用的 Profile 名稱：

```
DEFAULT_LLM_PROFILE = openai
```

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

#### 📈 進度統計

```
配置模組:    ████████████████████ 100% (1/1)
Telegram:    ████████████████████ 100% (4/4)
功能模組:    ████████████████████ 100% (9/9)
AI Agent:    ████████████████████ 100% (6/6)
工具模組:    ████████████████████ 100% (5/5)
主入口:      ████████████████████ 100% (1/1)
─────────────────────────────────────
總計:        ████████████████████ 100% (26/26)

原始檔案:    4717 行 (telegram.work.js)
模組化後:    5060 行 (26 個模組)
程式碼行數:  增加 343 行 (+7.3%, 因程式碼更清晰、可讀性更高)
```

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
