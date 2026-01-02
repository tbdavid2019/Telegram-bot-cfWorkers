import { sendMessageToTelegramWithContext } from '../telegram/telegram.js';
import { ENV } from '../config/env.js';

// 全域快取
let GOOGLE_SHEETS_ACCESS_TOKEN = null;
let TOKEN_EXPIRY_TIME = 0;
let USER_MAPPING_CACHE = null;

// === 認證與基礎建設 ===

/**
 * 解析 Base64 編碼的 Service Account Key
 */
function getServiceAccountKey(env) {
    if (!ENV.USER_CONFIG.GOOGLE_SHEETS_SERVICE_ACCOUNT) {
        throw new Error('Missing GOOGLE_SHEETS_SERVICE_ACCOUNT env var');
    }
    try {
        const jsonStr = atob(ENV.USER_CONFIG.GOOGLE_SHEETS_SERVICE_ACCOUNT);
        return JSON.parse(jsonStr);
    } catch (e) {
        throw new Error('Failed to parse GOOGLE_SHEETS_SERVICE_ACCOUNT: ' + e.message);
    }
}

function base64UrlEncode(str) {
    return btoa(str)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

function base64UrlEncodeBytes(buffer) {
    const chars = new Uint8Array(buffer);
    const str = String.fromCharCode.apply(null, chars);
    return base64UrlEncode(str);
}

/**
 * 使用 Web Crypto API 導入 Private Key
 */
async function importPrivateKey(pemKey) {
    // 去除 PEM header/footer 和換行
    const pemContents = pemKey
        .replace('-----BEGIN PRIVATE KEY-----', '')
        .replace('-----END PRIVATE KEY-----', '')
        .replace(/\s/g, '');

    // Base64 decode
    const binaryDerString = atob(pemContents);
    const binaryDer = new Uint8Array(binaryDerString.length);
    for (let i = 0; i < binaryDerString.length; i++) {
        binaryDer[i] = binaryDerString.charCodeAt(i);
    }

    return await crypto.subtle.importKey(
        'pkcs8',
        binaryDer.buffer,
        {
            name: 'RSASSA-PKCS1-v1_5',
            hash: 'SHA-256',
        },
        false,
        ['sign']
    );
}

/**
 * 生成 JWT 並取得 Access Token
 */
export async function authenticateGoogleSheets(env) {
    // 檢查快取
    const now = Math.floor(Date.now() / 1000);
    if (GOOGLE_SHEETS_ACCESS_TOKEN && now < TOKEN_EXPIRY_TIME - 60) {
        return GOOGLE_SHEETS_ACCESS_TOKEN;
    }

    const key = getServiceAccountKey(env);

    // 建立 JWT
    const header = { alg: 'RS256', typ: 'JWT' };
    const payload = {
        iss: key.client_email,
        scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/calendar',
        aud: key.token_uri,
        exp: now + 3600,
        iat: now
    };

    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(payload));
    const input = `${encodedHeader}.${encodedPayload}`;

    const privateKey = await importPrivateKey(key.private_key);
    const signatureBuffer = await crypto.subtle.sign(
        'RSASSA-PKCS1-v1_5',
        privateKey,
        new TextEncoder().encode(input)
    );

    const encodedSignature = base64UrlEncodeBytes(signatureBuffer);
    const jwt = `${input}.${encodedSignature}`;

    // 換取 Access Token
    const response = await fetch(key.token_uri, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: jwt
        })
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Auth failed: ${err}`);
    }

    const data = await response.json();
    GOOGLE_SHEETS_ACCESS_TOKEN = data.access_token;
    TOKEN_EXPIRY_TIME = now + data.expires_in;

    return GOOGLE_SHEETS_ACCESS_TOKEN;
}

/**
 * 通用的讀取 Sheets 函式
 */
async function readSheet(env, range) {
    const token = await authenticateGoogleSheets(env);
    const sheetId = ENV.USER_CONFIG.FAMILY_SHEET_ID;
    console.log(`[Google Sheets] Querying Sheet: ${sheetId}, Range: ${range}`);
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}`;

    const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
        throw new Error(`Read sheet failed: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`[Google Sheets] Rows returned: ${data.values ? data.values.length : 0}`);
    return data.values || [];
}

// === 用戶對應表邏輯 ===

/**
 * 讀取並快取用戶對應表
 * @returns {Promise<Array<{names: string[], ids: string[]}>>}
 */
export async function getUserMapping(env) {
    // 如果有快取且未過期（這裡簡單處理，每次重啟 worker 會重置）
    if (USER_MAPPING_CACHE) return USER_MAPPING_CACHE;

    try {
        const rows = await readSheet(env, 'familyUSER!A2:C'); // A:Name, B:TelegramID, C:Email
        const mapping = rows.map(row => {
            // row[0] is Name (comma separated), row[1] is ID (comma separated), row[2] is Email
            const names = (row[0] || '').split(',').map(s => s.trim()).filter(Boolean);
            const ids = (row[1] || '').split(',').map(s => s.trim()).filter(Boolean);
            const email = (row[2] || '').trim();
            return { names, ids, email };
        }).filter(item => item.names.length > 0 || item.ids.length > 0);

        USER_MAPPING_CACHE = mapping;
        return mapping;
    } catch (e) {
        console.error('Failed to load user mapping:', e);
        return [];
    }
}

/**
 * 根據訊息 Context 識別使用者名稱
 */
export async function identifyUser(context) {
    const msg = context.message;
    if (!msg || !msg.from) return '未知';

    const userId = String(msg.from.id);
    const username = msg.from.username ? `@${msg.from.username}` : null;
    const cleanUsername = msg.from.username; // without @

    const mapping = await getUserMapping(context.env);

    for (const user of mapping) {
        // 檢查 ID
        if (user.ids.includes(userId)) return user.names[0];
        // 檢查 Username
        if (username && user.ids.some(id => id.toLowerCase() === username.toLowerCase())) return user.names[0];
        if (cleanUsername && user.ids.some(id => id.toLowerCase() === cleanUsername.toLowerCase())) return user.names[0];
    }

    // 如果找不到，優先回傳 first_name
    return msg.from.first_name || '未知使用者';
}

/**
 * 將名稱轉換為 Mention 格式
 */
export async function resolveUserMention(env, nameOrTarget) {
    const mapping = await getUserMapping(env);
    const target = (nameOrTarget || '').toLowerCase();

    const user = mapping.find(u =>
        u.names.some(n => n.toLowerCase() === target) ||
        u.ids.some(id => id.toLowerCase() === target)
    );

    if (!user) return nameOrTarget; // 找不到就回傳原字串

    const primaryId = user.ids[0];
    const primaryName = user.names[0];

    // 判斷是 ID 還是 Username
    if (/^\d+$/.test(primaryId)) {
        // 數字 ID -> Markdown Link
        return `[${primaryName}](tg://user?id=${primaryId})`;
    } else {
        // Username -> @username
        return primaryId.startsWith('@') ? primaryId : `@${primaryId}`;
    }
}

