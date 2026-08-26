/**
 * Divination Features
 * 占卜功能（解答之書、奇門遁甲、梅花易數、塔羅牌、生辰八字2、八宅風水、月老姻緣、淺草籤詩、唐詩）
 */

import { sendMessageToTelegramWithContext } from '../telegram/telegram.js';

/**
 * 梅花易數占卜指令
 * @param {Object} message - Telegram 訊息對象
 * @param {string} command - 指令名稱
 * @param {string} subcommand - 要詢問的問題
 * @param {Object} context - 上下文對象
 */
export async function commandMeiHua(message, command, subcommand, context) {
  const question = (subcommand || '').trim();
  if (!question) {
    return sendMessageToTelegramWithContext(context)('錯誤: 請在指令後面輸入要詢問的問題。');
  }

  const url = 'https://qi.david888.com/api/meihua-question';
  const payload = {
    question,
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
      return sendMessageToTelegramWithContext(context)(`梅花易數服務回應失敗：${msg}`);
    }

    const ans = (data.answer || '').trim();

    let reply = `【梅花易數】\n問題：${question}\n\n`;
    reply += ans ? ans : '（無回覆內容）';

    return sendMessageToTelegramWithContext(context)(reply);
  } catch (e) {
    return sendMessageToTelegramWithContext(context)(`錯誤: ${e.message}`);
  }
}

/**
 * 塔羅牌占卜指令
 * @param {Object} message - Telegram 訊息對象
 * @param {string} command - 指令名稱
 * @param {string} subcommand - 要詢問的問題或牌陣設定
 * @param {Object} context - 上下文對象
 */
export async function commandTarot(message, command, subcommand, context) {
  const input = (subcommand || '').trim();
  if (!input) {
    return sendMessageToTelegramWithContext(context)(
      '🔮 *塔羅牌占卜*\n\n' +
      '請在指令後面輸入您要詢問的問題。\n\n' +
      '📝 *使用範例*：\n' +
      '• `/tarot 我最近的事業發展如何？` （預設時間之流牌陣 3 張牌）\n' +
      '• `/tarot single 今日運勢指引` （單張牌指引）\n' +
      '• `/tarot diamond 創業評估與阻力` （鑽石牌陣 5 張牌）\n' +
      '• `/tarot celtic 感情與未來展望` （塞爾特十字牌陣 10 張牌）\n\n' +
      '支援牌陣：`single` (單張), `three` (3張/預設), `diamond` (5張), `moon` (4張), `horseshoe` (7張), `celtic` (10張)'
    );
  }

  const spreadMap = {
    'single': 'single',
    '單張': 'single',
    '1': 'single',
    'one': 'single',
    'three': 'three',
    '三張': 'three',
    '3': 'three',
    '時間': 'three',
    'diamond': 'diamond',
    '鑽石': 'diamond',
    '5': 'diamond',
    'moon': 'moon',
    '月相': 'moon',
    '4': 'moon',
    'horseshoe': 'horseshoe',
    '馬蹄': 'horseshoe',
    '馬蹄鐵': 'horseshoe',
    '7': 'horseshoe',
    'celtic': 'celtic',
    '十字': 'celtic',
    '塞爾特': 'celtic',
    '10': 'celtic'
  };

  const spreadNames = {
    'single': '單張指引（1張）',
    'three': '時間之流（3張）',
    'diamond': '鑽石牌陣（5張）',
    'moon': '月相牌陣（4張）',
    'horseshoe': '馬蹄鐵牌陣（7張）',
    'celtic': '塞爾特十字（10張）'
  };

  let spread = 'three';
  let question = input;

  const parts = input.split(/\s+/);
  if (parts.length > 1 && spreadMap[parts[0].toLowerCase()]) {
    spread = spreadMap[parts[0].toLowerCase()];
    question = parts.slice(1).join(' ').trim();
  }

  if (!question) {
    return sendMessageToTelegramWithContext(context)('錯誤: 請提供要詢問的問題。');
  }

  const url = 'https://qi.david888.com/api/tarot-question';
  const payload = {
    question,
    spread,
    purpose: '綜合',
    lang: 'zh-tw'
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
      const msg = data.message || data.error || '未知錯誤';
      return sendMessageToTelegramWithContext(context)(`塔羅占卜服務回應失敗：${msg}`);
    }

    const ans = (data.answer || '').trim();
    const reading = data.reading || data.result || {};
    const cards = reading.cards || [];
    const meta = data.metadata || {};
    const currentSpreadName = spreadNames[reading.spread || spread] || reading.spread || spread;

    let reply = `【🔮 塔羅占卜】\n問題：${data.question || question}\n牌陣：${currentSpreadName}\n`;

    if (cards && cards.length > 0) {
      reply += `\n🃏 *抽牌結果*：\n`;
      reply += cards.map(c => `• [${c.position}] ${c.name} (${c.orientation})`).join('\n') + '\n';
    }

    reply += '\n' + (ans ? ans : '（無回覆內容）');

    return sendMessageToTelegramWithContext(context)(reply);
  } catch (e) {
    return sendMessageToTelegramWithContext(context)(`錯誤: ${e.message}`);
  }
}

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

    return sendMessageToTelegramWithContext(context)(reply);
  } catch (e) {
    return sendMessageToTelegramWithContext(context)(`錯誤: ${e.message}`);
  }
}

