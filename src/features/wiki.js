/**
 * David888 Wiki Publisher Feature
 * 支援將長文、產品分析、整理報告發布至 wiki.david888.com
 * 規格說明: https://wiki.david888.com/.well-known/agent-skills/david888-wiki-publisher/SKILL.md
 */

import { sendMessageToTelegramWithContext, sendChatActionToTelegramWithContext } from '../telegram/telegram.js';
import { ENV } from '../config/env.js';

export const WIKI_DEFAULT_BASE = 'https://wiki.david888.com';
export const WIKI_DEFAULT_THEME = 'claude-canvas';

/**
 * 取得 Wiki API Base URL
 * @param {Object} [context] - 上下文
 * @returns {string} Base URL
 */
export function getWikiBaseUrl(context = null) {
  const base = context?.USER_CONFIG?.WIKI_API_BASE || ENV.USER_CONFIG?.WIKI_API_BASE || WIKI_DEFAULT_BASE;
  return base.replace(/\/+$/, '');
}

/**
 * 產生唯一的 Slug 路徑代稱
 * @param {string} [hint] - 標題或提示字串
 * @returns {string} 乾淨的 Slug
 */
export function generateWikiSlug(hint = '') {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).substring(2, 7);
  
  if (!hint || hint.trim() === '') {
    return `doc-${dateStr}-${rand}`;
  }

  // 嘗試提取英數或拼音字符
  const cleaned = hint
    .trim()
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 30);

  return cleaned ? `${cleaned}-${rand}` : `doc-${dateStr}-${rand}`;
}

/**
 * 發布或更新 Wiki 頁面 (POST /api/<path>)
 * @param {string} path - 頁面路徑 (Slug)
 * @param {string} markdown - Markdown 內容
 * @param {Object} [options={}] - 主題、寬度、密碼、是否公開、是否追加
 * @param {Object} [context=null] - 上下文
 * @returns {Promise<{success: boolean, path: string, shareUrl: string, presentUrl: string, bookUrl: string, editUrl: string, theme: string, msg: string}>}
 */