// === 資料解析與處理邏輯 ===

/**
 * 解析收支表資料
 * @param {Array<Array<string>>} rawData - 原始二維陣列
 */
export function parseBudgetData(rawData) {
    if (!rawData || rawData.length < 2) return [];

    // 假設第一列是標題，從第二列開始解析
    // A:月份, B:總共, C:玉山, D:星展, E:中信, F:國泰, G:台北富邦, H:工會, I:現金, J:房租
    const headers = rawData[0].map(h => h.trim());
    const data = rawData.slice(1).map(row => {
        return {
            month: (row[0] || '').trim(), // 2025/11
            total: parseAmount(row[1]),
            yushan: parseAmount(row[2]),
            dbs: parseAmount(row[3]),
            ctbc: parseAmount(row[4]),
            cathay: parseAmount(row[5]),
            fubon: parseAmount(row[6]),
            union: parseAmount(row[7]),
            cash: parseAmount(row[8]),
            rent: parseAmount(row[9]),
            raw: row
        };
    }).filter(item => item.month); // 過濾掉沒有月份的空行

    return data;
}

function parseAmount(str) {
    if (!str) return 0;
    // 移除逗號和非數字字符（保留負號）
    const clean = str.replace(/[^\d.-]/g, '');
    return parseFloat(clean) || 0;
}

