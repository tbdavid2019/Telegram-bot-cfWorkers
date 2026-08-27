/**
 * 888box Asset Management & Storage Feature
 * 支援上傳圖片、影片、音訊、檔案至 888box 雲端儲存
 * 具備 3-Tier 自動容錯備援：
 * - 主要: https://box.david888.com
 * - 備援 1: https://box.glsoft.ai
 * - 備援 2: https://box.aiurl.tw
 */

import { sendMessageToTelegramWithContext, getFileLink, sendChatActionToTelegramWithContext } from '../telegram/telegram.js';
import { ENV } from '../config/env.js';

export const BOX_DEFAULT_PRIMARY = 'https://box.david888.com';
export const BOX_DEFAULT_FALLBACKS = [
  'https://box.glsoft.ai',
  'https://box.aiurl.tw'
];

/**
 * 取得所有 888box 節點列表（主節點優先，備援節點依序排列）
 * @param {Object} [context] - 上下文物件
 * @returns {string[]} 節點 URL 列表
 */
export function getBoxEndpoints(context = null) {
  const primary = (context?.USER_CONFIG?.BOX_API_BASE || ENV.USER_CONFIG?.BOX_API_BASE || BOX_DEFAULT_PRIMARY).replace(/\/+$/, '');
  const fallbacks = (context?.USER_CONFIG?.BOX_FALLBACK_BASES || ENV.USER_CONFIG?.BOX_FALLBACK_BASES || BOX_DEFAULT_FALLBACKS).map(url => url.replace(/\/+$/, ''));
  
  const endpoints = [primary, ...fallbacks].filter(Boolean);
  return Array.from(new Set(endpoints));
}

/**
 * 取得 888box API Token（如已設定）
 * @param {Object} [context] - 上下文物件
 * @returns {string} Token
 */
export function getBoxToken(context = null) {
  return context?.USER_CONFIG?.BOX_API_TOKEN || ENV.USER_CONFIG?.BOX_API_TOKEN || '';
}

/**
 * 執行 888box MCP JSON-RPC 工具呼叫（支援 3-Tier 備援）
 * @param {string} name - MCP 工具名稱
 * @param {Object} [args={}] - 參數
 * @param {Object} [context=null] - 上下文物件
 * @param {Object} [options={}] - 其他選項 (例如 timeoutMs)
 * @returns {Promise<{result: any, text: string, endpoint: string}>}
 */
export async function callBoxMcp(name, args = {}, context = null, options = {}) {
  const endpoints = getBoxEndpoints(context);
  const token = args.token || getBoxToken(context);
  const timeoutMs = options.timeoutMs || 15000;
  let lastError = null;

  const payload = {
    jsonrpc: '2.0',
    id: Date.now(),
    method: 'tools/call',
    params: {
      name,
      arguments: {
        ...args,
        ...(token ? { token } : {})
      }
    }
  };

  for (const endpoint of endpoints) {
    try {
      const url = `${endpoint}/mcp.php`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(timeoutMs)
      });

      if (!res.ok) {
        throw new Error(`MCP HTTP ${res.status} on ${endpoint}`);
      }

      const json = await res.json();
      if (json.error) {
        throw new Error(json.error.message || `MCP call error on ${endpoint}`);
      }

      const contentList = json?.result?.content || [];
      const textContent = contentList.map(c => c.text || '').join('\n').trim();

      // 嘗試從文字中解析 JSON 區塊
      let parsedData = null;
      if (textContent) {
        const jsonMatch = textContent.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
        if (jsonMatch) {
          try {
            parsedData = JSON.parse(jsonMatch[0]);
          } catch (e) {
            // ignore parse error
          }
        }
      }

      return {
        raw: json,
        data: parsedData,
        text: textContent,
        endpoint
      };
    } catch (e) {
      console.warn(`[888box MCP] Error calling ${name} on ${endpoint}:`, e.message);
      lastError = e;
    }
  }

  throw lastError || new Error(`所有 888box 節點呼叫 MCP 工具 [${name}] 失敗`);
}

/**
 * 執行 888box 原生 API 呼叫（支援 3-Tier 備援）
 * @param {string} action - API action (如 'upload', 'upload_url', 'list', 'stats')
 * @param {FormData|Object|URLSearchParams} [bodyOrParams] - 請求內容
 * @param {Object} [context=null] - 上下文物件
 * @param {Object} [options={}] - 其他選項
 * @returns {Promise<{data: any, endpoint: string}>}
 */
