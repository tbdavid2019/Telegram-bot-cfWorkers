
import { initEnv, ENV } from '../config/env.js';
import { listCalendarEvents } from './google-calendar.js';
import { getUserMapping, resolveUserMention } from './google-sheets.js';
import { loadChatLLM } from '../agent/agents.js';

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
    // 查詢範圍: 今天的 06:00 到 明天的 06:00 (Taipei Time)
    const startOfDay = new Date(todayDate);
    startOfDay.setUTCHours(6, 0, 0, 0);

    const endOfDay = new Date(todayDate);
    endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);
    endOfDay.setUTCHours(6, 0, 0, 0);

    // 轉回 UTC 給 API 使用
    // startOfDay 是 Taipei 的 06:00，所以 UTC 要減 8 小時
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

        // 嘗試使用 AI 生成個人化摘要
        try {
            console.log(`🤖 [Summary] Generating AI summary...`);

            // 1. 獲取天氣 (預設高雄市)
            const weatherCity = "高雄市";
            const weatherData = await getWeather(weatherCity);

            // 2. 構建 Context
            const context = {
                USER_CONFIG: ENV.USER_CONFIG,
                env: env
            };

            // 3. 呼叫 AI
            const aiMsg = await generateDailySummaryAI(events, weatherData, todayDate, context);

            // 發送給群組
            if (ENV.USER_CONFIG.FAMILY_GROUP_ID) {
                await sendTelegramMessage(token, ENV.USER_CONFIG.FAMILY_GROUP_ID, aiMsg);
            }
            return; // AI 成功則結束

        } catch (aiError) {
            console.error(`❌ [Summary] AI Generation failed, falling back to manual format:`, aiError);
        }

        // 整理通知內容 (Fallback)
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

// ========== AI & Weather Helpers ==========

async function getWeather(locationName) {
    try {
        const url = `https://wttr.in/${encodeURIComponent(locationName)}?format=j1&lang=zh`;
        const response = await fetch(url);
        const data = await response.json();

        if (data && data.current_condition && data.current_condition.length > 0) {
            const current = data.current_condition[0];
            // wttr.in weather array index 0 corresponds to today
            const daily = data.weather && data.weather[0];
            const maxTemp = daily ? daily.maxtempC : current.temp_C;
            const minTemp = daily ? daily.mintempC : current.temp_C;
            // noon rain chance
            const rainChance = daily && daily.hourly && daily.hourly[4] ? daily.hourly[4].chanceofrain : '0';

            return {
                desc: current.lang_zh?.[0]?.value || current.weatherDesc?.[0]?.value,
                temp: current.temp_C,
                feelsLike: current.FeelsLikeC,
                humidity: current.humidity,
                rainChance,
                maxTemp,
                minTemp
            };
        }
    } catch (e) {
        console.error(`❌ [Weather] Fetch failed:`, e);
    }
    return null;
}

async function generateDailySummaryAI(events, weather, dateObj, context) {
    const todayStr = `${dateObj.getUTCFullYear()}/${dateObj.getUTCMonth() + 1}/${dateObj.getUTCDate()}`;

    // 簡化 Event Data
    const simplifiedEvents = events.map(e => ({
        time: e.start.dateTime ? e.start.dateTime.slice(11, 16) : 'All Day',
        summary: e.summary,
        location: e.location || '',
        description: cleanDescription(e.description || '')
    }));

    const weatherPrompt = weather
        ? `天氣狀況：${weather.desc}\n氣溫範疇：${weather.minTemp}-${weather.maxTemp}°C (目前 ${weather.temp}°C)\n降雨機率：${weather.rainChance}%`
        : "天氣資料目前無法取得(服務無回應)。";

    const systemPrompt = `你是一個溫暖貼心的家庭管家 "Oli" (小江管家)。
请用繁體中文為家庭生成一份 "早安日報"。語氣要充滿活力、溫馨，並適當使用 Emoji。

規範：
1. 開頭問候 (早安！今天是 ${todayStr})。
2. 天氣播報：根據提供的天氣資訊，給予穿衣或帶傘建議。
3. 今日行程：列出行程，並使用 <b>粗體</b> 強調時間與標題。
   - 若行程有備註 (Description)，請務必**擷取並顯示重要資訊** (如：電話號碼、地址、代辦事項細節)，不要過度簡化。
4. **貼心提醒 (重要)**：分析行程內容，給予具體建議。
   - 例如：取貨 -> 帶購物袋
   - 例如：上課 -> 帶課本/琴譜
   - 例如：看診 -> 帶健保卡
   - 例如：運動 -> 帶水壺毛巾
5. 格式確保：只需回傳訊息內容。使用 Telegram HTML 標籤 (<b>, <i>, <code>, <a href="...">)。
   - 不可使用 Markdown (**bold**)，Telegram 不支援混合模式。
   - 不可使用 <br>，請用換行。

結構參考：
☀️ [問候]

🌡️ [天氣建議]

📅 [今日行程]
(條列式，時間用 code 或 bold)

💡 [貼心提醒]

💪 [結尾祝福]`;

    const userMessage = `Info:
[Weather]
${weatherPrompt}

[Events]
${JSON.stringify(simplifiedEvents)}

Please generate the daily summary.`;

    const agent = loadChatLLM(context);
    if (!agent) throw new Error("No LLM Agent available in context");

    const answer = await agent.request({
        message: userMessage,
        history: [{ role: 'system', content: systemPrompt }]
    }, context, null);

    return answer;
}
