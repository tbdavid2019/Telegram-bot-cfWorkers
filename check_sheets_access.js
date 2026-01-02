import fs from 'fs';
import crypto from 'crypto';
import https from 'https';

// --- Configuration ---
const KEY_FILE = 'googlekey2.json';
const SPREADSHEET_ID = '1BuDhozWXfcI2zLKlPeep4BwjD1ZIu7pIM-DktTaoRiY';
const CALENDAR_ID = 'family11508689995411029323@group.calendar.google.com';

// --- Auth ---
const keyContent = fs.readFileSync(KEY_FILE, 'utf8');
const key = JSON.parse(keyContent);

function base64UrlEncode(str) {
    return Buffer.from(str)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

function createJWT(email, privateKey) {
    const header = { alg: 'RS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const payload = {
        iss: email,
        scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/calendar',
        aud: 'https://oauth2.googleapis.com/token',
        exp: now + 3600,
        iat: now
    };
    const input = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(payload))}`;
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(input);
    return `${input}.${signer.sign(privateKey, 'base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`;
}

async function getAccessToken(jwt) {
    return new Promise((resolve, reject) => {
        const postData = new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: jwt
        }).toString();

        const req = https.request({
            hostname: 'oauth2.googleapis.com',
            path: '/token',
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': postData.length }
        }, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => res.statusCode === 200 ? resolve(JSON.parse(data).access_token) : reject(data));
        });
        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

// --- API Functions ---

async function readSheetValues(accessToken, spreadsheetId, range) {
    return new Promise((resolve, reject) => {
        const req = https.request({
            hostname: 'sheets.googleapis.com',
            path: `/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
            method: 'GET',
            headers: { 'Authorization': `Bearer ${accessToken}` }
        }, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    resolve(JSON.parse(data));
                } else {
                    resolve({ error: JSON.parse(data), statusCode: res.statusCode });
                }
            });
        });
        req.on('error', reject);
        req.end();
    });
}

async function listCalendarEvents(accessToken, calendarId) {
    return new Promise((resolve, reject) => {
        const today = new Date();
        const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
        const timeMin = today.toISOString();
        const timeMax = nextWeek.toISOString();

        const params = new URLSearchParams({
            timeMin,
            timeMax,
            maxResults: 10,
            singleEvents: 'true',
            orderBy: 'startTime'
        });

        const req = https.request({
            hostname: 'www.googleapis.com',
            path: `/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`,
            method: 'GET',
            headers: { 'Authorization': `Bearer ${accessToken}` }
        }, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    resolve(JSON.parse(data));
                } else {
                    resolve({ error: JSON.parse(data), statusCode: res.statusCode });
                }
            });
        });
        req.on('error', reject);
        req.end();
    });
}

// --- Main ---

async function main() {
    console.log(`Using Key File: ${KEY_FILE}`);
    console.log(`Service Account: ${key.client_email}`);

    try {
        const jwt = createJWT(key.client_email, key.private_key);
        const accessToken = await getAccessToken(jwt);
        console.log("Access Token: Obtained");

        // 1. Check Sheets
        console.log(`\n=== Testing Google Sheets (${SPREADSHEET_ID}) ===`);
        const tabs = ['familyUSER', '記帳', '行程表'];
        for (const tab of tabs) {
            const result = await readSheetValues(accessToken, SPREADSHEET_ID, `${tab}!A1:Z5`);
            if (result.error) {
                console.log(`❌ Error [${tab}]:`, result.error.error.message || result.error);
            } else {
                const rows = result.values || [];
                console.log(`✅ [${tab}] Rows found: ${rows.length}`);
            }
        }

        // 2. Check Calendar
        console.log(`\n=== Testing Google Calendar (${CALENDAR_ID}) ===`);
        const calResult = await listCalendarEvents(accessToken, CALENDAR_ID);
        if (calResult.error) {
            console.log(`❌ Error:`, calResult.error.error.message || calResult.error);
        } else {
            const items = calResult.items || [];
            console.log(`✅ Events found (Next 7 days): ${items.length}`);
            items.forEach(ev => {
                const start = ev.start.dateTime || ev.start.date;
                console.log(`   - ${start}: ${ev.summary}`);
            });
        }

    } catch (error) {
        console.error('Fatal Error:', error);
    }
}

main();