export async function callBoxApi(action, bodyOrParams = {}, context = null, options = {}) {
  const endpoints = getBoxEndpoints(context);
  const token = (typeof bodyOrParams === 'object' && bodyOrParams?.token) || getBoxToken(context);
  const timeoutMs = options.timeoutMs || 25000;
  let lastError = null;

  for (const endpoint of endpoints) {
    try {
      const url = `${endpoint}/api.php?action=${encodeURIComponent(action)}${token ? `&token=${encodeURIComponent(token)}` : ''}`;
      let fetchOptions = {
        signal: AbortSignal.timeout(timeoutMs)
      };

      if (bodyOrParams instanceof FormData) {
        if (token && !bodyOrParams.has('token')) {
          bodyOrParams.append('token', token);
        }
        fetchOptions = {
          ...fetchOptions,
          method: 'POST',
          body: bodyOrParams
        };
      } else if (typeof bodyOrParams === 'object' && Object.keys(bodyOrParams).length > 0) {
        const formData = new FormData();
        for (const [k, v] of Object.entries(bodyOrParams)) {
          if (v !== undefined && v !== null) {
            formData.append(k, `${v}`);
          }
        }
        if (token && !formData.has('token')) {
          formData.append('token', token);
        }
        fetchOptions = {
          ...fetchOptions,
          method: 'POST',
          body: formData
        };
      } else {
        fetchOptions = {
          ...fetchOptions,
          method: 'GET'
        };
      }

      if (token) {
        fetchOptions.headers = {
          ...(fetchOptions.headers || {}),
          'Authorization': `Bearer ${token}`
        };
      }

      const res = await fetch(url, fetchOptions);
      if (!res.ok) {
        throw new Error(`API HTTP ${res.status} on ${endpoint}`);
      }

      const json = await res.json();
      if (json.result === 'error' || json.code === 400 || json.code === 401 || json.code === 403 || json.code === 500) {
        throw new Error(json.message || `API error on ${endpoint}`);
      }

      return {
        data: json,
        endpoint
      };
    } catch (e) {
      console.warn(`[888box API] Error calling action ${action} on ${endpoint}:`, e.message);
      lastError = e;
    }
  }

  throw lastError || new Error(`所有 888box 節點呼叫 API [${action}] 失敗`);
}

/**
 * 遠端 URL 轉存上傳到 888box（優先 MCP，備援 API）
 * @param {string} url - 遠端資源網址
 * @param {Object} [options] - 標題、描述、密碼、Token
 * @param {Object} [context] - 上下文
 * @returns {Promise<{success: boolean, url: string, share_url: string, id: any, type: string, title: string, endpoint: string}>}
 */
export async function boxUploadUrl(url, options = {}, context = null) {
  if (!url || typeof url !== 'string') {
    throw new Error('請提供有效的 URL');
  }

  const { title = '', description = '', password = '', token = '' } = options;

  // 1. 優先嘗試 MCP 工具 upload_asset_by_url
  try {
    const mcpRes = await callBoxMcp('upload_asset_by_url', {
      url,
      ...(title ? { title } : {}),
      ...(description ? { description } : {}),
      ...(password ? { password } : {}),
      ...(token ? { token } : {})
    }, context);

    if (mcpRes.data && (mcpRes.data.success || mcpRes.data.url || mcpRes.data.share_url)) {
      return {
        success: true,
        url: mcpRes.data.url || '',
        share_url: mcpRes.data.share_url || '',
        id: mcpRes.data.id || '',
        type: mcpRes.data.type || 'asset',
        title: mcpRes.data.title || title || '',
        endpoint: mcpRes.endpoint
      };
    }

    if (mcpRes.text.includes('Asset uploaded successfully')) {
      const urlMatch = mcpRes.text.match(/"url":\s*"([^"]+)"/);
      const shareMatch = mcpRes.text.match(/"share_url":\s*"([^"]+)"/);
      const idMatch = mcpRes.text.match(/"id":\s*"?(\w+)"?/);
      const typeMatch = mcpRes.text.match(/"type":\s*"([^"]+)"/);

      return {
        success: true,
        url: urlMatch ? urlMatch[1] : '',
        share_url: shareMatch ? shareMatch[1] : '',
        id: idMatch ? idMatch[1] : '',
        type: typeMatch ? typeMatch[1] : 'asset',
        title: title || '',
        endpoint: mcpRes.endpoint
      };
    }
  } catch (mcpErr) {
    console.warn('[888box] MCP upload_asset_by_url failed, falling back to API upload_url:', mcpErr.message);
  }

  // 2. 備援嘗試原生 API upload_url
  const apiRes = await callBoxApi('upload_url', {
    url,
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    ...(password ? { password } : {}),
    ...(token ? { token } : {})
  }, context);

  const data = apiRes.data?.data || apiRes.data || {};
  return {
    success: true,
    url: data.url || apiRes.data.url || '',
    share_url: data.share_url || apiRes.data.share_url || '',
    id: data.id || apiRes.data.id || '',
    type: data.type || 'asset',
    title: data.title || title || '',
    endpoint: apiRes.endpoint
  };
}

