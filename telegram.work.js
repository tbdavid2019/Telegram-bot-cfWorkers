// 要準備好這幾個 API KEY  分別去這幾個網站註冊free
// https://etlas.io  netlasapiKey DNS查詢
// https://ipinfo.io  infoapiKey IP查詢
// https://opendata.cwa.gov.tw   cwaapiKey臺灣天氣查詢 
// https://financialmodelingprep.com/   FMPapiKey 國際股市查詢

// src/config/env.js
var UserConfig = class {
  // -- 非配置屬性 --
  DEFINE_KEYS = [];

  // -- 通用配置 --
  //
  // AI提供商: auto, openai, azure, workers, gemini, mistral
  AI_PROVIDER = "auto";
  // AI圖片提供商: auto, openai, azure, workers
  AI_IMAGE_PROVIDER = "auto";
  // 全局默認初始化消息
  SYSTEM_INIT_MESSAGE = null;
  // 全局默認初始化消息角色
  SYSTEM_INIT_MESSAGE_ROLE = "system";
  // -- Open AI 配置 --
  //
  // OpenAI API Key
  OPENAI_API_KEY = [];
  // OpenAI的模型名稱
  OPENAI_CHAT_MODEL = "gpt-4o";
  // OpenAI API BASE ``
  OPENAI_API_BASE = "https://api.openai.com/v1";
  // OpenAI API Extra Params
  OPENAI_API_EXTRA_PARAMS = {};
   // -- DALLE 配置 --
  // DALL-E的模型名称
  DALL_E_MODEL = "dall-e-3";
  // DALL-E图片尺寸
  DALL_E_IMAGE_SIZE = "1024x1024";
  // DALL-E图片质量
  DALL_E_IMAGE_QUALITY = "standard";
  // DALL-E图片风格
  DALL_E_IMAGE_STYLE = "vivid";
  // GPT-Image-1 的配置
  GPT_IMAGE_MODEL = "gpt-image-1";
  // GPT-Image-1 图片尺寸
  GPT_IMAGE_SIZE = "1024x1024";
  // -- 圖片生成專用配置 --
  // 圖片生成專用 API Key (如果為空則使用 OPENAI_API_KEY)
  OPENAI_IMAGE_API_KEY = [];
  // 圖片生成 API BASE (如果為空則使用 OPENAI_API_BASE)
  OPENAI_IMAGE_API_BASE = "";
  // -- Gemini 圖片生成配置 --
  // Gemini 圖片生成模型
  GEMINI_IMAGE_MODEL = "gemini-2.5-flash-image-preview";
  // Gemini 圖片生成 API Key (Google 原生 API Key)
  GEMINI_IMAGE_API_KEY = [];
  // Gemini 圖片生成 API BASE (不再需要，直接使用 Google API)
  GEMINI_IMAGE_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
  // -- AZURE 配置 --
  //
  // Azure API Key
  AZURE_API_KEY = null;
  // Azure Completions API
  // https://RESOURCE_NAME.openai.azure.com/openai/deployments/MODEL_NAME/chat/completions?api-version=VERSION_NAME
  AZURE_COMPLETIONS_API = null;
  // Azure DallE API
  // https://RESOURCE_NAME.openai.azure.com/openai/deployments/MODEL_NAME/images/generations?api-version=VERSION_NAME
  AZURE_DALLE_API = null;
  // -- Workers 配置 --
  //
  // Cloudflare Account ID
  CLOUDFLARE_ACCOUNT_ID = null;
  // Cloudflare Token
  CLOUDFLARE_TOKEN = null;
  // Text Generation Model
  WORKERS_CHAT_MODEL = "@cf/mistral/mistral-7b-instruct-v0.1 ";
  // Text-to-Image Model
  WORKERS_IMAGE_MODEL = "@cf/stabilityai/stable-diffusion-xl-base-1.0";
  // -- Gemini 配置 --
  //
  // Google Gemini API Key
  GOOGLE_API_KEY = null;
  // Google Gemini API
  GOOGLE_COMPLETIONS_API = "https://generativelanguage.googleapis.com/v1beta/models/";
  // Google Gemini Model
  GOOGLE_COMPLETIONS_MODEL = "gemini-2.5-flash";
  // -- Mistral 配置 --
  //
  // mistral api key
  MISTRAL_API_KEY = null;
  // mistral api base
  MISTRAL_API_BASE = "https://api.mistral.ai/v1";
  // mistral api model
  MISTRAL_CHAT_MODEL = "mistral-tiny";
  // -- Cohere 配置 --
  //
  // cohere api key
  COHERE_API_KEY = null;
  // cohere api base
  COHERE_API_BASE = "https://api.cohere.com/v1";
  // cohere api model
  COHERE_CHAT_MODEL = "command-r-plus";
  // -- Anthropic 配置 --
  //
  // Anthropic api key
  ANTHROPIC_API_KEY = null;
  // Anthropic api base
  ANTHROPIC_API_BASE = "https://api.anthropic.com/v1";
  // Anthropic api model
  ANTHROPIC_CHAT_MODEL = "claude-3-haiku-20240307";
};
var Environment = class {
  // -- 版本数据 --
  //
  // 当前版本
  BUILD_TIMESTAMP = 1723602033;
  // 当前版本 commit id
  BUILD_VERSION = "bf2448f";
  // -- 基础配置 --
  /**
   * @type {I18n | null}
   */
  I18N = null;
  // 多语言支持
  LANGUAGE = "zh-TW";
  // 检查更新的分支
  UPDATE_BRANCH = "master";
  // Chat Complete API Timeout
  CHAT_COMPLETE_API_TIMEOUT = 0;
  // -- Telegram 相关 --
  //
  // Telegram API Domain
  TELEGRAM_API_DOMAIN = "https://api.telegram.org";
  // 允许访问的Telegram Token， 设置时以逗号分隔
  TELEGRAM_AVAILABLE_TOKENS = [];
  // 默认消息模式
  DEFAULT_PARSE_MODE = "Markdown";
  // 最小stream模式消息间隔，小于等于0则不限制
  TELEGRAM_MIN_STREAM_INTERVAL = 0;
  // 图片尺寸偏移 0为第一位，-1为最后一位, 越靠后的图片越大。PS: 图片过大可能导致token消耗过多，或者workers超时或内存不足
  // 默认选择次低质量的图片
  TELEGRAM_PHOTO_SIZE_OFFSET = 1;
  // 向LLM优先传递图片方式：url, base64
  TELEGRAM_IMAGE_TRANSFER_MODE = "url";
  // --  权限相关 --
  //
  // 允许所有人使用
  I_AM_A_GENEROUS_PERSON = false;
  // 白名单
  CHAT_WHITE_LIST = [];
  // 用户配置
  LOCK_USER_CONFIG_KEYS = [
    // 默认为API BASE 防止被替换导致token 泄露
    "OPENAI_API_BASE",
    "GOOGLE_COMPLETIONS_API",
    "MISTRAL_API_BASE",
    "COHERE_API_BASE",
    "ANTHROPIC_API_BASE",
    "AZURE_COMPLETIONS_API",
    "AZURE_DALLE_API"
  ];
  // -- 群组相关 --
  //
  // 允许访问的Telegram Token 对应的Bot Name， 设置时以逗号分隔
  TELEGRAM_BOT_NAME = [];
  // 群组白名单
  CHAT_GROUP_WHITE_LIST = [];
  // 群组机器人开关
  GROUP_CHAT_BOT_ENABLE = true;
  // 群组机器人共享模式,关闭后，一个群组只有一个会话和配置。开启的话群组的每个人都有自己的会话上下文
  GROUP_CHAT_BOT_SHARE_MODE = true;
  // -- 历史记录相关 --
  //
  // 为了避免4096字符限制，将消息删减
  AUTO_TRIM_HISTORY = true;
  // 最大历史记录长度
  MAX_HISTORY_LENGTH = 20;
  // 最大消息长度
  MAX_TOKEN_LENGTH = -1;
  // -- 特性开关 --
  //
  // 隐藏部分命令按钮
  HIDE_COMMAND_BUTTONS = [];
  // 显示快捷回复按钮
  SHOW_REPLY_BUTTON = false;
  // 而外引用消息开关
  EXTRA_MESSAGE_CONTEXT = false;
  // 开启Telegraph图床
  TELEGRAPH_ENABLE = false;
  // -- 模式开关 --
  //
  // 使用流模式
  STREAM_MODE = true;
  // 安全模式 (暫時禁用以便測試)
  SAFE_MODE = false;
  // 调试模式
  DEBUG_MODE = false;
  // 开发模式
  DEV_MODE = false;
  USER_CONFIG = new UserConfig();
};
var ENV = new Environment();
var DATABASE = null;
var API_GUARD = null;
var CUSTOM_COMMAND = {};
var CUSTOM_COMMAND_DESCRIPTION = {};
var CONST = {
  PASSWORD_KEY: "chat_history_password",
  GROUP_TYPES: ["group", "supergroup"]
};
var ENV_TYPES = {
  SYSTEM_INIT_MESSAGE: "string",
  AZURE_API_KEY: "string",
  AZURE_COMPLETIONS_API: "string",
  AZURE_DALLE_API: "string",
  CLOUDFLARE_ACCOUNT_ID: "string",
  CLOUDFLARE_TOKEN: "string",
  GOOGLE_API_KEY: "string",
  MISTRAL_API_KEY: "string",
  COHERE_API_KEY: "string",
  ANTHROPIC_API_KEY: "string",
  GPT_IMAGE_MODEL: "string",
  GPT_IMAGE_SIZE: "string",
  OPENAI_IMAGE_API_KEY: "array",
  OPENAI_IMAGE_API_BASE: "string",
  GEMINI_IMAGE_MODEL: "string",
  GEMINI_IMAGE_API_KEY: "array",
  GEMINI_IMAGE_API_BASE: "string"
};
var ENV_KEY_MAPPER = {
  CHAT_MODEL: "OPENAI_CHAT_MODEL",
  API_KEY: "OPENAI_API_KEY",
  WORKERS_AI_MODEL: "WORKERS_CHAT_MODEL"
};
function parseArray(raw) {
  if (raw.startsWith("[") && raw.endsWith("]")) {
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.error(e);
    }
  }
  return raw.split(",");
}
function mergeEnvironment(target, source) {
  const sourceKeys = new Set(Object.keys(source));
  for (const key of Object.keys(target)) {
    if (!sourceKeys.has(key)) {
      continue;
    }
    const t = ENV_TYPES[key] || typeof target[key];
    if (typeof source[key] !== "string") {
      target[key] = source[key];
      continue;
    }
    switch (t) {
      case "number":
        target[key] = parseInt(source[key], 10);
        break;
      case "boolean":
        target[key] = (source[key] || "false") === "true";
        break;
      case "string":
        target[key] = source[key];
        break;
      case "array":
        target[key] = parseArray(source[key]);
        break;
      case "object":
        if (Array.isArray(target[key])) {
          target[key] = parseArray(source[key]);
        } else {
          try {
            target[key] = JSON.parse(source[key]);
          } catch (e) {
            console.error(e);
          }
        }
        break;
      default:
        target[key] = source[key];
        break;
    }
  }
}
function initEnv(env, i18n2) {
  DATABASE = env.DATABASE;
  API_GUARD = env.API_GUARD;
  const customCommandPrefix = "CUSTOM_COMMAND_";
  const customCommandDescriptionPrefix = "COMMAND_DESCRIPTION_";
  for (const key of Object.keys(env)) {
    if (key.startsWith(customCommandPrefix)) {
      const cmd = key.substring(customCommandPrefix.length);
      CUSTOM_COMMAND["/" + cmd] = env[key];
      CUSTOM_COMMAND_DESCRIPTION["/" + cmd] = env[customCommandDescriptionPrefix + cmd];
    }
  }
  mergeEnvironment(ENV, env);
  mergeEnvironment(ENV.USER_CONFIG, env);
  ENV.USER_CONFIG.DEFINE_KEYS = [];
  {
    ENV.I18N = i18n2((ENV.LANGUAGE || "cn").toLowerCase());
    if (env.TELEGRAM_TOKEN && !ENV.TELEGRAM_AVAILABLE_TOKENS.includes(env.TELEGRAM_TOKEN)) {
      if (env.BOT_NAME && ENV.TELEGRAM_AVAILABLE_TOKENS.length === ENV.TELEGRAM_BOT_NAME.length) {
        ENV.TELEGRAM_BOT_NAME.push(env.BOT_NAME);
      }
      ENV.TELEGRAM_AVAILABLE_TOKENS.push(env.TELEGRAM_TOKEN);
    }
    if (env.OPENAI_API_DOMAIN && !ENV.OPENAI_API_BASE) {
      ENV.USER_CONFIG.OPENAI_API_BASE = `${env.OPENAI_API_DOMAIN}/v1`;
    }
    if (env.WORKERS_AI_MODEL && !ENV.USER_CONFIG.WORKERS_CHAT_MODEL) {
      ENV.USER_CONFIG.WORKERS_CHAT_MODEL = env.WORKERS_AI_MODEL;
    }
    if (env.API_KEY && ENV.USER_CONFIG.OPENAI_API_KEY.length === 0) {
      ENV.USER_CONFIG.OPENAI_API_KEY = env.API_KEY.split(",");
    }
    if (env.CHAT_MODEL && !ENV.USER_CONFIG.OPENAI_CHAT_MODEL) {
      ENV.USER_CONFIG.OPENAI_CHAT_MODEL = env.CHAT_MODEL;
    }
    if (!ENV.USER_CONFIG.SYSTEM_INIT_MESSAGE) {
      ENV.USER_CONFIG.SYSTEM_INIT_MESSAGE = ENV.I18N?.env?.system_init_message || "You are a helpful assistant";
    }
  }
}

// src/config/context.js
function trimUserConfig(userConfig) {
  const config = {
    ...userConfig
  };
  const keysSet = new Set(userConfig.DEFINE_KEYS);
  for (const key of ENV.LOCK_USER_CONFIG_KEYS) {
    keysSet.delete(key);
  }
  keysSet.add("DEFINE_KEYS");
  for (const key of Object.keys(config)) {
    if (!keysSet.has(key)) {
      delete config[key];
    }
  }
  return config;
}
var ShareContext = class {
  currentBotId = null;
  currentBotToken = null;
  currentBotName = null;
  chatHistoryKey = null;
  chatLastMessageIdKey = null;
  configStoreKey = null;
  groupAdminKey = null;
  usageKey = null;
  chatType = null;
  chatId = null;
  speakerId = null;
  extraMessageContext = null;
};
var CurrentChatContext = class {
  chat_id = null;
  reply_to_message_id = null;
  parse_mode = ENV.DEFAULT_PARSE_MODE;
  message_id = null;
  reply_markup = null;
  allow_sending_without_reply = null;
  disable_web_page_preview = null;
};
var Context = class {
  // 用户配置
  USER_CONFIG = new UserConfig();
  CURRENT_CHAT_CONTEXT = new CurrentChatContext();
  SHARE_CONTEXT = new ShareContext();
  /**
   * @inner
   * @param {string | number} chatId
   * @param {string | number} replyToMessageId
   */
  _initChatContext(chatId, replyToMessageId) {
    this.CURRENT_CHAT_CONTEXT.chat_id = chatId;
    this.CURRENT_CHAT_CONTEXT.reply_to_message_id = replyToMessageId;
    if (replyToMessageId) {
      this.CURRENT_CHAT_CONTEXT.allow_sending_without_reply = true;
    }
  }
  //
  /**
   * 初始化用户配置
   * @inner
   * @param {string | null} storeKey
   */
  async _initUserConfig(storeKey) {
    try {
      this.USER_CONFIG = {
        ...ENV.USER_CONFIG
      };
      const userConfig = JSON.parse(await DATABASE.get(storeKey));
      mergeEnvironment(this.USER_CONFIG, trimUserConfig(userConfig));
    } catch (e) {
      console.error(e);
    }
  }
  /**
   * @param {string} token
   */
  initTelegramContext(token) {
    const telegramIndex = ENV.TELEGRAM_AVAILABLE_TOKENS.indexOf(token);
    if (telegramIndex === -1) {
      throw new Error("Token not allowed");
    }
    this.SHARE_CONTEXT.currentBotToken = token;
    this.SHARE_CONTEXT.currentBotId = token.split(":")[0];
    if (ENV.TELEGRAM_BOT_NAME.length > telegramIndex) {
      this.SHARE_CONTEXT.currentBotName = ENV.TELEGRAM_BOT_NAME[telegramIndex];
    }
  }
  /**
   *
   * @inner
   * @param {TelegramMessage} message
   */
  async _initShareContext(message) {
    this.SHARE_CONTEXT.usageKey = `usage:${this.SHARE_CONTEXT.currentBotId}`;
    const id = message?.chat?.id;
    if (id === void 0 || id === null) {
      throw new Error("Chat id not found");
    }
    const botId = this.SHARE_CONTEXT.currentBotId;
    let historyKey = `history:${id}`;
    let configStoreKey = `user_config:${id}`;
    let groupAdminKey = null;
    if (botId) {
      historyKey += `:${botId}`;
      configStoreKey += `:${botId}`;
    }
    if (CONST.GROUP_TYPES.includes(message.chat?.type)) {
      if (!ENV.GROUP_CHAT_BOT_SHARE_MODE && message.from.id) {
        historyKey += `:${message.from.id}`;
        configStoreKey += `:${message.from.id}`;
      }
      groupAdminKey = `group_admin:${id}`;
    }
    if (message?.chat?.is_forum && message?.is_topic_message) {
      if (message?.message_thread_id) {
        historyKey += `:${message.message_thread_id}`;
        configStoreKey += `:${message.message_thread_id}`;
      }
    }
    this.SHARE_CONTEXT.chatHistoryKey = historyKey;
    this.SHARE_CONTEXT.chatLastMessageIdKey = `last_message_id:${historyKey}`;
    this.SHARE_CONTEXT.configStoreKey = configStoreKey;
    this.SHARE_CONTEXT.groupAdminKey = groupAdminKey;
    this.SHARE_CONTEXT.chatType = message.chat?.type;
    this.SHARE_CONTEXT.chatId = message.chat.id;
    this.SHARE_CONTEXT.speakerId = message.from.id || message.chat.id;
  }
  /**
   * @param {TelegramMessage} message
   * @returns {Promise<void>}
   */
  async initContext(message) {
    const chatId = message?.chat?.id;
    const replyId = CONST.GROUP_TYPES.includes(message.chat?.type) ? message.message_id : null;
    this._initChatContext(chatId, replyId);
    await this._initShareContext(message);
    await this._initUserConfig(this.SHARE_CONTEXT.configStoreKey);
  }
};

