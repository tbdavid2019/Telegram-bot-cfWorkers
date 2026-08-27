/**
 * Divination Features
 * 占卜功能（解答之書、奇門遁甲、梅花易數、塔羅牌、生辰八字2、八宅風水、月老姻緣、淺草籤詩、唐詩）
 * 完整對齊 qi.david888.com 與 tbdavid2019/qimen 權威架構規範
 */

import { sendMessageToTelegramWithContext } from '../telegram/telegram.js';

/**
 * 根據問題關鍵詞智能推導占問目的 (purpose)
 * 支援：綜合, 求財, 事業, 感情, 考試, 健康, 出行, 官司
 */
export function detectPurpose(text) {
  if (!text) return '綜合';
  if (/(求財|財運|理財|投資|股票|營收|利潤|買房|金錢|賺錢|發財)/i.test(text)) return '求財';
  if (/(事業|工作|跳槽|轉職|升遷|面試|創業|職涯|升職|老闆|公司)/i.test(text)) return '事業';
  if (/(感情|婚姻|戀愛|復合|對象|正緣|桃花|結婚|另一半|分手|男朋友|女朋友)/i.test(text)) return '感情';
  if (/(考試|學業|升學|證照|成績|考研|錄取|留學|學校)/i.test(text)) return '考試';
  if (/(健康|疾病|身體|手術|就醫|病情|病灶|痛|醫學)/i.test(text)) return '健康';
  if (/(出行|旅遊|出差|方位|搬家|搬遷|出國|交通|行車)/i.test(text)) return '出行';
  if (/(官司|合約|訴訟|法律|糾紛|仲裁|賠償|法庭|律師)/i.test(text)) return '官司';
  return '綜合';
}

/**
 * 梅花易數占卜指令
 * 支援時間起卦、數字起卦（3個數字）、漢字報字起卦
 * @param {Object} message - Telegram 訊息對象
 * @param {string} command - 指令名稱
 * @param {string} subcommand - 要詢問的問題或起卦參數
 * @param {Object} context - 上下文對象
 */
