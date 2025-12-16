/**
 * Telegram Bot for Cloudflare Workers
 * 主入口檔案 - 模組化版本
 */

// ===== 配置模組 =====
import { ENV, initEnv, API_GUARD } from './config/env.js';

// ===== Telegram 模組 =====
import {
  sendMessageToTelegram,
  sendPhotoToTelegram,
  sendChatActionToTelegram,
  bindTelegramWebHook,
  getBot
} from './telegram/telegram.js';

import {
  msgInitChatContext,
  msgSaveLastMessage,
  msgCheckEnvIsReady,
  msgFilterWhiteList,
  msgHandleGroupMessage,
  msgHandleCommand,
  msgSmartWeatherDetection,
  handleMessage
} from './telegram/message.js';

import { msgChatWithLLM } from './agent/llm.js';
import { executeCommand, bindCommandForTelegram, commandsDocument } from './telegram/commands.js';
import { createTelegramContext, Context } from './telegram/context.js';

// ===== 工具模組 =====
import { Router } from './utils/router.js';
import {
  errorToString,
  renderHTML,
  makeResponse200,
  buildKeyNotFoundHTML,
  footer,
  initLink
} from './utils/utils.js';

// ===== i18n 多語言支援 =====
const i18nData = {
  'zh-cn': {
    env: { system_init_message: '你是一个得力的助手' },
    command: {
      help: {
        summary: '当前支持以下命令:\n',
        wt: '查询天气 - 使用: /wt [城市名称]',
        weatheralert: '天气特报警报',
        stock: '台湾股市查询 - 使用: /stock [股票代码]',
        stock2: '美国/国际股市查询 - 使用: /stock2 [股票代码]',
        dictcn: '中文字典查询 - 使用: /dictcn [中文字]',
        dicten: '英文字典查询 - 使用: /dicten [英文单词]',
        qi: '奇门遁甲占卜',
        oracle: '浅草签诗',
        poetry: '唐诗欣赏',
        boa: '解答之书',
        bo: '解答之书(原版)',
        password: '生成随机密码',
        law: '法律问答',
        ip: 'IP 地址查询 - 使用: /ip [IP地址]',
        dns: 'DNS 查询 - 使用: /dns [域名]',
        dns2: 'DNS 详细查询 - 使用: /dns2 [域名]',
        web: '网页内容抓取',
        img: '生成图片 - 使用: /img [描述]',
        img2: '生成图片(多模型) - 使用: /img2 [描述]',
        setimg: '设置图片生成模型',
        gps: '查询附近设施 - 使用: /gps',
        llmchange: '切换 LLM 模型',
        help: '显示此帮助信息',
        new: '开始新对话',
        start: '开始使用机器人',
        setenv: '设置环境变量',
        setenvs: '批量设置环境变量',
        delenv: '删除环境变量',
        clearenv: '清除所有用户设置',
        version: '显示版本信息',
        system: '显示系统状态',
        redo: '重新生成上一条回复'
      },
      new: { new_chat_start: '新的对话已经开始' }
    }
  },
  'zh-tw': {
    env: { system_init_message: '你是一個得力的助手' },
    command: {
      help: {
        summary: '當前支持的命令如下：\n',
        wt: '查詢天氣 - 使用: /wt [城市名稱]',
        weatheralert: '天氣特報警報',
        stock: '台灣股市查詢 - 使用: /stock [股票代碼]',
        stock2: '美國/國際股市查詢 - 使用: /stock2 [股票代碼]',
        dictcn: '中文字典查詢 - 使用: /dictcn [中文字]',
        dicten: '英文字典查詢 - 使用: /dicten [英文單詞]',
        qi: '奇門遁甲占卜',
        oracle: '淺草籤詩',
        poetry: '唐詩欣賞',
        boa: '解答之書',
        bo: '解答之書(原版)',
        password: '產生隨機密碼',
        law: '法律問答',
        ip: 'IP 位址查詢 - 使用: /ip [IP位址]',
        dns: 'DNS 查詢 - 使用: /dns [網域名稱]',
        dns2: 'DNS 詳細查詢 - 使用: /dns2 [網域名稱]',
        web: '網頁內容抓取',
        img: '產生圖片 - 使用: /img [描述]',
        img2: '產生圖片(多模型) - 使用: /img2 [描述]',
        setimg: '設定圖片生成模型',
        gps: '查詢附近設施 - 使用: /gps',
        llmchange: '切換 LLM 模型',
        help: '顯示此幫助訊息',
        new: '開始新對話',
        start: '開始使用機器人',
        setenv: '設定環境變數',
        setenvs: '批次設定環境變數',
        delenv: '刪除環境變數',
        clearenv: '清除所有使用者設定',
        version: '顯示版本資訊',
        system: '顯示系統狀態',
        redo: '重新產生上一條回覆'
      },
      new: { new_chat_start: '新的對話已經開始' }
    }
  },
  'en': {
    env: { system_init_message: 'You are a helpful assistant' },
    command: {
      help: {
        summary: 'The following commands are currently supported:\n',
        wt: 'Weather query - Usage: /wt [city name]',
        weatheralert: 'Weather alerts',
        stock: 'Taiwan stock query - Usage: /stock [stock code]',
        stock2: 'US/International stock query - Usage: /stock2 [stock code]',
        dictcn: 'Chinese dictionary - Usage: /dictcn [Chinese character]',
        dicten: 'English dictionary - Usage: /dicten [English word]',
        qi: 'Qimen Dunjia divination',
        oracle: 'Asakusa fortune slip',
        poetry: 'Tang poetry',
        boa: 'Book of Answers',
        bo: 'Book of Answers (original)',
        password: 'Generate random password',
        law: 'Legal Q&A',
        ip: 'IP address lookup - Usage: /ip [IP address]',
        dns: 'DNS lookup - Usage: /dns [domain]',
        dns2: 'Detailed DNS lookup - Usage: /dns2 [domain]',
        web: 'Web page content fetch',
        img: 'Generate image - Usage: /img [description]',
        img2: 'Generate image (multi-model) - Usage: /img2 [description]',
        setimg: 'Set image generation model',
        gps: 'Find nearby places - Usage: /gps',
        llmchange: 'Switch LLM model',
        help: 'Show this help message',
        new: 'Start new conversation',
        start: 'Start using the bot',
        setenv: 'Set environment variable',
        setenvs: 'Batch set environment variables',
        delenv: 'Delete environment variable',
        clearenv: 'Clear all user settings',
        version: 'Show version info',
        system: 'Show system status',
        redo: 'Regenerate last response'
      },
      new: { new_chat_start: 'A new conversation has started' }
    }
  }
};

