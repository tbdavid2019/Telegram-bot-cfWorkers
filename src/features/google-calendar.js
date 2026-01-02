import { sendMessageToTelegramWithContext } from '../telegram/telegram.js';
import { getUserMapping, resolveUserMention } from './google-sheets.js';
import { ENV } from '../config/env.js';

// 全域快取
let GOOGLE_CALENDAR_ACCESS_TOKEN = null;
let CALENDAR_TOKEN_EXPIRY_TIME = 0;

// === Google Calendar API 認證 ===

/**
 * 取得 Google Calendar API Access Token (重用 Sheets 的認證機制)
 */
async function authenticateGoogleCalendar(env) {
    // 檢查快取
    const now = Math.floor(Date.now() / 1000);
    if (GOOGLE_CALENDAR_ACCESS_TOKEN && now < CALENDAR_TOKEN_EXPIRY_TIME - 60) {
        return GOOGLE_CALENDAR_ACCESS_TOKEN;
    }

    // 重用 google-sheets.js 的認證邏輯
    const { authenticateGoogleSheets } = await import('./google-sheets.js');
    const token = await authenticateGoogleSheets(env);

    GOOGLE_CALENDAR_ACCESS_TOKEN = token;
    CALENDAR_TOKEN_EXPIRY_TIME = now + 3600;

    return token;
}

// === Calendar API 基礎函式 ===

/**
 * 列出事件
 * @param {Object} env - 環境變數
 * @param {string} timeMin - 開始時間 (RFC3339 格式)
 * @param {string} timeMax - 結束時間 (RFC3339 格式)
 */
export async function listCalendarEvents(env, timeMin, timeMax) {
    const token = await authenticateGoogleCalendar(env);
    const calendarId = ENV.USER_CONFIG.FAMILY_CALENDAR_ID;
    console.log(`[Google Calendar] Querying Calendar: ${calendarId}, Min: ${timeMin}, Max: ${timeMax}`);

    let url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?`;
    const params = new URLSearchParams({
        orderBy: 'startTime',
        singleEvents: 'true',
        timeZone: 'Asia/Taipei'
    });

    if (timeMin) params.append('timeMin', timeMin);
    if (timeMax) params.append('timeMax', timeMax);

    url += params.toString();

    const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
        throw new Error(`List events failed: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`[Google Calendar] Response items: ${data.items ? data.items.length : 0}`);
    return data.items || [];
}

/**
 * 新增事件
 */
export async function createCalendarEvent(env, eventData) {
    const token = await authenticateGoogleCalendar(env);
    const calendarId = ENV.USER_CONFIG.FAMILY_CALENDAR_ID;

    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventData)
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Create event failed: ${err}`);
    }

    return await response.json();
}

/**
 * 刪除事件
 */
async function deleteCalendarEvent(env, eventId) {
    const token = await authenticateGoogleCalendar(env);
    const calendarId = ENV.USER_CONFIG.FAMILY_CALENDAR_ID;

    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`;

    const response = await fetch(url, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok && response.status !== 410) { // 410 = already deleted
        throw new Error(`Delete event failed: ${response.statusText}`);
    }
}

// === 輔助函式 ===

/**
 * 解析自然語言時間 (簡單版)
 */
function parseNaturalTime(text) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // 「今天」
    if (text.includes('今天') || text.includes('今日')) {
        return {
            start: new Date(today),
            end: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        };
    }

    // 「明天」
    if (text.includes('明天') || text.includes('明日')) {
        const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
        return {
            start: tomorrow,
            end: new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000)
        };
    }

    // 「本週」
    if (text.includes('本週') || text.includes('這週')) {
        const dayOfWeek = now.getDay();
        const startOfWeek = new Date(today.getTime() - dayOfWeek * 24 * 60 * 60 * 1000);
        const endOfWeek = new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000);
        return { start: startOfWeek, end: endOfWeek };
    }

    // 預設：今天到未來 7 天
    return {
        start: today,
        end: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
    };
}

/**
 * 將 Date 轉為 RFC3339 格式
 */
