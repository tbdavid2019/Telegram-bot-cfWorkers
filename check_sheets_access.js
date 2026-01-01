import fs from 'fs';
import crypto from 'crypto';
import https from 'https';

// ... (Keep auth functions same as before) ...
const keyContent = fs.readFileSync('googlekey.json', 'utf8');
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
        scope: 'https://www.googleapis.com/auth/spreadsheets',
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

// Fixed ID found previously
const SPREADSHEET_ID = '1BuDhozWXfcI2zLKlPeep4BwjD1ZIu7pIM-DktTaoRiY';

async function main() {
    try {
        const jwt = createJWT(key.client_email, key.private_key);
        const accessToken = await getAccessToken(jwt);

        console.log(`Inspecting Spreadsheet: ${SPREADSHEET_ID}`);

        const tabs = ['記帳', '行程表', 'familyUSER'];

        for (const tab of tabs) {
            console.log(`\n=== Tab: ${tab} ===`);
            const result = await readSheetValues(accessToken, SPREADSHEET_ID, `${tab}!A1:Z5`);
            if (result.error) {
                console.log("Error:", result.error.message);
            } else {
                const rows = result.values || [];
                console.log(`Rows found: ${rows.length}`);
                if (rows.length > 0) {
                    console.log("Header:", JSON.stringify(rows[0]));
                    if (rows.length > 1) console.log("Row 1 data:", JSON.stringify(rows[1]));
                } else {
                    console.log("Tab is empty.");
                }
            }
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

main();