/**
 * 生辰八字排盤與 AI 解讀指令
 * @param {Object} message - Telegram 訊息對象
 * @param {string} command - 指令名稱
 * @param {string} subcommand - 參數與問題 (格式：YYYY-MM-DD [時間] [男/女] [問題])
 * @param {Object} context - 上下文對象
 */
export async function commandBazi(message, command, subcommand, context) {
  const input = (subcommand || '').trim();
  if (!input) {
    return sendMessageToTelegramWithContext(context)(
      '🎴 *生辰八字排盤與 AI 解讀*\n\n' +
      '請提供您的出生日期（YYYY-MM-DD）與性別，並附上要諮詢的問題。\n\n' +
      '📝 *使用範例*：\n' +
      '• `/bazi 1995-08-18 男 請問近幾年事業與財運`\n' +
      '• `/bazi 1992-03-05 14:30 女 感情姻緣發展`\n' +
      '• `/bazi 1988-11-20 男 農曆 創業時機評估`\n\n' +
      '參數說明：\n' +
      '• *日期*：`YYYY-MM-DD`（必填，如 1995-08-18）\n' +
      '• *性別*：`男` 或 `女`（預設男）\n' +
      '• *時間*：`HH:mm`（可選，如 14:30，預設 12:00）\n' +
      '• *曆法*：支援在內容中加入 `農曆` 或 `陰曆`（預設公曆）'
    );
  }

  // 1. 擷取日期 (支援 YYYY-MM-DD, YYYY/MM/DD, YYYY.MM.DD)
  const dateMatch = input.match(/\b(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})日?\b/);
  if (!dateMatch) {
    return sendMessageToTelegramWithContext(context)(
      '❌ *缺少有效出生日期*\n\n' +
      '生辰八字排盤需要精確的出生日期（西元 YYYY-MM-DD）。\n\n' +
      '💡 *正確範例*：\n' +
      '`/bazi 1995-08-18 男 請問今年工作運勢？`'
    );
  }

  const year = dateMatch[1];
  const month = dateMatch[2].padStart(2, '0');
  const day = dateMatch[3].padStart(2, '0');
  const date = `${year}-${month}-${day}`;

  // 2. 擷取時間 (HH:mm)
  const timeMatch = input.match(/\b(\d{1,2}):(\d{2})\b/);
  let time = '12:00';
  if (timeMatch) {
    const hh = timeMatch[1].padStart(2, '0');
    const mm = timeMatch[2];
    time = `${hh}:${mm}`;
  }

  // 3. 擷取性別 (男 / 女)
  let sex = '男';
  const sexMatch = input.match(/(?:^|\s)(女生|女性|女命|女|男生|男性|男命|男)(?:\s|$)/);
  if (sexMatch) {
    sex = sexMatch[1].startsWith('女') ? '女' : '男';
  }

  // 4. 擷取曆法 (農曆 / 公曆)
  const calendar = /(農曆|陰曆|lunar)/i.test(input) ? 'lunar' : 'solar';

  // 5. 擷取問題 (移除已解析的日期、時間、性別、曆法字串)
  let cleanQuestion = input
    .replace(dateMatch[0], '')
    .replace(timeMatch ? timeMatch[0] : '', '')
    .replace(/(?:^|\s)(女生|女性|女命|女|男生|男性|男命|男)(?:\s|$)/g, ' ')
    .replace(/(?:^|\s)(國曆|公曆|陽曆|農曆|陰曆|solar|lunar)(?:\s|$)/gi, ' ')
    .trim();

  if (!cleanQuestion) {
    cleanQuestion = '整體命盤解析與近況運勢指引';
  }

  const url = 'https://qi.david888.com/api/bazi2-question';
  const payload = {
    question: cleanQuestion,
    date,
    time,
    sex,
    calendar,
    purpose: '綜合',
    lang: 'zh-tw'
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
      const msg = data.message || data.error || '未知錯誤';
      return sendMessageToTelegramWithContext(context)(`生辰八字服務回應失敗：${msg}`);
    }

    const ans = (data.answer || '').trim();
    const chart = data.chart || data.result || {};
    const pillars = chart.fourPillars || [];
    const dayMaster = chart.dayMaster || {};
    const fiveElements = chart.fiveElements?.counts || {};
    const meta = data.metadata || {};

    let reply = `【🎴 生辰八字】\n`;
    reply += `命主：${date} ${time}（${sex}命・${calendar === 'lunar' ? '農曆' : '公曆'}）\n`;

    if (pillars.length >= 4) {
      const pillarText = pillars.map(p => `${p.label}:${p.value}(${p.tenGod || ''})`).join(' ');
      reply += `四柱：${pillarText}\n`;
    }
    if (dayMaster.stem || dayMaster.element) {
      reply += `日主：${dayMaster.stem || ''}${dayMaster.element || ''}　`;
    }
    if (Object.keys(fiveElements).length > 0) {
      reply += `五行：木${fiveElements['木'] || 0} 火${fiveElements['火'] || 0} 土${fiveElements['土'] || 0} 金${fiveElements['金'] || 0} 水${fiveElements['水'] || 0}\n`;
    }
    reply += `問題：${cleanQuestion}\n\n`;
    reply += ans ? ans : '（無回覆內容）';

    return sendMessageToTelegramWithContext(context)(reply);
  } catch (e) {
    return sendMessageToTelegramWithContext(context)(`錯誤: ${e.message}`);
  }
}

