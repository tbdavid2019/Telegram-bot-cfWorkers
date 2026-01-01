// LLM 聊天功能模組
import { sendMessageToTelegramWithContext, sendChatActionToTelegramWithContext, deleteMessageFromTelegramWithContext } from '../telegram/telegram.js';
import { loadChatLLM } from './agents.js';

// 從環境變數引入
import { ENV, DATABASE } from '../config/env.js';

/**
 * Token 計數器（簡單版本，以字元數計算）
 */
function tokensCounter() {
  return (text) => {
    return text.length;
  };
}

/**
 * 載入歷史對話記錄
 */
export async function loadHistory(key) {
  let history = [];
  try {
    history = JSON.parse(await DATABASE.get(key));
  } catch (e) {
    console.error(e);
  }
  if (!history || !Array.isArray(history)) {
    history = [];
  }

  const counter = tokensCounter();
  const trimHistory = (list, initLength, maxLength, maxToken) => {
    if (maxLength >= 0 && list.length > maxLength) {
      list = list.splice(list.length - maxLength);
    }
    if (maxToken > 0) {
      let tokenLength = initLength;
      for (let i = list.length - 1; i >= 0; i--) {
        const historyItem = list[i];
        let length = 0;
        if (historyItem.content) {
          length = counter(historyItem.content);
        } else {
          historyItem.content = "";
        }
        tokenLength += length;
        if (tokenLength > maxToken) {
          list = list.splice(i + 1);
          break;
        }
      }
    }
    return list;
  };

  if (ENV.AUTO_TRIM_HISTORY && ENV.MAX_HISTORY_LENGTH > 0) {
    history = trimHistory(history, 0, ENV.MAX_HISTORY_LENGTH, ENV.MAX_TOKEN_LENGTH);
  }
  return history;
}

/**
 * 從 LLM 請求回覆
 */
export async function requestCompletionsFromLLM(params, context, llm, modifier, onStream) {
  const historyDisable = ENV.AUTO_TRIM_HISTORY && ENV.MAX_HISTORY_LENGTH <= 0;
  const historyKey = context.SHARE_CONTEXT.chatHistoryKey;
  const { message, images } = params;
  let history = await loadHistory(historyKey);

  if (modifier) {
    const modifierData = modifier(history, message);
    history = modifierData.history;
    params.message = modifierData.message;
  }

  // 🆕 動態生成指令系統提示詞
  let commandPrompt = '';
  if (ENV.ENABLE_COMMAND_DISCOVERY) {
    try {
      const { generateCommandSystemPrompt } = await import('./command-discovery.js');
      commandPrompt = await generateCommandSystemPrompt(context);
      console.log('🤖 [Command Discovery] System prompt generated, length:', commandPrompt.length);
      if (ENV.DEBUG_MODE) {
        console.log('🤖 [Command Discovery] Full prompt:', commandPrompt);
      }
    } catch (error) {
      console.error('❌ [Command Discovery] Failed to generate command system prompt:', error);
    }
  } else {
    console.log('⚠️ [Command Discovery] Feature is disabled (ENABLE_COMMAND_DISCOVERY = false)');
  }

  const llmParams = {
    ...params,
    history,
    // 將指令提示詞附加到系統訊息
    prompt: context.USER_CONFIG.SYSTEM_INIT_MESSAGE +
      (commandPrompt ? '\n\n' + commandPrompt : '')
  };

  let answer = await llm(llmParams, context, onStream);

  // 🆕 處理 LLM 回應中的指令調用
  if (ENV.ENABLE_COMMAND_DISCOVERY && typeof answer === 'string') {
    console.log('🤖 [Command Discovery] Checking LLM response for command markers...');
    console.log('🤖 [Command Discovery] Response preview:', answer.substring(0, 200));

    try {
      const { processCommandInvocations } = await import('./command-invoker.js');

      // 處理指令調用，獲取清理後的回應和按鈕
      const { cleanedAnswer, replyMarkup } = await processCommandInvocations(answer, context);

      // 如果有按鈕，添加到 context
      if (replyMarkup) {
        // 設定 reply_markup（Inline Keyboard）
        context.CURRENT_CHAT_CONTEXT.reply_markup = replyMarkup;

        console.log('🤖 [Command Discovery] Added inline keyboard with', replyMarkup.inline_keyboard.length, 'buttons');
      }

      // 使用清理後的回應（移除了 [CALL:...] 標記）
      answer = cleanedAnswer;
    } catch (error) {
      console.error('❌ [Command Discovery] Failed to process command invocations:', error);
    }
  }

  if (!historyDisable) {
    history.push({ role: "user", content: message || "", images });
    history.push({ role: "assistant", content: answer });
    await DATABASE.put(historyKey, JSON.stringify(history)).catch(console.error);
  }

  return answer;
}

