/**
 * AI Agent 管理
 * 統一管理所有 AI 服務提供商
 */

import { isOpenAIEnable, isOpenAIImageEnable, requestCompletionsFromOpenAI, requestImageFromOpenAI } from './openai.js';
import { isGeminiAIEnable, isGeminiImageEnable, requestCompletionsFromGeminiAI, requestImageFromGemini } from './gemini.js';
import { ENV } from '../config/env.js';

// ========== LLM Profile 工具函數 ==========

/**
 * 從環境變數取得 API Key
 * @param {Object} profile - Profile 物件
 * @param {Object} context - 上下文物件
 * @returns {string} API Key
 */
export function getProfileApiKey(profile, context) {
  if (!profile) return null;
  
  // 如果 profile 有直接的 apiKey，使用它
  if (profile.apiKey) {
    return profile.apiKey;
  }
  
  // 如果 profile 有 apiKeyEnv，從環境變數讀取
  if (profile.apiKeyEnv) {
    const envVarName = profile.apiKeyEnv;
    
    // 1. 從 ENV 直接讀取（wrangler.toml 中的 vars）
    if (ENV[envVarName]) {
      const key = ENV[envVarName];
      if (Array.isArray(key) && key.length > 0) {
        return key[0];
      }
      if (key) return key;
    }
    
    // 2. 從 USER_CONFIG 讀取（包含 merge 過的環境變數）
    if (context.USER_CONFIG && context.USER_CONFIG[envVarName]) {
      const key = context.USER_CONFIG[envVarName];
      if (Array.isArray(key) && key.length > 0) {
        return key[0];
      }
      if (key) return key;
    }
    
    // 3. 從 ENV.USER_CONFIG 讀取
    if (ENV.USER_CONFIG && ENV.USER_CONFIG[envVarName]) {
      const key = ENV.USER_CONFIG[envVarName];
      if (Array.isArray(key) && key.length > 0) {
        return key[0];
      }
      if (key) return key;
    }
    
    console.log(`[getProfileApiKey] Could not find API key for: ${envVarName}`);
  }
  
  return null;
}

/**
 * 取得目前啟用的 LLM Profile
 * @param {Object} context - 上下文物件
 * @returns {Object|null} Profile 物件或 null
 */
export function getActiveLLMProfile(context) {
  const profileName = context.USER_CONFIG.CURRENT_LLM_PROFILE 
                   || context.USER_CONFIG.DEFAULT_LLM_PROFILE;
  
  if (!profileName) return null;
  
  const profiles = context.USER_CONFIG.LLM_PROFILES || {};
  return profiles[profileName] || null;
}

/**
 * 取得目前使用的 Profile 名稱
 * @param {Object} context - 上下文物件
 * @returns {string} Profile 名稱
 */
export function getCurrentProfileName(context) {
  return context.USER_CONFIG.CURRENT_LLM_PROFILE 
      || context.USER_CONFIG.DEFAULT_LLM_PROFILE 
      || "";
}

/**
 * 取得所有可用的 LLM Profiles
 * @param {Object} context - 上下文物件
 * @returns {Object} Profiles 物件
 */
export function getAllLLMProfiles(context) {
  return context.USER_CONFIG.LLM_PROFILES || {};
}

// TODO: 導入其他 AI 服務
// import { isAzureEnable, requestCompletionsFromAzureOpenAI } from './azure.js';
// import { isWorkersAIEnable, requestCompletionsFromWorkersAI } from './workersai.js';
// import { isMistralAIEnable, requestCompletionsFromMistralAI } from './mistralai.js';
// import { isCohereAIEnable, requestCompletionsFromCohereAI } from './cohere.js';
// import { isAnthropicAIEnable, requestCompletionsFromAnthropicAI } from './anthropic.js';

// ========== Chat LLM Agents ==========

export const chatLlmAgents = [
  // TODO: 加入其他服務後解除註解
  // {
  //   name: "azure",
  //   enable: isAzureEnable,
  //   request: requestCompletionsFromAzureOpenAI
  // },
  {
    name: "openai",
    enable: isOpenAIEnable,
    request: requestCompletionsFromOpenAI
  },
  // {
  //   name: "workers",
  //   enable: isWorkersAIEnable,
  //   request: requestCompletionsFromWorkersAI
  // },
  {
    name: "gemini",
    enable: isGeminiAIEnable,
    request: requestCompletionsFromGeminiAI
  },
  // {
  //   name: "mistral",
  //   enable: isMistralAIEnable,
  //   request: requestCompletionsFromMistralAI
  // },
  // {
  //   name: "cohere",
  //   enable: isCohereAIEnable,
  //   request: requestCompletionsFromCohereAI
  // },
  // {
  //   name: "anthropic",
  //   enable: isAnthropicAIEnable,
  //   request: requestCompletionsFromAnthropicAI
  // }
];

// ========== Image Generation Agents ==========