export async function publishWikiNote(path, markdown, options = {}, context = null) {
  if (!markdown || typeof markdown !== 'string' || markdown.trim() === '') {
    throw new Error('Markdown 內容不能為空');
  }

  const slug = (path && path.trim() !== '') ? path.trim() : generateWikiSlug();
  const baseUrl = getWikiBaseUrl(context);
  const theme = options.theme || context?.USER_CONFIG?.WIKI_DEFAULT_THEME || ENV.USER_CONFIG?.WIKI_DEFAULT_THEME || WIKI_DEFAULT_THEME;
  const width = options.width || context?.USER_CONFIG?.WIKI_DEFAULT_WIDTH || ENV.USER_CONFIG?.WIKI_DEFAULT_WIDTH || '100%';
  const isPublic = options.public !== false;
  const append = !!options.append;
  const pw = options.pw || context?.USER_CONFIG?.WIKI_API_PASSWORD || ENV.USER_CONFIG?.WIKI_API_PASSWORD || '';
  const vpw = options.vpw || '';

  const url = `${baseUrl}/api/${encodeURIComponent(slug)}`;
  const payload = {
    text: markdown,
    public: isPublic,
    theme,
    width,
    append,
    ...(pw ? { pw } : {}),
    ...(vpw ? { vpw } : {})
  };

  const headers = {
    'Content-Type': 'application/json'
  };
  if (pw) {
    headers['Authorization'] = `Bearer ${pw}`;
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Wiki API error (HTTP ${res.status}): ${errText}`);
  }

  const json = await res.json();
  if (json.err && json.err !== 0) {
    throw new Error(json.msg || 'Wiki 發布失敗');
  }

  const data = json.data || {};
  const shareUrl = data.shareUrl || '';
  const editUrl = data.url || `${baseUrl}/${slug}`;
  const presentUrl = shareUrl ? `${shareUrl}/present` : '';
  const bookUrl = shareUrl ? `${shareUrl}/book` : '';

  return {
    success: true,
    path: slug,
    shareUrl,
    presentUrl,
    bookUrl,
    editUrl,
    theme,
    msg: data.msg || 'Saved successfully'
  };
}

/**
 * 讀取 Wiki 頁面 Markdown 內容 (GET /api/<path> 或 GET /share/<share-id>)
 * @param {string} pathOrShare - 路徑或分享 URL/ID
 * @param {Object} [options={}] - 密碼
 * @param {Object} [context=null] - 上下文
 * @returns {Promise<{markdown: string, pathOrShare: string}>}
 */
export async function readWikiNote(pathOrShare, options = {}, context = null) {
  if (!pathOrShare || typeof pathOrShare !== 'string' || pathOrShare.trim() === '') {
    throw new Error('請提供 Wiki 路徑或分享網址');
  }

  const target = pathOrShare.trim();
  const baseUrl = getWikiBaseUrl(context);
  const pw = options.pw || context?.USER_CONFIG?.WIKI_API_PASSWORD || ENV.USER_CONFIG?.WIKI_API_PASSWORD || '';

  let requestUrl;
  const headers = {
    'Accept': 'text/markdown'
  };
  if (pw) {
    headers['Authorization'] = `Bearer ${pw}`;
  }

  if (target.startsWith('http://') || target.startsWith('https://')) {
    requestUrl = target;
  } else if (target.startsWith('share/')) {
    requestUrl = `${baseUrl}/${target}`;
  } else {
    requestUrl = `${baseUrl}/api/${encodeURIComponent(target)}${pw ? `?pw=${encodeURIComponent(pw)}` : ''}`;
  }

  const res = await fetch(requestUrl, {
    method: 'GET',
    headers
  });

  if (!res.ok) {
    throw new Error(`讀取 Wiki 失敗 (HTTP ${res.status})`);
  }

  const markdown = await res.text();
  return {
    markdown,
    pathOrShare: target
  };
}

/**
 * Markdown 渲染服務 (POST /api/markdown/render)
 * @param {string} markdown - Markdown 內容
 * @param {string} [theme='claude-canvas'] - 主題
 * @param {Object} [context=null] - 上下文
 * @returns {Promise<string>} 渲染後的 HTML
 */
export async function renderMarkdown(markdown, theme = WIKI_DEFAULT_THEME, context = null) {
  const baseUrl = getWikiBaseUrl(context);
  const res = await fetch(`${baseUrl}/api/markdown/render`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ markdown, theme, fullHtml: false })
  });

  if (!res.ok) {
    throw new Error(`Markdown 渲染失敗 (HTTP ${res.status})`);
  }

  const json = await res.json();
  return json.data?.html || '';
}

/**
 * 網頁/HTML 轉 Markdown (POST /api/markdown/parse)
 * @param {Object} input - { html } 或 { url }
 * @param {Object} [context=null] - 上下文
 * @returns {Promise<string>} 轉換後的 Markdown
 */
export async function parseToMarkdown(input, context = null) {
  const baseUrl = getWikiBaseUrl(context);
  const res = await fetch(`${baseUrl}/api/markdown/parse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });

  if (!res.ok) {
    throw new Error(`HTML 轉 Markdown 失敗 (HTTP ${res.status})`);
  }

  const json = await res.json();
  return json.data?.markdown || '';
}

// ========== Telegram 指令處理器 ==========

/**
 * /wiki 指令主進入點
 * 支援：
 * 1. /wiki <路徑/標題> <長文內容> -> 直接發布
 * 2. 回覆訊息並輸入 /wiki [路徑/標題] -> 將被回覆的文字發布至 wiki
 * 3. /wiki read <路徑/網址> -> 讀取 wiki
 * 4. /wiki append <路徑> <追加內容> -> 追加內容至 wiki
 * 5. /wiki help -> 顯示說明
 */
