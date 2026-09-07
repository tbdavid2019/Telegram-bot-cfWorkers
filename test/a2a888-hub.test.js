import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getHubConfig,
  ensureHubRegistration,
  listHubPeers,
  resolveTargetAgent,
  sendHubTask,
  processHubInbox,
  commandA2AHub,
  commandDelegate
} from '../src/features/a2a888-hub.js';
import { ENV } from '../src/config/env.js';
import { commandHandlers } from '../src/telegram/commands.js';

test('A2A888 Hub: getHubConfig correctly reads configurations and defaults', () => {
  const mockEnv = {
    A2A888_HUB_URL: 'https://a2a.david888.com',
    A2A888_HUB_SHARED_KEY: '0906541100david888',
    A2A888_AGENT_ID: 'agent-test-123',
    A2A888_AGENT_TOKEN: 'token-test-456',
    A2A_AGENT_NAME: '小江管家2'
  };

  const config = getHubConfig(mockEnv);
  assert.equal(config.hubUrl, 'https://a2a.david888.com');
  assert.equal(config.sharedKey, '0906541100david888');
  assert.equal(config.agentId, 'agent-test-123');
  assert.equal(config.agentToken, 'token-test-456');
  assert.equal(config.agentName, '小江管家2');
});

test('A2A888 Hub: ensureHubRegistration uses existing credentials or registers dynamically', async () => {
  let registerCalled = false;
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (url, opts) => {
    if (String(url).includes('/agents/register')) {
      registerCalled = true;
      assert.equal(opts.headers['X-Hub-Key'], 'test-shared-key');
      return new Response(JSON.stringify({
        duplicate: false,
        identity: {
          hubId: 'public',
          agentId: 'agent-registered-999',
          agentToken: 'token-registered-999'
        }
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response('Not found', { status: 404 });
  };

  try {
    const mockEnv = {
      A2A888_HUB_SHARED_KEY: 'test-shared-key',
      A2A_AGENT_NAME: 'TestBot'
    };

    const creds = await ensureHubRegistration(mockEnv);
    assert.equal(registerCalled, true);
    assert.equal(creds.agentId, 'agent-registered-999');
    assert.equal(creds.agentToken, 'token-registered-999');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('A2A888 Hub: listHubPeers queries Hub and caches results', async () => {
  const originalFetch = globalThis.fetch;
  let fetchCount = 0;

  globalThis.fetch = async (url, opts) => {
    if (String(url).includes('/hub/v1/agents')) {
      fetchCount++;
      assert.equal(opts.headers['X-Agent-ID'], 'agent-123');
      assert.equal(opts.headers['Authorization'], 'Bearer token-123');
      return new Response(JSON.stringify({
        agents: [
          { agentId: 'agent-001', displayName: '甘露寺', state: 'ONLINE', capabilities: ['text/plain'] },
          { agentId: 'agent-002', displayName: '甜甜', state: 'ONLINE', capabilities: ['text/plain'] }
        ]
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response('Not found', { status: 404 });
  };

  try {
    const mockEnv = {
      A2A888_AGENT_ID: 'agent-123',
      A2A888_AGENT_TOKEN: 'token-123'
    };

    const peers = await listHubPeers(mockEnv, { forceRefresh: true });
    assert.equal(peers.length, 2);
    assert.equal(peers[0].displayName, '甘露寺');
    assert.equal(peers[1].displayName, '甜甜');

    // Resolve target agent by partial or full displayName
    const target = await resolveTargetAgent(mockEnv, '甘露寺');
    assert.equal(target.agentId, 'agent-001');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('A2A888 Hub: sendHubTask sends task and receives reply', async () => {
  const originalFetch = globalThis.fetch;
  let taskPosted = false;
  let taskPayload = null;

  globalThis.fetch = async (url, opts) => {
    const urlStr = String(url);
    if (urlStr.includes('/tasks')) {
      taskPosted = true;
      taskPayload = JSON.parse(opts.body);
      return new Response(JSON.stringify({
        state: 'QUEUED',
        taskId: taskPayload.taskId
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (urlStr.includes('/agents?')) {
      return new Response(JSON.stringify({
        agents: [
          { agentId: 'agent-888', displayName: '甜甜', state: 'ONLINE' }
        ]
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (urlStr.includes('/inbox?')) {
      // Simulate reply
      return new Response(JSON.stringify({
        items: [
          {
            sequence: 10,
            taskId: 'reply-task-1',
            contextId: taskPayload?.contextId,
            requesterAgentId: 'agent-888',
            message: '這是來自甜甜的協作回覆。',
            state: 'PENDING'
          }
        ]
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (urlStr.includes('/ack')) {
      return new Response(JSON.stringify({ sequence: 10, state: 'ACKNOWLEDGED' }), { status: 200 });
    }
    return new Response('Not found', { status: 404 });
  };

  try {
    const mockEnv = {
      A2A888_AGENT_ID: 'agent-self',
      A2A888_AGENT_TOKEN: 'token-self'
    };

    const answer = await sendHubTask(mockEnv, '甜甜', '請分析目前的資料', { waitForReply: true, timeoutMs: 3000 });
    assert.equal(taskPosted, true);
    assert.equal(taskPayload.message, '請分析目前的資料');
    assert.equal(answer, '這是來自甜甜的協作回覆。');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('A2A888 Hub: Security Fix - LOCK_USER_CONFIG_KEYS protects Hub credentials', () => {
  const requiredKeys = ['A2A888_HUB_SHARED_KEY', 'A2A888_AGENT_TOKEN', 'A2A888_HUB_URL', 'A2A888_AGENT_ID'];
  for (const k of requiredKeys) {
    assert.ok(ENV.LOCK_USER_CONFIG_KEYS.includes(k), `Expected ${k} to be in LOCK_USER_CONFIG_KEYS`);
  }
});

test('A2A888 Hub: /a2ahub and /delegate commands are registered in commandHandlers', () => {
  assert.ok(commandHandlers['/a2ahub'], 'Expected /a2ahub in commandHandlers');
  assert.ok(commandHandlers['/delegate'], 'Expected /delegate in commandHandlers');
  assert.equal(typeof commandHandlers['/a2ahub'].fn, 'function');
  assert.equal(typeof commandHandlers['/delegate'].fn, 'function');
});
