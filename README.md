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

# 🤖 多平台 Bot 整合指南 (Telegram + LINE)

已成功整合 LINE Bot 功能！現在您的 bot 可以同時在 Telegram 和 LINE 平台上運行，提供一致的 AI 對話和圖片生成體驗。

## 🎯 核心功能特點

### 平台支援
- **🔵 Telegram Bot**：完整保留原有功能
- **🟢 LINE Bot**：新增 LINE 平台支援
- **🔀 智能切換**：根據配置自動啟用所需平台
- **🎛️ 靈活控制**：支援單一平台或雙平台同時運行

### 統一功能
- **💬 AI 對話**：所有 LLM 和指令功能在兩個平台均可使用
- **🎨 圖片生成**：支援 OpenAI、Gemini 等多種圖片生成服務
- **📊 狀態監控**：實時查看平台狀態和 bot 資訊
- **🔐 安全驗證**：完整的 webhook 簽名驗證機制




## 📊 監控和管理

### 平台狀態頁面
訪問以下 URL 查看實時狀態：
```
https://your-domain.com/status
```

顯示內容包括：
- 當前平台模式
- 各平台啟用狀態
- Bot 數量和基本資訊
- Token 狀態（部分遮蔽）

### 開發調試頁面

在 `DEV_MODE=true` 或 `DEBUG_MODE=true` 時可用：

#### Telegram Bot 資訊
```
https://your-domain.com/telegram/YOUR_TOKEN/bot
```

#### LINE Bot 資訊
```
https://your-domain.com/line/YOUR_TOKEN/bot
```

## 🔧 LINE 特殊功能

### 圖片處理
LINE 平台要求圖片必須是可公開訪問的 URL，系統會自動：
- 檢測 base64 格式的圖片
- 自動上傳到 Telegraph 圖床
- 轉換為 LINE 可用的 URL 格式

### 消息格式轉換
為了重用現有的 Telegram 處理邏輯，系統會：
- 將 LINE 事件轉換為 Telegram 消息格式
- 保持指令和功能的一致性
- 確保所有現有功能在 LINE 上正常運作

## 🛠️ 配置範例

### 範例 1：雙平台運行
```bash
# 基本設定
PLATFORM_MODE=both
TELEGRAM_BOT_ENABLE=true
LINE_BOT_ENABLE=true

# Telegram 設定
TELEGRAM_AVAILABLE_TOKENS=123456789:ABCDEFghijklmnopQRSTUVwxyz
TELEGRAM_BOT_NAME=["My Telegram Bot"]

# LINE 設定
LINE_CHANNEL_ACCESS_TOKEN=your_long_line_access_token
LINE_CHANNEL_SECRET=your_line_channel_secret
LINE_BOT_NAME=["My LINE Bot"]

# AI 設定（共用）
OPENAI_API_KEY=["sk-your-openai-key"]
OPENAI_CHAT_MODEL=gpt-4o
```

### 範例 2：僅 LINE Bot
```bash
PLATFORM_MODE=line
TELEGRAM_BOT_ENABLE=false
LINE_BOT_ENABLE=true

LINE_CHANNEL_ACCESS_TOKEN=your_line_token
LINE_CHANNEL_SECRET=your_line_secret
LINE_BOT_NAME=["LINE Only Bot"]
```

### 範例 3：僅 Telegram Bot（原有模式）
```bash
PLATFORM_MODE=telegram
TELEGRAM_BOT_ENABLE=true
LINE_BOT_ENABLE=false

TELEGRAM_AVAILABLE_TOKENS=your_telegram_token
```

## 🔒 安全設定

### Webhook 驗證
- **Telegram**：使用 token 驗證
- **LINE**：使用 Channel Secret 進行 HMAC-SHA256 簽名驗證

### 開關控制
```bash
# 關閉 LINE webhook 簽名驗證（不建議）
LINE_WEBHOOK_VERIFY=false

# 白名單控制（適用於兩個平台）
CHAT_WHITE_LIST=["allowed_user_1","allowed_user_2"]
I_AM_A_GENEROUS_PERSON=false
```

## 🚨 故障排除

### 1. LINE Bot 無回應
**檢查項目：**
- 確認 `LINE_CHANNEL_ACCESS_TOKEN` 設定正確
- 確認 `LINE_CHANNEL_SECRET` 設定正確
- 檢查 LINE Developer Console 中的 webhook URL
- 確認 `LINE_BOT_ENABLE=true`

**解決方法：**
```bash
# 檢查平台狀態
訪問 https://your-domain.com/status

# 暫時關閉簽名驗證進行測試
LINE_WEBHOOK_VERIFY=false
```

### 2. 圖片生成在 LINE 上失敗
**原因：** LINE 要求圖片必須是可公開訪問的 URL

**解決方法：**
- 確保 Telegraph 圖床服務正常
- 檢查網路連線是否正常
- 確認生成的圖片大小符合 LINE 限制

### 3. 雙平台衝突
**檢查：**
```bash
# 確認平台模式
PLATFORM_MODE=both

# 確認兩個平台都正確啟用
TELEGRAM_BOT_ENABLE=true
LINE_BOT_ENABLE=true
```

