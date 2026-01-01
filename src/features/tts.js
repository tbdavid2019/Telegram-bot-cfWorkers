import { ENV } from '../config/env.js';

/**
 * TTS (文字轉語音) 配置 - 多供應商支援
 */
function getTTSConfig() {
    return {
        apiKey: ENV.USER_CONFIG.TTS_API_KEY || ENV.USER_CONFIG.GROQ_API_KEY || ENV.USER_CONFIG.OPENAI_API_KEY[0],
        apiBase: ENV.USER_CONFIG.TTS_API_BASE || 'https://api.groq.com/openai/v1',
        model: ENV.USER_CONFIG.TTS_MODEL || 'canopylabs/orpheus-v1-english', // 實測可講中文!
        voice: ENV.USER_CONFIG.TTS_VOICE || 'autumn',
        speed: parseFloat(ENV.USER_CONFIG.TTS_SPEED || '1.0'),
        format: ENV.USER_CONFIG.TTS_FORMAT || 'wav'
    };
}

/**
 * 文字轉語音 (支援 Groq / OpenAI 等 OpenAI 相容 API)
 */
export async function textToSpeech(text) {
    const config = getTTSConfig();

    console.log('[TTS] Config:', {
        apiBase: config.apiBase,
        model: config.model,
        voice: config.voice
    });

    const response = await fetch(`${config.apiBase}/audio/speech`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: config.model,
            voice: config.voice,
            input: text,
            speed: config.speed,
            response_format: config.format
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`TTS API error (${response.status}): ${errorText}`);
    }

    return await response.blob();
}

/**
 * 發送語音訊息
 */
export async function sendVoiceMessage(chatId, audioBlob, token) {
    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('voice', audioBlob, 'response.ogg');

    const response = await fetch(
        `https://api.telegram.org/bot${token}/sendVoice`,
        { method: 'POST', body: formData }
    );

    if (!response.ok) {
        throw new Error(`Failed to send voice: ${response.status}`);
    }

    return await response.json();
}