/**
 * 本地檔案 / Binary Buffer / Base64 / Blob 直接上傳到 888box
 * @param {Blob|Uint8Array|ArrayBuffer|string} data - 檔案資料或 base64
 * @param {string} filename - 檔案名稱
 * @param {Object} [options] - 標題、描述、Token、MIME Type
 * @param {Object} [context] - 上下文
 * @returns {Promise<{success: boolean, url: string, share_url: string, id: any, type: string, name: string, endpoint: string}>}
 */
export async function boxUploadBuffer(data, filename = 'upload.bin', options = {}, context = null) {
  const { title = '', description = '', token = '', mimeType = '' } = options;
  let fileBlob;

  if (typeof data === 'string' && data.startsWith('data:')) {
    // 處理 base64 Data URL
    const [header, base64Data] = data.split(',');
    const detectedMime = mimeType || header.match(/data:([^;]+)/)?.[1] || 'application/octet-stream';
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    fileBlob = new Blob([bytes], { type: detectedMime });
  } else if (data instanceof Blob) {
    fileBlob = data;
  } else if (data instanceof Uint8Array || data instanceof ArrayBuffer) {
    fileBlob = new Blob([data], { type: mimeType || 'application/octet-stream' });
  } else {
    throw new Error('不支援的檔案資料格式');
  }

  const formData = new FormData();
  formData.append('file', fileBlob, filename);
  if (title) formData.append('title', title);
  if (description) formData.append('description', description);
  if (token) formData.append('token', token);

  const apiRes = await callBoxApi('upload', formData, context);
  const resData = apiRes.data?.data || apiRes.data || {};

  return {
    success: true,
    url: resData.url || apiRes.data.url || '',
    share_url: resData.share_url || apiRes.data.share_url || '',
    id: resData.id || apiRes.data.id || '',
    type: resData.is_video ? 'video' : resData.is_audio ? 'audio' : resData.is_file ? 'file' : 'image',
    name: resData.name || filename,
    endpoint: apiRes.endpoint
  };
}

/**
 * 取得 888box 資產列表
 * @param {Object} [options] - type, page, limit, token
 * @param {Object} [context] - 上下文
 * @returns {Promise<{items: Array, rawText: string, endpoint: string}>}
 */
export async function boxListAssets(options = {}, context = null) {
  const { type = 'all', page = 1, limit = 10, token = '' } = options;

  try {
    const mcpRes = await callBoxMcp('list_assets', {
      type,
      page,
      limit,
      ...(token ? { token } : {})
    }, context);

    let items = [];
    if (Array.isArray(mcpRes.data)) {
      items = mcpRes.data;
    } else if (mcpRes.data?.list && Array.isArray(mcpRes.data.list)) {
      items = mcpRes.data.list;
    }

    return {
      items,
      rawText: mcpRes.text,
      endpoint: mcpRes.endpoint
    };
  } catch (e) {
    console.warn('[888box] MCP list_assets failed, trying API list:', e.message);
    const apiRes = await callBoxApi('list', { type, page, limit, token }, context);
    const list = apiRes.data?.data?.list || apiRes.data?.list || [];
    return {
      items: Array.isArray(list) ? list : [],
      rawText: JSON.stringify(apiRes.data, null, 2),
      endpoint: apiRes.endpoint
    };
  }
}

/**
 * 搜尋 888box 資產
 * @param {string} query - 關鍵字
 * @param {Object} [options] - type, token
 * @param {Object} [context] - 上下文
 * @returns {Promise<{items: Array, rawText: string, endpoint: string}>}
 */
