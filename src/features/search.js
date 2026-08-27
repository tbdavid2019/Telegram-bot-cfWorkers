/**
 * Search & Web Reading Features (2MD Engine)
 * 即時聯網搜尋與網頁/文件解析（支援 3-Tier 自動容錯備援）
 */

import { sendMessageToTelegramWithContext } from '../telegram/telegram.js';

/**
 * 2MD 服務節點（依優先順序嘗試）
 * 主力: https://2md.aiurl.tw/
 * 備援 1: https://2md.glsoft.ai/
 * 備援 2: https://create360.ai/
 */
export const TWO_MD_ENDPOINTS = [
  'https://2md.aiurl.tw',
  'https://2md.glsoft.ai',
  'https://create360.ai'
];

/**
 * 執行 2MD 請求（具備三重備援與超時機制）
 * @param {string} path - 請求路徑 (例如 "/s/Taiwan" 或 "/https://example.com")
 * @param {Object} options - 自訂 headers 或 options
 * @returns {Promise<{text: string, base: string}>}
 */
export async function fetch2MD(path, options = {}) {
  let lastError = null;
  const timeoutMs = options.timeoutMs || 10000;

  for (const base of TWO_MD_ENDPOINTS) {
    try {
      const url = `${base}${path.startsWith('/') ? '' : '/'}${path}`;
      const res = await fetch(url, {
        headers: {
          'Accept': 'text/plain',
          ...(options.headers || {})
        },
        signal: AbortSignal.timeout(timeoutMs)
      });

      if (res.ok) {
        const text = await res.text();
        if (text && !text.includes('No search results available')) {
          return { text, base };
        }
      }
    } catch (e) {
      lastError = e;
    }
  }

  throw lastError || new Error('所有 2MD 服務節點皆無法連線');
}

/**
 * 格式化 2MD 搜尋結果
 */
function formatSearchResults(rawText, query) {
  let reply = `🔍 *【即時網路搜尋】* ${query}\n\n`;
  const items = rawText.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
  let count = 0;

  for (const item of items) {
    const titleMatch = item.match(/\[\d+\]\s*Title:\s*(.+)/);
    const urlMatch = item.match(/\[\d+\]\s*URL Source:\s*(.+)/);
    const descMatch = item.match(/\[\d+\]\s*Description:\s*([\s\S]+)/);

    if (titleMatch && urlMatch) {
      count++;
      const title = titleMatch[1].trim();
      const url = urlMatch[1].trim();
      const desc = descMatch ? descMatch[1].trim() : '';
      reply += `[${count}] *[${title}](${url})*\n`;
      if (desc) {
        reply += `   ${desc}\n`;
      }
      reply += '\n';
    }
  }

  if (count === 0) {
    reply += rawText;
  }

  return reply.trim();
}

/**
 * 格式化 2MD 網頁/文件讀取結果
 */
function formatWebRead(rawText, url) {
  let reply = `📄 *【網頁/文件解析】*\n🔗 來源：${url}\n\n`;
  let content = rawText;
  const mdIdx = rawText.indexOf('Markdown Content:');
  if (mdIdx !== -1) {
    content = rawText.slice(mdIdx + 'Markdown Content:'.length).trim();
  }
  reply += content;
  return reply.trim();
}

/**
 * 網路搜尋與網頁讀取指令 (/web)
 * 支援輸入關鍵字（搜尋）或 URL（網頁轉 Markdown）
 * @param {Object} message - Telegram 訊息對象
 * @param {string} command - 指令名稱
 * @param {string} subcommand - 搜尋關鍵字或網址
 * @param {Object} context - 上下文對象
 */
export async function commandDDGSearch(message, command, subcommand, context) {
  const input = (subcommand || '').trim();
  if (!input) {
    return sendMessageToTelegramWithContext(context)(
      '🌐 *即時網路搜尋與網頁閱讀 (2MD Engine)*\n\n' +
      '請輸入搜尋關鍵字或要讀取的網址。\n\n' +
      '📝 *使用範例*：\n' +
      '• `/web 台灣最新時事新聞` （即時即刻網路搜尋）\n' +
      '• `/web NVIDIA 財報重點` （搜尋科技與市場資訊）\n' +
      '• `/web https://news.ycombinator.com` （網頁轉 Markdown 閱讀）\n' +
      '• `/read https://arxiv.org/pdf/2301.00001.pdf` （線上文件/PDF 快速解析）'
    );
  }

  // 1. 若輸入為 URL，執行網頁閱讀
  if (/^https?:\/\//i.test(input)) {
    return commandRead(message, command, subcommand, context);
  }

  // 2. 否則執行即時 SERP 網路搜尋
  try {
    const { text } = await fetch2MD(`/s/${encodeURIComponent(input)}`);
    const formatted = formatSearchResults(text, input);
    return sendMessageToTelegramWithContext(context)(formatted);
  } catch (e) {
    console.error('2MD Search Error:', e);
    return sendMessageToTelegramWithContext(context)(`❌ 搜尋失敗：${e.message}\n\n請稍後再試。`);
  }
}

/**
 * 網頁/文件/PDF 轉 Markdown 閱讀指令 (/read)
 * @param {Object} message - Telegram 訊息對象
 * @param {string} command - 指令名稱
 * @param {string} subcommand - 要讀取的網址
 * @param {Object} context - 上下文對象
 */
export async function commandRead(message, command, subcommand, context) {
  const url = (subcommand || '').trim();
  if (!url || !/^https?:\/\//i.test(url)) {
    return sendMessageToTelegramWithContext(context)(
      '📄 *網頁與文件解析 (2MD Reader)*\n\n' +
      '請輸入完整的網址（包含 http:// 或 https://）。\n\n' +
      '📝 *使用範例*：\n' +
      '• `/read https://news.ycombinator.com`\n' +
      '• `/read https://arxiv.org/pdf/2301.00001.pdf`'
    );
  }

  try {
    const { text } = await fetch2MD(`/${url}`);
    const formatted = formatWebRead(text, url);
    return sendMessageToTelegramWithContext(context)(formatted);
  } catch (e) {
    console.error('2MD Read Error:', e);
    return sendMessageToTelegramWithContext(context)(`❌ 網頁讀取失敗：${e.message}\n\n請確認網址可正常公開存取。`);
  }
}
