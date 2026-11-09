import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getActiveLLMProfile,
  getCurrentProfileName,
  loadChatLLM
} from '../src/agent/agents.js';
import {
  applyModelProfile,
  describeProfile,
  formatModelStatus,
  resetModelProfile
} from '../src/features/llm.js';

function contextWith(config) {
  return {
    env: { AI: { async run() {} } },
    USER_CONFIG: config
  };
}

test('a profile is the single source of provider and model selection', () => {
  const context = contextWith({
    AI_PROVIDER: 'openai',
    DEFAULT_LLM_PROFILE: 'workers',
    CURRENT_LLM_PROFILE: '',
    LLM_PROFILES: {
      workers: {
        name: 'Cloudflare Workers AI',
        provider: 'workers',
        model: '@cf/openai/gpt-oss-120b',
        options: { max_tokens: 4096 }
      }
    }
  });

  assert.equal(getCurrentProfileName(context), 'workers');
  assert.equal(getActiveLLMProfile(context)?.model, '@cf/openai/gpt-oss-120b');
  assert.equal(loadChatLLM(context)?.name, 'workers');
});

test('profile names are resolved case-insensitively for legacy saved values', () => {
  const context = contextWith({
    CURRENT_LLM_PROFILE: 'kimi',
    DEFAULT_LLM_PROFILE: '',
    LLM_PROFILES: {
      Kimi: {
        provider: 'openai',
        model: 'moonshotai/kimi-k2-instruct-0905'
      }
    }
  });

  assert.equal(getCurrentProfileName(context), 'Kimi');
  assert.equal(getActiveLLMProfile(context)?.model, 'moonshotai/kimi-k2-instruct-0905');
  assert.equal(loadChatLLM(context)?.name, 'openai');
});

test('an invalid saved profile falls back to the deployment default', () => {
  const context = contextWith({
    CURRENT_LLM_PROFILE: 'removed-profile',
    DEFAULT_LLM_PROFILE: 'workers',
    LLM_PROFILES: {
      workers: { provider: 'workers', model: '@cf/openai/gpt-oss-120b' }
    }
  });

  assert.equal(getCurrentProfileName(context), 'workers');
  assert.equal(loadChatLLM(context)?.name, 'workers');
});

test('profiles without a provider remain OpenAI-compatible', () => {
  const context = contextWith({
    AI_PROVIDER: 'gemini',
    CURRENT_LLM_PROFILE: 'legacy',
    DEFAULT_LLM_PROFILE: '',
    LLM_PROFILES: {
      legacy: { apiBase: 'https://example.com/v1', model: 'legacy-model' }
    }
  });

  assert.equal(loadChatLLM(context)?.name, 'openai');
});

test('model selection stores only the profile and removes legacy overrides', () => {
  const userConfig = {
    AI_PROVIDER: 'gemini',
    CURRENT_LLM_MODEL: 'old-model',
    CURRENT_LLM_PROFILE: '',
    DEFINE_KEYS: ['AI_PROVIDER', 'CURRENT_LLM_MODEL'],
    LLM_PROFILES: {
      Kimi: { provider: 'openai', model: 'kimi-model' }
    }
  };

  const selected = applyModelProfile(userConfig, 'kimi');

  assert.equal(selected.name, 'Kimi');
  assert.equal(userConfig.CURRENT_LLM_PROFILE, 'Kimi');
  assert.equal(userConfig.CURRENT_LLM_MODEL, '');
  assert.equal(userConfig.AI_PROVIDER, 'auto');
  assert.deepEqual(userConfig.DEFINE_KEYS, ['CURRENT_LLM_PROFILE']);

  resetModelProfile(userConfig);
  assert.equal(userConfig.CURRENT_LLM_PROFILE, '');
  assert.deepEqual(userConfig.DEFINE_KEYS, []);
});

test('model UI hides the internal adapter implementation', () => {
  const profile = {
    name: 'Grok 4.1',
    model: 'grok-4-1-fast-reasoning',
    provider: 'openai'
  };

  const status = formatModelStatus('Grok', profile, '✅ 已切換模型\n\n');
  const description = describeProfile('Grok', profile);

  assert.match(status, /Profile: `Grok`/);
  assert.match(status, /Model: `grok-4-1-fast-reasoning`/);
  assert.doesNotMatch(status, /Provider|Adapter|openai/);
  assert.doesNotMatch(description, /Provider|Adapter|openai/);
});

