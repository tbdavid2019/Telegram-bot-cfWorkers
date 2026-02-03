import { sendMessageToTelegramWithContext } from '../telegram/telegram.js';
import { getUserMapping, resolveUserMention } from './google-sheets.js';
import { ENV } from '../config/env.js';
import {
    resolveUserTimeZone,
    getZonedDayRangeUtc,
    getZonedDayRangeUtcByOffset,
    getZonedWeekRangeUtc,
    zonedTimeToUtc
} from '../utils/timezone.js';

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
    const timeZone = resolveUserTimeZone(ENV.USER_CONFIG.USER_TIMEZONE);
    console.log(`[Google Calendar] Querying Calendar: ${calendarId}, Min: ${timeMin}, Max: ${timeMax}`);

    let url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?`;
    const params = new URLSearchParams({
        orderBy: 'startTime',
        singleEvents: 'true',
        timeZone
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
    const nowUtc = new Date();
    const timeZone = resolveUserTimeZone(ENV.USER_CONFIG.USER_TIMEZONE);
    const todayRange = getZonedDayRangeUtc(nowUtc, timeZone);

    // 「今天」
    if (text.includes('今天') || text.includes('今日')) {
        return {
            start: todayRange.startUtc,
            end: todayRange.endUtc
        };
    }

    // 「明天」
    if (text.includes('明天') || text.includes('明日')) {
        const tomorrowRange = getZonedDayRangeUtcByOffset(nowUtc, timeZone, 1);
        return {
            start: tomorrowRange.startUtc,
            end: tomorrowRange.endUtc
        };
    }

    // 「本週」
    if (text.includes('本週') || text.includes('這週')) {
        const weekRange = getZonedWeekRangeUtc(nowUtc, timeZone);
        return { start: weekRange.startUtc, end: weekRange.endUtc };
    }

    // 預設：今天到未來 7 天
    const futureRange = getZonedDayRangeUtcByOffset(nowUtc, timeZone, 7);
    return { start: todayRange.startUtc, end: futureRange.startUtc };
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
        const timeZone = resolveUserTimeZone(ENV.USER_CONFIG.USER_TIMEZONE);
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
                ? startDate.toLocaleString('zh-TW', { timeZone, month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                : startDate.toLocaleDateString('zh-TW', { timeZone, month: 'numeric', day: 'numeric' });

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
        const timeZone = resolveUserTimeZone(ENV.USER_CONFIG.USER_TIMEZONE);
        // 參數格式：JSON {"date": "2026-01-02", "time": "15:00", "targetUser": "小茹", "event": "去好市多", "location": ""}
        const params = JSON.parse(subcommand);

        // 建立事件資料 (依使用者時區轉為 UTC)
        const [yearRaw, monthRaw, dayRaw] = params.date.includes('/')
            ? params.date.split('/')
            : params.date.split('-');
        const [hourRaw, minuteRaw] = params.time.split(':');
        const year = parseInt(yearRaw, 10);
        const month = parseInt(monthRaw, 10);
        const day = parseInt(dayRaw, 10);
        const hour = parseInt(hourRaw, 10);
        const minute = parseInt(minuteRaw, 10);

        const startUtc = zonedTimeToUtc(year, month, day, hour, minute, 0, timeZone);
        const endUtc = new Date(startUtc.getTime() + 60 * 60 * 1000);
        const startDateTime = startUtc.toISOString();
        const endDateTime = endUtc.toISOString();

        const eventData = {
            summary: params.event,
            description: params.content || `對象：${params.targetUser}`,
            start: {
                dateTime: startDateTime,
                timeZone
            },
            end: {
                dateTime: endDateTime,
                timeZone
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