export async function commandWiki(message, command, subcommand, context) {
  const trimmed = subcommand ? subcommand.trim() : '';

  // 1. 說明選單
  if (trimmed === 'help' || trimmed === '-h' || trimmed === '--help') {
    return sendWikiHelp(context);
  }

  // 2. 讀取子指令
  if (trimmed.startsWith('read ') || trimmed === 'read') {
    const pathArg = trimmed.slice(5).trim();
    return commandWikiRead(message, command, pathArg, context);
  }

  // 3. 追加子指令
  if (trimmed.startsWith('append ')) {
    const rest = trimmed.slice(7).trim();
    const spaceIdx = rest.indexOf(' ');
    if (spaceIdx === -1) {
      context.CURRENT_CHAT_CONTEXT.parse_mode = 'Markdown';
      return sendMessageToTelegramWithContext(context)('❌ 請指定要追加的路徑與內容，例如：\n`/wiki append report-2026 今日進度更新...`');
    }
    const slug = rest.slice(0, spaceIdx).trim();
    const content = rest.slice(spaceIdx + 1).trim();

    setTimeout(() => sendChatActionToTelegramWithContext(context)('typing').catch(console.error), 0);
    try {
      const pubRes = await publishWikiNote(slug, content, { append: true }, context);
      let reply = `📝 *【David888 Wiki 內容追加成功】*\n\n`;
      reply += `📌 **路徑**: \`${pubRes.path}\`\n`;
      if (pubRes.shareUrl) reply += `🔗 **公開閱讀連結**: [點此開啟](${pubRes.shareUrl})\n`;

      context.CURRENT_CHAT_CONTEXT.parse_mode = 'Markdown';
      return sendMessageToTelegramWithContext(context)(reply);
    } catch (e) {
      context.CURRENT_CHAT_CONTEXT.parse_mode = 'Markdown';
      return sendMessageToTelegramWithContext(context)(`❌ *Wiki 追加失敗*: ${escapeMarkdown(e.message)}`);
    }
  }

  // 4. 檢查是否以 JSON 格式傳遞參數 (適合 LLM Tool Calling)
  let markdownToPublish = '';
  let targetSlug = '';
  let publishOptions = {};

  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      targetSlug = parsed.slug || parsed.path || parsed.title || '';
      markdownToPublish = parsed.content || parsed.text || parsed.markdown || '';
      if (parsed.theme) publishOptions.theme = parsed.theme;
      if (parsed.width) publishOptions.width = parsed.width;
      if (parsed.append) publishOptions.append = parsed.append;
      if (parsed.pw) publishOptions.pw = parsed.pw;
      if (parsed.vpw) publishOptions.vpw = parsed.vpw;
    } catch (e) {
      // JSON 解析失敗則按純文字處理
    }
  }

  // 5. 檢查是否回覆訊息發布 (Reply to Message)
  if (!markdownToPublish && message.reply_to_message && (message.reply_to_message.text || message.reply_to_message.caption)) {
    markdownToPublish = message.reply_to_message.text || message.reply_to_message.caption;
    targetSlug = trimmed; // subcommand 作為自訂 slug/標題
  } else if (!markdownToPublish && trimmed !== '') {
    // 檢查是否有路徑與正文分離：/wiki <slug> <markdown>
    const firstSpace = trimmed.indexOf(' ');
    const firstNewline = trimmed.indexOf('\n');
    let splitIdx = -1;

    if (firstSpace !== -1 && firstNewline !== -1) {
      splitIdx = Math.min(firstSpace, firstNewline);
    } else if (firstSpace !== -1) {
      splitIdx = firstSpace;
    } else if (firstNewline !== -1) {
      splitIdx = firstNewline;
    }

    if (splitIdx !== -1 && !trimmed.slice(0, splitIdx).includes('\n')) {
      const potentialSlug = trimmed.slice(0, splitIdx).trim();
      const content = trimmed.slice(splitIdx + 1).trim();
      if (content.length > 0) {
        targetSlug = potentialSlug;
        markdownToPublish = content;
      } else {
        markdownToPublish = trimmed;
      }
    } else {
      markdownToPublish = trimmed;
    }
  }

  if (!markdownToPublish || markdownToPublish.trim() === '') {
    return sendWikiHelp(context);
  }

  setTimeout(() => sendChatActionToTelegramWithContext(context)('typing').catch(console.error), 0);

  try {
    const pubRes = await publishWikiNote(targetSlug, markdownToPublish, publishOptions, context);

    let reply = `🚀 *【David888 Wiki 長文發布成功】*\n\n`;
    reply += `📌 **頁面代稱**: \`${pubRes.path}\`\n`;
    reply += `🎨 **主題風格**: \`${pubRes.theme}\`\n\n`;
    reply += `🔗 **公開閱讀連結 (Share URL)**:\n[${pubRes.shareUrl}](${pubRes.shareUrl})\n\n`;
    reply += `🎬 **2D 簡報模式**: [簡報播放](${pubRes.presentUrl})\n`;
    reply += `📖 **電子書閱讀器**: [雙欄書籍模式](${pubRes.bookUrl})\n\n`;
    reply += `_提示: 此頁面支援 [TOC] 自動目錄、Mermaid 圖表、高亮標籤與全域響應式排版。_`;

    context.CURRENT_CHAT_CONTEXT.parse_mode = 'Markdown';
    return sendMessageToTelegramWithContext(context)(reply);
  } catch (e) {
    context.CURRENT_CHAT_CONTEXT.parse_mode = 'Markdown';
    return sendMessageToTelegramWithContext(context)(`❌ *Wiki 發布失敗*: ${escapeMarkdown(e.message)}`);
  }
}