/**
 * 處理收支查詢
 * @param {Array} data - 解析後的資料
 * @param {string} query - 查詢參數 (e.g. "2025/11", "玉山", "近三個月")
 */
function processBudgetQuery(data, query) {
    const q = (query || '').toLowerCase();

    // 1. 解析時間範圍
    let targetMonths = [];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    // 檢查是否有範圍查詢
    // 支持格式: "9月到11月", "9-11月", "2025年9月到11月"
    let rangeMatch = q.match(/(\d{4})年?(\d{1,2})月?[到至\-~](\d{1,2})月/);
    if (rangeMatch) {
        // 格式: "2025年9月到11月"
        const year = parseInt(rangeMatch[1]);
        const startMonth = parseInt(rangeMatch[2]);
        const endMonth = parseInt(rangeMatch[3]);

        for (let m = startMonth; m <= endMonth; m++) {
            const monthStr = `${year}/${m}`;
            if (data.some(d => d.month === monthStr)) {
                targetMonths.push(monthStr);
            }
        }
    } else if (rangeMatch = q.match(/(\d{1,2})月?[到至\-~](\d{1,2})月/)) {
        // 格式: "9月到11月" (自動偵測年份)
        const startMonth = parseInt(rangeMatch[1]);
        const endMonth = parseInt(rangeMatch[2]);
        const availableYears = [...new Set(data.map(d => d.month.split('/')[0]))];
        const latestYear = Math.max(...availableYears.map(y => parseInt(y)));

        for (let m = startMonth; m <= endMonth; m++) {
            const monthStr = `${latestYear}/${m}`;
            if (data.some(d => d.month === monthStr)) {
                targetMonths.push(monthStr);
            }
        }
    } else if (q.includes('最近') || q.includes('近')) {
        const match = q.match(/[0-9一二三四五六七八九十]+/);
        const num = match ? parseInt(match[0]) : 3; // 預設 3 個月
        targetMonths = data.slice(0, num).map(d => d.month);
    } else if (q.match(/\d{4}\/\d{1,2}/)) {
        // 指定特定月份 e.g. 2025/11
        const timeStr = q.match(/\d{4}\/\d{1,2}/)[0];
        targetMonths = [timeStr];
    } else if (q.match(/\d{1,2}月/)) {
        // 指定某月 e.g. 11月 (自動偵測年份)
        const m = parseInt(q.match(/(\d{1,2})月/)[1]);
        // 從資料中找最新一年的該月份
        const availableYears = [...new Set(data.map(d => d.month.split('/')[0]))];
        const latestYear = Math.max(...availableYears.map(y => parseInt(y)));
        const monthStr = `${latestYear}/${m}`;
        if (data.some(d => d.month === monthStr)) {
            targetMonths = [monthStr];
        } else {
            // 如果最新年份沒有，嘗試前一年
            const prevYearStr = `${latestYear - 1}/${m}`;
            if (data.some(d => d.month === prevYearStr)) {
                targetMonths = [prevYearStr];
            }
        }
    } else if (q.includes('今年')) {
        targetMonths = data.filter(d => d.month.startsWith(`${currentYear}/`)).map(d => d.month);
    } else {
        // 預設查詢最近一個月
        targetMonths = [data[0].month];
    }

    // 2. 篩選資料
    const filtered = data.filter(d => targetMonths.includes(d.month));

    if (filtered.length === 0) return { error: `找不到符合時間的資料` };

    // 3. 解析查詢類別
    const categories = {
        '玉山': 'yushan',
        '星展': 'dbs',
        '中信': 'ctbc',
        '國泰': 'cathay',
        '富邦': 'fubon', '台北富邦': 'fubon',
        '工會': 'union',
        '現金': 'cash',
        '房租': 'rent',
        '總共': 'total', '總計': 'total', '全部': 'total'
    };

    let targetCategory = 'total'; // 預設查總額
    for (const [key, val] of Object.entries(categories)) {
        if (q.includes(key)) {
            targetCategory = val;
            break;
        }
    }

    // 4. 計算統計
    const result = {
        months: filtered.map(d => d.month),
        category: targetCategory,
        categoryName: Object.keys(categories).find(k => categories[k] === targetCategory) || '總共',
        details: filtered.map(d => ({ month: d.month, amount: d[targetCategory] })),
        total: filtered.reduce((sum, d) => sum + d[targetCategory], 0),
        average: 0
    };
    result.average = Math.round(result.total / filtered.length);

    return result;
}

