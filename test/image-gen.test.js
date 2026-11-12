import test from 'node:test';
import assert from 'node:assert/strict';

import { UserConfig, ENV } from '../src/config/env.js';
import {
  openAIImageKeyFromContext,
  getOpenAIImageApiBase,
  isOpenAIImageEnable,
  requestImageFromOpenAI
} from '../src/agent/openai.js';
import {
  commandGenerateImg,
  commandSetImageProvider,
  getImageGenChain,
  loadImageGen
} from '../src/features/image-gen.js';

test('Image Generation: Default configuration points to llm.aiurl.tw with codex/gpt-image-2', () => {
  const userConfig = new UserConfig();
  assert.equal(userConfig.AI_IMAGE_PROVIDER, 'openai');
  assert.equal(userConfig.DALL_E_MODEL, 'codex/gpt-image-2');
  assert.equal(userConfig.OPENAI_IMAGE_API_BASE, 'https://llm.aiurl.tw/v1');
  assert.equal(userConfig.GPT_IMAGE_MODEL, '');
});

test('Image Generation: getOpenAIImageApiBase returns custom base or defaults to llm.aiurl.tw/v1 and normalizes trailing slashes', () => {
  const context = {
    USER_CONFIG: {
      OPENAI_IMAGE_API_BASE: '',
      OPENAI_API_BASE: 'https://api.openai.com/v1'
    }
  };
  assert.equal(getOpenAIImageApiBase(context), 'https://llm.aiurl.tw/v1');

  context.USER_CONFIG.OPENAI_IMAGE_API_BASE = 'https://custom-image.example.com/v1/';
  assert.equal(getOpenAIImageApiBase(context), 'https://custom-image.example.com/v1');
});

test('Image Generation: Security - openAIImageKeyFromContext does NOT leak official OPENAI_API_KEY to aiurl.tw', () => {
  // Scenario: User only has official OPENAI_API_KEY for ChatGPT, no AIURL_API_KEY
  const context = {
    USER_CONFIG: {
      OPENAI_IMAGE_API_KEY: [],
      OPENAI_API_KEY: ['sk-official-openai-secret-key'],
      AIURL_API_KEY: null,
      OPENAI_IMAGE_API_BASE: 'https://llm.aiurl.tw/v1'
    }
  };
  // Must NOT leak official key to third-party aiurl.tw!
  assert.equal(openAIImageKeyFromContext(context), null);
  assert.equal(isOpenAIImageEnable(context), false);

  // When AIURL_API_KEY is provided, it is safely used
  context.USER_CONFIG.AIURL_API_KEY = 'sk-magpie-aiurl-key';
  assert.equal(openAIImageKeyFromContext(context), 'sk-magpie-aiurl-key');
  assert.equal(isOpenAIImageEnable(context), true);
});

test('Image Generation: openAIImageKeyFromContext handles array, string, and empty values safely', () => {
  const context = {
    USER_CONFIG: {
      OPENAI_IMAGE_API_KEY: ['  ', ''],
      AIURL_API_KEY: 'sk-magpie-fallback',
      OPENAI_IMAGE_API_BASE: 'https://llm.aiurl.tw/v1'
    }
  };
  // Empty strings in array should be ignored and fall back to AIURL_API_KEY
  assert.equal(openAIImageKeyFromContext(context), 'sk-magpie-fallback');

  // Single string configuration
  context.USER_CONFIG.OPENAI_IMAGE_API_KEY = 'sk-direct-key';
  assert.equal(openAIImageKeyFromContext(context), 'sk-direct-key');
});

test('Image Generation: getImageGenChain constructs prioritized 4-tier fallback chain', () => {
  const context = {
    AI_BINDING: { run: async () => new Uint8Array([1, 2, 3]) },
    USER_CONFIG: {
      AI_IMAGE_PROVIDER: 'openai',
      OPENAI_IMAGE_API_BASE: 'https://llm.aiurl.tw/v1',
      OPENAI_IMAGE_API_KEY: ['sk-aiurl-key'],
      OPENAI_API_KEY: ['sk-official-openai-key'],
      GEMINI_IMAGE_API_KEY: ['AIza-gemini-key']
    }
  };

  const chain = getImageGenChain(context);
  assert.equal(chain.length, 4);
  assert.equal(chain[0].name, 'openai');
  assert.equal(chain[1].name, 'openai-official');
  assert.equal(chain[2].name, 'gemini');
  assert.equal(chain[3].name, 'workers');
});

