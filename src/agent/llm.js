// LLM 聊天功能模組
import { sendMessageToTelegramWithContext, sendChatActionToTelegramWithContext, deleteMessageFromTelegramWithContext } from '../telegram/telegram.js';
import { loadChatLLM } from './agents.js';

// 從環境變數引入
import { ENV, DATABASE } from '../config/env.js';
import { resolveUserTimeZone, zonedTimeToUtc } from '../utils/timezone.js';

/**
 * Token 計數器（簡單版本，以字元數計算）
 */
function tokensCounter() {
  return (text) => {
    return text.length;
  };
}

function buildMemoryUpdatePrompt(userId, userMessage, assistantResponse, currentUserMemory, currentGlobalMemory) {
  const today = new Date().toISOString().split('T')[0];
  return `You are a memory editor for a Telegram bot.
Update both user memory and global memory based on the latest conversation.

Rules:
- Return JSON only. No markdown, no code fences.
- Keep the existing section structure and headings.
- Update the "最後更新" date to ${today}.
- Only store stable facts, preferences, and long-term context.
- Do NOT store transient requests or full chat logs.
- User memory is personal to user ${userId}.
- Global memory is shared knowledge (family info, shared settings, public facts).
- Keep each memory concise.

Current user memory:
<<<USER_MEMORY
${currentUserMemory}
USER_MEMORY

Current global memory:
<<<GLOBAL_MEMORY
${currentGlobalMemory}
GLOBAL_MEMORY

Latest conversation:
User: ${userMessage}
Assistant: ${assistantResponse}

Return JSON with this shape:
{"userMemory":"...","globalMemory":"..."}`;
}

