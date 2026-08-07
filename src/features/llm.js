/**
 * Unified model profile command.
 * `/model` is canonical; `/llmchange` remains a compatibility alias.
 */

import { sendMessageToTelegramWithContext } from '../telegram/telegram.js';
import { trimUserConfig as trimPersistedUserConfig } from '../telegram/context.js';
import { DATABASE } from '../config/env.js';
import {
  getAllLLMProfiles,
  getCurrentProfileName,
  getActiveLLMProfile,
  resolveLLMProfileName
} from '../agent/agents.js';

const PROFILE_KEY = 'CURRENT_LLM_PROFILE';
const LEGACY_KEYS = ['AI_PROVIDER', 'CURRENT_LLM_MODEL'];

function addDefineKey(userConfig, key) {
  userConfig.DEFINE_KEYS = userConfig.DEFINE_KEYS || [];
  if (!userConfig.DEFINE_KEYS.includes(key)) userConfig.DEFINE_KEYS.push(key);
}

function removeDefineKeys(userConfig, keys) {
  const blocked = new Set(keys);
  userConfig.DEFINE_KEYS = (userConfig.DEFINE_KEYS || []).filter((key) => !blocked.has(key));
}

/** Apply a profile selection and remove the old independent provider/model overrides. */
export function applyModelProfile(userConfig, requestedName) {
  const names = Object.keys(userConfig.LLM_PROFILES || {});
  const name = names.find((candidate) => candidate.toLowerCase() === String(requestedName).toLowerCase());
  if (!name) return null;

  userConfig.CURRENT_LLM_PROFILE = name;
  addDefineKey(userConfig, PROFILE_KEY);

  userConfig.AI_PROVIDER = 'auto';
  userConfig.CURRENT_LLM_MODEL = '';
  removeDefineKeys(userConfig, LEGACY_KEYS);
  return { name, profile: userConfig.LLM_PROFILES[name] };
}

/** Return to the deployment's DEFAULT_LLM_PROFILE. */
export function resetModelProfile(userConfig) {
  userConfig.CURRENT_LLM_PROFILE = '';
  userConfig.AI_PROVIDER = 'auto';
  userConfig.CURRENT_LLM_MODEL = '';
  removeDefineKeys(userConfig, [PROFILE_KEY, ...LEGACY_KEYS]);
}

async function persistModelSelection(context) {
  await DATABASE.put(
    context.SHARE_CONTEXT.configStoreKey,
    JSON.stringify(trimPersistedUserConfig(context.USER_CONFIG))
  );
}

export function describeProfile(name, profile) {
  return `\`${name}\` - ${profile.name || name}\n   \`${profile.model || '未設定'}\``;
}

export function formatModelStatus(name, profile, prefix = '') {
  let message = prefix;
  if (name && profile) {
    message += `📍 目前 Profile: \`${name}\`\n`;
    message += `📦 Model: \`${profile.model || '未設定'}\``;
  } else {
    message += '⚠️ 尚未設定有效的模型 Profile';
  }
  return message;
}

async function sendCurrentModel(context, prefix = '') {
  const name = getCurrentProfileName(context);
  const profile = getActiveLLMProfile(context);
  const message = formatModelStatus(name, profile, prefix);
  context.CURRENT_CHAT_CONTEXT.parse_mode = 'Markdown';
  return sendMessageToTelegramWithContext(context)(message);
}

async function selectProfile(context, requestedName) {
  const selected = applyModelProfile(context.USER_CONFIG, requestedName);
  if (!selected) return null;
  await persistModelSelection(context);
  return selected;
}

/** Handle both new and legacy inline keyboard callback data. */
export async function handleLLMChangeCallback(message, context) {
  const callbackData = message.callback_query?.data || '';
  const prefix = callbackData.startsWith('/model:')
    ? '/model:'
    : callbackData.startsWith('/llmchange:') ? '/llmchange:' : '';
  if (!prefix) return null;

  const requestedName = callbackData.slice(prefix.length);
  try {
    const selected = await selectProfile(context, requestedName);
    if (!selected) {
      return sendMessageToTelegramWithContext(context)(`❌ 找不到 Profile: ${requestedName}`);
    }
    return sendCurrentModel(context, '✅ 已切換模型\n\n');
  } catch (error) {
    return sendMessageToTelegramWithContext(context)(`❌ 錯誤: ${error.message}`);
  }
}

export async function commandModel(message, command, subcommand, context) {
  const input = (subcommand || '').trim();
  const [action, requestedName] = input.split(/\s+/, 2);

  if (!input || action.toLowerCase() === 'list') {
    return showModelMenu(context);
  }

  if (action.toLowerCase() === 'reset') {
    resetModelProfile(context.USER_CONFIG);
    await persistModelSelection(context);
    return sendCurrentModel(context, '✅ 已回復部署預設模型\n\n');
  }

  if (action.toLowerCase() === 'info') {
    const name = resolveLLMProfileName(context, requestedName);
    const profile = getAllLLMProfiles(context)[name];
    if (!profile) {
      return sendMessageToTelegramWithContext(context)(`❌ 找不到 Profile: ${requestedName || ''}`);
    }
    context.CURRENT_CHAT_CONTEXT.parse_mode = 'Markdown';
    return sendMessageToTelegramWithContext(context)(describeProfile(name, profile));
  }

  try {
    const selected = await selectProfile(context, action);
    if (!selected) {
      return sendMessageToTelegramWithContext(context)(
        `❌ 找不到 Profile: \`${action}\`\n\n使用 /model list 查看可用模型。`
      );
    }
    return sendCurrentModel(context, '✅ 已切換模型\n\n');
  } catch (error) {
    return sendMessageToTelegramWithContext(context)(`❌ 錯誤: ${error.message}`);
  }
}

/** Backward-compatible command alias. */
export async function commandLLMChange(message, command, subcommand, context) {
  return commandModel(message, command, subcommand, context);
}

async function showModelMenu(context) {
  const profiles = getAllLLMProfiles(context);
  const currentName = getCurrentProfileName(context);
  const names = Object.keys(profiles);

  let text = '🤖 *模型設定*\n━━━━━━━━━━━━━━━\n';
  if (currentName) text += `📍 目前使用: \`${currentName}\`\n`;
  text += '\n*可用 Profiles:*\n';
  for (const name of names) {
    text += `${name === currentName ? '✓' : '•'} ${describeProfile(name, profiles[name])}\n`;
  }
  text += '\n使用 `/model <profile>` 切換，`/model reset` 回復部署預設。';

  const buttons = [];
  for (let index = 0; index < names.length; index += 2) {
    buttons.push(names.slice(index, index + 2).map((name) => ({
      text: `${name === currentName ? '✓ ' : ''}${profiles[name].name || name}`,
      callback_data: `/model:${name}`
    })));
  }
  context.CURRENT_CHAT_CONTEXT.reply_markup = JSON.stringify({ inline_keyboard: buttons });
  context.CURRENT_CHAT_CONTEXT.parse_mode = 'Markdown';
  return sendMessageToTelegramWithContext(context)(text);
}
