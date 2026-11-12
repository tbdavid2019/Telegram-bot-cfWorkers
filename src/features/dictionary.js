/**
 * Dictionary Features
 * 字典查詢功能
 */

import { sendMessageToTelegramWithContext } from '../telegram/telegram.js';
import { escape } from '../utils/md2tgmd.js';

/**
 * 中文字典查詢指令
 * @param {Object} message - Telegram 訊息對象
 * @param {string} command - 指令名稱
 * @param {string} subcommand - 要查詢的中文字
 * @param {Object} context - 上下文對象
 */
export async function commandDictCN(message, command, subcommand, context) {
  if (!subcommand) {
    return sendMessageToTelegramWithContext(context)('請提供中文字以供查詢 如 /dictcn 福');
  }

  try {
    const response = await fetch(`https://www.moedict.tw/raw/${encodeURIComponent(subcommand)}`);
    const data = await response.json();
    const formattedDict = formatDictionaryData(data);
    if (context) {
      if (!context.CURRENT_CHAT_CONTEXT) context.CURRENT_CHAT_CONTEXT = {};
      context.CURRENT_CHAT_CONTEXT.parse_mode = 'HTML';
    }
    return sendMessageToTelegramWithContext(context)(formattedDict);
  } catch (e) {
    return sendMessageToTelegramWithContext(context)(`ERROR: ${e.message}`);
  }
}

/**
 * 英文字典查詢指令
 * @param {Object} message - Telegram 訊息對象
 * @param {string} command - 指令名稱
 * @param {string} subcommand - 要查詢的英文單字
 * @param {Object} context - 上下文對象
 */
export async function commandDictEN(message, command, subcommand, context) {
  if (!subcommand) {
    return sendMessageToTelegramWithContext(context)('Please provide a word to look up. Usage: /dicten <word>');
  }
  
  try {
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(subcommand)}`);
    const data = await response.json();
    const formattedDict = formatDictionaryDataEN(data);
    if (context) {
      if (!context.CURRENT_CHAT_CONTEXT) context.CURRENT_CHAT_CONTEXT = {};
      context.CURRENT_CHAT_CONTEXT.parse_mode = 'HTML';
    }
    return sendMessageToTelegramWithContext(context)(formattedDict);
  } catch (e) {
    return sendMessageToTelegramWithContext(context)(`ERROR: ${e.message}`);
  }
}

/**
 * 格式化英文字典資料
 * @param {Array} data - API 回傳的字典資料
 * @returns {string} 格式化的字典資訊
 */
export function formatDictionaryDataEN(data) {
  if (!Array.isArray(data) || data.length === 0) {
    return 'No definitions found for the provided word.';
  }

  const entry = data[0];
  const word = escape(entry.word || '');
  const phoneticText = entry.phonetic || (entry.phonetics && entry.phonetics.find(p => p.text)?.text) || '';
  const headerCode = phoneticText ? `<pre><code>${escape(phoneticText)}</code></pre>\n\n` : '\n\n';

  const meanings = (entry.meanings || []).map(meaning => {
    const partOfSpeech = meaning.partOfSpeech ? `<b>[${escape(meaning.partOfSpeech)}]</b>` : '';
    const definitions = (meaning.definitions || []).slice(0, 5).map((def, idx) => {
      const definition = escape(def.definition || '');
      const example = def.example ? `\n   <i>ex: ${escape(def.example)}</i>` : '';
      return `${idx + 1}. ${definition}${example}`;
    }).join('\n');
    return `${partOfSpeech}\n${definitions}`;
  }).join('\n\n');

  return `📖 <b>${word}</b>\n${headerCode}${meanings}`;
}

/**
 * 格式化中文字典資料
 * @param {Object} data - API 回傳的字典資料
 * @returns {string} 格式化的字典資訊
 */
export function formatDictionaryData(data) {
  const title = escape(data.title || '');
  const heteronymBlocks = (data.heteronyms || []).map(heteronym => {
    const pinyin = heteronym.pinyin || '無';
    const bopomofo = heteronym.bopomofo || '無';
    const phonetics = `拼音: ${pinyin} | 注音: ${bopomofo}`;

    const defs = (heteronym.definitions || []).map((def, idx) => {
      const type = def.type ? `[${escape(def.type)}] ` : '';
      const definition = escape(def.def || '');
      const example = def.example && def.example.length > 0 ? `\n   <i>例: ${escape(def.example.join('；'))}</i>` : '';
      return `${idx + 1}. ${type}${definition}${example}`;
    }).join('\n\n');

    return `<pre><code>${escape(phonetics)}</code></pre>\n\n${defs}`;
  }).join('\n\n');

  return `📖 <b>${title}</b>\n${heteronymBlocks}`;
}
