/**
 * LLM 切換指令模組
 * 支援在多個 OpenAI API 相容服務之間切換
 */

import { sendMessageToTelegramWithContext, sendChatActionToTelegramWithContext } from '../telegram/telegram.js';
import { DATABASE } from '../config/env.js';
import { getAllLLMProfiles, getCurrentProfileName, getActiveLLMProfile } from '../agent/agents.js';

/**
 * 清理使用者配置（移除空值）
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
 * 處理 LLM 切換的 callback query（按鈕點擊）
 */
export async function handleLLMChangeCallback(message, context) {
  const callbackData = message.callback_query?.data;
  if (!callbackData || !callbackData.startsWith('/llmchange:')) {
    return null;
  }
  
  const targetProfile = callbackData.replace('/llmchange:', '');
  const profiles = getAllLLMProfiles(context);
  
  if (!profiles[targetProfile]) {
    return sendMessageToTelegramWithContext(context)(`❌ 找不到 Profile: ${targetProfile}`);
  }
  
  try {
    // 更新使用者配置
    context.USER_CONFIG.CURRENT_LLM_PROFILE = targetProfile;
    context.USER_CONFIG.DEFINE_KEYS = context.USER_CONFIG.DEFINE_KEYS || [];
    
    if (!context.USER_CONFIG.DEFINE_KEYS.includes("CURRENT_LLM_PROFILE")) {
      context.USER_CONFIG.DEFINE_KEYS.push("CURRENT_LLM_PROFILE");
    }
    
    // 清除之前的 model 覆蓋
    context.USER_CONFIG.CURRENT_LLM_MODEL = null;
    context.USER_CONFIG.DEFINE_KEYS = context.USER_CONFIG.DEFINE_KEYS.filter(k => k !== "CURRENT_LLM_MODEL");
    
    // 設定 AI_PROVIDER 為 openai（使用 OpenAI 相容模式）
    context.USER_CONFIG.AI_PROVIDER = "openai";
    if (!context.USER_CONFIG.DEFINE_KEYS.includes("AI_PROVIDER")) {
      context.USER_CONFIG.DEFINE_KEYS.push("AI_PROVIDER");
    }
    
    // 儲存到 DATABASE
    await DATABASE.put(
      context.SHARE_CONTEXT.configStoreKey,
      JSON.stringify(trimUserConfig(context.USER_CONFIG))
    );
    
    const profile = profiles[targetProfile];
    const currentModel = profile.model || "未設定";
    
    let msg = `✅ 已切換到 \`${targetProfile}\`\n`;
    msg += `📦 模型: \`${currentModel}\``;
    
    context.CURRENT_CHAT_CONTEXT.parse_mode = "Markdown";
    return sendMessageToTelegramWithContext(context)(msg);
    
  } catch (e) {
    return sendMessageToTelegramWithContext(context)(`❌ 錯誤: ${e.message}`);
  }
}

/**
 * /llmchange [profile]
 * 
 * 使用範例：
 *   /llmchange              → 顯示按鈕選單讓使用者選擇
 *   /llmchange gemini       → 直接切換到 Gemini
 */