export async function boxSearchAssets(query, options = {}, context = null) {
  if (!query || typeof query !== 'string') {
    throw new Error('請提供搜尋關鍵字');
  }

  const { type = 'all', token = '' } = options;

  try {
    const mcpRes = await callBoxMcp('search_assets', {
      query,
      type,
      ...(token ? { token } : {})
    }, context);

    let items = [];
    if (Array.isArray(mcpRes.data)) {
      items = mcpRes.data;
    } else if (mcpRes.data?.list && Array.isArray(mcpRes.data.list)) {
      items = mcpRes.data.list;
    }

    return {
      items,
      rawText: mcpRes.text,
      endpoint: mcpRes.endpoint
    };
  } catch (e) {
    console.warn('[888box] MCP search_assets failed, trying API search:', e.message);
    const apiRes = await callBoxApi('search', { q: query, type, token }, context);
    const list = apiRes.data?.data?.list || apiRes.data?.list || [];
    return {
      items: Array.isArray(list) ? list : [],
      rawText: JSON.stringify(apiRes.data, null, 2),
      endpoint: apiRes.endpoint
    };
  }
}

/**
 * 取得 888box 儲存統計
 * @param {Object} [options] - token
 * @param {Object} [context] - 上下文
 * @returns {Promise<{stats: Object, rawText: string, endpoint: string}>}
 */
export async function boxGetStats(options = {}, context = null) {
  const { token = '' } = options;

  try {
    const mcpRes = await callBoxMcp('get_stats', {
      ...(token ? { token } : {})
    }, context);

    return {
      stats: mcpRes.data || {},
      rawText: mcpRes.text,
      endpoint: mcpRes.endpoint
    };
  } catch (e) {
    console.warn('[888box] MCP get_stats failed, trying API stats:', e.message);
    const apiRes = await callBoxApi('stats', { token }, context);
    return {
      stats: apiRes.data?.data || apiRes.data || {},
      rawText: JSON.stringify(apiRes.data, null, 2),
      endpoint: apiRes.endpoint
    };
  }
}

/**
 * 取得 888box Podcast 資訊
 * @param {Object} [options] - token
 * @param {Object} [context] - 上下文
 * @returns {Promise<{info: any, rawText: string, endpoint: string}>}
 */
export async function boxGetPodcastInfo(options = {}, context = null) {
  const { token = '' } = options;
  const mcpRes = await callBoxMcp('get_podcast_info', {
    ...(token ? { token } : {})
  }, context);

  return {
    info: mcpRes.data || {},
    rawText: mcpRes.text,
    endpoint: mcpRes.endpoint
  };
}

/**
 * 刪除 888box 資產
 * @param {number|string} id - 資產 ID
 * @param {Object} [options] - token
 * @param {Object} [context] - 上下文
 * @returns {Promise<{success: boolean, endpoint: string}>}
 */
export async function boxDeleteAsset(id, options = {}, context = null) {
  if (!id) {
    throw new Error('請提供要刪除的資產 ID');
  }

  const { token = '' } = options;
  const numId = parseInt(id, 10);

  try {
    const mcpRes = await callBoxMcp('delete_asset', {
      id: isNaN(numId) ? id : numId,
      ...(token ? { token } : {})
    }, context);

    return {
      success: true,
      rawText: mcpRes.text,
      endpoint: mcpRes.endpoint
    };
  } catch (e) {
    const apiRes = await callBoxApi('delete', { id, token }, context);
    return {
      success: true,
      rawText: JSON.stringify(apiRes.data),
      endpoint: apiRes.endpoint
    };
  }
}

/**
 * 從 Telegram 訊息（或被回覆的訊息）中提取媒體資訊
 * 支援 photo, video, document, audio, voice, animation
 * @param {Object} message - Telegram 訊息物件
 * @param {Object} context - 上下文
 * @param {boolean} [allowReply=true] - 是否支援從 reply_to_message 提取
 * @returns {Promise<{type: string, url: string, fileName: string, mimeType: string}|null>}
 */
