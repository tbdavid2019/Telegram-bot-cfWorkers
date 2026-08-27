import test from 'node:test';
import assert from 'node:assert/strict';

test('autonomous tool calling executes /wt weather during LLM chat', async () => {
  const { chatWithLLM } = await import('../src/agent/llm.js');

  let llmCallCount = 0;
  let sentMessage = '';

  const context = {
    SHARE_CONTEXT: {
      currentBotToken: 'fake_token',
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
    if (typeof url === 'string' && url.includes('api.telegram.org')) {
      const body = JSON.parse(opts?.body || '{}');
      sentMessage = body.text;
      return new Response(JSON.stringify({ ok: true, result: { message_id: 12345 } }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    }
    if (typeof url === 'string' && url.includes('wttr.in')) {
      return new Response(JSON.stringify({
        nearest_area: [{ areaName: [{ value: 'Taipei' }] }],
        current_condition: [{
          temp_C: '26',
          FeelsLikeC: '27',
          lang_zh: [{ value: '多雲時晴' }],
          chanceofrain: '15',
          humidity: '65',
          windspeedKmph: '12',
          winddir16Point: 'ENE'
        }],
        weather: [{
          date: '2026-08-27',
          hourly: [{}, {}, {}, {}, { lang_zh: [{ value: '晴時多雲' }], chanceofrain: '15' }],
          maxtempC: '31',
          mintempC: '25'
        }]
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (typeof url === 'string' && url.includes('chat/completions')) {
      llmCallCount++;
      const reqBody = JSON.parse(opts.body);
      if (llmCallCount === 1) {
        return new Response(JSON.stringify({
          choices: [{
            message: {
              content: '[CALL:/wt 台北]'
            }
          }]
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      } else {
        const systemMsg = reqBody.messages.find(m => m.role === 'system' && m.content.includes('工具執行結果'));
        assert.ok(systemMsg);
        assert.match(systemMsg.content, /Taipei 的天氣預報/);
        assert.match(systemMsg.content, /26°C/);

        return new Response(JSON.stringify({
          choices: [{
            message: {
              content: '台北目前氣溫約 26°C，體感溫度 27°C，天氣為多雲時晴，降雨機率 15%，外出舒適。'
            }
          }]
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }
    }
    return originalFetch(url, opts);
  };

  try {
    await chatWithLLM({ message: '台北今天天氣怎麼樣？' }, context);
    assert.equal(llmCallCount, 2);
    assert.match(sentMessage, /台北目前氣溫約 26°C/);
    assert.doesNotMatch(sentMessage, /\[CALL:/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('autonomous tool calling executes /stock quote during LLM chat', async () => {
  const { chatWithLLM } = await import('../src/agent/llm.js');

  let llmCallCount = 0;
  let sentMessage = '';

  const context = {
    SHARE_CONTEXT: {
      currentBotToken: 'fake_token',
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
      SYSTEM_INIT_MESSAGE: 'You are a financial assistant',
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
    if (typeof url === 'string' && url.includes('api.telegram.org')) {
      const body = JSON.parse(opts?.body || '{}');
      sentMessage = body.text;
      return new Response(JSON.stringify({ ok: true, result: { message_id: 12345 } }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    }
    if (typeof url === 'string' && url.includes('query1.finance.yahoo.com')) {
      return new Response(JSON.stringify({
        chart: {
          result: [{
            meta: {
              symbol: 'NVDA',
              regularMarketPrice: 130.5,
              previousClose: 125.0,
              regularMarketDayHigh: 132.0,
              regularMarketDayLow: 124.5,
              regularMarketVolume: 52000000,
              currency: 'USD'
            },
            indicators: {
              quote: [{
                close: [130.5],
                high: [132.0],
                low: [124.5],
                open: [126.0],
                volume: [52000000]
              }]
            }
          }]
        }
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (typeof url === 'string' && url.includes('chat/completions')) {
      llmCallCount++;
      const reqBody = JSON.parse(opts.body);
      if (llmCallCount === 1) {
        return new Response(JSON.stringify({
          choices: [{
            message: {
              content: '[CALL:/stock NVDA]'
            }
          }]
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      } else {
        const systemMsg = reqBody.messages.find(m => m.role === 'system' && m.content.includes('工具執行結果'));
        assert.ok(systemMsg);
        assert.match(systemMsg.content, /NVDA/);
        assert.match(systemMsg.content, /130\.50/);

        return new Response(JSON.stringify({
          choices: [{
            message: {
              content: '輝達 (NVDA) 最新股價為 130.50 美元，今日上漲 +5.50 美元 (+4.40%)。'
            }
          }]
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }
    }
    return originalFetch(url, opts);
  };

  try {
    await chatWithLLM({ message: '輝達今天股價多少？' }, context);
    assert.equal(llmCallCount, 2);
    assert.match(sentMessage, /輝達 \(NVDA\) 最新股價為 130\.50 美元/);
    assert.doesNotMatch(sentMessage, /\[CALL:/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('autonomous tool calling executes /tarot divination during LLM chat', async () => {
  const { chatWithLLM } = await import('../src/agent/llm.js');

  let llmCallCount = 0;
  let sentMessage = '';

  const context = {
    SHARE_CONTEXT: {
      currentBotToken: 'fake_token',
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
      SYSTEM_INIT_MESSAGE: 'You are a spiritual guide',
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
    if (typeof url === 'string' && url.includes('api.telegram.org')) {
      const body = JSON.parse(opts?.body || '{}');
      sentMessage = body.text;
      return new Response(JSON.stringify({ ok: true, result: { message_id: 12345 } }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    }
    if (typeof url === 'string' && url.includes('tarot-question')) {
      return new Response(JSON.stringify({
        success: true,
        answer: '【過去】魔術師（正位）：代表具備良好基礎。\n【現在】命運之輪（正位）：代表迎來轉機。\n【未來】太陽（正位）：代表光明與成功。'
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (typeof url === 'string' && url.includes('chat/completions')) {
      llmCallCount++;
      const reqBody = JSON.parse(opts.body);
      if (llmCallCount === 1) {
        return new Response(JSON.stringify({
          choices: [{
            message: {
              content: '[CALL:/tarot 下週工作面試]'
            }
          }]
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      } else {
        const systemMsg = reqBody.messages.find(m => m.role === 'system' && m.content.includes('工具執行結果'));
        assert.ok(systemMsg);
        assert.match(systemMsg.content, /命運之輪/);

        return new Response(JSON.stringify({
          choices: [{
            message: {
              content: '為您抽出的牌陣顯示：過去的「魔術師」證明您已準備充分，現在的「命運之輪」意味著轉機到來，未來的「太陽」牌預示面試將非常順利成功！'
            }
          }]
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }
    }
    return originalFetch(url, opts);
  };

  try {
    await chatWithLLM({ message: '幫我抽張塔羅牌看下週面試' }, context);
    assert.equal(llmCallCount, 2);
    assert.match(sentMessage, /命運之輪/);
    assert.match(sentMessage, /太陽/);
    assert.doesNotMatch(sentMessage, /\[CALL:/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
