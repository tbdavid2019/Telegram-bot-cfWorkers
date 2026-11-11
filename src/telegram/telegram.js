/**
 * Telegram API 基礎功能
 * 包含訊息發送、圖片上傳、Webhook 設定等
 */

import { ENV, DATABASE } from '../config/env.js';
import { escape, markdownToTelegramHtml, balanceTelegramHtmlTags } from '../utils/md2tgmd.js';
import { splitRichTextIntoLegacyChunks, tableToLegacyHtml } from './rich.js';

// ========== 基礎訊息發送 ==========

async function sendMessage(message, token, context) {
  const body = {
    text: message
  };
  
  for (const key of Object.keys(context)) {
    if (context[key] !== undefined && context[key] !== null) {
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

export async function sendMessageToTelegram(message, token, context) {
  if (message === undefined || message === null) {
    message = "";
  } else if (typeof message !== "string") {
    message = String(message);
  }

  const chatContext = { ...(context || {}) };
  const originMessage = message;
  const limit = 4096;
  const originalParseMode = chatContext.parse_mode;
  
  // 若為 Markdown 或 MarkdownV2，自動轉換為 Telegram 支援度最佳之 HTML 格式
  if (chatContext.parse_mode === "Markdown" || chatContext.parse_mode === "MarkdownV2") {
    message = markdownToTelegramHtml(message);
    chatContext.parse_mode = "HTML";
  } else if (chatContext.parse_mode === "HTML") {
    message = balanceTelegramHtmlTags(message);
  }
  
  if (message.length <= limit) {
    const resp = await sendMessage(message, token, chatContext);
    if (resp.status === 200) {
      return resp;
    } else if (originalParseMode && resp.status === 400) {
      // 僅在有指定富文本格式且遭遇 400 實體解析錯誤時，才降級為純文字重試
      console.warn(`[Telegram] Send rich-text message failed (HTTP 400), retrying with plain text`);
      message = originMessage;
      chatContext.parse_mode = null;
      return await sendMessage(message, token, chatContext);
    }
    return resp;
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

export function sendMessageToTelegramWithContext(context) {
  return async (message) => {
    if (context?.captureToolOutput && typeof context.captureToolOutput === 'function') {
      context.captureToolOutput(message);
      return new Response(JSON.stringify({ ok: true, result: { message_id: 1 } }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    }
    return sendMessageToTelegram(
      message, 
      context.SHARE_CONTEXT.currentBotToken, 
      context.CURRENT_CHAT_CONTEXT
    );
  };
}

// ========== Telegram Bot API 10.3 富文本原生訊息 ==========

export async function sendRichMessage(richMessagePayload, token, context, fallbackText) {
  const chatContext = { ...(context || {}) };
  
  // 正規化 blocks 陣列
  let blocks = [];
  if (Array.isArray(richMessagePayload)) {
    blocks = richMessagePayload;
  } else if (richMessagePayload && Array.isArray(richMessagePayload.blocks)) {
    blocks = richMessagePayload.blocks;
  }

  const body = {
    chat_id: chatContext.chat_id,
    rich_message: { blocks },
    rich_blocks: JSON.stringify(blocks)
  };

  if (chatContext.reply_markup) {
    body.reply_markup = chatContext.reply_markup;
  }
  if (chatContext.message_id) {
    body.message_id = chatContext.message_id;
  }
  if (fallbackText !== undefined && fallbackText !== null) {
    const textStr = String(fallbackText);
    // 頂層 text 長度限制在 4096 以內，避免被 Telegram API 400 拒絕
    body.text = textStr.length > 4096 ? textStr.slice(0, 4093) + '…' : textStr;
  }

  for (const key of Object.keys(chatContext)) {
    if (
      key !== 'chat_id' &&
      key !== 'reply_markup' &&
      key !== 'message_id' &&
      key !== 'text' &&
      chatContext[key] !== undefined &&
      chatContext[key] !== null
    ) {
      body[key] = chatContext[key];
    }
  }

  return await fetch(
    `${ENV.TELEGRAM_API_DOMAIN}/bot${token}/sendRichMessage`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    }
  );
}

export async function sendRichMessageToTelegram(richMessagePayload, token, context, fallbackText) {
  const chatContext = { ...(context || {}) };
  let resp;
  let needFallback = false;

  try {
    resp = await sendRichMessage(richMessagePayload, token, chatContext, fallbackText);
    if (!resp) {
      needFallback = true;
    } else if (resp.status === 200) {
      // 檢查 response body 中是否包含 Telegram API 的 ok: false
      const cloneResp = resp.clone();
      try {
        const data = await cloneResp.json();
        if (data && data.ok === false) {
          needFallback = true;
        }
      } catch {
        // 非 json 回應，視為正常
      }
    } else if (resp.status === 400 || resp.status === 404 || resp.status === 405 || resp.status === 501 || resp.status >= 500) {
      // 400 (Bad Request), 404 (舊端點不存在), 405/501 (不支援), 5xx (伺服器錯誤) -> 自動降級
      needFallback = true;
    }
    // 401, 403, 429 等明確錯誤不盲目降級，直接回傳
  } catch (err) {
    console.warn('[Telegram] sendRichMessage network exception, falling back:', err?.message);
    needFallback = true;
  }

  if (needFallback) {
    console.warn(`[Telegram] Send rich message failed or unsupported, gracefully falling back to legacy sendMessage`);
    let text = fallbackText !== undefined && fallbackText !== null ? String(fallbackText) : '';
    
    // 若無提供 fallbackText，嘗試從 blocks 表格自動生成
    if (!text && richMessagePayload) {
      const blocks = Array.isArray(richMessagePayload) ? richMessagePayload : (richMessagePayload.blocks || []);
      const tableBlocks = blocks.filter((b) => b && b.type === 'table');
      if (tableBlocks.length > 0) {
        text = tableBlocks.map((tb) => tableToLegacyHtml(tb)).join('\n\n');
        chatContext.parse_mode = 'HTML';
      }
    }

    if (!text) {
      text = '⚠️ 目前訊息無法以富文本格式顯示。';
    }
    
    if (text.length > 4000) {
      const chunks = splitRichTextIntoLegacyChunks(text, 4000);
      let lastResp = null;
      for (let i = 0; i < chunks.length; i++) {
        const chunkContext = { ...chatContext };
        if (i > 0) {
          chunkContext.message_id = null;
          chunkContext.reply_to_message_id = null;
          chunkContext.allow_sending_without_reply = true;
        }
        lastResp = await sendMessageToTelegram(chunks[i], token, chunkContext);
        if (!lastResp || !lastResp.ok) {
          // 若有任何 chunk 發送失敗，立即回傳該失敗回應，避免後續成功覆蓋失敗狀態
          return lastResp;
        }
      }
      return lastResp;
    }
    return await sendMessageToTelegram(text, token, chatContext);
  }

  return resp;
}

export function sendRichMessageWithContext(context) {
  return async (richMessagePayload, fallbackText) => {
    if (context?.captureToolOutput && typeof context.captureToolOutput === 'function') {
      const output = fallbackText !== undefined && fallbackText !== null
        ? String(fallbackText)
        : (typeof richMessagePayload === 'string' ? richMessagePayload : JSON.stringify(richMessagePayload));
      context.captureToolOutput(output);
      return new Response(JSON.stringify({ ok: true, result: { message_id: 1 } }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    }
    return sendRichMessageToTelegram(
      richMessagePayload,
      context.SHARE_CONTEXT.currentBotToken,
      context.CURRENT_CHAT_CONTEXT,
      fallbackText
    );
  };
}

export function deleteMessageFromTelegramWithContext(context) {
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

// ========== 圖片發送 ==========

export async function sendPhotoToTelegram(photo, token, context) {
  const url = `${ENV.TELEGRAM_API_DOMAIN}/bot${token}/sendPhoto`;
  let body;
  const headers = {};
  
  const photoContext = { ...(context || {}) };
  if (photoContext.caption) {
    if (photoContext.parse_mode === "Markdown" || photoContext.parse_mode === "MarkdownV2") {
      photoContext.caption = markdownToTelegramHtml(photoContext.caption);
      photoContext.parse_mode = "HTML";
    } else if (photoContext.parse_mode === "HTML") {
      photoContext.caption = balanceTelegramHtmlTags(photoContext.caption);
    }
  }
  
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
      for (const key of Object.keys(photoContext)) {
        if (photoContext[key] !== undefined && photoContext[key] !== null) {
          body.append(key, `${photoContext[key]}`);
        }
      }
    } catch (e) {
      console.error("Error processing base64 image:", e);
      // 如果處理失敗，嘗試直接發送原始字符串
      body = { photo };
      for (const key of Object.keys(photoContext)) {
        if (photoContext[key] !== undefined && photoContext[key] !== null) {
          body[key] = photoContext[key];
        }
      }
      body = JSON.stringify(body);
      headers["Content-Type"] = "application/json";
    }
  } else if (typeof photo === "string") {
    // 處理普通 URL
    body = { photo };
    for (const key of Object.keys(photoContext)) {
      if (photoContext[key] !== undefined && photoContext[key] !== null) {
        body[key] = photoContext[key];
      }
    }
    body = JSON.stringify(body);
    headers["Content-Type"] = "application/json";
  } else {
    // 處理 Blob 或其他類型
    body = new FormData();
    body.append("photo", photo, "photo.png");
    for (const key of Object.keys(photoContext)) {
      if (photoContext[key] !== undefined && photoContext[key] !== null) {
        body.append(key, `${photoContext[key]}`);
      }
    }
  }
  
  return await fetch(url, {
    method: "POST",
    headers,
    body
  });
}

export function sendPhotoToTelegramWithContext(context) {
  return (url) => {
    return sendPhotoToTelegram(
      url, 
      context.SHARE_CONTEXT.currentBotToken, 
      context.CURRENT_CHAT_CONTEXT
    );
  };
}

// ========== 檔案、影片、音訊發送 ==========

export async function sendDocumentToTelegram(document, token, context, filename = "file.dat") {
  const url = `${ENV.TELEGRAM_API_DOMAIN}/bot${token}/sendDocument`;
  let body;
  const headers = {};

  if (typeof document === "string" && !document.startsWith("data:")) {
    body = JSON.stringify({ document, ...context });
    headers["Content-Type"] = "application/json";
  } else {
    body = new FormData();
    body.append("document", document, filename);
    for (const key of Object.keys(context)) {
      if (context[key] !== undefined && context[key] !== null) {
        body.append(key, `${context[key]}`);
      }
    }
  }

  return await fetch(url, { method: "POST", headers, body });
}

export function sendDocumentToTelegramWithContext(context) {
  return (document, filename) => {
    return sendDocumentToTelegram(
      document,
      context.SHARE_CONTEXT.currentBotToken,
      context.CURRENT_CHAT_CONTEXT,
      filename
    );
  };
}

export async function sendVideoToTelegram(video, token, context) {
  const url = `${ENV.TELEGRAM_API_DOMAIN}/bot${token}/sendVideo`;
  let body;
  const headers = {};

  if (typeof video === "string" && !video.startsWith("data:")) {
    body = JSON.stringify({ video, ...context });
    headers["Content-Type"] = "application/json";
  } else {
    body = new FormData();
    body.append("video", video, "video.mp4");
    for (const key of Object.keys(context)) {
      if (context[key] !== undefined && context[key] !== null) {
        body.append(key, `${context[key]}`);
      }
    }
  }

  return await fetch(url, { method: "POST", headers, body });
}

export function sendVideoToTelegramWithContext(context) {
  return (video) => {
    return sendVideoToTelegram(
      video,
      context.SHARE_CONTEXT.currentBotToken,
      context.CURRENT_CHAT_CONTEXT
    );
  };
}

export async function sendAudioToTelegram(audio, token, context, filename = "audio.mp3") {
  const url = `${ENV.TELEGRAM_API_DOMAIN}/bot${token}/sendAudio`;
  let body;
  const headers = {};

  if (typeof audio === "string" && !audio.startsWith("data:")) {
    body = JSON.stringify({ audio, ...context });
    headers["Content-Type"] = "application/json";
  } else {
    body = new FormData();
    body.append("audio", audio, filename);
    for (const key of Object.keys(context)) {
      if (context[key] !== undefined && context[key] !== null) {
        body.append(key, `${context[key]}`);
      }
    }
  }

  return await fetch(url, { method: "POST", headers, body });
}

export function sendAudioToTelegramWithContext(context) {
  return (audio, filename) => {
    return sendAudioToTelegram(
      audio,
      context.SHARE_CONTEXT.currentBotToken,
      context.CURRENT_CHAT_CONTEXT,
      filename
    );
  };
}

// ========== Chat Action ==========

export async function sendChatActionToTelegram(action, token, chatId) {
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

export function sendChatActionToTelegramWithContext(context) {
  return (action) => {
    return sendChatActionToTelegram(
      action, 
      context.SHARE_CONTEXT.currentBotToken, 
      context.CURRENT_CHAT_CONTEXT.chat_id
    );
  };
}

// ========== Callback Query & Inline Keyboard ==========

/**
 * 建立相容 Telegram 10.3 的 Inline Keyboard 按鈕
 * 支援 DisabledButton 規範（"disabled": {}，並嚴格省略 callback_data, url 等所有 action 欄位）
 */
export function buildInlineButton({ text, callback_data, disabled, url, ...rest }) {
  if (disabled) {
    // 嚴格白名單：DisabledButton 僅保留 text 與外觀屬性，徹底剝離所有 action 屬性
    const cleanRest = { ...rest };
    delete cleanRest.callback_data;
    delete cleanRest.url;
    delete cleanRest.web_app;
    delete cleanRest.login_url;
    delete cleanRest.switch_inline_query;
    delete cleanRest.switch_inline_query_current_chat;
    delete cleanRest.callback_game;

    return {
      text: String(text || ''),
      disabled: typeof disabled === 'object' && disabled !== null ? disabled : {},
      ...cleanRest
    };
  }
  return {
    text: String(text || ''),
    ...(callback_data ? { callback_data } : {}),
    ...(url ? { url } : {}),
    ...rest
  };
}

/**
 * 建立相容 Telegram 10.3 的 Inline Keyboard 物件
 * 自動將具有 disabled 的按鈕轉為 Telegram 10.3 disabled: {} 規範並移除所有 action 欄位
 */
export function buildInlineKeyboard(rows = []) {
  return {
    inline_keyboard: rows.map((row) =>
      row.map((btn) => {
        if (btn && btn.disabled) {
          const {
            callback_data,
            url,
            web_app,
            login_url,
            switch_inline_query,
            switch_inline_query_current_chat,
            callback_game,
            ...restBtn
          } = btn;
          return {
            ...restBtn,
            disabled: typeof btn.disabled === 'object' && btn.disabled !== null ? btn.disabled : {}
          };
        }
        return btn;
      })
    )
  };
}

/**
 * 回應 Callback Query（Inline Keyboard 按鈕點擊）
 * @param {string} token - Bot Token
 * @param {string} callbackQueryId - Callback Query ID
 * @param {string} text - 可選的提示文字
 */
export async function answerCallbackQuery(token, callbackQueryId, text = null) {
  const body = { callback_query_id: callbackQueryId };
  if (text) {
    body.text = text;
  }
  return await fetch(
    `${ENV.TELEGRAM_API_DOMAIN}/bot${token}/answerCallbackQuery`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }
  ).then((res) => res.json());
}

// ========== Webhook ==========

export async function bindTelegramWebHook(token, url) {
  return await fetch(
    `${ENV.TELEGRAM_API_DOMAIN}/bot${token}/setWebhook`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ url })
    }
  ).then((res) => res.json());
}

// ========== Bot 資訊 ==========

export async function getBot(token) {
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

// ========== 檔案處理 ==========

export async function getFileLink(fileId, token) {
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

// ========== 群組管理 ==========

export async function getChatRole(id, groupAdminKey, chatId, token) {
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
      { expiration: Date.now() / 1000 + 120 }
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

export function getChatRoleWithContext(context) {
  return (id) => {
    return getChatRole(
      id, 
      context.SHARE_CONTEXT.groupAdminKey, 
      context.CURRENT_CHAT_CONTEXT.chat_id, 
      context.SHARE_CONTEXT.currentBotToken
    );
  };
}

export async function getChatAdminister(chatId, token) {
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