/**
 * 八宅風水與流年飛星指令
 * @param {Object} message - Telegram 訊息對象
 * @param {string} command - 指令名稱
 * @param {string} subcommand - 參數與問題 (格式：[座向] [問題])
 * @param {Object} context - 上下文對象
 */
export async function commandFengshui(message, command, subcommand, context) {
  const input = (subcommand || '').trim();
  if (!input) {
    return sendMessageToTelegramWithContext(context)(
      '🧭 *八宅風水與流年飛星*\n\n' +
      '請輸入您的房屋座向與要諮詢的風水問題。\n\n' +
      '📝 *使用範例*：\n' +
      '• `/fengshui 坐北朝南 書房財位與文昌位如何佈置？`\n' +
      '• `/fengshui 朝東南 客廳如何增旺財運與家運？`\n' +
      '• `/fengshui 客廳大門正對陽台如何化解穿堂煞？`（未指定座向時預設朝南）\n\n' +
      '支援朝向：`東`、`西`、`南`、`北`、`東南`、`東北`、`西南`、`西北`（或 `坐北朝南`、`坐南朝北` 等）'
    );
  }

  // 1. 判斷朝向 (facing)
  const validFacings = ['東南', '東北', '西南', '西北', '南', '北', '東', '西'];
  let facing = '南';

  // 檢查 "坐X朝Y"
  const zuoChaoMatch = input.match(/坐[東西南北]+朝([東西南北]+)/);
  if (zuoChaoMatch && validFacings.includes(zuoChaoMatch[1])) {
    facing = zuoChaoMatch[1];
  } else {
    // 檢查 "朝X" 或 "面X" 或 "向X"
    const chaoMatch = input.match(/(?:朝|面|向)([東西南北]+)/);
    if (chaoMatch && validFacings.includes(chaoMatch[1])) {
      facing = chaoMatch[1];
    } else {
      // 檢查獨立方向關鍵詞（優先匹配雙字方位）
      for (const dir of validFacings) {
        if (input.includes(dir)) {
          facing = dir;
          break;
        }
      }
    }
  }

  // 2. 判斷生年 (可選)
  const yearMatch = input.match(/\b(19\d{2}|20\d{2})\b/);
  const residentYear = yearMatch ? Number(yearMatch[1]) : 1990;

  // 3. 判斷性別 (可選)
  const sexMatch = input.match(/(?:^|\s)(男生|男性|男命|男|女生|女性|女命|女)(?:\s|$)/);
  const sex = sexMatch ? (sexMatch[1].startsWith('男') ? '男' : '女') : '女';

  // 4. 問題
  const question = input;

  const url = 'https://qi.david888.com/api/fengshui-question';
  const payload = {
    question,
    facing,
    residentYear,
    sex,
    purpose: '綜合',
    lang: 'zh-tw'
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
      const msg = data.message || data.error || '未知錯誤';
      return sendMessageToTelegramWithContext(context)(`風水分析服務回應失敗：${msg}`);
    }

    const ans = (data.answer || '').trim();
    const report = data.report || data.result || {};
    const house = report.eightMansions?.house || '';
    const mingGua = report.resident?.mingGua?.name || '';
    const meta = data.metadata || {};

    let reply = `【🧭 風水格局】\n`;
    reply += `朝向：朝${facing}${house ? ` (${house})` : ''}${mingGua ? `　本命卦：${mingGua}命` : ''}\n`;
    reply += `問題：${data.question || question}\n\n`;
    reply += ans ? ans : '（無回覆內容）';

    return sendMessageToTelegramWithContext(context)(reply);
  } catch (e) {
    return sendMessageToTelegramWithContext(context)(`錯誤: ${e.message}`);
  }
}

