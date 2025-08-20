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
# GPT-Image-1 設定指南

已成功整合最新的 OpenAI GPT-Image-1 圖片生成模型到您的 Telegram Bot 中！

## 新功能特點

- 支援最新的 `gpt-image-1` 模型
- **🔑 獨立 API Key**：圖片生成可使用獨立的 API Key
- 智慧處理 base64 格式的圖片回應
- 自動兼容現有的 DALL-E-2 和 DALL-E-3 模型
- 無縫切換不同的圖片生成模型
- 針對 Telegram Bot 優化的圖片處理

## 如何使用 GPT-Image-1

### 1. 設定圖片生成專用 API Key（推薦）

為了避免與 LLM API Key 衝突，建議設定專用的圖片生成 API Key：

```bash
/setenv OPENAI_IMAGE_API_KEY=sk-proj-your-image-api-key-here
```

### 2. 設定圖片生成 API Base（可選）

如果需要使用不同的 API 端點（注意：只需要填寫基礎 URL，系統會自動加上 `/images/generations`）：

```bash
/setenv OPENAI_IMAGE_API_BASE=https://api.openai.com/v1
```

**重要說明**：
- 只需填寫基礎 URL（如 `https://api.openai.com/v1`）
- 系統會自動加上 `/images/generations` 路徑
- 完整的 API 調用會是：`https://api.openai.com/v1/images/generations`

### 3. 設定模型為 GPT-Image-1

```bash
/setenv DALL_E_MODEL=gpt-image-1
```

或者使用新的專門配置：

```bash
/setenv GPT_IMAGE_MODEL=gpt-image-1
```

### 4. 設定圖片尺寸（可選）

```bash
/setenv GPT_IMAGE_SIZE=1024x1024
```

### 5. 生成圖片

```bash
/img 一隻在月光下的可愛海獺
```

## 配置選項

| 配置項 | 說明 | 預設值 | 示例 |
|--------|------|--------|------|
| `OPENAI_IMAGE_API_KEY` | 圖片生成專用 API Key | 空（使用 OPENAI_API_KEY） | `sk-proj-...` |
| `OPENAI_IMAGE_API_BASE` | 圖片生成專用 API Base | 空（使用 OPENAI_API_BASE） | `https://api.openai.com/v1` |
| `DALL_E_MODEL` | 主要圖片模型 | `dall-e-3` | `gpt-image-1` |
| `GPT_IMAGE_MODEL` | GPT-Image 專用模型 | `gpt-image-1` | `gpt-image-1` |
| `GPT_IMAGE_SIZE` | GPT-Image 圖片尺寸 | `1024x1024` | `1024x1024` |

## 🔑 API Key 優先級邏輯

系統會按以下優先級選擇 API Key：

1. **OPENAI_IMAGE_API_KEY**：如果設定了專用的圖片 API Key
2. **OPENAI_API_KEY**：如果沒有專用 Key，則使用一般的 OpenAI Key

同樣地，API Base 的優先級：

1. **OPENAI_IMAGE_API_BASE**：如果設定了專用的圖片 API Base
2. **OPENAI_API_BASE**：如果沒有專用 Base，則使用一般的 API Base

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

## 技術細節

### API 差異

- **DALL-E**: 回傳圖片 URL，Telegram 直接抓取
- **GPT-Image-1**: 回傳 base64 編碼的圖片數據

### 智慧處理機制

系統會自動檢測回應格式並進行適當處理：

- **URL 格式**: 直接傳遞給 Telegram API
- **Base64 格式**: 自動轉換為 Blob 並作為檔案上傳
- **錯誤恢復**: 處理失敗時的容錯機制
- **記憶體優化**: 有效處理大型圖片數據

### API Key 隔離好處

- **避免衝突**: LLM 和圖片生成使用不同的 API Key
- **配額管理**: 分開管理不同服務的使用配額
- **安全性**: 可以為不同功能設定不同權限的 Key
- **靈活性**: 支援混合使用不同提供商的服務

## 切換回 DALL-E

如果您想切換回 DALL-E 模型：

```bash
/setenv DALL_E_MODEL=dall-e-3
```

## 故障排除

1. **圖片生成失敗**：
   - 檢查 `OPENAI_IMAGE_API_KEY` 或 `OPENAI_API_KEY` 是否有效
   - 確認 API Key 有圖片生成權限

2. **API Key 衝突**：
   - 設定 `OPENAI_IMAGE_API_KEY` 來分離圖片和對話功能
   - 檢查 `OPENAI_IMAGE_API_BASE` 設定

3. **模型不可用**：
   - 確認您的 OpenAI 帳戶有 GPT-Image-1 存取權限
   - 檢查 API Key 是否支援新模型

4. **第三方 LLM 相容性**：
   - 為圖片生成設定真正的 OpenAI API Key
   - 使用 `OPENAI_IMAGE_API_BASE=https://api.openai.com/v1`

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

