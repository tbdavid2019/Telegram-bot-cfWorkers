/**
 * LLM 指令發現模組
 * 提取可用指令、檢查權限、生成系統提示詞
 */

import { commandHandlers } from '../telegram/commands.js';
import { ENV, CONST } from '../config/env.js';
import { getChatRoleWithContext } from '../telegram/telegram.js';

/**
 * 檢查用戶對特定指令的權限
 * @param {string} command - 指令名稱（如 "/wt"）
 * @param {Object} context - 當前上下文
 * @returns {Promise<boolean>} 是否有權限
 */
export async function checkCommandPermission(command, context) {
    const handler = commandHandlers[command];
    if (!handler) {
        return false;
    }

    const { scopes, needAuth } = handler;
    const chatType = context.SHARE_CONTEXT.chatType;
    const chatId = context.CURRENT_CHAT_CONTEXT.chat_id;
    const speakerId = context.SHARE_CONTEXT.speakerId;

    // 檢查 scopes
    if (!scopes || scopes.length === 0) {
        return false;
    }

    // 私聊檢查
    if (chatType === 'private') {
        if (!scopes.includes('all_private_chats')) {
            return false;
        }
    }

    // 群組檢查
    if (CONST.GROUP_TYPES.includes(chatType)) {
        const hasGroupScope = scopes.includes('all_group_chats');
        const hasAdminScope = scopes.includes('all_chat_administrators');

        if (!hasGroupScope && !hasAdminScope) {
            return false;
        }

        // 如果需要管理員權限
        if (hasAdminScope && !hasGroupScope) {
            const getChatRole = getChatRoleWithContext(context);
            const role = await getChatRole(speakerId);
            if (role !== 'administrator' && role !== 'creator') {
                return false;
            }
        }
    }

    // 檢查 needAuth
    if (needAuth && typeof needAuth === 'function') {
        const authResult = needAuth(chatType);
        if (!authResult) {
            return false;
        }
    }

    return true;
}

/**
 * 提取所有可用指令的元數據
 * @param {Object} context - 當前上下文
 * @returns {Promise<Array>} 可用指令列表
 */
export async function extractAvailableCommands(context) {
    const commands = [];

    for (const [command, handler] of Object.entries(commandHandlers)) {
        // 跳過隱藏的系統指令
        const hiddenCommands = ['/setenv', '/delenv', '/clearenv', '/setenvs', '/version', '/start', '/redo'];
        if (hiddenCommands.includes(command)) {
            continue;
        }

        // 檢查權限
        const hasPermission = await checkCommandPermission(command, context);
        if (!hasPermission) {
            continue;
        }

        commands.push({
            command,
            description: handler.description || '無說明',
            scopes: handler.scopes || []
        });
    }

    return commands;
}

/**
 * 生成 LLM 系統提示詞（包含可用指令列表）
 * @param {Object} context - 當前上下文
 * @returns {Promise<string>} 系統提示詞
 */
export async function generateCommandSystemPrompt(context) {
    const commands = await extractAvailableCommands(context);

    if (commands.length === 0) {
        return '';
    }

    let prompt = '## 可用指令\n\n';
    prompt += '你可以使用以下指令幫助用戶：\n\n';

    // 按類別組織指令
    const cachedCategories = {
        '天氣相關': ['/wt', '/weatheralert'],
        '股票相關': ['/stocktw', '/stock', '/stock2'],
        '占卜相關': ['/qi', '/oracle', '/poetry', '/boa', '/bo'],
        '法律相關': ['/law'],
        '字典相關': ['/dict', '/dictcn', '/dicten'],
        '網路工具': ['/ip', '/dns', '/dns2'],
        '位置服務': ['/gps'],
        '圖片生成': ['/img', '/img2', '/setimg'],
        '系統功能': ['/help', '/new', '/system', '/llmchange']
    };

    // 根據環境變數決定是否加入家庭管理功能
    if (ENV.USER_CONFIG.ENABLE_FAMILY_SHEETS) {
        cachedCategories['家庭管理'] = ['/budget', '/schedule'];
    } else {
        // 明確告知 LLM 沒有相關權限，防止 Hallucination
        prompt += '注意：你目前沒有權限訪問家庭行程表或收支表。如果用戶詢問相關資訊（如「查行程」、「記帳」等），請明確告知無法查詢，不要嘗試假裝查詢。\n\n';
    }

    for (const [category, categoryCommands] of Object.entries(cachedCategories)) {
        const categoryItems = commands.filter(c => categoryCommands.includes(c.command));
        if (categoryItems.length > 0) {
            prompt += `### ${category}\n`;
            for (const cmd of categoryItems) {
                prompt += `- \`${cmd.command}\` - ${cmd.description}\n`;
            }
            prompt += '\n';
        }
    }


    // 其他未分類的指令
    const categorizedCommands = Object.values(cachedCategories).flat();
    const otherCommands = commands.filter(c => !categorizedCommands.includes(c.command));
    if (otherCommands.length > 0) {
        prompt += '### 其他功能\n';
        for (const cmd of otherCommands) {
            prompt += `- \`${cmd.command}\` - ${cmd.description}\n`;
        }
        prompt += '\n';
    }

    // 加入當前時間資訊
    const now = new Date();
    const currentDateTime = now.toLocaleString('zh-TW', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Taipei'
    });
    prompt += `\n**當前時間**：${currentDateTime}\n\n`;

    // 使用說明
    prompt += '## 如何調用指令\n\n';
    prompt += '當用戶需要這些功能時，你可以使用特殊標記來調用指令：\n\n';
    prompt += '**格式**：`[CALL:指令 參數]`\n\n';
    prompt += '**範例**：\n';
    prompt += '用戶問「台北天氣如何？」→ 回應中包含 `[CALL:/wt 台北]`\n';
    prompt += '- 用戶問「查詢台股 2330」→ 回應中包含 `[CALL:/stocktw 2330]`\n';
    prompt += '- 用戶問「AI 生成內容的法律問題」→ 回應中包含 `[CALL:/law AI產生的不實訊息會構成誹謗罪嗎？]`\n';
    // /budget 和 /schedule 已改為 Tool Calling，不再顯示為 Inline Keyboard 範例
    prompt += '- 用戶問「記帳：12月房租 15000」→ 回應中包含 `[CALL:/budgetwrite {"month": "2025/12", "category": "rent", "amount": 15000}]`\n';
    prompt += '- 用戶問「幫我加行程：明天下午3點去好市多」 (假設今天是 2025/01/01) →\n';
    prompt += '  回應中包含 `[CALL:/scheduleadd {"date": "2025/01/02", "time": "15:00", "targetUser": "爸爸", "event": "去好市多"}]`\n\n';
    prompt += '**重要**：\n';
    prompt += '1. 調用標記會被自動處理，用戶看不到這個標記\n';
    prompt += '2. 指令會自動執行並回覆用戶\n';
    prompt += '3. 你只需要告知用戶「正在為您查詢...」或類似的提示\n';
    prompt += '4. 一次可以調用多個指令\n';
    prompt += '5. 請謹慎判斷用戶意圖，只在確實需要時才調用指令\n';
    prompt += '6. **關鍵**：當用戶詢問「家庭收支」或「行程」時，你**必須主動**使用 `[CALL:/budget ...]` 或 `[CALL:/schedule ...]` 指令來獲取資料。資料**不會**自動出現，你必須調用指令！**絕對不可以**自己編造數據或日期！\n';
    prompt += '7. 如果你沒有調用指令，你就無法回答用戶的問題。請務必生成 `[CALL:...]` 標記。\n';

    return prompt;
}