export async function extractTelegramMedia(message, context, allowReply = true) {
  const targetMessages = [message];
  if (allowReply && message?.reply_to_message) {
    targetMessages.push(message.reply_to_message);
  }

  const botToken = context?.SHARE_CONTEXT?.currentBotToken || '';

  for (const msg of targetMessages) {
    if (!msg) continue;

    // 1. 照片 (Photo)
    if (msg.photo && Array.isArray(msg.photo) && msg.photo.length > 0) {
      const bestPhoto = msg.photo[msg.photo.length - 1];
      const url = await getFileLink(bestPhoto.file_id, botToken);
      if (url) {
        return {
          type: 'image',
          url,
          fileName: `photo_${bestPhoto.file_id.slice(-6)}.jpg`,
          mimeType: 'image/jpeg'
        };
      }
    }

    // 2. 影片 (Video)
    if (msg.video) {
      const url = await getFileLink(msg.video.file_id, botToken);
      if (url) {
        return {
          type: 'video',
          url,
          fileName: msg.video.file_name || `video_${msg.video.file_id.slice(-6)}.mp4`,
          mimeType: msg.video.mime_type || 'video/mp4'
        };
      }
    }

    // 3. 文件 / 檔案 (Document)
    if (msg.document) {
      const url = await getFileLink(msg.document.file_id, botToken);
      if (url) {
        return {
          type: 'file',
          url,
          fileName: msg.document.file_name || `file_${msg.document.file_id.slice(-6)}.dat`,
          mimeType: msg.document.mime_type || 'application/octet-stream'
        };
      }
    }

    // 4. 音訊 (Audio)
    if (msg.audio) {
      const url = await getFileLink(msg.audio.file_id, botToken);
      if (url) {
        return {
          type: 'audio',
          url,
          fileName: msg.audio.file_name || `${msg.audio.title || 'audio'}.mp3`,
          mimeType: msg.audio.mime_type || 'audio/mpeg'
        };
      }
    }

    // 5. 語音 (Voice)
    if (msg.voice) {
      const url = await getFileLink(msg.voice.file_id, botToken);
      if (url) {
        return {
          type: 'audio',
          url,
          fileName: `voice_${msg.voice.file_id.slice(-6)}.ogg`,
          mimeType: msg.voice.mime_type || 'audio/ogg'
        };
      }
    }

    // 6. 動畫 (Animation / GIF)
    if (msg.animation) {
      const url = await getFileLink(msg.animation.file_id, botToken);
      if (url) {
        return {
          type: 'video',
          url,
          fileName: msg.animation.file_name || `animation_${msg.animation.file_id.slice(-6)}.mp4`,
          mimeType: msg.animation.mime_type || 'video/mp4'
        };
      }
    }
  }

  return null;
}

/**
 * 通用資產儲存助手（支援 URL、Base64、Buffer、Telegram 媒體物件）
 * @param {string|Blob|Uint8Array|Object} asset - 資源
 * @param {string} [filenameOrTitle=''] - 檔案名稱或標題
 * @param {Object} [options={}] - 其他選項
 * @param {Object} [context=null] - 上下文
 * @returns {Promise<{success: boolean, url: string, share_url: string, id: any, type: string, endpoint: string}>}
 */
export async function saveAssetToBox(asset, filenameOrTitle = '', options = {}, context = null) {
  if (typeof asset === 'string') {
    if (asset.startsWith('http://') || asset.startsWith('https://')) {
      return await boxUploadUrl(asset, { title: filenameOrTitle, ...options }, context);
    } else if (asset.startsWith('data:')) {
      return await boxUploadBuffer(asset, filenameOrTitle || 'image.png', { title: filenameOrTitle, ...options }, context);
    }
  } else if (asset && typeof asset === 'object' && asset.url) {
    return await boxUploadUrl(asset.url, { title: filenameOrTitle || asset.fileName, ...options }, context);
  } else if (asset instanceof Blob || asset instanceof Uint8Array || asset instanceof ArrayBuffer) {
    return await boxUploadBuffer(asset, filenameOrTitle || 'upload.bin', { title: filenameOrTitle, ...options }, context);
  }

  throw new Error('未知的資產格式，無法儲存至 888box');
}

// ========== Telegram 指令處理器 ==========

/**
 * /box 指令主進入點
 * 支援：
 * 1. /box <URL> [標題] -> 遠端網址轉存
 * 2. 回覆訊息帶媒體並輸入 /box [標題] -> 提取 Telegram 檔案轉存
 * 3. /box list [type] [page] -> 資產列表
 * 4. /box search <keyword> -> 關鍵字搜尋
 * 5. /box stats -> 儲存統計
 * 6. /box podcast -> Podcast RSS
 * 7. /box help -> 說明
 */
