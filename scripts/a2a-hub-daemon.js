#!/usr/bin/env node

/**
 * 888a2a-lite Hub 24/7 SSE 常駐守護進程 (SSE Inbox Daemon)
 * 
 * 用途：
 *   Cloudflare Workers 為 Serverless 架構，若跨代理人（A2A）協作回覆為非同步非即時產生，
 *   此守護進程可常駐於本機（Mac / Linux / VPS / Docker / PM2），
 *   長連線監聽 888a2a Hub 的 SSE 串流 (/inbox/stream)，實現 0 秒延遲即時推播 Telegram！
 * 
 * 使用方式：
 *   node scripts/a2a-hub-daemon.js --env chatgpt
 *   node scripts/a2a-hub-daemon.js --env aws
 *   pm2 start scripts/a2a-hub-daemon.js --name "a2a-daemon" -- --env chatgpt
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');

// 1. 取得執行環境參數
const args = process.argv.slice(2);
let targetEnv = 'chatgpt';
const envIndex = args.indexOf('--env');
if (envIndex !== -1 && args[envIndex + 1]) {
  targetEnv = args[envIndex + 1];
}

// 2. 解析 wrangler.toml 提取憑證
function parseWranglerConfig(envName) {
  const tomlPath = path.join(ROOT_DIR, 'wrangler.toml');
  if (!fs.existsSync(tomlPath)) {
    throw new Error(`找不到 wrangler.toml: ${tomlPath}`);
  }

  const content = fs.readFileSync(tomlPath, 'utf8');
  const envSectionRegex = new RegExp(`\\[env\\.${envName}\\.vars\\]([\\s\\S]*?)(?=\\n\\[|$)`);
  const match = content.match(envSectionRegex);

  if (!match) {
    throw new Error(`在 wrangler.toml 找不到 [env.${envName}.vars] 區段`);
  }

  const varsBlock = match[1];
  const extractVar = (name) => {
    const r = new RegExp(`^\\s*${name}\\s*=\\s*["']([^"']+)["']`, 'm');
    const m = varsBlock.match(r);
    return m ? m[1] : null;
  };

  return {
    hubUrl: extractVar('A2A888_HUB_URL') || 'https://a2a.david888.com',
    sharedKey: extractVar('A2A888_HUB_SHARED_KEY') || '0906541100david888',
    agentId: extractVar('A2A888_AGENT_ID'),
    agentToken: extractVar('A2A888_AGENT_TOKEN'),
    agentName: extractVar('A2A_AGENT_NAME') || `Bot_${envName}`,
    telegramToken: extractVar('TELEGRAM_AVAILABLE_TOKENS'),
    targetChatId: (extractVar('CHAT_WHITE_LIST') || '').split(',')[0] || extractVar('FAMILY_GROUP_ID')
  };
}

const config = parseWranglerConfig(targetEnv);
console.log(`\n========================================`);
console.log(`🚀 888a2a-lite Hub SSE 守護進程啟動`);
console.log(`• 目標環境: [env.${targetEnv}]`);
console.log(`• 代理人名稱: ${config.agentName}`);
console.log(`• Agent ID: ${config.agentId}`);
console.log(`• Hub 網址: ${config.hubUrl}`);
console.log(`• 預設通知 Chat ID: ${config.targetChatId || '未設定'}`);
console.log(`========================================\n`);

if (!config.agentId || !config.agentToken) {
  console.error('❌ 錯誤：缺少 A2A888_AGENT_ID 或 A2A888_AGENT_TOKEN，請檢查 wrangler.toml');
  process.exit(1);
}

// 3. Telegram 推播函數
async function sendTelegramAlert(text) {
  if (!config.telegramToken || !config.targetChatId) {
    console.warn('⚠️ 未配置 TELEGRAM_AVAILABLE_TOKENS 或 CHAT_WHITE_LIST，無法發送 Telegram');
    return;
  }
  const token = config.telegramToken.split(',')[0].trim();
  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: config.targetChatId,
        text,
        parse_mode: 'Markdown'
      })
    });
    const data = await res.json();
    if (data.ok) {
      console.log(`📨 [Telegram] 成功推播訊息至 Chat ID: ${config.targetChatId}`);
    } else {
      console.warn(`⚠️ [Telegram] 推播失敗:`, data.description);
    }
  } catch (err) {
    console.error(`❌ [Telegram] 發送錯誤:`, err.message);
  }
}

// 4. ACK 任務函數
async function ackTask(sequence) {
  const ackUrl = `${config.hubUrl}/hub/v1/agents/${config.agentId}/inbox/${sequence}/ack`;
  try {
    const res = await fetch(ackUrl, {
      method: 'POST',
      headers: {
        'X-Agent-ID': config.agentId,
        'Authorization': `Bearer ${config.agentToken}`,
        'X-Hub-Key': config.sharedKey
      }
    });
    console.log(`✅ [A2A888 Hub] Task seq ${sequence} ACKed (Status ${res.status})`);
  } catch (e) {
    console.warn(`⚠️ [A2A888 Hub] Failed to ACK seq ${sequence}:`, e.message);
  }
}

// 5. 處理收到的 SSE Task
async function handleIncomingTask(task) {
  console.log(`\n📥 [SSE Event] 收到任務 (seq: ${task.sequence})`);
  console.log(`• 來源 Agent: ${task.requesterAgentId}`);
  console.log(`• Task ID: ${task.taskId}`);
  console.log(`• Context ID: ${task.contextId}`);
  console.log(`• 內容: ${task.message}`);

  const isReply = Boolean(
    (task.taskId && (task.taskId.startsWith('reply') || task.taskId.startsWith('task-reply'))) ||
    task.message.includes('甜甜收到') ||
    task.message.includes('🌸')
  );

  if (isReply) {
    console.log(`🎯 識別為協作回覆，立即推播至 Telegram...`);
    const alertText = `🌸 *【來自協作代理人的即時回覆】*：\n\n${task.message}\n\n_(由 A2A888 常駐守護進程 0 秒即時遞送)_`;
    await sendTelegramAlert(alertText);
    await ackTask(task.sequence);
  } else {
    console.log(`ℹ️ 識別為外部新任務，建議透過 Cloudflare Worker 處理或手動處理。`);
    await sendTelegramAlert(`📨 *【收到跨代理人新任務】* (來自 \`${task.requesterAgentId}\`)：\n\n${task.message}`);
    await ackTask(task.sequence);
  }
}

// 6. 連線 SSE 串流
let reconnectAttempts = 0;

async function connectSSE() {
  const streamUrl = `${config.hubUrl}/hub/v1/agents/${config.agentId}/inbox/stream`;
  console.log(`🌐 正在連線至 SSE 串流: ${streamUrl}`);

  try {
    const res = await fetch(streamUrl, {
      headers: {
        'X-Agent-ID': config.agentId,
        'Authorization': `Bearer ${config.agentToken}`,
        'X-Hub-Key': config.sharedKey,
        'Accept': 'text/event-stream'
      }
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }

    console.log(`🟢 [SSE Connected] 守護進程已成功建立持久連線！持續監聽中...`);
    reconnectAttempts = 0;

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        console.warn('⚠️ SSE 串流已結束 (Stream ended)');
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // 保留尚未成行的殘餘

      let currentEvent = null;
      let currentData = null;

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
          // 空行表示一個 SSE message 結束
          if (currentData) {
            try {
              const parsed = JSON.parse(currentData);
              await handleIncomingTask(parsed);
            } catch (e) {
              console.warn('⚠️ 解析 SSE data 失敗:', e.message, 'Raw:', currentData);
            }
            currentEvent = null;
            currentData = null;
          }
          continue;
        }

        if (trimmed.startsWith('event:')) {
          currentEvent = trimmed.replace('event:', '').trim();
        } else if (trimmed.startsWith('data:')) {
          const dataStr = trimmed.replace('data:', '').trim();
          currentData = currentData ? (currentData + '\n' + dataStr) : dataStr;
        }
      }
    }
  } catch (err) {
    console.error(`❌ [SSE Connection Error]:`, err.message);
  }

  // 自動重連
  reconnectAttempts++;
  const backoff = Math.min(30000, 2000 * Math.pow(1.5, reconnectAttempts));
  console.log(`🔄 將在 ${(backoff / 1000).toFixed(1)} 秒後嘗試重新連線... (嘗試次數: ${reconnectAttempts})`);
  setTimeout(connectSSE, backoff);
}

// 啟動連線
connectSSE();
