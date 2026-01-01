// 要準備好這幾個 API KEY  分別去這幾個網站註冊free
// https://etlas.io  netlasapiKey DNS查詢
// https://ipinfo.io  infoapiKey IP查詢
// https://opendata.cwa.gov.tw   cwaapiKey臺灣天氣查詢 
// https://financialmodelingprep.com/   FMPapiKey 國際股市查詢

export class UserConfig {
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
  // Google Maps API Key
  GOOGLE_MAPS_API_KEY = null;
  // -- LLM Profiles 配置 --
  // 支援多個 OpenAI API 相容服務的配置
  // JSON 格式: {"openai":{"name":"OpenAI","apiBase":"...","apiKeyEnv":"OPENAI_API_KEY","model":"..."}}
  LLM_PROFILES = {};
  // 預設使用的 LLM Profile
  DEFAULT_LLM_PROFILE = "";
  // 目前使用的 LLM Profile (使用者可透過 /llmchange 切換)
  CURRENT_LLM_PROFILE = "";
  // 臨時覆蓋的 LLM Model (使用者可透過 /llmchange profile model 指定)
  CURRENT_LLM_MODEL = "";

  // -- LLM API Keys (從環境變數讀取) --
  // OpenRouter API Key
  OPENROUTER_API_KEY = null;
  // Bedrock API Key (自訂服務)
  BEDROCK_API_KEY = null;
  // Groq API Key
  GROQ_API_KEY = null;
  // 小米 API Key
  XIAOMI_API_KEY = null;

  // -- 語音功能配置 --
  // 語音轉錄 (ASR)
  ENABLE_VOICE_TRANSCRIPTION = false;
  SHOW_TRANSCRIPTION = false;
  ASR_API_KEY = null;
  ASR_API_BASE = "https://api.groq.com/openai/v1";
  ASR_MODEL = "whisper-large-v3";
  ASR_LANGUAGE = "zh";
  // 語音回覆 (TTS)
  ENABLE_VOICE_REPLY = false;
  TTS_API_KEY = null;
  TTS_API_BASE = "https://api.groq.com/openai/v1";
  TTS_MODEL = "canopylabs/orpheus-v1-english";
  TTS_VOICE = "autumn";
  TTS_SPEED = "1.0";
  TTS_FORMAT = "wav";
  // -- Google Sheets / Calendar 整合 --
  ENABLE_FAMILY_SHEETS = false;
  FAMILY_SHEET_ID = null;
  FAMILY_CALENDAR_ID = null;
  GOOGLE_SHEETS_SERVICE_ACCOUNT = null;
}

export class Environment {
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
    // 默認為API BASE 防止被替換導致token 泄露
    "OPENAI_API_BASE",
    "GOOGLE_COMPLETIONS_API",
    "AZURE_COMPLETIONS_API",
    "AZURE_DALLE_API",
    "LLM_PROFILES"
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
  // 开启位置服务 (Google Maps)
  ENABLE_LOCATION_SERVICE = false;
  // 开启 LLM 指令发现功能
  ENABLE_COMMAND_DISCOVERY = false;
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
}

export const ENV = new Environment();
export let DATABASE = null;
export let API_GUARD = null;
export const CUSTOM_COMMAND = {};
export const CUSTOM_COMMAND_DESCRIPTION = {};
export const CONST = {
  PASSWORD_KEY: "chat_history_password",
  GROUP_TYPES: ["group", "supergroup"]
};

const ENV_TYPES = {
  SYSTEM_INIT_MESSAGE: "string",
  AZURE_API_KEY: "string",
  AZURE_COMPLETIONS_API: "string",
  AZURE_DALLE_API: "string",
  CLOUDFLARE_ACCOUNT_ID: "string",
  CLOUDFLARE_TOKEN: "string",
  GOOGLE_API_KEY: "string",
  GOOGLE_MAPS_API_KEY: "string",
  ENABLE_LOCATION_SERVICE: "boolean",
  ENABLE_COMMAND_DISCOVERY: "boolean",
  GPT_IMAGE_MODEL: "string",
  GPT_IMAGE_SIZE: "string",
  OPENAI_IMAGE_API_KEY: "array",
  OPENAI_IMAGE_API_BASE: "string",
  GEMINI_IMAGE_MODEL: "string",
  GEMINI_IMAGE_API_KEY: "array",
  GEMINI_IMAGE_API_BASE: "string",
  LLM_PROFILES: "object",
  DEFAULT_LLM_PROFILE: "string",
  CURRENT_LLM_PROFILE: "string",
  CURRENT_LLM_MODEL: "string",
  OPENROUTER_API_KEY: "string",
  BEDROCK_API_KEY: "string",
  XIAOMI_API_KEY: "string",
  GROQ_API_KEY: "string",
  // 語音轉錄 (ASR) 相關
  ENABLE_VOICE_TRANSCRIPTION: "boolean",
  SHOW_TRANSCRIPTION: "boolean",
  ASR_API_KEY: "string",
  ASR_API_BASE: "string",
  ASR_MODEL: "string",
  ASR_LANGUAGE: "string",
  // 語音回覆 (TTS) 相關
  ENABLE_VOICE_REPLY: "boolean",
  TTS_API_KEY: "string",
  TTS_API_BASE: "string",
  TTS_MODEL: "string",
  TTS_VOICE: "string",
  TTS_SPEED: "string",
  TTS_FORMAT: "string",
  // Google Sheets / Calendar 整合
  ENABLE_FAMILY_SHEETS: "boolean",
  FAMILY_SHEET_ID: "string",
  FAMILY_CALENDAR_ID: "string",
  GOOGLE_SHEETS_SERVICE_ACCOUNT: "string"
};

const ENV_KEY_MAPPER = {
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

export function mergeEnvironment(target, source) {
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

export function initEnv(env, i18n) {
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
    ENV.I18N = i18n((ENV.LANGUAGE || "cn").toLowerCase());
    if (env.TELEGRAM_TOKEN && !ENV.TELEGRAM_AVAILABLE_TOKENS.includes(env.TELEGRAM_TOKEN)) {
      if (env.BOT_NAME && ENV.TELEGRAM_AVAILABLE_TOKENS.length === ENV.TELEGRAM_BOT_NAME.length) {
        ENV.TELEGRAM_BOT_NAME.push(env.BOT_NAME);
      }
      ENV.TELEGRAM_AVAILABLE_TOKENS.push(env.TELEGRAM_TOKEN);
    }
    if (env.OPENAI_API_DOMAIN && !ENV.USER_CONFIG.OPENAI_API_BASE) {
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
