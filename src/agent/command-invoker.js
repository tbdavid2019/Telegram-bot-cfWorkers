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
 * 從 LLM 回應中移除指令調用標記
 * @param {string} answer - LLM 回應
 * @returns {string} 清理後的回應
 */
export function removeCommandMarkers(answer) {
    if (!answer || typeof answer !== 'string') {
        return answer;
    }

    const calls = extractCommandCalls(answer);
    if (calls.length === 0) {
        // 備用正則清理殘留的簡單標記
        return answer.replace(/\[CALL:\/\w+(?:\s+[^\]]+)?\]/gs, '').trim();
    }

    // 從後往前替換以保持索引正確
    let cleaned = answer;
    for (let i = calls.length - 1; i >= 0; i--) {
        const { start, end } = calls[i];
        cleaned = cleaned.slice(0, start) + cleaned.slice(end);
    }

    return cleaned.trim();
}

/**
 * 生成 Inline Keyboard 按鈕
 * @param {Array<{command: string, args: string}>} commands - 指令列表
 * @returns {Object|null} Telegram Inline Keyboard markup
 */
export function generateInlineKeyboard(commands) {
    if (!commands || commands.length === 0) {
        return null;
    }

    // 每個指令生成一個按鈕
    const buttons = commands.map(({ command, args }) => {
        const commandText = args ? `${command} ${args}` : command;
        const buttonText = `🔹 ${commandText}`;

        return [{
            text: buttonText,
            callback_data: `cmd:${commandText}`
        }];
    });

    return {
        inline_keyboard: buttons
    };
}

/**
 * 處理 LLM 回應中的所有指令調用
 * 不發送指令訊息，而是添加 Inline Keyboard 按鈕
 * @param {string} answer - LLM 回應
 * @param {Object} context - 當前上下文
 * @returns {Promise<{cleanedAnswer: string, replyMarkup: Object|null}>}
 */
export async function processCommandInvocations(answer, context) {
    const commands = parseCommandsFromLLMResponse(answer);

    if (commands.length === 0) {
        return {
            cleanedAnswer: answer,
            replyMarkup: null
        };
    }

    console.log(`🤖 [Command Discovery] LLM 建議了 ${commands.length} 個指令:`, commands);

    // 移除 [CALL:...] 標記
    const cleanedAnswer = removeCommandMarkers(answer);

    // 生成 Inline Keyboard
    const replyMarkup = generateInlineKeyboard(commands);

    return {
        cleanedAnswer,
        replyMarkup
    };
}

/**
 * 處理 Inline Keyboard 按鈕的 callback
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