/**
 * 解析行程表資料
 */
function parseScheduleData(rawData) {
    if (!rawData || rawData.length < 2) return [];

    // A:日期, B:時間, C:對象, D:事件, E:內容, F:建立時間, G:建立者, H:狀態
    const data = rawData.slice(1).map((row, index) => {
        return {
            rowLine: index + 2, // 1-based index in sheet
            date: (row[0] || '').trim(),
            time: (row[1] || '').trim(),
            targetUser: (row[2] || '').trim(),
            event: (row[3] || '').trim(),
            content: (row[4] || '').trim(),
            createdAt: (row[5] || '').trim(),
            createdBy: (row[6] || '').trim(),
            status: (row[7] || '').trim() || '待處理'
        };
    }).filter(item => item.date); // 過濾無日期行

    return data;
}

/**
 * 查詢行程
 */
function querySchedules(data, params) {
    /* params: { targetUser?, date?, dateFrom?, dateTo?, keyword? } */
    if (!data || data.length === 0) return [];

    return data.filter(item => {
        // 篩選對象
        if (params.targetUser && !item.targetUser.includes(params.targetUser)) return false;

        // 篩選日期
        if (params.date) {
            // 支援 "今天", "明天"
            if (item.date !== params.date) return false;
        }

        // 篩選關鍵字
        if (params.keyword) {
            const text = `${item.event} ${item.content}`.toLowerCase();
            if (!text.includes(params.keyword.toLowerCase())) return false;
        }

        return true;
    });
}

// === 功能實作 ===

/**
 * 讀取收支表
 */
export async function readBudgetSheet(env) {
    return await readSheet(env, '記帳!A:J');
}

/**
 * 讀取行程表
 */
export async function readScheduleSheet(env) {
    return await readSheet(env, '行程表!A:H');
}

/**
 * 更新 Sheets 指定範圍
 */
async function updateSheet(env, range, values) {
    const token = await authenticateGoogleSheets(env);
    const sheetId = ENV.USER_CONFIG.FAMILY_SHEET_ID;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?valueInputOption=USER_ENTERED`;

    const response = await fetch(url, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ values })
    });

    if (!response.ok) {
        throw new Error(`Update sheet failed: ${response.statusText}`);
    }
    return await response.json();
}

/**
 * 附加資料到 Sheets
 */
async function appendSheet(env, range, values) {
    const token = await authenticateGoogleSheets(env);
    const sheetId = ENV.USER_CONFIG.FAMILY_SHEET_ID;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}:append?valueInputOption=USER_ENTERED`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ values })
    });

    if (!response.ok) {
        throw new Error(`Append sheet failed: ${response.statusText}`);
    }
    return await response.json();
}

/**
 * 查找預算表的月份所在行
 * @returns {Promise<number|null>} 行號 (1-based)
 */
