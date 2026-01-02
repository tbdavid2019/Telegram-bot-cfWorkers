
import { initEnv, ENV } from '../config/env.js';
import { listCalendarEvents } from './google-calendar.js';
import { getUserMapping, resolveUserMention } from './google-sheets.js';

/**
 * Handle Scheduled Event (Cron Trigger)
 * @param {ScheduledEvent} event
 * @param {Object} env
 * @param {ExecutionContext} ctx
 */
export async function handleScheduled(event, env, ctx) {
    // 1. 初始化環境變數
    // schedule event 因為沒有 request，我們需要手動建立一個 i18n helper (或暫時用 mock)
    // 這裡主要需要 ENV 被正確 populate
    initEnv(env, (lang) => ({})); // 傳入空 i18n，因為通知內容主要是動態生成的

    console.log(`⏱️ [Scheduler] Triggered at ${new Date().toISOString()}`);

    // 權限與開關檢查
    // 1. 必須啟用 Family Sheets (基礎依賴)
    if (ENV.USER_CONFIG.ENABLE_FAMILY_SHEETS !== true) {
        console.log('⚠️ [Scheduler] Family Sheets NOT enabled. Skipping.');
        return;
    }

    // 2. 必須啟用排程通知 (功能開關)
    if (ENV.USER_CONFIG.ENABLE_SCHEDULED_NOTIFICATIONS !== true) {
        console.log('⚠️ [Scheduler] Feature disabled. (ENABLE_SCHEDULED_NOTIFICATIONS)');
        return;
    }

    // 2. 獲取當前時間 (UTC+8)
    const now = new Date();
    // Cloudflare Workers run on UTC. We need to shift to Taipei Time (+8)
    const taipeiTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    const currentHour = taipeiTime.getUTCHours();
    const currentMinute = taipeiTime.getUTCMinutes(); // 雖然 cron 只有整點，但可以做 double check

    console.log(`⏱️ [Scheduler] Taipei Time: ${taipeiTime.toISOString()}, Hour: ${currentHour}`);

    // 定義 Bot Token (取第一個可用的)
    // 注意: TELEGRAM_AVAILABLE_TOKENS 可能是字串 array 或 comma-separated string
    let botToken = "";
    if (Array.isArray(ENV.TELEGRAM_AVAILABLE_TOKENS) && ENV.TELEGRAM_AVAILABLE_TOKENS.length > 0) {
        botToken = ENV.TELEGRAM_AVAILABLE_TOKENS[0];
    } else if (typeof ENV.TELEGRAM_AVAILABLE_TOKENS === 'string') {
        botToken = ENV.TELEGRAM_AVAILABLE_TOKENS.split(',')[0];
    }

    if (!botToken) {
        console.error('❌ [Scheduler] No bot token found!');
        return;
    }

    // 任務推送到 ctx.waitUntil 以確保執行完成
    const tasks = [];

    // Check 1: 每日匯總 (Daily Summary)
    // 預設 6 點，或使用設定值
    const summaryTime = ENV.USER_CONFIG.DAILY_SUMMARY_TIME || 6;
    if (currentHour === summaryTime) {
        console.log(`📅 [Scheduler] Running Daily Summary for hour ${summaryTime}...`);
        tasks.push(runDailySummary(env, botToken, taipeiTime));
    }

    // Check 2: 每小時提醒 (Hourly Reminder)
    if (ENV.USER_CONFIG.ENABLE_HOURLY_REMINDER === true) {
        console.log(`⏰ [Scheduler] Running Hourly Reminder...`);
        tasks.push(runHourlyReminder(env, botToken, now));
    }

    await Promise.all(tasks);
}

/**
 * 執行每日匯總
 */