test('profile aliases allow selection by alternative names', () => {
  const userConfig = {
    CURRENT_LLM_PROFILE: '',
    LLM_PROFILES: {
      gemini: {
        name: 'Gemini 3.8 Flash (aiurl 主力)',
        apiBase: 'https://llm.aiurl.tw/v1',
        apiKeyEnv: 'AIURL_API_KEY',
        model: 'antigravity/gemini-3.8-flash',
        aliases: ['aiurl', 'gemini38', 'gemini-3.8', 'gemini 3.8', 'flash']
      },
      backup: {
        name: 'Google Gemini Flash (原廠備用)',
        apiBase: 'https://generativelanguage.googleapis.com/v1beta/openai',
        apiKeyEnv: 'GOOGLE_API_KEY',
        model: 'models/gemini-flash-latest',
        aliases: ['google', 'official', 'google-official']
      }
    }
  };

  const selected1 = applyModelProfile(userConfig, 'gemini38');
  assert.equal(selected1?.name, 'gemini');
  assert.equal(userConfig.CURRENT_LLM_PROFILE, 'gemini');

  const selected2 = applyModelProfile(userConfig, 'gemini 3.8');
  assert.equal(selected2?.name, 'gemini');

  const selected3 = applyModelProfile(userConfig, 'aiurl');
  assert.equal(selected3?.name, 'gemini');

  const selectedBackup = applyModelProfile(userConfig, 'google');
  assert.equal(selectedBackup?.name, 'backup');
});

test('openai and groq profiles with aiurl and backup aliases', () => {
  const userConfig = {
    CURRENT_LLM_PROFILE: '',
    LLM_PROFILES: {
      openai: {
        name: 'GPT-5.6 Luna (aiurl 主力)',
        apiBase: 'https://llm.aiurl.tw/v1',
        apiKeyEnv: 'AIURL_API_KEY',
        model: 'gpt-5.6-luna',
        aliases: ['luna', 'gpt-luna', 'gpt5.6', 'gpt-5.6', 'chatgpt'],
        fallbackProfile: 'openai-backup'
      },
      'openai-backup': {
        name: 'OpenAI 原廠 (備用)',
        apiBase: 'https://api.openai.com/v1',
        apiKeyEnv: 'OPENAI_API_KEY',
        model: 'chat-latest',
        aliases: ['openai-official', 'openai-backup', 'chat-latest', 'openai-direct']
      },
      groq: {
        name: 'GPT OSS 120b (aiurl 主力)',
        apiBase: 'https://llm.aiurl.tw/v1',
        apiKeyEnv: 'AIURL_API_KEY',
        model: 'openai/gpt-oss-120b',
        aliases: ['oss', 'oss120b', 'oss-120b', 'gpt-oss'],
        fallbackProfile: 'groq-backup'
      },
      'groq-backup': {
        name: 'Groq OSS 120b (原廠備用)',
        apiBase: 'https://api.groq.com/openai/v1',
        apiKeyEnv: 'GROQ_API_KEY',
        model: 'openai/gpt-oss-120b',
        aliases: ['groq-official', 'groq-backup', 'groq-direct']
      }
    }
  };

  const selLuna = applyModelProfile(userConfig, 'luna');
  assert.equal(selLuna?.name, 'openai');
  assert.equal(userConfig.CURRENT_LLM_PROFILE, 'openai');

  const selGpt56 = applyModelProfile(userConfig, 'gpt-5.6');
  assert.equal(selGpt56?.name, 'openai');

  const selOpenaiBackup = applyModelProfile(userConfig, 'openai-backup');
  assert.equal(selOpenaiBackup?.name, 'openai-backup');

  const selOss = applyModelProfile(userConfig, 'oss-120b');
  assert.equal(selOss?.name, 'groq');

  const selGroqBackup = applyModelProfile(userConfig, 'groq-backup');
  assert.equal(selGroqBackup?.name, 'groq-backup');
});

test('requestCompletionsFromOpenAI automatically invokes fallbackProfile on primary failure', async () => {
  const { requestCompletionsFromOpenAI } = await import('../src/agent/openai.js');

  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, opts) => {
    calls.push({ url, headers: opts.headers, body: JSON.parse(opts.body) });
    if (url.includes('llm.aiurl.tw')) {
      return new Response(JSON.stringify({ error: { message: 'aiurl service unavailable' } }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    if (url.includes('api.openai.com')) {
      return new Response(JSON.stringify({
        choices: [{ message: { content: 'Fallback response from OpenAI official' } }]
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    return new Response('Not found', { status: 404 });
  };

  try {
    const context = {
      USER_CONFIG: {
        CURRENT_LLM_PROFILE: 'openai',
        AIURL_API_KEY: 'test-aiurl-key',
        OPENAI_API_KEY: 'test-openai-key',
        LLM_PROFILES: {
          openai: {
            name: 'GPT-5.6 Luna (aiurl 主力)',
            apiBase: 'https://llm.aiurl.tw/v1',
            apiKeyEnv: 'AIURL_API_KEY',
            model: 'gpt-5.6-luna',
            fallbackProfile: 'openai-backup'
          },
          'openai-backup': {
            name: 'OpenAI 原廠 (備用)',
            apiBase: 'https://api.openai.com/v1',
            apiKeyEnv: 'OPENAI_API_KEY',
            model: 'chat-latest'
          }
        }
      }
    };

    const answer = await requestCompletionsFromOpenAI({ message: 'Hello' }, context, null);
    assert.equal(answer, 'Fallback response from OpenAI official');
    assert.equal(calls.length, 2);
    assert.match(calls[0].url, /llm\.aiurl\.tw/);
    assert.match(calls[1].url, /api\.openai\.com/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