// src/utils/md2tgmd.js
var escapeChars = /([\_\*\[\]\(\)\\\~\`\>\#\+\-\=\|\{\}\.\!])/g;
function escape(text) {
  const lines = text.split("\n");
  const stack = [];
  const result = [];
  let linetrim = "";
  for (const [i, line] of lines.entries()) {
    linetrim = line.trim();
    let startIndex;
    if (/^```.+/.test(linetrim)) {
      stack.push(i);
    } else if (linetrim === "```") {
      if (stack.length) {
        startIndex = stack.pop();
        if (!stack.length) {
          const content = lines.slice(startIndex, i + 1).join("\n");
          result.push(handleEscape(content, "code"));
          continue;
        }
      } else {
        stack.push(i);
      }
    }
    if (!stack.length) {
      result.push(handleEscape(line));
    }
  }
  if (stack.length) {
    const last = lines.slice(stack[0]).join("\n") + "\n```";
    result.push(handleEscape(last, "code"));
  }
  return result.join("\n");
}
function handleEscape(text, type = "text") {
  if (!text.trim()) {
    return text;
  }
  if (type === "text") {
    text = text.replace(escapeChars, "\\$1").replace(/\\\*\\\*(.*?[^\\])\\\*\\\*/g, "*$1*").replace(/\\_\\_(.*?[^\\])\\_\\_/g, "__$1__").replace(/\\_(.*?[^\\])\\_/g, "_$1_").replace(/\\~(.*?[^\\])\\~/g, "~$1~").replace(/\\\|\\\|(.*?[^\\])\\\|\\\|/g, "||$1||").replace(/\\\[([^\]]+?)\\\]\\\((.+?)\\\)/g, "[$1]($2)").replace(/\\\`(.*?[^\\])\\\`/g, "`$1`").replace(/\\\\\\([\_\*\[\]\(\)\\\~\`\>\#\+\-\=\|\{\}\.\!])/g, "\\$1").replace(/^(\s*)\\(>.+\s*)$/gm, "$1$2").replace(/^(\s*)\\-\s*(.+)$/gm, "$1\u2022 $2").replace(/^((\\#){1,3}\s)(.+)/gm, "$1*$3*");
  } else {
    const codeBlank = text.length - text.trimStart().length;
    if (codeBlank > 0) {
      const blankReg = new RegExp(`^\\s{${codeBlank}}`, "gm");
      text = text.replace(blankReg, "");
    }
    text = text.trimEnd().replace(/([\\\`])/g, "\\$1").replace(/^\\`\\`\\`([\s\S]+)\\`\\`\\`$/g, "```$1```");
  }
  return text;
}

// src/telegram/telegram.js
async function sendMessage(message, token, context) {
  const body = {
    text: message
  };
  for (const key of Object.keys(context)) {
    if (context[key] !== void 0 && context[key] !== null) {
      body[key] = context[key];
    }
  }
  let method = "sendMessage";
  if (context?.message_id) {
    method = "editMessageText";
  }
  return await fetch(
    `${ENV.TELEGRAM_API_DOMAIN}/bot${token}/${method}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    }
  );
}
async function sendMessageToTelegram(message, token, context) {
  const chatContext = context;
  const originMessage = message;
  const limit = 4096;
  if (chatContext.parse_mode === "MarkdownV2") {
    message = escape(message);
  }
  if (message.length <= limit) {
    const resp = await sendMessage(message, token, chatContext);
    if (resp.status === 200) {
      return resp;
    } else {
      message = originMessage;
      chatContext.parse_mode = null;
      return await sendMessage(message, token, chatContext);
    }
  }
  message = originMessage;
  chatContext.parse_mode = null;
  let lastMessageResponse = null;
  for (let i = 0; i < message.length; i += limit) {
    const msg = message.slice(i, Math.min(i + limit, message.length));
    if (i > 0) {
      chatContext.message_id = null;
    }
    lastMessageResponse = await sendMessage(msg, token, chatContext);
  }
  return lastMessageResponse;
}
function sendMessageToTelegramWithContext(context) {
  return async (message) => {
    return sendMessageToTelegram(message, context.SHARE_CONTEXT.currentBotToken, context.CURRENT_CHAT_CONTEXT);
  };
}
function deleteMessageFromTelegramWithContext(context) {
  return async (messageId) => {
    return await fetch(
      `${ENV.TELEGRAM_API_DOMAIN}/bot${context.SHARE_CONTEXT.currentBotToken}/deleteMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          chat_id: context.CURRENT_CHAT_CONTEXT.chat_id,
          message_id: messageId
        })
      }
    );
  };
}
async function sendPhotoToTelegram(photo, token, context) {
  const url = `${ENV.TELEGRAM_API_DOMAIN}/bot${token}/sendPhoto`;
  let body;
  const headers = {};
  
  // 處理 base64 data URL
  if (typeof photo === "string" && photo.startsWith("data:image/")) {
    try {
      // 提取 base64 數據
      const [header, base64Data] = photo.split(',');
      const mimeType = header.match(/data:([^;]+)/)?.[1] || 'image/png';
      
      // 將 base64 轉換為 Uint8Array
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // 創建 Blob
      const blob = new Blob([bytes], { type: mimeType });
      
      // 使用 FormData 發送
      body = new FormData();
      body.append("photo", blob, "generated_image.png");
      for (const key of Object.keys(context)) {
        if (context[key] !== void 0 && context[key] !== null) {
          body.append(key, `${context[key]}`);
        }
      }
    } catch (e) {
      console.error("Error processing base64 image:", e);
      // 如果處理失敗，嘗試直接發送原始字符串
      body = {
        photo
      };
      for (const key of Object.keys(context)) {
        if (context[key] !== void 0 && context[key] !== null) {
          body[key] = context[key];
        }
      }
      body = JSON.stringify(body);
      headers["Content-Type"] = "application/json";
    }
  } else if (typeof photo === "string") {
    // 處理普通 URL
    body = {
      photo
    };
    for (const key of Object.keys(context)) {
      if (context[key] !== void 0 && context[key] !== null) {
        body[key] = context[key];
      }
    }
    body = JSON.stringify(body);
    headers["Content-Type"] = "application/json";
  } else {
    // 處理 Blob 或其他類型
    body = new FormData();
    body.append("photo", photo, "photo.png");
    for (const key of Object.keys(context)) {
      if (context[key] !== void 0 && context[key] !== null) {
        body.append(key, `${context[key]}`);
      }
    }
  }
  
  return await fetch(
    url,
    {
      method: "POST",
      headers,
      body
    }
  );
}
function sendPhotoToTelegramWithContext(context) {
  return (url) => {
    return sendPhotoToTelegram(url, context.SHARE_CONTEXT.currentBotToken, context.CURRENT_CHAT_CONTEXT);
  };
}
async function sendChatActionToTelegram(action, token, chatId) {
  return await fetch(
    `${ENV.TELEGRAM_API_DOMAIN}/bot${token}/sendChatAction`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        chat_id: chatId,
        action
      })
    }
  ).then((res) => res.json());
}
function sendChatActionToTelegramWithContext(context) {
  return (action) => {
    return sendChatActionToTelegram(action, context.SHARE_CONTEXT.currentBotToken, context.CURRENT_CHAT_CONTEXT.chat_id);
  };
}
async function bindTelegramWebHook(token, url) {
  return await fetch(
    `${ENV.TELEGRAM_API_DOMAIN}/bot${token}/setWebhook`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        url
      })
    }
  ).then((res) => res.json());
}
async function getChatRole(id, groupAdminKey, chatId, token) {
  let groupAdmin;
  try {
    groupAdmin = JSON.parse(await DATABASE.get(groupAdminKey));
  } catch (e) {
    console.error(e);
    return e.message;
  }
  if (!groupAdmin || !Array.isArray(groupAdmin) || groupAdmin.length === 0) {
    const administers = await getChatAdminister(chatId, token);
    if (administers == null) {
      return null;
    }
    groupAdmin = administers;
    await DATABASE.put(
      groupAdminKey,
      JSON.stringify(groupAdmin),
      { expiration: Date.now() / 1e3 + 120 }
    );
  }
  for (let i = 0; i < groupAdmin.length; i++) {
    const user = groupAdmin[i];
    if (user.user.id === id) {
      return user.status;
    }
  }
  return "member";
}
function getChatRoleWithContext(context) {
  return (id) => {
    return getChatRole(id, context.SHARE_CONTEXT.groupAdminKey, context.CURRENT_CHAT_CONTEXT.chat_id, context.SHARE_CONTEXT.currentBotToken);
  };
}
async function getChatAdminister(chatId, token) {
  try {
    const resp = await fetch(
      `${ENV.TELEGRAM_API_DOMAIN}/bot${token}/getChatAdministrators`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ chat_id: chatId })
      }
    ).then((res) => res.json());
    if (resp.ok) {
      return resp.result;
    }
  } catch (e) {
    console.error(e);
    return null;
  }
}
async function getBot(token) {
  const resp = await fetch(
    `${ENV.TELEGRAM_API_DOMAIN}/bot${token}/getMe`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      }
    }
  ).then((res) => res.json());
  if (resp.ok) {
    return {
      ok: true,
      info: {
        name: resp.result.first_name,
        bot_name: resp.result.username,
        can_join_groups: resp.result.can_join_groups,
        can_read_all_group_messages: resp.result.can_read_all_group_messages
      }
    };
  } else {
    return resp;
  }
}
async function getFileLink(fileId, token) {
  const resp = await fetch(
    `${ENV.TELEGRAM_API_DOMAIN}/bot${token}/getFile`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ file_id: fileId })
    }
  ).then((res) => res.json());
  if (resp.ok && resp.result.file_path) {
    return `https://api.telegram.org/file/bot${token}/${resp.result.file_path}`;
  }
  return "";
}

// src/agent/stream.js
var Stream = class {
  constructor(response, controller, decoder = null, parser = null) {
    this.response = response;
    this.controller = controller;
    this.decoder = decoder || new SSEDecoder();
    this.parser = parser || openaiSseJsonParser;
  }
  async *iterMessages() {
    if (!this.response.body) {
      this.controller.abort();
      throw new Error("Attempted to iterate over a response with no body");
    }
    const lineDecoder = new LineDecoder();
    const iter = this.response.body;
    for await (const chunk of iter) {
      for (const line of lineDecoder.decode(chunk)) {
        const sse = this.decoder.decode(line);
        if (sse) {
          yield sse;
        }
      }
    }
    for (const line of lineDecoder.flush()) {
      const sse = this.decoder.decode(line);
      if (sse) {
        yield sse;
      }
    }
  }
  async *[Symbol.asyncIterator]() {
    let done = false;
    try {
      for await (const sse of this.iterMessages()) {
        if (done) {
          continue;
        }
        if (!sse) {
          continue;
        }
        const { finish, data } = this.parser(sse);
        if (finish) {
          done = finish;
          continue;
        }
        if (data) {
          yield data;
        }
      }
      done = true;
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        return;
      }
      throw e;
    } finally {
      if (!done) {
        this.controller.abort();
      }
    }
  }
};
var SSEDecoder = class {
  constructor() {
    this.event = null;
    this.data = [];
    this.chunks = [];
  }
  decode(line) {
    if (line.endsWith("\r")) {
      line = line.substring(0, line.length - 1);
    }
    if (!line) {
      if (!this.event && !this.data.length) {
        return null;
      }
      const sse = {
        event: this.event,
        data: this.data.join("\n")
      };
      this.event = null;
      this.data = [];
      this.chunks = [];
      return sse;
    }
    this.chunks.push(line);
    if (line.startsWith(":")) {
      return null;
    }
    let [fieldName, _, value] = this.partition(line, ":");
    if (value.startsWith(" ")) {
      value = value.substring(1);
    }
    if (fieldName === "event") {
      this.event = value;
    } else if (fieldName === "data") {
      this.data.push(value);
    }
    return null;
  }
  partition(str, delimiter) {
    const index = str.indexOf(delimiter);
    if (index !== -1) {
      return [str.substring(0, index), delimiter, str.substring(index + delimiter.length)];
    }
    return [str, "", ""];
  }
};
function openaiSseJsonParser(sse) {
  if (sse.data.startsWith("[DONE]")) {
    return { finish: true };
  }
  if (sse.event === null) {
    try {
      return { data: JSON.parse(sse.data) };
    } catch (e) {
      console.error(e, sse);
    }
  }
  return {};
}
function cohereSseJsonParser(sse) {
  switch (sse.event) {
    case "text-generation":
      try {
        return { data: JSON.parse(sse.data) };
      } catch (e) {
        console.error(e, sse.data);
        return {};
      }
    case "stream-start":
      return {};
    case "stream-end":
      return { finish: true };
    default:
      return {};
  }
}
function anthropicSseJsonParser(sse) {
  switch (sse.event) {
    case "content_block_delta":
      try {
        return { data: JSON.parse(sse.data) };
      } catch (e) {
        console.error(e, sse.data);
        return {};
      }
    case "message_start":
    case "content_block_start":
    case "content_block_stop":
      return {};
    case "message_stop":
      return { finish: true };
    default:
      return {};
  }
}
var LineDecoder = class _LineDecoder {
  constructor() {
    this.buffer = [];
    this.trailingCR = false;
  }
  decode(chunk) {
    let text = this.decodeText(chunk);
    if (this.trailingCR) {
      text = "\r" + text;
      this.trailingCR = false;
    }
    if (text.endsWith("\r")) {
      this.trailingCR = true;
      text = text.slice(0, -1);
    }
    if (!text) {
      return [];
    }
    const trailingNewline = _LineDecoder.NEWLINE_CHARS.has(text[text.length - 1] || "");
    let lines = text.split(_LineDecoder.NEWLINE_REGEXP);
    if (lines.length === 1 && !trailingNewline) {
      this.buffer.push(lines[0]);
      return [];
    }
    if (this.buffer.length > 0) {
      lines = [this.buffer.join("") + lines[0], ...lines.slice(1)];
      this.buffer = [];
    }
    if (!trailingNewline) {
      this.buffer = [lines.pop() || ""];
    }
    return lines;
  }
  decodeText(bytes) {
    var _a;
    if (bytes == null) {
      return "";
    }
    if (typeof bytes === "string") {
      return bytes;
    }
    if (typeof Buffer !== "undefined") {
      if (bytes instanceof Buffer) {
        return bytes.toString();
      }
      if (bytes instanceof Uint8Array) {
        return Buffer.from(bytes).toString();
      }
      throw new Error(`Unexpected: received non-Uint8Array (${bytes.constructor.name}) stream chunk in an environment with a global "Buffer" defined, which this library assumes to be Node. Please report this error.`);
    }
    if (typeof TextDecoder !== "undefined") {
      if (bytes instanceof Uint8Array || bytes instanceof ArrayBuffer) {
        (_a = this.textDecoder) !== null && _a !== void 0 ? _a : this.textDecoder = new TextDecoder("utf8");
        return this.textDecoder.decode(bytes, { stream: true });
      }
      throw new Error(`Unexpected: received non-Uint8Array/ArrayBuffer (${bytes.constructor.name}) in a web platform. Please report this error.`);
    }
    throw new Error("Unexpected: neither Buffer nor TextDecoder are available as globals. Please report this error.");
  }
  flush() {
    if (!this.buffer.length && !this.trailingCR) {
      return [];
    }
    const lines = [this.buffer.join("")];
    this.buffer = [];
    this.trailingCR = false;
    return lines;
  }
};
LineDecoder.NEWLINE_CHARS = /* @__PURE__ */ new Set(["\n", "\r"]);
LineDecoder.NEWLINE_REGEXP = /\r\n|[\n\r]/g;

// src/agent/request.js
function fixOpenAICompatibleOptions(options) {
  options = options || {};
  options.streamBuilder = options.streamBuilder || function(r, c) {
    return new Stream(r, c);
  };
  options.contentExtractor = options.contentExtractor || function(d) {
    return d?.choices?.[0]?.delta?.content;
  };
  options.fullContentExtractor = options.fullContentExtractor || function(d) {
    return d.choices?.[0]?.message.content;
  };
  options.errorExtractor = options.errorExtractor || function(d) {
    return d.error?.message;
  };
  return options;
}
function isJsonResponse(resp) {
  return resp.headers.get("content-type").indexOf("json") !== -1;
}
function isEventStreamResponse(resp) {
  const types = ["application/stream+json", "text/event-stream"];
  const content = resp.headers.get("content-type");
  for (const type of types) {
    if (content.indexOf(type) !== -1) {
      return true;
    }
  }
  return false;
}
async function requestChatCompletions(url, header, body, context, onStream, onResult = null, options = null) {
  const controller = new AbortController();
  const { signal } = controller;
  let timeoutID = null;
  let lastUpdateTime = Date.now();
  if (ENV.CHAT_COMPLETE_API_TIMEOUT > 0) {
    timeoutID = setTimeout(() => controller.abort(), ENV.CHAT_COMPLETE_API_TIMEOUT);
  }
  const resp = await fetch(url, {
    method: "POST",
    headers: header,
    body: JSON.stringify(body),
    signal
  });
  if (timeoutID) {
    clearTimeout(timeoutID);
  }
  options = fixOpenAICompatibleOptions(options);
  if (onStream && resp.ok && isEventStreamResponse(resp)) {
    const stream = options.streamBuilder(resp, controller);
    let contentFull = "";
    let lengthDelta = 0;
    let updateStep = 50;
    try {
      for await (const data of stream) {
        const c = options.contentExtractor(data) || "";
        if (c === "") {
          continue;
        }
        lengthDelta += c.length;
        contentFull = contentFull + c;
        if (lengthDelta > updateStep) {
          if (ENV.TELEGRAM_MIN_STREAM_INTERVAL > 0) {
            const delta = Date.now() - lastUpdateTime;
            if (delta < ENV.TELEGRAM_MIN_STREAM_INTERVAL) {
              continue;
            }
            lastUpdateTime = Date.now();
          }
          lengthDelta = 0;
          updateStep += 20;
          await onStream(`${contentFull}
...`);
        }
      }
    } catch (e) {
      contentFull += `
ERROR: ${e.message}`;
    }
    return contentFull;
  }
  if (!isJsonResponse(resp)) {
    throw new Error(resp.statusText);
  }
  const result = await resp.json();
  if (!result) {
    throw new Error("Empty response");
  }
  if (options.errorExtractor(result)) {
    throw new Error(options.errorExtractor(result));
  }
  try {
    await onResult?.(result);
    return options.fullContentExtractor(result);
  } catch (e) {
    console.error(e);
    throw Error(JSON.stringify(result));
  }
}

// src/utils/cache.js
var Cache = class {
  constructor() {
    this.maxItems = 10;
    this.maxAge = 1e3 * 60 * 60;
    this.cache = {};
  }
  /**
   * @param {string} key
   * @param {any} value
   */
  set(key, value) {
    this.trim();
    this.cache[key] = {
      value,
      time: Date.now()
    };
  }
  /**
   * @param {string} key
   * @returns {any}
   */
  get(key) {
    this.trim();
    return this.cache[key]?.value;
  }
  /**
   * @private
   */
  trim() {
    let keys = Object.keys(this.cache);
    for (const key of keys) {
      if (Date.now() - this.cache[key].time > this.maxAge) {
        delete this.cache[key];
      }
    }
    keys = Object.keys(this.cache);
    if (keys.length > this.maxItems) {
      keys.sort((a, b) => this.cache[a].time - this.cache[b].time);
      for (let i = 0; i < keys.length - this.maxItems; i++) {
        delete this.cache[keys[i]];
      }
    }
  }
};

// src/utils/image.js
var IMAGE_CACHE = new Cache();
async function fetchImage(url) {
  if (IMAGE_CACHE[url]) {
    return IMAGE_CACHE.get(url);
  }
  return fetch(url).then((resp) => resp.blob()).then((blob) => {
    IMAGE_CACHE.set(url, blob);
    return blob;
  });
}
async function uploadImageToTelegraph(url) {
  if (url.startsWith("https://telegra.ph")) {
    return url;
  }
  const raw = await fetchImage(url);
  const formData = new FormData();
  formData.append("file", raw, "blob");
  const resp = await fetch("https://telegra.ph/upload", {
    method: "POST",
    body: formData
  });
  let [{ src }] = await resp.json();
  src = `https://telegra.ph${src}`;
  IMAGE_CACHE.set(src, raw);
  return src;
}
async function urlToBase64String(url) {
  try {
    const { Buffer: Buffer2 } = await import("node:buffer");
    return fetchImage(url).then((blob) => blob.arrayBuffer()).then((buffer) => Buffer2.from(buffer).toString("base64"));
  } catch {
    return fetchImage(url).then((blob) => blob.arrayBuffer()).then((buffer) => btoa(String.fromCharCode.apply(null, new Uint8Array(buffer))));
  }
}
function getImageFormatFromBase64(base64String) {
  const firstChar = base64String.charAt(0);
  switch (firstChar) {
    case "/":
      return "jpeg";
    case "i":
      return "png";
    case "R":
      return "gif";
    case "U":
      return "webp";
    default:
      throw new Error("Unsupported image format");
  }
}
async function imageToBase64String(url) {
  const base64String = await urlToBase64String(url);
  const format = getImageFormatFromBase64(base64String);
  return {
    data: base64String,
    format: `image/${format}`
  };
}
function renderBase64DataURI(params) {
  return `data:${params.format};base64,${params.data}`;
}

