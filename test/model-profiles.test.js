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
