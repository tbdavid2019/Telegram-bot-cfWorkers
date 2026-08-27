import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getWikiBaseUrl,
  generateWikiSlug,
  publishWikiNote,
  readWikiNote,
  renderMarkdown,
  parseToMarkdown,
  commandWiki,
  commandWikiRead,
  WIKI_DEFAULT_BASE
} from '../src/features/wiki.js';
import { commandHandlers, commandSortList } from '../src/telegram/commands.js';

test('getWikiBaseUrl returns default and custom base URLs', () => {
  assert.equal(getWikiBaseUrl(), 'https://wiki.david888.com');

  const customContext = {
    USER_CONFIG: {
      WIKI_API_BASE: 'https://custom-wiki.example.com/'
    }
  };
  assert.equal(getWikiBaseUrl(customContext), 'https://custom-wiki.example.com');
});

test('generateWikiSlug creates clean slugs', () => {
  const slug1 = generateWikiSlug();
  assert.match(slug1, /^doc-\d{8}-[a-z0-9]+$/);

  const slug2 = generateWikiSlug('My Product Roadmap 2026!');
  assert.ok(slug2.startsWith('my-product-roadmap-2026'));
});

test('Wiki commands are registered in commandHandlers as internal tools', () => {
  // /wiki is an internal LLM tool and shouldn't clutter the user command sort list
  assert.ok(!commandSortList.includes('/wiki'));
  assert.ok(!commandSortList.includes('/wikiread'));

  assert.ok(commandHandlers['/wiki']);
  assert.ok(commandHandlers['/wikiread']);
});