function i18n(lang) {
  const normalizedLang = lang.toLowerCase();
  if (normalizedLang.startsWith('zh-cn') || normalizedLang === 'cn') return i18nData['zh-cn'];
  if (normalizedLang.startsWith('zh-tw') || normalizedLang.startsWith('zh-hk')) return i18nData['zh-tw'];
  return i18nData['en'];
}

// ===== 路由處理函數 =====

/**
 * 默認首頁 - 顯示部署狀態和 Webhook 綁定連結
 */
async function defaultIndexAction() {
  const HTML = renderHTML(`
    <h1>ChatGPT-Telegram-Workers</h1>
    <br/>
    <p>Deployed Successfully!</p>
    <p>Version (ts:${ENV.BUILD_TIMESTAMP},sha:${ENV.BUILD_VERSION})</p>
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
  return new Response(HTML, { status: 200, headers: { 'Content-Type': 'text/html' } });
}

/**
 * 綁定 Webhook - 自動為所有 Bot 設定 Webhook 和指令
 */
async function bindWebHookAction(request) {
  const result = {};
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
        <p style="color: ${result[id].webhook?.ok ? "green" : "red"}">Webhook: ${JSON.stringify(result[id].webhook)}</p>
        <p style="color: ${result[id].command?.ok ? "green" : "red"}">Command: ${JSON.stringify(result[id].command)}</p>
        `).join("")}
    ${footer}
  `);
  return new Response(HTML, { status: 200, headers: { 'Content-Type': 'text/html' } });
}

/**
 * 載入 Bot 資訊 - 顯示所有 Bot 的詳細資訊
 */
async function loadBotInfo() {
  const result = {};
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
  return new Response(HTML, { status: 200, headers: { 'Content-Type': 'text/html' } });
}

/**
 * Telegram Webhook 處理
 */
async function telegramWebhook(request) {
  try {
    const { token } = request.params;
    const body = await request.json();
    return makeResponse200(await handleMessage(token, body));
  } catch (e) {
    console.error('Telegram webhook error:', e);
    return new Response(errorToString(e), { status: 200 });
  }
}

/**
 * Telegram SafeHook 處理 (使用 API_GUARD)
 */
async function telegramSafeHook(request) {
  try {
    if (API_GUARD === undefined || API_GUARD === null) {
      return telegramWebhook(request);
    }
    console.log("API_GUARD is enabled");
    const url = new URL(request.url);
    url.pathname = url.pathname.replace("/safehook", "/webhook");
    request = new Request(url, request);
    return makeResponse200(await API_GUARD.fetch(request));
  } catch (e) {
    console.error('Telegram safehook error:', e);
    return new Response(errorToString(e), { status: 200 });
  }
}

/**
 * 主請求處理函數
 */
async function handleRequest(request) {
  const router = new Router();

  // 路由定義
  router.get('/', defaultIndexAction);
  router.get('/init', bindWebHookAction);
  router.post('/telegram/:token/webhook', telegramWebhook);
  router.post('/telegram/:token/safehook', telegramSafeHook);

  // 開發/除錯模式下的路由
  if (ENV.DEV_MODE || ENV.DEBUG_MODE) {
    router.get('/telegram/:token/bot', loadBotInfo);
  }

  // 404 處理
  router.all('*', () => new Response('Not Found', { status: 404 }));

  return router.fetch(request);
}

// ===== Cloudflare Workers 入口 =====
export default {
  /**
   * @param {Request} request 
   * @param {object} env 
   * @param {object} ctx 
   * @returns {Promise<Response>}
   */
  async fetch(request, env, ctx) {
    try {
      // 初始化環境變數
      initEnv(env, i18n);

      // 處理請求
      return await handleRequest(request);
    } catch (e) {
      console.error('Worker error:', e);
      return new Response(errorToString(e), { status: 500 });
    }
  }
};
