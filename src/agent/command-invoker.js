/**
 * LLM 指令調用模組
 * 解析 LLM 回應並添加 Inline Keyboard 按鈕
 */

import { ENV } from '../config/env.js';

/**
 * 提取 LLM 回應中的所有指令調用
 * 支援 JSON 參數、巢狀括號 [TOC]、Markdown 連結與多行文本
 * @param {string} text - LLM 回應文字
 * @returns {Array<{command: string, args: string, fullMatch: string, start: number, end: number}>}
 */
export function extractCommandCalls(text) {
    if (!text || typeof text !== 'string') {
        return [];
    }

    const results = [];
    const marker = '[CALL:';
    let startIndex = 0;

    while (startIndex < text.length) {
        const callPos = text.indexOf(marker, startIndex);
        if (callPos === -1) break;

        const afterCall = callPos + marker.length;
        // 匹配指令名稱 (例如: /wiki, /web, /box, /wt 等)
        const cmdMatch = text.slice(afterCall).match(/^(\/[\w-]+)/);
        if (!cmdMatch) {
            startIndex = afterCall;
            continue;
        }

        const command = cmdMatch[1];
        const argsStart = afterCall + command.length;

        // 尋找對應的閉合中括號 ']'，處理字串引號與巢狀括號
        let depth = 1;
        let inString = false;
        let stringChar = '';
        let isEscaped = false;
        let endPos = -1;

        for (let i = argsStart; i < text.length; i++) {
            const char = text[i];

            if (inString) {
                if (isEscaped) {
                    isEscaped = false;
                } else if (char === '\\') {
                    isEscaped = true;
                } else if (char === stringChar) {
                    inString = false;
                }
            } else {
                if (char === '"' || char === "'" || char === '`') {
                    inString = true;
                    stringChar = char;
                } else if (char === '[') {
                    depth++;
                } else if (char === ']') {
                    depth--;
                    if (depth === 0) {
                        endPos = i;
                        break;
                    }
                }
            }
        }

        if (endPos === -1) {
            // 容錯防禦：若 LLM 內部包含未轉義引號導致狀態機失真，尋找最外層的閉合中括號 ']'
            const lastBracket = text.lastIndexOf(']');
            if (lastBracket > callPos) {
                endPos = lastBracket;
            }
        }

        if (endPos !== -1) {
            const fullMatch = text.slice(callPos, endPos + 1);
            const args = text.slice(argsStart, endPos).trim();
            results.push({
                command,
                args,
                fullMatch,
                start: callPos,
                end: endPos + 1
            });
            startIndex = endPos + 1;
        } else {
            // 若未找到閉合括號，前進指標避免無窮迴圈
            startIndex = afterCall;
        }
    }

    return results;
}

/**
 * 提取 LLM 回應中的續問建議
 * 支援 [SUGGEST:問題] 與 [ASK:問題]
 * @param {string} text - LLM 回應文字
 * @returns {Array<string>} 建議問題列表
 */
export function extractSuggestions(text) {
    if (!text || typeof text !== 'string') {
        return [];
    }

    const suggestions = [];
    const regex = /\[(?:SUGGEST|ASK):\s*([^\]]+)\]/gi;
    let match;
    while ((match = regex.exec(text)) !== null) {
        const question = match[1].trim();
        if (question && !suggestions.includes(question)) {
            suggestions.push(question);
        }
    }

    return suggestions.slice(0, 4); // 最多 4 個續問按鈕
}

/**
 * 格式化按鈕顯示文字（超長自動截斷為 ...）
 * @param {string} text - 原始文字
 * @param {number} maxLength - 最大長度（預設 32 字元）
 * @returns {string} 格式化後的文字
 */
export function truncateButtonText(text, maxLength = 32) {
    if (!text || typeof text !== 'string') return '';
    const trimmed = text.trim();
    if (trimmed.length <= maxLength) {
        return trimmed;
    }
    return trimmed.slice(0, maxLength - 3) + '...';
}
 * 解析 LLM 回應，提取指令調用
 * @param {string} answer - LLM 回應文字
 * @returns {Array<{command: string, args: string}>} 指令列表
 */