### 4. Webhook 簽名驗證失敗
```bash
# LINE 簽名問題
LINE_WEBHOOK_VERIFY=true
LINE_CHANNEL_SECRET=正確的_channel_secret

# 檢查 webhook URL 是否正確
https://your-domain.com/line/YOUR_TOKEN/webhook
```

## 📋 技術架構

### 平台抽象層
```
用戶消息 → 平台檢測 → 消息轉換 → 統一處理 → 平台特定回應
    ↓           ↓           ↓           ↓           ↓
 Telegram    Platform    Message    Command      Response
   LINE     Detector    Converter   Handler      Handler
```

### 核心組件

#### 1. 平台檢測 (`detectEnabledPlatforms()`)
- 根據環境變數自動檢測啟用的平台
- 支援 auto、telegram、line、both 模式

#### 2. 消息轉換 (`convertLineToTelegramMessage()`)
- 將 LINE 事件格式轉換為 Telegram 消息格式
- 保持現有處理邏輯的相容性

#### 3. 統一發送層
- `sendMessageWithContext()`: 自動選擇平台發送方式
- `sendPhotoWithContext()`: 處理不同平台的圖片發送需求

#### 4. LINE 專用處理
- 自動 base64 圖片上傳轉換
- Webhook 簽名驗證
- LINE 特有的回應格式處理

## ✅ 支援的指令

所有原有 Telegram 指令都可以在 LINE 上使用：

- `/help` - 取得說明
- `/new` - 開始新對話  
- `/img` - 圖片生成（Telegram 可在上傳圖片時於 caption 使用 `/img 描述`，會把該圖片與 prompt 一併送到 Gemini 2.5）
- `/img2` - 多模型圖片生成
- `/setimg` - 設定圖片模型
- `/stock` - 股票查詢
- `/wt` - 天氣查詢
- `/dictcn` - 中文字典
- `/dicten` - 英文字典
- `/boa` - 解答之書
- `/oracle` - 淺草籤詩
- `/poetry` - 唐詩
- `/qi` - 奇門遁甲
- `/law` - 法律問答
- `/password` - 隨機密碼
- 以及所有其他自定義指令

## 📈 效能最佳化

### 訊息處理效率
- 統一的消息處理流程
- 最小化平台特定代碼
- 智能快取和重用機制

### 記憶體管理
- 延遲載入平台特定模組
- 動態路由註冊避免冗餘
- 智能垃圾回收機制

## 🔄 更新記錄

### v2.0.0 - 多平台支援
- ✅ 新增 LINE Bot 完整支援
- ✅ 平台自動檢測和切換
- ✅ 統一消息處理抽象層
- ✅ 動態路由系統
- ✅ 平台狀態監控頁面
- ✅ 圖片處理跨平台相容性
- ✅ LINE webhook 簽名驗證
- ✅ 完整的配置文件支援

### v1.x - Telegram Bot
- ✅ 基礎 Telegram Bot 功能
- ✅ AI 對話整合
- ✅ 圖片生成功能
- ✅ 指令系統
- ✅ 用戶管理和白名單

### 2025-02 - Caption 模式圖片再生成
- ✅ `/img` 指令支援在 Telegram 上傳圖片時於 caption 一次輸入指令與文字提示
- ✅ 會自動把 caption 內的 prompt 與該張圖片送進 `gemini-2.5-flash-image-preview` 進行再生成
- ✅ 一般 LLM 多模態對話仍維持原本的圖片處理流程不受影響

## 🤝 貢獻指南

### 開發環境建置
1. Fork 這個專案
2. 創建功能分支：`git checkout -b feature/new-platform`
3. 安裝依賴：`npm install`
4. 設定環境變數
5. 本地測試
6. 提交 PR

### 新增平台支援
新增其他聊天平台（如 Discord、Slack）的步驟：

1. **擴展平台檢測**
```javascript
// 在 detectEnabledPlatforms() 中新增
if (env.YOUR_PLATFORM_TOKEN) {
    platforms.push('your-platform');
}
```

2. **實現平台 Context**
```javascript
class YourPlatformContext {
    constructor(chatId, userId, platform = 'your-platform') {
        // 實現平台特定內容
    }
}
```

3. **新增發送方法**
```javascript
async function sendMessageToYourPlatform(message, context, env) {
    // 實現平台特定的發送邏輯
}
```

4. **路由處理**
```javascript
// 在 handleRequest 中新增路由
if (platforms.includes('your-platform')) {
    app.all('/your-platform/:token/*', handleYourPlatform);
}
```

## 📞 支援

### 問題回報
- 在 GitHub Issues 回報 bug
- 提供詳細的錯誤訊息和環境資訊
- 包含相關的設定檔（去除敏感資訊）

### 功能建議
- 使用 GitHub Discussions 討論新功能
- 提供使用案例和需求描述
- 考慮實作的複雜度和相容性

### 文件改善
- 發現文件錯誤請提交 PR
- 新增使用範例和最佳實踐
- 翻譯到其他語言



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
