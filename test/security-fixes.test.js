import test from 'node:test';
import assert from 'node:assert/strict';

import { handleA2ARequest } from '../src/features/a2a.js';
import { ENV } from '../src/config/env.js';
import { commandGetID } from '../src/features/system.js';
import { commandHandlers } from '../src/telegram/commands.js';
import { getUserMemory, saveUserMemory } from '../src/features/memory.js';

test('Security Fix: handleA2ARequest requires Bearer token when A2A_SECRET is configured', async () => {
  const envWithSecret = { A2A_SECRET: 'secret123' };
  
  // Unauthenticated request
  const reqUnauth = new Request('https://bot.example/a2a', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: '1', method: 'message/send', params: {} })
  });
  const resUnauth = await handleA2ARequest(reqUnauth, envWithSecret);
  assert.equal(resUnauth.status, 401);
  const dataUnauth = await resUnauth.json();
  assert.equal(dataUnauth.error.code, -32000);

  // Wrong token
  const reqWrong = new Request('https://bot.example/a2a', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer wrong' },
    body: JSON.stringify({ jsonrpc: '2.0', id: '1', method: 'message/send', params: {} })
  });
  const resWrong = await handleA2ARequest(reqWrong, envWithSecret);
  assert.equal(resWrong.status, 401);
});

test('Security Fix: LOCK_USER_CONFIG_KEYS contains all critical API base URLs and credentials', () => {
  const criticalKeys = [
    'OPENAI_API_BASE',
    'OPENAI_IMAGE_API_BASE',
    'GEMINI_IMAGE_API_BASE',
    'ASR_API_BASE',
    'TTS_API_BASE',
    'BOX_API_BASE',
    'WIKI_API_BASE',
    'A2A_SECRET',
    'INIT_SECRET',
    'OPENAI_API_KEY',
    'BOX_API_TOKEN'
  ];
  for (const key of criticalKeys) {
    assert.ok(ENV.LOCK_USER_CONFIG_KEYS.includes(key), `Expected ${key} in LOCK_USER_CONFIG_KEYS`);
  }
});

test('Security Fix: commandGetID escapes HTML in user display names', async () => {
  let sentMessage = null;
  const mockContext = {
    SHARE_CONTEXT: { currentBotToken: '123:test' },
    CURRENT_CHAT_CONTEXT: { chat_id: 12345 }
  };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    const body = JSON.parse(opts.body);
    sentMessage = body.text;
    return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
  };

  try {
    const maliciousMessage = {
      from: {
        id: 12345,
        first_name: 'Admin<script>alert(1)</script>',
        last_name: '<b>Hacked</b>'
      }
    };

    await commandGetID(maliciousMessage, '/getid', '', mockContext);
    assert.ok(sentMessage);
    assert.doesNotMatch(sentMessage, /<script>/);
    assert.match(sentMessage, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
    assert.match(sentMessage, /&lt;b&gt;Hacked&lt;\/b&gt;/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Security Fix: memory subsystem rejects path traversal in userId', async () => {
  await assert.rejects(
    async () => {
      await getUserMemory('../global', {});
    },
    /Invalid userId format/
  );

  await assert.rejects(
    async () => {
      await saveUserMemory('user/../../root', 'content', {});
    },
    /Invalid userId format/
  );
});

test('Security Fix: State-modifying commands require admin permissions in group chats', () => {
  const adminGatedCommands = [
    '/setenv',
    '/setenvs',
    '/model',
    '/setimg',
    '/budgetwrite',
    '/scheduleadd',
    '/scheduledelete',
    '/soul',
    '/memoryclear',
    '/memoryglobal'
  ];

  for (const cmd of adminGatedCommands) {
    assert.ok(commandHandlers[cmd], `Command ${cmd} should be registered`);
    assert.ok(typeof commandHandlers[cmd].needAuth === 'function', `Command ${cmd} must have needAuth`);
    const groupRoles = commandHandlers[cmd].needAuth('group');
    assert.deepEqual(groupRoles, ['administrator', 'creator'], `${cmd} should require admin in group`);
    const privateRoles = commandHandlers[cmd].needAuth('private');
    assert.equal(privateRoles, null, `${cmd} should be allowed in private`);
  }
});
