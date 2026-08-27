// 訊息中介層處理器
import { sendMessageToTelegramWithContext, answerCallbackQuery } from './telegram.js';
import { commandWeather, handleWeatherCallback } from '../features/weather.js';
import { commandQimen } from '../features/divination.js';
import { handleLLMChangeCallback } from '../features/llm.js';
import { handleStockTWCallback, handleStock2Callback } from '../features/stock.js';
import { handleLocationMessage, handleLocationCallback } from '../features/location.js';
import { msgHandleVoiceMessage } from '../features/voice.js';
import { getBot, getFileLink } from './telegram.js';
import { uploadImageToTelegraph } from '../utils/image.js';
import { recordUserActivity } from '../utils/stats.js';

// 從環境變數和常數模組引入
import { ENV, DATABASE, CONST } from '../config/env.js';

/**
 * 初始化聊天上下文
 */
export async function msgInitChatContext(message, context) {
  await context.initContext(message);
  return null;
}

/**
 * 記錄使用者統計（在初始化後執行）
 */
export async function msgRecordStats(message, context) {
  // 非同步記錄，不阻塞主流程
  recordUserActivity(context).catch(e => console.error('Stats error:', e));
  return null;
}

/**
 * 處理 Callback Query（Inline Keyboard 按鈕點擊）
 */
export async function msgHandleCallbackQuery(message, context) {
  if (!message.callback_query) {
    return null;
  }

  const callbackData = message.callback_query.data;

  // 🆕 處理指令發現系統的按鈕點擊
  if (callbackData && callbackData.startsWith('cmd:')) {
    const { handleCommandCallback } = await import('../agent/command-invoker.js');
    return await handleCommandCallback(message.callback_query, context);
  }

  // 先回應 callback query（移除按鈕上的 loading 狀態）
  await answerCallbackQuery(context.SHARE_CONTEXT.currentBotToken, message.callback_query.id);

  // 處理 LLM 切換
  if (callbackData.startsWith('/model:') || callbackData.startsWith('/llmchange:')) {
    return handleLLMChangeCallback(message, context);
  }

  // 處理天氣查詢
  if (callbackData.startsWith('/wt:')) {
    return handleWeatherCallback(message, context);
  }

  // 處理台股查詢
  if (callbackData.startsWith('/stock:')) {
    return handleStockTWCallback(message, context);
  }

  // 處理美股查詢
  if (callbackData.startsWith('/stock2:')) {
    return handleStock2Callback(message, context);
  }

  // 處理位置查詢
  if (callbackData.startsWith('/loc:')) {
    return handleLocationCallback(message, context);
  }

  // 處理語音回覆切換
  if (callbackData.startsWith('/voicereply:')) {
    const mode = callbackData.split(':')[1]; // 'text' 或 'voice'
    const chatId = message.chat.id;

    // 儲存設定
    await DATABASE.put(`voice_reply:${chatId}`, mode);

    // 更新按鈕
    const keyboard = {
      inline_keyboard: [
        [
          {
            text: mode === 'text' ? '✅ 文字回覆' : '⚪ 文字回覆',
            callback_data: '/voicereply:text'
          },
          {
            text: mode === 'voice' ? '✅ 語音回覆' : '⚪ 語音回覆',
            callback_data: '/voicereply:voice'
          }
        ]
      ]
    };

    // 更新訊息
    await fetch(
      `https://api.telegram.org/bot${context.SHARE_CONTEXT.currentBotToken}/editMessageText`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: message.message_id,
          text: `🔊 *語音回覆設定*\n\n目前模式: ${mode === 'voice' ? '🎤 語音回覆' : '💬 文字回覆'}\n\n請選擇回覆模式:`,
          reply_markup: keyboard,
          parse_mode: 'Markdown'
        })
      }
    );

    return null;
  }

  // 未知的 callback，忽略
  return null;
}

/**
 * 儲存最後一則訊息（用於除錯）
 */
