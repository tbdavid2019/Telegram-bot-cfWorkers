// AI 圖片生成功能模組
import { sendMessageToTelegramWithContext, sendPhotoToTelegramWithContext, sendChatActionToTelegramWithContext } from '../telegram/telegram.js';
import { extractTelegramPhotoUrl } from '../telegram/message.js';
import { isGeminiImageEnable, requestImageFromGemini } from '../agent/gemini.js';
import { isOpenAIImageEnable, requestImageFromOpenAI } from '../agent/openai.js';
import { isAzureImageEnable, requestImageFromAzureOpenAI } from '../agent/openai.js';
import { isWorkersAIEnable, requestImageFromWorkersAI } from '../agent/agents.js';

// 從環境變數引入
import { ENV, DATABASE } from '../config/env.js';

/**
 * 圖片生成代理列表
 */
const imageGenAgents = [
  {
    name: "azure",
    enable: isAzureImageEnable,
    request: requestImageFromAzureOpenAI
  },
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
  {
    name: "workers",
    enable: isWorkersAIEnable,
    request: requestImageFromWorkersAI
  }
];

/**
 * 載入圖片生成器
 */
function loadImageGen(context) {
  console.log(`[DEBUG] loadImageGen called with AI_IMAGE_PROVIDER: ${context.USER_CONFIG.AI_IMAGE_PROVIDER}`);
  
  // 如果指定了特定服務，優先使用
  for (const imgGen of imageGenAgents) {
    console.log(`[DEBUG] Checking if ${imgGen.name} === ${context.USER_CONFIG.AI_IMAGE_PROVIDER}`);
    if (imgGen.name === context.USER_CONFIG.AI_IMAGE_PROVIDER) {
      console.log(`[DEBUG] Found matching provider: ${imgGen.name}`);
      return imgGen;
    }
  }
  
  // 自動選擇第一個可用的服務
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

/**
 * 取得當前圖片模型名稱
 */
function currentImageModel(agentName, context) {
  switch (agentName) {
    case "azure":
      try {
        const url = new URL(context.USER_CONFIG.AZURE_DALLE_API);
        return url.pathname.split("/")[3];
      } catch {
        return context.USER_CONFIG.AZURE_DALLE_API;
      }
    case "openai":
      // 檢查是否使用 gpt-image-1
      if (context.USER_CONFIG.DALL_E_MODEL === "gpt-image-1" || 
          context.USER_CONFIG.GPT_IMAGE_MODEL === "gpt-image-1") {
        return "gpt-image-1";
      }
      return context.USER_CONFIG.DALL_E_MODEL || "dall-e-3";
    case "gemini":
      return context.USER_CONFIG.GOOGLE_COMPLETIONS_MODEL || "gemini-2.0-flash-exp";
    case "workers":
      return "@cf/black-forest-labs/flux-1-schnell";
    default:
      return "unknown";
  }
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
 * 生成圖片（主指令）
 * 支援文字轉圖片和圖片編輯
 */
export async function commandGenerateImg(message, command, subcommand, context) {
  if (subcommand === "") {
    return sendMessageToTelegramWithContext(context)(ENV.I18N.command.help.img);
  }
  try {
    const photoUrl = await extractTelegramPhotoUrl(message, context, true);
    const hasResolvedPhoto = !!photoUrl;
    let imgAgent = loadImageGen(context);
    if (!imgAgent && !hasResolvedPhoto) {
      return sendMessageToTelegramWithContext(context)("ERROR: Image generator not found");
    }
    setTimeout(() => sendChatActionToTelegramWithContext(context)("upload_photo").catch(console.error), 0);
    let requestFn = imgAgent?.request;
    let requestOptions = void 0;
    if (hasResolvedPhoto) {
      if (!isGeminiImageEnable(context)) {
        return sendMessageToTelegramWithContext(context)("ERROR: Gemini 圖片生成功能尚未啟用或 API Key 缺失");
      }
      requestFn = requestImageFromGemini;
      requestOptions = { images: [photoUrl] };
    }
    if (!requestFn) {
      return sendMessageToTelegramWithContext(context)("ERROR: Image generator not found");
    }
    const img = await requestFn(subcommand, context, requestOptions);
    return sendPhotoToTelegramWithContext(context)(img);
  } catch (e) {
    return sendMessageToTelegramWithContext(context)(`ERROR: ${e.message}`);
  }
}

/**
 * 生成圖片（並行模式）
 * 同時使用所有可用的圖片生成器
 */
export async function commandGenerateImg2(message, command, subcommand, context) {
  if (subcommand === "") {
    return sendMessageToTelegramWithContext(context)("請提供圖片描述，例如：`/img2 月光下的沙灘`");
  }
  
  try {
    // 檢查可用的圖片生成器
    const availableGenerators = [];
    
    for (const imgGen of imageGenAgents) {
      if (imgGen.enable(context)) {
        availableGenerators.push(imgGen);
      }
    }
    
    if (availableGenerators.length === 0) {
      return sendMessageToTelegramWithContext(context)("ERROR: 沒有可用的圖片生成器，請檢查 API 密鑰設定");
    }
    
    setTimeout(() => sendChatActionToTelegramWithContext(context)("upload_photo").catch(console.error), 0);
    
    // 同時調用所有可用的生成器
    const imagePromises = availableGenerators.map(async (gen) => {
      try {
        const img = await gen.request(subcommand, context);
        return { generator: gen.name, image: img, success: true };
      } catch (e) {
        console.error(`Error generating image with ${gen.name}:`, e);
        return { generator: gen.name, error: e.message, success: false };
      }
    });
    
    const results = await Promise.all(imagePromises);
    
    // 發送成功的圖片
    let successCount = 0;
    for (const result of results) {
      if (result.success) {
        successCount++;
        await sendPhotoToTelegramWithContext(context)(result.image);
      }
    }
    
    // 如果沒有成功的圖片，發送錯誤信息
    if (successCount === 0) {
      const errorMessages = results.map(r => `${r.generator}: ${r.error}`).join('\n');
      return sendMessageToTelegramWithContext(context)(`所有圖片生成都失敗了：\n${errorMessages}`);
    }
    
    // 如果有部分成功，發送總結信息
    if (successCount < results.length) {
      const failedGenerators = results.filter(r => !r.success).map(r => r.generator).join(', ');
      return sendMessageToTelegramWithContext(context)(`成功生成 ${successCount}/${results.length} 張圖片\n失敗的生成器: ${failedGenerators}`);
    }
    
  } catch (e) {
    return sendMessageToTelegramWithContext(context)(`ERROR: ${e.message}`);
  }
}

/**
 * 設定圖片生成服務
 * 可選：auto, openai, azure, gemini, workers
 */
export async function commandSetImageProvider(message, command, subcommand, context) {
  const validProviders = ["auto", "openai", "azure", "gemini", "workers"];
  
  if (subcommand === "") {
    // 顯示當前設定和可用選項
    const currentProvider = context.USER_CONFIG.AI_IMAGE_PROVIDER || "auto";
    const currentImageAgent = loadImageGen(context);
    const currentModel = currentImageAgent ? currentImageModel(currentImageAgent.name, context) : "未知";
    
    let msg = `🎨 **圖片生成設定**\n\n`;
    msg += `📋 **當前設定**: ${currentProvider}\n`;
    msg += `🤖 **當前模型**: ${currentModel}\n\n`;
    msg += `📝 **可用選項**:\n`;
    msg += `• auto - 自動選擇可用的服務\n`;
    msg += `• openai - OpenAI DALL-E / GPT-Image-1\n`;
    msg += `• azure - Azure OpenAI DALL-E\n`;
    msg += `• gemini - Gemini 2.5 Flash Image\n`;
    msg += `• workers - Cloudflare Workers AI\n\n`;
    msg += `💡 **使用方法**: \`/setimg <provider>\`\n`;
    msg += `📝 **範例**: \`/setimg gemini\``;
    
    context.CURRENT_CHAT_CONTEXT.parse_mode = "Markdown";
    return sendMessageToTelegramWithContext(context)(msg);
  }
  
  const provider = subcommand.toLowerCase().trim();
  
  if (!validProviders.includes(provider)) {
    return sendMessageToTelegramWithContext(context)(
      `❌ 無效的圖片生成服務: ${provider}\n\n` +
      `✅ 可用選項: ${validProviders.join(", ")}`
    );
  }
  
  try {
    // 更新配置
    context.USER_CONFIG.AI_IMAGE_PROVIDER = provider;
    
    // 保存配置到資料庫
    await DATABASE.put(
      context.SHARE_CONTEXT.configStoreKey,
      JSON.stringify(trimUserConfig(context.USER_CONFIG))
    );
    
    // 檢查設定的服務是否可用
    let statusMsg = `✅ **圖片生成服務已設定為**: ${provider}\n\n`;
    
    if (provider !== "auto") {
      const imageAgent = loadImageGen(context);
      if (imageAgent && imageAgent.name === provider) {
        const currentModel = currentImageModel(provider, context);
        statusMsg += `🤖 **使用模型**: ${currentModel}\n`;
        statusMsg += `✅ **狀態**: 服務可用`;
      } else {
        statusMsg += `⚠️ **警告**: 所選服務目前不可用，將自動回退到其他可用服務`;
      }
    } else {
      const imageAgent = loadImageGen(context);
      if (imageAgent) {
        const currentModel = currentImageModel(imageAgent.name, context);
        statusMsg += `🤖 **自動選擇**: ${imageAgent.name} (${currentModel})\n`;
        statusMsg += `✅ **狀態**: 服務可用`;
      } else {
        statusMsg += `❌ **錯誤**: 沒有可用的圖片生成服務`;
      }
    }
    
    context.CURRENT_CHAT_CONTEXT.parse_mode = "Markdown";
    return sendMessageToTelegramWithContext(context)(statusMsg);
    
  } catch (e) {
    return sendMessageToTelegramWithContext(context)(`ERROR: ${e.message}`);
  }
}
