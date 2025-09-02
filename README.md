本專案來自 fork https://github.com/TBXark/ChatGPT-Telegram-Workers

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