export async function commandLLMChange(message, command, subcommand, context) {
  const profiles = getAllLLMProfiles(context);
  const profileNames = Object.keys(profiles);
  
  // 如果沒有參數，顯示按鈕選單
  if (!subcommand || subcommand.trim() === "") {
    return showLLMStatusWithButtons(context, profiles, profileNames);
  }
  
  // 解析參數
  const args = subcommand.trim().split(/\s+/);
  const targetProfile = args[0].toLowerCase();
  
  // 檢查 profile 是否存在
  if (!profileNames.includes(targetProfile)) {
    let msg = `❌ 找不到 Profile: \`${targetProfile}\`\n\n`;
    msg += `可用的 Profiles:\n`;
    for (const name of profileNames) {
      const profile = profiles[name];
      msg += `• \`${name}\` - ${profile.name || name}\n`;
    }
    return sendMessageToTelegramWithContext(context)(msg);
  }
  
  try {
    // 更新使用者配置
    context.USER_CONFIG.CURRENT_LLM_PROFILE = targetProfile;
    context.USER_CONFIG.DEFINE_KEYS = context.USER_CONFIG.DEFINE_KEYS || [];
    
    if (!context.USER_CONFIG.DEFINE_KEYS.includes("CURRENT_LLM_PROFILE")) {
      context.USER_CONFIG.DEFINE_KEYS.push("CURRENT_LLM_PROFILE");
    }
    
    // 清除之前的 model 覆蓋
    context.USER_CONFIG.CURRENT_LLM_MODEL = null;
    context.USER_CONFIG.DEFINE_KEYS = context.USER_CONFIG.DEFINE_KEYS.filter(k => k !== "CURRENT_LLM_MODEL");
    
    // 設定 AI_PROVIDER 為 openai（使用 OpenAI 相容模式）
    context.USER_CONFIG.AI_PROVIDER = "openai";
    if (!context.USER_CONFIG.DEFINE_KEYS.includes("AI_PROVIDER")) {
      context.USER_CONFIG.DEFINE_KEYS.push("AI_PROVIDER");
    }
    
    // 儲存到 DATABASE
    await DATABASE.put(
      context.SHARE_CONTEXT.configStoreKey,
      JSON.stringify(trimUserConfig(context.USER_CONFIG))
    );
    
    // 取得目前使用的 model
    const profile = profiles[targetProfile];
    const currentModel = profile.model || "未設定";
    
    let msg = `✅ 已切換到 \`${targetProfile}\`\n`;
    msg += `📦 模型: \`${currentModel}\``;
    
    context.CURRENT_CHAT_CONTEXT.parse_mode = "Markdown";
    return sendMessageToTelegramWithContext(context)(msg);
    
  } catch (e) {
    return sendMessageToTelegramWithContext(context)(`❌ 錯誤: ${e.message}`);
  }
}

/**
 * 顯示目前 LLM 狀態和按鈕選單
 */
async function showLLMStatusWithButtons(context, profiles, profileNames) {
  const currentProfileName = getCurrentProfileName(context);
  const currentProfile = getActiveLLMProfile(context);
  const currentModel = context.USER_CONFIG.CURRENT_LLM_MODEL 
                    || (currentProfile ? currentProfile.model : null)
                    || context.USER_CONFIG.OPENAI_CHAT_MODEL
                    || "未設定";
  
  // 組合訊息
  let msg = `🤖 *目前 LLM 設定*\n`;
  msg += `━━━━━━━━━━━━━━━\n`;
  
  if (currentProfileName && currentProfile) {
    msg += `📍 目前使用: \`${currentProfileName}\`\n`;
    msg += `📦 模型: \`${currentModel}\`\n`;
  } else {
    msg += `📍 目前使用: *預設*\n`;
  }
  
  // 顯示所有可用的 Profiles 詳細資訊
  msg += `\n*可用的 Profiles:*\n`;
  for (const name of profileNames) {
    const profile = profiles[name];
    const isActive = name === currentProfileName;
    const prefix = isActive ? "✓" : "•";
    msg += `${prefix} \`${name}\` - ${profile.name || name}`;
    if (profile.model) {
      msg += ` (${profile.model})`;
    }
    msg += `\n`;
  }
  
  // 手動切換說明
  msg += `\n*手動切換方式:*\n`;
  msg += `/llmchange <profile>\n`;
  msg += `/llmchange <profile> <model>\n`;
  msg += `例: \`/llmchange gemini\`\n`;
  msg += `例: \`/llmchange openai gpt-4o\`\n`;
  
  msg += `\n請選擇要切換的 LLM：`;
  
  // 建立 inline keyboard 按鈕（每行 2 個按鈕）
  const buttons = [];
  let row = [];
  
  for (let i = 0; i < profileNames.length; i++) {
    const name = profileNames[i];
    const profile = profiles[name];
    const isActive = name === currentProfileName;
    const displayName = profile.name || name;
    const label = isActive ? `✓ ${displayName}` : displayName;
    
    row.push({
      text: label,
      callback_data: `/llmchange:${name}`
    });
    
    // 每 2 個按鈕換一行
    if (row.length === 2 || i === profileNames.length - 1) {
      buttons.push(row);
      row = [];
    }
  }
  
  // 設定 inline keyboard
  context.CURRENT_CHAT_CONTEXT.reply_markup = JSON.stringify({
    inline_keyboard: buttons
  });
  
  context.CURRENT_CHAT_CONTEXT.parse_mode = "Markdown";
  return sendMessageToTelegramWithContext(context)(msg);
}