export async function commandMeiHua(message, command, subcommand, context) {
  const input = (subcommand || '').trim();
  if (!input) {
    return sendMessageToTelegramWithContext(context)(
      '🌸 *梅花易數大師解卦*\n\n' +
      '請在指令後面輸入您要詢問的問題（支援時間起卦、數字起卦、漢字報字起卦）。\n\n' +
      '📝 *使用範例*：\n' +
      '• `/mei 這次面試能順利錄取嗎？` （預設時間起卦）\n' +
      '• `/mei 12 34 56 是否適合換工作？` （三數起卦，1-100）\n' +
      '• `/mei 字:平安 是否能順利過關？` （漢字報字起卦）\n\n' +
      '五卦全息：本卦（現狀）、互卦（過程）、變卦（趨勢）、錯卦（盲點危機）、綜卦（換位思考）與三百八十四爻動爻爻辭。'
    );
  }

  let method = 'time';
  let question = input;
  let num1, num2, num3, text;
  const purpose = detectPurpose(input);

  // 1. 檢查數字起卦 (3個數字)
  const numbersMatch = input.match(/\b(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})\b/);
  if (numbersMatch) {
    method = 'numbers';
    num1 = Number(numbersMatch[1]);
    num2 = Number(numbersMatch[2]);
    num3 = Number(numbersMatch[3]);
    question = input.replace(numbersMatch[0], '').trim() || '梅花數字占卜吉凶';
  } else {
    // 2. 檢查漢字報字起卦 (字:XXX 或 報字:XXX)
    const textMatch = input.match(/(?:字|報字|漢字)[:：]\s*([\u4e00-\u9fa5]+)/);
    if (textMatch) {
      method = 'text';
      text = textMatch[1];
      question = input.replace(textMatch[0], '').trim() || `梅花報字【${text}】吉凶占卜`;
    }
  }

  const url = 'https://qi.david888.com/api/meihua-question';
  const payload = {
    question,
    method,
    num1,
    num2,
    num3,
    text,
    purpose,
    lang: 'zh-tw'
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const respText = await response.text();

    if (!(respText.startsWith('{') && respText.endsWith('}'))) {
      return sendMessageToTelegramWithContext(context)(`錯誤: API回應非JSON，內容: ${respText}`);
    }

    let data;
    try {
      data = JSON.parse(respText);
    } catch (e) {
      return sendMessageToTelegramWithContext(context)(`錯誤: 無法解析JSON回應。內容: ${respText}`);
    }

    if (!data.success) {
      const msg = data.message || data.error || '未知錯誤';
      return sendMessageToTelegramWithContext(context)(`梅花易數服務回應失敗：${msg}`);
    }

    const ans = (data.answer || '').trim();
    const result = data.result || data.data || {};
    const bengua = result.bengua || {};
    const biangua = result.biangua || {};

    let reply = `【🌸 梅花易數】\n問題：${question}\n`;
    if (bengua.name) {
      reply += `卦象：本卦【${bengua.name}】 ➜ 變卦【${biangua.name || '無'}】\n`;
    }
    reply += `起卦：${method === 'numbers' ? `數字 (${num1}, ${num2}, ${num3})` : method === 'text' ? `漢字 (${text})` : '時間起卦'}　目的：${purpose}\n\n`;
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

  // 檢查 variant (三牌陣解讀維度)
  let variant = 'timeline';
  if (/(現狀|阻力|障礙|困難|怎麼辦)/.test(question)) {
    variant = 'situation';
  } else if (/(他|她|感情|我們|關係|對方|戀愛)/.test(question)) {
    variant = 'relationship';
  }

  const url = 'https://qi.david888.com/api/tarot-question';
  const payload = {
    question,
    spread,
    variant,
    purpose: detectPurpose(question),
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
 * 支援十天干克應格局、三遁九遁、門迫宮迫、專題用神與主客動靜
 * @param {Object} message - Telegram 訊息對象
 * @param {string} command - 指令名稱
 * @param {string} subcommand - 要詢問的問題
 * @param {Object} context - 上下文對象
 */
export async function commandQimen(message, command, subcommand, context) {
  const input = (subcommand || '').trim();
  if (!input) {
    return sendMessageToTelegramWithContext(context)(
      '🧭 *奇門遁甲問事占卜*\n\n' +
      '請在指令後面輸入您要詢問的具體問題與事項。\n\n' +
      '📝 *使用範例*：\n' +
      '• `/qi 今天下午商務談判運勢如何？`\n' +
      '• `/qi 換工作跳槽到新公司好不好？`\n' +
      '• `/qi 求財 這筆投資項目是否可行？`\n\n' +
      '系統自動精確鎖定十天干克應格局（青龍返首、飛鳥跌穴等）、三遁九遁吉格、專題用神（求財/工作/感情/考試/健康/出行/官司）與主客動靜攻守策略。'
    );
  }

  const mode = /(傳統|traditional)/i.test(input) ? 'traditional' : 'advanced';
  const purpose = detectPurpose(input);
  const cleanQuestion = input.replace(/(傳統|traditional)/gi, '').trim();

  const url = 'https://qi.david888.com/api/qimen-question';
  const payload = {
    question: cleanQuestion,
    mode,
    purpose,
    datetime: new Date().toISOString(),
    timezone: '+08:00',
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
      const msg = data.message || '未知錯誤';
      return sendMessageToTelegramWithContext(context)(`奇門服務回應失敗：${msg}`);
    }

    const ans = (data.answer || '').trim();
    const qi = data.qimenInfo || {};
    const meta = data.metadata || {};

    let reply = `【🧭 奇門遁甲】\n問題：${data.question || cleanQuestion}\n`;
    if (qi.localDate || qi.localTime) {
      reply += `時間：${qi.localDate || ''} ${qi.localTime || ''}\n`;
    }
    reply += `模式：${mode === 'traditional' ? '傳統時辰' : '進階九時段'}　專題用神：${purpose}\n\n`;
    reply += ans ? ans : '（無回覆內容）';

    return sendMessageToTelegramWithContext(context)(reply);
  } catch (e) {
    return sendMessageToTelegramWithContext(context)(`錯誤: ${e.message}`);
  }
}

/**
 * 生辰八字排盤與 AI 解讀指令
 * 支援四柱、十神藏干、神煞、旺衰格局與大師解讀
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
      '• *曆法*：支援在內容中加入 `農曆` 或 `陰曆`（預設公曆）\n' +
      '• *進階*：支援姓名（`姓名:張三`）、出生地（`出生地:台北`）'
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

  // 5. 擷取姓名與出生地
  const nameMatch = input.match(/(?:姓名|名字|命主)[:：]\s*([\u4e00-\u9fa5a-zA-Z]+)/);
  const name = nameMatch ? nameMatch[1] : undefined;

  const placeMatch = input.match(/(?:出生地|地點|出生於)[:：]\s*([\u4e00-\u9fa5a-zA-Z]+)/);
  const place = placeMatch ? placeMatch[1] : undefined;

  // 6. 擷取問題 (移除已解析的字串)
  let cleanQuestion = input
    .replace(dateMatch[0], '')
    .replace(timeMatch ? timeMatch[0] : '', '')
    .replace(/(?:^|\s)(女生|女性|女命|女|男生|男性|男命|男)(?:\s|$)/g, ' ')
    .replace(/(?:^|\s)(國曆|公曆|陽曆|農曆|陰曆|solar|lunar)(?:\s|$)/gi, ' ')
    .replace(nameMatch ? nameMatch[0] : '', '')
    .replace(placeMatch ? placeMatch[0] : '', '')
    .trim();

  if (!cleanQuestion) {
    cleanQuestion = '整體命盤解析與近況運勢指引';
  }

  const purpose = detectPurpose(cleanQuestion);

  const url = 'https://qi.david888.com/api/bazi2-question';
  const payload = {
    question: cleanQuestion,
    date,
    time,
    sex,
    calendar,
    name,
    place,
    purpose,
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
    reply += `命主：${name ? `${name} ` : ''}${date} ${time}（${sex}命・${calendar === 'lunar' ? '農曆' : '公曆'}）\n`;

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
 * 八宅風水、玄空飛星、形煞化解與協紀辨方擇日指令
 * @param {Object} message - Telegram 訊息對象
 * @param {string} command - 指令名稱
 * @param {string} subcommand - 參數與問題 (格式：[座向/形煞/擇日] [問題])
 * @param {Object} context - 上下文對象
 */
export async function commandFengshui(message, command, subcommand, context) {
  const input = (subcommand || '').trim();
  if (!input) {
    return sendMessageToTelegramWithContext(context)(
      '🧭 *易經風水・陽宅飛星・形煞化解・擇日*\n\n' +
      '請輸入您的房屋座向、空間問題或擇日需求。\n\n' +
      '📝 *使用範例*：\n' +
      '• `/fengshui 坐北朝南 書房財位與文昌位如何佈置？`（陽宅玄空飛星）\n' +
      '• `/fengshui 客廳大門正對陽台穿堂煞如何化解？`（形煞診斷與化解）\n' +
      '• `/fengshui 2026年10月 入宅搬家吉日良辰`（協紀辨方擇日）\n\n' +
      '支援朝向：`東`、`西`、`南`、`北`、`東南`、`東北`、`西南`、`西北`（或 `坐北朝南` 等）'
    );
  }

  // 1. 判斷模式 (yangzhai 陽宅 / shaqi 形煞 / zeri 擇日)
  let mode = 'yangzhai';
  let shaType = undefined;
  let matter = undefined;

  if (/(路沖|天斬|壁刀|反弓|穿堂|橫梁|梁壓頂|鏡對床|形煞|煞氣)/.test(input)) {
    mode = 'shaqi';
    if (input.includes('路沖')) shaType = 'road_rush';
    else if (input.includes('天斬')) shaType = 'tianzan';
    else if (input.includes('壁刀')) shaType = 'bidau';
    else if (input.includes('反弓')) shaType = 'fangong';
    else if (input.includes('穿堂')) shaType = 'chuangtang';
    else if (input.includes('橫梁') || input.includes('梁')) shaType = 'beam';
    else if (input.includes('鏡')) shaType = 'mirror';
  } else if (/(擇日|吉日|良辰吉時|開市|開業|入宅|搬家|動土|修造|裝修|結婚|嫁娶)/.test(input)) {
    mode = 'zeri';
    if (input.includes('入宅') || input.includes('搬家')) matter = 'movein';
    else if (input.includes('開市') || input.includes('開業')) matter = 'open';
    else if (input.includes('動土') || input.includes('裝修') || input.includes('修造')) matter = 'renovate';
    else if (input.includes('結婚') || input.includes('嫁娶')) matter = 'marry';
  }

  // 2. 判斷朝向 (facing)
  const validFacings = ['東南', '東北', '西南', '西北', '南', '北', '東', '西'];
  let facing = '南';

  const zuoChaoMatch = input.match(/坐[東西南北]+朝([東西南北]+)/);
  if (zuoChaoMatch && validFacings.includes(zuoChaoMatch[1])) {
    facing = zuoChaoMatch[1];
  } else {
    const chaoMatch = input.match(/(?:朝|面|向)([東西南北]+)/);
    if (chaoMatch && validFacings.includes(chaoMatch[1])) {
      facing = chaoMatch[1];
    } else {
      for (const dir of validFacings) {
        if (input.includes(dir)) {
          facing = dir;
          break;
        }
      }
    }
  }

  // 3. 判斷生年與入住年 (可選)
  const yearMatch = input.match(/\b(19\d{2}|20\d{2})\b/);
  const residentYear = yearMatch ? Number(yearMatch[1]) : 1990;

  // 4. 判斷性別 (可選)
  const sexMatch = input.match(/(?:^|\s)(男生|男性|男命|男|女生|女性|女命|女)(?:\s|$)/);
  const sex = sexMatch ? (sexMatch[1].startsWith('男') ? '男' : '女') : '女';

  const url = 'https://qi.david888.com/api/fengshui-question';
  const payload = {
    question: input,
    mode,
    facing,
    residentYear,
    sex,
    shaType,
    matter,
    purpose: detectPurpose(input),
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

    let reply = `【🧭 易經風水】\n`;
    if (mode === 'yangzhai') {
      reply += `模式：陽宅八宅玄空　朝向：朝${facing}${house ? ` (${house})` : ''}${mingGua ? `　本命卦：${mingGua}命` : ''}\n`;
    } else if (mode === 'shaqi') {
      reply += `模式：形煞診斷與化解${shaType ? ` (${shaType})` : ''}\n`;
    } else if (mode === 'zeri') {
      reply += `模式：協紀辨方擇日${matter ? ` (${matter})` : ''}\n`;
    }
    reply += `問題：${data.question || input}\n\n`;
    reply += ans ? ans : '（無回覆內容）';

    return sendMessageToTelegramWithContext(context)(reply);
  } catch (e) {
    return sendMessageToTelegramWithContext(context)(`錯誤: ${e.message}`);
  }
}

/**
 * 月老姻緣與感情測算指令
 * 完整支援 6 大模式：月老靈籤(100籤)、生肖合婚、紫微夫妻宮、桃花運勢、八字合婚、紅線正緣
 * @param {Object} message - Telegram 訊息對象
 * @param {string} command - 指令名稱
 * @param {string} subcommand - 參數與問題
 * @param {Object} context - 上下文對象
 */
export async function commandYinyuan(message, command, subcommand, context) {
  const input = (subcommand || '').trim();
  if (!input) {
    return sendMessageToTelegramWithContext(context)(
      '🏮 *月老姻緣・六大感情測算*\n\n' +
      '請輸入想詢問的感情問題，或提供生辰/年份進行合婚與桃花測算。\n\n' +
      '📝 *使用範例*：\n' +
      '• `/yinyuan 求問今年感情與正緣指引`（月老靈籤 100 籤）\n' +
      '• `/yinyuan 第58籤 感情復合指引`（自選籤號解籤）\n' +
      '• `/yinyuan 1995 1998 我們合適嗎？`（生肖合婚契合評分）\n' +
      '• `/yinyuan 1996 桃花運與有利方位`（個人桃花運勢）\n' +
      '• `/yinyuan 紫微夫妻宮 1994-06-12 男 配偶特質`（夫妻宮主星）\n' +
      '• `/yinyuan 紅線測算 尋找對象與時機窗口`（正緣畫像）\n\n' +
      '支援模式：`月老靈籤`、`生肖合婚`、`紫微夫妻宮`、`桃花運勢`、`八字合婚`、`紅線測算`'
    );
  }

  // 1. 判斷是否有年份 (西元年 1900 ~ 2099)
  const yearMatches = [...input.matchAll(/\b(19\d{2}|20\d{2})\b/g)].map(m => Number(m[1]));
  let mode = 'fortune';
  let firstYear = undefined;
  let secondYear = undefined;
  let stickNum = undefined;

  // 檢查自選籤號 (第XX籤 或 XX籤)
  const stickMatch = input.match(/(?:第\s*)?(\d{1,3})\s*籤/);
  if (stickMatch && Number(stickMatch[1]) >= 1 && Number(stickMatch[1]) <= 100) {
    mode = 'fortune';
    stickNum = Number(stickMatch[1]);
  } else if (/(夫妻宮|紫微)/.test(input)) {
    mode = 'ziwei-marriage';
  } else if (/(八字合婚|合婚)/.test(input)) {
    mode = 'bazi-match';
  } else if (/(紅線|正緣|理想型|尋找對象)/.test(input)) {
    mode = 'red-thread';
  } else if (/(桃花|桃花位|桃花運)/.test(input)) {
    mode = 'peach-blossom';
    if (yearMatches.length >= 1) firstYear = yearMatches[0];
  } else if (yearMatches.length >= 2) {
    mode = 'zodiac';
    firstYear = yearMatches[0];
    secondYear = yearMatches[1];
  } else if (yearMatches.length === 1) {
    mode = 'peach-blossom';
    firstYear = yearMatches[0];
  }

  // 判斷感情狀態 (status)
  let status = '單身';
  if (input.includes('暗戀')) status = '暗戀';
  else if (input.includes('曖昧')) status = '曖昧';
  else if (input.includes('熱戀') || input.includes('交往')) status = '熱戀';
  else if (input.includes('備婚') || input.includes('論及婚嫁')) status = '備婚';
  else if (input.includes('已婚') || input.includes('結婚')) status = '已婚';
  else if (input.includes('分手') || input.includes('復合')) status = '分手挽回';

  const url = 'https://qi.david888.com/api/yinyuan-question';
  const payload = {
    question: input,
    mode,
    firstYear,
    secondYear,
    stickNum,
    status,
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
      reply += `籤詩：第${result.number || stickNum || ''}籤【${result.title || ''}】${result.poem || ''}\n`;
    } else if (mode === 'zodiac' && result.first && result.second) {
      reply += `生肖合婚：${result.first.year}年(${result.first.zodiac || ''}) ＆ ${result.second.year}年(${result.second.zodiac || ''})\n`;
      if (result.relationship || result.score !== undefined) {
        reply += `契合分析：${result.relationship || ''}（評分：${result.score || 0}分）\n`;
      }
    } else if (mode === 'peach-blossom' && result.zodiac) {
      reply += `桃花指引：${result.zodiac}年生肖（狀態：${status}）\n`;
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
 * 優先串接 qi.david888.com/api/answerbook-question，自動備援回退
 * @param {Object} message - Telegram 訊息對象
 * @param {string} command - 指令名稱
 * @param {string} subcommand - 子指令參數
 * @param {Object} context - 上下文對象
 */
export async function commandAnswerBook(message, command, subcommand, context) {
  const question = (subcommand || '').trim();

  // 1. 優先調用 qi.david888.com/api/answerbook-question
  try {
    const res = await fetch('https://qi.david888.com/api/answerbook-question', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: question ? 'question' : 'direct',
        question: question || undefined,
        lang: 'zh-tw'
      })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.answer) {
        let reply = `📖 【解答之書】\n`;
        if (question) reply += `問題：${question}\n\n`;
        reply += data.answer;
        return sendMessageToTelegramWithContext(context)(reply);
      }
    }
  } catch (e) {
    console.warn('[AnswerBook] qi.david888.com API fallback:', e.message);
  }

  // 2. 備援節點：answerbook.david888.com
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
      return sendMessageToTelegramWithContext(context)(`解答之書: ${text}`);
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
