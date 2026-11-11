/**
 * OpenAI API 相關功能
 * 包含 Chat Completions 和 DALL-E / GPT-Image 圖片生成
 * 支援 LLM Profiles (多個 OpenAI 相容服務)
 */

import { ENV } from '../config/env.js';
import { requestChatCompletions } from './request.js';
import { imageToBase64String, renderBase64DataURI } from '../utils/image.js';
import { getProfileApiKey } from './agents.js';
import { getActiveLLMProfile, getAllLLMProfiles } from './profiles.js';

// ========== API Key 管理 ==========

/**
 * 從 context 取得 OpenAI API Key
 * 優先使用 LLM Profile 的設定
 */
export function openAIKeyFromContext(context) {
  // 優先使用 LLM Profile
  const profile = getActiveLLMProfile(context);
  if (profile) {
    const apiKey = getProfileApiKey(profile, context);
    if (apiKey) return apiKey;
  }
  
  // 回退到原本的設定
  if (context.USER_CONFIG.OPENAI_API_KEY && context.USER_CONFIG.OPENAI_API_KEY.length > 0) {
    const length = context.USER_CONFIG.OPENAI_API_KEY.length;
    return context.USER_CONFIG.OPENAI_API_KEY[Math.floor(Math.random() * length)];
  }
  
  return null;
}

/**
 * 從 context 取得 API Base URL
 * 優先使用 LLM Profile 的設定
 */
export function getOpenAIApiBase(context) {
  // 優先使用 LLM Profile
  const profile = getActiveLLMProfile(context);
  if (profile && profile.apiBase) {
    return profile.apiBase;
  }
  
  // 回退到原本的設定
  return context.USER_CONFIG.OPENAI_API_BASE;
}

/**
 * 從 context 取得 Chat Model
 * 優先使用臨時覆蓋的 model，其次是 LLM Profile，最後是預設設定
 */
export function getOpenAIChatModel(context) {
  // 優先使用臨時覆蓋的 model
  if (context.USER_CONFIG.CURRENT_LLM_MODEL) {
    return context.USER_CONFIG.CURRENT_LLM_MODEL;
  }
  
  // 其次使用 LLM Profile
  const profile = getActiveLLMProfile(context);
  if (profile && profile.model) {
    return profile.model;
  }
  
  // 回退到原本的設定
  return context.USER_CONFIG.OPENAI_CHAT_MODEL;
}

export function openAIImageKeyFromContext(context) {
  const imageBase = getOpenAIImageApiBase(context);
  const isAiurl = imageBase?.includes('aiurl.tw');

  // 1. 如果有專門的圖片 API Key 且非空，優先使用
  const rawKey = context?.USER_CONFIG?.OPENAI_IMAGE_API_KEY;
  const imageKeys = Array.isArray(rawKey)
    ? rawKey.filter(k => typeof k === 'string' && k.trim() !== '')
    : (typeof rawKey === 'string' && rawKey.trim() !== '' ? [rawKey.trim()] : []);

  if (imageKeys.length > 0) {
    return imageKeys[Math.floor(Math.random() * imageKeys.length)];
  }

  // 2. 若為 aiurl 端點，僅能使用 AIURL_API_KEY，嚴禁回退至使用者的官方 OPENAI_API_KEY（防洩漏）
  if (isAiurl) {
    if (context?.USER_CONFIG?.AIURL_API_KEY && context.USER_CONFIG.AIURL_API_KEY.trim() !== '') {
      return context.USER_CONFIG.AIURL_API_KEY.trim();
    }
    return null; // 無合法 aiurl 專用金鑰時回傳 null，避免將官方金鑰誤送往第三方端點
  }

  // 3. 非 aiurl 端點（例如官方端點），允許使用一般的 OpenAI API Key（支援 LLM Profiles）
  return openAIKeyFromContext(context);
}

