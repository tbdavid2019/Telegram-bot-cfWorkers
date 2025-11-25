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
      help: { summary: '当前支持以下命令:\n' },
      new: { new_chat_start: '新的对话已经开始' }
    }
  },
  'zh-tw': {
    env: { system_init_message: '你是一個得力的助手' },
    command: {
      help: { summary: '當前支持的命令如下：\n' },
      new: { new_chat_start: '新的對話已經開始' }
    }
  },
  'en': {
    env: { system_init_message: 'You are a helpful assistant' },
    command: {
      help: { summary: 'The following commands are currently supported:\n' },
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
