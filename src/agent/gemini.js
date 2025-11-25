/**
 * Google Gemini API 相關功能
 * 包含 Chat Completions 和 Gemini 原生圖片生成
 */

import { imageToBase64String } from '../utils/image.js';

// ========== API Key 管理 ==========

export function geminiImageKeyFromContext(context) {
  if (context.USER_CONFIG.GEMINI_IMAGE_API_KEY && context.USER_CONFIG.GEMINI_IMAGE_API_KEY.length > 0) {
    const length = context.USER_CONFIG.GEMINI_IMAGE_API_KEY.length;
    return context.USER_CONFIG.GEMINI_IMAGE_API_KEY[Math.floor(Math.random() * length)];
  }
  throw new Error("Gemini API Key is required for Google native API");
}

// ========== 狀態檢查 ==========

export function isGeminiAIEnable(context) {
  return !!context.USER_CONFIG.GOOGLE_API_KEY;
}

export function isGeminiImageEnable(context) {
  const hasGeminiKey = context.USER_CONFIG.GEMINI_IMAGE_API_KEY && 
                       context.USER_CONFIG.GEMINI_IMAGE_API_KEY.length > 0;
  
  console.log(`[DEBUG] isGeminiImageEnable check:
    GEMINI_IMAGE_API_KEY available: ${hasGeminiKey}
    Result: ${hasGeminiKey}`);
  
  return hasGeminiKey;
}

// ========== 訊息渲染 ==========

const GEMINI_ROLE_MAP = {
  "assistant": "model",
  "system": "user",
  "user": "user"
};

export async function renderGeminiMessage(item) {
  const parts = [];
  
  if (item.content) {
    parts.push({ "text": item.content });
  }
  
  if (item.images && item.images.length > 0) {
    for (const image of item.images) {
      const { data, format } = await imageToBase64String(image);
      parts.push({
        inlineData: {
          mimeType: format,
          data: data
        }
      });
    }
  }
  
  return {
    role: GEMINI_ROLE_MAP[item.role],
    parts: parts
  };
}

// ========== Chat Completions ==========

export async function requestCompletionsFromGeminiAI(params, context, onStream) {
  const { message, images, prompt, history } = params;
  onStream = null; // Gemini streaming 需要特殊處理，暫時禁用
  
  const url = `${context.USER_CONFIG.GOOGLE_COMPLETIONS_API}${context.USER_CONFIG.GOOGLE_COMPLETIONS_MODEL}:${onStream ? "streamGenerateContent" : "generateContent"}?key=${context.USER_CONFIG.GOOGLE_API_KEY}`;
  
  const contentsTemp = [...(history || []), { role: "user", content: message, images }];
  if (prompt) {
    contentsTemp.unshift({ role: "system", content: prompt });
  }
  
  const contents = [];
  for (const msg of contentsTemp) {
    const role = GEMINI_ROLE_MAP[msg.role];
    const rendered = await renderGeminiMessage(msg);
    
    if (contents.length === 0 || contents[contents.length - 1].role !== role) {
      contents.push(rendered);
    } else {
      contents[contents.length - 1].parts.push(...rendered.parts);
    }
  }
  
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ contents })
  });
  
  const data = await resp.json();
  
  try {
    return data.candidates[0].content.parts[0].text;
  } catch (e) {
    console.error(e);
    if (!data) {
      throw new Error("Empty response");
    }
    throw new Error(data?.error?.message || JSON.stringify(data));
  }
}

// ========== 圖片生成 (Gemini Native API) ==========

