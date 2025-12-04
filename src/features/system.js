// 系統指令模組
import { sendMessageToTelegramWithContext } from '../telegram/telegram.js';
import { loadChatLLM, loadImageGen, getActiveLLMProfile, getCurrentProfileName } from '../agent/agents.js';
import { loadHistory } from '../agent/llm.js';
import { chatWithLLM } from '../agent/llm.js';
import { getStats } from '../utils/stats.js';

// 從環境變數和配置引入
import { ENV, DATABASE, CONST, CUSTOM_COMMAND, CUSTOM_COMMAND_DESCRIPTION } from '../config/env.js';

// 導入 commandHandlers（延遲導入避免循環依賴）
let commandHandlers = null;
async function getCommandHandlers() {
  if (!commandHandlers) {
    const module = await import('../telegram/commands.js');
    commandHandlers = module.commandHandlers;
  }
  return commandHandlers;
}

/**
 * 修剪使用者配置（移除空值）
 */
function trimUserConfig(userConfig) {
  const config = { ...userConfig };
  for (const key in config) {
    if (config[key] === null || config[key] === undefined || config[key] === "") {
      delete config[key];
    }
  }
  return config;
}

/**
 * 合併環境變數
 */
function mergeEnvironment(target, source) {
  for (const key in source) {
    target[key] = source[key];
  }
}

/**
 * 取得當前聊天模型名稱
 */
function chatModelKey(agentName) {
  switch (agentName) {
    case "openai":
      return "OPENAI_CHAT_MODEL";
    case "gemini":
      return "GOOGLE_COMPLETIONS_MODEL";
    default:
      return null;
  }
}

/**
 * 取得當前聊天模型
 */
function currentChatModel(agentName, context) {
  if (agentName === "openai") {
    // 優先使用 LLM Profile
    const profile = getActiveLLMProfile(context);
    if (context.USER_CONFIG.CURRENT_LLM_MODEL) {
      return context.USER_CONFIG.CURRENT_LLM_MODEL;
    }
    if (profile && profile.model) {
      return profile.model;
    }
    return context.USER_CONFIG.OPENAI_CHAT_MODEL;
  }
  
  switch (agentName) {
    case "gemini":
      return context.USER_CONFIG.GOOGLE_COMPLETIONS_MODEL;
    default:
      return null;
  }
}

/**
 * 取得當前圖片模型鍵
 */
function imageModelKey(agentName) {
  switch (agentName) {
    case "openai":
      return "DALL_E_MODEL";
    case "gemini":
      return "GEMINI_IMAGE_MODEL";
    default:
      return null;
  }
}

/**
 * 取得當前圖片模型
 */
function currentImageModel(agentName, context) {
  switch (agentName) {
    case "openai":
      if (context.USER_CONFIG.DALL_E_MODEL === "gpt-image-1" || 
          context.USER_CONFIG.GPT_IMAGE_MODEL === "gpt-image-1") {
        return "gpt-image-1";
      }
      return context.USER_CONFIG.DALL_E_MODEL || "dall-e-3";
    case "gemini":
      return context.USER_CONFIG.GEMINI_IMAGE_MODEL || "gemini-2.0-flash-exp";
    default:
      return "unknown";
  }
}

/**
 * /help - 顯示幫助訊息
 * 只顯示 commandSortList 中的公開指令，不顯示系統級指令
 */
export async function commandGetHelp(message, command, subcommand, context) {
  // 動態導入 commandSortList 避免循環依賴
  const { commandSortList } = await import('../telegram/commands.js');
  
  let helpMsg = ENV.I18N.command.help.summary + "\n";
  
  // 只顯示 commandSortList 中的指令
  helpMsg += commandSortList
    .map((key) => `${key}：${ENV.I18N.command.help[key.substring(1)] || ''}`)
    .join("\n");
  
  // 加上自訂指令
  helpMsg += Object.keys(CUSTOM_COMMAND || {})
    .filter((key) => !!CUSTOM_COMMAND_DESCRIPTION[key])
    .map((key) => `${key}：${CUSTOM_COMMAND_DESCRIPTION[key]}`)
    .join("\n");
  
  return sendMessageToTelegramWithContext(context)(helpMsg);
}

