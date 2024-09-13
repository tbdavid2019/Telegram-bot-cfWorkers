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


接下來會在把  DuckDuckGo search  等常用功能掛上去 



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