export function getOpenAIImageApiBase(context) {
  const azureBase = context?.USER_CONFIG?.OPENAI_API_BASE;
  if (azureBase && typeof azureBase === 'string' && azureBase.includes('azure.com')) {
    return azureBase.replace(/\/+$/, '');
  }
  if (context?.USER_CONFIG?.OPENAI_IMAGE_API_BASE && context.USER_CONFIG.OPENAI_IMAGE_API_BASE.trim() !== "") {
    return context.USER_CONFIG.OPENAI_IMAGE_API_BASE.trim().replace(/\/+$/, '');
  }
  return "https://llm.aiurl.tw/v1";
}

// ========== 狀態檢查 ==========

export function isOpenAIEnable(context) {
  // 檢查是否有 LLM Profile 可用
  const profile = getActiveLLMProfile(context);
  if (profile) {
    const apiKey = getProfileApiKey(profile, context);
    if (apiKey) return true;
  }
  
  // 回退檢查原本的設定
  return context.USER_CONFIG.OPENAI_API_KEY && context.USER_CONFIG.OPENAI_API_KEY.length > 0;
}

export function isOpenAIImageEnable(context) {
  const imageBase = getOpenAIImageApiBase(context);
  const isAiurl = imageBase?.includes('aiurl.tw');

  const rawKey = context?.USER_CONFIG?.OPENAI_IMAGE_API_KEY;
  const hasImageKey = Array.isArray(rawKey)
    ? rawKey.some(k => typeof k === 'string' && k.trim() !== '')
    : Boolean(typeof rawKey === 'string' && rawKey.trim() !== '');

  // 若為 aiurl 端點，必須具備專屬圖片金鑰或 AIURL_API_KEY
  if (isAiurl) {
    return hasImageKey || Boolean(context?.USER_CONFIG?.AIURL_API_KEY && context.USER_CONFIG.AIURL_API_KEY.trim() !== '');
  }

  // 官方或第三方端點：支援 OPENAI_IMAGE_API_KEY、OPENAI_API_KEY 或 LLM Profiles
  return (
    hasImageKey ||
    (context?.USER_CONFIG?.OPENAI_API_KEY && context.USER_CONFIG.OPENAI_API_KEY.length > 0) ||
    Boolean(openAIKeyFromContext(context))
  );
}

// ========== 訊息渲染 ==========

export async function renderOpenAIMessage(item) {
  const res = {
    role: item.role,
    content: item.content
  };
  
  if (item.images && item.images.length > 0) {
    res.content = [];
    if (item.content) {
      res.content.push({ type: "text", text: item.content });
    }
    
    for (const image of item.images) {
      switch (ENV.TELEGRAM_IMAGE_TRANSFER_MODE) {
        case "base64":
          res.content.push({
            type: "image_url",
            image_url: {
              url: renderBase64DataURI(await imageToBase64String(image))
            }
          });
          break;
        case "url":
        default:
          res.content.push({ type: "image_url", image_url: { url: image } });
          break;
      }
    }
  }
  
  return res;
}

// ========== Chat Completions ==========

