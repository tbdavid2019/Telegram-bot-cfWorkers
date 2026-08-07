import test from 'node:test';
import assert from 'node:assert/strict';

import {
  extractWorkersAIText,
  isWorkersAIEnable,
  requestCompletionsFromWorkersAI
} from '../src/agent/workersai.js';

test('Workers AI extracts text from Responses API output', () => {
  const result = {
    id: 'response-id',
    output: [
      { type: 'reasoning', summary: [] },
      {
        type: 'message',
        content: [{ type: 'output_text', text: 'Responses API 回覆' }]
      }
    ]
  };

  assert.equal(extractWorkersAIText(result), 'Responses API 回覆');
});

test('Workers AI extracts text from Chat Completions output', () => {
  const result = {
    choices: [{ message: { role: 'assistant', content: 'Chat Completions 回覆' } }]
  };

  assert.equal(extractWorkersAIText(result), 'Chat Completions 回覆');
});

function createContext(ai) {
  return {
    env: { AI: ai },
    USER_CONFIG: {
      SYSTEM_INIT_MESSAGE_ROLE: 'system',
      WORKERS_CHAT_MODEL: '@cf/openai/gpt-oss-120b'
    }
  };
}

test('Workers AI is enabled only when an AI binding is available', () => {
  assert.equal(isWorkersAIEnable(createContext({ run() {} })), true);
  assert.equal(isWorkersAIEnable({ env: {}, USER_CONFIG: {} }), false);
});

test('Workers AI sends the configured model and complete conversation', async () => {
  let invocation;
  const context = createContext({
    async run(model, input) {
      invocation = { model, input };
      return { response: 'Cloudflare 回覆' };
    }
  });
  context.USER_CONFIG.WORKERS_AI_EXTRA_PARAMS = {
    temperature: 0.2,
    stream: true,
    messages: [{ role: 'user', content: '不應覆蓋正式訊息' }]
  };

  const answer = await requestCompletionsFromWorkersAI({
    prompt: '你是一個助理',
    history: [{ role: 'assistant', content: '上一輪回答' }],
    message: '新的問題'
  }, context, null);

  assert.equal(answer, 'Cloudflare 回覆');
  assert.deepEqual(invocation, {
    model: '@cf/openai/gpt-oss-120b',
    input: {
      temperature: 0.2,
      stream: false,
      messages: [
        { role: 'system', content: '你是一個助理' },
        { role: 'assistant', content: '上一輪回答' },
        { role: 'user', content: '新的問題' }
      ]
    }
  });
});

test('Workers AI uses the active profile model and options', async () => {
  let invocation;
  const context = createContext({
    async run(model, input) {
      invocation = { model, input };
      return { response: 'profile response' };
    }
  });
  context.USER_CONFIG.CURRENT_LLM_PROFILE = 'workers';
  context.USER_CONFIG.LLM_PROFILES = {
    workers: {
      provider: 'workers',
      model: '@cf/openai/gpt-oss-120b',
      options: { max_tokens: 4096 }
    }
  };

  await requestCompletionsFromWorkersAI({ message: 'hello' }, context, null);

  assert.equal(invocation.model, '@cf/openai/gpt-oss-120b');
  assert.equal(invocation.input.max_tokens, 4096);
});

test('Workers AI rejects an empty model response', async () => {
  const context = createContext({
    async run() {
      return { usage: { input_tokens: 1 } };
    }
  });

  await assert.rejects(
    requestCompletionsFromWorkersAI({ message: 'hello' }, context, null),
    /empty text response/i
  );
});
