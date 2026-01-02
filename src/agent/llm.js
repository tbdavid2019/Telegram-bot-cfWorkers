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

  // 🆕 處理 LLM 回應中的指令調用（Tool Calling 模式）
  if (ENV.ENABLE_COMMAND_DISCOVERY && typeof answer === 'string') {
    console.log('🤖 [Command Discovery] Checking LLM response for command markers...');

    const { parseCommandsFromLLMResponse } = await import('./command-invoker.js');
    const commands = parseCommandsFromLLMResponse(answer);

    // 檢查是否有需要立即執行的工具指令（家庭管理相關）
    // 只有在 ENABLE_FAMILY_SHEETS 明確設為 true 時才執行
    // 如果未啟用，則從 commands 列表中移除，並從 answer 中剝離，防止回退到 Inline Keyboard
    let toolCommands = [];
    if (ENV.USER_CONFIG.ENABLE_FAMILY_SHEETS === true) {
      toolCommands = commands.filter(cmd =>
        cmd.command === '/budget' ||
        cmd.command === '/schedule' ||
        cmd.command === '/scheduleadd' ||
        cmd.command === '/budgetwrite'
      );
    } else {
      // 找出被禁用的指令
      const prohibitedCommands = commands.filter(cmd =>
        cmd.command === '/budget' ||
        cmd.command === '/schedule' ||
        cmd.command === '/scheduleadd' ||
        cmd.command === '/budgetwrite'
      );

      if (prohibitedCommands.length > 0) {
        console.log(`🤖 [Tool Calling] Features disabled, stripping ${prohibitedCommands.length} prohibited commands`);

        // 從 commands 列表中移除
        const safeCommands = commands.filter(cmd =>
          cmd.command !== '/budget' &&
          cmd.command !== '/schedule' &&
          cmd.command !== '/scheduleadd' &&
          cmd.command !== '/budgetwrite'
        );

        // 更新 commands 引用 (需要改用 let 或修改數組內容，這裡重新賦值给 commands 變數需要 commands 變為 let)
        commands.length = 0;
        commands.push(...safeCommands);

        // 從 answer 中移除標記，防止 processCommandInvocations 再次解析到
        // 格式: [CALL:/command args]
        for (const cmd of prohibitedCommands) {
          // 簡單的字符串替換，注意轉義正則特殊字符
          // 由於 args 可能包含換行或特殊字符，正則比較複雜，這裡嘗試直接替換已知模式
          // 或者使用 command-invoker 的 regex 邏輯
          const regex = new RegExp(`\\[CALL:${cmd.command}\\s*(.*?)\\]`, 'gs');
          answer = answer.replace(regex, '');
        }
      }
    }

    if (toolCommands.length > 0) {
      console.log(`🤖 [Tool Calling] Found ${toolCommands.length} tool commands, executing...`);

      // 直接調用資料獲取函數
      const toolResults = [];

      for (const { command, args } of toolCommands) {
        try {
          let dataText = '';

          if (command === '/budget') {
            console.log('🤖 [Tool Calling] Fetching budget data...');
            const { readBudgetSheet, parseBudgetData } = await import('../features/google-sheets.js');
            const rawData = await readBudgetSheet(context.env);
            const parsedData = parseBudgetData(rawData);

            // 格式化為文字表格
            dataText = `📊 家庭收支資料 (共 ${parsedData.length} 筆)\n\n`;
            dataText += `月份      總共    玉山    星展    中信    國泰    富邦    工會    現金    房租\n`;
            dataText += `${'='.repeat(80)}\n`;
            for (const d of parsedData) {
              dataText += `${d.month.padEnd(8)} ${String(d.total).padEnd(7)} ${String(d.yushan).padEnd(7)} ${String(d.dbs).padEnd(7)} ${String(d.ctbc).padEnd(7)} ${String(d.cathay).padEnd(7)} ${String(d.fubon).padEnd(7)} ${String(d.union).padEnd(7)} ${String(d.cash).padEnd(7)} ${String(d.rent).padEnd(7)}\n`;
            }

          } else if (command === '/schedule') {
            console.log('🤖 [Tool Calling] Fetching schedule data...');
            const { listCalendarEvents } = await import('../features/google-calendar.js');

            // 設定時間範圍：從今天開始，查詢未來30天
            const now = new Date();
            const timeMin = now.toISOString();
            const futureDate = new Date(now);
            futureDate.setDate(futureDate.getDate() + 30);
            const timeMax = futureDate.toISOString();

            const events = await listCalendarEvents(context.env, timeMin, timeMax);

            // 加入當前時間資訊
            const currentDate = now.toLocaleDateString('zh-TW', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'long'
            });

            dataText = `📅 家庭行程\n`;
            dataText += `📆 當前時間：${currentDate}\n`;
            dataText += `🔍 查詢範圍：未來30天 (共 ${events.length} 筆)\n\n`;

            for (const event of events) {
              dataText += `${event.start} - ${event.summary}\n`;
              if (event.location) dataText += `  📍 ${event.location}\n`;
            }

          } else if (command === '/scheduleadd') {
            console.log('🤖 [Tool Calling] Adding calendar event...');
            const { createCalendarEvent } = await import('../features/google-calendar.js');

            // 解析 JSON 參數
            const params = JSON.parse(args);
            console.log('🤖 [Tool Calling] Params:', JSON.stringify(params));

            // 手動解析日期
            const [year, month, day] = params.date.split('/').map(Number);

            // 構建全天活動格式（使用 date 而不是 dateTime）
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

            console.log('🤖 [Tool Calling] All-day event date:', dateStr);

            // 構建 Google Calendar API 格式的全天事件資料
            const eventData = {
              summary: params.event,
              start: {
                date: dateStr,
                timeZone: 'Asia/Taipei'
              },
              end: {
                date: dateStr,
                timeZone: 'Asia/Taipei'
              },
              description: `對象：${params.targetUser}`
            };

            console.log('🤖 [Tool Calling] Event data:', JSON.stringify(eventData, null, 2));

            await createCalendarEvent(context.env, eventData);

            dataText = `✅ 已成功新增全天行程：${params.event}\n`;
            dataText += `📅 日期：${params.date}\n`;
            dataText += `👤 對象：${params.targetUser}\n`;


          } else if (command === '/budgetwrite') {
            console.log('🤖 [Tool Calling] Writing budget data...');
            const { writeBudgetEntry } = await import('../features/google-sheets.js');

            // 解析 JSON 參數
            const params = JSON.parse(args);
            await writeBudgetEntry(
              context.env,
              params.month,
              params.category,
              params.amount
            );

            dataText = `✅ 已成功記帳\n`;
            dataText += `📅 月份：${params.month}\n`;
            dataText += `📝 項目：${params.category}\n`;
            dataText += `💰 金額：${params.amount} 元\n`;
          }

          toolResults.push({
            command,
            data: dataText
          });

        } catch (error) {
          console.error(`❌ [Tool Calling] Failed to fetch data for ${command}:`, error);
          toolResults.push({
            command,
            error: error.message
          });
        }
      }

      // 將工具結果加入對話歷史
      const toolResultText = toolResults.map(r =>
        r.error ? `${r.command} 執行失敗: ${r.error}` : r.data
      ).join('\n\n');

      history.push({ role: "assistant", content: answer });
      history.push({ role: "system", content: `[工具執行結果]\n${toolResultText}\n\n請根據上述資料回答用戶的問題。` });

      // 再次調用 LLM，這次它可以看到工具結果
      console.log('🤖 [Tool Calling] Calling LLM again with tool results...');
      answer = await llm(llmParams, context, onStream);

    } else {
      // 沒有工具指令，使用原來的 Inline Keyboard 模式
      try {
        const { processCommandInvocations } = await import('./command-invoker.js');
        const { cleanedAnswer, replyMarkup } = await processCommandInvocations(answer, context);

        if (replyMarkup) {
          context.CURRENT_CHAT_CONTEXT.reply_markup = replyMarkup;
          console.log('🤖 [Command Discovery] Added inline keyboard with', replyMarkup.inline_keyboard.length, 'buttons');
        }

        answer = cleanedAnswer;
      } catch (error) {
        console.error('❌ [Command Discovery] Failed to process command invocations:', error);
      }
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
