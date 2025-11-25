/**
 * Search Features
 * 搜尋功能（DuckDuckGo 網頁搜尋）
 */

import { sendMessageToTelegramWithContext } from '../telegram/telegram.js';

/**
 * DuckDuckGo 搜尋指令
 * @param {Object} message - Telegram 訊息對象
 * @param {string} command - 指令名稱
 * @param {string} subcommand - 搜尋關鍵字
 * @param {Object} context - 上下文對象
 */
export async function commandDDGSearch(message, command, subcommand, context) {
  const query = (subcommand || '').trim();
  if (!query) {
    return sendMessageToTelegramWithContext(context)('錯誤: 請在指令後面輸入搜尋關鍵字。例如：/web 台灣旅遊景點');
  }

  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    let reply = `🔍 搜尋結果：${query}\n\n`;

    // 摘要
    if (data.AbstractText) {
      reply += `📝 摘要：\n${data.AbstractText}\n`;
      if (data.AbstractURL) {
        reply += `🔗 來源：${data.AbstractURL}\n`;
      }
      reply += '\n';
    }

    // 相關主題
    if (data.RelatedTopics && data.RelatedTopics.length > 0) {
      reply += `📚 相關主題：\n`;
      const topics = data.RelatedTopics.slice(0, 5);
      topics.forEach((topic, index) => {
        if (topic.Text) {
          reply += `${index + 1}. ${topic.Text}\n`;
          if (topic.FirstURL) {
            reply += `   ${topic.FirstURL}\n`;
          }
        }
      });
    }

    if (reply === `🔍 搜尋結果：${query}\n\n`) {
      reply += '抱歉，未找到相關結果。';
    }

    return sendMessageToTelegramWithContext(context)(reply);
  } catch (e) {
    return sendMessageToTelegramWithContext(context)(`錯誤: ${e.message}`);
  }
}
