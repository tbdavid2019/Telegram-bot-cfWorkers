import test from 'node:test';
import assert from 'node:assert/strict';

test('extractSuggestions extracts [SUGGEST:...] and [ASK:...] tags properly', async () => {
  const { extractSuggestions } = await import('../src/agent/command-invoker.js');

  const text = `台積電 3nm 製程目前良率已突破 80%，主要由 Apple、NVIDIA 與 AMD 瓜分主要產能。

[SUGGEST: 📱 Apple 近期 3nm A 系列晶片在高階 iPhone 的出貨比例？]
[SUGGEST: 🤖 NVIDIA 3nm GPU 主要應用於哪些 AI 加速器或資料中心產品？]
[ASK: 📈 若台積電 3nm 良率提升 5%，對毛利率的具體影響是多少？]
[SUGGEST: 🌍 在地緣政治風險下，台積電如何調整其 3nm 海外產能布局？]
[SUGGEST: 這是第 5 個續問，應該被截斷限制為最多 4 個]`;

  const suggestions = extractSuggestions(text);
  assert.equal(suggestions.length, 4);
  assert.equal(suggestions[0], '📱 Apple 近期 3nm A 系列晶片在高階 iPhone 的出貨比例？');
  assert.equal(suggestions[1], '🤖 NVIDIA 3nm GPU 主要應用於哪些 AI 加速器或資料中心產品？');
  assert.equal(suggestions[2], '📈 若台積電 3nm 良率提升 5%，對毛利率的具體影響是多少？');
  assert.equal(suggestions[3], '🌍 在地緣政治風險下，台積電如何調整其 3nm 海外產能布局？');
});

test('truncateButtonText truncates text exceeding maxLength and appends ...', async () => {
  const { truncateButtonText } = await import('../src/agent/command-invoker.js');

  const shortText = '📱 Apple 3nm 出貨比';
  assert.equal(truncateButtonText(shortText, 32), shortText);

  const longText = '🌍 在地緣政治與美國晶片法案風險下，台積電如何具體調整其 3nm 海外產能布局？';
  const truncated = truncateButtonText(longText, 32);
  assert.ok(truncated.length <= 32);
  assert.ok(truncated.endsWith('...'));
  assert.ok(truncated.startsWith('🌍 在地緣政治'));
});

test('removeCommandMarkers removes both [CALL:...] and [SUGGEST:...] markers', async () => {
  const { removeCommandMarkers } = await import('../src/agent/command-invoker.js');

  const rawText = `[CALL:/stock 2330.TW]
這是一段股市分析回覆。

[SUGGEST: 📱 蘋果 3nm 晶片分析]
[SUGGEST: 🤖 輝達 3nm 晶片分析]`;

  const cleaned = removeCommandMarkers(rawText);
  assert.equal(cleaned, '這是一段股市分析回覆。');
  assert.ok(!cleaned.includes('[CALL:'));
  assert.ok(!cleaned.includes('[SUGGEST:'));
});

test('generateInlineKeyboard generates stateless ask: buttons with truncated labels', async () => {
  const { generateInlineKeyboard } = await import('../src/agent/command-invoker.js');

  const suggestions = [
    '📱 短問題',
    '🌍 這是一個非常非常非常非常非常非常非常非常非常非常非常非常長的續問問題？'
  ];

  const markup = generateInlineKeyboard([], suggestions);
  assert.ok(markup);
  assert.equal(markup.inline_keyboard.length, 2);

  // Button 0
  assert.equal(markup.inline_keyboard[0][0].text, '📱 短問題');
  assert.equal(markup.inline_keyboard[0][0].callback_data, 'ask:0');

  // Button 1 (Truncated)
  assert.ok(markup.inline_keyboard[1][0].text.endsWith('...'));
  assert.ok(markup.inline_keyboard[1][0].text.length <= 32);
  assert.equal(markup.inline_keyboard[1][0].callback_data, 'ask:1');
});

test('handleFollowUpCallback extracts question from reply_markup and invokes LLM without KV', async () => {
  const { handleFollowUpCallback } = await import('../src/agent/command-invoker.js');

  let answerCallbackCalled = false;
  let answerCallbackText = '';
  let llmPromptReceived = '';

  const fakeCallbackQuery = {
    id: 'cb_12345',
    data: 'ask:1',
    from: { id: 999, first_name: 'David' },
    message: {
      message_id: 888,
      chat: { id: 12345 },
      reply_markup: {
        inline_keyboard: [
          [{ text: '📱 Apple 3nm iPhone 比例？', callback_data: 'ask:0' }],
          [{ text: '🤖 NVIDIA 3nm GPU 應用？', callback_data: 'ask:1' }],
          [{ text: '📈 良率提升 5% 影響？', callback_data: 'ask:2' }]
        ]
      }
    }
  };

  const context = {
    SHARE_CONTEXT: {
      currentBotToken: 'fake_token',
      chatHistoryKey: 'history:12345',
      chatType: 'private',
      speakerId: 999
    },
    CURRENT_CHAT_CONTEXT: {
      chat_id: 12345,
      message_id: 888,
      reply_markup: {},
      api_base: 'https://api.openai.com/v1',
      model: 'test-model'
    },
    USER_CONFIG: {
      AI_PROVIDER: 'openai',
      OPENAI_API_KEY: ['test-key'],
      ENABLE_COMMAND_DISCOVERY: true,
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
    const urlStr = String(url);
    if (urlStr.includes('/answerCallbackQuery')) {
      answerCallbackCalled = true;
      const body = JSON.parse(opts?.body || '{}');
      answerCallbackText = body.text;
      return new Response(JSON.stringify({ ok: true, result: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    }
    if (urlStr.includes('/sendMessage') || urlStr.includes('/editMessageText')) {
      return new Response(JSON.stringify({ ok: true, result: { message_id: 889 } }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    }
    if (urlStr.includes('chat/completions') || urlStr.includes('api.openai.com')) {
      const body = JSON.parse(opts?.body || '{}');
      llmPromptReceived = body.messages[body.messages.length - 1].content;
      return new Response(JSON.stringify({
        choices: [{ message: { role: 'assistant', content: '這是針對 NVIDIA 3nm GPU 的深入回答。' } }]
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  };

  try {
    await handleFollowUpCallback(fakeCallbackQuery, context);

    assert.equal(answerCallbackCalled, true);
    assert.ok(answerCallbackText.includes('NVIDIA 3nm GPU'));
    assert.equal(context.CURRENT_CHAT_CONTEXT.message_id, 889);
    assert.equal(llmPromptReceived, '🤖 NVIDIA 3nm GPU 應用？');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
