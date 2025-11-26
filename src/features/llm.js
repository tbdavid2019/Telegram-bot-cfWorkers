/**
 * LLM 切換指令模組
 * 支援在多個 OpenAI API 相容服務之間切換
 */

import { sendMessageToTelegramWithContext } from '../telegram/telegram.js';
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
 * /llmchange [profile] [model]
 * 
 * 使用範例：
 *   /llmchange              → 列出所有可用 profiles 和目前設定
 *   /llmchange groq         → 切換到 Groq（使用該 profile 預設的 model）
 *   /llmchange openai gpt-4-turbo → 切換到 OpenAI 並指定 model
 *   /llmchange groq mixtral-8x7b-32768 → 切換到 Groq 並覆蓋 model
 */
export async function commandLLMChange(message, command, subcommand, context) {
  const profiles = getAllLLMProfiles(context);
  const profileNames = Object.keys(profiles);
  
  // 如果沒有參數，顯示目前設定和可用選項
  if (!subcommand || subcommand.trim() === "") {
    return showLLMStatus(context, profiles, profileNames);
  }
  
  // 解析參數
  const args = subcommand.trim().split(/\s+/);
  const targetProfile = args[0].toLowerCase();
  const targetModel = args[1] || null;
  
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
    
    // 如果有指定 model，則覆蓋
    if (targetModel) {
      context.USER_CONFIG.CURRENT_LLM_MODEL = targetModel;
      if (!context.USER_CONFIG.DEFINE_KEYS.includes("CURRENT_LLM_MODEL")) {
        context.USER_CONFIG.DEFINE_KEYS.push("CURRENT_LLM_MODEL");
      }
    } else {
      // 清除之前的 model 覆蓋
      context.USER_CONFIG.CURRENT_LLM_MODEL = null;
      context.USER_CONFIG.DEFINE_KEYS = context.USER_CONFIG.DEFINE_KEYS.filter(k => k !== "CURRENT_LLM_MODEL");
    }
    
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
    const currentModel = targetModel || profile.model || "未設定";
    
    let msg = `✅ 已切換到 \`${targetProfile}\`\n`;
    msg += `📦 模型: \`${currentModel}\``;
    
    if (targetModel && profile.model && targetModel !== profile.model) {
      msg += ` (覆蓋預設: ${profile.model})`;
    }
    
    return sendMessageToTelegramWithContext(context)(msg);
    
  } catch (e) {
    return sendMessageToTelegramWithContext(context)(`❌ 錯誤: ${e.message}`);
  }
}

/**
 * 顯示目前 LLM 狀態和可用選項
 */
async function showLLMStatus(context, profiles, profileNames) {
  const currentProfileName = getCurrentProfileName(context);
  const currentProfile = getActiveLLMProfile(context);
  const currentModel = context.USER_CONFIG.CURRENT_LLM_MODEL 
                    || (currentProfile ? currentProfile.model : null)
                    || context.USER_CONFIG.OPENAI_CHAT_MODEL
                    || "未設定";
  
  let msg = `🤖 *LLM 設定*\n`;
  msg += `━━━━━━━━━━━━━━━\n`;
  
  if (currentProfileName && currentProfile) {
    msg += `📍 目前使用: \`${currentProfileName}\`\n`;
    msg += `📦 模型: \`${currentModel}\`\n`;
    if (context.USER_CONFIG.CURRENT_LLM_MODEL) {
      msg += `⚡ (已覆蓋預設模型)\n`;
    }
  } else if (context.USER_CONFIG.AI_PROVIDER === "gemini") {
    msg += `📍 目前使用: \`gemini\` (獨立模式)\n`;
    msg += `📦 模型: \`${context.USER_CONFIG.GOOGLE_COMPLETIONS_MODEL || "未設定"}\`\n`;
  } else if (context.USER_CONFIG.OPENAI_API_KEY?.length > 0) {
    msg += `📍 目前使用: 預設 OpenAI\n`;
    msg += `📦 模型: \`${context.USER_CONFIG.OPENAI_CHAT_MODEL || "未設定"}\`\n`;
  } else {
    msg += `⚠️ 尚未設定 LLM\n`;
  }
  
  msg += `\n`;
  
  if (profileNames.length > 0) {
    msg += `*可用的 Profiles:*\n`;
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
  } else {
    msg += `⚠️ 尚未設定任何 LLM Profile\n`;
    msg += `請在環境變數中設定 \`LLM\\_PROFILES\`\n`;
  }
  
  msg += `\n`;
  msg += `*使用方式:*\n`;
  msg += `/llmchange <profile> [model]\n`;
  msg += `例: \`/llmchange groq\`\n`;
  msg += `例: \`/llmchange openai gpt-4-turbo\`\n`;
  
  context.CURRENT_CHAT_CONTEXT.parse_mode = "Markdown";
  return sendMessageToTelegramWithContext(context)(msg);
}
