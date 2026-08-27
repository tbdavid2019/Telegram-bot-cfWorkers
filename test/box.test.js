import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getBoxEndpoints,
  getBoxToken,
  callBoxMcp,
  callBoxApi,
  boxUploadUrl,
  boxUploadBuffer,
  boxListAssets,
  boxSearchAssets,
  boxGetStats,
  boxGetPodcastInfo,
  boxDeleteAsset,
  extractTelegramMedia,
  saveAssetToBox,
  commandBox,
  commandBoxList,
  commandBoxSearch,
  commandBoxStats,
  commandBoxPodcast,
  BOX_DEFAULT_PRIMARY,
  BOX_DEFAULT_FALLBACKS
} from '../src/features/box.js';
import { commandHandlers, commandSortList } from '../src/telegram/commands.js';
import { ENV } from '../src/config/env.js';

test('getBoxEndpoints returns primary and fallback nodes correctly', () => {
  const defaultEndpoints = getBoxEndpoints();
  assert.equal(defaultEndpoints[0], 'https://box.david888.com');
  assert.deepEqual(defaultEndpoints, [
    'https://box.david888.com',
    'https://box.glsoft.ai',
    'https://box.aiurl.tw'
  ]);

  const customContext = {
    USER_CONFIG: {
      BOX_API_BASE: 'https://custom-box.example.com',
      BOX_FALLBACK_BASES: ['https://backup1.example.com', 'https://backup2.example.com']
    }
  };

  const customEndpoints = getBoxEndpoints(customContext);
  assert.deepEqual(customEndpoints, [
    'https://custom-box.example.com',
    'https://backup1.example.com',
    'https://backup2.example.com'
  ]);
});

test('Box commands are registered in commandSortList and commandHandlers', () => {
  assert.ok(commandSortList.includes('/box'));
  assert.ok(commandSortList.includes('/boxlist'));
  assert.ok(commandSortList.includes('/boxsearch'));
  assert.ok(commandSortList.includes('/boxstats'));

  assert.ok(commandHandlers['/box']);
  assert.ok(commandHandlers['/boxlist']);
  assert.ok(commandHandlers['/boxsearch']);
  assert.ok(commandHandlers['/boxstats']);
});