// src/agent/openai.js
function openAIKeyFromContext(context) {
  const length = context.USER_CONFIG.OPENAI_API_KEY.length;
  return context.USER_CONFIG.OPENAI_API_KEY[Math.floor(Math.random() * length)];
}
function openAIImageKeyFromContext(context) {
  // 如果有專門的圖片 API Key，優先使用
  if (context.USER_CONFIG.OPENAI_IMAGE_API_KEY && context.USER_CONFIG.OPENAI_IMAGE_API_KEY.length > 0) {
    const length = context.USER_CONFIG.OPENAI_IMAGE_API_KEY.length;
    return context.USER_CONFIG.OPENAI_IMAGE_API_KEY[Math.floor(Math.random() * length)];
  }
  // 否則使用一般的 OpenAI API Key
  return openAIKeyFromContext(context);
}
function getOpenAIImageApiBase(context) {
  // 如果有專門的圖片 API BASE，優先使用
  if (context.USER_CONFIG.OPENAI_IMAGE_API_BASE && context.USER_CONFIG.OPENAI_IMAGE_API_BASE.trim() !== "") {
    return context.USER_CONFIG.OPENAI_IMAGE_API_BASE.trim();
  }
  // 否則使用一般的 OpenAI API BASE
  return context.USER_CONFIG.OPENAI_API_BASE;
}
function isOpenAIEnable(context) {
  return context.USER_CONFIG.OPENAI_API_KEY.length > 0;
}
function isOpenAIImageEnable(context) {
  // 檢查是否有專門的圖片 API Key，或者有一般的 OpenAI API Key
  return (context.USER_CONFIG.OPENAI_IMAGE_API_KEY && context.USER_CONFIG.OPENAI_IMAGE_API_KEY.length > 0) ||
         (context.USER_CONFIG.OPENAI_API_KEY && context.USER_CONFIG.OPENAI_API_KEY.length > 0);
}
async function renderOpenAIMessage(item) {
  const res = {
    role: item.role,
    content: item.content
  };
  if (item.images && item.images.length > 0) {
    res.content = [];
    if (item.content) {
      res.content.push({ type: "text", text: item.content });
    }
    for (const image of item.images) {
      switch (ENV.TELEGRAM_IMAGE_TRANSFER_MODE) {
        case "base64":
          res.content.push({ type: "image_url", image_url: {
            url: renderBase64DataURI(await imageToBase64String(image))
          } });
          break;
        case "url":
        default:
          res.content.push({ type: "image_url", image_url: { url: image } });
          break;
      }
    }
  }
  return res;
}
async function requestCompletionsFromOpenAI(params, context, onStream) {
  const { message, images, prompt, history } = params;
  const url = `${context.USER_CONFIG.OPENAI_API_BASE}/chat/completions`;
  const header = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${openAIKeyFromContext(context)}`
  };
  const messages = [...history || [], { role: "user", content: message, images }];
  if (prompt) {
    messages.unshift({ role: context.USER_CONFIG.SYSTEM_INIT_MESSAGE_ROLE, content: prompt });
  }
  const body = {
    model: context.USER_CONFIG.OPENAI_CHAT_MODEL,
    ...context.USER_CONFIG.OPENAI_API_EXTRA_PARAMS,
    messages: await Promise.all(messages.map(renderOpenAIMessage)),
    stream: onStream != null
  };
  return requestChatCompletions(url, header, body, context, onStream);
}
async function requestImageFromOpenAI(prompt, context) {
  const url = `${getOpenAIImageApiBase(context)}/images/generations`;
  const header = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${openAIImageKeyFromContext(context)}`
  };
  
  // 檢查是否使用 gpt-image-1 模型
  const isGptImage1 = context.USER_CONFIG.DALL_E_MODEL === "gpt-image-1" || 
                      context.USER_CONFIG.GPT_IMAGE_MODEL === "gpt-image-1";
  
  const body = {
    prompt,
    n: 1
  };
  
  if (isGptImage1) {
    // GPT-Image-1 配置
    body.model = "gpt-image-1";
    body.size = context.USER_CONFIG.GPT_IMAGE_SIZE || "1024x1024";
  } else {
    // DALL-E 配置
    body.model = context.USER_CONFIG.DALL_E_MODEL;
    body.size = context.USER_CONFIG.DALL_E_IMAGE_SIZE;
    
    if (body.model === "dall-e-3") {
      body.quality = context.USER_CONFIG.DALL_E_IMAGE_QUALITY;
      body.style = context.USER_CONFIG.DALL_E_IMAGE_STYLE;
    }
  }
  
  const resp = await fetch(url, {
    method: "POST",
    headers: header,
    body: JSON.stringify(body)
  }).then((res) => res.json());
  
  if (resp.error?.message) {
    throw new Error(resp.error.message);
  }
  
  // 處理 gpt-image-1 的 base64 回應
  if (isGptImage1 && resp?.data?.[0]?.b64_json) {
    // 將 base64 轉換為 data URL，讓 sendPhotoToTelegram 處理
    return `data:image/png;base64,${resp.data[0].b64_json}`;
  }
  
  // 處理 DALL-E 的 URL 回應
  return resp?.data?.[0]?.url;
}

// Gemini 圖片生成相關函數
function geminiImageKeyFromContext(context) {
  if (context.USER_CONFIG.GEMINI_IMAGE_API_KEY && context.USER_CONFIG.GEMINI_IMAGE_API_KEY.length > 0) {
    const length = context.USER_CONFIG.GEMINI_IMAGE_API_KEY.length;
    return context.USER_CONFIG.GEMINI_IMAGE_API_KEY[Math.floor(Math.random() * length)];
  }
  throw new Error("Gemini API Key is required for Google native API");
}

function getGeminiImageApiBase(context) {
  if (context.USER_CONFIG.GEMINI_IMAGE_API_BASE && context.USER_CONFIG.GEMINI_IMAGE_API_BASE.trim() !== "") {
    return context.USER_CONFIG.GEMINI_IMAGE_API_BASE.trim();
  }
  return "https://openrouter.ai/api/v1";
}

function isGeminiImageEnable(context) {
  const hasGeminiKey = context.USER_CONFIG.GEMINI_IMAGE_API_KEY && context.USER_CONFIG.GEMINI_IMAGE_API_KEY.length > 0;
  
  console.log(`[DEBUG] isGeminiImageEnable check:
    GEMINI_IMAGE_API_KEY available: ${hasGeminiKey}
    Result: ${hasGeminiKey}`);
  
  return hasGeminiKey;
}

async function requestImageFromGemini(prompt, context) {
  try {
    const model = context.USER_CONFIG.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image-preview";
    
    // 使用 streaming API
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent`;
    const apiKey = geminiImageKeyFromContext(context);
    
    console.log(`[DEBUG] Gemini Native API Stream Request:
      URL: ${url}
      Model: ${model}
      API Key: ${apiKey ? `${apiKey.substring(0, 10)}...` : 'null'}
      Prompt: ${prompt}`);
    
    const header = {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey
    };
    
    // 使用更明確的圖片生成提示
    const imagePrompt = `Generate an image of: ${prompt}. Please create a detailed visual representation.`;
    
    // 根據官方範例的格式構建請求
    const body = {
      "contents": [
        {
          "role": "user",
          "parts": [
            {
              "text": imagePrompt
            }
          ]
        }
      ],
      "generationConfig": {
        "response_modalities": ["IMAGE"]
      }
    };
    
    console.log(`[DEBUG] Request body:`, JSON.stringify(body, null, 2));
    
    const response = await fetch(url, {
      method: "POST",
      headers: header,
      body: JSON.stringify(body)
    });
    
    console.log(`[DEBUG] Response status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(`[DEBUG] Error response:`, errorText);
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }
    
    // 處理 streaming 響應 - 拼接所有片段
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }
        
        // 將所有片段拼接起來
        const chunk = decoder.decode(value, { stream: true });
        fullResponse += chunk;
        console.log(`[DEBUG] Received chunk: ${chunk.length} chars`);
      }
    } finally {
      reader.releaseLock();
    }
    
    console.log(`[DEBUG] Full response assembled, total length: ${fullResponse.length}`);
    console.log(`[DEBUG] Response starts with:`, fullResponse.substring(0, 200));
    console.log(`[DEBUG] Response ends with:`, fullResponse.substring(fullResponse.length - 200));
    
    // 解析完整的 JSON 響應
    let data;
    try {
      data = JSON.parse(fullResponse);
      console.log(`[DEBUG] Successfully parsed complete JSON response`);
    } catch (parseError) {
      console.log(`[DEBUG] Failed to parse full response as single JSON:`, parseError.message);
      
      // 如果不是有效的JSON，嘗試查找JSON數組
      const arrayMatch = fullResponse.match(/\[.*\]/s);
      if (arrayMatch) {
        try {
          data = JSON.parse(arrayMatch[0]);
          console.log(`[DEBUG] Successfully parsed as JSON array`);
        } catch (arrayParseError) {
          console.log(`[DEBUG] Failed to parse as JSON array:`, arrayParseError.message);
          throw new Error(`Failed to parse streaming response: ${parseError.message}`);
        }
      } else {
        throw new Error(`Failed to parse streaming response: ${parseError.message}`);
      }
    }
    
    console.log(`[DEBUG] Searching for image data in response...`);
    
    // 如果 data 是數組，遍歷所有元素
    const responses = Array.isArray(data) ? data : [data];
    
    for (let i = 0; i < responses.length; i++) {
      const responseItem = responses[i];
      console.log(`[DEBUG] Checking response item ${i}:`, Object.keys(responseItem));
      
      if (responseItem.candidates && responseItem.candidates[0] && 
          responseItem.candidates[0].content && responseItem.candidates[0].content.parts) {
        
        console.log(`[DEBUG] Found ${responseItem.candidates[0].content.parts.length} parts in response ${i}`);
        
        for (let j = 0; j < responseItem.candidates[0].content.parts.length; j++) {
          const part = responseItem.candidates[0].content.parts[j];
          console.log(`[DEBUG] Part ${j} keys:`, Object.keys(part));
          
          // 檢查 inlineData (根據官方範例)
          if (part.inlineData && part.inlineData.data) {
            console.log(`[DEBUG] Found inlineData with ${part.inlineData.data.length} characters`);
            const mimeType = part.inlineData.mimeType || 'image/png';
            return `data:${mimeType};base64,${part.inlineData.data}`;
          }
          
          // 也檢查 inline_data (備用格式)
          if (part.inline_data && part.inline_data.data) {
            console.log(`[DEBUG] Found inline_data with ${part.inline_data.data.length} characters`);
            const mimeType = part.inline_data.mime_type || 'image/png';
            return `data:${mimeType};base64,${part.inline_data.data}`;
          }
          
          if (part.text) {
            console.log(`[DEBUG] Part ${j} contains text:`, part.text.substring(0, 100));
          }
        }
      }
    }
    
    console.log(`[DEBUG] No image data found in any response items`);
    throw new Error("No image data found in streaming response");
    
  } catch (error) {
    console.error(`[ERROR] Gemini Native API Request failed:`, error);
    throw error;
  }
}

// src/agent/workersai.js
async function run(model, body, id, token) {
  return await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${id}/ai/run/${model}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      method: "POST",
      body: JSON.stringify(body)
    }
  );
}
function isWorkersAIEnable(context) {
  return !!(context.USER_CONFIG.CLOUDFLARE_ACCOUNT_ID && context.USER_CONFIG.CLOUDFLARE_TOKEN);
}
function renderWorkerAIMessage(item) {
  return {
    role: item.role,
    content: item.content
  };
}
async function requestCompletionsFromWorkersAI(params, context, onStream) {
  const { message, prompt, history } = params;
  const id = context.USER_CONFIG.CLOUDFLARE_ACCOUNT_ID;
  const token = context.USER_CONFIG.CLOUDFLARE_TOKEN;
  const model = context.USER_CONFIG.WORKERS_CHAT_MODEL;
  const url = `https://api.cloudflare.com/client/v4/accounts/${id}/ai/run/${model}`;
  const header = {
    Authorization: `Bearer ${token}`
  };
  const messages = [...history || [], { role: "user", content: message }];
  if (prompt) {
    messages.unshift({ role: context.USER_CONFIG.SYSTEM_INIT_MESSAGE_ROLE, content: prompt });
  }
  const body = {
    messages: messages.map(renderWorkerAIMessage),
    stream: onStream !== null
  };
  const options = {};
  options.contentExtractor = function(data) {
    return data?.response;
  };
  options.fullContentExtractor = function(data) {
    return data?.result?.response;
  };
  options.errorExtractor = function(data) {
    return data?.errors?.[0]?.message;
  };
  return requestChatCompletions(url, header, body, context, onStream, null, options);
}
async function requestImageFromWorkersAI(prompt, context) {
  const id = context.USER_CONFIG.CLOUDFLARE_ACCOUNT_ID;
  const token = context.USER_CONFIG.CLOUDFLARE_TOKEN;
  const raw = await run(context.USER_CONFIG.WORKERS_IMAGE_MODEL, { prompt }, id, token);
  return await raw.blob();
}

// src/agent/gemini.js
function isGeminiAIEnable(context) {
  return !!context.USER_CONFIG.GOOGLE_API_KEY;
}
var GEMINI_ROLE_MAP = {
  "assistant": "model",
  "system": "user",
  "user": "user"
};
async function renderGeminiMessage(item) {
  const parts = [];
  if (item.content) {
    parts.push({
      "text": item.content
    });
  }
  if (item.images && item.images.length > 0) {
    for (const image of item.images) {
      const { data, format } = await imageToBase64String(image);
      parts.push({
        inlineData: {
          mimeType: format,
          data: data
        }
      });
    }
  }
  return {
    role: GEMINI_ROLE_MAP[item.role],
    parts: parts
  };
}
async function requestCompletionsFromGeminiAI(params, context, onStream) {
  const { message, images, prompt, history } = params;
  onStream = null;
  const url = `${context.USER_CONFIG.GOOGLE_COMPLETIONS_API}${context.USER_CONFIG.GOOGLE_COMPLETIONS_MODEL}:${onStream ? "streamGenerateContent" : "generateContent"}?key=${context.USER_CONFIG.GOOGLE_API_KEY}`;
  const contentsTemp = [...history || [], { role: "user", content: message, images }];
  if (prompt) {
    contentsTemp.unshift({ role: "system", content: prompt });
  }
  const contents = [];
  for (const msg of contentsTemp) {
    const role = GEMINI_ROLE_MAP[msg.role];
    const rendered = await renderGeminiMessage(msg);
    if (contents.length === 0 || contents[contents.length - 1].role !== role) {
      contents.push(rendered);
    } else {
      contents[contents.length - 1].parts.push(...rendered.parts);
    }
  }
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ contents })
  });
  const data = await resp.json();
  try {
    return data.candidates[0].content.parts[0].text;
  } catch (e) {
    console.error(e);
    if (!data) {
      throw new Error("Empty response");
    }
    throw new Error(data?.error?.message || JSON.stringify(data));
  }
}

