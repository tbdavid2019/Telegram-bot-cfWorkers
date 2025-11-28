/**
 * OpenAI API 相關功能
 * 包含 Chat Completions 和 DALL-E / GPT-Image 圖片生成
 * 支援 LLM Profiles (多個 OpenAI 相容服務)
 */

import { ENV } from '../config/env.js';
import { requestChatCompletions } from './request.js';
import { imageToBase64String, renderBase64DataURI } from '../utils/image.js';
import { getActiveLLMProfile, getProfileApiKey } from './agents.js';

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
  // 如果有專門的圖片 API Key，優先使用
  if (context.USER_CONFIG.OPENAI_IMAGE_API_KEY && context.USER_CONFIG.OPENAI_IMAGE_API_KEY.length > 0) {
    const length = context.USER_CONFIG.OPENAI_IMAGE_API_KEY.length;
    return context.USER_CONFIG.OPENAI_IMAGE_API_KEY[Math.floor(Math.random() * length)];
  }
  // 否則使用一般的 OpenAI API Key
  return openAIKeyFromContext(context);
}

export function getOpenAIImageApiBase(context) {
  // 如果有專門的圖片 API BASE，優先使用
  if (context.USER_CONFIG.OPENAI_IMAGE_API_BASE && context.USER_CONFIG.OPENAI_IMAGE_API_BASE.trim() !== "") {
    return context.USER_CONFIG.OPENAI_IMAGE_API_BASE.trim();
  }
  // 否則使用一般的 OpenAI API BASE
  return context.USER_CONFIG.OPENAI_API_BASE;
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
  // 檢查是否有專門的圖片 API Key，或者有一般的 OpenAI API Key
  return (
    (context.USER_CONFIG.OPENAI_IMAGE_API_KEY && context.USER_CONFIG.OPENAI_IMAGE_API_KEY.length > 0) ||
    (context.USER_CONFIG.OPENAI_API_KEY && context.USER_CONFIG.OPENAI_API_KEY.length > 0)
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

export async function requestCompletionsFromOpenAI(params, context, onStream) {
  const { message, images, prompt, history } = params;
  const url = `${getOpenAIApiBase(context)}/chat/completions`;
  const header = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${openAIKeyFromContext(context)}`
  };
  
  const messages = [...(history || []), { role: "user", content: message, images }];
  if (prompt) {
    messages.unshift({ role: context.USER_CONFIG.SYSTEM_INIT_MESSAGE_ROLE, content: prompt });
  }
  
  const body = {
    model: getOpenAIChatModel(context),
    ...context.USER_CONFIG.OPENAI_API_EXTRA_PARAMS,
    messages: await Promise.all(messages.map(renderOpenAIMessage)),
    stream: onStream != null
  };
  
  return requestChatCompletions(url, header, body, context, onStream);
}

// ========== 圖片生成 ==========

/**
 * 檢查 Azure 圖片生成是否啟用
 */
export function isAzureImageEnable(context) {
  return isOpenAIImageEnable(context) && context.USER_CONFIG.OPENAI_API_BASE?.includes('azure.com');
}

/**
 * 從 Azure OpenAI 請求圖片生成
 */
export async function requestImageFromAzureOpenAI(prompt, context) {
  return requestImageFromOpenAI(prompt, context);
}

export async function requestImageFromOpenAI(prompt, context) {
  const url = `${getOpenAIImageApiBase(context)}/images/generations`;
  const header = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${openAIImageKeyFromContext(context)}`
  };
  
  // 檢查是否使用 gpt-image-1 模型
  const isGptImage1 = 
    context.USER_CONFIG.DALL_E_MODEL === "gpt-image-1" || 
    context.USER_CONFIG.GPT_IMAGE_MODEL === "gpt-image-1";
  
  const body = {
    prompt,
    n: 1
  };
  
  if (isGptImage1) {
    // GPT-Image-1 配置
    body.model = "gpt-image-1";
    body.size = context.USER_CONFIG.GPT_IMAGE_SIZE || "1024x1024";
  } else {
    // DALL-E 配置
    body.model = context.USER_CONFIG.DALL_E_MODEL;
    body.size = context.USER_CONFIG.DALL_E_IMAGE_SIZE;
    
    if (body.model === "dall-e-3") {
      body.quality = context.USER_CONFIG.DALL_E_IMAGE_QUALITY;
      body.style = context.USER_CONFIG.DALL_E_IMAGE_STYLE;
    }
  }
  
  const resp = await fetch(url, {
    method: "POST",
    headers: header,
    body: JSON.stringify(body)
  }).then((res) => res.json());
  
  if (resp.error?.message) {
    throw new Error(resp.error.message);
  }
  
  // 處理 gpt-image-1 的 base64 回應
  if (isGptImage1 && resp?.data?.[0]?.b64_json) {
    return `data:image/png;base64,${resp.data[0].b64_json}`;
  }
  
  // 處理 DALL-E 的 URL 回應
  return resp?.data?.[0]?.url;
}
