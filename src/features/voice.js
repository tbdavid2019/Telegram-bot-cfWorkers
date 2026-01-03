import { getFileLink } from '../telegram/telegram.js';
import { ENV } from '../config/env.js';

/**
 * ASR (語音轉文字) 配置 - 多供應商支援
 */
function getASRConfig() {
    const config = {
        apiKey: ENV.USER_CONFIG.ASR_API_KEY || ENV.USER_CONFIG.GROQ_API_KEY || ENV.USER_CONFIG.OPENAI_API_KEY[0],
        apiBase: ENV.USER_CONFIG.ASR_API_BASE || 'https://api.groq.com/openai/v1',
        model: ENV.USER_CONFIG.ASR_MODEL || 'whisper-large-v3',
        language: ENV.USER_CONFIG.ASR_LANGUAGE || 'zh'
    };

    console.log('[Voice] ASR Config:', {
        apiBase: config.apiBase,
        model: config.model,
        language: config.language
    });

    // 調試: 檢查 API key 來源和內容
    console.log('[Voice] API Key Debug:', {
        ASR_API_KEY_value: ENV.USER_CONFIG.ASR_API_KEY,
        GROQ_API_KEY_value: ENV.USER_CONFIG.GROQ_API_KEY,
        OPENAI_API_KEY_value: ENV.USER_CONFIG.OPENAI_API_KEY,
        hasASR: !!ENV.USER_CONFIG.ASR_API_KEY,
        hasGROQ: !!ENV.USER_CONFIG.GROQ_API_KEY,
        hasOpenAI: !!ENV.USER_CONFIG.OPENAI_API_KEY,
        finalKeyLength: config.apiKey?.length,
        finalKeyPrefix: config.apiKey?.substring(0, 20),
        finalKeySuffix: config.apiKey?.substring(config.apiKey?.length - 10)
    });

    return config;
}

/**
 * 語音轉文字 (支援 Groq / OpenAI 等 OpenAI 相容 API)
 */
export async function transcribeVoiceMessage(fileUrl) {
    const config = getASRConfig();

    // 下載音訊
    const audioResponse = await fetch(fileUrl);
    if (!audioResponse.ok) {
        throw new Error(`Failed to download audio: ${audioResponse.status}`);
    }
    const audioBlob = await audioResponse.blob();

    console.log('[Voice] Audio downloaded:', {
        size: audioBlob.size,
        type: audioBlob.type
    });

    // 準備 FormData (OpenAI API 相容格式)
    const formData = new FormData();
    formData.append('file', audioBlob, 'voice.ogg');
    formData.append('model', config.model);
    formData.append('language', config.language);
    formData.append('temperature', '0');
    formData.append('response_format', 'json');

    // 呼叫 ASR API
    const endpoint = `${config.apiBase}/audio/transcriptions`;
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${config.apiKey}` },
        body: formData
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ASR API error (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    return result.text || '';
}

/**
 * 處理語音訊息的中介層
 */
export async function msgHandleVoiceMessage(message, context) {
    if (!message.voice) return null;
    if (ENV.USER_CONFIG.ENABLE_VOICE_TRANSCRIPTION === false) return null;

    try {
        console.log('[Voice] Processing voice message', {
            fileId: message.voice.file_id,
            duration: message.voice.duration,
            fileSize: message.voice.file_size
        });

        // 顯示處理中狀態
        await fetch(
            `https://api.telegram.org/bot${context.SHARE_CONTEXT.currentBotToken}/sendChatAction`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: context.CURRENT_CHAT_CONTEXT.chat_id,
                    action: 'typing'
                })
            }
        );

        // 取得音訊 URL
        const fileUrl = await getFileLink(
            message.voice.file_id,
            context.SHARE_CONTEXT.currentBotToken
        );

        if (!fileUrl) {
            throw new Error('Failed to get voice file URL');
        }

        // 轉錄語音
        const startTime = Date.now();
        const transcribedText = await transcribeVoiceMessage(fileUrl);
        const processingTime = Date.now() - startTime;

        console.log('[Voice] Transcription completed', {
            textLength: transcribedText.length,
            processingTime: `${processingTime}ms`
        });

        if (!transcribedText.trim()) {
            throw new Error('Empty transcription');
        }

        // 設為訊息文字,讓 LLM 處理
        message.text = transcribedText;
        // 保存轉錄結果到 context 供後續使用
        context.voiceTranscription = transcribedText;

        // 可選: 顯示轉錄結果 (已改為整合到 LLM 回覆中)
        // if (ENV.USER_CONFIG.SHOW_TRANSCRIPTION === true) { ... }

        return null; // 繼續執行 LLM 處理

    } catch (error) {
        console.error('[Voice] Error:', error);
        console.error('[Voice] Error stack:', error.stack);
        const { sendMessageToTelegramWithContext } = await import('../telegram/telegram.js');

        // 友善的錯誤訊息
        let errorMessage = '❌ 語音處理失敗';
        if (error.message.includes('quota') || error.message.includes('limit')) {
            errorMessage = '❌ 語音轉錄額度已用盡,請稍後再試或使用文字輸入';
        } else if (error.message.includes('format')) {
            errorMessage = '❌ 不支援的音訊格式';
        } else {
            // 在開發模式下顯示詳細錯誤
            if (ENV.DEBUG_MODE === 'true') {
                errorMessage = `❌ 語音處理失敗: ${error.message}`;
            } else {
                errorMessage = `❌ 語音處理失敗,請使用文字輸入`;
            }
        }

        return sendMessageToTelegramWithContext(context)(errorMessage);
    }
}