async function findBudgetRow(env, targetMonth) {
    // 讀取 A 欄 (月份)
    const rawData = await readSheet(env, '記帳!A:A');
    if (!rawData) return null;

    // A欄格式通常是 2025/11/01 或 2025/11
    // 我們做由新到舊的比對
    for (let i = 0; i < rawData.length; i++) {
        const cell = rawData[i][0];
        if (cell && cell.includes(targetMonth)) {
            return i + 1;
        }
    }
    return null;
}

/**
 * 寫入預算項目
 */
export async function writeBudgetEntry(env, month, categoryKey, amount) {
    // 1. 查找月份所在行
    const row = await findBudgetRow(env, month);
    if (!row) {
        throw new Error(`找不到月份 ${month}，目前不支援自動新增月份行，請先手動建立。`);
    }

    // 2. 映射類別到欄位
    // A:月份, B:總共, C:玉山, D:星展, E:中信, F:國泰, G:台北富邦, H:工會, I:現金, J:房租
    const colMap = {
        'yushan': 'C',
        'dbs': 'D',
        'ctbc': 'E',
        'cathay': 'F',
        'fubon': 'G',
        'union': 'H',
        'cash': 'I',
        'rent': 'J'
    };

    const col = colMap[categoryKey];
    if (!col) throw new Error(`無效的類別: ${categoryKey}`);

    // 3. 更新儲存格
    const range = `記帳!${col}${row}`;
    await updateSheet(env, range, [[amount]]);
    return { row, col, range };
}

/**
 * 新增行程
 */
export async function appendScheduleRow(env, scheduleData) {
    // A:日期, B:時間, C:對象, D:事件, E:內容, F:建立時間, G:建立者, H:狀態
    const row = [
        scheduleData.date,
        scheduleData.time,
        scheduleData.targetUser,
        scheduleData.event,
        scheduleData.content || '',
        new Date().toISOString(),
        scheduleData.createdBy || '',
        '待處理'
    ];

    await appendSheet(env, '行程表!A:H', [row]);
}

// === 指令處理器 ===

export async function commandQueryBudget(message, command, subcommand, context) {
    if (ENV.USER_CONFIG.ENABLE_FAMILY_SHEETS !== true) return;
    try {
        const rawData = await readBudgetSheet(context.env);
        const parsedData = parseBudgetData(rawData);

        if (parsedData.length === 0) {
            return sendMessageToTelegramWithContext(context)(`📊 查無收支資料`);
        }

        // 直接返回完整資料表格，不做任何處理
        let response = `📊 **家庭收支資料** (共 ${parsedData.length} 筆)\n\n`;
        response += `\`\`\`\n`;
        response += `月份      總共    玉山    星展    中信    國泰    富邦    工會    現金    房租\n`;
        response += `${'='.repeat(80)}\n`;

        for (const d of parsedData) {
            response += `${d.month.padEnd(8)} ${String(d.total).padEnd(7)} ${String(d.yushan).padEnd(7)} ${String(d.dbs).padEnd(7)} ${String(d.ctbc).padEnd(7)} ${String(d.cathay).padEnd(7)} ${String(d.fubon).padEnd(7)} ${String(d.union).padEnd(7)} ${String(d.cash).padEnd(7)} ${String(d.rent).padEnd(7)}\n`;
        }
        response += `\`\`\``;

        context.CURRENT_CHAT_CONTEXT.parse_mode = "Markdown";
        return sendMessageToTelegramWithContext(context)(response);

    } catch (e) {
        return sendMessageToTelegramWithContext(context)(`❌ 查詢失敗: ${e.message}`);
    }
}

