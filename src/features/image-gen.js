// AI 圖片生成功能模組
import {
  sendMessageToTelegramWithContext,
  sendPhotoToTelegramWithContext,
  sendChatActionToTelegramWithContext,
  buildInlineButton
} from '../telegram/telegram.js';
import { escape } from '../utils/md2tgmd.js';
import { extractTelegramPhotoUrl } from '../telegram/message.js';
import { isGeminiImageEnable, requestImageFromGemini } from '../agent/gemini.js';
import { isOpenAIImageEnable, requestImageFromOpenAI, getOpenAIImageApiBase } from '../agent/openai.js';
import { isAzureImageEnable, requestImageFromAzureOpenAI } from '../agent/openai.js';
import { isWorkersAIImageEnable, requestImageFromWorkersAI } from '../agent/agents.js';

// 從環境變數引入
import { ENV, DATABASE } from '../config/env.js';

/**
 * 取得依優先順序排序的圖片生成服務鏈（具備多層級自動降級備援）
 * 預設備援鏈：
 * Tier 1: OpenAI 相容主力端點 (llm.aiurl.tw / codex/gpt-image-2)
 * Tier 2: OpenAI 官方備援 (api.openai.com / gpt-image-2，若有 OPENAI_API_KEY 且端點非官方)
 * Tier 3: Google Gemini (gemini-3-pro-image-preview)
 * Tier 4: Cloudflare Workers AI (@cf/black-forest-labs/flux-1-schnell)
 */
export function getImageGenChain(context) {
  const preferred = (context.USER_CONFIG.AI_IMAGE_PROVIDER || "openai").toLowerCase().trim();

  const allProviders = [
    {
      name: "openai",
      label: `OpenAI 相容 (${getOpenAIImageApiBase(context)})`,
      enable: (ctx) => isOpenAIImageEnable(ctx),
      request: (prompt, ctx) => requestImageFromOpenAI(prompt, ctx)
    },
    {
      name: "openai-official",
      label: "OpenAI 官方原廠 (api.openai.com / gpt-image-2)",
      enable: (ctx) => {
        const base = getOpenAIImageApiBase(ctx);
        const hasOpenAiKey = ctx.USER_CONFIG.OPENAI_API_KEY && ctx.USER_CONFIG.OPENAI_API_KEY.length > 0;
        return base !== "https://api.openai.com/v1" && hasOpenAiKey;
      },
      request: (prompt, ctx) => {
        const officialCtx = {
          ...ctx,
          USER_CONFIG: {
            ...ctx.USER_CONFIG,
            OPENAI_IMAGE_API_BASE: "https://api.openai.com/v1",
            OPENAI_IMAGE_API_KEY: ctx.USER_CONFIG.OPENAI_API_KEY,
            DALL_E_MODEL: "gpt-image-2"
          }
        };
        return requestImageFromOpenAI(prompt, officialCtx);
      }
    },
    {
      name: "gemini",
      label: `Google Gemini (${context?.USER_CONFIG?.GEMINI_IMAGE_MODEL || 'gemini-3-pro-image-preview'})`,
      enable: (ctx) => isGeminiImageEnable(ctx),
      request: (prompt, ctx) => requestImageFromGemini(prompt, ctx)
    },
    {
      name: "azure",
      label: "Azure OpenAI DALL-E",
      enable: (ctx) => isAzureImageEnable(ctx),
      request: (prompt, ctx) => requestImageFromAzureOpenAI(prompt, ctx)
    },
    {
      name: "workers",
      label: `Cloudflare Workers AI (${context?.USER_CONFIG?.WORKERS_IMAGE_MODEL || '@cf/black-forest-labs/flux-1-schnell'})`,
      enable: (ctx) => isWorkersAIImageEnable(ctx),
      request: (prompt, ctx) => requestImageFromWorkersAI(prompt, ctx)
    }
  ];

  const chain = [];
  // 若偏好設定不是 auto，且該提供商有效，排在第 1 順位
  if (preferred !== "auto") {
    const primary = allProviders.find(p => p.name === preferred);
    if (primary && primary.enable(context)) {
      chain.push(primary);
    }
  }

  // 將其他所有啟用的提供商依序加入候補名單
  for (const p of allProviders) {
    if (!chain.some(x => x.name === p.name) && p.enable(context)) {
      chain.push(p);
    }
  }

  return chain;
}