test('callBoxMcp falls back to backup endpoint when primary fails', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];

  globalThis.fetch = async (url, options) => {
    calls.push(url);
    if (url.includes('box.david888.com')) {
      throw new Error('Primary network failure');
    }
    if (url.includes('box.glsoft.ai')) {
      return new Response(JSON.stringify({
        jsonrpc: '2.0',
        result: {
          content: [{ type: 'text', text: '888box Statistics:\n{"total": 12, "image": 4, "video": 2, "audio": 1, "file": 5}' }]
        },
        id: 1
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    throw new Error('Unexpected URL');
  };

  try {
    const res = await callBoxMcp('get_stats', {});
    assert.equal(res.endpoint, 'https://box.glsoft.ai');
    assert.equal(res.data.total, 12);
    assert.equal(calls.length, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('boxUploadUrl uploads via MCP and returns structured result', async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (url, options) => {
    return new Response(JSON.stringify({
      jsonrpc: '2.0',
      result: {
        content: [{
          type: 'text',
          text: 'Asset uploaded successfully!\n{\n    "success": true,\n    "type": "video",\n    "id": 88,\n    "title": "My Sample Video",\n    "url": "https://cdn.example.com/storage/v/2026/08/27/video.mp4",\n    "share_url": "https://box.david888.com/v/abcd1234efgh"\n}'
        }]
      },
      id: 1
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  try {
    const res = await boxUploadUrl('https://example.com/video.mp4', { title: 'My Sample Video' });
    assert.equal(res.success, true);
    assert.equal(res.type, 'video');
    assert.equal(`${res.id}`, '88');
    assert.equal(res.share_url, 'https://box.david888.com/v/abcd1234efgh');
    assert.equal(res.url, 'https://cdn.example.com/storage/v/2026/08/27/video.mp4');
    assert.equal(res.endpoint, 'https://box.david888.com');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('boxUploadBuffer uploads base64 and multipart file data', async () => {
  const originalFetch = globalThis.fetch;
  let receivedFormData = false;

  globalThis.fetch = async (url, options) => {
    if (options.body instanceof FormData) {
      receivedFormData = true;
    }
    return new Response(JSON.stringify({
      result: 'success',
      code: 200,
      status: true,
      data: {
        id: '99',
        url: 'https://cdn.example.com/storage/i/2026/08/27/sample.webp',
        share_url: 'https://box.david888.com/v/sample99',
        name: 'sample.webp'
      }
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  try {
    const base64Png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const res = await boxUploadBuffer(base64Png, 'sample.png', { title: 'Test Sample' });
    assert.equal(receivedFormData, true);
    assert.equal(res.success, true);
    assert.equal(res.id, '99');
    assert.equal(res.share_url, 'https://box.david888.com/v/sample99');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('boxListAssets and boxSearchAssets return formatted asset items', async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (url, options) => {
    return new Response(JSON.stringify({
      jsonrpc: '2.0',
      result: {
        content: [{
          type: 'text',
          text: 'Search results for \'sample\' (all):\n[\n    {\n        "id": 101,\n        "title": "Sample File",\n        "url": "https://cdn.example.com/sample.pdf",\n        "share_url": "https://box.david888.com/v/sample101",\n        "is_video": 0,\n        "is_audio": 0,\n        "is_file": 1,\n        "size": 10240,\n        "created_at": "2026-08-27 12:00:00"\n    }\n]'
        }]
      },
      id: 1
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  try {
    const searchRes = await boxSearchAssets('sample');
    assert.equal(searchRes.items.length, 1);
    assert.equal(searchRes.items[0].id, 101);
    assert.equal(searchRes.items[0].title, 'Sample File');
    assert.equal(searchRes.items[0].is_file, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('extractTelegramMedia extracts photo, video, document, audio from message or reply', async () => {
  const context = {
    SHARE_CONTEXT: {
      currentBotToken: 'TEST_TOKEN'
    }
  };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    return new Response(JSON.stringify({
      ok: true,
      result: {
        file_path: 'videos/file_123.mp4'
      }
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  try {
    const replyMessage = {
      video: {
        file_id: 'vid_123456',
        file_name: 'test_vid.mp4',
        mime_type: 'video/mp4'
      }
    };
    const currentMessage = {
      text: '/box 精彩影片',
      reply_to_message: replyMessage
    };

    const media = await extractTelegramMedia(currentMessage, context, true);
    assert.ok(media);
    assert.equal(media.type, 'video');
    assert.equal(media.fileName, 'test_vid.mp4');
    assert.equal(media.url, 'https://api.telegram.org/file/botTEST_TOKEN/videos/file_123.mp4');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('commandBox displays help when invoked without arguments', async () => {
  let capturedText = '';
  const context = {
    USER_CONFIG: {},
    CURRENT_CHAT_CONTEXT: {},
    SHARE_CONTEXT: { currentBotToken: 'TEST_TOKEN' },
    captureToolOutput: (msg) => {
      capturedText = msg;
    }
  };

  await commandBox({}, '/box', '', context);
  assert.ok(capturedText.includes('888box 雲端資產管理指南'));
  assert.ok(capturedText.includes('box.david888.com'));
  assert.ok(capturedText.includes('box.glsoft.ai'));
  assert.ok(capturedText.includes('box.aiurl.tw'));
});

test('commandBoxStats retrieves and formats storage statistics', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    return new Response(JSON.stringify({
      jsonrpc: '2.0',
      result: {
        content: [{
          type: 'text',
          text: '888box Statistics:\n{\n    "total": 48,\n    "image": 13,\n    "video": 9,\n    "audio": 18,\n    "file": 8,\n    "storage_backend": "s3"\n}'
        }]
      },
      id: 1
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
    await commandBoxStats({}, '/boxstats', '', context);
    assert.ok(capturedText.includes('888box 雲端儲存統計'));
    assert.ok(capturedText.includes('總資產數'));
    assert.ok(capturedText.includes('48'));
    assert.ok(capturedText.includes('圖片 (Image)'));
    assert.ok(capturedText.includes('13'));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('commandBox ingests URL and replies with share and direct URLs', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    return new Response(JSON.stringify({
      jsonrpc: '2.0',
      result: {
        content: [{
          type: 'text',
          text: 'Asset uploaded successfully!\n{\n    "success": true,\n    "type": "image",\n    "id": 77,\n    "title": "Cute Cat",\n    "url": "https://cdn.example.com/cat.webp",\n    "share_url": "https://box.david888.com/v/cutecat77"\n}'
        }]
      },
      id: 1
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
    await commandBox({}, '/box', 'https://example.com/cat.jpg Cute Cat', context);
    assert.ok(capturedText.includes('888box 遠端轉存成功'));
    assert.ok(capturedText.includes('Cute Cat'));
    assert.ok(capturedText.includes('https://box.david888.com/v/cutecat77'));
  } finally {
    globalThis.fetch = originalFetch;
  }
});