export async function commandQuerySchedule(message, command, subcommand, context) {
    if (ENV.USER_CONFIG.ENABLE_FAMILY_SHEETS !== true) return;
    try {
        const rawData = await readScheduleSheet(context.env);
        const parsedData = parseScheduleData(rawData);

        // 簡單參數解析 (TODO: 更聰明的解析應該交給 LLM，這裡只做基本轉換)
        // subcommand: "小茹 今天" -> 解析成 { targetUser: "小茹", date: "..." }
        // 這裡暫時做簡單的關鍵字搜尋

        // 預設顯示最近的行程 (如果是空指令)
        let filtered = parsedData;
        if (subcommand) {
            filtered = querySchedules(parsedData, { keyword: subcommand });

            // 嘗試解析人名
            const mapping = await getUserMapping(context.env);
            for (const user of mapping) {
                if (user.names.some(n => subcommand.includes(n))) {
                    filtered = querySchedules(parsedData, { targetUser: user.names[0] });
                    break;
                }
            }
        } else {
            // 預設顯示未來 5 筆
            // 需實作日期比較與排序，這裡先簡單回傳前 10 筆
            filtered = filtered.slice(0, 10);
        }

        if (filtered.length === 0) {
            return sendMessageToTelegramWithContext(context)(`📅 查無符合條件的行程`);
        }

        let response = `📅 **家庭行程表**\n\n`;
        for (const item of filtered) {
            response += `**${item.date} ${item.time}**\n`;
            response += `👤 ${item.targetUser} - ${item.event}\n`;
            if (item.content) response += `📝 ${item.content}\n`;
            response += `------------------\n`;
        }

        context.CURRENT_CHAT_CONTEXT.parse_mode = "Markdown";
        return sendMessageToTelegramWithContext(context)(response);

    } catch (e) {
        return sendMessageToTelegramWithContext(context)(`❌ 查詢失敗: ${e.message}`);
    }
}

export async function commandWriteBudget(message, command, subcommand, context) {
    if (ENV.USER_CONFIG.ENABLE_FAMILY_SHEETS !== true) return;

    // 簡單權限檢查：只有白名單內的用戶才能寫入 (這裡先用 CHAT_WHITE_LIST 檢查，嚴謹的應該用 User Mapping)
    // 但 commandHandlers 層級應該已經有 needAuth 了? 不，那只是檢查管理員
    // 這裡我們暫時信任 LLM 只在合適的時候調用

    try {
        // 參數格式預期：JSON 字串 (因為是 LLM 產生的)
        // [CALL:/budgetwrite {"month": "2025/12", "category": "yushan", "amount": 5000}]
        let params;
        try {
            params = JSON.parse(subcommand);
        } catch {
            // Fallback for simple testing: "2025/11 yushan 100"
            const parts = subcommand.split(' ');
            if (parts.length === 3) {
                params = { month: parts[0], category: parts[1], amount: parseFloat(parts[2]) };
            }
        }

        if (!params || !params.month || !params.category || params.amount === undefined) {
            return sendMessageToTelegramWithContext(context)(`❌ 參數錯誤 (Write Budget)`);
        }

        await writeBudgetEntry(context.env, params.month, params.category, params.amount);
        return sendMessageToTelegramWithContext(context)(`✅ 已更新記帳：${params.month} ${params.category} = ${params.amount}`);
    } catch (e) {
        return sendMessageToTelegramWithContext(context)(`❌ 寫入失敗: ${e.message}`);
    }
}

export async function commandCreateSchedule(message, command, subcommand, context) {
    if (ENV.USER_CONFIG.ENABLE_FAMILY_SHEETS !== true) return;
    try {
        // [CALL:/scheduleadd {"date": "...", "time": "...", "targetUser": "...", "event": "..."}]
        const params = JSON.parse(subcommand);

        // 補上建立者資訊
        params.createdBy = message.from.id;

        await appendScheduleRow(context.env, params);

        // 如果有時間，嘗試格式化提醒
        const mention = await resolveUserMention(context.env, params.targetUser);

        let response = `✅ 已新增行程\n`;
        response += `📅 ${params.date} ${params.time}\n`;
        response += `👤 ${mention} - ${params.event}`;

        context.CURRENT_CHAT_CONTEXT.parse_mode = "Markdown";
        return sendMessageToTelegramWithContext(context)(response);
    } catch (e) {
        return sendMessageToTelegramWithContext(context)(`❌ 新增失敗: ${e.message}`);
    }
}