// src/agent/mistralai.js
function isMistralAIEnable(context) {
  return !!context.USER_CONFIG.MISTRAL_API_KEY;
}
function renderMistralMessage(item) {
  return {
    role: item.role,
    content: item.content
  };
}
async function requestCompletionsFromMistralAI(params, context, onStream) {
  const { message, prompt, history } = params;
  const url = `${context.USER_CONFIG.MISTRAL_API_BASE}/chat/completions`;
  const header = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${context.USER_CONFIG.MISTRAL_API_KEY}`
  };
  const messages = [...history || [], { role: "user", content: message }];
  if (prompt) {
    messages.unshift({ role: context.USER_CONFIG.SYSTEM_INIT_MESSAGE_ROLE, content: prompt });
  }
  const body = {
    model: context.USER_CONFIG.MISTRAL_CHAT_MODEL,
    messages: messages.map(renderMistralMessage),
    stream: onStream != null
  };
  return requestChatCompletions(url, header, body, context, onStream);
}

// src/agent/cohere.js
function isCohereAIEnable(context) {
  return !!context.USER_CONFIG.COHERE_API_KEY;
}
var COHERE_ROLE_MAP = {
  "assistant": "CHATBOT",
  "user": "USER"
};
function renderCohereMessage(item) {
  return {
    role: COHERE_ROLE_MAP[item.role],
    content: item.content
  };
}
async function requestCompletionsFromCohereAI(params, context, onStream) {
  const { message, prompt, history } = params;
  const url = `${context.USER_CONFIG.COHERE_API_BASE}/chat`;
  const header = {
    "Authorization": `Bearer ${context.USER_CONFIG.COHERE_API_KEY}`,
    "Content-Type": "application/json",
    "Accept": onStream !== null ? "text/event-stream" : "application/json"
  };
  const body = {
    message,
    model: context.USER_CONFIG.COHERE_CHAT_MODEL,
    stream: onStream != null,
    preamble: prompt,
    chat_history: history.map(renderCohereMessage)
  };
  if (!body.preamble) {
    delete body.preamble;
  }
  const options = {};
  options.streamBuilder = function(r, c) {
    return new Stream(r, c, null, cohereSseJsonParser);
  };
  options.contentExtractor = function(data) {
    return data?.text;
  };
  options.fullContentExtractor = function(data) {
    return data?.text;
  };
  options.errorExtractor = function(data) {
    return data?.message;
  };
  return requestChatCompletions(url, header, body, context, onStream, null, options);
}

// src/agent/anthropic.js
function isAnthropicAIEnable(context) {
  return !!context.USER_CONFIG.ANTHROPIC_API_KEY;
}
async function renderAnthropicMessage(item) {
  const res = {
    role: item.role,
    content: item.content
  };
  if (item.images && item.images.length > 0) {
    res.content = [];
    if (item.content) {
      res.content.push({ type: "text", text: item.content });
    }
    for (const image of item.images) {
      res.content.push(await imageToBase64String(image).then(({ format, data }) => {
        return { type: "image", source: { type: "base64", media_type: format, data } };
      }));
    }
  }
  return res;
}
async function requestCompletionsFromAnthropicAI(params, context, onStream) {
  const { message, images, prompt, history } = params;
  const url = `${context.USER_CONFIG.ANTHROPIC_API_BASE}/messages`;
  const header = {
    "x-api-key": context.USER_CONFIG.ANTHROPIC_API_KEY,
    "anthropic-version": "2023-06-01",
    "content-type": "application/json"
  };
  const messages = [...history || [], { role: "user", content: message, images }];
  const body = {
    system: prompt,
    model: context.USER_CONFIG.ANTHROPIC_CHAT_MODEL,
    messages: await Promise.all(messages.map(renderAnthropicMessage)),
    stream: onStream != null,
    max_tokens: ENV.MAX_TOKEN_LENGTH > 0 ? ENV.MAX_TOKEN_LENGTH : 2048
  };
  if (!body.system) {
    delete body.system;
  }
  const options = {};
  options.streamBuilder = function(r, c) {
    return new Stream(r, c, null, anthropicSseJsonParser);
  };
  options.contentExtractor = function(data) {
    return data?.delta?.text;
  };
  options.fullContentExtractor = function(data) {
    return data?.content?.[0].text;
  };
  options.errorExtractor = function(data) {
    return data?.error?.message;
  };
  return requestChatCompletions(url, header, body, context, onStream, null, options);
}

// src/agent/azure.js
function azureKeyFromContext(context) {
  return context.USER_CONFIG.AZURE_API_KEY;
}
function isAzureEnable(context) {
  return !!(context.USER_CONFIG.AZURE_API_KEY && context.USER_CONFIG.AZURE_COMPLETIONS_API);
}
function isAzureImageEnable(context) {
  return !!(context.USER_CONFIG.AZURE_API_KEY && context.USER_CONFIG.AZURE_DALLE_API);
}
async function requestCompletionsFromAzureOpenAI(params, context, onStream) {
  const { message, images, prompt, history } = params;
  const url = context.USER_CONFIG.AZURE_COMPLETIONS_API;
  const header = {
    "Content-Type": "application/json",
    "api-key": azureKeyFromContext(context)
  };
  const messages = [...history || [], { role: "user", content: message, images }];
  if (prompt) {
    messages.unshift({ role: context.USER_CONFIG.SYSTEM_INIT_MESSAGE_ROLE, content: prompt });
  }
  const body = {
    ...context.USER_CONFIG.OPENAI_API_EXTRA_PARAMS,
    messages: await Promise.all(messages.map(renderOpenAIMessage)),
    stream: onStream != null
  };
  return requestChatCompletions(url, header, body, context, onStream);
}
async function requestImageFromAzureOpenAI(prompt, context) {
  const url = context.USER_CONFIG.AZURE_DALLE_API;
  const header = {
    "Content-Type": "application/json",
    "api-key": azureKeyFromContext(context)
  };
  const body = {
    prompt,
    n: 1,
    size: context.USER_CONFIG.DALL_E_IMAGE_SIZE,
    style: context.USER_CONFIG.DALL_E_IMAGE_STYLE,
    quality: context.USER_CONFIG.DALL_E_IMAGE_QUALITY
  };
  const validSize = ["1792x1024", "1024x1024", "1024x1792"];
  if (!validSize.includes(body.size)) {
    body.size = "1024x1024";
  }
  const resp = await fetch(url, {
    method: "POST",
    headers: header,
    body: JSON.stringify(body)
  }).then((res) => res.json());
  if (resp.error?.message) {
    throw new Error(resp.error.message);
  }
  return resp?.data?.[0]?.url;
}

// src/agent/agents.js
var chatLlmAgents = [
  {
    name: "azure",
    enable: isAzureEnable,
    request: requestCompletionsFromAzureOpenAI
  },
  {
    name: "openai",
    enable: isOpenAIEnable,
    request: requestCompletionsFromOpenAI
  },
  {
    name: "workers",
    enable: isWorkersAIEnable,
    request: requestCompletionsFromWorkersAI
  },
  {
    name: "gemini",
    enable: isGeminiAIEnable,
    request: requestCompletionsFromGeminiAI
  },
  {
    name: "mistral",
    enable: isMistralAIEnable,
    request: requestCompletionsFromMistralAI
  },
  {
    name: "cohere",
    enable: isCohereAIEnable,
    request: requestCompletionsFromCohereAI
  },
  {
    name: "anthropic",
    enable: isAnthropicAIEnable,
    request: requestCompletionsFromAnthropicAI
  }
];
function currentChatModel(agentName, context) {
  switch (agentName) {
    case "azure":
      try {
        const url = new URL(context.USER_CONFIG.AZURE_COMPLETIONS_API);
        return url.pathname.split("/")[3];
      } catch {
        return context.USER_CONFIG.AZURE_COMPLETIONS_API;
      }
    case "openai":
      return context.USER_CONFIG.OPENAI_CHAT_MODEL;
    case "workers":
      return context.USER_CONFIG.WORKERS_CHAT_MODEL;
    case "gemini":
      return context.USER_CONFIG.GOOGLE_COMPLETIONS_MODEL;
    case "mistral":
      return context.USER_CONFIG.MISTRAL_CHAT_MODEL;
    case "cohere":
      return context.USER_CONFIG.COHERE_CHAT_MODEL;
    case "anthropic":
      return context.USER_CONFIG.ANTHROPIC_CHAT_MODEL;
    default:
      return null;
  }
}
function chatModelKey(agentName) {
  switch (agentName) {
    case "azure":
      return "AZURE_COMPLETIONS_API";
    case "openai":
      return "OPENAI_CHAT_MODEL";
    case "workers":
      return "WORKERS_CHAT_MODEL";
    case "gemini":
      return "GOOGLE_COMPLETIONS_MODEL";
    case "mistral":
      return "MISTRAL_CHAT_MODEL";
    case "cohere":
      return "COHERE_CHAT_MODEL";
    case "anthropic":
      return "ANTHROPIC_CHAT_MODEL";
    default:
      return null;
  }
}
function loadChatLLM(context) {
  for (const llm of chatLlmAgents) {
    if (llm.name === context.USER_CONFIG.AI_PROVIDER) {
      return llm;
    }
  }
  for (const llm of chatLlmAgents) {
    if (llm.enable(context)) {
      return llm;
    }
  }
  return null;
}
var imageGenAgents = [
  {
    name: "azure",
    enable: isAzureImageEnable,
    request: requestImageFromAzureOpenAI
  },
  {
    name: "openai",
    enable: isOpenAIImageEnable,
    request: requestImageFromOpenAI
  },
  {
    name: "gemini",
    enable: isGeminiImageEnable,
    request: requestImageFromGemini
  },
  {
    name: "workers",
    enable: isWorkersAIEnable,
    request: requestImageFromWorkersAI
  }
];
function loadImageGen(context) {
  console.log(`[DEBUG] loadImageGen called with AI_IMAGE_PROVIDER: ${context.USER_CONFIG.AI_IMAGE_PROVIDER}`);
  
  for (const imgGen of imageGenAgents) {
    console.log(`[DEBUG] Checking if ${imgGen.name} === ${context.USER_CONFIG.AI_IMAGE_PROVIDER}`);
    if (imgGen.name === context.USER_CONFIG.AI_IMAGE_PROVIDER) {
      console.log(`[DEBUG] Found matching provider: ${imgGen.name}`);
      return imgGen;
    }
  }
  
  console.log(`[DEBUG] No matching provider found, checking enable() functions...`);
  for (const imgGen of imageGenAgents) {
    const enabled = imgGen.enable(context);
    console.log(`[DEBUG] ${imgGen.name}.enable() = ${enabled}`);
    if (enabled) {
      console.log(`[DEBUG] Selected auto provider: ${imgGen.name}`);
      return imgGen;
    }
  }
  
  console.log(`[DEBUG] No enabled provider found`);
  return null;
}
function currentImageModel(agentName, context) {
  switch (agentName) {
    case "azure":
      try {
        const url = new URL(context.USER_CONFIG.AZURE_DALLE_API);
        return url.pathname.split("/")[3];
      } catch {
        return context.USER_CONFIG.AZURE_DALLE_API;
      }
    case "openai":
      // 檢查是否使用 gpt-image-1
      if (context.USER_CONFIG.DALL_E_MODEL === "gpt-image-1" || 
          context.USER_CONFIG.GPT_IMAGE_MODEL === "gpt-image-1") {
        return "gpt-image-1";
      }
      return context.USER_CONFIG.DALL_E_MODEL;
    case "gemini":
      return context.USER_CONFIG.GEMINI_IMAGE_MODEL;
    case "workers":
      return context.USER_CONFIG.WORKERS_IMAGE_MODEL;
    default:
      return null;
  }
}
function imageModelKey(agentName) {
  switch (agentName) {
    case "azure":
      return "AZURE_DALLE_API";
    case "openai":
      return "DALL_E_MODEL";
    case "gemini":
      return "GEMINI_IMAGE_MODEL";
    case "workers":
      return "WORKERS_IMAGE_MODEL";
    default:
      return null;
  }
}

// src/agent/llm.js
function tokensCounter() {
  return (text) => {
    return text.length;
  };
}
async function loadHistory(key) {
  let history = [];
  try {
    history = JSON.parse(await DATABASE.get(key));
  } catch (e) {
    console.error(e);
  }
  if (!history || !Array.isArray(history)) {
    history = [];
  }
  const counter = tokensCounter();
  const trimHistory = (list, initLength, maxLength, maxToken) => {
    if (maxLength >= 0 && list.length > maxLength) {
      list = list.splice(list.length - maxLength);
    }
    if (maxToken > 0) {
      let tokenLength = initLength;
      for (let i = list.length - 1; i >= 0; i--) {
        const historyItem = list[i];
        let length = 0;
        if (historyItem.content) {
          length = counter(historyItem.content);
        } else {
          historyItem.content = "";
        }
        tokenLength += length;
        if (tokenLength > maxToken) {
          list = list.splice(i + 1);
          break;
        }
      }
    }
    return list;
  };
  if (ENV.AUTO_TRIM_HISTORY && ENV.MAX_HISTORY_LENGTH > 0) {
    history = trimHistory(history, 0, ENV.MAX_HISTORY_LENGTH, ENV.MAX_TOKEN_LENGTH);
  }
  return history;
}
async function requestCompletionsFromLLM(params, context, llm, modifier, onStream) {
  const historyDisable = ENV.AUTO_TRIM_HISTORY && ENV.MAX_HISTORY_LENGTH <= 0;
  const historyKey = context.SHARE_CONTEXT.chatHistoryKey;
  const { message, images } = params;
  let history = await loadHistory(historyKey);
  if (modifier) {
    const modifierData = modifier(history, message);
    history = modifierData.history;
    params.message = modifierData.message;
  }
  const llmParams = {
    ...params,
    history,
    prompt: context.USER_CONFIG.SYSTEM_INIT_MESSAGE
  };
  const answer = await llm(llmParams, context, onStream);
  if (!historyDisable) {
    history.push({ role: "user", content: message || "", images });
    history.push({ role: "assistant", content: answer });
    await DATABASE.put(historyKey, JSON.stringify(history)).catch(console.error);
  }
  return answer;
}
async function chatWithLLM(params, context, modifier) {
  try {
    try {
      const msg = await sendMessageToTelegramWithContext(context)("...").then((r) => r.json());
      context.CURRENT_CHAT_CONTEXT.message_id = msg.result.message_id;
      context.CURRENT_CHAT_CONTEXT.reply_markup = null;
    } catch (e) {
      console.error(e);
    }
    setTimeout(() => sendChatActionToTelegramWithContext(context)("typing").catch(console.error), 0);
    let onStream = null;
    const parseMode = context.CURRENT_CHAT_CONTEXT.parse_mode;
    let nextEnableTime = null;
    if (ENV.STREAM_MODE) {
      context.CURRENT_CHAT_CONTEXT.parse_mode = null;
      onStream = async (text) => {
        try {
          if (nextEnableTime && nextEnableTime > Date.now()) {
            return;
          }
          const resp = await sendMessageToTelegramWithContext(context)(text);
          if (resp.status === 429) {
            const retryAfter = parseInt(resp.headers.get("Retry-After"));
            if (retryAfter) {
              nextEnableTime = Date.now() + retryAfter * 1e3;
              return;
            }
          }
          nextEnableTime = null;
          if (resp.ok) {
            context.CURRENT_CHAT_CONTEXT.message_id = (await resp.json()).result.message_id;
          }
        } catch (e) {
          console.error(e);
        }
      };
    }
    const llm = loadChatLLM(context)?.request;
    if (llm === null) {
      return sendMessageToTelegramWithContext(context)("LLM is not enable");
    }
    const answer = await requestCompletionsFromLLM(params, context, llm, modifier, onStream);
    context.CURRENT_CHAT_CONTEXT.parse_mode = parseMode;
    if (ENV.SHOW_REPLY_BUTTON && context.CURRENT_CHAT_CONTEXT.message_id) {
      try {
        await deleteMessageFromTelegramWithContext(context)(context.CURRENT_CHAT_CONTEXT.message_id);
        context.CURRENT_CHAT_CONTEXT.message_id = null;
        context.CURRENT_CHAT_CONTEXT.reply_markup = {
          keyboard: [[{ text: "/new" }, { text: "/redo" }]],
          selective: true,
          resize_keyboard: true,
          one_time_keyboard: true
        };
      } catch (e) {
        console.error(e);
      }
    }
    if (nextEnableTime && nextEnableTime > Date.now()) {
      await new Promise((resolve) => setTimeout(resolve, nextEnableTime - Date.now()));
    }
    return sendMessageToTelegramWithContext(context)(answer);
  } catch (e) {
    let errMsg = `Error: ${e.message}`;
    if (errMsg.length > 2048) {
      errMsg = errMsg.substring(0, 2048);
    }
    context.CURRENT_CHAT_CONTEXT.disable_web_page_preview = true;
    return sendMessageToTelegramWithContext(context)(errMsg);
  }
}

// src/telegram/command.js
var commandAuthCheck = {
  default(chatType) {
    if (CONST.GROUP_TYPES.includes(chatType)) {
      return ["administrator", "creator"];
    }
    return null;
  },
  shareModeGroup(chatType) {
    if (CONST.GROUP_TYPES.includes(chatType)) {
      if (!ENV.GROUP_CHAT_BOT_SHARE_MODE) {
        return false;
      }
      return ["administrator", "creator"];
    }
    return null;
  }
};
var commandSortList = [   //把原生指令  "/setenv", "/delenv"   "/version",   "/redo", 隱藏看看
  "/boa",  //解答之書
  "/new", //新對話 
  "/qi", //奇門遁甲
  "/oracle", //淺草籤詩
  "/poetry", //唐詩
  "/law", //法律問答
  "/weatheralert", // 天氣特報警報
  "/img",  //產生圖片
  "/img2",  //產生圖片2 (支援更多模型)
  "/setimg", //設定圖片生成模型
  "/dictcn",  // 新增的指令中文字典 (要加參數)
  "/dicten",  // 新增的指令英文字典 (要加參數)
  "/system",
  "/stock2",   //美國國際股市 (要加參數)
  "/stock",  //台灣股市 (要加參數)
  "/wt", // 台灣地區天氣  (要加參數)
  "/ip", // ip (要加參數)
  "/dns", //dns  (要加參數)
  "/password",  //隨機密碼
  "/help"
];


var commandHandlers = { 
  "/help": {
    scopes: ["all_private_chats", "all_chat_administrators"],
    fn: commandGetHelp
  },
  "/new": {
    scopes: ["all_private_chats", "all_group_chats", "all_chat_administrators"],
    fn: commandCreateNewChatContext
  },
  "/start": {
    scopes: [],
    fn: commandCreateNewChatContext
  },
  "/img": {
    scopes: ["all_private_chats", "all_chat_administrators"],
    fn: commandGenerateImg
  },
  "/img2": {
    scopes: ["all_private_chats", "all_chat_administrators"],
    fn: commandGenerateImg2
  },
  "/setimg": {
    scopes: ["all_private_chats", "all_chat_administrators"],
    fn: commandSetImageProvider
  },
  "/version": {
    scopes: ["all_private_chats", "all_chat_administrators"],
    fn: commandFetchUpdate
  },
  "/setenv": {
    scopes: [],
    fn: commandUpdateUserConfig,
    needAuth: commandAuthCheck.shareModeGroup
  },
  "/setenvs": {
    scopes: [],
    fn: commandUpdateUserConfigs,
    needAuth: commandAuthCheck.shareModeGroup
  },
  "/delenv": {
    scopes: [],
    fn: commandDeleteUserConfig,
    needAuth: commandAuthCheck.shareModeGroup
  },
  "/clearenv": {
    scopes: [],
    fn: commandClearUserConfig,
    needAuth: commandAuthCheck.shareModeGroup
  },
  "/system": {
    scopes: ["all_private_chats", "all_chat_administrators"],
    fn: commandSystem,
    needAuth: commandAuthCheck.default
  },
  "/redo": {
    scopes: ["all_private_chats", "all_group_chats", "all_chat_administrators"],
    fn: commandRegenerate
  },
  "/dictcn": {  // 中文字典
    scopes: ["all_private_chats", "all_group_chats", "all_chat_administrators"],
    fn: commandDictCN
  },
  "/dicten": { // 英文字典
    scopes: ["all_private_chats", "all_group_chats", "all_chat_administrators"],
    fn: commandDictEN
  },
  "/stock": { // 台灣股票
    scopes: ["all_private_chats", "all_group_chats", "all_chat_administrators"],
    fn: commandStockTW
  },
  "/stock2": {  //國際股票
    scopes: ["all_private_chats", "all_group_chats", "all_chat_administrators"],
    fn: commandStock
  },
  "/wt": { // 台灣天氣
    scopes: ["all_private_chats", "all_group_chats", "all_chat_administrators"],
    fn: commandWeather
  },
  "/ip": { // ip查詢
    scopes: ["all_private_chats", "all_group_chats", "all_chat_administrators"],
    fn: commandIpLookup
  },
  "/dns": { // ip查詢
    scopes: ["all_private_chats", "all_group_chats", "all_chat_administrators"],
    fn: commandDnsLookup
  },
  "/dns2": { // ip查詢
    scopes: ["all_private_chats", "all_group_chats", "all_chat_administrators"],
    fn: commandDnsLookup2
  },
  "/boa": { // 解答之書
    scopes: ["all_private_chats", "all_group_chats", "all_chat_administrators"],
    fn: commandAnswerBook
  }, 
  "/password": { // 隨機密碼
    scopes: ["all_private_chats", "all_group_chats", "all_chat_administrators"],
    fn: generateRandomPassword
  },
  "/oracle": { // 隨機淺草籤
    scopes: ["all_private_chats", "all_group_chats", "all_chat_administrators"],
    fn: commandTempleOracleJP
  },
  "/poetry": { // 隨機唐詩
    scopes: ["all_private_chats", "all_group_chats", "all_chat_administrators"],
    fn: commandTangPoetry
  },
  "/web": { // 網站搜尋
    scopes: ["all_private_chats", "all_group_chats", "all_chat_administrators"],
    fn: commandDDGSearch
  },
  "/qi": { // 奇門遁甲
    scopes: ["all_private_chats", "all_group_chats", "all_chat_administrators"],
    fn: commandQimen
  },
  "/weatheralert": { // 天氣特報
    scopes: ["all_private_chats", "all_group_chats", "all_chat_administrators"],
    fn: commandWeatherAlert
  },
  "/law": { // 法律問答
    scopes: ["all_private_chats", "all_group_chats", "all_chat_administrators"],
    fn: commandLaw
  },          
};



// 奇門問答
async function commandQimen(message, command, subcommand, context) {
  const question = (subcommand || '').trim();
  if (!question) {
    return sendMessageToTelegramWithContext(context)('錯誤: 請在指令後面輸入要詢問的問題。');
  }

  const url = 'https://qi.david888.com/api/qimen-question';
  const payload = {
    question,              // 使用者問題
    mode: 'advanced',      // 可改: 'traditional' | 'advanced'
    purpose: '綜合',        // 依你的要求統一為「綜合」
    // 若要自帶時間與時區，可加上以下兩行：
    datetime: new Date().toISOString(),
    timezone: '+08:00',
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const text = await response.text();

    // 檢查是否為 JSON
    if (!(text.startsWith('{') && text.endsWith('}'))) {
      return sendMessageToTelegramWithContext(context)(`錯誤: API回應非JSON，內容: ${text}`);
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return sendMessageToTelegramWithContext(context)(`錯誤: 無法解析JSON回應。內容: ${text}`);
    }

    if (!data.success) {
      const msg = data.message || '未知錯誤';
      return sendMessageToTelegramWithContext(context)(`奇門服務回應失敗：${msg}`);
    }

    // 取出主要欄位
    const ans = (data.answer || '').trim();
    const qi = data.qimenInfo || {};
    const meta = data.metadata || {};

    // 組裝訊息
    let reply = `【奇門遁甲】\n問題：${data.question || question}\n\n`;
    if (qi.localDate || qi.localTime) {
      reply += `時間：${qi.localDate || ''} ${qi.localTime || ''}\n`;
    }
    if (qi.mode || qi.purpose) {
      reply += `模式：${qi.mode || 'N/A'}　目的：${qi.purpose || '綜合'}\n`;
    }
    reply += '\n';
    reply += ans ? ans : '（無回覆內容）';

    // （可選）附上模型與供應商資訊，方便除錯
    if (meta.provider || meta.model) {
      reply += `\n\n— 來源：${meta.provider || ''} ${meta.model || ''}`.trimEnd();
    }

    return sendMessageToTelegramWithContext(context)(reply);
  } catch (e) {
    return sendMessageToTelegramWithContext(context)(`錯誤: ${e.message}`);
  }
}


// 天氣特報查詢
async function commandWeatherAlert(message, command, subcommand, context) {
  const url = 'https://opendata.cwa.gov.tw/api/v1/rest/datastore/W-C0033-001?Authorization=CWA-AFB7BD45-6D32-4CA4-B619-D8BBC81B1ABA&format=JSON';

  try {
    const response = await fetch(url);
    const text = await response.text();

    // 檢查回應是否為有效的 JSON 格式
    if (text.startsWith('{') && text.endsWith('}')) {
      try {
        const data = JSON.parse(text);

        if (data.records && data.records.location) {
          const locations = data.records.location;
          let weatherReport = '天氣特報:\n';

          locations.forEach(location => {
            if (location.hazardConditions.hazards.length > 0) {
              const hazard = location.hazardConditions.hazards[0].info;
              weatherReport += `縣市: ${location.locationName}\n特報內容: ${hazard.phenomena} - ${hazard.significance}\n`;
              weatherReport += `時間: ${location.hazardConditions.hazards[0].validTime.startTime} ~ ${location.hazardConditions.hazards[0].validTime.endTime}\n\n`;
            }
          });

          if (weatherReport === '天氣特報:\n') {
            weatherReport = '目前沒有特報內容。';
          }

          return sendMessageToTelegramWithContext(context)(weatherReport);
        } else {
          return sendMessageToTelegramWithContext(context)('抱歉，無法取得天氣特報。');
        }
      } catch (jsonError) {
        return sendMessageToTelegramWithContext(context)(`錯誤: 無法解析JSON回應。回應內容: ${text}`);
      }
    } else {
      return sendMessageToTelegramWithContext(context)(`錯誤: API回應錯誤，內容: ${text}`);
    }
  } catch (e) {
    return sendMessageToTelegramWithContext(context)(`錯誤: ${e.message}`);
  }
}


// 分段發送長訊息的輔助函數
async function sendLongMessage(context, message, maxLength = 4000) {
  if (message.length <= maxLength) {
    return sendMessageToTelegramWithContext(context)(message);
  }

  const parts = [];
  let currentPart = '';
  const lines = message.split('\n');

  for (const line of lines) {
    if ((currentPart + line + '\n').length > maxLength) {
      if (currentPart) {
        parts.push(currentPart.trim());
        currentPart = '';
      }
      
      // 如果單行就超過限制，強制分割
      if (line.length > maxLength) {
        let remainingLine = line;
        while (remainingLine.length > maxLength) {
          parts.push(remainingLine.substring(0, maxLength));
          remainingLine = remainingLine.substring(maxLength);
        }
        if (remainingLine) {
          currentPart = remainingLine + '\n';
        }
      } else {
        currentPart = line + '\n';
      }
    } else {
      currentPart += line + '\n';
    }
  }

  if (currentPart.trim()) {
    parts.push(currentPart.trim());
  }

  // 依序發送每個部分
  for (let i = 0; i < parts.length; i++) {
    const partMessage = i === 0 ? parts[i] : `(續 ${i + 1}/${parts.length})\n\n${parts[i]}`;
    await sendMessageToTelegramWithContext(context)(partMessage);
    
    // 在多段訊息之間添加小延遲，避免發送過快
    if (i < parts.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
}


// 法律問答
async function commandLaw(message, command, subcommand, context) {
  const question = (subcommand || '').trim();
  if (!question) {
    return sendMessageToTelegramWithContext(context)('錯誤: 請在指令後面輸入法律問題。例如：/law AI產生的不實訊息，散播者會構成加重誹謗罪嗎？');
  }

  const url = 'https://taiwan-law-bot-dev.onrender.com/chat';
  const payload = {
    messages: [
      {
        role: "user",
        content: question
      }
    ],
    stream: true, // 恢復為 true，因為 API 回傳的是流式資料
    is_paid_user: true,
    is_thinking_mode: true,
    general_public_mode: false,
    writing_mode: true,
    ai_high_court_only: false,
    model: "gpt-4o"
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return sendMessageToTelegramWithContext(context)(`錯誤: API回應狀態 ${response.status}`);
    }

    const text = await response.text();

    // 處理包含法律搜索結果的 JSON 響應
    if (text.startsWith('{') && text.endsWith('}')) {
      try {
        const data = JSON.parse(text);
        
        // 檢查是否有 AI 回答
        let aiAnswer = '';
        if (data.choices && data.choices[0] && data.choices[0].message) {
          aiAnswer = data.choices[0].message.content || '';
        }
        
        // 組裝回答
        let reply = `【法律問答】\n問題：${question}\n\n`;
        
        if (aiAnswer) {
          reply += `AI 分析：\n${aiAnswer}\n\n`;
        }
        
        // 檢查是否有相關判決案例
        if (data.related_cases && Array.isArray(data.related_cases) && data.related_cases.length > 0) {
          reply += `📚 相關判決案例：\n\n`;
          
          // 只顯示前3個最相關的案例
          const casesToShow = data.related_cases.slice(0, 3);
          
          casesToShow.forEach((case_item, index) => {
            reply += `${index + 1}. ${case_item.title || '判決案例'}\n`;
            reply += `   法院：${case_item.court || '未知'}\n`;
            reply += `   案號：${case_item.case_number || '未知'}\n`;
            
            if (case_item.summary) {
              // 摘要太長時截取前200字
              let summary = case_item.summary;
              if (summary.length > 200) {
                summary = summary.substring(0, 200) + '...';
              }
              reply += `   摘要：${summary}\n`;
            }
            
            if (case_item.score) {
              reply += `   相關度：${(case_item.score * 100).toFixed(1)}%\n`;
            }
            
            reply += '\n';
          });
          
          if (data.related_cases.length > 3) {
            reply += `還有 ${data.related_cases.length - 3} 個相關案例...\n\n`;
          }
        }
        
        reply += '※ 此回答僅供參考，如有具體法律問題請諮詢專業律師。';
        
        return sendLongMessage(context, reply);
        
      } catch (e) {
        return sendMessageToTelegramWithContext(context)(`錯誤: 無法解析API回應。錯誤詳情: ${e.message}`);
      }
    }

    // 處理流式回應格式 (如果是 Server-Sent Events)
    if (text.includes('data: ')) {
      const lines = text.split('\n');
      let fullResponse = '';
      
      for (const line of lines) {
        if (line.startsWith('data: ') && !line.includes('[DONE]')) {
          try {
            const dataStr = line.substring(6);
            if (dataStr.trim()) {
              const data = JSON.parse(dataStr);
              
              // 支援不同的 API 回應格式
              if (data.content) {
                // 台灣法律 API 格式: {"done": false, "content": "內容"}
                fullResponse += data.content;
              } else if (data.choices && data.choices[0] && data.choices[0].delta && data.choices[0].delta.content) {
                // 標準 OpenAI API 格式
                fullResponse += data.choices[0].delta.content;
              }
            }
          } catch (e) {
            // 忽略解析錯誤的行
            console.log('解析流式數據時出錯:', e.message, '原始行:', line);
          }
        }
      }
      
      if (fullResponse) {
        const reply = `【法律問答】\n問題：${question}\n\n回答：\n${fullResponse}\n\n※ 此回答僅供參考，如有具體法律問題請諮詢專業律師。`;
        return sendLongMessage(context, reply);
      }
    }

    // 如果都不是預期格式，直接返回文本內容
    if (text.trim()) {
      const reply = `【法律問答】\n問題：${question}\n\n回答：\n${text.substring(0, 2000)}${text.length > 2000 ? '...' : ''}\n\n※ 此回答僅供參考，如有具體法律問題請諮詢專業律師。`;
      return sendLongMessage(context, reply);
    }

    return sendMessageToTelegramWithContext(context)('抱歉，無法從法律問答服務獲取有效回應。');

  } catch (e) {
    return sendMessageToTelegramWithContext(context)(`錯誤: ${e.message}`);
  }
}


// DuckDuckGo 搜尋處理程序
async function commandDDGSearch(message, command, subcommand, context) {
  const query = subcommand || ''; // 搜尋的關鍵詞
  if (!query) {
    return sendMessageToTelegramWithContext(context)(`錯誤: 搜尋關鍵詞未提供。`);
  }

  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&kl=wt-wt&no_redirect=1&no_html=1&skip_disambig=1`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.RelatedTopics && data.RelatedTopics.length > 0) {
      // 取得前 5 個相關話題
      const relatedTopics = data.RelatedTopics.slice(0, 5).map((topic, index) => {
        const text = topic.Text || '無描述';
        const firstURL = topic.FirstURL || '無連結';
        return `${index + 1}. ${text} - ${firstURL}`;
      }).join('\n\n');

      const responseMessage = `Here are some resources related to ${query}:\n\n${relatedTopics}\n\nFeel free to check these links for detailed information!`;
      return sendMessageToTelegramWithContext(context)(responseMessage);
    } else if (data.AbstractText) {
      // 如果沒有相關話題但有摘要，顯示摘要
      const abstract = data.AbstractText;
      const source = data.AbstractSource || 'DuckDuckGo';
      const responseMessage = `搜尋結果:\n${abstract}\n\n來源: ${source}`;
      return sendMessageToTelegramWithContext(context)(responseMessage);
    } else {
      return sendMessageToTelegramWithContext(context)(`沒有找到與「${query}」相關的結果。`);
    }
  } catch (e) {
    return sendMessageToTelegramWithContext(context)(`錯誤: ${e.message}`);
  }
}