test('commandWiki supports JSON parameter format for LLM tool calling', async () => {
  const originalFetch = globalThis.fetch;
  let postedSlug = '';
  let postedBody = null;

  globalThis.fetch = async (url, options) => {
    postedSlug = url.replace('https://wiki.david888.com/api/', '');
    postedBody = JSON.parse(options.body);
    return new Response(JSON.stringify({
      err: 0,
      msg: 'ok',
      data: {
        msg: 'Saved successfully',
        url: `https://wiki.david888.com/${postedSlug}`,
        shareUrl: `https://wiki.david888.com/share/json-test-123`
      }
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  let capturedText = '';
  const context = {
    USER_CONFIG: {},
    CURRENT_CHAT_CONTEXT: {},
    SHARE_CONTEXT: { currentBotToken: 'TEST_TOKEN' },
    captureToolOutput: (msg) => {
      capturedText = msg;
    }
  };

  try {
    const jsonParam = JSON.stringify({
      slug: 'white-house-war-report',
      title: '白宮主導的戰爭深度整理報告',
      content: '# 白宮主導的戰爭深度整理\n\n[TOC]\n\n## 1. 歷史背景與戰略目標\n詳細 2000 字分析...',
      theme: 'retro'
    });

    await commandWiki({}, '/wiki', jsonParam, context);
    assert.equal(postedSlug, 'white-house-war-report');
    assert.equal(postedBody.text, '# 白宮主導的戰爭深度整理\n\n[TOC]\n\n## 1. 歷史背景與戰略目標\n詳細 2000 字分析...');
    assert.equal(postedBody.theme, 'retro');
    assert.ok(capturedText.includes('David888 Wiki 長文發布成功'));
    assert.ok(capturedText.includes('https://wiki.david888.com/share/json-test-123'));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('publishWikiNote sends POST to /api/<slug> and returns public shareUrl', async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl = '';
  let requestBody = null;

  globalThis.fetch = async (url, options) => {
    requestedUrl = url;
    requestBody = JSON.parse(options.body);
    return new Response(JSON.stringify({
      err: 0,
      msg: 'ok',
      data: {
        msg: 'Saved successfully',
        url: 'https://wiki.david888.com/roadmap-2026',
        shareUrl: 'https://wiki.david888.com/share/abc123xyz'
      }
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  try {
    const res = await publishWikiNote('roadmap-2026', '# 2026 Roadmap\n- Feature A\n- Feature B', {
      theme: 'retro',
      width: '1200px'
    });

    assert.equal(requestedUrl, 'https://wiki.david888.com/api/roadmap-2026');
    assert.equal(requestBody.text, '# 2026 Roadmap\n- Feature A\n- Feature B');
    assert.equal(requestBody.theme, 'retro');
    assert.equal(requestBody.width, '1200px');
    assert.equal(res.success, true);
    assert.equal(res.shareUrl, 'https://wiki.david888.com/share/abc123xyz');
    assert.equal(res.presentUrl, 'https://wiki.david888.com/share/abc123xyz/present');
    assert.equal(res.bookUrl, 'https://wiki.david888.com/share/abc123xyz/book');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('readWikiNote reads markdown from API or share link', async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (url, options) => {
    assert.equal(options.headers['Accept'], 'text/markdown');
    return new Response('# My Read Note\nContent here.', { status: 200 });
  };

  try {
    const res = await readWikiNote('my-note');
    assert.equal(res.markdown, '# My Read Note\nContent here.');
    assert.equal(res.pathOrShare, 'my-note');

    const shareRes = await readWikiNote('https://wiki.david888.com/share/k433xg');
    assert.equal(shareRes.markdown, '# My Read Note\nContent here.');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('commandWiki displays help when no text or reply is given', async () => {
  let capturedText = '';
  const context = {
    USER_CONFIG: {},
    CURRENT_CHAT_CONTEXT: {},
    SHARE_CONTEXT: { currentBotToken: 'TEST_TOKEN' },
    captureToolOutput: (msg) => {
      capturedText = msg;
    }
  };

  await commandWiki({}, '/wiki', '', context);
  assert.ok(capturedText.includes('David888 Wiki 發布與長文整理指南'));
  assert.ok(capturedText.includes('wiki.david888.com'));
});

test('commandWiki publishes article and formats response with shareUrl', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    return new Response(JSON.stringify({
      err: 0,
      msg: 'ok',
      data: {
        msg: 'Saved successfully',
        url: 'https://wiki.david888.com/ai-product-spec',
        shareUrl: 'https://wiki.david888.com/share/spec789'
      }
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  let capturedText = '';
  const context = {
    USER_CONFIG: {},
    CURRENT_CHAT_CONTEXT: {},
    SHARE_CONTEXT: { currentBotToken: 'TEST_TOKEN' },
    captureToolOutput: (msg) => {
      capturedText = msg;
    }
  };

  try {
    await commandWiki({}, '/wiki', 'ai-product-spec # AI 產品規格書\n\n[TOC]\n\n## 核心架構\n說明內容...', context);
    assert.ok(capturedText.includes('David888 Wiki 長文發布成功'));
    assert.ok(capturedText.includes('https://wiki.david888.com/share/spec789'));
    assert.ok(capturedText.includes('https://wiki.david888.com/share/spec789/present'));
    assert.ok(capturedText.includes('https://wiki.david888.com/share/spec789/book'));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('commandWiki handles reply_to_message content seamlessly', async () => {
  const originalFetch = globalThis.fetch;
  let postedText = '';

  globalThis.fetch = async (url, options) => {
    const body = JSON.parse(options.body);
    postedText = body.text;
    return new Response(JSON.stringify({
      err: 0,
      msg: 'ok',
      data: {
        msg: 'Saved successfully',
        url: 'https://wiki.david888.com/reply-note',
        shareUrl: 'https://wiki.david888.com/share/reply999'
      }
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  let capturedText = '';
  const context = {
    USER_CONFIG: {},
    CURRENT_CHAT_CONTEXT: {},
    SHARE_CONTEXT: { currentBotToken: 'TEST_TOKEN' },
    captureToolOutput: (msg) => {
      capturedText = msg;
    }
  };

  try {
    const message = {
      text: '/wiki summary-2026',
      reply_to_message: {
        text: '# 長文整理報告\n\n這是先前回應的萬字深度分析內容...'
      }
    };
    await commandWiki(message, '/wiki', 'summary-2026', context);
    assert.equal(postedText, '# 長文整理報告\n\n這是先前回應的萬字深度分析內容...');
    assert.ok(capturedText.includes('https://wiki.david888.com/share/reply999'));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('commandWikiRead reads and outputs markdown content', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    return new Response('# Read Title\n\nThis is the markdown from wiki.', { status: 200 });
  };

  let capturedText = '';
  const context = {
    USER_CONFIG: {},
    CURRENT_CHAT_CONTEXT: {},
    SHARE_CONTEXT: { currentBotToken: 'TEST_TOKEN' },
    captureToolOutput: (msg) => {
      capturedText = msg;
    }
  };

  try {
    await commandWikiRead({}, '/wikiread', 'my-doc', context);
    assert.ok(capturedText.includes('David888 Wiki 內容'));
    assert.ok(capturedText.includes('# Read Title'));
    assert.ok(capturedText.includes('This is the markdown from wiki.'));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('command-invoker correctly parses [CALL:/wiki {...}] containing [TOC] and nested brackets', async () => {
  const { parseCommandsFromLLMResponse, removeCommandMarkers } = await import('../src/agent/command-invoker.js');
  
  const sampleLLMResponse = `[CALL:/wiki {"slug":"business-english-dialogue","title":"商務英語口說練習","content":"[TOC]\\n\\n# 商務英語\\n- [第一章](/share/ch1)\\n==重點高亮=="}]`;
  
  const commands = parseCommandsFromLLMResponse(sampleLLMResponse);
  assert.equal(commands.length, 1);
  assert.equal(commands[0].command, '/wiki');
  
  const parsedArgs = JSON.parse(commands[0].args);
  assert.equal(parsedArgs.slug, 'business-english-dialogue');
  assert.ok(parsedArgs.content.includes('[TOC]'));
  assert.ok(parsedArgs.content.includes('[第一章]'));

  const cleaned = removeCommandMarkers(sampleLLMResponse);
  assert.equal(cleaned, '');
});

test('sanitizeWikiMarkdown ensures # Title precedes [TOC] automatically', async () => {
  const { sanitizeWikiMarkdown } = await import('../src/features/wiki.js');
  
  // Case 1: [TOC] before # Title -> moves # Title to top
  const case1 = `[TOC]\n\n# 商務英語口說練習\n\n## 第一章\n內容...`;
  const res1 = sanitizeWikiMarkdown(case1);
  assert.ok(res1.startsWith('# 商務英語口說練習\n\n[TOC]\n\n## 第一章'));

  // Case 2: [TOC] at top without # Title in content, but fallback title provided
  const case2 = `[TOC]\n\n## 第一章\n內容...`;
  const res2 = sanitizeWikiMarkdown(case2, '商務英語對話手冊');
  assert.ok(res2.startsWith('# 商務英語對話手冊\n\n[TOC]\n\n## 第一章'));

  // Case 3: Already starting with # Title
  const case3 = `# 正確標題\n\n[TOC]\n\n## 內容`;
  const res3 = sanitizeWikiMarkdown(case3);
  assert.equal(res3, `# 正確標題\n\n[TOC]\n\n## 內容`);
});