/**
 * 載入圖片生成器（向後相容）
 */
export function loadImageGen(context) {
  const chain = getImageGenChain(context);
  return chain[0] || null;
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
      // 僅在明確指定使用 gpt-image-1 時才顯示
      if (context?.USER_CONFIG?.DALL_E_MODEL === "gpt-image-1") {
        return "gpt-image-1";
      }
      return context?.USER_CONFIG?.DALL_E_MODEL || "codex/gpt-image-2";
    case "gemini":
      return context?.USER_CONFIG?.GEMINI_IMAGE_MODEL || "gemini-3-pro-image-preview";
    case "workers":
      return context?.USER_CONFIG?.WORKERS_IMAGE_MODEL || "@cf/black-forest-labs/flux-1-schnell";
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

    // 若有提供圖片，走多模態圖片編輯 (Gemini)
    if (hasResolvedPhoto) {
      if (!isGeminiImageEnable(context)) {
        return sendMessageToTelegramWithContext(context)("ERROR: Gemini 圖片生成功能尚未啟用或 API Key 缺失");
      }
      setTimeout(() => sendChatActionToTelegramWithContext(context)("upload_photo").catch(console.error), 0);
      const img = await requestImageFromGemini(subcommand, context, { images: [photoUrl] });
      return sendPhotoToTelegramWithContext(context)(img);
    }

    // 文字生成圖片：使用多層級容錯備援鏈
    const chain = getImageGenChain(context);
    if (chain.length === 0) {
      return sendMessageToTelegramWithContext(context)("ERROR: 沒有可用的圖片生成服務，請檢查 API Key 設定");
    }

    setTimeout(() => sendChatActionToTelegramWithContext(context)("upload_photo").catch(console.error), 0);

    let img = null;
    let successfulProvider = null;
    const errors = [];

    for (let i = 0; i < chain.length; i++) {
      const provider = chain[i];
      try {
        console.log(`[Image-Gen] Attempting generation with [Tier ${i + 1}/${chain.length}] ${provider.label}...`);
        img = await provider.request(subcommand, context);
        if (img) {
          successfulProvider = provider;
          if (i > 0) {
            console.warn(`[Image-Gen] 🛡️ Primary provider failed. Successfully fell back to Tier ${i + 1} (${provider.label})`);
          }
          break;
        }
      } catch (err) {
        console.warn(`[Image-Gen] Provider [${provider.name}] failed: ${err.message}`);
        errors.push(`• ${provider.label || provider.name}: ${err.message}`);
      }
    }

    if (!img) {
      return sendMessageToTelegramWithContext(context)(
        `❌ **圖片生成失敗（所有備援節點皆已嘗試）**:\n\n${errors.join('\n')}`
      );
    }
    
    // 如果啟用了 AUTO_SAVE_TO_BOX，自動備份至 888box
    if (context.USER_CONFIG.AUTO_SAVE_TO_BOX) {
      try {
        const { saveAssetToBox } = await import('./box.js');
        const boxRes = await saveAssetToBox(img, subcommand, {}, context);
        if (boxRes?.share_url) {
          context.CURRENT_CHAT_CONTEXT.caption = `🎨 ${subcommand}\n📦 888box 備份: ${boxRes.share_url}`;
        }
      } catch (boxErr) {
        console.warn('[Image-Gen] Auto-save to 888box failed:', boxErr.message);
      }
    }

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
    // 檢查可用的圖片生成器 (包含所有啟用的備援節點)
    const availableGenerators = getImageGenChain(context);
    
    if (availableGenerators.length === 0) {
      return sendMessageToTelegramWithContext(context)("ERROR: 沒有可用的圖片生成器，請檢查 API 密鑰設定");
    }
    
    setTimeout(() => sendChatActionToTelegramWithContext(context)("upload_photo").catch(console.error), 0);
    
    // 同時調用所有可用的生成器
    const imagePromises = availableGenerators.map(async (gen) => {
      try {
        const img = await gen.request(subcommand, context);
        return { generator: gen.name, label: gen.label, image: img, success: true };
      } catch (e) {
        console.error(`Error generating image with ${gen.name}:`, e);
        return { generator: gen.name, label: gen.label, error: e.message, success: false };
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
    
    const chain = getImageGenChain(context);
    
    let msg = `🎨 **圖片生成設定與備援狀態**\n\n`;
    msg += `📋 **偏好設定**: \`${currentProvider}\`\n`;
    msg += `🤖 **首選模型**: \`${currentModel}\`\n\n`;
    
    msg += `🛡️ **自動容錯備援鏈 (Fallback Chain)**:\n`;
    if (chain.length > 0) {
      chain.forEach((p, idx) => {
        msg += `${idx + 1}. [${idx === 0 ? '首選主力' : '備援'}] ${p.label}\n`;
      });
    } else {
      msg += `⚠️ 目前沒有任何可用的圖片生成服務！\n`;
    }
    
    msg += `\n📝 **可切換選項**:\n`;
    msg += `• auto - 自動選擇 (依序嘗試可用服務)\n`;
    msg += `• openai - OpenAI 相容端點 (${context.USER_CONFIG.OPENAI_IMAGE_API_BASE || "https://llm.aiurl.tw/v1"})\n`;
    msg += `• gemini - Google Gemini (gemini-3-pro-image-preview)\n`;
    msg += `• workers - Cloudflare Workers AI\n`;
    msg += `• azure - Azure OpenAI DALL-E\n\n`;
    msg += `💡 **使用方法**: \`/setimg <provider>\`\n`;
    msg += `📝 **範例**: \`/setimg openai\``;
    
    const buttons = [];
    let row = [];
    for (const p of validProviders) {
      row.push(buildInlineButton({
        text: (p === currentProvider ? '✓ ' : '') + p,
        ...(p === currentProvider ? { disabled: {} } : { callback_data: `/setimg:${p}` })
      }));
      if (row.length === 2) {
        buttons.push(row);
        row = [];
      }
    }
    if (row.length > 0) {
      buttons.push(row);
    }
    context.CURRENT_CHAT_CONTEXT.reply_markup = JSON.stringify({ inline_keyboard: buttons });
    context.CURRENT_CHAT_CONTEXT.parse_mode = "Markdown";
    return sendMessageToTelegramWithContext(context)(msg);
  }
  
  const provider = subcommand.toLowerCase().trim();
  
  if (!validProviders.includes(provider)) {
    let callbackData = '';
    if (DATABASE && typeof DATABASE.put === 'function') {
      const promptId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      try {
        await DATABASE.put('img_prompt:' + promptId, subcommand, { expirationTtl: 3600 });
        callbackData = '/img_prompt:k_' + promptId;
      } catch (err) {
        callbackData = '';
      }
    }
    if (!callbackData) {
      let cutChars = Array.from(subcommand);
      let encoded = encodeURIComponent(cutChars.join(''));
      while (new TextEncoder().encode('/img_prompt:' + encoded).length > 64 && cutChars.length > 0) {
        cutChars.pop();
        encoded = encodeURIComponent(cutChars.join(''));
      }
      callbackData = '/img_prompt:' + encoded;
    }

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🎨 立即生成此圖片', callback_data: callbackData }
        ],
        [
          { text: '⚡ Auto', callback_data: '/setimg:auto' },
          { text: '🤖 OpenAI', callback_data: '/setimg:openai' },
          { text: '✨ Gemini', callback_data: '/setimg:gemini' },
          { text: '☁️ Workers', callback_data: '/setimg:workers' }
        ]
      ]
    };

    context.CURRENT_CHAT_CONTEXT.reply_markup = JSON.stringify(keyboard);
    context.CURRENT_CHAT_CONTEXT.parse_mode = 'HTML';

    const safeProvider = escape(provider);
    const safeSubcommand = escape(subcommand);

    const friendlyMsg = `❌ 無效的圖片生成服務: <b>${safeProvider}</b>\n\n` +
      `💡 提示：若您是想要生成圖片，請使用指令：<code>/img ${safeSubcommand}</code>\n\n` +
      `⚙️ 若要設定圖片生成模型，請點選下方按鈕：`;

    return sendMessageToTelegramWithContext(context)(friendlyMsg);
  }
  
  try {
    // 更新配置
    context.USER_CONFIG.AI_IMAGE_PROVIDER = provider;
    
    // 保存配置到資料庫
    if (DATABASE && typeof DATABASE.put === 'function') {
      await DATABASE.put(
        context.SHARE_CONTEXT.configStoreKey,
        JSON.stringify(trimUserConfig(context.USER_CONFIG))
      );
    }
    
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

// 圖片生成指令別名
export const commandGenerateImage = commandGenerateImg;