export async function requestImageFromGemini(prompt, context, options = {}) {
  try {
    const model = context.USER_CONFIG.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image-preview";
    const imageUrls = Array.isArray(options.images) ? options.images : [];
    
    // 使用 streaming API
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent`;
    const apiKey = geminiImageKeyFromContext(context);
    
    console.log(`[DEBUG] Gemini Native API Stream Request:
      URL: ${url}
      Model: ${model}
      API Key: ${apiKey ? `${apiKey.substring(0, 10)}...` : 'null'}
      Prompt: ${prompt}`);
    
    const header = {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey
    };
    
    // 使用更明確的圖片生成提示
    const imagePrompt = `Generate an image of: ${prompt}. Please create a detailed visual representation.`;

    // 組裝 parts
    const parts = [{ "text": imagePrompt }];
    
    if (imageUrls.length > 0) {
      for (const imageUrl of imageUrls) {
        try {
          const { data, format } = await imageToBase64String(imageUrl);
          parts.push({
            inlineData: {
              mimeType: format,
              data
            }
          });
        } catch (e) {
          console.error(`[ERROR] Failed to convert image ${imageUrl} to base64:`, e);
        }
      }
    }
    
    // 根據官方範例的格式構建請求
    const body = {
      "contents": [
        {
          "role": "user",
          "parts": parts
        }
      ],
      "generationConfig": {
        "response_modalities": ["IMAGE"]
      }
    };
    
    console.log(`[DEBUG] Request body:`, JSON.stringify(body, null, 2));
    
    const response = await fetch(url, {
      method: "POST",
      headers: header,
      body: JSON.stringify(body)
    });
    
    console.log(`[DEBUG] Response status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(`[DEBUG] Error response:`, errorText);
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }
    
    // 處理 streaming 響應 - 拼接所有片段
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        fullResponse += chunk;
        console.log(`[DEBUG] Received chunk: ${chunk.length} chars`);
      }
    } finally {
      reader.releaseLock();
    }
    
    console.log(`[DEBUG] Full response assembled, total length: ${fullResponse.length}`);
    
    // 解析完整的 JSON 響應
    let data;
    try {
      data = JSON.parse(fullResponse);
      console.log(`[DEBUG] Successfully parsed complete JSON response`);
    } catch (parseError) {
      console.log(`[DEBUG] Failed to parse full response as single JSON:`, parseError.message);
      
      // 如果不是有效的JSON，嘗試查找JSON數組
      const arrayMatch = fullResponse.match(/\[.*\]/s);
      if (arrayMatch) {
        try {
          data = JSON.parse(arrayMatch[0]);
          console.log(`[DEBUG] Successfully parsed as JSON array`);
        } catch (arrayParseError) {
          throw new Error(`Failed to parse streaming response: ${parseError.message}`);
        }
      } else {
        throw new Error(`Failed to parse streaming response: ${parseError.message}`);
      }
    }
    
    console.log(`[DEBUG] Searching for image data in response...`);
    
    // 如果 data 是數組，遍歷所有元素
    const responses = Array.isArray(data) ? data : [data];
    
    for (let i = 0; i < responses.length; i++) {
      const responseItem = responses[i];
      console.log(`[DEBUG] Checking response item ${i}:`, Object.keys(responseItem));
      
      if (responseItem.candidates && responseItem.candidates[0] && 
          responseItem.candidates[0].content && responseItem.candidates[0].content.parts) {
        
        console.log(`[DEBUG] Found ${responseItem.candidates[0].content.parts.length} parts in response ${i}`);
        
        for (let j = 0; j < responseItem.candidates[0].content.parts.length; j++) {
          const part = responseItem.candidates[0].content.parts[j];
          console.log(`[DEBUG] Part ${j} keys:`, Object.keys(part));
          
          // 檢查 inlineData (根據官方範例)
          if (part.inlineData && part.inlineData.data) {
            console.log(`[DEBUG] Found inlineData with ${part.inlineData.data.length} characters`);
            const mimeType = part.inlineData.mimeType || 'image/png';
            return `data:${mimeType};base64,${part.inlineData.data}`;
          }
          
          // 也檢查 inline_data (備用格式)
          if (part.inline_data && part.inline_data.data) {
            console.log(`[DEBUG] Found inline_data with ${part.inline_data.data.length} characters`);
            const mimeType = part.inline_data.mime_type || 'image/png';
            return `data:${mimeType};base64,${part.inline_data.data}`;
          }
        }
      }
    }
    
    console.log(`[DEBUG] No image data found in any response items`);
    throw new Error("No image data found in streaming response");
    
  } catch (error) {
    console.error(`[ERROR] Gemini Native API Request failed:`, error);
    throw error;
  }
}