export function parseCommandsFromLLMResponse(answer) {
    const calls = extractCommandCalls(answer);
    return calls.map(c => ({
        command: c.command,
        args: c.args
    }));
}

/**
 * 從 LLM 回應中移除所有指令調用與續問標記
 * @param {string} answer - LLM 回應
 * @returns {string} 清理後的回應
 */
export function removeCommandMarkers(answer) {
    if (!answer || typeof answer !== 'string') {
        return answer;
    }

    // 先移除 [CALL:...] 標記
    const calls = extractCommandCalls(answer);
    let cleaned = answer;
    if (calls.length === 0) {
        cleaned = answer.replace(/\[CALL:\/\w+(?:\s+[^\]]+)?\]/gs, '');
    } else {
        for (let i = calls.length - 1; i >= 0; i--) {
            const { start, end } = calls[i];
            cleaned = cleaned.slice(0, start) + cleaned.slice(end);
        }
    }

    // 再移除 [SUGGEST:...] 與 [ASK:...] 標記
    cleaned = cleaned.replace(/\[(?:SUGGEST|ASK):\s*[^\]]+\]/gis, '');

    return cleaned.trim();
}

/**
 * 生成 Inline Keyboard 按鈕（同時支援指令與續問按鈕）
 * @param {Array<{command: string, args: string}>} commands - 指令列表
 * @param {Array<string>} suggestions - 續問建議列表
 * @returns {Object|null} Telegram Inline Keyboard markup
 */
export function generateInlineKeyboard(commands = [], suggestions = []) {
    const buttons = [];

    // 1. 指令按鈕
    if (Array.isArray(commands)) {
        for (const { command, args } of commands) {
            const commandText = args ? `${command} ${args}` : command;
            const buttonText = `🔹 ${commandText}`;
            buttons.push([{
                text: buttonText,
                callback_data: `cmd:${commandText}`
            }]);
        }
    }

    // 2. 智慧續問按鈕 (Stateless 零 KV 模式，callback_data 帶索引，顯示文字超長自動 ...)
    if (Array.isArray(suggestions)) {
        for (let i = 0; i < suggestions.length; i++) {
            const suggestion = suggestions[i];
            if (!suggestion) continue;
            const displayLabel = truncateButtonText(suggestion, 32);
            buttons.push([{
                text: displayLabel,
                callback_data: `ask:${i}`
            }]);
        }
    }

    if (buttons.length === 0) {
        return null;
    }

    return {
        inline_keyboard: buttons
    };
}

/**
 * 處理 LLM 回應中的所有指令調用與智慧續問
 * 不發送指令訊息，而是添加 Inline Keyboard 按鈕
 * @param {string} answer - LLM 回應
 * @param {Object} context - 當前上下文
 * @returns {Promise<{cleanedAnswer: string, replyMarkup: Object|null}>}
 */
export async function processCommandInvocations(answer, context) {
    const commands = parseCommandsFromLLMResponse(answer);
    const suggestions = extractSuggestions(answer);

    if (commands.length === 0 && suggestions.length === 0) {
        return {
            cleanedAnswer: answer,
            replyMarkup: null
        };
    }

    if (commands.length > 0) {
        console.log(`🤖 [Command Discovery] LLM 建議了 ${commands.length} 個指令:`, commands);
    }
    if (suggestions.length > 0) {
        console.log(`💡 [Follow-up Suggestions] LLM 生成了 ${suggestions.length} 個續問建議:`, suggestions);
    }

    // 移除 [CALL:...] 與 [SUGGEST:...] 標記
    const cleanedAnswer = removeCommandMarkers(answer);

    // 生成 Inline Keyboard
    const replyMarkup = generateInlineKeyboard(commands, suggestions);

    return {
        cleanedAnswer,
        replyMarkup
    };
}