test('Image Generation: requestImageFromOpenAI sends codex/gpt-image-2 without being overridden by legacy GPT_IMAGE_MODEL', async () => {
  const originalFetch = globalThis.fetch;
  let interceptedUrl = null;
  let interceptedBody = null;
  let interceptedHeaders = null;

  globalThis.fetch = async (url, options) => {
    interceptedUrl = url;
    interceptedHeaders = options.headers;
    interceptedBody = JSON.parse(options.body);

    return {
      ok: true,
      status: 200,
      headers: { get: (h) => (h.toLowerCase() === 'content-type' ? 'application/json' : null) },
      text: async () => JSON.stringify({
        created: 123456789,
        data: [
          { b64_json: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' }
        ]
      })
    };
  };

  try {
    // Real UserConfig instance
    const userConfig = new UserConfig();
    userConfig.OPENAI_IMAGE_API_KEY = ['sk-test-image-key'];
    userConfig.OPENAI_IMAGE_API_BASE = 'https://llm.aiurl.tw/v1';

    const context = { USER_CONFIG: userConfig };

    const result = await requestImageFromOpenAI('a futuristic cyberpunk city', context);

    assert.equal(interceptedUrl, 'https://llm.aiurl.tw/v1/images/generations');
    assert.equal(interceptedHeaders['Authorization'], 'Bearer sk-test-image-key');
    assert.equal(interceptedBody.model, 'codex/gpt-image-2', 'Must send codex/gpt-image-2 and NOT gpt-image-1');
    assert.equal(interceptedBody.prompt, 'a futuristic cyberpunk city');
    assert.equal(interceptedBody.size, '1024x1024');
    assert.equal(interceptedBody.n, 1);
    assert.ok(result.startsWith('data:image/png;base64,iVBORw0KGgo'));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Image Generation: requestImageFromOpenAI handles URL responses gracefully', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    headers: { get: (h) => (h.toLowerCase() === 'content-type' ? 'application/json' : null) },
    text: async () => JSON.stringify({
      created: 123456789,
      data: [
        { url: 'https://oaidalleapiprodscus.blob.core.windows.net/sample.png' }
      ]
    })
  });

  try {
    const context = {
      USER_CONFIG: {
        OPENAI_IMAGE_API_BASE: 'https://llm.aiurl.tw/v1',
        OPENAI_IMAGE_API_KEY: ['sk-test-image-key'],
        DALL_E_MODEL: 'codex/gpt-image-2'
      }
    };

    const result = await requestImageFromOpenAI('a serene lake', context);
    assert.equal(result, 'https://oaidalleapiprodscus.blob.core.windows.net/sample.png');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Image Generation: requestImageFromOpenAI handles 502 HTML error without JSON syntax crash', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: false,
    status: 502,
    headers: { get: (h) => (h.toLowerCase() === 'content-type' ? 'text/html' : null) },
    text: async () => '<html><body>502 Bad Gateway</body></html>'
  });

  try {
    const context = {
      USER_CONFIG: {
        OPENAI_IMAGE_API_BASE: 'https://llm.aiurl.tw/v1',
        OPENAI_IMAGE_API_KEY: ['sk-test-image-key']
      }
    };

    await assert.rejects(
      async () => await requestImageFromOpenAI('test', context),
      /502/
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Image Generation: commandGenerateImg multi-tier fallback (aiurl -> openai-official -> gemini)', async () => {
  const originalFetch = globalThis.fetch;
  const attempts = [];

  globalThis.fetch = async (url, options) => {
    // 1. aiurl fails with 429
    if (url.includes('llm.aiurl.tw')) {
      attempts.push('aiurl');
      return {
        ok: false,
        status: 429,
        headers: { get: () => 'application/json' },
        text: async () => JSON.stringify({
          error: { message: 'aiurl rate limit exceeded' }
        })
      };
    }
    // 2. official openai fails with 500
    if (url.includes('api.openai.com')) {
      attempts.push('openai-official');
      return {
        ok: false,
        status: 500,
        headers: { get: () => 'application/json' },
        text: async () => JSON.stringify({
          error: { message: 'openai official server error' }
        })
      };
    }
    // 3. gemini succeeds
    if (url.includes('generativelanguage.googleapis.com')) {
      attempts.push('gemini');
      return {
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => ({
          predictions: [{ bytesBase64Encoded: 'geminiimg' }]
        }),
        body: {
          getReader() {
            let read = false;
            return {
              async read() {
                if (read) return { done: true, value: undefined };
                read = true;
                const chunk = JSON.stringify([{
                  candidates: [{
                    content: {
                      parts: [{ inlineData: { mimeType: 'image/png', data: 'geminiimg' } }]
                    }
                  }]
                }]);
                return { done: false, value: new TextEncoder().encode(chunk) };
              },
              releaseLock() {}
            };
          }
        }
      };
    }
    // Telegram sendPhoto
    if (url.includes('sendPhoto')) {
      return { ok: true, json: async () => ({ ok: true }) };
    }
    return { ok: true, json: async () => ({}) };
  };

  try {
    ENV.TELEGRAM_API_DOMAIN = 'https://api.telegram.org';
    const context = {
      SHARE_CONTEXT: {
        currentBotToken: '123:test',
        configStoreKey: 'cfg'
      },
      CURRENT_CHAT_CONTEXT: {
        chat_id: 12345
      },
      USER_CONFIG: {
        AI_IMAGE_PROVIDER: 'openai',
        OPENAI_IMAGE_API_BASE: 'https://llm.aiurl.tw/v1',
        OPENAI_IMAGE_API_KEY: ['sk-test-aiurl-key'],
        OPENAI_API_KEY: ['sk-official-openai-key'],
        DALL_E_MODEL: 'codex/gpt-image-2',
        GEMINI_IMAGE_API_KEY: ['AIza-test-gemini-key'],
        GEMINI_IMAGE_MODEL: 'gemini-3-pro-image-preview',
        GEMINI_IMAGE_API_BASE: 'https://generativelanguage.googleapis.com/v1beta'
      }
    };

    const message = { chat: { id: 12345 } };
    await commandGenerateImg(message, '/img', 'a cute red panda', context);

    assert.deepEqual(attempts, ['aiurl', 'openai-official', 'gemini']);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Image Generation: commandSetImageProvider handles user prompt confusion with friendly guidance and inline button', async () => {
  let sentBody = null;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    if (String(url).includes('api.telegram.org')) {
      sentBody = JSON.parse(opts.body);
      return new Response(JSON.stringify({ ok: true, result: { message_id: 1 } }), { status: 200 });
    }
    return originalFetch(url, opts);
  };

  try {
    const context = {
      SHARE_CONTEXT: { currentBotToken: 'token123' },
      CURRENT_CHAT_CONTEXT: { chat_id: 12345 },
      USER_CONFIG: {}
    };

    const message = { chat: { id: 12345 } };
    await commandSetImageProvider(message, '/setimg', '一卡車的抽取式衛生紙', context);

    assert.ok(sentBody);
    assert.match(sentBody.text, /❌ 無效的圖片生成服務: <b>一卡車的抽取式衛生紙<\/b>/);
    assert.match(sentBody.text, /💡 提示：若您是想要生成圖片，請使用指令：<code>\/img 一卡車的抽取式衛生紙<\/code>/);
    assert.match(sentBody.text, /⚙️ 若要設定圖片生成模型/);

    const markup = typeof sentBody.reply_markup === 'string' ? JSON.parse(sentBody.reply_markup) : sentBody.reply_markup;
    assert.ok(markup.inline_keyboard);
    const firstBtn = markup.inline_keyboard[0][0];
    assert.equal(firstBtn.text, '🎨 立即生成此圖片');
    assert.ok(firstBtn.callback_data.startsWith('/img_prompt:'));

    // 驗證按鈕 callback_data 長度絕對不超過 Telegram 64 bytes 限制
    const byteLength = new TextEncoder().encode(firstBtn.callback_data).length;
    assert.ok(byteLength <= 64, `callback_data byte length ${byteLength} must be <= 64 bytes`);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