/**
 * 訊息處理器：與 LLM 聊天
 */
export async function msgChatWithLLM(context) {
  if (!context.text) return null;
  return chatWithLLM({
    chatId: context.SHARE_CONTEXT.chatId,
    message: context.text
  }, context);
}

/**
 * 與 LLM 聊天（主要函數）
 */
export async function chatWithLLM(params, context, modifier) {
  try {
    try {
      const msg = await sendMessageToTelegramWithContext(context)("...").then((r) => r.json());
      context.CURRENT_CHAT_CONTEXT.message_id = msg.result.message_id;
      context.CURRENT_CHAT_CONTEXT.reply_markup = null;
    } catch (e) {
      console.error(e);
    }

    setTimeout(() => sendChatActionToTelegramWithContext(context)("typing").catch(console.error), 0);
    let onStream = null;
    const parseMode = context.CURRENT_CHAT_CONTEXT.parse_mode;
    let nextEnableTime = null;

    if (ENV.STREAM_MODE) {
      context.CURRENT_CHAT_CONTEXT.parse_mode = null;
      onStream = async (text) => {
        try {
          if (nextEnableTime && nextEnableTime > Date.now()) {
            return;
          }
          const resp = await sendMessageToTelegramWithContext(context)(text);
          if (resp.status === 429) {
            const retryAfter = parseInt(resp.headers.get("Retry-After"));
            if (retryAfter) {
              nextEnableTime = Date.now() + retryAfter * 1e3;
              return;
            }
          }
          nextEnableTime = null;
          if (resp.ok) {
            context.CURRENT_CHAT_CONTEXT.message_id = (await resp.json()).result.message_id;
          }
        } catch (e) {
          console.error(e);
        }
      };
    }

    const llm = loadChatLLM(context)?.request;
    if (llm === null) {
      return sendMessageToTelegramWithContext(context)("LLM is not enable");
    }

    const answer = await requestCompletionsFromLLM(params, context, llm, modifier, onStream);
    context.CURRENT_CHAT_CONTEXT.parse_mode = parseMode;

    if (ENV.SHOW_REPLY_BUTTON && context.CURRENT_CHAT_CONTEXT.message_id) {
      try {
        await deleteMessageFromTelegramWithContext(context)(context.CURRENT_CHAT_CONTEXT.message_id);
        context.CURRENT_CHAT_CONTEXT.message_id = null;
        context.CURRENT_CHAT_CONTEXT.reply_markup = {
          keyboard: [[{ text: "/new" }, { text: "/redo" }]],
          selective: true,
          resize_keyboard: true,
          one_time_keyboard: true
        };
      } catch (e) {
        console.error(e);
      }
    }

    if (nextEnableTime && nextEnableTime > Date.now()) {
      await new Promise((resolve) => setTimeout(resolve, nextEnableTime - Date.now()));
    }

    // 檢查是否需要語音回覆
    const chatId = context.CURRENT_CHAT_CONTEXT.chat_id;
    const replyMode = await DATABASE.get(`voice_reply:${chatId}`) || 'text';

    if (replyMode === 'voice' && ENV.ENABLE_VOICE_REPLY !== 'false') {
      try {
        console.log('[TTS] Generating voice reply...');
        // 使用 TTS 轉換為語音
        const { textToSpeech, sendVoiceMessage } = await import('../features/tts.js');
        const audioBlob = await textToSpeech(answer);
        await sendVoiceMessage(
          chatId,
          audioBlob,
          context.SHARE_CONTEXT.currentBotToken
        );
        console.log('[TTS] Voice reply sent successfully');
        return null;
      } catch (error) {
        console.error('[TTS] Error:', error);
        // TTS 失敗時降級為文字回覆
        return sendMessageToTelegramWithContext(context)(answer);
      }
    } else {
      // 文字回覆
      return sendMessageToTelegramWithContext(context)(answer);
    }
  } catch (e) {
    let errMsg = `Error: ${e.message}`;
    if (errMsg.length > 2048) {
      errMsg = errMsg.substring(0, 2048);
    }
    context.CURRENT_CHAT_CONTEXT.disable_web_page_preview = true;
    return sendMessageToTelegramWithContext(context)(errMsg);
  }
}
