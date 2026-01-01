import { sendMessageToTelegramWithContext } from '../telegram/telegram.js';
import { DATABASE } from '../config/env.js';

/**
 * /voicereply 指令 - 切換語音回覆模式
 */
export async function commandVoiceReply(message, command, subcommand, context) {
    // 取得目前設定
    const chatId = context.CURRENT_CHAT_CONTEXT.chat_id;
    const currentMode = await DATABASE.get(`voice_reply:${chatId}`) || 'text';

    // 建立 Inline Keyboard
    const keyboard = {
        inline_keyboard: [
            [
                {
                    text: currentMode === 'text' ? '✅ 文字回覆' : '⚪ 文字回覆',
                    callback_data: '/voicereply:text'
                },
                {
                    text: currentMode === 'voice' ? '✅ 語音回覆' : '⚪ 語音回覆',
                    callback_data: '/voicereply:voice'
                }
            ]
        ]
    };

    // 設置 reply_markup 和 parse_mode 到 context
    context.CURRENT_CHAT_CONTEXT.reply_markup = keyboard;
    context.CURRENT_CHAT_CONTEXT.parse_mode = 'Markdown';

    return sendMessageToTelegramWithContext(context)(
        `🔊 *語音回覆設定*\n\n目前模式: ${currentMode === 'voice' ? '🎤 語音回覆' : '💬 文字回覆'}\n\n請選擇回覆模式:`
    );
}
