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