/**
 * /new - 建立新對話
 */
export async function commandCreateNewChatContext(message, command, subcommand, context) {
  try {
    await DATABASE.delete(context.SHARE_CONTEXT.chatHistoryKey);
    context.CURRENT_CHAT_CONTEXT.reply_markup = JSON.stringify({
      remove_keyboard: true,
      selective: true
    });
    if (command === "/new") {
      return sendMessageToTelegramWithContext(context)(ENV.I18N.command.new.new_chat_start);
    } else {
      return sendMessageToTelegramWithContext(context)(`${ENV.I18N.command.new.new_chat_start}(${context.CURRENT_CHAT_CONTEXT.chat_id})`);
    }
  } catch (e) {
    return sendMessageToTelegramWithContext(context)(`ERROR: ${e.message}`);
  }
}

/**
 * /setenv - 更新單一設定
 */
export async function commandUpdateUserConfig(message, command, subcommand, context) {
  const kv = subcommand.indexOf("=");
  if (kv === -1) {
    return sendMessageToTelegramWithContext(context)(ENV.I18N.command.help.setenv);
  }
  let key = subcommand.slice(0, kv);
  const value = subcommand.slice(kv + 1);
  key = ENV_KEY_MAPPER[key] || key;
  if (ENV.LOCK_USER_CONFIG_KEYS.includes(key)) {
    return sendMessageToTelegramWithContext(context)(`Key ${key} is locked`);
  }
  if (!Object.keys(context.USER_CONFIG).includes(key)) {
    return sendMessageToTelegramWithContext(context)(`Key ${key} not found`);
  }
  try {
    context.USER_CONFIG.DEFINE_KEYS.push(key);
    context.USER_CONFIG.DEFINE_KEYS = Array.from(new Set(context.USER_CONFIG.DEFINE_KEYS));
    mergeEnvironment(context.USER_CONFIG, {
      [key]: value
    });
    console.log("Update user config: ", key, context.USER_CONFIG[key]);
    await DATABASE.put(
      context.SHARE_CONTEXT.configStoreKey,
      JSON.stringify(trimUserConfig(context.USER_CONFIG))
    );
    return sendMessageToTelegramWithContext(context)("Update user config success");
  } catch (e) {
    return sendMessageToTelegramWithContext(context)(`ERROR: ${e.message}`);
  }
}

/**
 * /setenvs - 更新多個設定
 */
export async function commandUpdateUserConfigs(message, command, subcommand, context) {
  try {
    const values = JSON.parse(subcommand);
    const configKeys = Object.keys(context.USER_CONFIG);
    for (const ent of Object.entries(values)) {
      let [key, value] = ent;
      key = ENV_KEY_MAPPER[key] || key;
      if (ENV.LOCK_USER_CONFIG_KEYS.includes(key)) {
        return sendMessageToTelegramWithContext(context)(`Key ${key} is locked`);
      }
      if (!configKeys.includes(key)) {
        return sendMessageToTelegramWithContext(context)(`Key ${key} not found`);
      }
      context.USER_CONFIG.DEFINE_KEYS.push(key);
      mergeEnvironment(context.USER_CONFIG, {
        [key]: value
      });
      console.log("Update user config: ", key, context.USER_CONFIG[key]);
    }
    context.USER_CONFIG.DEFINE_KEYS = Array.from(new Set(context.USER_CONFIG.DEFINE_KEYS));
    await DATABASE.put(
      context.SHARE_CONTEXT.configStoreKey,
      JSON.stringify(trimUserConfig(trimUserConfig(context.USER_CONFIG)))
    );
    return sendMessageToTelegramWithContext(context)("Update user config success");
  } catch (e) {
    return sendMessageToTelegramWithContext(context)(`ERROR: ${e.message}`);
  }
}