export async function requestCompletionsFromOpenAI(params, context, onStream, profileOverride = null, visitedProfiles = new Set()) {
  const { message, images, prompt, history } = params;
  const profile = profileOverride || getActiveLLMProfile(context);
  const profileKey = profileOverride?._key || profile?.name || 'current';
  visitedProfiles.add(profileKey);

  const apiBase = (profile && profile.apiBase) ? profile.apiBase : getOpenAIApiBase(context);
  const apiKey = (profile ? getProfileApiKey(profile, context) : null) || openAIKeyFromContext(context);
  const model = (!profileOverride && context?.USER_CONFIG?.CURRENT_LLM_MODEL)
    ? context.USER_CONFIG.CURRENT_LLM_MODEL
    : (profile?.model || getOpenAIChatModel(context));

  const url = `${apiBase}/chat/completions`;
  const header = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${apiKey}`
  };
  
  const messages = [...(history || []), { role: "user", content: message, images }];
  if (prompt) {
    messages.unshift({ role: context?.USER_CONFIG?.SYSTEM_INIT_MESSAGE_ROLE || 'system', content: prompt });
  }
  
  const body = {
    model,
    ...(profile?.options || context?.USER_CONFIG?.OPENAI_API_EXTRA_PARAMS),
    messages: await Promise.all(messages.map(renderOpenAIMessage)),
    stream: onStream != null
  };
  
  try {
    return await requestChatCompletions(url, header, body, context, onStream);
  } catch (error) {
    const fallbackKey = profile?.fallbackProfile;
    if (fallbackKey && !visitedProfiles.has(fallbackKey)) {
      const allProfiles = getAllLLMProfiles(context);
      const fallbackProf = allProfiles[fallbackKey];
      if (fallbackProf && fallbackProf !== profile) {
        visitedProfiles.add(fallbackKey);
        const wrappedFallback = { ...fallbackProf, _key: fallbackKey };
        console.warn(`[LLM Fallback] Profile "${profile.name || 'Primary'}" failed (${error.message}). Falling back to "${fallbackProf.name || fallbackKey}"...`);
        return requestCompletionsFromOpenAI(params, context, onStream, wrappedFallback, visitedProfiles);
      }
    }
    throw error;
  }
}

// ========== 圖片生成 ==========

/**
 * 檢查 Azure 圖片生成是否啟用
 */
export function isAzureImageEnable(context) {
  const azureBase = context?.USER_CONFIG?.OPENAI_API_BASE;
  if (!azureBase || typeof azureBase !== 'string' || !azureBase.includes('azure.com')) {
    return false;
  }
  return isOpenAIImageEnable(context);
}

/**
 * 從 Azure OpenAI 請求圖片生成
 */
export async function requestImageFromAzureOpenAI(prompt, context) {
  return requestImageFromOpenAI(prompt, context);
}

export async function requestImageFromOpenAI(prompt, context) {
  const url = `${getOpenAIImageApiBase(context)}/images/generations`;
  const apiKey = openAIImageKeyFromContext(context);
  if (!apiKey) {
    throw new Error("未設定有效的圖片生成 API Key (請設定 OPENAI_IMAGE_API_KEY 或 AIURL_API_KEY)");
  }
  const header = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${apiKey}`
  };
  
  // 僅在明確指定使用 gpt-image-1 時才走特殊分支
  const isGptImage1 = context?.USER_CONFIG?.DALL_E_MODEL === "gpt-image-1";
  
  const body = {
    prompt,
    n: 1
  };
  
  if (isGptImage1) {
    // GPT-Image-1 配置
    body.model = "gpt-image-1";
    body.size = context?.USER_CONFIG?.GPT_IMAGE_SIZE || "1024x1024";
  } else {
    // DALL-E 配置 / OpenAI 相容圖片模型 (預設 codex/gpt-image-2)
    body.model = context?.USER_CONFIG?.DALL_E_MODEL || "codex/gpt-image-2";
    body.size = context?.USER_CONFIG?.DALL_E_IMAGE_SIZE || "1024x1024";
    
    if (body.model === "dall-e-3") {
      body.quality = context?.USER_CONFIG?.DALL_E_IMAGE_QUALITY || "standard";
      body.style = context?.USER_CONFIG?.DALL_E_IMAGE_STYLE || "natural";
    }
  }
  
  let respText;
  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: header,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(25000)
    });
    respText = await res.text();
  } catch (netErr) {
    throw new Error(`請求端點失敗 (${netErr.name === 'TimeoutError' ? '連線逾時 25s' : netErr.message})`);
  }

  let resp;
  try {
    resp = JSON.parse(respText);
  } catch {
    throw new Error(`端點回傳非 JSON 回應 (HTTP ${res?.status || 'Unknown'}): ${respText.substring(0, 150)}`);
  }

  if (!res.ok || resp.error) {
    const errMsg = resp.error?.message || resp.message || resp.detail || JSON.stringify(resp);
    throw new Error(`API 錯誤 (HTTP ${res.status}): ${errMsg}`);
  }
  
  // 優先處理 base64 回應 (相容 codex/gpt-image-2, gpt-image-1 等端點)
  if (resp?.data?.[0]?.b64_json) {
    return `data:image/png;base64,${resp.data[0].b64_json}`;
  }
  
  // 處理 URL 回應 (如 DALL-E)
  if (resp?.data?.[0]?.url) {
    return resp.data[0].url;
  }

  throw new Error("圖片生成端點未回傳有效圖片資料 (缺少 b64_json 或 url)");
}