// 隨機淺草籤詩查詢
async function commandTempleOracleJP(message, command, subcommand, context) {
  const url = 'https://answerbook.david888.com/TempleOracleJP';
  try {
    const response = await fetch(url);
    const text = await response.text();

    // 檢查回應是否為有效的 JSON 格式
    if (text.startsWith('{') && text.endsWith('}')) {
      try {
        const data = JSON.parse(text);
        if (data.oracle) {
          const type = data.oracle.type || '類型未提供';
          const poem = data.oracle.poem || '詩句未提供';
          const explanation = data.oracle.explain || '解釋未提供';

          // 構建結果訊息
          const results = data.oracle.result;
          const resultMessages = Object.entries(results).map(([key, value]) => `${key}: ${value}`).join('\n');
          
          const responseMessage = `淺草籤詩:\n類型: ${type}\n詩句: ${poem}\n解釋: ${explanation}\n\n結果:\n${resultMessages}`;

          return sendMessageToTelegramWithContext(context)(responseMessage);
        } else {
          return sendMessageToTelegramWithContext(context)(`錯誤: 無法獲取淺草籤詩的內容。`);
        }
      } catch (jsonError) {
        return sendMessageToTelegramWithContext(context)(`錯誤: 無法解析JSON回應。回應內容: ${text}`);
      }
    } else {
      return sendMessageToTelegramWithContext(context)(`錯誤: API回應錯誤，內容: ${text}`);
    }
  } catch (e) {
    return sendMessageToTelegramWithContext(context)(`錯誤: ${e.message}`);
  }
}

// 隨機唐詩查詢
async function commandTangPoetry(message, command, subcommand, context) {
  const url = 'https://answerbook.david888.com/TangPoetry';
  try {
    const response = await fetch(url);
    const text = await response.text();

    // 檢查回應是否為有效的 JSON 格式
    if (text.startsWith('{') && text.endsWith('}')) {
      try {
        const data = JSON.parse(text);
        if (data.poem) {
          const title = data.poem.title || '標題未提供';
          const author = data.poem.author || '作者未提供';
          const poemText = data.poem.text || '詩句未提供';
          return sendMessageToTelegramWithContext(context)(
            `唐詩: \n標題: ${title}\n作者: ${author}\n詩句:\n${poemText}`
          );
        } else {
          return sendMessageToTelegramWithContext(context)(`錯誤: 無法獲取唐詩的內容。`);
        }
      } catch (jsonError) {
        return sendMessageToTelegramWithContext(context)(`錯誤: 無法解析JSON回應。回應內容: ${text}`);
      }
    } else {
      return sendMessageToTelegramWithContext(context)(`錯誤: API回應錯誤，內容: ${text}`);
    }
  } catch (e) {
    return sendMessageToTelegramWithContext(context)(`錯誤: ${e.message}`);
  }
}

// 解答之書查詢
async function commandAnswerBook(message, command, subcommand, context) {
  const url = 'https://answerbook.david888.com';
  try {
    const response = await fetch(url);
    const text = await response.text(); // 先將回應作為文本讀取

    // 檢查回應是否為有效的 JSON 格式
    if (text.startsWith('{') && text.endsWith('}')) {
      try {
        const data = JSON.parse(text); // 嘗試解析為 JSON
        if (data.answer) {
          return sendMessageToTelegramWithContext(context)(`解答之書: ${data.answer}`);
        } else {
          return sendMessageToTelegramWithContext(context)(`錯誤: 無法獲取解答之書的答案。`);
        }
      } catch (jsonError) {
        return sendMessageToTelegramWithContext(context)(`錯誤: 無法解析JSON回應。回應內容: ${text}`);
      }
    } else {
      // 如果回應不是有效的 JSON，直接返回錯誤訊息
      return sendMessageToTelegramWithContext(context)(`錯誤: API回應錯誤，內容: ${text}`);
    }
  } catch (e) {
    return sendMessageToTelegramWithContext(context)(`錯誤: ${e.message}`);
  }
}

// 隨機密碼生成
async function generateRandomPassword(message, command, subcommand, context) {
  const url = 'http://answerbook.david888.com/RandomPassword';

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.RandomPassword) {
      return sendMessageToTelegramWithContext(context)(`${data.RandomPassword}`);
    } else {
      return sendMessageToTelegramWithContext(context)(`Failed to get a valid password from the API.`);
    }
  } catch (error) {
    return sendMessageToTelegramWithContext(context)(`錯誤: ${error.message}`);
  }
}


// DNS 查詢2 
async function commandDnsLookup2(message, command, subcommand, context) {
  const domainName = subcommand.trim(); // 获取用户输入的域名

  if (!domainName) {
    return sendMessageToTelegramWithContext(context)("請提供域名。用法：/dns <域名>");
  }

  const netlasapiKey = "VataPoHSxfdgneNnvGK9ylJsnqiurm0L"; // Your API key
  const url = `https://app.netlas.io/api/host/${domainName}/`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-API-Key': netlasapiKey
      }
    });

    const data = await response.json();

    // Check if the response contains the necessary DNS information
    if (!data || !data.dns) {
      return sendMessageToTelegramWithContext(context)(`錯誤: 無法查詢該域名的詳細信息。`);
    } else {
      const formattedDnsInfo = formatDnsInfo2(data);
      return sendMessageToTelegramWithContext(context)(formattedDnsInfo);
    }
  } catch (e) {
    return sendMessageToTelegramWithContext(context)(`ERROR: ${e.message}`);
  }
}

function formatDnsInfo2(data) {
  const dnsInfo = `
  域名: ${data.domain}
  相關域名數量: ${data.related_domains_count}
  相關域名: ${data.related_domains.join(', ')}

  DNS 記錄:
  A 記錄: ${data.dns.a.join(', ')}
  NS 記錄: ${data.dns.ns.join(', ')}
  MX 記錄: ${data.dns.mx.join(', ')}
  TXT 記錄: ${data.dns.txt.join(', ')}

  開放端口:
  ${data.ports.map(port => `協議: ${port.protocol}, 端口: ${port.port}`).join('\n')}

  軟體資訊:
  ${data.software.map(software => `URI: ${software.uri}, 標籤: ${software.tag.map(tag => tag.name).join(', ')}`).join('\n')}
  `;
  return dnsInfo;
}

// DNS 查詢 1
async function commandDnsLookup(message, command, subcommand, context) {
  const domainName = subcommand.trim(); // 获取用户输入的域名

  if (!domainName) {
    return sendMessageToTelegramWithContext(context)("請提供域名。用法：/dns <域名>");
  }

  const url = `https://1.1.1.1/dns-query?name=${domainName}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'accept': 'application/dns-json'
      }
    });

    const data = await response.json();

    // 检查是否返回了错误
    if (data.Status !== 0) {
      return sendMessageToTelegramWithContext(context)(`錯誤: DNS 查詢失敗，狀態碼 ${data.Status}`);
    } else {
      const formattedDnsInfo = formatDnsInfo(data);
      return sendMessageToTelegramWithContext(context)(formattedDnsInfo);
    }
  } catch (e) {
    return sendMessageToTelegramWithContext(context)(`ERROR: ${e.message}`);
  }
}

function formatDnsInfo(data) {
  const answers = data.Answer.map(answer => `${answer.name} -> ${answer.data}`).join('\n');
  return `
  查詢域名: ${data.Question[0].name}
  回應:
  ${answers}
  `;
}

// ip 地址查詢
async function commandIpLookup(message, command, subcommand, context) {
  const ipAddress = subcommand.trim(); // 获取用户输入的IP地址

  if (!ipAddress) {
    return sendMessageToTelegramWithContext(context)("請提供IP地址。用法：/ip <IP地址>");
  }

  const apiKey = "4a2ddcbdcb09b4"; // 你的 ipinfo.io API 密钥
  const url = `https://ipinfo.io/${ipAddress}?token=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    // 检查是否返回了错误
    if (data.error) {
      return sendMessageToTelegramWithContext(context)(`錯誤: ${data.error.message}`);
    } else {
      const formattedIpInfo = formatIpInfo(data);
      return sendMessageToTelegramWithContext(context)(formattedIpInfo);
    }
  } catch (e) {
    return sendMessageToTelegramWithContext(context)(`ERROR: ${e.message}`);
  }
}

function formatIpInfo(data) {
  return `
  IP地址: ${data.ip}
  主機名: ${data.hostname}
  城市: ${data.city}
  地區: ${data.region}
  國家: ${data.country}
  位置: ${data.loc}
  組織: ${data.org}
  時區: ${data.timezone}
  `;
}


//台灣天氣
async function commandWeather(message, command, subcommand, context) {
  const locationName = subcommand.trim(); // 获取用户输入的地区名

  if (!locationName) {
    return sendMessageToTelegramWithContext(context)("請提供地區名稱。用法：/wt <地區名稱>");
  }

  const url = `https://wttr.in/${encodeURIComponent(locationName)}?format=j1&lang=zh`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data && data.current_condition && data.current_condition.length > 0) {
      const formattedWeatherInfo = formatWeatherInfo(data);
      return sendMessageToTelegramWithContext(context)(formattedWeatherInfo);
    } else {
      return sendMessageToTelegramWithContext(context)(`未找到 ${locationName} 的天氣信息。`);
    }
  } catch (e) {
    return sendMessageToTelegramWithContext(context)(`ERROR: ${e.message}`);
  }
}

