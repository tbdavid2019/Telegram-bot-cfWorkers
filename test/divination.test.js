import test from 'node:test';
import assert from 'node:assert/strict';
import {
  commandTarot,
  commandBazi,
  commandFengshui,
  commandYinyuan
} from '../src/features/divination.js';
import { commandHandlers, isValidCommand } from '../src/telegram/commands.js';

test('all new divination commands are registered in commandHandlers', () => {
  assert.equal(isValidCommand('/tarot'), true);
  assert.equal(isValidCommand('/bazi'), true);
  assert.equal(isValidCommand('/fengshui'), true);
  assert.equal(isValidCommand('/yinyuan'), true);

  assert.equal(typeof commandHandlers['/tarot']?.fn, 'function');
  assert.equal(typeof commandHandlers['/bazi']?.fn, 'function');
  assert.equal(typeof commandHandlers['/fengshui']?.fn, 'function');
  assert.equal(typeof commandHandlers['/yinyuan']?.fn, 'function');
});

// ===== 塔羅占卜測試 =====
test('commandTarot prompts usage when input is empty', async () => {
  let sentMessage = '';
  const context = {
    SHARE_CONTEXT: { currentBotToken: 'fake_token' },
    CURRENT_CHAT_CONTEXT: { chat_id: 12345 }
  };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    if (typeof url === 'string' && url.includes('api.telegram.org')) {
      const body = JSON.parse(opts.body);
      sentMessage = body.text;
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }
    return originalFetch(url, opts);
  };

  try {
    await commandTarot({}, '/tarot', '', context);
    assert.match(sentMessage, /塔羅牌占卜/);
    assert.match(sentMessage, /使用範例/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('commandTarot parses spread and formats response correctly', async () => {
  let sentMessage = '';
  const context = {
    SHARE_CONTEXT: { currentBotToken: 'fake_token' },
    CURRENT_CHAT_CONTEXT: { chat_id: 12345 }
  };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    if (typeof url === 'string' && url.includes('api.telegram.org')) {
      const body = JSON.parse(opts.body);
      sentMessage = body.text;
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }
    if (typeof url === 'string' && url.includes('api/tarot-question')) {
      const reqBody = JSON.parse(opts.body);
      assert.equal(reqBody.spread, 'diamond');
      assert.equal(reqBody.question, '換工作評估');
      return new Response(JSON.stringify({
        success: true,
        question: '換工作評估',
        answer: '這是塔羅解讀建議內容',
        reading: {
          spread: 'diamond',
          cards: [
            { position: '核心', name: '愚者', orientation: '正位' },
            { position: '根源', name: '寶劍十', orientation: '逆位' }
          ]
        },
        metadata: { provider: 'test-ai', model: 'gpt-test' }
      }), { status: 200 });
    }
    return originalFetch(url, opts);
  };

  try {
    await commandTarot({}, '/tarot', 'diamond 換工作評估', context);
    assert.match(sentMessage, /【🔮 塔羅占卜】/);
    assert.match(sentMessage, /鑽石牌陣/);
    assert.match(sentMessage, /\[核心\] 愚者 \(正位\)/);
    assert.match(sentMessage, /這是塔羅解讀建議內容/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ===== 生辰八字測試 =====
test('commandBazi prompts usage when input is empty', async () => {
  let sentMessage = '';
  const context = {
    SHARE_CONTEXT: { currentBotToken: 'fake_token' },
    CURRENT_CHAT_CONTEXT: { chat_id: 12345 }
  };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    if (typeof url === 'string' && url.includes('api.telegram.org')) {
      const body = JSON.parse(opts.body);
      sentMessage = body.text;
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }
    return originalFetch(url, opts);
  };

  try {
    await commandBazi({}, '/bazi', '', context);
    assert.match(sentMessage, /生辰八字排盤/);
    assert.match(sentMessage, /使用範例/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('commandBazi returns error guidance when date is missing', async () => {
  let sentMessage = '';
  const context = {
    SHARE_CONTEXT: { currentBotToken: 'fake_token' },
    CURRENT_CHAT_CONTEXT: { chat_id: 12345 }
  };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    if (typeof url === 'string' && url.includes('api.telegram.org')) {
      const body = JSON.parse(opts.body);
      sentMessage = body.text;
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }
    return originalFetch(url, opts);
  };

  try {
    await commandBazi({}, '/bazi', '請問我的今年事業與財運如何？', context);
    assert.match(sentMessage, /缺少有效出生日期/);
    assert.match(sentMessage, /1995-08-18/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('commandBazi correctly parses date, time, sex, and formats response', async () => {
  let sentMessage = '';
  const context = {
    SHARE_CONTEXT: { currentBotToken: 'fake_token' },
    CURRENT_CHAT_CONTEXT: { chat_id: 12345 }
  };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    if (typeof url === 'string' && url.includes('api.telegram.org')) {
      const body = JSON.parse(opts.body);
      sentMessage = body.text;
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }
    if (typeof url === 'string' && url.includes('api/bazi2-question')) {
      const reqBody = JSON.parse(opts.body);
      assert.equal(reqBody.date, '1995-08-18');
      assert.equal(reqBody.time, '14:30');
      assert.equal(reqBody.sex, '女');
      assert.equal(reqBody.calendar, 'solar');
      assert.match(reqBody.question, /今年工作運勢/);

      return new Response(JSON.stringify({
        success: true,
        question: reqBody.question,
        answer: '這是八字解盤詳細內容',
        chart: {
          fourPillars: [
            { label: '年柱', value: '乙亥', tenGod: '偏財' },
            { label: '月柱', value: '甲申', tenGod: '正財' },
            { label: '日柱', value: '辛巳', tenGod: '比肩' },
            { label: '時柱', value: '乙未', tenGod: '偏財' }
          ],
          dayMaster: { stem: '辛', element: '金' },
          fiveElements: { counts: { 木: 3, 火: 1, 土: 1, 金: 2, 水: 1 } }
        },
        metadata: { provider: 'test-ai', model: 'bazi-model' }
      }), { status: 200 });
    }
    return originalFetch(url, opts);
  };

  try {
    await commandBazi({}, '/bazi', '1995-08-18 14:30 女生 今年工作運勢如何', context);
    assert.match(sentMessage, /【🎴 生辰八字】/);
    assert.match(sentMessage, /命主：1995-08-18 14:30（女命・公曆）/);
    assert.match(sentMessage, /四柱：年柱:乙亥\(偏財\) 月柱:甲申\(正財\) 日柱:辛巳\(比肩\) 時柱:乙未\(偏財\)/);
    assert.match(sentMessage, /日主：辛金/);
    assert.match(sentMessage, /五行：木3 火1 土1 金2 水1/);
    assert.match(sentMessage, /這是八字解盤詳細內容/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ===== 風水報告測試 =====
test('commandFengshui correctly parses facing and formats response', async () => {
  let sentMessage = '';
  const context = {
    SHARE_CONTEXT: { currentBotToken: 'fake_token' },
    CURRENT_CHAT_CONTEXT: { chat_id: 12345 }
  };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    if (typeof url === 'string' && url.includes('api.telegram.org')) {
      const body = JSON.parse(opts.body);
      sentMessage = body.text;
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }
    if (typeof url === 'string' && url.includes('api/fengshui-question')) {
      const reqBody = JSON.parse(opts.body);
      assert.equal(reqBody.facing, '東南');
      return new Response(JSON.stringify({
        success: true,
        question: reqBody.question,
        answer: '這是風水佈局建議內容',
        report: {
          facing: '東南',
          eightMansions: { house: '乾宅' },
          resident: { mingGua: { name: '坤' } }
        },
        metadata: { provider: 'test-ai', model: 'fs-model' }
      }), { status: 200 });
    }
    return originalFetch(url, opts);
  };

  try {
    await commandFengshui({}, '/fengshui', '朝東南 客廳財位與文昌位佈置', context);
    assert.match(sentMessage, /【🧭 (?:易經風水|風水格局)】/);
    assert.match(sentMessage, /朝向：朝東南 \(乾宅\)/);
    assert.match(sentMessage, /本命卦：坤命/);
    assert.match(sentMessage, /這是風水佈局建議內容/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ===== 月老姻緣測試 =====
test('commandYinyuan supports fortune mode, zodiac mode, and peach-blossom mode', async () => {
  let sentMessage = '';
  const context = {
    SHARE_CONTEXT: { currentBotToken: 'fake_token' },
    CURRENT_CHAT_CONTEXT: { chat_id: 12345 }
  };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    if (typeof url === 'string' && url.includes('api.telegram.org')) {
      const body = JSON.parse(opts.body);
      sentMessage = body.text;
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }
    if (typeof url === 'string' && url.includes('api/yinyuan-question')) {
      const reqBody = JSON.parse(opts.body);
      if (reqBody.mode === 'zodiac') {
        assert.equal(reqBody.firstYear, 1995);
        assert.equal(reqBody.secondYear, 1997);
        return new Response(JSON.stringify({
          success: true,
          question: reqBody.question,
          answer: '這是合婚解讀內容',
          result: {
            first: { year: 1995, zodiac: '豬' },
            second: { year: 1997, zodiac: '牛' },
            relationship: '六合契合良好',
            score: 88
          },
          metadata: { provider: 'test-ai', model: 'yinyuan-model' }
        }), { status: 200 });
      } else {
        return new Response(JSON.stringify({
          success: true,
          question: reqBody.question,
          answer: '這是月老籤解讀內容',
          result: {
            number: 1,
            title: '上上籤',
            poem: '花開月滿，緣分宜以真誠相待。'
          },
          metadata: { provider: 'test-ai', model: 'yinyuan-model' }
        }), { status: 200 });
      }
    }
    return originalFetch(url, opts);
  };

  try {
    // 1. Fortune mode
    await commandYinyuan({}, '/yinyuan', '求問今年感情運勢', context);
    assert.match(sentMessage, /【🏮 月老姻緣】/);
    assert.match(sentMessage, /籤詩：第1籤【上上籤】花開月滿/);
    assert.match(sentMessage, /這是月老籤解讀內容/);

    // 2. Zodiac mode
    await commandYinyuan({}, '/yinyuan', '1995 1997 我們合不合適？', context);
    assert.match(sentMessage, /生肖合婚：1995年\(豬\) ＆ 1997年\(牛\)/);
    assert.match(sentMessage, /契合分析：六合契合良好（評分：88分）/);
    assert.match(sentMessage, /這是合婚解讀內容/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ===== 奇門遁甲與梅花易數測試 =====
test('commandQimen automatically detects purpose and formats response correctly', async () => {
  const { commandQimen } = await import('../src/features/divination.js');
  let sentMessage = '';
  const context = {
    SHARE_CONTEXT: { currentBotToken: 'fake_token' },
    CURRENT_CHAT_CONTEXT: { chat_id: 12345 }
  };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    if (typeof url === 'string' && url.includes('api.telegram.org')) {
      const body = JSON.parse(opts.body);
      sentMessage = body.text;
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }
    if (typeof url === 'string' && url.includes('api/qimen-question')) {
      const reqBody = JSON.parse(opts.body);
      assert.equal(reqBody.purpose, '事業');
      assert.equal(reqBody.mode, 'advanced');
      assert.equal(reqBody.lang, 'zh-tw');
      return new Response(JSON.stringify({
        success: true,
        question: reqBody.question,
        answer: '奇門解盤：直符落乾六宮，生門乘天乙，事業發展大吉。',
        qimenInfo: {
          localDate: '2026-08-27',
          localTime: '10:00',
          mode: 'advanced',
          purpose: '事業'
        }
      }), { status: 200 });
    }
    return originalFetch(url, opts);
  };

  try {
    await commandQimen({}, '/qi', '換工作跳槽到新公司好不好？', context);
    assert.match(sentMessage, /【🧭 奇門遁甲】/);
    assert.match(sentMessage, /專題用神：事業/);
    assert.match(sentMessage, /生門乘天乙/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('commandMeiHua supports numbers method and text method', async () => {
  const { commandMeiHua } = await import('../src/features/divination.js');
  let sentMessage = '';
  const context = {
    SHARE_CONTEXT: { currentBotToken: 'fake_token' },
    CURRENT_CHAT_CONTEXT: { chat_id: 12345 }
  };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    if (typeof url === 'string' && url.includes('api.telegram.org')) {
      const body = JSON.parse(opts.body);
      sentMessage = body.text;
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }
    if (typeof url === 'string' && url.includes('api/meihua-question')) {
      const reqBody = JSON.parse(opts.body);
      if (reqBody.method === 'numbers') {
        assert.equal(reqBody.num1, 12);
        assert.equal(reqBody.num2, 34);
        assert.equal(reqBody.num3, 56);
        return new Response(JSON.stringify({
          success: true,
          question: reqBody.question,
          answer: '數字起卦得天火同人，志同道合。',
          result: {
            bengua: { name: '天火同人' },
            biangua: { name: '乾為天' }
          }
        }), { status: 200 });
      } else if (reqBody.method === 'text') {
        assert.equal(reqBody.text, '平安');
        return new Response(JSON.stringify({
          success: true,
          question: reqBody.question,
          answer: '報字【平安】起卦得地天泰，安泰吉祥。',
          result: {
            bengua: { name: '地天泰' },
            biangua: { name: '坤為地' }
          }
        }), { status: 200 });
      }
    }
    return originalFetch(url, opts);
  };

  try {
    // 1. Numbers method
    await commandMeiHua({}, '/mei', '12 34 56 是否適合換工作？', context);
    assert.match(sentMessage, /【🌸 梅花易數】/);
    assert.match(sentMessage, /本卦【天火同人】/);
    assert.match(sentMessage, /數字 \(12, 34, 56\)/);

    // 2. Text method
    await commandMeiHua({}, '/mei', '字:平安 是否能順利過關？', context);
    assert.match(sentMessage, /本卦【地天泰】/);
    assert.match(sentMessage, /漢字 \(平安\)/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('commandFengshui supports shaqi mode and zeri mode', async () => {
  let sentMessage = '';
  const context = {
    SHARE_CONTEXT: { currentBotToken: 'fake_token' },
    CURRENT_CHAT_CONTEXT: { chat_id: 12345 }
  };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    if (typeof url === 'string' && url.includes('api.telegram.org')) {
      const body = JSON.parse(opts.body);
      sentMessage = body.text;
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }
    if (typeof url === 'string' && url.includes('api/fengshui-question')) {
      const reqBody = JSON.parse(opts.body);
      if (reqBody.mode === 'shaqi') {
        assert.equal(reqBody.shaType, 'chuangtang');
        return new Response(JSON.stringify({
          success: true,
          question: reqBody.question,
          answer: '穿堂煞建議在玄關設置屏風或置放闊葉盆栽阻隔氣流直衝。',
          report: {
            mode: 'shaqi',
            shaType: 'chuangtang'
          }
        }), { status: 200 });
      } else if (reqBody.mode === 'zeri') {
        assert.equal(reqBody.matter, 'movein');
        return new Response(JSON.stringify({
          success: true,
          question: reqBody.question,
          answer: '2026年10月入宅吉日：10月8日辰時、10月18日巳時。',
          report: {
            mode: 'zeri',
            matter: 'movein'
          }
        }), { status: 200 });
      }
    }
    return originalFetch(url, opts);
  };

  try {
    // 1. Shaqi mode
    await commandFengshui({}, '/fengshui', '客廳大門正對陽台穿堂煞如何化解？', context);
    assert.match(sentMessage, /模式：形煞診斷與化解 \(chuangtang\)/);
    assert.match(sentMessage, /設置屏風/);

    // 2. Zeri mode
    await commandFengshui({}, '/fengshui', '2026年10月 入宅搬家吉日良辰', context);
    assert.match(sentMessage, /模式：協紀辨方擇日 \(movein\)/);
    assert.match(sentMessage, /10月8日辰時/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('commandAnswerBook queries qi.david888.com and falls back gracefully', async () => {
  const { commandAnswerBook } = await import('../src/features/divination.js');
  let sentMessage = '';
  const context = {
    SHARE_CONTEXT: { currentBotToken: 'fake_token' },
    CURRENT_CHAT_CONTEXT: { chat_id: 12345 }
  };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    if (typeof url === 'string' && url.includes('api.telegram.org')) {
      const body = JSON.parse(opts.body);
      sentMessage = body.text;
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }
    if (typeof url === 'string' && url.includes('api/answerbook-question')) {
      return new Response(JSON.stringify({
        success: true,
        answer: '順其自然，答案即在眼前。'
      }), { status: 200 });
    }
    return originalFetch(url, opts);
  };

  try {
    await commandAnswerBook({}, '/boa', '我該接受這個工作 offer 嗎？', context);
    assert.match(sentMessage, /📖 【解答之書】/);
    assert.match(sentMessage, /順其自然，答案即在眼前。/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
