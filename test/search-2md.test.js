import test from 'node:test';
import assert from 'node:assert/strict';
import { commandDDGSearch, commandRead, fetch2MD, TWO_MD_ENDPOINTS } from '../src/features/search.js';
import { commandHandlers, isValidCommand } from '../src/telegram/commands.js';

test('/web and /read are registered in commandHandlers', () => {
  assert.equal(isValidCommand('/web'), true);
  assert.equal(isValidCommand('/read'), true);
  assert.equal(typeof commandHandlers['/web']?.fn, 'function');
  assert.equal(typeof commandHandlers['/read']?.fn, 'function');
});

test('commandDDGSearch prompts usage guide when input is empty', async () => {
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
    await commandDDGSearch({}, '/web', '', context);
    assert.match(sentMessage, /2MD Engine/);
    assert.match(sentMessage, /即時網路搜尋與網頁閱讀/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('fetch2MD falls back to backup endpoint when primary fails', async () => {
  const originalFetch = globalThis.fetch;
  const attempts = [];

  globalThis.fetch = async (url, opts) => {
    attempts.push(url);
    if (url.startsWith('https://2md.aiurl.tw')) {
      throw new Error('Primary network failure');
    }
    if (url.startsWith('https://2md.glsoft.ai')) {
      return new Response('[1] Title: Backup Result\n[1] URL Source: https://example.com\n[1] Description: Found on backup', { status: 200 });
    }
    return originalFetch(url, opts);
  };

  try {
    const res = await fetch2MD('/s/test');
    assert.equal(res.base, 'https://2md.glsoft.ai');
    assert.match(res.text, /Backup Result/);
    assert.equal(attempts.length, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('commandDDGSearch formats search results correctly', async () => {
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
    if (typeof url === 'string' && url.includes('/s/')) {
      return new Response(
        `[1] Title: AI News Today\n[1] URL Source: https://news.example.com\n[1] Description: Breaking AI technology updates.\n\n` +
        `[2] Title: Deep Learning Guide\n[2] URL Source: https://deeplearning.example.com\n[2] Description: Neural network architecture and tutorials.`,
        { status: 200 }
      );
    }
    return originalFetch(url, opts);
  };

  try {
    await commandDDGSearch({}, '/web', 'AI technology', context);
    assert.match(sentMessage, /即時網路搜尋/);
    assert.match(sentMessage, /\[1\] \*\[AI News Today\]\(https:\/\/news\.example\.com\)\*/);
    assert.match(sentMessage, /Breaking AI technology updates/);
    assert.match(sentMessage, /\[2\] \*\[Deep Learning Guide\]\(https:\/\/deeplearning\.example\.com\)\*/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('commandDDGSearch automatically routes URL input to reader', async () => {
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
    if (typeof url === 'string' && url.includes('https://example.com/article')) {
      return new Response(
        `Title: Great Article\nURL Source: https://example.com/article\nMarkdown Content:\n# Article Heading\nThis is parsed markdown content.`,
        { status: 200 }
      );
    }
    return originalFetch(url, opts);
  };

  try {
    await commandDDGSearch({}, '/web', 'https://example.com/article', context);
    assert.match(sentMessage, /網頁\/文件解析/);
    assert.match(sentMessage, /https:\/\/example\.com\/article/);
    assert.match(sentMessage, /# Article Heading/);
    assert.match(sentMessage, /This is parsed markdown content\./);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('commandRead handles direct URL and formats markdown', async () => {
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
    if (typeof url === 'string' && url.includes('https://arxiv.org/pdf/2301.00001.pdf')) {
      return new Response(
        `Title: Research Paper\nURL Source: https://arxiv.org/pdf/2301.00001.pdf\nMarkdown Content:\n# AnyDoc PDF Output\nExtracted research abstract.`,
        { status: 200 }
      );
    }
    return originalFetch(url, opts);
  };

  try {
    await commandRead({}, '/read', 'https://arxiv.org/pdf/2301.00001.pdf', context);
    assert.match(sentMessage, /【網頁\/文件解析】/);
    assert.match(sentMessage, /# AnyDoc PDF Output/);
    assert.match(sentMessage, /Extracted research abstract\./);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('autonomous tool calling executes /web search during LLM conversation', async () => {
  const { chatWithLLM } = await import('../src/agent/llm.js');
  const { ENV } = await import('../src/config/env.js');
  ENV.ENABLE_COMMAND_DISCOVERY = true;

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
      SYSTEM_INIT_MESSAGE: 'You are an assistant',
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
    // console.log('Mock fetch received:', url);
    if (typeof url === 'string' && url.includes('api.telegram.org')) {
      const body = JSON.parse(opts?.body || '{}');
      sentMessage = body.text;
      return new Response(JSON.stringify({ ok: true, result: { message_id: 12345 } }), { status: 200 });
    }
    if (typeof url === 'string' && url.includes('/s/')) {
      return new Response(
        `[1] Title: SpaceX - Private Aerospace Company\n[1] URL Source: https://spacex.com\n[1] Description: SpaceX remains a privately held company and has not filed for an IPO.`,
        { status: 200 }
      );
    }
    if (typeof url === 'string' && url.includes('chat/completions')) {
      llmCallCount++;
      const reqBody = JSON.parse(opts.body);
      if (llmCallCount === 1) {
        // First LLM call emits [CALL:/web SpaceX 上市狀態]
        return new Response(JSON.stringify({
          choices: [{
            message: {
              content: '[CALL:/web SpaceX 上市狀態]'
            }
          }]
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      } else {
        // Second LLM call receives tool result and produces grounded answer
        const systemMsg = reqBody.messages.find(m => m.role === 'system' && m.content.includes('工具執行結果'));
        assert.ok(systemMsg);
        assert.match(systemMsg.content, /SpaceX remains a privately held company/);

        return new Response(JSON.stringify({
          choices: [{
            message: {
              content: '根據最新的即時網路查證，SpaceX 目前仍然是一家非公開發行（未上市）的私有公司，並未在公開股票市場上市。'
            }
          }]
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }
    }
    console.log('Unmatched fetch url:', url);
    return originalFetch(url, opts);
  };

  try {
    await chatWithLLM({ message: 'SpaceX 是否上市？' }, context);
    assert.equal(llmCallCount, 2);
    assert.match(sentMessage, /SpaceX 目前仍然是一家非公開發行（未上市）的私有公司/);
    assert.doesNotMatch(sentMessage, /\[CALL:/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

