import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildRichTable,
  tableToLegacyHtml,
  splitRichTextIntoLegacyChunks,
  markdownTableToRichBlock,
  extractRichBlocksFromMarkdown
} from '../src/telegram/rich.js';
import {
  sendRichMessage,
  sendRichMessageToTelegram,
  sendRichMessageWithContext,
  buildInlineButton,
  buildInlineKeyboard
} from '../src/telegram/telegram.js';
import { showModelMenu } from '../src/features/llm.js';
import { commandSetImageProvider } from '../src/features/image-gen.js';
import { msgHandleCallbackQuery } from '../src/telegram/message.js';
import { commandStock, commandStockTW } from '../src/features/stock.js';
import { commandWeather } from '../src/features/weather.js';
import { chatWithLLM } from '../src/agent/llm.js';

test('buildRichTable: generates compliant InputRichBlockTable with defaults and custom options', () => {
  const table = buildRichTable({
    headers: ['項目', '數值'],
    rows: [
      ['代碼', '2330.TW'],
      ['現價', '980.00 TWD']
    ],
    is_compact: true,
    is_striped: true,
    caption: '  台積電行情總覽  '
  });

  assert.equal(table.type, 'table');
  assert.equal(table.is_compact, true);
  assert.equal(table.is_striped, true);
  assert.equal(table.caption, '台積電行情總覽');
  assert.equal(table.cells.length, 3);

  // Headers row (2D Array of RichBlockTableCell objects)
  assert.deepEqual(table.cells[0], [
    { text: '項目', is_header: true },
    { text: '數值', is_header: true }
  ]);

  // Data rows (2D Array of RichBlockTableCell objects)
  assert.deepEqual(table.cells[1], [
    { text: '代碼' },
    { text: '2330.TW' }
  ]);
  assert.deepEqual(table.cells[2], [
    { text: '現價' },
    { text: '980.00 TWD' }
  ]);
});

test('buildRichTable: enforces maximum 20 columns constraint and handles empty table', () => {
  const wideHeaders = Array.from({ length: 25 }, (_, i) => `Col${i + 1}`);
  const wideRow = Array.from({ length: 25 }, (_, i) => `Val${i + 1}`);

  const table = buildRichTable({
    headers: wideHeaders,
    rows: [wideRow]
  });

  assert.equal(table.cells[0].length, 20, '表頭應被截斷為最多 20 欄');
  assert.equal(table.cells[1].length, 20, '資料行應被截斷為最多 20 欄');

  // 空表格應安全回傳 null
  const emptyTable = buildRichTable({ headers: [], rows: [] });
  assert.equal(emptyTable, null);
});

test('tableToLegacyHtml: converts table to standard Telegram HTML list with escaping', () => {
  const html = tableToLegacyHtml({
    caption: '行情 <測試 & 符號>',
    headers: ['標的 & 項目', '價格'],
    rows: [
      ['<NVDA>', '$130.50'],
      ['TSLA', '$210.00']
    ]
  });

  assert.match(html, /<b>行情 &lt;測試 &amp; 符號&gt;<\/b>/);
  assert.match(html, /• <b>標的 &amp; 項目:<\/b> &lt;NVDA&gt; \| <b>價格:<\/b> \$130\.50/);
  assert.match(html, /• <b>標的 &amp; 項目:<\/b> TSLA \| <b>價格:<\/b> \$210\.00/);
});

test('splitRichTextIntoLegacyChunks: splits text by paragraph and ensures unclosed tags are balanced', () => {
  // 1. 段落安全切分
  const p1 = '<b>段落 1:</b> 這是第一段內容。';
  const p2 = '<i>段落 2:</i> 這是第二段內容。';
  const combined = `${p1}\n\n${p2}`;

  const chunks = splitRichTextIntoLegacyChunks(combined, 100);
  assert.ok(chunks.length >= 1);
  assert.ok(chunks.every((c) => c.length <= 100));

  // 2. 超長單一段落二次切分與未閉合標籤自動補齊
  const longParagraph = '<b>重要警報：' + 'A'.repeat(500);
  const splitChunks = splitRichTextIntoLegacyChunks(longParagraph, 200);
  assert.ok(splitChunks.length >= 2);
  assert.ok(splitChunks[0].endsWith('</b>'), '未閉合標籤應被自動補齊閉合');
  assert.ok(splitChunks.every((c) => c.length <= 200));
});

