/**
 * LLM 指令調用模組
 * 解析 LLM 回應並添加 Inline Keyboard 按鈕
 */

import { ENV } from '../config/env.js';

/**
 * 解析 LLM 回應，提取指令調用
 * @param {string} answer - LLM 回應文字
 * @returns {Array<{command: string, args: string}>} 指令列表
 */
export function parseCommandsFromLLMResponse(answer) {
    if (!answer || typeof answer !== 'string') {
        return [];
    }

    // 匹配 [CALL:/command args] 格式，支持 JSON 參數
    const regex = /\[CALL:(\/\w+)(?:\s+([^\]]+))?\]/gs;
    const commands = [];
    let match;

    while ((match = regex.exec(answer)) !== null) {
        commands.push({
            command: match[1],  // 例如: "/wt"
            args: match[2] ? match[2].trim() : ''  // 例如: "台北"
        });
    }

    return commands;
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

    // 移除所有 [CALL:...] 標記，支持 JSON 參數
    return answer.replace(/\[CALL:\/\w+(?:\s+[^\]]+)?\]/gs, '').trim();
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
            // 使用 callback_data 而不是直接發送訊息
            // 這樣可以讓我們在 callback 中處理
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