function extractJsonObject(text) {
  if (!text || typeof text !== 'string') return null;
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  const candidate = text.slice(start, end + 1);
  try {
    return JSON.parse(candidate);
  } catch (e) {
    return null;
  }
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

  let memoryPrompt = '';
  if (ENV.USER_CONFIG.ENABLE_LONG_TERM_MEMORY) {
    try {
      const { getCombinedMemory } = await import('../features/memory.js');
      const userId = context.SHARE_CONTEXT.chatHistoryKey.split(':').pop();
      memoryPrompt = await getCombinedMemory(userId);
      console.log('🧠 [Memory] Long-term memory loaded, length:', memoryPrompt.length);
    } catch (error) {
      console.error('❌ [Memory] Failed to load long-term memory:', error);
    }
  }

  const llmParams = {
    ...params,
    history,
    prompt: context.USER_CONFIG.SYSTEM_INIT_MESSAGE +
      (commandPrompt ? '\n\n' + commandPrompt : '') +
      (memoryPrompt ? '\n\n' + memoryPrompt : '')
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
    console.log(`🤖 [Debug] Family Sheets Enabled: ${ENV.USER_CONFIG.ENABLE_FAMILY_SHEETS} (Type: ${typeof ENV.USER_CONFIG.ENABLE_FAMILY_SHEETS})`);

    // 使用 Truthiness 檢查，避免 "true" !== true 的問題
    if (ENV.USER_CONFIG.ENABLE_FAMILY_SHEETS) {
      toolCommands = commands.filter(cmd =>
        cmd.command === '/budget' ||
        cmd.command === '/schedule' ||
        cmd.command === '/scheduleadd' ||
        cmd.command === '/budgetwrite' ||
        cmd.command === '/delegate'
      );
    } else {
      toolCommands = commands.filter(cmd => cmd.command === '/delegate');

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

        // 更新 commands 引用
        commands.length = 0;
        commands.push(...safeCommands);

        // 從 answer 中移除標記
        for (const cmd of prohibitedCommands) {
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
            const timeZone = resolveUserTimeZone(ENV.USER_CONFIG.USER_TIMEZONE);

            // 解析 JSON 參數
            const params = JSON.parse(args);
            console.log('🤖 [Tool Calling] Params:', JSON.stringify(params));

            // 手動解析日期
            const [year, month, day] = params.date.split('/').map(Number);

            // 構建全天活動格式（使用 date 而不是 dateTime）
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const endDate = new Date(Date.UTC(year, month - 1, day));
            endDate.setUTCDate(endDate.getUTCDate() + 1);
            const endDateStr = `${endDate.getUTCFullYear()}-${String(endDate.getUTCMonth() + 1).padStart(2, '0')}-${String(endDate.getUTCDate()).padStart(2, '0')}`;

            console.log('🤖 [Tool Calling] All-day event date:', dateStr);

            // 構建 Google Calendar API 格式的全天事件資料
            const eventData = {
              summary: params.event,
              start: {
                date: dateStr,
                timeZone
              },
              end: {
                date: endDateStr,
                timeZone
              },
              description: `對象：${params.targetUser}`
            };

            console.log('🤖 [Tool Calling] Event data:', JSON.stringify(eventData, null, 2));

            await createCalendarEvent(context.env, eventData);

            dataText = `✅ 已成功新增全天行程：${params.event}\n`;
            dataText += `📅 日期：${params.date}\n`;
            dataText += `👤 對象：${params.targetUser}\n`;

            if (params.time) {
              const [hour, minute] = params.time.split(':').map(Number);
              const startUtc = zonedTimeToUtc(year, month, day, hour, minute, 0, timeZone);
              const endUtc = new Date(startUtc.getTime() + 60 * 60 * 1000);
              eventData.start = {
                dateTime: startUtc.toISOString(),
                timeZone
              };
              eventData.end = {
                dateTime: endUtc.toISOString(),
                timeZone
              };

              dataText = `✅ 已成功新增行程：${params.event}\n`;
              dataText += `📅 日期：${params.date}\n`;
              dataText += `⏰ 時間：${params.time}\n`;
              dataText += `👤 對象：${params.targetUser}\n`;
            }


          } else if (command === '/delegate') {
            console.log('🤖 [Tool Calling] Delegating to agent...');
            const { delegateToAgent } = await import('./a2a-client.js');
            
            // args format: "agentAlias taskDescription"
            let agentAlias = args;
            let taskDescription = '';
            
            // 處理可能有引號的情況，比如 [CALL:/delegate "no.2" 他是什麼模型？] 或 [CALL:/delegate no.2 他是什麼模型？]
            const trimmedArgs = args.trim();
            const firstSpace = trimmedArgs.indexOf(' ');
            
            if (firstSpace !== -1) {
              agentAlias = trimmedArgs.substring(0, firstSpace).trim();
              taskDescription = trimmedArgs.substring(firstSpace + 1).trim();
            } else {
              agentAlias = trimmedArgs;
            }
            
            // 去除名稱前後可能的雙引號或單引號
            agentAlias = agentAlias.replace(/^["'](.*)["']$/, '$1');

            const result = await delegateToAgent(agentAlias, taskDescription);
            dataText = `🤖 [代理人 ${agentAlias} 的回覆]\n${result}`;
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

  if (ENV.USER_CONFIG.ENABLE_LONG_TERM_MEMORY && ENV.USER_CONFIG.MEMORY_AUTO_SAVE) {
    try {
      if (typeof message === 'string' && typeof answer === 'string' && message.trim()) {
        const {
          getUserMemory,
          getGlobalMemory,
          saveUserMemory,
          saveGlobalMemory,
          updateMemoryFromConversation
        } = await import('../features/memory.js');
        const userId = context.SHARE_CONTEXT.chatHistoryKey.split(':').pop();
        const [currentUserMemory, currentGlobalMemory] = await Promise.all([
          getUserMemory(userId),
          getGlobalMemory()
        ]);
        const memoryPrompt = buildMemoryUpdatePrompt(
          userId,
          message,
          answer,
          currentUserMemory,
          currentGlobalMemory
        );
        const memoryResponse = await llm({
          message: memoryPrompt,
          history: [],
          prompt: 'You are a strict memory editor. Output JSON only.'
        }, context, null);
        const parsed = extractJsonObject(memoryResponse);
        const nextUserMemory = parsed?.userMemory;
        const nextGlobalMemory = parsed?.globalMemory;
        if (typeof nextUserMemory === 'string' && typeof nextGlobalMemory === 'string') {
          await Promise.all([
            saveUserMemory(userId, nextUserMemory),
            saveGlobalMemory(nextGlobalMemory)
          ]);
        } else {
          await updateMemoryFromConversation(userId, message, answer);
        }
      }
    } catch (error) {
      console.error('❌ [Memory] Auto-save failed:', error);
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

    // ASR UX優化: 如果有語音轉錄且設定為顯示，整合到 LLM 回覆中
    let finalAnswer = answer;
    if (context.voiceTranscription && ENV.USER_CONFIG.SHOW_TRANSCRIPTION) {
      finalAnswer = `🎤 ${context.voiceTranscription}\n\n${answer}`;
    }

    // 發送最終文字回覆 (包含 Stream 模式的最後一次更新)
    await sendMessageToTelegramWithContext(context)(finalAnswer);

    // 檢查是否需要語音回覆
    const chatId = context.CURRENT_CHAT_CONTEXT.chat_id;
    const replyMode = await DATABASE.get(`voice_reply:${chatId}`) || 'text';

    if (replyMode === 'voice' && ENV.ENABLE_VOICE_REPLY !== 'false') {
      try {
        console.log('[TTS] Generating voice reply...');
        // 使用 TTS 轉換為語音 (只讀 LLM 的回覆部分，不讀轉錄稿)
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
        // TTS 失敗時降級為文字回覆 (這裡可能已經發送過文字了，不再重複發送，或者只發送錯誤提示?)
        // 由於上面已經 await sendMessageToTelegramWithContext(context)(finalAnswer); 發送了文字
        // 這裡如果 TTS 失敗，其實用戶已經看到文字了，不需要再做什麼，或者可以發個 log。
        // 原本的邏輯是: 如果 TTS 成功 -> return null (不發文字? 不，原本是 "亦或是" 的關係嗎?)
        // 原本: msgChatWithLLM -> chatWithLLM -> return (如果 TTS 成功 return null，否則 return message)
        // 但現在我強制先發送了文字。

        // 如果現在是 Voice Mode:
        // 1. Send Text (Transcript + Answer) [DONE above]
        // 2. Send Voice (Answer only)

        // 用戶可能會收到兩條訊息? 
        // 舊邏輯: 如果 Voice Mode 成功 -> 只發語音? 讓我們回頭確認一下舊代碼。
        // 舊代碼: if (voice) { sendVoice; return null; } else { return sendText; }
        // 這意味著在 Voice Mode 下，舊代碼 *不會* 發送文字訊息!

        // 可是現在我們希望顯示 Transcript。
        // 如果 Voice Mode 下只發語音，那 Transcript 就不會顯示了!
        // 所以在 Voice Mode 下，我們應該 *也要* 發送文字 (包含 Transcript) ?
        // 或者語音訊息的 Caption 包含 Transcript? 語音訊息可以帶 Caption 嗎? 可以 (sendVoice 支援 caption)。

        // 讓我們調整策略:
        // 如果是 Voice Mode:
        //   發送語音訊息，並把 finalAnswer (含 Transcript) 設為 Caption?
        //   Telegram Voice caption 長度限制 1024 字元。 LLM 回覆可能很長。
        //   如果太長，可能要分開。

        // 簡單做法:
        // 總是發送文字訊息 (finalAnswer)。
        // 如果是 Voice Mode，額外發送語音訊息。

        // 這樣用戶會收到:
        // 1. 文字: "🎤 Transcript \n\n Answer"
        // 2. 語音: "Answer (audio)"

        // 這似乎是合理的 UX。

        // 所以:
        // 1. await sendMessageToTelegramWithContext(context)(finalAnswer); (已執行)
        // 2. if (voice) { sendVoice(answer); }

        // 不需要 return null 來阻止發送文字，因為文字已經發送了。
        // 我們只需要確保函式最後回傳正確的東西。
        // chatWithLLM 原本回傳 Response object。
        // sendMessageToTelegramWithContext 回傳 Response object。

        return null;
      }
    }

    return null;

  } catch (e) {
    let errMsg = `Error: ${e.message}`;
    if (errMsg.length > 2048) {
      errMsg = errMsg.substring(0, 2048);
    }
    context.CURRENT_CHAT_CONTEXT.disable_web_page_preview = true;
    return sendMessageToTelegramWithContext(context)(errMsg);
  }
}
