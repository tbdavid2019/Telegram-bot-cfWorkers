// Soul 人格管理模組
// 支援從 URL 動態載入 SOUL.md 人格模板
import { DATABASE } from '../config/env.js';
import { sendMessageToTelegramWithContext } from '../telegram/telegram.js';

const MAX_FETCH_SIZE = 10 * 1024; // 10KB
const MAX_CONTENT_LENGTH = 5000; // 5000 字元

/**
 * 取得 soul 的 DATABASE key
 */
function getSoulKey(context) {
  // chatHistoryKey 格式: history:{chatId}:{botId}
  // 轉換為: soul:{chatId}:{botId}
  return context.SHARE_CONTEXT.chatHistoryKey.replace(/^history:/, 'soul:');
}

/**
 * 從 URL 載入 SOUL.md 內容
 * @param {string} url - SOUL.md 的 URL
 * @returns {Promise<{name: string, content: string}>}
 */
/**
 * 將 GitHub blob URL 轉換為 raw content URL
 * https://github.com/user/repo/blob/main/path → https://raw.githubusercontent.com/user/repo/refs/heads/main/path
 */
function normalizeGitHubUrl(url) {
  // 匹配 github.com/.../blob/... 格式
  const match = url.match(/^https?:\/\/github\.com\/([^/]+\/[^/]+)\/blob\/([^/]+)\/(.+)$/);
  if (match) {
    return `https://raw.githubusercontent.com/${match[1]}/refs/heads/${match[2]}/${match[3]}`;
  }
  return url;
}

export async function loadSoulFromUrl(rawUrl) {
  const url = normalizeGitHubUrl(rawUrl);
  const response = await fetch(url, {
    headers: { 'Accept': 'text/plain, text/markdown, */*' },
  });

  if (!response.ok) {
    throw new Error(`抓取失敗 (HTTP ${response.status})`);
  }

  const contentLength = response.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > MAX_FETCH_SIZE) {
    throw new Error(`內容過大（超過 ${MAX_FETCH_SIZE / 1024}KB 限制）`);
  }

  const text = await response.text();

  if (text.length > MAX_FETCH_SIZE) {
    throw new Error(`內容過大（超過 ${MAX_FETCH_SIZE / 1024}KB 限制）`);
  }

  let content = text;
  let truncated = false;
  if (content.length > MAX_CONTENT_LENGTH) {
    content = content.substring(0, MAX_CONTENT_LENGTH);
    truncated = true;
  }

  // 解析名稱：取第一個 # 開頭的標題
  const titleMatch = content.match(/^#\s+(.+)$/m);
  const name = titleMatch ? titleMatch[1].trim() : '自訂人格';

  return { name, content, truncated };
}

/**
 * 儲存自訂 soul 到 DATABASE
 */
export async function saveSoul(context, soulData) {
  const key = getSoulKey(context);
  await DATABASE.put(key, JSON.stringify(soulData));
}

/**
 * 從 DATABASE 讀取自訂 soul
 * @returns {Promise<Object|null>}
 */
export async function getSoul(context) {
  const key = getSoulKey(context);
  try {
    const data = await DATABASE.get(key);
    if (!data) return null;
    return JSON.parse(data);
  } catch (e) {
    console.error('[Soul] Failed to read soul:', e);
    return null;
  }
}

/**
 * 刪除 DATABASE 中的自訂 soul
 */
export async function deleteSoul(context) {
  const key = getSoulKey(context);
  await DATABASE.delete(key);
}

/**
 * /soul 指令處理器
 * - /soul           → 顯示使用說明
 * - /soul <url>     → 從 URL 載入 SOUL.md
 * - /soul reset     → 恢復預設人格
 * - /soul info      → 顯示目前 soul 資訊
 */
export async function commandSoul(message, command, subcommand, context) {
  const arg = (subcommand || '').trim();

  if (!arg) {
    return showHelp(context);
  }

  if (arg === 'reset') {
    return resetSoul(context);
  }

  if (arg === 'info') {
    return showInfo(context);
  }

  // 其他情況視為 URL
  return loadSoul(arg, context);
}

/**
 * 顯示使用說明
 */
async function showHelp(context) {
  const msg = `🎭 *Soul 人格系統*

*用法：*
• \`/soul <URL>\` — 從 URL 載入 SOUL.md 人格
• \`/soul info\` — 查看目前人格
• \`/soul reset\` — 恢復預設人格

💡 到這裡挑選人格模板：
https://github.com/mergisi/awesome-openclaw-agents

📌 Soul 資料儲存於 KV (DATABASE)，不需要額外設定 R2。`;

  return sendMessageToTelegramWithContext(context)(msg);
}

/**
 * 從 URL 載入 soul
 */
async function loadSoul(url, context) {
  // 基本 URL 驗證
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return sendMessageToTelegramWithContext(context)('❌ 請提供有效的 URL（以 http:// 或 https:// 開頭）');
  }

  try {
    const { name, content, truncated } = await loadSoulFromUrl(url);

    const soulData = {
      name,
      source: url,
      content,
      loadedAt: new Date().toISOString(),
    };

    await saveSoul(context, soulData);

    // 清除聊天歷史
    await DATABASE.delete(context.SHARE_CONTEXT.chatHistoryKey);

    let reply = `✅ 已載入「${name}」\n📄 來源：${url}`;
    if (truncated) {
      reply += `\n⚠️ 內容已截斷至 ${MAX_CONTENT_LENGTH} 字元`;
    }
    reply += '\n🗑️ 歷史紀錄已清除，開始新的對話。';
    reply += '\n\n輸入 /soul reset 可隨時恢復預設。';

    return sendMessageToTelegramWithContext(context)(reply);
  } catch (e) {
    console.error('[Soul] Load error:', e);
    return sendMessageToTelegramWithContext(context)(`❌ 載入失敗：${e.message}`);
  }
}

/**
 * 重置 soul 為預設
 */
async function resetSoul(context) {
  const existing = await getSoul(context);

  if (!existing) {
    return sendMessageToTelegramWithContext(context)('ℹ️ 目前已是預設人格，無需重置。');
  }

  await deleteSoul(context);
  await DATABASE.delete(context.SHARE_CONTEXT.chatHistoryKey);

  return sendMessageToTelegramWithContext(context)('✅ 已恢復預設人格。歷史紀錄已清除。');
}

/**
 * 顯示目前 soul 資訊
 */
async function showInfo(context) {
  const soul = await getSoul(context);

  if (!soul) {
    return sendMessageToTelegramWithContext(context)('ℹ️ 目前使用預設人格（SYSTEM_INIT_MESSAGE）。');
  }

  const loadedDate = new Date(soul.loadedAt).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });

  const msg = `🎭 *目前 Soul 人格*
• 名稱：${soul.name}
• 來源：${soul.source}
• 載入時間：${loadedDate}

輸入 /soul reset 可恢復預設。`;

  return sendMessageToTelegramWithContext(context)(msg);
}