test('sendRichMessage: dispatches POST to /sendRichMessage with expected body', async () => {
  let requestUrl = '';
  let requestBody = null;

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    requestUrl = String(url);
    requestBody = JSON.parse(opts.body);
    return new Response(JSON.stringify({ ok: true, result: { message_id: 888 } }), { status: 200 });
  };

  try {
    const payload = {
      blocks: [
        { type: 'table', cells: [[{ text: 'A' }]] }
      ]
    };
    const resp = await sendRichMessage(payload, 'token123', {
      chat_id: 999,
      reply_markup: { inline_keyboard: [] }
    }, 'fallback text');

    assert.equal(resp.status, 200);
    assert.match(requestUrl, /\/bottoken123\/sendRichMessage$/);
    assert.equal(requestBody.chat_id, 999);
    assert.deepEqual(requestBody.rich_message.blocks, payload.blocks);
    assert.deepEqual(JSON.parse(requestBody.rich_blocks), payload.blocks);
    assert.deepEqual(requestBody.reply_markup, { inline_keyboard: [] });
    assert.equal(requestBody.text, 'fallback text');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('sendRichMessageToTelegram: handles HTTP 200 success path', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    if (String(url).includes('/sendRichMessage')) {
      return new Response(JSON.stringify({ ok: true, result: { message_id: 101 } }), { status: 200 });
    }
    return originalFetch(url, opts);
  };

  try {
    const resp = await sendRichMessageToTelegram({ blocks: [] }, 'token', { chat_id: 1 }, 'fallback');
    assert.equal(resp.status, 200);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('sendRichMessageToTelegram: automatically degrades to sendMessage on HTTP 400 error with chunking', async () => {
  const sentEndpoints = [];
  const sentBodies = [];

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    const endpoint = String(url);
    sentEndpoints.push(endpoint);
    if (opts?.body) {
      sentBodies.push(JSON.parse(opts.body));
    }

    if (endpoint.includes('/sendRichMessage')) {
      return new Response(JSON.stringify({ ok: false, error_code: 400, description: 'Bad Request: unsupported block' }), { status: 400 });
    }
    if (endpoint.includes('/sendMessage')) {
      return new Response(JSON.stringify({ ok: true, result: { message_id: 202 } }), { status: 200 });
    }
    return originalFetch(url, opts);
  };

  try {
    const part1 = '段落一：' + 'X'.repeat(3000);
    const part2 = '段落二：' + 'Y'.repeat(2000);
    const longFallback = `${part1}\n\n${part2}`;

    const resp = await sendRichMessageToTelegram(
      { blocks: [] },
      'test_token',
      { chat_id: 12345 },
      longFallback
    );

    assert.equal(resp.status, 200);
    assert.ok(sentEndpoints[0].includes('/sendRichMessage'));
    const fallbackEndpoints = sentEndpoints.filter((ep) => ep.includes('/sendMessage'));
    assert.equal(fallbackEndpoints.length, 2, '超過 4000 字元之 fallback 應分為 2 則 sendMessage 發送');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('sendRichMessageToTelegram: falls back gracefully on HTTP 404 (unsupported old endpoint) or ok:false', async () => {
  let fallbackCount = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (String(url).includes('/sendRichMessage')) {
      return new Response('Not Found', { status: 404 });
    }
    if (String(url).includes('/sendMessage')) {
      fallbackCount++;
      return new Response(JSON.stringify({ ok: true, result: { message_id: 303 } }), { status: 200 });
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  };

  try {
    const resp = await sendRichMessageToTelegram({ blocks: [] }, 'token', { chat_id: 1 }, 'test fallback');
    assert.equal(resp.status, 200);
    assert.equal(fallbackCount, 1, '遇到 404 舊伺服器應自動觸發 fallback');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('sendRichMessageToTelegram: passes through non-400 errors (401/403/429) without blind fallback', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (String(url).includes('/sendRichMessage')) {
      return new Response(JSON.stringify({ ok: false, error_code: 401, description: 'Unauthorized' }), { status: 401 });
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  };

  try {
    const resp = await sendRichMessageToTelegram({ blocks: [] }, 'token', { chat_id: 1 }, 'fallback');
    assert.equal(resp.status, 401, '401 錯誤應如實回傳，不應盲目降級');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('sendRichMessageWithContext: intercepts output when context.captureToolOutput is provided', async () => {
  const captured = [];
  const context = {
    captureToolOutput: (txt) => captured.push(txt),
    SHARE_CONTEXT: { currentBotToken: 'fake' },
    CURRENT_CHAT_CONTEXT: { chat_id: 1 }
  };

  const resp = await sendRichMessageWithContext(context)({ blocks: [] }, 'Tool Output Result');
  assert.equal(resp.status, 200);
  assert.deepEqual(captured, ['Tool Output Result']);
});

test('Inline Keyboard: buildInlineButton and buildInlineKeyboard format disabled buttons per Telegram 10.3 schema', () => {
  const disabledBtn = buildInlineButton({
    text: 'Active Item',
    callback_data: '/model:active',
    url: 'https://example.com',
    disabled: true
  });
  assert.equal(disabledBtn.text, 'Active Item');
  assert.deepEqual(disabledBtn.disabled, {});
  assert.equal(disabledBtn.callback_data, undefined, 'disabled 按鈕必須省略 callback_data');
  assert.equal(disabledBtn.url, undefined, 'disabled 按鈕必須省略 url 等任何 action 欄位');

  const keyboard = buildInlineKeyboard([
    [
      { text: 'A', callback_data: '/cmd:a', url: 'https://example.com', disabled: {} },
      { text: 'B', callback_data: '/cmd:b' }
    ]
  ]);

  assert.deepEqual(keyboard.inline_keyboard[0][0], { text: 'A', disabled: {} });
  assert.deepEqual(keyboard.inline_keyboard[0][1], { text: 'B', callback_data: '/cmd:b' });
});

test('/model menu: active profile uses Telegram 10.3 disabled: {} and omits callback_data', async () => {
  let sentMarkup = null;
  const context = {
    SHARE_CONTEXT: { currentBotToken: 'token' },
    CURRENT_CHAT_CONTEXT: { chat_id: 123 },
    USER_CONFIG: {
      CURRENT_LLM_PROFILE: 'gpt4',
      DEFAULT_LLM_PROFILE: 'gpt4',
      LLM_PROFILES: {
        gpt4: { name: 'GPT-4o', provider: 'openai', model: 'gpt-4o' },
        claude: { name: 'Claude 3.5', provider: 'openai', model: 'claude-3-5' }
      }
    }
  };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    if (opts?.body) {
      const parsed = JSON.parse(opts.body);
      if (parsed.reply_markup) {
        sentMarkup = JSON.parse(parsed.reply_markup);
      }
    }
    return new Response(JSON.stringify({ ok: true, result: { message_id: 1 } }), { status: 200 });
  };

  try {
    await showModelMenu(context);
    assert.ok(sentMarkup?.inline_keyboard, '應包含 inline_keyboard');
    const buttons = sentMarkup.inline_keyboard.flat();

    const activeBtn = buttons.find((b) => b.text.includes('GPT-4o'));
    const inactiveBtn = buttons.find((b) => b.text.includes('Claude 3.5'));

    assert.ok(activeBtn, '應有當前使用中之 GPT-4o 按鈕');
    assert.equal(activeBtn.text, '✓ GPT-4o');
    assert.deepEqual(activeBtn.disabled, {}, '當前 profile 應設定 disabled: {}');
    assert.equal(activeBtn.callback_data, undefined, '當前 profile 不得帶 callback_data');

    assert.ok(inactiveBtn, '應有未選中之 Claude 按鈕');
    assert.equal(inactiveBtn.text, 'Claude 3.5');
    assert.equal(inactiveBtn.callback_data, '/model:claude');
    assert.equal(inactiveBtn.disabled, undefined);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('/setimg menu: active image provider uses Telegram 10.3 disabled: {} and omits callback_data', async () => {
  let sentMarkup = null;
  const context = {
    SHARE_CONTEXT: { currentBotToken: 'token' },
    CURRENT_CHAT_CONTEXT: { chat_id: 123 },
    USER_CONFIG: {
      AI_IMAGE_PROVIDER: 'gemini'
    }
  };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    if (opts?.body) {
      const parsed = JSON.parse(opts.body);
      if (parsed.reply_markup) {
        sentMarkup = JSON.parse(parsed.reply_markup);
      }
    }
    return new Response(JSON.stringify({ ok: true, result: { message_id: 1 } }), { status: 200 });
  };

  try {
    await commandSetImageProvider({}, '/setimg', '', context);
    assert.ok(sentMarkup?.inline_keyboard, '應包含 inline_keyboard');
    const buttons = sentMarkup.inline_keyboard.flat();

    const activeBtn = buttons.find((b) => b.text.includes('gemini'));
    const inactiveBtn = buttons.find((b) => b.text === 'openai');

    assert.ok(activeBtn, '應有當前使用中之 gemini 按鈕');
    assert.equal(activeBtn.text, '✓ gemini');
    assert.deepEqual(activeBtn.disabled, {}, '當前 provider 應設定 disabled: {}');
    assert.equal(activeBtn.callback_data, undefined, '當前 provider 不得帶 callback_data');

    assert.ok(inactiveBtn, '應有未選中之 openai 按鈕');
    assert.equal(inactiveBtn.text, 'openai');
    assert.equal(inactiveBtn.callback_data, '/setimg:openai');
    assert.equal(inactiveBtn.disabled, undefined);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('/setimg callback query: correctly routes and handles provider update', async () => {
  let answered = false;
  let sentText = '';
  const context = {
    SHARE_CONTEXT: { currentBotToken: 'token' },
    CURRENT_CHAT_CONTEXT: { chat_id: 123 },
    USER_CONFIG: { AI_IMAGE_PROVIDER: 'auto' }
  };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    if (String(url).includes('/answerCallbackQuery')) {
      answered = true;
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }
    if (opts?.body) {
      const parsed = JSON.parse(opts.body);
      if (parsed.text) sentText = parsed.text;
    }
    return new Response(JSON.stringify({ ok: true, result: { message_id: 1 } }), { status: 200 });
  };

  try {
    const callbackMessage = {
      callback_query: {
        id: 'cb123',
        data: '/setimg:openai',
        message: {
          chat: { id: 123 },
          message_id: 99
        }
      }
    };
    await msgHandleCallbackQuery(callbackMessage, context);
    assert.ok(answered, '應自動應答 callback query');
    assert.match(sentText, /圖片生成服務已設定為/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('/stock: outputs native rich table for Taiwan equity quote and provides fallback text', async () => {
  let sentBody = null;
  const context = {
    SHARE_CONTEXT: { currentBotToken: 'token' },
    CURRENT_CHAT_CONTEXT: { chat_id: 123 }
  };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    if (String(url).includes('query1.finance.yahoo.com')) {
      return new Response(JSON.stringify({
        chart: {
          result: [{
            meta: {
              symbol: '2330.TW',
              currency: 'TWD',
              exchangeName: 'TAI',
              longName: '台積電',
              regularMarketPrice: 980.0,
              previousClose: 970.0,
              regularMarketDayHigh: 985.0,
              regularMarketDayLow: 968.0,
              regularMarketOpen: 972.0,
              regularMarketVolume: 35000000
            },
            indicators: {
              quote: [{
                open: [972.0]
              }]
            }
          }]
        }
      }), { status: 200 });
    }
    if (String(url).includes('api.telegram.org')) {
      sentBody = JSON.parse(opts.body);
      return new Response(JSON.stringify({ ok: true, result: { message_id: 1 } }), { status: 200 });
    }
    return originalFetch(url, opts);
  };

  try {
    await commandStockTW({}, '/stock', '2330', context);
    assert.ok(sentBody, '應發送 Telegram 訊息');
    assert.ok(sentBody.rich_message, '應包含 rich_message');
    const table = sentBody.rich_message.blocks[0];
    assert.equal(table.type, 'table');
    assert.equal(table.is_compact, true);
    assert.equal(table.is_striped, true);
    assert.match(table.caption, /2330\.TW/);

    // 驗證 OHLC 與成交量欄位 (2D 結構)
    const rows = table.cells.slice(1);
    const getVal = (name) => {
      const found = rows.find((r) => r[0].text === name);
      return found ? found[1].text : null;
    };
    assert.equal(getVal('現價'), '980.00 TWD');
    assert.equal(getVal('開盤價'), '972.00');
    assert.equal(getVal('今日最高'), '985.00');
    assert.equal(getVal('今日最低'), '968.00');
    assert.equal(getVal('昨收'), '970.00');
    assert.equal(getVal('成交量'), '35.0M');

    // 驗證 Fallback Text
    assert.match(sentBody.text, /2330\.TW/);
    assert.match(sentBody.text, /台積電/);
    assert.match(sentBody.text, /980\.00 TWD/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('/stock2: outputs native rich table for US equity quote and provides fallback text', async () => {
  let sentBody = null;
  const context = {
    SHARE_CONTEXT: { currentBotToken: 'token' },
    CURRENT_CHAT_CONTEXT: { chat_id: 123 }
  };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    if (String(url).includes('query1.finance.yahoo.com')) {
      return new Response(JSON.stringify({
        chart: {
          result: [{
            meta: {
              symbol: 'TSLA',
              currency: 'USD',
              exchangeName: 'NMS',
              longName: 'Tesla, Inc.',
              regularMarketPrice: 220.50,
              previousClose: 215.00,
              regularMarketDayHigh: 225.00,
              regularMarketDayLow: 214.50,
              regularMarketOpen: 216.00,
              regularMarketVolume: 65000000
            },
            indicators: {
              quote: [{
                open: [216.00]
              }]
            }
          }]
        }
      }), { status: 200 });
    }
    if (String(url).includes('api.telegram.org')) {
      sentBody = JSON.parse(opts.body);
      return new Response(JSON.stringify({ ok: true, result: { message_id: 1 } }), { status: 200 });
    }
    return originalFetch(url, opts);
  };

  try {
    await commandStock({}, '/stock2', 'TSLA', context);
    assert.ok(sentBody, '應發送 Telegram 訊息');
    assert.ok(sentBody.rich_message, '應包含 rich_message');
    const table = sentBody.rich_message.blocks[0];
    assert.equal(table.type, 'table');
    assert.equal(table.is_compact, true);
    assert.match(table.caption, /TSLA/);

    const rows = table.cells.slice(1);
    const getVal = (name) => {
      const found = rows.find((r) => r[0].text === name);
      return found ? found[1].text : null;
    };
    assert.equal(getVal('現價'), '220.50 USD');
    assert.equal(getVal('開盤價'), '216.00');
    assert.equal(getVal('今日最高'), '225.00');
    assert.equal(getVal('今日最低'), '214.50');
    assert.equal(getVal('昨收'), '215.00');
    assert.equal(getVal('成交量'), '65.0M');

    // 驗證 Fallback Text
    assert.match(sentBody.text, /TSLA/);
    assert.match(sentBody.text, /220\.50 USD/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('markdownTableToRichBlock: converts GFM markdown table to Telegram 10.3 InputRichBlockTable', () => {
  const tableMd = `| 城市 | 氣溫 | 狀況 |\n| :--- | :---: | ---: |\n| 台北 | 24°C | 多雲 |\n| 高雄 | 28°C | 晴天 |`;
  const block = markdownTableToRichBlock(tableMd, { caption: '全台主要城市天氣' });

  assert.ok(block);
  assert.equal(block.type, 'table');
  assert.equal(block.is_compact, true);
  assert.equal(block.is_striped, true);
  assert.equal(block.caption, '全台主要城市天氣');
  assert.equal(block.cells.length, 3);

  // Headers
  assert.deepEqual(block.cells[0], [
    { text: '城市', is_header: true, align: 'left' },
    { text: '氣溫', is_header: true, align: 'center' },
    { text: '狀況', is_header: true, align: 'right' }
  ]);

  // Data rows
  assert.deepEqual(block.cells[1], [
    { text: '台北', align: 'left' },
    { text: '24°C', align: 'center' },
    { text: '多雲', align: 'right' }
  ]);
  assert.deepEqual(block.cells[2], [
    { text: '高雄', align: 'left' },
    { text: '28°C', align: 'center' },
    { text: '晴天', align: 'right' }
  ]);
});

test('markdownTableToRichBlock: safely returns null for non-table markdown or invalid inputs', () => {
  assert.equal(markdownTableToRichBlock(null), null);
  assert.equal(markdownTableToRichBlock(''), null);
  assert.equal(markdownTableToRichBlock('這是一般純文字段落，沒有任何 Markdown 表格。'), null);
  assert.equal(markdownTableToRichBlock('```\ncode block\n```'), null);
});

test('extractRichBlocksFromMarkdown: parses multiple tables and segments mixed text properly', () => {
  const mixed = `這是開頭說明。\n\n| 表一欄A | 表一欄B |\n|---|---|\n| 1 | 2 |\n\n中段過渡說明。\n\n| 表二欄X | 表二欄Y |\n|---|---|\n| 8 | 9 |\n\n結尾總結。`;
  const extracted = extractRichBlocksFromMarkdown(mixed);

  assert.equal(extracted.blocks.length, 2);
  assert.equal(extracted.blocks[0].cells[1][0].text, '1');
  assert.equal(extracted.blocks[1].cells[1][0].text, '8');

  assert.ok(extracted.text.includes('這是開頭說明。'));
  assert.ok(extracted.text.includes('中段過渡說明。'));
  assert.ok(extracted.text.includes('結尾總結。'));
  assert.ok(!extracted.text.includes('| 表一欄A |'));
  assert.ok(!extracted.text.includes('| 表二欄X |'));

  assert.ok(extracted.fallbackText.includes('<pre><code>┌'));
  assert.match(extracted.fallbackText, /│\s*1\s*│\s*2\s*│/);
  assert.match(extracted.fallbackText, /│\s*8\s*│\s*9\s*│/);
});

test('commandWeather: generates Telegram 10.3 InputRichBlockTable and attaches inline keyboard', async () => {
  let sentBody = null;
  const context = {
    SHARE_CONTEXT: { currentBotToken: 'token123' },
    CURRENT_CHAT_CONTEXT: { chat_id: 12345 }
  };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    if (String(url).includes('wttr.in')) {
      return new Response(JSON.stringify({
        nearest_area: [{ areaName: [{ value: 'Taipei' }] }],
        current_condition: [{
          temp_C: '22',
          FeelsLikeC: '23',
          lang_zh: [{ value: '陰天' }],
          chanceofrain: '30',
          humidity: '75',
          windspeedKmph: '12',
          winddir16Point: 'ENE'
        }],
        weather: [
          {
            date: '2026-03-12',
            maxtempC: '25',
            mintempC: '19',
            hourly: [{}, {}, {}, {}, { lang_zh: [{ value: '多雲' }], chanceofrain: '20' }]
          },
          {
            date: '2026-03-13',
            maxtempC: '27',
            mintempC: '20',
            hourly: [{}, {}, {}, {}, { lang_zh: [{ value: '晴天' }], chanceofrain: '10' }]
          }
        ]
      }), { status: 200 });
    }
    if (String(url).includes('api.telegram.org')) {
      sentBody = JSON.parse(opts.body);
      return new Response(JSON.stringify({ ok: true, result: { message_id: 1 } }), { status: 200 });
    }
    return originalFetch(url, opts);
  };

  try {
    await commandWeather({}, '/wt', 'Taipei', context);

    assert.ok(sentBody);
    assert.ok(sentBody.rich_message, '應包含 rich_message 欄位');
    const table = sentBody.rich_message.blocks[0];
    assert.equal(table.type, 'table');
    assert.equal(table.is_compact, true);
    assert.equal(table.is_striped, true);
    assert.match(table.caption, /Taipei/);

    // 驗證欄位
    assert.deepEqual(table.cells[0], [
      { text: '日期', is_header: true },
      { text: '天氣', is_header: true },
      { text: '最高', is_header: true },
      { text: '最低', is_header: true },
      { text: '降雨%', is_header: true }
    ]);

    // 驗證按鈕
    const markup = typeof sentBody.reply_markup === 'string' ? JSON.parse(sentBody.reply_markup) : sentBody.reply_markup;
    assert.ok(markup.inline_keyboard);
    assert.equal(markup.inline_keyboard[0][0].text, '🔄 重新整理');
    assert.equal(markup.inline_keyboard[0][0].callback_data, '/wt:Taipei');
    assert.equal(markup.inline_keyboard[0][1].text, '🌦️ 選擇其他城市');
    assert.equal(markup.inline_keyboard[0][1].callback_data, '/wt');

    // 驗證 Fallback Text 包含氣象資訊
    assert.match(sentBody.text, /Taipei 的天氣預報/);
    assert.match(sentBody.text, /當前天氣/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('chatWithLLM: auto-detects markdown tables in final answer and sends via Telegram 10.3 Native Rich Table', async () => {
  let sentBody = null;
  const context = {
    SHARE_CONTEXT: {
      currentBotToken: 'token123',
      chatHistoryKey: 'history:12345',
      chatType: 'private',
      speakerId: 12345
    },
    CURRENT_CHAT_CONTEXT: {
      chat_id: 12345,
      api_base: 'https://api.openai.com/v1',
      model: 'test-model'
    },
    USER_CONFIG: {
      SYSTEM_INIT_MESSAGE: 'You are a helpful assistant',
      AI_PROVIDER: 'openai',
      OPENAI_API_KEY: ['test-key'],
      ENABLE_COMMAND_DISCOVERY: false,
      DEFAULT_LLM_PROFILE: 'test-profile',
      LLM_PROFILES: {
        'test-profile': {
          provider: 'openai',
          model: 'test-model',
          apiBase: 'https://api.openai.com/v1',
          apiKey: 'test-key'
        }
      }
    },
    env: {}
  };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    if (String(url).includes('api.openai.com')) {
      return new Response(JSON.stringify({
        choices: [{
          message: {
            role: 'assistant',
            content: '以下是本週天氣與氣溫總結：\n\n| 日期 | 天氣 | 氣溫 |\n|---|---|---|\n| 今天 | 晴天 | 25°C |\n| 明天 | 多雲 | 22°C |\n\n祝您有美好的一天！'
          }
        }]
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (String(url).includes('api.telegram.org')) {
      sentBody = JSON.parse(opts.body);
      return new Response(JSON.stringify({ ok: true, result: { message_id: 1 } }), { status: 200 });
    }
    return originalFetch(url, opts);
  };

  try {
    await chatWithLLM({ message: '本週天氣如何？' }, context);

    assert.ok(sentBody, '應呼叫 Telegram API');
    assert.ok(sentBody.rich_message, '應觸發 Rich Message 發送端點');
    const table = sentBody.rich_message.blocks[0];
    assert.equal(table.type, 'table');
    assert.deepEqual(table.cells[0], [
      { text: '日期', is_header: true, align: 'left' },
      { text: '天氣', is_header: true, align: 'left' },
      { text: '氣溫', is_header: true, align: 'left' }
    ]);
    assert.deepEqual(table.cells[1], [
      { text: '今天', align: 'left' },
      { text: '晴天', align: 'left' },
      { text: '25°C', align: 'left' }
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