export async function commandBox(message, command, subcommand, context) {
  const args = subcommand ? subcommand.trim().split(/\s+/) : [];
  const action = args[0]?.toLowerCase() || '';

  // 1. 子指令路由
  if (action === 'list') {
    const subArgs = args.slice(1).join(' ');
    return commandBoxList(message, command, subArgs, context);
  }

  if (action === 'search') {
    const subArgs = args.slice(1).join(' ');
    return commandBoxSearch(message, command, subArgs, context);
  }

  if (action === 'stats') {
    return commandBoxStats(message, command, '', context);
  }

  if (action === 'podcast') {
    return commandBoxPodcast(message, command, '', context);
  }

  if (action === 'help' || action === '-h' || action === '--help') {
    return sendBoxHelp(context);
  }

  // 2. 檢查是否附帶或回覆 Telegram 媒體（圖片、影片、檔案、音訊、語音）
  const media = await extractTelegramMedia(message, context, true);
  if (media) {
    setTimeout(() => sendChatActionToTelegramWithContext(context)('upload_document').catch(console.error), 0);
    try {
      const title = subcommand ? subcommand.trim() : (media.fileName || 'Telegram Asset');
      const uploadRes = await saveAssetToBox(media, title, {}, context);

      let reply = `📦 *【888box 資產轉存成功】*\n\n`;
      reply += `🏷️ **標題**: ${escapeMarkdown(uploadRes.title || title)}\n`;
      reply += `📂 **類型**: \`${uploadRes.type || media.type}\`\n`;
      if (uploadRes.id) reply += `🆔 **資產 ID**: \`${uploadRes.id}\`\n`;
      if (uploadRes.share_url) reply += `🔗 **分享連結**: [點此開啟](${uploadRes.share_url})\n`;
      if (uploadRes.url) reply += `🌐 **直連網址**: [檔案直連](${uploadRes.url})\n`;
      reply += `⚡ **節點**: \`${uploadRes.endpoint}\`\n\n`;
      reply += `_提示: 可在 888box 管理後台或 Podcast RSS 中查看。_`;

      context.CURRENT_CHAT_CONTEXT.parse_mode = 'Markdown';
      return sendMessageToTelegramWithContext(context)(reply);
    } catch (e) {
      context.CURRENT_CHAT_CONTEXT.parse_mode = 'Markdown';
      return sendMessageToTelegramWithContext(context)(`❌ *888box 轉存失敗*: ${escapeMarkdown(e.message)}`);
    }
  }

  // 3. 檢查是否傳入 URL
  if (action.startsWith('http://') || action.startsWith('https://')) {
    const targetUrl = args[0];
    const title = args.slice(1).join(' ') || '';

    setTimeout(() => sendChatActionToTelegramWithContext(context)('upload_document').catch(console.error), 0);
    try {
      const uploadRes = await boxUploadUrl(targetUrl, { title }, context);

      let reply = `📦 *【888box 遠端轉存成功】*\n\n`;
      reply += `🏷️ **標題**: ${escapeMarkdown(uploadRes.title || title || '遠端資源')}\n`;
      reply += `📂 **類型**: \`${uploadRes.type}\`\n`;
      if (uploadRes.id) reply += `🆔 **資產 ID**: \`${uploadRes.id}\`\n`;
      if (uploadRes.share_url) reply += `🔗 **分享連結**: [點此開啟](${uploadRes.share_url})\n`;
      if (uploadRes.url) reply += `🌐 **直連網址**: [檔案直連](${uploadRes.url})\n`;
      reply += `⚡ **節點**: \`${uploadRes.endpoint}\`\n\n`;
      reply += `_提示: 影片與音訊將自動加入 Podcast RSS 訂閱源。_`;

      context.CURRENT_CHAT_CONTEXT.parse_mode = 'Markdown';
      return sendMessageToTelegramWithContext(context)(reply);
    } catch (e) {
      context.CURRENT_CHAT_CONTEXT.parse_mode = 'Markdown';
      return sendMessageToTelegramWithContext(context)(`❌ *888box 遠端轉存失敗*: ${escapeMarkdown(e.message)}`);
    }
  }

  // 4. 無參數或未匹配，顯示說明選單
  return sendBoxHelp(context);
}

/**
 * /boxlist 指令
 */
