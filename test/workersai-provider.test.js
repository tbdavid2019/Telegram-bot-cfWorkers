import test from 'node:test';
import assert from 'node:assert/strict';

import { loadChatLLM } from '../src/agent/agents.js';
import { Context } from '../src/telegram/context.js';

test('the workers provider is selected when configured', () => {
  const ai = { async run() {} };
  const context = {
    env: { AI: ai },
    USER_CONFIG: { AI_PROVIDER: 'workers' }
  };

  const provider = loadChatLLM(context);

  assert.equal(provider?.name, 'workers');
  assert.equal(typeof provider?.request, 'function');
});

test('auto selection preserves Gemini priority when both Gemini and Workers AI are available', () => {
  const context = {
    env: { AI: { async run() {} } },
    USER_CONFIG: {
      AI_PROVIDER: 'auto',
      OPENAI_API_KEY: [],
      LLM_PROFILES: {},
      GOOGLE_API_KEY: 'configured'
    }
  };

  assert.equal(loadChatLLM(context)?.name, 'gemini');
});

test('Telegram context exposes the request-scoped Workers AI binding', () => {
  const ai = { async run() {} };
  const context = new Context({ AI: ai });

  assert.equal(context.env.AI, ai);
  assert.equal(context.AI_BINDING, ai);
});