function formatWeatherInfo(data) {
  const locationName = data.nearest_area[0].areaName[0].value;
  const current = data.current_condition[0];
  const forecasts = data.weather;

  const currentWeather = `
當前天氣：
溫度：${current.temp_C}°C
體感溫度：${current.FeelsLikeC}°C
天氣狀況：${current.lang_zh[0].value}
降雨機率：${current.chanceofrain}%
濕度：${current.humidity}%
風速：${current.windspeedKmph} km/h
風向：${current.winddir16Point}
  `;

  const forecastInfo = forecasts.map((day, index) => {
    const date = new Date(day.date);
    const dayName = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][date.getDay()];
    return `
${index === 0 ? '今天' : index === 1 ? '明天' : dayName} (${day.date}):
天氣狀況：${day.hourly[4].lang_zh[0].value}
最高溫度：${day.maxtempC}°C
最低溫度：${day.mintempC}°C
降雨機率：${day.hourly[4].chanceofrain}%
    `;
  }).join('\n');

  return `
${locationName} 的天氣預報：

${currentWeather}

未來預報：
${forecastInfo}
  `;
}

// 台灣股票修正 20250120 使用新的 Yahoo Finance API，支援台股和美股
async function commandStockTW(message, command, subcommand, context) {
  const stockCode = subcommand.trim().toUpperCase();

  if (!stockCode) {
    return sendMessageToTelegramWithContext(context)("請提供股票代碼。用法：/stock <股票代碼或美股代碼>");
  }

  // 智慧判斷股票類型並格式化代碼
  const formattedCode = formatStockCode(stockCode);
  
  try {
    // 使用 Yahoo Finance API v8
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${formattedCode}`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
      throw new Error(`找不到股票代碼 ${stockCode} 的資料`);
    }

    const result = data.chart.result[0];
    const meta = result.meta;
    const quote = result.indicators.quote[0];
    
    if (!meta || !quote) {
      throw new Error("股票資料格式錯誤");
    }

    const stockType = detectStockType(formattedCode);
    const formattedStockInfo = formatUniversalStockData(meta, quote, stockCode, stockType);
    return sendMessageToTelegramWithContext(context)(formattedStockInfo);
    
  } catch (e) {
    console.error(`Stock Query Error: ${e.message}`); 
    return sendMessageToTelegramWithContext(context)(`查詢股票失敗: ${e.message}\n\n建議:\n1. 台股請輸入數字代碼 (如: 2330)\n2. 美股請輸入英文代碼 (如: TSLA, AAPL)\n3. 檢查是否為交易時間\n4. 稍後再試`);
  }
}

// 智慧判斷並格式化股票代碼
function formatStockCode(stockCode) {
  // 如果已經包含交易所後綴，直接返回
  if (stockCode.includes('.') || /^[A-Z]+$/.test(stockCode)) {
    return stockCode;
  }
  
  // 如果是純數字，判斷為台股，加上 .TW
  if (/^\d+$/.test(stockCode)) {
    return `${stockCode}.TW`;
  }
  
  // 其他情況（混合字母數字）直接返回，讓 API 自行判斷
  return stockCode;
}

// 檢測股票類型
function detectStockType(formattedCode) {
  if (formattedCode.endsWith('.TW')) {
    return 'taiwan';
  } else if (formattedCode.endsWith('.HK')) {
    return 'hongkong';
  } else if (formattedCode.includes('.')) {
    return 'international';
  } else {
    return 'us'; // 預設為美股
  }
}

function formatUniversalStockData(meta, quote, originalCode, stockType) {
  const symbol = meta.symbol || originalCode;
  const currency = meta.currency || 'USD';
  const exchangeName = meta.exchangeName || meta.fullExchangeName || '未知交易所';
  
  // 股票完整名稱 - 優先使用 longName 或 shortName
  const stockName = meta.longName || meta.shortName || meta.displayName || '';
  
  // 當前價格
  const currentPrice = meta.regularMarketPrice || meta.previousClose;
  const previousClose = meta.previousClose;
  
  // 計算漲跌
  const change = currentPrice - previousClose;
  const changePercent = ((change / previousClose) * 100);
  
  // 今日開高低量
  const dayHigh = meta.regularMarketDayHigh || 'N/A';
  const dayLow = meta.regularMarketDayLow || 'N/A';
  const dayOpen = quote.open ? quote.open[quote.open.length - 1] : meta.regularMarketOpen || 'N/A';
  const volume = meta.regularMarketVolume || 'N/A';
  
  // 根據股票類型設定標題和格式
  const marketEmoji = getMarketEmoji(stockType);
  
  // 格式化數字
  const formatNumber = (num) => {
    if (typeof num !== 'number') return num;
    return num.toLocaleString('zh-TW', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatVolume = (vol) => {
    if (typeof vol !== 'number') return vol;
    if (vol >= 1000000000) {
      return `${(vol / 1000000000).toFixed(1)}B`;
    } else if (vol >= 1000000) {
      return `${(vol / 1000000).toFixed(1)}M`;
    } else if (vol >= 1000) {
      return `${(vol / 1000).toFixed(1)}K`;
    }
    return vol.toLocaleString();
  };

  // 判斷漲跌顏色符號
  const trendSymbol = change > 0 ? '📈' : change < 0 ? '📉' : '➡️';
  const changeSymbol = change > 0 ? '+' : '';

  return `${marketEmoji} **${symbol}** ${stockName ? `(${stockName})` : ''}

💰 **現價**: ${formatNumber(currentPrice)} ${currency}
${trendSymbol} **漲跌**: ${changeSymbol}${formatNumber(change)} (${changeSymbol}${changePercent.toFixed(2)}%)

📈 **今日最高**: ${formatNumber(dayHigh)}
📉 **今日最低**: ${formatNumber(dayLow)}  
🔓 **開盤價**: ${formatNumber(dayOpen)}
📊 **成交量**: ${formatVolume(volume)}
🔒 **昨收**: ${formatNumber(previousClose)}

⏰ 資料來源: Yahoo Finance`;
}

// 根據股票類型獲取市場表情符號
function getMarketEmoji(stockType) {
  switch (stockType) {
    case 'taiwan': return '🇹🇼';
    case 'us': return '🇺🇸';
    case 'hongkong': return '🇭🇰';
    case 'international': return '🌍';
    default: return '📊';
  }
}

// 根據股票類型獲取市場名稱
function getMarketName(stockType) {
  switch (stockType) {
    case 'taiwan': return '台灣證券交易所';
    case 'us': return 'US Market';
    case 'hongkong': return '香港證券交易所';
    case 'international': return 'International Market';
    default: return '';
  }
}

//國際股票
async function commandStock(message, command, subcommand, context) {
  const stockSymbol = subcommand.trim().toUpperCase(); // 获取用户输入的股票代码，并转换为大写

  if (!stockSymbol) {
    return sendMessageToTelegramWithContext(context)("請提供股票代號。用法：/stock2 <股票代號>");
  }

  const apiKey = "psHDQQHMeQMi9fpTXvxa8D6JR8zaPB9q"; // 你的 API 密钥
  const url = `https://financialmodelingprep.com/api/v3/quote/${stockSymbol}?apikey=${apiKey}`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'request'
      }
    });

    const data = await response.json();

    if (data && data.length > 0) {
      const stockInfo = data[0];
      const formattedStockInfo = formatStockInfo(stockInfo);
      return sendMessageToTelegramWithContext(context)(formattedStockInfo);
    } else {
      return sendMessageToTelegramWithContext(context)(
        `未找到 ${stockSymbol} 的股票信息。請確認股票代號是否正確。`
      );
    }
    
  } catch (e) {
    console.error("Fetch error:", e);
    return sendMessageToTelegramWithContext(context)(`ERROR: ${e.message}`);
  }
}


function formatStockInfo(stock) {
  return `
  股票名稱: ${stock.name} (${stock.symbol})
  當前價格: $${stock.price.toFixed(2)}
  今日漲跌: ${stock.change.toFixed(2)} (${stock.changesPercentage.toFixed(2)}%)
  今日最低價: $${stock.dayLow.toFixed(2)}
  今日最高價: $${stock.dayHigh.toFixed(2)}
  年度最低價: $${stock.yearLow.toFixed(2)}
  年度最高價: $${stock.yearHigh.toFixed(2)}
  市值: $${(stock.marketCap / 1e9).toFixed(2)} 十億美元
  交易所: ${stock.exchange}
  成交量: ${stock.volume.toLocaleString()}
  平均成交量: ${stock.avgVolume.toLocaleString()}
  開盤價: $${stock.open.toFixed(2)}
  昨日收盤價: $${stock.previousClose.toFixed(2)}
  每股收益 (EPS): $${stock.eps.toFixed(2)}
  市盈率 (P/E): ${stock.pe.toFixed(2)}
  `;
}


// 新增的 /dictcn 中文字典指令功能
async function commandDictCN(message, command, subcommand, context) {
  if (!subcommand) {
    return sendMessageToTelegramWithContext(context)("請提供中文字以供查詢 如 /dictcn 福");
  }

  try {
    const response = await fetch(`https://www.moedict.tw/raw/${encodeURIComponent(subcommand)}`);
    const data = await response.json();
    const formattedDict = formatDictionaryData(data);
    return sendMessageToTelegramWithContext(context)(formattedDict);
  } catch (e) {
    return sendMessageToTelegramWithContext(context)(`ERROR: ${e.message}`);
  }
}

// 新增的 /dicten 英文字典功能
async function commandDictEN(message, command, subcommand, context) {
  if (!subcommand) {
    return sendMessageToTelegramWithContext(context)("Please provide a word to look up. Usage: /dicten <word>");
  }
  
  try {
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(subcommand)}`);
    const data = await response.json();
    const formattedDict = formatDictionaryDataEN(data);
    return sendMessageToTelegramWithContext(context)(formattedDict);
  } catch (e) {
    return sendMessageToTelegramWithContext(context)(`ERROR: ${e.message}`);
  }
}

function formatDictionaryDataEN(data) {
  if (!Array.isArray(data) || data.length === 0) {
    return "No definitions found for the provided word.";
  }

  const entry = data[0];
  const word = entry.word;
  const phonetic = entry.phonetic ? `Phonetic: ${entry.phonetic}\n` : '';
  const origin = entry.origin ? `Origin: ${entry.origin}\n` : '';
  const meanings = entry.meanings.map(meaning => {
    const partOfSpeech = meaning.partOfSpeech;
    const definitions = meaning.definitions.map(def => {
      const definition = def.definition;
      const example = def.example ? `Example: ${def.example}` : '';
      return `- ${definition}\n${example}`;
    }).join('\n');
    return `\nPart of Speech: ${partOfSpeech}\n${definitions}`;
  }).join('\n');

  return `Word: ${word}\n${phonetic}${origin}${meanings}`;
}



// 字典數據格式化
function formatDictionaryData(data) {
  const title = data.title;
  const definitions = data.heteronyms.map(heteronym => {
    const pinyin = heteronym.pinyin;
    const bopomofo = heteronym.bopomofo;
    const definitions = heteronym.definitions.map(def => {
      const type = def.type;
      const definition = def.def;
      const example = def.example ? `\n範例: ${def.example.join(', ')}` : '';
      return `詞性: ${type}\n解釋: ${definition}${example}`;
    }).join('\n\n');

    return `拼音: ${pinyin}\n注音: ${bopomofo}\n${definitions}`;
  }).join('\n\n');

  return `字詞: ${title}\n\n${definitions}`;
}


async function commandGenerateImg(message, command, subcommand, context) {
  if (subcommand === "") {
    return sendMessageToTelegramWithContext(context)(ENV.I18N.command.help.img);
  }
  try {
    const gen = loadImageGen(context)?.request;
    if (!gen) {
      return sendMessageToTelegramWithContext(context)("ERROR: Image generator not found");
    }
    setTimeout(() => sendChatActionToTelegramWithContext(context)("upload_photo").catch(console.error), 0);
    const img = await gen(subcommand, context);
    return sendPhotoToTelegramWithContext(context)(img);
  } catch (e) {
    return sendMessageToTelegramWithContext(context)(`ERROR: ${e.message}`);
  }
}

async function commandGenerateImg2(message, command, subcommand, context) {
  if (subcommand === "") {
    return sendMessageToTelegramWithContext(context)("請提供圖片描述，例如：`/img2 月光下的沙灘`");
  }
  
  try {
    // 檢查可用的圖片生成器
    const availableGenerators = [];
    
    for (const imgGen of imageGenAgents) {
      if (imgGen.enable(context)) {
        availableGenerators.push(imgGen);
      }
    }
    
    if (availableGenerators.length === 0) {
      return sendMessageToTelegramWithContext(context)("ERROR: 沒有可用的圖片生成器，請檢查 API 密鑰設定");
    }
    
    setTimeout(() => sendChatActionToTelegramWithContext(context)("upload_photo").catch(console.error), 0);
    
    // 同時調用所有可用的生成器
    const imagePromises = availableGenerators.map(async (gen) => {
      try {
        const img = await gen.request(subcommand, context);
        return { generator: gen.name, image: img, success: true };
      } catch (e) {
        console.error(`Error generating image with ${gen.name}:`, e);
        return { generator: gen.name, error: e.message, success: false };
      }
    });
    
    const results = await Promise.all(imagePromises);
    
    // 發送成功的圖片
    let successCount = 0;
    for (const result of results) {
      if (result.success) {
        successCount++;
        await sendPhotoToTelegramWithContext(context)(result.image);
      }
    }
    
    // 如果沒有成功的圖片，發送錯誤信息
    if (successCount === 0) {
      const errorMessages = results.map(r => `${r.generator}: ${r.error}`).join('\n');
      return sendMessageToTelegramWithContext(context)(`所有圖片生成都失敗了：\n${errorMessages}`);
    }
    
    // 如果有部分成功，發送總結信息
    if (successCount < results.length) {
      const failedGenerators = results.filter(r => !r.success).map(r => r.generator).join(', ');
      return sendMessageToTelegramWithContext(context)(`成功生成 ${successCount}/${results.length} 張圖片\n失敗的生成器: ${failedGenerators}`);
    }
    
  } catch (e) {
    return sendMessageToTelegramWithContext(context)(`ERROR: ${e.message}`);
  }
}

async function commandSetImageProvider(message, command, subcommand, context) {
  const validProviders = ["auto", "openai", "azure", "gemini", "workers"];
  
  if (subcommand === "") {
    // 顯示當前設定和可用選項
    const currentProvider = context.USER_CONFIG.AI_IMAGE_PROVIDER || "auto";
    const currentImageAgent = loadImageGen(context);
    const currentModel = currentImageAgent ? currentImageModel(currentImageAgent.name, context) : "未知";
    
    let msg = `🎨 **圖片生成設定**\n\n`;
    msg += `📋 **當前設定**: ${currentProvider}\n`;
    msg += `🤖 **當前模型**: ${currentModel}\n\n`;
    msg += `📝 **可用選項**:\n`;
    msg += `• auto - 自動選擇可用的服務\n`;
    msg += `• openai - OpenAI DALL-E / GPT-Image-1\n`;
    msg += `• azure - Azure OpenAI DALL-E\n`;
    msg += `• gemini - Gemini 2.5 Flash Image\n`;
    msg += `• workers - Cloudflare Workers AI\n\n`;
    msg += `💡 **使用方法**: \`/setimg <provider>\`\n`;
    msg += `📝 **範例**: \`/setimg gemini\``;
    
    context.CURRENT_CHAT_CONTEXT.parse_mode = "Markdown";
    return sendMessageToTelegramWithContext(context)(msg);
  }
  
  const provider = subcommand.toLowerCase().trim();
  
  if (!validProviders.includes(provider)) {
    return sendMessageToTelegramWithContext(context)(
      `❌ 無效的圖片生成服務: ${provider}\n\n` +
      `✅ 可用選項: ${validProviders.join(", ")}`
    );
  }
  
  try {
    // 更新配置
    context.USER_CONFIG.AI_IMAGE_PROVIDER = provider;
    
    // 保存配置到資料庫
    await DATABASE.put(
      context.SHARE_CONTEXT.configStoreKey,
      JSON.stringify(trimUserConfig(context.USER_CONFIG))
    );
    
    // 檢查設定的服務是否可用
    let statusMsg = `✅ **圖片生成服務已設定為**: ${provider}\n\n`;
    
    if (provider !== "auto") {
      const imageAgent = loadImageGen(context);
      if (imageAgent && imageAgent.name === provider) {
        const currentModel = currentImageModel(provider, context);
        statusMsg += `🤖 **使用模型**: ${currentModel}\n`;
        statusMsg += `✅ **狀態**: 服務可用`;
      } else {
        statusMsg += `⚠️ **警告**: 所選服務目前不可用，將自動回退到其他可用服務`;
      }
    } else {
      const imageAgent = loadImageGen(context);
      if (imageAgent) {
        const currentModel = currentImageModel(imageAgent.name, context);
        statusMsg += `🤖 **自動選擇**: ${imageAgent.name} (${currentModel})\n`;
        statusMsg += `✅ **狀態**: 服務可用`;
      } else {
        statusMsg += `❌ **錯誤**: 沒有可用的圖片生成服務`;
      }
    }
    
    context.CURRENT_CHAT_CONTEXT.parse_mode = "Markdown";
    return sendMessageToTelegramWithContext(context)(statusMsg);
    
  } catch (e) {
    return sendMessageToTelegramWithContext(context)(`ERROR: ${e.message}`);
  }
}

