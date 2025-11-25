/**
 * Telegram API 基礎功能
 * 包含訊息發送、圖片上傳、Webhook 設定等
 */

import { ENV, DATABASE } from '../config/env.js';
import { escape } from '../utils/md2tgmd.js';

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

export function sendMessageToTelegramWithContext(context) {
  return async (message) => {
    return sendMessageToTelegram(
      message, 
      context.SHARE_CONTEXT.currentBotToken, 
      context.CURRENT_CHAT_CONTEXT
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
        if (context[key] !== undefined && context[key] !== null) {
          body.append(key, `${context[key]}`);
        }
      }
    } catch (e) {
      console.error("Error processing base64 image:", e);
      // 如果處理失敗，嘗試直接發送原始字符串
      body = { photo };
      for (const key of Object.keys(context)) {
        if (context[key] !== undefined && context[key] !== null) {
          body[key] = context[key];
        }
      }
      body = JSON.stringify(body);
      headers["Content-Type"] = "application/json";
    }
  } else if (typeof photo === "string") {
    // 處理普通 URL
    body = { photo };
    for (const key of Object.keys(context)) {
      if (context[key] !== undefined && context[key] !== null) {
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
      if (context[key] !== undefined && context[key] !== null) {
        body.append(key, `${context[key]}`);
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
