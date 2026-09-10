import { sendMessageToTelegramWithContext } from '../telegram/telegram.js';
import { getUserMapping, resolveUserMention } from './google-sheets.js';
import { ENV } from '../config/env.js';
import {
    resolveUserTimeZone,
    getZonedDayRangeUtc,
    getZonedDayRangeUtcByOffset,
    getZonedWeekRangeUtc,
    getZonedDateParts,
    addDaysToLocalDateParts,
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

    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`;

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
 * 解析自然語言時間與日期範圍 (嚴格遵循午夜邊界：結束日涵蓋至 23:59:59)
 */
export function parseNaturalTime(text = '') {
    const raw = String(text || '').trim();
    const nowUtc = new Date();
    const timeZone = resolveUserTimeZone(ENV.USER_CONFIG.USER_TIMEZONE);
    const { year: currentYear } = getZonedDateParts(nowUtc, timeZone);
    const todayRange = getZonedDayRangeUtc(nowUtc, timeZone);

    // 1. 檢查自訂日期區間，如 "9/1 ~ 9/9", "9/1-9/9", "9月1日到9月9日", "2026/09/01 ~ 2026/09/09"
    // 【核心邏輯】：當用戶說「9/1 ~ 9/9」，人類直覺必定包含 9/9 整天（直到 23:59:59）。
    // Google Calendar API 的 timeMax 為開區間 (event.start < timeMax)，
    // 因此結束點必須取次日 00:00:00 (即 9/10 00:00:00)，確保 9/9 23:59:59 的事件完整涵蓋！
    const rangeMatch = raw.match(/(?:(\d{4})[-/.年])?(\d{1,2})[-/.月](\d{1,2})日?\s*(?:[~到至\-–—]+)\s*(?:(\d{4})[-/.年])?(\d{1,2})[-/.月](\d{1,2})日?/);
    if (rangeMatch) {
        const startYear = parseInt(rangeMatch[1]) || currentYear;
        const startMonth = parseInt(rangeMatch[2]);
        const startDay = parseInt(rangeMatch[3]);

        const endYear = parseInt(rangeMatch[4]) || startYear;
        const endMonth = parseInt(rangeMatch[5]);
        const endDay = parseInt(rangeMatch[6]);

        const startUtc = zonedTimeToUtc(startYear, startMonth, startDay, 0, 0, 0, timeZone);
        const nextDayParts = addDaysToLocalDateParts(endYear, endMonth, endDay, 1);
        const endUtc = zonedTimeToUtc(nextDayParts.year, nextDayParts.month, nextDayParts.day, 0, 0, 0, timeZone);

        return { start: startUtc, end: endUtc };
    }

    // 2. 檢查單一指定日期，如 "9/9", "9月9日", "2026-09-09" (涵蓋該日 00:00:00 ~ 23:59:59)
    const singleMatch = raw.match(/^(?:(\d{4})[-/.年])?(\d{1,2})[-/.月](\d{1,2})日?$/);
    if (singleMatch) {
        const y = parseInt(singleMatch[1]) || currentYear;
        const m = parseInt(singleMatch[2]);
        const d = parseInt(singleMatch[3]);

        const startUtc = zonedTimeToUtc(y, m, d, 0, 0, 0, timeZone);
        const nextDayParts = addDaysToLocalDateParts(y, m, d, 1);
        const endUtc = zonedTimeToUtc(nextDayParts.year, nextDayParts.month, nextDayParts.day, 0, 0, 0, timeZone);

        return { start: startUtc, end: endUtc };
    }

    // 「今天」/「今日」 (00:00:00 ~ 23:59:59)
    if (raw.includes('今天') || raw.includes('今日')) {
        return {
            start: todayRange.startUtc,
            end: todayRange.endUtc
        };
    }

    // 「明天」/「明日」 (00:00:00 ~ 23:59:59)
    if (raw.includes('明天') || raw.includes('明日')) {
        const tomorrowRange = getZonedDayRangeUtcByOffset(nowUtc, timeZone, 1);
        return {
            start: tomorrowRange.startUtc,
            end: tomorrowRange.endUtc
        };
    }

    // 「後天」 (00:00:00 ~ 23:59:59)
    if (raw.includes('後天')) {
        const afterTomorrowRange = getZonedDayRangeUtcByOffset(nowUtc, timeZone, 2);
        return {
            start: afterTomorrowRange.startUtc,
            end: afterTomorrowRange.endUtc
        };
    }

    // 「本週」/「這週」
    if (raw.includes('本週') || raw.includes('這週')) {
        const weekRange = getZonedWeekRangeUtc(nowUtc, timeZone);
        return { start: weekRange.startUtc, end: weekRange.endUtc };
    }

    // 預設：今天到未來 7 天 (包含第 7 天當天至 23:59:59，故結束點應取 endUtc)
    const futureRange = getZonedDayRangeUtcByOffset(nowUtc, timeZone, 7);
    return { start: todayRange.startUtc, end: futureRange.endUtc };
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
            const timeStr = event.start.dateTime
                ? new Date(event.start.dateTime).toLocaleString('zh-TW', { timeZone, month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                : (() => {
                    // 全天活動 (start.date 通常為 "YYYY-MM-DD")，直接解析月日，避免西半球時區偏移至前一日
                    const parts = (event.start.date || '').split('-').map(Number);
                    return parts.length >= 3 ? `${parts[1]}月${parts[2]}日 (全天)` : `${event.start.date} (全天)`;
                })();

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