/**
 * /delenv - 刪除設定
 */
export async function commandDeleteUserConfig(message, command, subcommand, context) {
  if (ENV.LOCK_USER_CONFIG_KEYS.includes(subcommand)) {
    const msg = `Key ${subcommand} is locked`;
    return sendMessageToTelegramWithContext(context)(msg);
  }
  try {
    context.USER_CONFIG[subcommand] = null;
    context.USER_CONFIG.DEFINE_KEYS = context.USER_CONFIG.DEFINE_KEYS.filter((key) => key !== subcommand);
    await DATABASE.put(
      context.SHARE_CONTEXT.configStoreKey,
      JSON.stringify(trimUserConfig(context.USER_CONFIG))
    );
    return sendMessageToTelegramWithContext(context)("Delete user config success");
  } catch (e) {
    return sendMessageToTelegramWithContext(context)(`ERROR: ${e.message}`);
  }
}

/**
 * /clearenv - 清除所有設定
 */
export async function commandClearUserConfig(message, command, subcommand, context) {
  try {
    await DATABASE.put(
      context.SHARE_CONTEXT.configStoreKey,
      JSON.stringify({})
    );
    return sendMessageToTelegramWithContext(context)("Clear user config success");
  } catch (e) {
    return sendMessageToTelegramWithContext(context)(`ERROR: ${e.message}`);
  }
}

/**
 * /version - 檢查更新
 */
export async function commandFetchUpdate(message, command, subcommand, context) {
  const current = {
    ts: ENV.BUILD_TIMESTAMP,
    sha: ENV.BUILD_VERSION
  };
  try {
    const info = `https://raw.githubusercontent.com/TBXark/ChatGPT-Telegram-Workers/${ENV.UPDATE_BRANCH}/dist/buildinfo.json`;
    const online = await fetch(info).then((r) => r.json());
    const timeFormat = (ts) => {
      return new Date(ts * 1e3).toLocaleString("en-US", {});
    };
    if (current.ts < online.ts) {
      return sendMessageToTelegramWithContext(context)(`New version detected: ${online.sha}(${timeFormat(online.ts)})
Current version: ${current.sha}(${timeFormat(current.ts)})`);
    } else {
      return sendMessageToTelegramWithContext(context)(`Current version: ${current.sha}(${timeFormat(current.ts)}) is up to date`);
    }
  } catch (e) {
    return sendMessageToTelegramWithContext(context)(`ERROR: ${e.message}`);
  }
}

/**
 * /system - 顯示系統狀態
 */