async function runDailySummary(env, token, todayDate) {
    // 查詢範圍: 今天的 00:00 到 23:59 (Taipei Time)
    const startOfDay = new Date(todayDate);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date(todayDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    // 轉回 UTC 給 API 使用
    // startOfDay 是 Taipei 的 00:00，所以是 UTC 的前一天 16:00
    const timeMin = new Date(startOfDay.getTime() - 8 * 60 * 60 * 1000).toISOString();
    const timeMax = new Date(endOfDay.getTime() - 8 * 60 * 60 * 1000).toISOString();

    console.log(`📅 [Summary] Query range: ${timeMin} ~ ${timeMax}`);

    try {
        const events = await listCalendarEvents(env, timeMin, timeMax);
        if (!events || events.length === 0) {
            console.log(`📅 [Summary] No events found today.`);
            return;
        }

        console.log(`📅 [Summary] Found ${events.length} events.`);

        // 整理通知內容
        const todayStr = `${todayDate.getUTCFullYear()}/${todayDate.getUTCMonth() + 1}/${todayDate.getUTCDate()}`;
        let msg = `☀️ <b>早安！今天是 ${todayStr}</b>\n`;
        msg += `共有 ${events.length} 個行程事項：\n\n`;

        for (const ev of events) {
            const timePart = ev.start.dateTime ? ev.start.dateTime.slice(11, 16) : '全天'; // 簡單取時間 HH:MM
            msg += `🕒 <code>${timePart}</code>\n`;
            msg += `📌 <b>${escapeHtml(ev.summary)}</b>\n`;
            if (ev.location) msg += `📍 ${escapeHtml(ev.location)}\n`;
            if (ev.description) msg += `📝 ${cleanDescription(ev.description)}\n`;
            msg += `----------------\n`;
        }

        msg += `\n祝您有美好的一天！ 💪`;

        // 發送給群組
        if (ENV.USER_CONFIG.FAMILY_GROUP_ID) {
            await sendTelegramMessage(token, ENV.USER_CONFIG.FAMILY_GROUP_ID, msg);
        }

        // 發送給個人 (嘗試從事件描述中匹配對象)
        // 這裡做簡單處理：如果事件有指定對象，就私訊該對象
        // TODO: 更複雜的對象解析邏輯
        /* 
           由於 familyUSER 表格是用 nickname 對應，我們可以嘗試解析事件標題或描述
           暫時省略，避免過度打擾。目前先以群組廣播為主。
        */

    } catch (e) {
        console.error(`❌ [Summary] Error:`, e);
    }
}

/**
 * 執行每小時提醒
 */
async function runHourlyReminder(env, token, nowUTC) {
    // 查詢範圍: 現在 ~ 現在+1小時
    const timeMin = nowUTC.toISOString();
    const timeMax = new Date(nowUTC.getTime() + 60 * 60 * 1000).toISOString();

    try {
        const events = await listCalendarEvents(env, timeMin, timeMax);
        if (!events || events.length === 0) return;

        // 過濾掉全天事件? 通常全天事件不需要每小時提醒
        // 判斷方式: start.date 存在則為全天
        const upcomingEvents = events.filter(e => e.start.dateTime);

        if (upcomingEvents.length === 0) return;

        for (const ev of upcomingEvents) {
            const startTime = new Date(ev.start.dateTime);
            // 轉成台北時間顯示
            const tpTime = new Date(startTime.getTime() + 8 * 60 * 60 * 1000);
            const timeStr = `${tpTime.getUTCHours().toString().padStart(2, '0')}:${tpTime.getUTCMinutes().toString().padStart(2, '0')}`;

            let msg = `⏰ <b>提醒：行程即將開始！</b>\n\n`;
            msg += `📌 <b>${escapeHtml(ev.summary)}</b>\n`;
            msg += `🕒 時間：${timeStr}\n`;
            if (ev.location) msg += `📍 地點：${escapeHtml(ev.location)}\n`;

            // 發送到群組
            if (ENV.USER_CONFIG.FAMILY_GROUP_ID) {
                await sendTelegramMessage(token, ENV.USER_CONFIG.FAMILY_GROUP_ID, msg);
            }

            // 私訊通知對象
            // 解析描述中的對象
            // 假設描述中有 "對象：Dave" 或 title 有 "Dave"
            // 我們可以使用 getUserMapping 來做匹配
            const mapping = await getUserMapping(env);
            const targets = new Set();

            const textToScan = (ev.summary + (ev.description || '')).toLowerCase();

            for (const user of mapping) {
                // 檢查暱稱是否出現在文字中
                if (user.names.some(n => textToScan.includes(n.toLowerCase()))) {
                    // 找到匹配的 User，加入其所有 ID
                    user.ids.forEach(id => targets.add(id));
                }
            }

            if (targets.size > 0) {
                console.log(`🔔 [Reminder] Notifying users: ${Array.from(targets).join(', ')}`);
                for (const userId of targets) {
                    await sendTelegramMessage(token, userId, msg);
                }
            }
        }

    } catch (e) {
        console.error(`❌ [Reminder] Error:`, e);
    }
}

/**
 * 發送 Telegram 訊息 (Basic fetch)
 */
async function sendTelegramMessage(token, chatId, text) {
    try {
        const url = `https://api.telegram.org/bot${token}/sendMessage`;
        const resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: text,
                parse_mode: 'HTML'
            })
        });
        const res = await resp.json();
        if (!res.ok) {
            console.error(`❌ [Telegram] Send failed to ${chatId}:`, res.description);
        } else {
            console.log(`✅ [Telegram] Sent to ${chatId}`);
        }
    } catch (e) {
        console.error(`❌ [Telegram] Network error:`, e);
    }
}

function escapeHtml(text) {
    if (!text) return "";
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function cleanDescription(desc) {
    if (!desc) return "";
    // 1. <br> -> \n
    let d = desc.replace(/<br\s*\/?>/gi, "\n");
    // 2. Strip all other tags
    d = d.replace(/<[^>]+>/g, "");
    // 3. Escape for Telegram
    return escapeHtml(d);
}