function toRFC3339(date) {
    return date.toISOString();
}

// === 指令處理器 ===

export async function commandQueryCalendar(message, command, subcommand, context) {
    if (ENV.USER_CONFIG.ENABLE_FAMILY_SHEETS !== true) return;

    try {
        // 解析時間範圍
        const timeRange = parseNaturalTime(subcommand || '今天');
        const events = await listCalendarEvents(
            context.env,
            toRFC3339(timeRange.start),
            toRFC3339(timeRange.end)
        );

        if (events.length === 0) {
            return sendMessageToTelegramWithContext(context)(`📅 查無行程`);
        }

        let response = `📅 **家庭行程**\n\n`;
        for (const event of events) {
            const start = event.start.dateTime || event.start.date;
            const startDate = new Date(start);
            const timeStr = event.start.dateTime
                ? startDate.toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                : startDate.toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei', month: 'numeric', day: 'numeric' });

            response += `**${timeStr}**\n`;
            response += `📌 ${event.summary || '(無標題)'}\n`;
            if (event.location) response += `📍 ${event.location}\n`;
            if (event.description) response += `📝 ${event.description}\n`;
            response += `------------------\n`;
        }

        context.CURRENT_CHAT_CONTEXT.parse_mode = "Markdown";
        return sendMessageToTelegramWithContext(context)(response);

    } catch (e) {
        return sendMessageToTelegramWithContext(context)(`❌ 查詢失敗: ${e.message}`);
    }
}

export async function commandCreateCalendar(message, command, subcommand, context) {
    if (ENV.USER_CONFIG.ENABLE_FAMILY_SHEETS !== true) return;

    try {
        // 參數格式：JSON {"date": "2026-01-02", "time": "15:00", "targetUser": "小茹", "event": "去好市多", "location": ""}
        const params = JSON.parse(subcommand);

        // 建立事件資料
        const startDateTime = `${params.date}T${params.time}:00+08:00`;
        const endDateTime = new Date(new Date(startDateTime).getTime() + 60 * 60 * 1000).toISOString().replace('Z', '+08:00');

        const eventData = {
            summary: params.event,
            description: params.content || `對象：${params.targetUser}`,
            start: {
                dateTime: startDateTime,
                timeZone: 'Asia/Taipei'
            },
            end: {
                dateTime: endDateTime,
                timeZone: 'Asia/Taipei'
            },
            reminders: {
                useDefault: false,
                overrides: [
                    { method: 'popup', minutes: 30 }
                ]
            }
        };

        // 如果有 targetUser，嘗試加入 attendees
        if (params.targetUser) {
            const mapping = await getUserMapping(context.env);
            const user = mapping.find(u => u.names.some(n => n === params.targetUser));
            if (user && user.email) {
                eventData.attendees = [{ email: user.email }];
            }
        }

        // 如果有地點
        if (params.location) {
            eventData.location = params.location;
        }

        const createdEvent = await createCalendarEvent(context.env, eventData);

        // 格式化回應
        const mention = await resolveUserMention(context.env, params.targetUser);
        let response = `✅ 已新增行程\n`;
        response += `📅 ${params.date} ${params.time}\n`;
        response += `📌 ${params.event}\n`;
        if (mention) response += `👤 ${mention}`;

        context.CURRENT_CHAT_CONTEXT.parse_mode = "Markdown";
        return sendMessageToTelegramWithContext(context)(response);

    } catch (e) {
        return sendMessageToTelegramWithContext(context)(`❌ 新增失敗: ${e.message}`);
    }
}

export async function commandDeleteCalendar(message, command, subcommand, context) {
    if (ENV.USER_CONFIG.ENABLE_FAMILY_SHEETS !== true) return;

    try {
        // 參數格式：JSON {"eventId": "..."}
        const params = JSON.parse(subcommand);

        await deleteCalendarEvent(context.env, params.eventId);

        return sendMessageToTelegramWithContext(context)(`✅ 已刪除行程`);

    } catch (e) {
        return sendMessageToTelegramWithContext(context)(`❌ 刪除失敗: ${e.message}`);
    }
}