export async function commandSystem(message, command, subcommand, context) {
  let chatAgent = loadChatLLM(context)?.name;
  let imageAgent = loadImageGen(context)?.name;
  
  // 取得 LLM Profile 資訊
  const currentProfileName = getCurrentProfileName(context);
  const currentProfile = getActiveLLMProfile(context);
  
  // 取得使用統計
  const botId = context.SHARE_CONTEXT.currentBotId;
  const stats = await getStats(botId);
  
  const agent = {
    AI_PROVIDER: chatAgent,
    AI_IMAGE_PROVIDER: imageAgent
  };
  
  // 如果使用 LLM Profile，顯示 profile 資訊
  if (currentProfileName && currentProfile) {
    agent.LLM_PROFILE = currentProfileName;
    agent.LLM_PROFILE_NAME = currentProfile.name || currentProfileName;
  }
  
  if (chatModelKey(chatAgent)) {
    agent[chatModelKey(chatAgent)] = currentChatModel(chatAgent, context);
  }
  
  // 如果有臨時覆蓋的 model，也顯示
  if (context.USER_CONFIG.CURRENT_LLM_MODEL) {
    agent.CURRENT_LLM_MODEL = context.USER_CONFIG.CURRENT_LLM_MODEL + " (覆蓋)";
  }
  
  if (imageModelKey(imageAgent)) {
    agent[imageModelKey(imageAgent)] = currentImageModel(imageAgent, context);
  }
  
  // 組合訊息
  let msg = `📊 <b>系統狀態</b>\n`;
  msg += `━━━━━━━━━━━━━━━\n\n`;
  
  // 使用統計
  msg += `👥 <b>使用統計</b>\n`;
  msg += `  • 總使用者數: ${stats.totalUsers}\n`;
  msg += `  • 總群組數: ${stats.totalGroups}\n`;
  msg += `  • 總訊息數: ${stats.totalMessages}\n`;
  msg += `  • 今日訊息數: ${stats.todayMessages}\n\n`;
  
  // AI 設定
  msg += `🤖 <b>AI 設定</b>\n`;
  msg += `<pre>${JSON.stringify(agent, null, 2)}</pre>\n`;
  
  if (ENV.DEV_MODE) {
    const shareCtx = { ...context.SHARE_CONTEXT };
    shareCtx.currentBotToken = "******";
    context.USER_CONFIG.OPENAI_API_KEY = ["******"];
    context.USER_CONFIG.AZURE_API_KEY = "******";
    context.USER_CONFIG.AZURE_COMPLETIONS_API = "******";
    context.USER_CONFIG.AZURE_DALLE_API = "******";
    context.USER_CONFIG.CLOUDFLARE_ACCOUNT_ID = "******";
    context.USER_CONFIG.CLOUDFLARE_TOKEN = "******";
    context.USER_CONFIG.GOOGLE_API_KEY = "******";
    // 隱藏 LLM_PROFILES 中的 API Keys
    if (context.USER_CONFIG.LLM_PROFILES) {
      const maskedProfiles = {};
      for (const [name, profile] of Object.entries(context.USER_CONFIG.LLM_PROFILES)) {
        maskedProfiles[name] = { ...profile, apiKey: "******" };
      }
      context.USER_CONFIG.LLM_PROFILES = maskedProfiles;
    }
    const config = trimUserConfig(context.USER_CONFIG);
    msg += `\n<b>USER_CONFIG:</b>\n<pre>${JSON.stringify(config, null, 2)}</pre>\n`;
    msg += `<b>CHAT_CONTEXT:</b>\n<pre>${JSON.stringify(context.CURRENT_CHAT_CONTEXT, null, 2)}</pre>\n`;
    msg += `<b>SHARE_CONTEXT:</b>\n<pre>${JSON.stringify(shareCtx, null, 2)}</pre>\n`;
  }
  
  context.CURRENT_CHAT_CONTEXT.parse_mode = "HTML";
  return sendMessageToTelegramWithContext(context)(msg);
}

/**
 * /redo - 重新生成回覆
 */
export async function commandRegenerate(message, command, subcommand, context) {
  const mf = (history, text) => {
    let nextText = text;
    if (!(history && Array.isArray(history) && history.length > 0)) {
      throw new Error("History not found");
    }
    const historyCopy = structuredClone(history);
    while (true) {
      const data = historyCopy.pop();
      if (data === void 0 || data === null) {
        break;
      } else if (data.role === "user") {
        if (text === "" || text === void 0 || text === null) {
          nextText = data.content;
        }
        break;
      }
    }
    if (subcommand) {
      nextText = subcommand;
    }
    return { history: historyCopy, message: nextText };
  };
  return chatWithLLM({ message: null }, context, mf);
}

/**
 * /echo - 回顯訊息（除錯用）
 */
export async function commandEcho(message, command, subcommand, context) {
  let msg = "<pre>";
  msg += JSON.stringify({ message }, null, 2);
  msg += "</pre>";
  context.CURRENT_CHAT_CONTEXT.parse_mode = "HTML";
  return sendMessageToTelegramWithContext(context)(msg);
}