export async function commandBoxList(message, command, subcommand, context) {
  const args = subcommand ? subcommand.trim().split(/\s+/) : [];
  let type = 'all';
  let page = 1;

  if (args.length > 0) {
    if (['all', 'image', 'video', 'audio', 'file'].includes(args[0].toLowerCase())) {
      type = args[0].toLowerCase();
      if (args[1] && !isNaN(parseInt(args[1], 10))) {
        page = parseInt(args[1], 10);
      }
    } else if (!isNaN(parseInt(args[0], 10))) {
      page = parseInt(args[0], 10);
    }
  }

  setTimeout(() => sendChatActionToTelegramWithContext(context)('typing').catch(console.error), 0);

  try {
    const listRes = await boxListAssets({ type, page, limit: 10 }, context);
    let reply = `📦 *【888box 資產列表】* (類型: \`${type}\`, 頁數: ${page})\n`;
    reply += `⚡ 節點: \`${listRes.endpoint}\`\n\n`;

    if (listRes.items && listRes.items.length > 0) {
      listRes.items.forEach((item, idx) => {
        const itemType = item.is_video ? '🎬 影片' : item.is_audio ? '🎵 音訊' : item.is_file ? '📄 檔案' : '🖼️ 圖片';
        const title = item.title || item.name || `Asset #${item.id}`;
        const sizeStr = item.size ? ` (${formatBytes(item.size)})` : '';
        const link = item.share_url || item.url || item.public_url || '#';

        reply += `${idx + 1}. ${itemType} *[${escapeMarkdown(title)}](${link})*${sizeStr}\n`;
        if (item.created_at) reply += `   🕒 \`${item.created_at}\` | ID: \`${item.id}\`\n`;
      });
      reply += `\n_翻頁提示: \`/box list ${type} ${page + 1}\`_`;
    } else if (listRes.rawText) {
      reply += `${listRes.rawText}\n`;
    } else {
      reply += `目前沒有找到任何資產。\n`;
    }

    context.CURRENT_CHAT_CONTEXT.parse_mode = 'Markdown';
    return sendMessageToTelegramWithContext(context)(reply);
  } catch (e) {
    context.CURRENT_CHAT_CONTEXT.parse_mode = 'Markdown';
    return sendMessageToTelegramWithContext(context)(`❌ *888box 列表取得失敗*: ${escapeMarkdown(e.message)}`);
  }
}

/**
 * /boxsearch 指令
 */
export async function commandBoxSearch(message, command, subcommand, context) {
  if (!subcommand || subcommand.trim() === '') {
    context.CURRENT_CHAT_CONTEXT.parse_mode = 'Markdown';
    return sendMessageToTelegramWithContext(context)('💡 *請輸入搜尋關鍵字*，例如：\n`/box search 貓咪` 或 `/boxsearch 簡報`');
  }

  const query = subcommand.trim();
  setTimeout(() => sendChatActionToTelegramWithContext(context)('typing').catch(console.error), 0);

  try {
    const searchRes = await boxSearchAssets(query, { type: 'all' }, context);
    let reply = `🔍 *【888box 搜尋結果】* 關鍵字: \`${escapeMarkdown(query)}\`\n`;
    reply += `⚡ 節點: \`${searchRes.endpoint}\`\n\n`;

    if (searchRes.items && searchRes.items.length > 0) {
      searchRes.items.forEach((item, idx) => {
        const itemType = item.is_video ? '🎬 影片' : item.is_audio ? '🎵 音訊' : item.is_file ? '📄 檔案' : '🖼️ 圖片';
        const title = item.title || item.name || `Asset #${item.id}`;
        const sizeStr = item.size ? ` (${formatBytes(item.size)})` : '';
        const link = item.share_url || item.url || item.public_url || '#';

        reply += `${idx + 1}. ${itemType} *[${escapeMarkdown(title)}](${link})*${sizeStr}\n`;
        if (item.created_at) reply += `   🕒 \`${item.created_at}\` | ID: \`${item.id}\`\n`;
      });
    } else if (searchRes.rawText && searchRes.rawText.includes('Search results')) {
      reply += `${searchRes.rawText}\n`;
    } else {
      reply += `找不到符合「\`${escapeMarkdown(query)}\`」的資產。\n`;
    }

    context.CURRENT_CHAT_CONTEXT.parse_mode = 'Markdown';
    return sendMessageToTelegramWithContext(context)(reply);
  } catch (e) {
    context.CURRENT_CHAT_CONTEXT.parse_mode = 'Markdown';
    return sendMessageToTelegramWithContext(context)(`❌ *888box 搜尋失敗*: ${escapeMarkdown(e.message)}`);
  }
}

/**
 * /boxstats 指令
 */