async function commandGetHelp(message, command, subcommand, context) {
  let helpMsg = ENV.I18N.command.help.summary + "\n";
  helpMsg += Object.keys(commandHandlers).map((key) => `${key}\uFF1A${ENV.I18N.command.help[key.substring(1)]}`).join("\n");
  helpMsg += Object.keys(CUSTOM_COMMAND).filter((key) => !!CUSTOM_COMMAND_DESCRIPTION[key]).map((key) => `${key}\uFF1A${CUSTOM_COMMAND_DESCRIPTION[key]}`).join("\n");
  return sendMessageToTelegramWithContext(context)(helpMsg);
}
async function commandCreateNewChatContext(message, command, subcommand, context) {
  try {
    await DATABASE.delete(context.SHARE_CONTEXT.chatHistoryKey);
    context.CURRENT_CHAT_CONTEXT.reply_markup = JSON.stringify({
      remove_keyboard: true,
      selective: true
    });
    if (command === "/new") {
      return sendMessageToTelegramWithContext(context)(ENV.I18N.command.new.new_chat_start);
    } else {
      return sendMessageToTelegramWithContext(context)(`${ENV.I18N.command.new.new_chat_start}(${context.CURRENT_CHAT_CONTEXT.chat_id})`);
    }
  } catch (e) {
    return sendMessageToTelegramWithContext(context)(`ERROR: ${e.message}`);
  }
}
async function commandUpdateUserConfig(message, command, subcommand, context) {
  const kv = subcommand.indexOf("=");
  if (kv === -1) {
    return sendMessageToTelegramWithContext(context)(ENV.I18N.command.help.setenv);
  }
  let key = subcommand.slice(0, kv);
  const value = subcommand.slice(kv + 1);
  key = ENV_KEY_MAPPER[key] || key;
  if (ENV.LOCK_USER_CONFIG_KEYS.includes(key)) {
    return sendMessageToTelegramWithContext(context)(`Key ${key} is locked`);
  }
  if (!Object.keys(context.USER_CONFIG).includes(key)) {
    return sendMessageToTelegramWithContext(context)(`Key ${key} not found`);
  }
  try {
    context.USER_CONFIG.DEFINE_KEYS.push(key);
    context.USER_CONFIG.DEFINE_KEYS = Array.from(new Set(context.USER_CONFIG.DEFINE_KEYS));
    mergeEnvironment(context.USER_CONFIG, {
      [key]: value
    });
    console.log("Update user config: ", key, context.USER_CONFIG[key]);
    await DATABASE.put(
      context.SHARE_CONTEXT.configStoreKey,
      JSON.stringify(trimUserConfig(context.USER_CONFIG))
    );
    return sendMessageToTelegramWithContext(context)("Update user config success");
  } catch (e) {
    return sendMessageToTelegramWithContext(context)(`ERROR: ${e.message}`);
  }
}
async function commandUpdateUserConfigs(message, command, subcommand, context) {
  try {
    const values = JSON.parse(subcommand);
    const configKeys = Object.keys(context.USER_CONFIG);
    for (const ent of Object.entries(values)) {
      let [key, value] = ent;
      key = ENV_KEY_MAPPER[key] || key;
      if (ENV.LOCK_USER_CONFIG_KEYS.includes(key)) {
        return sendMessageToTelegramWithContext(context)(`Key ${key} is locked`);
      }
      if (!configKeys.includes(key)) {
        return sendMessageToTelegramWithContext(context)(`Key ${key} not found`);
      }
      context.USER_CONFIG.DEFINE_KEYS.push(key);
      mergeEnvironment(context.USER_CONFIG, {
        [key]: value
      });
      console.log("Update user config: ", key, context.USER_CONFIG[key]);
    }
    context.USER_CONFIG.DEFINE_KEYS = Array.from(new Set(context.USER_CONFIG.DEFINE_KEYS));
    await DATABASE.put(
      context.SHARE_CONTEXT.configStoreKey,
      JSON.stringify(trimUserConfig(trimUserConfig(context.USER_CONFIG)))
    );
    return sendMessageToTelegramWithContext(context)("Update user config success");
  } catch (e) {
    return sendMessageToTelegramWithContext(context)(`ERROR: ${e.message}`);
  }
}
async function commandDeleteUserConfig(message, command, subcommand, context) {
  if (ENV.LOCK_USER_CONFIG_KEYS.includes(subcommand)) {
    const msg = `Key ${subcommand} is locked`;
    return sendMessageToTelegramWithContext(context)(msg);
  }
  try {
    context.USER_CONFIG[subcommand] = null;
    context.USER_CONFIG.DEFINE_KEYS = context.USER_CONFIG.DEFINE_KEYS.filter((key) => key !== subcommand);
    await DATABASE.put(
      context.SHARE_CONTEXT.configStoreKey,
      JSON.stringify(trimUserConfig(context.USER_CONFIG))
    );
    return sendMessageToTelegramWithContext(context)("Delete user config success");
  } catch (e) {
    return sendMessageToTelegramWithContext(context)(`ERROR: ${e.message}`);
  }
}
async function commandClearUserConfig(message, command, subcommand, context) {
  try {
    await DATABASE.put(
      context.SHARE_CONTEXT.configStoreKey,
      JSON.stringify({})
    );
    return sendMessageToTelegramWithContext(context)("Clear user config success");
  } catch (e) {
    return sendMessageToTelegramWithContext(context)(`ERROR: ${e.message}`);
  }
}
async function commandFetchUpdate(message, command, subcommand, context) {
  const current = {
    ts: ENV.BUILD_TIMESTAMP,
    sha: ENV.BUILD_VERSION
  };
  try {
    const info = `https://raw.githubusercontent.com/TBXark/ChatGPT-Telegram-Workers/${ENV.UPDATE_BRANCH}/dist/buildinfo.json`;
    const online = await fetch(info).then((r) => r.json());
    const timeFormat = (ts) => {
      return new Date(ts * 1e3).toLocaleString("en-US", {});
    };
    if (current.ts < online.ts) {
      return sendMessageToTelegramWithContext(context)(`New version detected: ${online.sha}(${timeFormat(online.ts)})
Current version: ${current.sha}(${timeFormat(current.ts)})`);
    } else {
      return sendMessageToTelegramWithContext(context)(`Current version: ${current.sha}(${timeFormat(current.ts)}) is up to date`);
    }
  } catch (e) {
    return sendMessageToTelegramWithContext(context)(`ERROR: ${e.message}`);
  }
}
async function commandSystem(message, command, subcommand, context) {
  let chatAgent = loadChatLLM(context)?.name;
  let imageAgent = loadImageGen(context)?.name;
  const agent = {
    AI_PROVIDER: chatAgent,
    AI_IMAGE_PROVIDER: imageAgent
  };
  if (chatModelKey(chatAgent)) {
    agent[chatModelKey(chatAgent)] = currentChatModel(chatAgent, context);
  }
  if (imageModelKey(imageAgent)) {
    agent[imageModelKey(imageAgent)] = currentImageModel(imageAgent, context);
  }
  let msg = `AGENT: ${JSON.stringify(agent, null, 2)}
`;
  if (ENV.DEV_MODE) {
    const shareCtx = { ...context.SHARE_CONTEXT };
    shareCtx.currentBotToken = "******";
    context.USER_CONFIG.OPENAI_API_KEY = ["******"];
    context.USER_CONFIG.AZURE_API_KEY = "******";
    context.USER_CONFIG.AZURE_COMPLETIONS_API = "******";
    context.USER_CONFIG.AZURE_DALLE_API = "******";
    context.USER_CONFIG.CLOUDFLARE_ACCOUNT_ID = "******";
    context.USER_CONFIG.CLOUDFLARE_TOKEN = "******";
    context.USER_CONFIG.GOOGLE_API_KEY = "******";
    context.USER_CONFIG.MISTRAL_API_KEY = "******";
    context.USER_CONFIG.COHERE_API_KEY = "******";
    context.USER_CONFIG.ANTHROPIC_API_KEY = "******";
    const config = trimUserConfig(context.USER_CONFIG);
    msg = "<pre>\n" + msg;
    msg += `USER_CONFIG: ${JSON.stringify(config, null, 2)}
`;
    msg += `CHAT_CONTEXT: ${JSON.stringify(context.CURRENT_CHAT_CONTEXT, null, 2)}
`;
    msg += `SHARE_CONTEXT: ${JSON.stringify(shareCtx, null, 2)}
`;
    msg += "</pre>";
  }
  context.CURRENT_CHAT_CONTEXT.parse_mode = "HTML";
  return sendMessageToTelegramWithContext(context)(msg);
}
async function commandRegenerate(message, command, subcommand, context) {
  const mf = (history, text) => {
    let nextText = text;
    if (!(history && Array.isArray(history) && history.length > 0)) {
      throw new Error("History not found");
    }
    const historyCopy = structuredClone(history);
    while (true) {
      const data = historyCopy.pop();
      if (data === void 0 || data === null) {
        break;
      } else if (data.role === "user") {
        if (text === "" || text === void 0 || text === null) {
          nextText = data.content;
        }
        break;
      }
    }
    if (subcommand) {
      nextText = subcommand;
    }
    return { history: historyCopy, message: nextText };
  };
  return chatWithLLM({ message: null }, context, mf);
}
async function commandEcho(message, command, subcommand, context) {
  let msg = "<pre>";
  msg += JSON.stringify({ message }, null, 2);
  msg += "</pre>";
  context.CURRENT_CHAT_CONTEXT.parse_mode = "HTML";
  return sendMessageToTelegramWithContext(context)(msg);
}
async function handleCommandMessage(message, context) {
  if (ENV.DEV_MODE) {
    commandHandlers["/echo"] = {
      help: "[DEBUG ONLY] echo message",
      scopes: ["all_private_chats", "all_chat_administrators"],
      fn: commandEcho,
      needAuth: commandAuthCheck.default
    };
  }
  if (CUSTOM_COMMAND[message.text]) {
    message.text = CUSTOM_COMMAND[message.text];
  }
  for (const key in commandHandlers) {
    if (message.text === key || message.text.startsWith(key + " ")) {
      const command = commandHandlers[key];
      try {
        if (command.needAuth) {
          const roleList = command.needAuth(context.SHARE_CONTEXT.chatType);
          if (roleList) {
            const chatRole = await getChatRoleWithContext(context)(context.SHARE_CONTEXT.speakerId);
            if (chatRole === null) {
              return sendMessageToTelegramWithContext(context)("ERROR: Get chat role failed");
            }
            if (!roleList.includes(chatRole)) {
              return sendMessageToTelegramWithContext(context)(`ERROR: Permission denied, need ${roleList.join(" or ")}`);
            }
          }
        }
      } catch (e) {
        return sendMessageToTelegramWithContext(context)(`ERROR: ${e.message}`);
      }
      const subcommand = message.text.substring(key.length).trim();
      try {
        return await command.fn(message, key, subcommand, context);
      } catch (e) {
        return sendMessageToTelegramWithContext(context)(`ERROR: ${e.message}`);
      }
    }
  }
  return null;
}
async function bindCommandForTelegram(token) {
  const scopeCommandMap = {
    all_private_chats: [],
    all_group_chats: [],
    all_chat_administrators: []
  };
  for (const key of commandSortList) {
    if (ENV.HIDE_COMMAND_BUTTONS.includes(key)) {
      continue;
    }
    if (Object.prototype.hasOwnProperty.call(commandHandlers, key) && commandHandlers[key].scopes) {
      for (const scope of commandHandlers[key].scopes) {
        if (!scopeCommandMap[scope]) {
          scopeCommandMap[scope] = [];
        }
        scopeCommandMap[scope].push(key);
      }
    }
  }
  const result = {};
  for (const scope in scopeCommandMap) {
    result[scope] = await fetch(
      `https://api.telegram.org/bot${token}/setMyCommands`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          commands: scopeCommandMap[scope].map((command) => ({
            command,
            description: ENV.I18N.command.help[command.substring(1)] || ""
          })),
          scope: {
            type: scope
          }
        })
      }
    ).then((res) => res.json());
  }
  return { ok: true, result };
}
function commandsDocument() {
  return Object.keys(commandHandlers).map((key) => {
    return {
      command: key,
      description: ENV.I18N.command.help[key.substring(1)]
    };
  });
}

// src/utils/utils.js
function renderHTML(body) {
  return `
<html>  
  <head>
    <title>ChatGPT-Telegram-Workers</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="ChatGPT-Telegram-Workers">
    <meta name="author" content="TBXark">
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
        font-size: 1rem;
        font-weight: 400;
        line-height: 1.5;
        color: #212529;
        text-align: left;
        background-color: #fff;
      }
      h1 {
        margin-top: 0;
        margin-bottom: 0.5rem;
      }
      p {
        margin-top: 0;
        margin-bottom: 1rem;
      }
      a {
        color: #007bff;
        text-decoration: none;
        background-color: transparent;
      }
      a:hover {
        color: #0056b3;
        text-decoration: underline;
      }
      strong {
        font-weight: bolder;
      }
    </style>
  </head>
  <body>
    ${body}
  </body>
</html>
  `;
}
function errorToString(e) {
  return JSON.stringify({
    message: e.message,
    stack: e.stack
  });
}
function makeResponse200(resp) {
  if (resp === null) {
    return new Response("NOT HANDLED", { status: 200 });
  }
  if (resp.status === 200) {
    return resp;
  } else {
    return new Response(resp.body, {
      status: 200,
      headers: {
        "Original-Status": resp.status,
        ...resp.headers
      }
    });
  }
}

// src/telegram/message.js
async function msgInitChatContext(message, context) {
  await context.initContext(message);
  return null;
}
async function msgSaveLastMessage(message, context) {
  if (ENV.DEBUG_MODE) {
    const lastMessageKey = `last_message:${context.SHARE_CONTEXT.chatHistoryKey}`;
    await DATABASE.put(lastMessageKey, JSON.stringify(message), { expirationTtl: 3600 });
  }
  return null;
}
async function msgIgnoreOldMessage(message, context) {
  if (ENV.SAFE_MODE) {
    let idList = [];
    try {
      idList = JSON.parse(await DATABASE.get(context.SHARE_CONTEXT.chatLastMessageIdKey).catch(() => "[]")) || [];
    } catch (e) {
      console.error(e);
    }
    if (idList.includes(message.message_id)) {
      throw new Error("Ignore old message");
    } else {
      idList.push(message.message_id);
      if (idList.length > 100) {
        idList.shift();
      }
      await DATABASE.put(context.SHARE_CONTEXT.chatLastMessageIdKey, JSON.stringify(idList));
    }
  }
  return null;
}
async function msgCheckEnvIsReady(message, context) {
  if (!DATABASE) {
    return sendMessageToTelegramWithContext(context)("DATABASE Not Set");
  }
  return null;
}
async function msgFilterWhiteList(message, context) {
  if (ENV.I_AM_A_GENEROUS_PERSON) {
    return null;
  }
  if (context.SHARE_CONTEXT.chatType === "private") {
    if (!ENV.CHAT_WHITE_LIST.includes(`${context.CURRENT_CHAT_CONTEXT.chat_id}`)) {
      return sendMessageToTelegramWithContext(context)(
        `You are not in the white list, please contact the administrator to add you to the white list. Your chat_id: ${context.CURRENT_CHAT_CONTEXT.chat_id}`
      );
    }
    return null;
  }
  if (CONST.GROUP_TYPES.includes(context.SHARE_CONTEXT.chatType)) {
    if (!ENV.GROUP_CHAT_BOT_ENABLE) {
      throw new Error("Not support");
    }
    if (!ENV.CHAT_GROUP_WHITE_LIST.includes(`${context.CURRENT_CHAT_CONTEXT.chat_id}`)) {
      return sendMessageToTelegramWithContext(context)(
        `Your group are not in the white list, please contact the administrator to add you to the white list. Your chat_id: ${context.CURRENT_CHAT_CONTEXT.chat_id}`
      );
    }
    return null;
  }
  return sendMessageToTelegramWithContext(context)(
    `Not support chat type: ${context.SHARE_CONTEXT.chatType}`
  );
}
async function msgFilterUnsupportedMessage(message, context) {
  if (message.text) {
    return null;
  }
  if (message.caption) {
    return null;
  }
  if (message.photo) {
    return null;
  }
  throw new Error("Not supported message type");
}
async function msgHandleGroupMessage(message, context) {
  if (!CONST.GROUP_TYPES.includes(context.SHARE_CONTEXT.chatType)) {
    return null;
  }
  let botName = context.SHARE_CONTEXT.currentBotName;
  if (message.reply_to_message) {
    if (`${message.reply_to_message.from.id}` === context.SHARE_CONTEXT.currentBotId) {
      return null;
    } else if (ENV.EXTRA_MESSAGE_CONTEXT) {
      context.SHARE_CONTEXT.extraMessageContext = message.reply_to_message;
    }
  }
  if (!botName) {
    const res = await getBot(context.SHARE_CONTEXT.currentBotToken);
    context.SHARE_CONTEXT.currentBotName = res.info.bot_name;
    botName = res.info.bot_name;
  }
  if (!botName) {
    throw new Error("Not set bot name");
  }
  if (!message.entities) {
    throw new Error("No entities");
  }
  const { text, caption } = message;
  let originContent = text || caption || "";
  if (!originContent) {
    throw new Error("Empty message");
  }
  let content = "";
  let offset = 0;
  let mentioned = false;
  for (const entity of message.entities) {
    switch (entity.type) {
      case "bot_command":
        if (!mentioned) {
          const mention = originContent.substring(
            entity.offset,
            entity.offset + entity.length
          );
          if (mention.endsWith(botName)) {
            mentioned = true;
          }
          const cmd = mention.replaceAll("@" + botName, "").replaceAll(botName, "").trim();
          content += cmd;
          offset = entity.offset + entity.length;
        }
        break;
      case "mention":
      case "text_mention":
        if (!mentioned) {
          const mention = originContent.substring(
            entity.offset,
            entity.offset + entity.length
          );
          if (mention === botName || mention === "@" + botName) {
            mentioned = true;
          }
        }
        content += originContent.substring(offset, entity.offset);
        offset = entity.offset + entity.length;
        break;
    }
  }
  content += originContent.substring(offset, originContent.length);
  message.text = content.trim();
  if (!mentioned) {
    throw new Error("No mentioned");
  }
  return null;
}
async function msgHandleCommand(message, context) {
  if (!message.text) {
    return null;
  }
  return await handleCommandMessage(message, context);
}

// 🌤️🔮 智能功能檢測處理器 (天氣 + 奇門遁甲)
async function msgSmartWeatherDetection(message, context) {
  // 只處理文字消息
  if (!message.text) {
    return null;
  }

  // 跳過命令消息（以 / 開頭）
  if (message.text.startsWith('/')) {
    return null;
  }

  const text = message.text.toLowerCase();
  
  // 檢測天氣相關關鍵字
  const weatherKeywords = ['天氣', '氣象', '溫度', '下雨', '晴天', '陰天', '颱風', '氣溫'];
  const hasWeatherKeyword = weatherKeywords.some(keyword => text.includes(keyword));
  
  if (hasWeatherKeyword) {
    console.log('🌤️ 檢測到天氣查詢:', message.text);

    // 提取台灣地區名稱
    const taiwanCities = [
      '台北', '新北', '桃園', '台中', '台南', '高雄', 
      '基隆', '新竹', '苗栗', '彰化', '南投', '雲林', 
      '嘉義', '屏東', '宜蘭', '花蓮', '台東', '澎湖', 
      '金門', '連江', '馬祖'
    ];
    
    let location = '台北'; // 預設地點
    
    // 查找消息中提到的城市
    for (const city of taiwanCities) {
      if (message.text.includes(city)) {
        location = city;
        break;
      }
    }

    console.log(`🌤️ 自動查詢 ${location} 天氣`);

    // 直接調用天氣命令
    return await commandWeather(
      { text: `/wt ${location}` }, 
      '/wt', 
      location, 
      context
    );
  }

  // 檢測奇門遁甲相關關鍵字
  const qimenKeywords = [
    '奇門', '遁甲', '奇門遁甲', '占卜', '卜卦'
  ];
  
  const hasQimenKeyword = qimenKeywords.some(keyword => text.includes(keyword));
  
  if (hasQimenKeyword) {
    console.log('🔮 檢測到奇門遁甲查詢:', message.text);
    
    // 直接使用用戶的完整問題
    const question = message.text;
    
    console.log(`🔮 自動進行奇門遁甲占卜: ${question}`);
    
    // 直接調用奇門遁甲命令
    return await commandQimen(
      { text: `/qi ${question}` },
      '/qi',
      question,
      context
    );
  }

  // 都沒有匹配到
  return null;
}

async function msgChatWithLLM(message, context) {
  const { text, caption } = message;
  let content = text || caption;
  if (ENV.EXTRA_MESSAGE_CONTEXT && context.SHARE_CONTEXT.extraMessageContext && context.SHARE_CONTEXT.extraMessageContext.text) {
    content = context.SHARE_CONTEXT.extraMessageContext.text + "\n" + text;
  }
  const params = { message: content };
  if (message.photo && message.photo.length > 0) {
    let sizeIndex = 0;
    if (ENV.TELEGRAM_PHOTO_SIZE_OFFSET >= 0) {
      sizeIndex = ENV.TELEGRAM_PHOTO_SIZE_OFFSET;
    } else if (ENV.TELEGRAM_PHOTO_SIZE_OFFSET < 0) {
      sizeIndex = message.photo.length + ENV.TELEGRAM_PHOTO_SIZE_OFFSET;
    }
    sizeIndex = Math.max(0, Math.min(sizeIndex, message.photo.length - 1));
    const fileId = message.photo[sizeIndex].file_id;
    let url = await getFileLink(fileId, context.SHARE_CONTEXT.currentBotToken);
    if (ENV.TELEGRAPH_ENABLE) {
      url = await uploadImageToTelegraph(url);
    }
    params.images = [url];
  }
  return chatWithLLM(params, context, null);
}
function loadMessage(body) {
  if (body?.edited_message) {
    throw new Error("Ignore edited message");
  }
  if (body?.message) {
    return body?.message;
  } else {
    throw new Error("Invalid message");
  }
}
async function handleMessage(token, body) {
  const context = new Context();
  context.initTelegramContext(token);
  const message = loadMessage(body);
  const handlers = [
    // 初始化聊天上下文: 生成chat_id, reply_to_message_id(群组消息), SHARE_CONTEXT
    msgInitChatContext,
    // 检查环境是否准备好: DATABASE
    msgCheckEnvIsReady,
    // 过滤非白名单用户, 提前过滤减少KV消耗
    msgFilterWhiteList,
    // 过滤不支持的消息(抛出异常结束消息处理)
    msgFilterUnsupportedMessage,
    // 处理群消息，判断是否需要响应此条消息
    msgHandleGroupMessage,
    // 忽略旧消息
    msgIgnoreOldMessage,
    // DEBUG: 保存最后一条消息,按照需求自行调整此中间件位置
    msgSaveLastMessage,
    // 处理命令消息
    msgHandleCommand,
    // 🌤️🔮 智能功能檢測 (天氣 + 奇門遁甲)
    msgSmartWeatherDetection,
    // 与llm聊天
    msgChatWithLLM
  ];
  for (const handler of handlers) {
    try {
      const result = await handler(message, context);
      if (result) {
        return result;
      }
    } catch (e) {
      console.error(e);
      return new Response(errorToString(e), { status: 500 });
    }
  }
  return null;
}

