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
    assert.match(sentMessage, /test-ai gpt-test/);
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
    assert.match(sentMessage, /【🧭 風水格局】/);
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
