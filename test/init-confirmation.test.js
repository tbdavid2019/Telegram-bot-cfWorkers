import test from 'node:test';
import assert from 'node:assert/strict';

import worker from '../src/index.js';

test('GET /init requires a human POST before Telegram settings are changed', async (t) => {
  const originalFetch = globalThis.fetch;
  const externalCalls = [];
  globalThis.fetch = async (url, options = {}) => {
    externalCalls.push({ url: String(url), options });
    return new Response(JSON.stringify({ ok: true, description: '<script>alert(1)</script>' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  };
  t.after(() => { globalThis.fetch = originalFetch; });

  const env = {
    TELEGRAM_AVAILABLE_TOKENS: '123456:test-token',
    TELEGRAM_BOT_NAME: 'test_bot',
    DATABASE: { async get() { return null; }, async put() {} }
  };

  const getResponse = await worker.fetch(new Request('https://bot.example/init'), env, {});
  const getHtml = await getResponse.text();

  assert.equal(externalCalls.length, 0);
  assert.match(getHtml, /<form[^>]+method=["']post["']/i);
  assert.match(getHtml, /type=["']submit["']/i);

  const rejectedResponse = await worker.fetch(new Request('https://bot.example/init', {
    method: 'POST'
  }), env, {});
  assert.equal(rejectedResponse.status, 400);
  assert.equal(externalCalls.length, 0);

  const postResponse = await worker.fetch(new Request('https://bot.example/init', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'confirm=update'
  }), env, {});
  const postHtml = await postResponse.text();

  assert.ok(externalCalls.length > 0);
  assert.match(postHtml, /Bot ID: 123456/);
  assert.doesNotMatch(postHtml, /<script>alert\(1\)<\/script>/);
  assert.match(postHtml, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);

  const commandUpdates = externalCalls.filter((call) => call.url.endsWith('/setMyCommands'));
  assert.ok(commandUpdates.length > 0);
  const registeredCommands = [];
  for (const call of commandUpdates) {
    const commands = JSON.parse(call.options.body).commands.map((item) => item.command);
    registeredCommands.push(...commands);
    assert.ok(!commands.includes('/llmchange'));
  }
  assert.ok(registeredCommands.includes('/model'));
});