/**
 * /wikiread 指令
 */
export async function commandWikiRead(message, command, subcommand, context) {
  if (!subcommand || subcommand.trim() === '') {
    context.CURRENT_CHAT_CONTEXT.parse_mode = 'Markdown';
    return sendMessageToTelegramWithContext(context)('💡 *請提供 Wiki 路徑或分享網址*，例如：\n`/wikiread test-agent-push` 或 `/wikiread https://wiki.david888.com/share/abc123`');
  }

  const target = subcommand.trim();
  setTimeout(() => sendChatActionToTelegramWithContext(context)('typing').catch(console.error), 0);

  try {
    const readRes = await readWikiNote(target, {}, context);
    let reply = `📖 *【David888 Wiki 內容】* \`${escapeMarkdown(readRes.pathOrShare)}\`\n\n`;
    reply += readRes.markdown;

    context.CURRENT_CHAT_CONTEXT.parse_mode = 'Markdown';
    return sendMessageToTelegramWithContext(context)(reply);
  } catch (e) {
    context.CURRENT_CHAT_CONTEXT.parse_mode = 'Markdown';
    return sendMessageToTelegramWithContext(context)(`❌ *Wiki 讀取失敗*: ${escapeMarkdown(e.message)}`);
  }
}

function sendWikiHelp(context) {
  let helpMsg = `📘 *【David888 Wiki 發布與長文整理指南】*\n\n`;
  helpMsg += `支援將長篇產品文件、整理報告、手冊教材一鍵發布至 \`wiki.david888.com\`！\n\n`;
  helpMsg += `🔹 **使用指令**:\n`;
  helpMsg += `• \`/wiki <路徑/標題> <長文Markdown>\` - 發布新文章\n`;
  helpMsg += `• **回覆任何訊息** + \`/wiki [標題]\` - 直接將 Bot 回應或長對話轉存至 Wiki\n`;
  helpMsg += `• \`/wiki read <路徑/分享網址>\` 或 \`/wikiread <路徑>\` - 讀取 Markdown 內容\n`;
  helpMsg += `• \`/wiki append <路徑> <內容>\` - 追加內容至既有 Wiki\n\n`;
  helpMsg += `✨ **強大特性支援**:\n`;
  helpMsg += `• 📑 \`[TOC]\` - 自動生成深層導航目錄\n`;
  helpMsg += `• 🎬 \`/present\` - 2D Slidev-Lite 簡報模式\n`;
  helpMsg += `• 📖 \`/book\` - 雙欄電子書閱讀模式\n`;
  helpMsg += `• 📊 Mermaid 圖表、代碼行號高亮與 20+ 套 CSS 主題\n`;

  context.CURRENT_CHAT_CONTEXT.parse_mode = 'Markdown';
  return sendMessageToTelegramWithContext(context)(helpMsg);
}

function escapeMarkdown(text) {
  if (!text) return '';
  return `${text}`.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}
