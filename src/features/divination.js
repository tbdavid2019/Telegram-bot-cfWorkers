/**
 * Divination Features
 * 占卜功能（解答之書、奇門遁甲、淺草籤詩、唐詩）
 */

import { sendMessageToTelegramWithContext } from '../telegram/telegram.js';

/**
 * 奇門遁甲查詢指令
 * @param {Object} message - Telegram 訊息對象
 * @param {string} command - 指令名稱
 * @param {string} subcommand - 要詢問的問題
 * @param {Object} context - 上下文對象
 */
export async function commandQimen(message, command, subcommand, context) {
  const question = (subcommand || '').trim();
  if (!question) {
    return sendMessageToTelegramWithContext(context)('錯誤: 請在指令後面輸入要詢問的問題。');
  }

  const url = 'https://qi.david888.com/api/qimen-question';
  const payload = {
    question,
    mode: 'advanced',
    purpose: '綜合',
    datetime: new Date().toISOString(),
    timezone: '+08:00',
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const text = await response.text();

    if (!(text.startsWith('{') && text.endsWith('}'))) {
      return sendMessageToTelegramWithContext(context)(`錯誤: API回應非JSON，內容: ${text}`);
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return sendMessageToTelegramWithContext(context)(`錯誤: 無法解析JSON回應。內容: ${text}`);
    }

    if (!data.success) {
      const msg = data.message || '未知錯誤';
      return sendMessageToTelegramWithContext(context)(`奇門服務回應失敗：${msg}`);
    }

    const ans = (data.answer || '').trim();
    const qi = data.qimenInfo || {};
    const meta = data.metadata || {};

    let reply = `【奇門遁甲】\n問題：${data.question || question}\n\n`;
    if (qi.localDate || qi.localTime) {
      reply += `時間：${qi.localDate || ''} ${qi.localTime || ''}\n`;
    }
    if (qi.mode || qi.purpose) {
      reply += `模式：${qi.mode || 'N/A'}　目的：${qi.purpose || '綜合'}\n`;
    }
    reply += '\n';
    reply += ans ? ans : '（無回覆內容）';

    if (meta.provider || meta.model) {
      reply += `\n\n— 來源：${meta.provider || ''} ${meta.model || ''}`.trimEnd();
    }

    return sendMessageToTelegramWithContext(context)(reply);
  } catch (e) {
    return sendMessageToTelegramWithContext(context)(`錯誤: ${e.message}`);
  }
}

/**
 * 淺草籤詩查詢指令
 * @param {Object} message - Telegram 訊息對象
 * @param {string} command - 指令名稱
 * @param {string} subcommand - 子指令參數
 * @param {Object} context - 上下文對象
 */
export async function commandTempleOracleJP(message, command, subcommand, context) {
  const url = 'https://answerbook.david888.com/TempleOracleJP';
  try {
    const response = await fetch(url);
    const text = await response.text();

    if (text.startsWith('{') && text.endsWith('}')) {
      try {
        const data = JSON.parse(text);
        if (data.oracle) {
          const type = data.oracle.type || '類型未提供';
          const poem = data.oracle.poem || '詩句未提供';
          const explanation = data.oracle.explain || '解釋未提供';

          const results = data.oracle.result;
          const resultMessages = Object.entries(results).map(([key, value]) => `${key}: ${value}`).join('\n');

          const responseMessage = `淺草籤詩:\n類型: ${type}\n詩句: ${poem}\n解釋: ${explanation}\n\n結果:\n${resultMessages}`;

          return sendMessageToTelegramWithContext(context)(responseMessage);
        } else {
          return sendMessageToTelegramWithContext(context)(`錯誤: 無法獲取淺草籤詩的內容。`);
        }
      } catch (jsonError) {
        return sendMessageToTelegramWithContext(context)(`錯誤: 無法解析JSON回應。回應內容: ${text}`);
      }
    } else {
      return sendMessageToTelegramWithContext(context)(`錯誤: API回應錯誤，內容: ${text}`);
    }
  } catch (e) {
    return sendMessageToTelegramWithContext(context)(`錯誤: ${e.message}`);
  }
}

/**
 * 隨機唐詩查詢指令
 * @param {Object} message - Telegram 訊息對象
 * @param {string} command - 指令名稱
 * @param {string} subcommand - 子指令參數
 * @param {Object} context - 上下文對象
 */