// src/utils/router.js
var Router = class {
  constructor({ base = "", routes = [], ...other } = {}) {
    this.routes = routes;
    this.base = base;
    Object.assign(this, other);
  }
  /**
   * @private
   * @param {URLSearchParams} searchParams
   * @returns {object}
   */
  parseQueryParams(searchParams) {
    const query = /* @__PURE__ */ Object.create(null);
    for (const [k, v] of searchParams) {
      query[k] = k in query ? [].concat(query[k], v) : v;
    }
    return query;
  }
  /**
   * @private
   * @param {string} path
   * @returns {string}
   */
  normalizePath(path) {
    return path.replace(/\/+(\/|$)/g, "$1");
  }
  /**
   * @private
   * @param {string} path
   * @returns {RegExp}
   */
  createRouteRegex(path) {
    return RegExp(`^${path.replace(/(\/?\.?):(\w+)\+/g, "($1(?<$2>*))").replace(/(\/?\.?):(\w+)/g, "($1(?<$2>[^$1/]+?))").replace(/\./g, "\\.").replace(/(\/?)\*/g, "($1.*)?")}/*$`);
  }
  /**
   * @param {Request} request
   * @param  {...any} args
   * @returns {Promise<Response|null>}
   */
  async fetch(request, ...args) {
    const url = new URL(request.url);
    const reqMethod = request.method.toUpperCase();
    request.query = this.parseQueryParams(url.searchParams);
    for (const [method, regex, handlers, path] of this.routes) {
      let match = null;
      if ((method === reqMethod || method === "ALL") && (match = url.pathname.match(regex))) {
        request.params = match?.groups || {};
        request.route = path;
        for (const handler of handlers) {
          const response = await handler(request.proxy ?? request, ...args);
          if (response != null) return response;
        }
      }
    }
  }
  /**
   * @param {string} method
   * @param {string} path
   * @param  {...any} handlers
   * @returns {Router}
   */
  route(method, path, ...handlers) {
    const route = this.normalizePath(this.base + path);
    const regex = this.createRouteRegex(route);
    this.routes.push([method.toUpperCase(), regex, handlers, route]);
    return this;
  }
  /**
   * @param {string} path
   * @param  {...any} handlers
   * @returns {Router}
   */
  get(path, ...handlers) {
    return this.route("GET", path, ...handlers);
  }
  /**
   * @param {string} path
   * @param  {...any} handlers
   * @returns {Router}
   */
  post(path, ...handlers) {
    return this.route("POST", path, ...handlers);
  }
  /**
   * @param {string} path
   * @param  {...any} handlers
   * @returns {Router}
   */
  put(path, ...handlers) {
    return this.route("PUT", path, ...handlers);
  }
  /**
   * @param {string} path
   * @param  {...any} handlers
   * @returns {Router}
   */
  delete(path, ...handlers) {
    return this.route("DELETE", path, ...handlers);
  }
  /**
   * @param {string} path
   * @param  {...any} handlers
   * @returns {Router}
   */
  patch(path, ...handlers) {
    return this.route("PATCH", path, ...handlers);
  }
  /**
   * @param {string} path
   * @param  {...any} handlers
   * @returns {Router}
   */
  head(path, ...handlers) {
    return this.route("HEAD", path, ...handlers);
  }
  /**
   * @param {string} path
   * @param  {...any} handlers
   * @returns {Router}
   */
  options(path, ...handlers) {
    return this.route("OPTIONS", path, ...handlers);
  }
  /**
   * @param {string} path
   * @param  {...any} handlers
   * @returns {Router}
   */
  all(path, ...handlers) {
    return this.route("ALL", path, ...handlers);
  }
};

// src/route.js
var helpLink = "https://github.com/TBXark/ChatGPT-Telegram-Workers/blob/master/doc/en/DEPLOY.md";
var issueLink = "https://github.com/TBXark/ChatGPT-Telegram-Workers/issues";
var initLink = "./init";
var footer = `
<br/>
<p>For more information, please visit <a href="${helpLink}">${helpLink}</a></p>
<p>If you have any questions, please visit <a href="${issueLink}">${issueLink}</a></p>
`;
function buildKeyNotFoundHTML(key) {
  return `<p style="color: red">Please set the <strong>${key}</strong> environment variable in Cloudflare Workers.</p> `;
}
async function bindWebHookAction(request) {
  const result = [];
  const domain = new URL(request.url).host;
  const hookMode = API_GUARD ? "safehook" : "webhook";
  for (const token of ENV.TELEGRAM_AVAILABLE_TOKENS) {
    const url = `https://${domain}/telegram/${token.trim()}/${hookMode}`;
    const id = token.split(":")[0];
    result[id] = {
      webhook: await bindTelegramWebHook(token, url).catch((e) => errorToString(e)),
      command: await bindCommandForTelegram(token).catch((e) => errorToString(e))
    };
  }
  const HTML = renderHTML(`
    <h1>ChatGPT-Telegram-Workers</h1>
    <h2>${domain}</h2>
    ${ENV.TELEGRAM_AVAILABLE_TOKENS.length === 0 ? buildKeyNotFoundHTML("TELEGRAM_AVAILABLE_TOKENS") : ""}
    ${Object.keys(result).map((id) => `
        <br/>
        <h4>Bot ID: ${id}</h4>
        <p style="color: ${result[id].webhook.ok ? "green" : "red"}">Webhook: ${JSON.stringify(result[id].webhook)}</p>
        <p style="color: ${result[id].command.ok ? "green" : "red"}">Command: ${JSON.stringify(result[id].command)}</p>
        `).join("")}
      ${footer}
    `);
  return new Response(HTML, { status: 200, headers: { "Content-Type": "text/html" } });
}
async function telegramWebhook(request) {
  try {
    const { token } = request.params;
    const body = await request.json();
    return makeResponse200(await handleMessage(token, body));
  } catch (e) {
    console.error(e);
    return new Response(errorToString(e), { status: 200 });
  }
}
async function telegramSafeHook(request) {
  try {
    if (API_GUARD === void 0 || API_GUARD === null) {
      return telegramWebhook(request);
    }
    console.log("API_GUARD is enabled");
    const url = new URL(request.url);
    url.pathname = url.pathname.replace("/safehook", "/webhook");
    request = new Request(url, request);
    return makeResponse200(await API_GUARD.fetch(request));
  } catch (e) {
    console.error(e);
    return new Response(errorToString(e), { status: 200 });
  }
}
async function defaultIndexAction() {
  const HTML = renderHTML(`
    <h1>ChatGPT-Telegram-Workers</h1>
    <br/>
    <p>Deployed Successfully!</p>
    <p> Version (ts:${ENV.BUILD_TIMESTAMP},sha:${ENV.BUILD_VERSION})</p>
    <br/>
    <p>You must <strong><a href="${initLink}"> >>>>> click here <<<<< </a></strong> to bind the webhook.</p>
    <br/>
    <p>After binding the webhook, you can use the following commands to control the bot:</p>
    ${commandsDocument().map((item) => `<p><strong>${item.command}</strong> - ${item.description}</p>`).join("")}
    <br/>
    <p>You can get bot information by visiting the following URL:</p>
    <p><strong>/telegram/:token/bot</strong> - Get bot information</p>
    ${footer}
  `);
  return new Response(HTML, { status: 200, headers: { "Content-Type": "text/html" } });
}
async function loadBotInfo() {
  const result = [];
  for (const token of ENV.TELEGRAM_AVAILABLE_TOKENS) {
    const id = token.split(":")[0];
    result[id] = await getBot(token);
  }
  const HTML = renderHTML(`
    <h1>ChatGPT-Telegram-Workers</h1>
    <br/>
    <h4>Environment About Bot</h4>
    <p><strong>GROUP_CHAT_BOT_ENABLE:</strong> ${ENV.GROUP_CHAT_BOT_ENABLE}</p>
    <p><strong>GROUP_CHAT_BOT_SHARE_MODE:</strong> ${ENV.GROUP_CHAT_BOT_SHARE_MODE}</p>
    <p><strong>TELEGRAM_BOT_NAME:</strong> ${ENV.TELEGRAM_BOT_NAME.join(",")}</p>
    ${Object.keys(result).map((id) => `
            <br/>
            <h4>Bot ID: ${id}</h4>
            <p style="color: ${result[id].ok ? "green" : "red"}">${JSON.stringify(result[id])}</p>
            `).join("")}
    ${footer}
  `);
  return new Response(HTML, { status: 200, headers: { "Content-Type": "text/html" } });
}
async function handleRequest(request) {
  const router = new Router();
  router.get("/", defaultIndexAction);
  router.get("/init", bindWebHookAction);
  router.post("/telegram/:token/webhook", telegramWebhook);
  router.post("/telegram/:token/safehook", telegramSafeHook);
  if (ENV.DEV_MODE || ENV.DEBUG_MODE) {
    router.get("/telegram/:token/bot", loadBotInfo);
  }
  router.all("*", () => new Response("Not Found", { status: 404 }));
  return router.fetch(request);
}

var zh_hans_default = {
  "env": {
    "system_init_message": "你是一个得力的助手"
  },
  "command": {
    "help": {
      "summary": "当前支持以下命令:\n",
      "help": "获取命令帮助",
      "new": "发起新的对话",
      "start": "获取你的ID, 并发起新的对话",
      "img": "生成一张图片, 命令完整格式为 `/img 图片描述`, 例如`/img 月光下的沙滩`。支持 DALL-E-2, DALL-E-3 和最新的 GPT-Image-1 模型",
      "img2": "同时使用多个模型生成图片, 命令完整格式为 `/img2 图片描述`, 例如`/img2 月光下的沙滩`。会同时调用所有配置的图片生成服务",
      "setimg": "设置图片生成模型，如 /setimg openai 或 /setimg gemini",
      "version": "获取当前版本号, 判断是否需要更新",
      "setenv": "设置用户配置，命令完整格式为 /setenv KEY=VALUE",
      "setenvs": "批量设置用户配置, 命令完整格式为 /setenvs {\"KEY1\": \"VALUE1\", \"KEY2\": \"VALUE2\"}",
      "delenv": "删除用户配置，命令完整格式为 /delenv KEY",
      "clearenv": "清除所有用户配置",
      "system": "查看当前一些系统信息",
      "redo": "重做上一次的对话, /redo 加修改过的内容 或者 直接 /redo",
      "echo": "回显消息",
      "dicten": "查询英文词汇定义 如 /dicten apple",
      "dictcn": "查询中文字词定义 如 /dictcn 蘋",
      "stock": "查询台股/美股代号 如 /stock 2330 或 /stock TSLA（智能判断台股美股）",
      "stock2": "查询国际股票代号 如 /stock AAPL",
      "wt": "台湾各城市的天气 如 /wt 高雄市",
      "ip": "查詢 IP 地址資訊 如 /ip 8.8.8.8",
      "dns": "查詢 dns 地址資訊 如 /ip david888.com",
      "boa": "解答之書 命運還是機會",
      "password": "產生19位的隨機密碼",
      "oracle": "淺草籤詩占卜",
      "poetry": "隨機的唐詩",
      "qi": "奇門遁甲",
      "web": "網頁搜尋",
      "dns2": "查詢 dns 資訊",
      "weatheralert": "台灣天氣 特報 警報",
      "law": "法律问答 如 /law AI产生的不实信息，散播者会构成加重诽谤罪吗？",
    },
    "new": {
      "new_chat_start": "新的对话已经开始"
    }
  }
};
var zh_hant_default = {
  "env": {
    "system_init_message": "你是一個得力的助手"
  },
  "command": {
    "help": {
      "summary": "當前支持的命令如下：\n",
      "help": "獲取命令幫助",
      "new": "開始一個新的對話",
      "start": "獲取你的ID並開始一個新的對話",
      "img": "生成圖片，完整命令格式為 `/img 圖片描述`，例如`/img 海灘月光`。支援 DALL-E-2, DALL-E-3 和最新的 GPT-Image-1 模型",
      "img2": "同時使用多個模型生成圖片，完整命令格式為 `/img2 圖片描述`，例如`/img2 海灘月光`。會同時調用所有配置的圖片生成服務",
      "setimg": "設定圖片生成模型，如 /setimg openai 或 /setimg gemini",
      "version": "獲取當前版本號以確定是否需要更新",
      "setenv": "設置用戶配置，完整命令格式為/setenv KEY=VALUE",
      "setenvs": "批量設置用戶配置，命令完整格式為 /setenvs {\"KEY1\": \"VALUE1\", \"KEY2\": \"VALUE2\"}",
      "delenv": "刪除用戶配置，完整命令格式為/delenv KEY",
      "clearenv": "清除所有用戶配置",
      "system": "查看一些系統信息",
      "redo": "重做上一次的對話 /redo 加修改過的內容 或者 直接 /redo",
      "echo": "回顯消息",
      "dicten": "查詢英文單詞定義 如 /dicten apple",
      "dictcn": "查詢中文詞彙定義 如 /dictcn 蘋",
      "stock": "查詢台股/美股代碼 如 /stock 2330 或 /stock TSLA（智慧判斷台股美股）",
      "stock2": "查詢國際股票代號 如 /stock2 AAPL ",
      "wt": "查詢台灣各城市的天氣 如 /wt 高雄市 ",
      "ip": "查詢 IP 地址信息 如 /ip 8.8.8.8",
      "dns": "查詢 dns 地址信息 如 /ip david888.com",
      "boa": "解答之書 命運還是機會",
      "password": "產生19位的隨機密碼",
      "oracle": "淺草籤詩占卜",
      "poetry": "唐詩 隨機抽一首",
      "qi": "奇門遁甲",
      "web": "網頁搜尋",
      "dns2": "查詢 dns 資訊",
      "weatheralert": "台灣天氣 特報 警報",
      "law": "法律問答 如 /law AI產生的不實訊息，散播者會構成加重誹謗罪嗎？",
    },
    "new": {
      "new_chat_start": "新的對話已經開始"
    }
  }
};

var pt_default = {
  "env": {
    "system_init_message": "Você é um assistente útil"
  },
  "command": {
    "help": {
      "summary": "Os seguintes comandos são suportados atualmente:\n",
      "help": "Obter ajuda sobre comandos",
      "new": "Iniciar uma nova conversa",
      "start": "Obter seu ID e iniciar uma nova conversa",
      "img": "Gerar uma imagem, o formato completo do comando é `/img descrição da imagem`, por exemplo `/img praia ao luar`",
      "img2": "Gerar imagens usando múltiplos modelos simultaneamente, o formato completo do comando é `/img2 descrição da imagem`, por exemplo `/img2 praia ao luar`. Chamará todos os serviços de geração de imagem configurados de uma vez",
      "version": "Obter o número da versão atual para determinar se é necessário atualizar",
      "setenv": "Definir configuração do usuário, o formato completo do comando é /setenv CHAVE=VALOR",
      "setenvs": "Definir configurações do usuário em lote, o formato completo do comando é /setenvs {\"CHAVE1\": \"VALOR1\", \"CHAVE2\": \"VALOR2\"}",
      "delenv": "Excluir configuração do usuário, o formato completo do comando é /delenv CHAVE",
      "clearenv": "Limpar todas as configurações do usuário",
      "system": "Ver algumas informações do sistema",
      "redo": "Refazer a última conversa, /redo com conteúdo modificado ou diretamente /redo",
      "echo": "Repetir a mensagem",
      "dicten": "Consultar definição de palavra em inglês",
      "dictcn": "Consultar definição de palavra em chinês",
      "stock": "Consultar símbolo de ações de Taiwan",
      "qi": "奇門遁甲",
      "web": "網頁搜尋",
      "dns2": "查詢 dns 資訊",
      "stock": "Consultar símbolo de ações internacionais"
    },
    "new": {
      "new_chat_start": "Uma nova conversa foi iniciada"
    }
  }
};
var en_default = {
  "env": {
    "system_init_message": "You are a helpful assistant"
  },
  "command": {
    "help": {
      "summary": "The following commands are currently supported:\n",
      "help": "Get command help",
      "new": "Start a new conversation",
      "start": "Get your ID and start a new conversation",
      "img": "Generate an image, the complete command format is `/img image description`, for example `/img beach at moonlight`",
      "img2": "Generate images using multiple models simultaneously, the complete command format is `/img2 image description`, for example `/img2 beach at moonlight`. Will call all configured image generation services at once",
      "setimg": "Set image generation model, like /setimg openai or /setimg gemini",
      "version": "Get the current version number to determine whether to update",
      "setenv": "Set user configuration, the complete command format is /setenv KEY=VALUE",
      "setenvs": "Batch set user configurations, the full format of the command is /setenvs {\"KEY1\": \"VALUE1\", \"KEY2\": \"VALUE2\"}",
      "delenv": "Delete user configuration, the complete command format is /delenv KEY",
      "clearenv": "Clear all user configuration",
      "system": "View some system information",
      "redo": "Redo the last conversation, /redo with modified content or directly /redo",
      "echo": "Echo the message",
      "dicten": "Lookup English word definition",
      "dictcn": "Lookup Chinese word definition",
      "stock": "Lookup stock symbol",
      "stock2": "Lookup international stock symbol",
      "ip": "查詢 IP 地址信息 如 /ip 8.8.8.8",
      "dns": "查詢 dns 地址信息 如 /ip david888.com",
      "password": "產生19位的隨機密碼",
      "oracle": "淺草籤詩占卜",
      "poetry": "來首唐詩",
      "qi": "奇門遁甲",
      "web": "網頁搜尋",
      "dns2": "查詢 dns 資訊",
      "weatheralert": "台灣天氣 特報 警報",
      "law": "Legal Q&A, e.g. /law Will the spreader of AI-generated false information constitute aggravated defamation?",
    },
    "new": {
      "new_chat_start": "A new conversation has started"
    }
  }
};

// src/i18n/index.js
function i18n(lang) {
  switch (lang.toLowerCase()) {
    case "cn":
    case "zh-cn":
    case "zh-hans":
      return zh_hans_default;
    case "zh-tw":
    case "zh-hk":
    case "zh-mo":
    case "zh-hant":
      return zh_hant_default;
    case "pt":
    case "pt-br":
      return pt_default;
    case "en":
    case "en-us":
      return en_default;
    default:
      return en_default;
  }
}

// main.js
var main_default = {
  /**
   * @param {Request} request 
   * @param {object} env 
   * @param {object} ctx 
   * @returns {Promise<Response>}
   */
  // eslint-disable-next-line no-unused-vars
  async fetch(request, env, ctx) {
    try {
      initEnv(env, i18n);
      return await handleRequest(request);
    } catch (e) {
      console.error(e);
      return new Response(errorToString(e), { status: 500 });
    }
  }
};
export {
  main_default as default
};