/**
 * 處理 Inline Keyboard 指令按鈕的 callback
 * 當用戶點擊按鈕時，模擬用戶發送指令訊息
 * @param {Object} callbackQuery - Telegram callback query
 * @param {Object} context - 當前上下文
 * @returns {Promise<void>}
 */
export async function handleCommandCallback(callbackQuery, context) {
    const data = callbackQuery.data;

    if (!data || !data.startsWith('cmd:')) {
        return;
    }

    // 提取指令文字
    const commandText = data.substring(4); // 移除 "cmd:" 前綴

    console.log(`🤖 [Command Discovery] 用戶點擊指令按鈕: ${commandText}`);

    // 創建一個模擬的訊息對象
    const simulatedMessage = {
        ...callbackQuery.message,
        text: commandText,
        from: callbackQuery.from
    };

    // 更新 context 的訊息
    context.message = simulatedMessage;

    // 回應 callback query（移除按鈕的載入狀態）
    const { answerCallbackQuery } = await import('../telegram/telegram.js');
    await answerCallbackQuery(
        context.SHARE_CONTEXT.currentBotToken,
        callbackQuery.id,
        `執行指令: ${commandText}`
    );

    // 處理指令
    const { handleCommandMessage } = await import('../telegram/commands.js');
    return await handleCommandMessage(simulatedMessage, context);
}

/**
 * 處理智慧續問按鈕的 callback（完全無狀態 Stateless，0 次 KV 寫入）
 * 從 Telegram 原生 callbackQuery.message.reply_markup 中提取按鈕文字
 * @param {Object} callbackQuery - Telegram callback query
 * @param {Object} context - 當前上下文
 * @returns {Promise<void>}
 */
export async function handleFollowUpCallback(callbackQuery, context) {
    const data = callbackQuery.data;

    if (!data || !data.startsWith('ask:')) {
        return;
    }

    console.log(`💡 [Follow-up Callback] 收到續問點擊: ${data}`);

    let questionText = '';

    // 從 Telegram 原生攜帶的 reply_markup 中提取按鈕文字 (0 次 KV 消耗)
    const keyboard = callbackQuery.message?.reply_markup?.inline_keyboard;
    if (Array.isArray(keyboard)) {
        for (const row of keyboard) {
            if (!Array.isArray(row)) continue;
            for (const btn of row) {
                if (btn?.callback_data === data && btn?.text) {
                    questionText = btn.text;
                    break;
                }
            }
            if (questionText) break;
        }
    }

    // 容錯防禦：若未透過 callback_data 匹配到，嘗試解析索引
    if (!questionText && Array.isArray(keyboard)) {
        const idx = parseInt(data.substring(4), 10);
        if (!isNaN(idx) && keyboard[idx] && keyboard[idx][0]?.text) {
            questionText = keyboard[idx][0].text;
        }
    }

    if (!questionText) {
        console.warn(`⚠️ [Follow-up Callback] 無法從 reply_markup 提取問題文字: ${data}`);
        return;
    }

    console.log(`💡 [Follow-up Callback] 提取到續問內容: "${questionText}"`);

    // 回應 callback query（移除按鈕上的 loading 轉圈狀態）
    const { answerCallbackQuery } = await import('../telegram/telegram.js');
    await answerCallbackQuery(
        context.SHARE_CONTEXT.currentBotToken,
        callbackQuery.id,
        `💡 續問：${questionText.slice(0, 20)}...`
    );

    // 創建模擬訊息對象
    const simulatedMessage = {
        ...callbackQuery.message,
        text: questionText,
        from: callbackQuery.from
    };

    // 重置 message_id 與 reply_markup，使機器人以「全新訊息」回答續問，避免覆蓋舊訊息
    context.CURRENT_CHAT_CONTEXT.message_id = null;
    context.CURRENT_CHAT_CONTEXT.reply_markup = null;
    context.message = simulatedMessage;

    // 調用 LLM 接續對話
    const { chatWithLLM } = await import('./llm.js');
    return await chatWithLLM({ message: questionText }, context, null);
}