export async function commandBoxStats(message, command, subcommand, context) {
  setTimeout(() => sendChatActionToTelegramWithContext(context)('typing').catch(console.error), 0);

  try {
    const statsRes = await boxGetStats({}, context);
    const stats = statsRes.stats;

    let reply = `📊 *【888box 雲端儲存統計】*\n\n`;
    reply += `⚡ **目前連線節點**: \`${statsRes.endpoint}\`\n`;
    if (stats.storage_backend) reply += `💾 **儲存後端**: \`${stats.storage_backend}\`\n`;
    reply += `\n📁 **資產數量統計**:\n`;
    reply += `• 📦 **總資產數**: \`${stats.total ?? 'N/A'}\`\n`;
    reply += `• 🖼️ **圖片 (Image)**: \`${stats.image ?? 'N/A'}\`\n`;
    reply += `• 🎬 **影片 (Video)**: \`${stats.video ?? 'N/A'}\`\n`;
    reply += `• 🎵 **音訊 (Audio)**: \`${stats.audio ?? 'N/A'}\`\n`;
    reply += `• 📄 **檔案 (File)**: \`${stats.file ?? 'N/A'}\`\n\n`;

    const endpoints = getBoxEndpoints(context);
    reply += `🌐 **節點備援架構**:\n`;
    endpoints.forEach((ep, idx) => {
      reply += `${idx === 0 ? '👑 主要' : `🛡️ 備援 ${idx}`}: \`${ep}\`\n`;
    });

    context.CURRENT_CHAT_CONTEXT.parse_mode = 'Markdown';
    return sendMessageToTelegramWithContext(context)(reply);
  } catch (e) {
    context.CURRENT_CHAT_CONTEXT.parse_mode = 'Markdown';
    return sendMessageToTelegramWithContext(context)(`❌ *888box 統計取得失敗*: ${escapeMarkdown(e.message)}`);
  }
}

/**
 * /boxpodcast 指令
 */
export async function commandBoxPodcast(message, command, subcommand, context) {
  setTimeout(() => sendChatActionToTelegramWithContext(context)('typing').catch(console.error), 0);

  try {
    const podcastRes = await boxGetPodcastInfo({}, context);
    const endpoints = getBoxEndpoints(context);
    const primary = endpoints[0] || BOX_DEFAULT_PRIMARY;

    let reply = `🎙️ *【888box Podcast RSS 訂閱源】*\n\n`;
    reply += `🎬 **Video Podcast RSS**:\n\`${primary}/storage/podcast.xml\`\n\n`;
    reply += `🎵 **Audio Podcast RSS**:\n\`${primary}/storage/podcast_audio.xml\`\n\n`;
    reply += `⚡ **節點**: \`${podcastRes.endpoint}\`\n`;
    reply += `_提示: 上傳的所有無密碼影片與音訊將自動加入上述 RSS 頻道，可用 Apple Podcasts 或泛用型 Podcast App 訂閱。_`;

    context.CURRENT_CHAT_CONTEXT.parse_mode = 'Markdown';
    return sendMessageToTelegramWithContext(context)(reply);
  } catch (e) {
    context.CURRENT_CHAT_CONTEXT.parse_mode = 'Markdown';
    return sendMessageToTelegramWithContext(context)(`❌ *888box Podcast 資訊取得失敗*: ${escapeMarkdown(e.message)}`);
  }
}

function sendBoxHelp(context) {
  let helpMsg = `📦 *【888box 雲端資產管理指南】*\n\n`;
  helpMsg += `支援將產出的檔案、生成的圖片/音訊、下載的影片源直接轉存至 888box！\n\n`;
  helpMsg += `🔹 **功能與指令**:\n`;
  helpMsg += `• \`/box <URL> [標題]\` - 遠端轉存圖片、影片、音訊或檔案\n`;
  helpMsg += `• **回覆媒體訊息** + \`/box [標題]\` - 將 Telegram 圖片/影片/文件轉存至 888box\n`;
  helpMsg += `• \`/box list [type] [page]\` - 瀏覽資產列表 (type 可選: all, image, video, audio, file)\n`;
  helpMsg += `• \`/box search <關鍵字>\` - 搜尋資產\n`;
  helpMsg += `• \`/box stats\` - 查看儲存空間與統計\n`;
  helpMsg += `• \`/box podcast\` - 取得 Video & Audio Podcast RSS 訂閱源\n\n`;
  helpMsg += `🌐 **3-Tier 容錯備援節點**:\n`;
  helpMsg += `1. \`https://box.david888.com\` (主要)\n`;
  helpMsg += `2. \`https://box.glsoft.ai\` (備援 1)\n`;
  helpMsg += `3. \`https://box.aiurl.tw\` (備援 2)\n`;

  context.CURRENT_CHAT_CONTEXT.parse_mode = 'Markdown';
  return sendMessageToTelegramWithContext(context)(helpMsg);
}

function escapeMarkdown(text) {
  if (!text) return '';
  return `${text}`.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
