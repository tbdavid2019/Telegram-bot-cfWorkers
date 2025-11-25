/**
 * Dictionary Features
 * 字典查詢功能
 */

import { sendMessageToTelegramWithContext } from '../telegram/telegram.js';

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
function formatDictionaryDataEN(data) {
  if (!Array.isArray(data) || data.length === 0) {
    return 'No definitions found for the provided word.';
  }

  const entry = data[0];
  const word = entry.word;
  const phonetic = entry.phonetic ? `Phonetic: ${entry.phonetic}\n` : '';
  const origin = entry.origin ? `Origin: ${entry.origin}\n` : '';
  const meanings = entry.meanings.map(meaning => {
    const partOfSpeech = meaning.partOfSpeech;
    const definitions = meaning.definitions.map(def => {
      const definition = def.definition;
      const example = def.example ? `Example: ${def.example}` : '';
      return `- ${definition}\n${example}`;
    }).join('\n');
    return `\nPart of Speech: ${partOfSpeech}\n${definitions}`;
  }).join('\n');

  return `Word: ${word}\n${phonetic}${origin}${meanings}`;
}

/**
 * 格式化中文字典資料
 * @param {Object} data - API 回傳的字典資料
 * @returns {string} 格式化的字典資訊
 */
function formatDictionaryData(data) {
  const title = data.title;
  const definitions = data.heteronyms.map(heteronym => {
    const pinyin = heteronym.pinyin;
    const bopomofo = heteronym.bopomofo;
    const definitions = heteronym.definitions.map(def => {
      const type = def.type;
      const definition = def.def;
      const example = def.example ? `\n範例: ${def.example.join(', ')}` : '';
      return `詞性: ${type}\n解釋: ${definition}${example}`;
    }).join('\n\n');

    return `拼音: ${pinyin}\n注音: ${bopomofo}\n${definitions}`;
  }).join('\n\n');

  return `字詞: ${title}\n\n${definitions}`;
}