export async function commandTangPoetry(message, command, subcommand, context) {
  const url = 'https://answerbook.david888.com/TangPoetry';
  try {
    const response = await fetch(url);
    const text = await response.text();

    if (text.startsWith('{') && text.endsWith('}')) {
      try {
        const data = JSON.parse(text);
        if (data.poem) {
          const title = data.poem.title || '標題未提供';
          const author = data.poem.author || '作者未提供';
          const poemText = data.poem.text || '詩句未提供';
          return sendMessageToTelegramWithContext(context)(
            `唐詩: \n標題: ${title}\n作者: ${author}\n詩句:\n${poemText}`
          );
        } else {
          return sendMessageToTelegramWithContext(context)(`錯誤: 無法獲取唐詩的內容。`);
        }
      } catch (jsonError) {
        return sendMessageToTelegramWithContext(context)(`錯誤: 無法解析JSON回應。回應內容: ${text}`);
      }
    } else {
      return sendMessageToTelegramWithContext(context)(`錯誤: API回應錯誤，內容: ${text}`);
    }
  } catch (e) {
    return sendMessageToTelegramWithContext(context)(`錯誤: ${e.message}`);
  }
}

/**
 * 解答之書查詢指令
 * @param {Object} message - Telegram 訊息對象
 * @param {string} command - 指令名稱
 * @param {string} subcommand - 子指令參數
 * @param {Object} context - 上下文對象
 */
export async function commandAnswerBook(message, command, subcommand, context) {
  const url = 'https://answerbook.david888.com/answers';
  try {
    const response = await fetch(url);
    const text = await response.text();

    if (text.startsWith('{') && text.endsWith('}')) {
      try {
        const data = JSON.parse(text);
        if (data.answer) {
          return sendMessageToTelegramWithContext(context)(`解答之書: ${data.answer}`);
        } else {
          return sendMessageToTelegramWithContext(context)(`錯誤: 無法獲取解答之書的答案。`);
        }
      } catch (jsonError) {
        return sendMessageToTelegramWithContext(context)(`錯誤: 無法解析JSON回應。回應內容: ${text}`);
      }
    } else {
      return sendMessageToTelegramWithContext(context)(`錯誤: API回應錯誤，內容: ${text}`);
    }
  } catch (e) {
    return sendMessageToTelegramWithContext(context)(`錯誤: ${e.message}`);
  }
}

/**
 * 解答之書原版查詢指令
 * @param {Object} message - Telegram 訊息對象
 * @param {string} command - 指令名稱
 * @param {string} subcommand - 子指令參數
 * @param {Object} context - 上下文對象
 */
export async function commandAnswerBookOriginal(message, command, subcommand, context) {
  const url = 'https://answerbook.david888.com/answersOriginal?lang=zh-TW';
  try {
    const response = await fetch(url);
    const text = await response.text();

    if (text.startsWith('{') && text.endsWith('}')) {
      try {
        const data = JSON.parse(text);
        if (data.answer) {
          return sendMessageToTelegramWithContext(context)(`解答之書: ${data.answer}`);
        } else {
          return sendMessageToTelegramWithContext(context)(`錯誤: 無法獲取解答之書的答案。`);
        }
      } catch (jsonError) {
        return sendMessageToTelegramWithContext(context)(`錯誤: 無法解析JSON回應。回應內容: ${text}`);
      }
    } else {
      return sendMessageToTelegramWithContext(context)(`錯誤: API回應錯誤，內容: ${text}`);
    }
  } catch (e) {
    return sendMessageToTelegramWithContext(context)(`錯誤: ${e.message}`);
  }
}

/**
 * 隨機密碼生成指令
 * @param {Object} message - Telegram 訊息對象
 * @param {string} command - 指令名稱
 * @param {string} subcommand - 子指令參數
 * @param {Object} context - 上下文對象
 */
export async function generateRandomPassword(message, command, subcommand, context) {
  const url = 'http://answerbook.david888.com/RandomPassword';

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.RandomPassword) {
      return sendMessageToTelegramWithContext(context)(`${data.RandomPassword}`);
    } else {
      return sendMessageToTelegramWithContext(context)(`Failed to get a valid password from the API.`);
    }
  } catch (error) {
    return sendMessageToTelegramWithContext(context)(`錯誤: ${error.message}`);
  }
}