export const imageGenAgents = [
  // {
  //   name: "azure",
  //   enable: isAzureImageEnable,
  //   request: requestImageFromAzureOpenAI
  // },
  {
    name: "openai",
    enable: isOpenAIImageEnable,
    request: requestImageFromOpenAI
  },
  {
    name: "gemini",
    enable: isGeminiImageEnable,
    request: requestImageFromGemini
  },
  // {
  //   name: "workers",
  //   enable: isWorkersAIEnable,
  //   request: requestImageFromWorkersAI
  // }
];

// ========== 工具函數 ==========

export function currentChatModel(agentName, context) {
  // 如果使用 LLM Profile
  if (agentName === "openai") {
    const profile = getActiveLLMProfile(context);
    if (profile) {
      // 如果有臨時覆蓋的 model
      if (context.USER_CONFIG.CURRENT_LLM_MODEL) {
        return context.USER_CONFIG.CURRENT_LLM_MODEL;
      }
      return profile.model || context.USER_CONFIG.OPENAI_CHAT_MODEL;
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

export function chatModelKey(agentName) {
  switch (agentName) {
    case "openai":
      return "OPENAI_CHAT_MODEL";
    case "gemini":
      return "GOOGLE_COMPLETIONS_MODEL";
    default:
      return null;
  }
}

export function loadChatLLM(context) {
  // 優先使用指定的 AI_PROVIDER
  for (const llm of chatLlmAgents) {
    if (llm.name === context.USER_CONFIG.AI_PROVIDER) {
      return llm;
    }
  }
  
  // 自動選擇第一個可用的
  for (const llm of chatLlmAgents) {
    if (llm.enable(context)) {
      return llm;
    }
  }
  
  return null;
}

/**
 * 檢查 Workers AI 是否啟用
 */
export function isWorkersAIEnable(context) {
  return context.USER_CONFIG.AI_IMAGE_PROVIDER === 'workers';
}

/**
 * 從 Workers AI 請求圖片生成
 */
export async function requestImageFromWorkersAI(prompt, context) {
  // Workers AI 圖片生成實現
  const ai = context.AI_BINDING;
  if (!ai) {
    throw new Error('Workers AI binding not available');
  }
  
  const response = await ai.run('@cf/stabilityai/stable-diffusion-xl-base-1.0', {
    prompt: prompt
  });
  
  return response;
}

export function loadImageGen(context) {
  console.log(`[DEBUG] loadImageGen called with AI_IMAGE_PROVIDER: ${context.USER_CONFIG.AI_IMAGE_PROVIDER}`);
  
  // 優先使用指定的 AI_IMAGE_PROVIDER
  for (const imgGen of imageGenAgents) {
    console.log(`[DEBUG] Checking if ${imgGen.name} === ${context.USER_CONFIG.AI_IMAGE_PROVIDER}`);
    if (imgGen.name === context.USER_CONFIG.AI_IMAGE_PROVIDER) {
      console.log(`[DEBUG] Found matching provider: ${imgGen.name}`);
      return imgGen;
    }
  }
  
  // 自動選擇第一個可用的
  console.log(`[DEBUG] No matching provider found, checking enable() functions...`);
  for (const imgGen of imageGenAgents) {
    const enabled = imgGen.enable(context);
    console.log(`[DEBUG] ${imgGen.name}.enable() = ${enabled}`);
    if (enabled) {
      console.log(`[DEBUG] Selected auto provider: ${imgGen.name}`);
      return imgGen;
    }
  }
  
  console.log(`[DEBUG] No enabled provider found`);
  return null;
}

export function currentImageModel(agentName, context) {
  switch (agentName) {
    // case "azure":
    //   try {
    //     const url = new URL(context.USER_CONFIG.AZURE_DALLE_API);
    //     return url.pathname.split("/")[3];
    //   } catch {
    //     return context.USER_CONFIG.AZURE_DALLE_API;
    //   }
    case "openai":
      // 檢查是否使用 gpt-image-1
      if (context.USER_CONFIG.DALL_E_MODEL === "gpt-image-1" || 
          context.USER_CONFIG.GPT_IMAGE_MODEL === "gpt-image-1") {
        return "gpt-image-1";
      }
      return context.USER_CONFIG.DALL_E_MODEL;
    case "gemini":
      return context.USER_CONFIG.GEMINI_IMAGE_MODEL;
    // case "workers":
    //   return context.USER_CONFIG.WORKERS_IMAGE_MODEL;
    default:
      return null;
  }
}

export function imageModelKey(agentName) {
  switch (agentName) {
    // case "azure":
    //   return "AZURE_DALLE_API";
    case "openai":
      return "DALL_E_MODEL";
    case "gemini":
      return "GEMINI_IMAGE_MODEL";
    // case "workers":
    //   return "WORKERS_IMAGE_MODEL";
    default:
      return null;
  }
}