# Deployment Process

## Video Tutorial

Thanks to [**lipeng0820**](https://www.youtube.com/@lipeng0820) for providing this video tutorial.

## Manual Deployment

### Step 1. Create a Telegram Bot and Obtain a Token

<img style="max-width: 600px;" alt="image" src="https://user-images.githubusercontent.com/9513891/222916992-b393178e-2c41-4a65-a962-96f776f652bd.png">

1. Open Telegram and send the `/start` command to BotFather.
2. Send the `/newbot` command to BotFather and give your bot a name.
3. Give your bot a unique username that ends with `_bot`.
4. BotFather will generate a Token. Copy and save this Token. This Token is the secret key that is bound to your bot. Do not disclose it to others!
5. Later, in the settings of Cloudflare Workers, fill in this Token in the `TELEGRAM_TOKEN` variable.

### Step 2. Register an OpenAI Account and Create an API Key

<img style="max-width: 600px;" alt="image" src="https://user-images.githubusercontent.com/9513891/222917026-dd9bebcb-f4d4-4f8a-a836-5e89d220bbb9.png">

1. Open [OpenAI](https://platform.openai.com) and register an account.
2. Click on the avatar in the upper right corner to enter the personal settings page.
3. Click on API Keys and create a new API Key.
4. Later, in the settings of Cloudflare Workers, fill in this API Key in the `API_KEY` variable.

### Step 3. Deploy Workers

<img style="max-width: 600px;" alt="image" src="https://user-images.githubusercontent.com/9513891/222917036-fe70d0e9-3ddf-4c4a-9651-990bb84e4e92.png">

1. Open [Cloudflare Workers](https://dash.cloudflare.com/?to=/:account/workers) and register an account.
2. Click on `Create a Service` in the upper right corner.
3. Enter the newly created Workers, select `Quick Edit`, copy the [`worker.js`](https://github.com/tbdavid2019/Telegram-bot-Workers/blob/main/work.js) code into the editor, and save.

### Step 4. Configure Environment Variables

<img style="max-width: 600px;" alt="image" src="https://user-images.githubusercontent.com/9513891/222916940-cc4ce79c-f531-4d73-a215-943cb394787a.png">

1. Open [Cloudflare Workers](https://dash.cloudflare.com/?to=/:account/workers), click on your Workers, and click on Setting -> Variables in the upper right corner.
2. `API_KEY`: Set it to your OpenAI API Key.
3. `TELEGRAM_AVAILABLE_TOKENS`: Set it to your Telegram Bot Token.
4. `CHAT_WHITE_LIST`: Set it to the IDs of users who are allowed to access, for example, `123456789,987654321`. If you don't know your ID, use the `/new` command to obtain it in conversation with the bot you created.
5. `I_AM_A_GENEROUS_PERSON`: If you still don't understand how to obtain the ID, you can set this value to `true` to turn off the whitelist function and allow everyone to access.
6. 還有許多變數可以自行設定
<img width="335" alt="image" src="https://github.com/user-attachments/assets/280bff97-df83-4757-815b-ed71a0b277fb">


### Step 5. Bind KV Data
1. Click on `Create a Namespace` at the top right corner of `Home-Workers-KV`, name it whatever you want, but when binding it, set it as `DATABASE`. <br><img style="max-width: 600px;" alt="image" src="https://user-images.githubusercontent.com/9513891/222916810-f31c4900-297b-4a33-8430-7c638e6f9358.png">
2. Open [Cloudflare Workers](https://dash.cloudflare.com/?to=/:account/workers) and click on your Workers.
3. Click on `Setting` at the top right corner and choose `Variables`. <br><img style="max-width: 600px;" alt="image" src="https://user-images.githubusercontent.com/9513891/222916832-697a7bb6-70e2-421d-b88e-899bd24007de.png">
4. Click on `Edit variables` under `KV Namespace Bindings`.
5. Click on `Add variable`.
6. Name it `DATABASE` and choose the KV data you just created.

### Step 6. Initialization
1. Run `https://workers_name.username.workers.dev/init` to automatically bind Telegram webhook and set all commands.
2. 或者點擊這個 <img width="1328" alt="image" src="https://github.com/user-attachments/assets/08d8a2d5-b199-4f22-9be8-61b30bb1ae77">

### Step 7. Start Chatting
<img style="max-width: 600px;" alt="image" src="https://user-images.githubusercontent.com/9513891/222917106-2bbc09ea-f018-489e-a7b9-317461348341.png">

1. Start a new conversation by using the `/new` command. The chat context will be sent to ChatGPT every time.
2. Modify user settings with the `/setenv KEY=VALUE` command, for example, `SETENV SYSTEM_INIT_MESSAGE=Starting now is Meow, and each sentence ends with Meow`.
3. Since all historical records are carried with each conversation, it is easy to reach the 4096 token limit, so clear the history by using the `/new` command when necessary.