export async function msgSaveLastMessage(message, context) {
  if (ENV.DEBUG_MODE) {
    const lastMessageKey = `last_message:${context.SHARE_CONTEXT.chatHistoryKey}`;
    await DATABASE.put(lastMessageKey, JSON.stringify(message), { expirationTtl: 3600 });
  }
  return null;
}

/**
 * 忽略舊訊息（安全模式）
 */
export async function msgIgnoreOldMessage(message, context) {
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

/**
 * 檢查環境是否就緒
 */
export async function msgCheckEnvIsReady(message, context) {
  if (!DATABASE) {
    return sendMessageToTelegramWithContext(context)("DATABASE Not Set");
  }
  return null;
}

/**
 * 白名單過濾器
 */
export async function msgFilterWhiteList(message, context) {
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

/**
 * 過濾不支援的訊息類型
 */
export async function msgFilterUnsupportedMessage(message, context) {
  if (message.text) {
    return null;
  }
  if (message.caption) {
    return null;
  }
  if (message.photo) {
    return null;
  }
  if (message.location) {
    return null;
  }
  if (message.voice) {
    return null;
  }
  if (message.document) {
    return null;
  }
  if (message.video) {
    return null;
  }
  if (message.audio) {
    return null;
  }
  if (message.animation) {
    return null;
  }
  throw new Error("Not supported message type");
}

/**
 * 處理群組訊息
 */
export async function msgHandleGroupMessage(message, context) {
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

/**
 * 處理指令訊息
 */
export async function msgHandleCommand(message, context) {
  let commandText = message.text;
  if (!commandText && message.caption) {
    commandText = message.caption;
  }
  if (!commandText) {
    return null;
  }

  // 不是指令則跳過
  if (!commandText.startsWith('/')) {
    return null;
  }

  const hasOriginalText = Object.prototype.hasOwnProperty.call(message, "text");
  const originalText = message.text;
  if (!hasOriginalText || !message.text) {
    message.text = commandText;
  }

  // 導入命令處理器
  const { handleCommandMessage } = await import('./commands.js');
  const result = await handleCommandMessage(message, context);

  if (hasOriginalText) {
    message.text = originalText;
  } else {
    delete message.text;
  }
  return result;
}

/**
 * 智能功能檢測處理器（天氣 + 奇門遁甲）
 */
export async function msgSmartWeatherDetection(message, context) {
  // 舊的自動檢測邏輯已移除，統一使用 LLM 指令發現系統
  return null;
}

/**
 * 從訊息中挑選照片
 */
export function pickPhotoFromMessage(message) {
  if (!message?.photo || message.photo.length === 0) {
    return null;
  }
  let sizeIndex = 0;
  if (ENV.TELEGRAM_PHOTO_SIZE_OFFSET >= 0) {
    sizeIndex = Math.min(ENV.TELEGRAM_PHOTO_SIZE_OFFSET, message.photo.length - 1);
  } else {
    sizeIndex = Math.max(0, message.photo.length + ENV.TELEGRAM_PHOTO_SIZE_OFFSET);
  }
  sizeIndex = Math.max(0, Math.min(sizeIndex, message.photo.length - 1));
  return message.photo[sizeIndex]?.file_id || null;
}

/**
 * 提取 Telegram 照片 URL
 */
export async function extractTelegramPhotoUrl(message, context, allowReply = false) {
  const candidates = [];
  const mainFileId = pickPhotoFromMessage(message);
  if (mainFileId) {
    candidates.push(mainFileId);
  }
  if (allowReply && message?.reply_to_message) {
    const replyFileId = pickPhotoFromMessage(message.reply_to_message);
    if (replyFileId) {
      candidates.push(replyFileId);
    }
  }
  if (candidates.length === 0) {
    return null;
  }
  const fileId = candidates[0];
  let url = await getFileLink(fileId, context.SHARE_CONTEXT.currentBotToken);
  if (!url) {
    return null;
  }
  if (ENV.TELEGRAPH_ENABLE) {
    url = await uploadImageToTelegraph(url);
  }
  return url;
}

/**
 * 與 LLM 聊天
 */
export async function msgChatWithLLM(message, context) {
  const { text, caption } = message;
  const baseText = text || caption || "";
  let content = baseText;
  if (ENV.EXTRA_MESSAGE_CONTEXT && context.SHARE_CONTEXT.extraMessageContext && context.SHARE_CONTEXT.extraMessageContext.text) {
    const extra = context.SHARE_CONTEXT.extraMessageContext.text || "";
    content = extra + (baseText ? `\n${baseText}` : "");
  }
  const params = { message: content };
  if (message.photo && message.photo.length > 0) {
    const url = await extractTelegramPhotoUrl(message, context);
    if (url) {
      params.images = [url];
    }
  }
  if ((!params.message || params.message.trim() === "") && params.images && params.images.length > 0) {
    params.message = "請描述這張圖片，並說一個小故事。";
  }

  // 這裡需要調用 chatWithLLM 函數
  // 該函數將在 agent/llm.js 中實作
  const { chatWithLLM } = await import('../agent/llm.js');
  return chatWithLLM(params, context, null);
}

/**
 * 載入訊息
 */
export function loadMessage(body) {
  if (body?.edited_message) {
    throw new Error("Ignore edited message");
  }
  if (body?.callback_query) {
    // 處理 inline keyboard 的回調
    return {
      ...body.callback_query.message,
      callback_query: body.callback_query,
      text: body.callback_query.data, // 把 callback data 當作 text
      from: body.callback_query.from
    };
  }
  if (body?.message) {
    return body?.message;
  } else {
    throw new Error("Invalid message");
  }
}

/**
 * 中介層鏈
 * 按順序執行所有中介層處理器
 */
export const messageMiddleware = [
  msgInitChatContext,
  msgSaveLastMessage,
  msgIgnoreOldMessage,
  msgCheckEnvIsReady,
  msgFilterWhiteList,
  msgFilterUnsupportedMessage,
  msgHandleGroupMessage,
  msgHandleCommand,
  msgSmartWeatherDetection,
  handleLocationMessage,
  msgHandleVoiceMessage,
  msgChatWithLLM
];

/**
 * 執行中介層鏈
 */
export async function executeMiddleware(message, context) {
  for (const middleware of messageMiddleware) {
    const result = await middleware(message, context);
    if (result !== null) {
      return result; // 中介層返回非 null 表示處理完成
    }
  }
  return null;
}

/**
 * 處理訊息的主函數
 * @param {string} token - Bot Token
 * @param {Object} body - 請求 body
 * @returns {Promise<Response|null>}
 */
export async function handleMessage(token, body) {
  const { Context } = await import('./context.js');
  const { errorToString } = await import('../utils/utils.js');

  const context = new Context();
  context.initTelegramContext(token);

  const message = loadMessage(body);

  const handlers = [
    // 初始化聊天上下文: 生成chat_id, reply_to_message_id(群組消息), SHARE_CONTEXT
    msgInitChatContext,
    // 記錄使用者統計
    msgRecordStats,
    // 檢查環境是否準備好: DATABASE
    msgCheckEnvIsReady,
    // 處理 Callback Query（Inline Keyboard 按鈕點擊）- 要在白名單檢查後
    msgHandleCallbackQuery,
    // 過濾非白名單用戶, 提前過濾減少KV消耗
    msgFilterWhiteList,
    // 過濾不支援的消息(拋出異常結束消息處理)
    msgFilterUnsupportedMessage,
    // 處理群消息，判斷是否需要響應此條消息
    msgHandleGroupMessage,
    // 忽略舊消息
    msgIgnoreOldMessage,
    // DEBUG: 保存最後一條消息,按照需求自行調整此中介層位置
    msgSaveLastMessage,
    // 處理命令消息
    msgHandleCommand,
    // 🌤️🔮 智能功能檢測 (天氣 + 奇門遁甲)
    msgSmartWeatherDetection,
    // 📍 處理位置訊息
    handleLocationMessage,
    // 🎤 處理語音訊息
    msgHandleVoiceMessage,
    // 與LLM聊天
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