/**
 * 月老姻緣與感情測算指令
 * @param {Object} message - Telegram 訊息對象
 * @param {string} command - 指令名稱
 * @param {string} subcommand - 參數與問題 (支援格式：模式或問題 / 西元出生年份1 西元出生年份2 問題)
 * @param {Object} context - 上下文對象
 */
export async function commandYinyuan(message, command, subcommand, context) {
  const input = (subcommand || '').trim();
  if (!input) {
    return sendMessageToTelegramWithContext(context)(
      '🏮 *月老姻緣與感情測算*\n\n' +
      '請輸入想詢問的感情問題，或提供雙方出生年份進行合婚測算。\n\n' +
      '📝 *使用範例*：\n' +
      '• `/yinyuan 求問今年感情與正緣指引`（月老靈籤）\n' +
      '• `/yinyuan 1995 1998 我們合適嗎？`（生肖合婚契合度）\n' +
      '• `/yinyuan 1996 桃花運與有利方位`（個人桃花指引）\n\n' +
      '支援模式：\n' +
      '• *月老靈籤*：直接輸入感情相關問題\n' +
      '• *生肖合婚*：輸入兩個西元年份（如 1995 1998）\n' +
      '• *個人桃花*：輸入單一西元年份（如 1996）'
    );
  }

  // 1. 判斷是否有年份 (西元年 1900 ~ 2099)
  const yearMatches = [...input.matchAll(/\b(19\d{2}|20\d{2})\b/g)].map(m => Number(m[1]));
  let mode = 'fortune';
  let firstYear = undefined;
  let secondYear = undefined;

  if (yearMatches.length >= 2) {
    mode = 'zodiac';
    firstYear = yearMatches[0];
    secondYear = yearMatches[1];
  } else if (yearMatches.length === 1) {
    mode = 'peach-blossom';
    firstYear = yearMatches[0];
  }

  const url = 'https://qi.david888.com/api/yinyuan-question';
  const payload = {
    question: input,
    mode,
    firstYear,
    secondYear,
    status: '單身',
    lang: 'zh-tw'
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
      const msg = data.message || data.error || '未知錯誤';
      return sendMessageToTelegramWithContext(context)(`姻緣測算服務回應失敗：${msg}`);
    }

    const ans = (data.answer || '').trim();
    const result = data.result || {};

    let reply = `【🏮 月老姻緣】\n`;
    if (mode === 'fortune' && (result.poem || result.title)) {
      reply += `籤詩：第${result.number || ''}籤【${result.title || ''}】${result.poem || ''}\n`;
    } else if (mode === 'zodiac' && result.first && result.second) {
      reply += `生肖合婚：${result.first.year}年(${result.first.zodiac || ''}) ＆ ${result.second.year}年(${result.second.zodiac || ''})\n`;
      if (result.relationship || result.score !== undefined) {
        reply += `契合分析：${result.relationship || ''}（評分：${result.score || 0}分）\n`;
      }
    } else if (mode === 'peach-blossom' && result.zodiac) {
      reply += `桃花指引：${result.zodiac}年生肖（狀態：${result.status || '單身'}）\n`;
      if (result.favorableDirection) {
        reply += `有利方位：${result.favorableDirection}\n`;
      }
    }

    reply += `問題：${data.question || input}\n\n`;
    reply += ans ? ans : '（無回覆內容）';

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
