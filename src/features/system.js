// 系統指令模組
import { sendMessageToTelegramWithContext, buildInlineKeyboard } from '../telegram/telegram.js';
import { loadChatLLM, loadImageGen, getActiveLLMProfile, getCurrentProfileName } from '../agent/agents.js';
import { loadHistory } from '../agent/llm.js';
import { chatWithLLM } from '../agent/llm.js';
import { getStats } from '../utils/stats.js';
import { escapeHTML } from '../utils/utils.js';
import { trimUserConfig } from '../telegram/context.js';

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
  // 如果使用 LLM Profile，統一顯示為 LLM_MODEL
  switch (agentName) {
    case "openai":
      return "OPENAI_CHAT_MODEL";
    case "gemini":
      return "GOOGLE_COMPLETIONS_MODEL";
    case "workers":
      return "WORKERS_CHAT_MODEL";
    default:
      return null;
  }
}

/**
 * 取得當前聊天模型
 */
function currentChatModel(agentName, context) {
  // LLM Profiles 目前只代表 OpenAI-compatible endpoints。
  if (agentName === "openai") {
    const profile = getActiveLLMProfile(context);
    if (context.USER_CONFIG.CURRENT_LLM_MODEL) {
      return context.USER_CONFIG.CURRENT_LLM_MODEL;
    }
    if (profile && profile.model) {
      return profile.model;
    }
  }

  // 否則使用環境變數的預設值
  switch (agentName) {
    case "openai":
      return context.USER_CONFIG.OPENAI_CHAT_MODEL;
    case "gemini":
      return context.USER_CONFIG.GOOGLE_COMPLETIONS_MODEL;
    case "workers":
      return context.USER_CONFIG.WORKERS_CHAT_MODEL;
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
      return context.USER_CONFIG.DALL_E_MODEL || "codex/gpt-image-2";
    case "gemini":
      return context.USER_CONFIG.GEMINI_IMAGE_MODEL || "gemini-3-pro-image-preview";
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
    const info = `https://raw.githubusercontent.com/tbdavid2019/Telegram-bot-cfWorkers/${ENV.UPDATE_BRANCH}/dist/buildinfo.json`;
    const online = await fetch(info).then((r) => r.json());
    const timeFormat = (ts) => {
      return new Date(ts * 1e3).toLocaleString("en-US", {});
    };
    if (context) {
      if (!context.CURRENT_CHAT_CONTEXT) {
        context.CURRENT_CHAT_CONTEXT = {};
      }
      context.CURRENT_CHAT_CONTEXT.parse_mode = "HTML";
    }
    if (current.ts < online.ts) {
      const msg = `🚀 <b>發現新版本</b>\n\n<pre><code>線上版本: ${escapeHTML(online.sha)} (${escapeHTML(timeFormat(online.ts))})\n當前版本: ${escapeHTML(current.sha)} (${escapeHTML(timeFormat(current.ts))})</code></pre>`;
      return sendMessageToTelegramWithContext(context)(msg);
    } else {
      const msg = `✅ <b>系統已是最新版本</b>\n\n<pre><code>當前版本: ${escapeHTML(current.sha)} (${escapeHTML(timeFormat(current.ts))})</code></pre>`;
      return sendMessageToTelegramWithContext(context)(msg);
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
  const stats = await getStats(botId, context);

  const agent = {
    MODEL_PROVIDER: chatAgent,
    AI_IMAGE_PROVIDER: imageAgent
  };

  // 如果使用 LLM Profile，顯示 profile 資訊（這是主要的模型來源）
  if (currentProfileName && currentProfile) {
    agent.LLM_PROFILE = currentProfileName;
    agent.LLM_PROFILE_NAME = currentProfile.name || currentProfileName;
    agent.LLM_MODEL = currentProfile.model || "未設定";

  } else {
    // 沒有使用 LLM Profile，顯示傳統的環境變數設定
    if (chatModelKey(chatAgent)) {
      agent[chatModelKey(chatAgent)] = currentChatModel(chatAgent, context);
    }
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
    
    // 複製並全面遮蔽敏感金鑰
    const maskedUserConfig = { ...context.USER_CONFIG };
    const sensitiveKeys = [
      'OPENAI_API_KEY', 'OPENAI_API_KEY2', 'AZURE_API_KEY', 'AZURE_COMPLETIONS_API', 'AZURE_DALLE_API',
      'CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_TOKEN', 'GOOGLE_API_KEY', 'OPENROUTER_API_KEY',
      'AIURL_API_KEY', 'XIAOMI_API_KEY', 'BEDROCK_API_KEY', 'GROQ_API_KEY', 'ASR_API_KEY', 'TTS_API_KEY',
      'OPENAI_IMAGE_API_KEY', 'GEMINI_IMAGE_API_KEY', 'BOX_API_TOKEN', 'WIKI_API_PASSWORD',
      'GOOGLE_MAPS_API_KEY', 'GOOGLE_SHEETS_SERVICE_ACCOUNT', 'A2A_SECRET', 'INIT_SECRET'
    ];
    for (const key of sensitiveKeys) {
      if (maskedUserConfig[key]) {
        maskedUserConfig[key] = "******";
      }
    }
    // 隱藏 LLM_PROFILES 中的 API Keys
    if (maskedUserConfig.LLM_PROFILES) {
      const maskedProfiles = {};
      for (const [name, profile] of Object.entries(maskedUserConfig.LLM_PROFILES)) {
        maskedProfiles[name] = { ...profile, apiKey: "******" };
      }
      maskedUserConfig.LLM_PROFILES = maskedProfiles;
    }
    const config = trimUserConfig(maskedUserConfig);
    msg += `\n<b>USER_CONFIG:</b>\n<pre>${escapeHTML(JSON.stringify(config, null, 2))}</pre>\n`;
    msg += `<b>CHAT_CONTEXT:</b>\n<pre>${escapeHTML(JSON.stringify(context.CURRENT_CHAT_CONTEXT, null, 2))}</pre>\n`;
    msg += `<b>SHARE_CONTEXT:</b>\n<pre>${escapeHTML(JSON.stringify(shareCtx, null, 2))}</pre>\n`;
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

/**
 * /getid - 取得使用者 ID
 */
export async function commandGetID(message, command, subcommand, context) {
  const userId = message.from.id;
  const username = [message?.from?.first_name, message?.from?.last_name].filter(Boolean).join(' ');
  const safeName = escapeHTML(username);
  let msg = `👤 <b>${safeName}</b>\n\n<pre><code>User ID: ${userId}</code></pre>`;
  if (context) {
    if (!context.CURRENT_CHAT_CONTEXT) {
      context.CURRENT_CHAT_CONTEXT = {};
    }
    context.CURRENT_CHAT_CONTEXT.parse_mode = "HTML";
  }
  return sendMessageToTelegramWithContext(context)(msg);
}

/**
 * /getgroupid - 取得群組 ID
 */
export async function commandGetGroupID(message, command, subcommand, context) {
  const chatType = message.chat.type;
  const username = [message?.from?.first_name, message?.from?.last_name].filter(Boolean).join(' ');
  const safeName = escapeHTML(username);
  if (context) {
    if (!context.CURRENT_CHAT_CONTEXT) {
      context.CURRENT_CHAT_CONTEXT = {};
    }
    context.CURRENT_CHAT_CONTEXT.parse_mode = "HTML";
  }
  if (chatType === 'private') {
    // 私聊時顯示說明
    let msg = `👤 <b>${safeName}</b>\n\n`;
    msg += `In order to get the ID of a group or channel, you need to do one of the following:\n`;
    msg += `• Add me to a group or channel you want to get the ID of, and send /getgroupid in the group\n`;
    msg += `• Another option is to forward a message from the group (if the bot is allowed to see it).`;
    return sendMessageToTelegramWithContext(context)(msg);
  } else {
    // 群組中顯示 ID
    const chatId = message.chat.id;
    const chatTitle = message.chat.title || message.chat.username || '群組';
    const safeTitle = escapeHTML(chatTitle);
    let msg = `👥 <b>${safeTitle}</b>\n\n<pre><code>Group ID: ${chatId}</code></pre>`;
    return sendMessageToTelegramWithContext(context)(msg);
  }
}

/**
 * /menu - 萬用導航 Rich Menu
 * 支援分類按鈕矩陣快速呼叫命理、天氣、AI創作與財經查詢
 */
export async function commandMenu(message, command, subcommand, context) {
  if (context) {
    if (!context.CURRENT_CHAT_CONTEXT) {
      context.CURRENT_CHAT_CONTEXT = {};
    }
    context.CURRENT_CHAT_CONTEXT.parse_mode = 'HTML';
    context.CURRENT_CHAT_CONTEXT.reply_markup = buildInlineKeyboard([
      // 🔮 命理占卜
      [
        { text: '📖 解答之書', callback_data: '/boa' },
        { text: '⛩️ 淺草籤詩', callback_data: '/oracle' }
      ],
      [
        { text: '🎴 每日塔羅', callback_data: '/tarot:1' },
        { text: '🧭 奇門遁甲', callback_data: '/qi' }
      ],
      // ⛅ 生活天氣
      [
        { text: '📍 台北', callback_data: '/wt:台北' },
        { text: '📍 台中', callback_data: '/wt:台中' },
        { text: '📍 高雄', callback_data: '/wt:高雄' }
      ],
      [
        { text: '⚠️ 天氣特報', callback_data: '/weatheralert' }
      ],
      // 🎨 AI 創作
      [
        { text: '🎨 AI生圖', callback_data: '/img' },
        { text: '⚙️ 切換模型', callback_data: '/setimg' }
      ],
      // 📈 財經查詢
      [
        { text: '📈 台股大盤', callback_data: '/stock:0050' },
        { text: '💼 護國神山', callback_data: '/stock:2330' }
      ]
    ]);
  }

  const menuText =
    `✨ <b>【功能快捷導航選單】</b>\n\n` +
    `請點選下方按鈕快速體驗各項功能：\n\n` +
    `🔮 <b>命理占卜：</b>解答之書、淺草觀音籤、每日塔羅牌、奇門遁甲\n` +
    `⛅ <b>生活天氣：</b>全台主要城市即時預報、即時天氣警報特報\n` +
    `🎨 <b>AI 創作：</b>文字/多模態圖片生成與服務切換\n` +
    `📈 <b>財經查詢：</b>台股 0050、2330 台積電即時盤勢\n\n` +
    `💡 <i>隨時輸入 /menu 即可再次喚起此快捷導航。</i>`;

  return sendMessageToTelegramWithContext(context)(menuText);
}
