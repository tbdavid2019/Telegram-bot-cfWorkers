import { ENV, WORKER_ENV, DATABASE } from '../config/env.js';
import { sendMessageToTelegramWithContext } from '../telegram/telegram.js';
import { loadChatLLM } from '../agent/agents.js';

/**
 * 888a2a-lite Hub Feature Module
 * Connects Telegram Bot with https://a2a.david888.com (Public/Semi-Open A2A Hub)
 */

let _hubPeersCache = {
  peers: [],
  timestamp: 0
};

const CACHE_TTL_MS = 30 * 1000; // 30 秒快取

/**
 * 取得 Hub 設定
 */
export function getHubConfig(env) {
  const workerEnv = env || WORKER_ENV || {};
  const userConfig = ENV.USER_CONFIG || {};

  const hubUrl = (
    userConfig.A2A888_HUB_URL ||
    workerEnv.A2A888_HUB_URL ||
    ENV.A2A888_HUB_URL ||
    'https://a2a.david888.com'
  ).replace(/\/+$/, '');

  const sharedKey =
    userConfig.A2A888_HUB_SHARED_KEY ||
    workerEnv.A2A888_HUB_SHARED_KEY ||
    ENV.A2A888_HUB_SHARED_KEY ||
    '';

  const agentId =
    userConfig.A2A888_AGENT_ID ||
    workerEnv.A2A888_AGENT_ID ||
    ENV.A2A888_AGENT_ID ||
    '';

  const agentToken =
    userConfig.A2A888_AGENT_TOKEN ||
    workerEnv.A2A888_AGENT_TOKEN ||
    ENV.A2A888_AGENT_TOKEN ||
    '';

  const agentName =
    userConfig.A2A_AGENT_NAME ||
    workerEnv.A2A_AGENT_NAME ||
    (Array.isArray(ENV.TELEGRAM_BOT_NAME) ? ENV.TELEGRAM_BOT_NAME[0] : ENV.TELEGRAM_BOT_NAME) ||
    'Telegram Bot';

  return {
    hubUrl,
    sharedKey,
    agentId,
    agentToken,
    agentName
  };
}

/**
 * 確保已具備 Hub Agent 憑證 (支援環境變數、KV 快取與動態自動註冊)
 */
export async function ensureHubRegistration(env) {
  const config = getHubConfig(env);

  // 1. 若環境變數已設定，直接使用
  if (config.agentId && config.agentToken) {
    return config;
  }

  // 2. 檢查 KV 快取
  const kv = env?.DATABASE || DATABASE;
  const kvKey = `a2a888_credentials_${config.agentName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
  if (kv && typeof kv.get === 'function') {
    try {
      const cached = await kv.get(kvKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.agentId && parsed.agentToken) {
          return {
            ...config,
            agentId: parsed.agentId,
            agentToken: parsed.agentToken
          };
        }
      }
    } catch (e) {
      console.warn('[A2A888 Hub] Failed to read cached credentials from KV:', e.message);
    }
  }

  // 3. 自動向 Hub 註冊
  if (!config.sharedKey) {
    throw new Error('A2A888 Hub: 未設定 A2A888_HUB_SHARED_KEY，無法註冊代理人身分。');
  }

  const regUrl = `${config.hubUrl}/hub/v1/agents/register`;
  const regKey = `tgbot_${config.agentName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_david888`;

  const regPayload = {
    displayName: config.agentName,
    providerFamily: 'cfworkers',
    transportId: 'http-json',
    capabilities: ['text/plain', 'telegram-bot'],
    registrationIdempotencyKey: regKey
  };

  const headers = {
    'Content-Type': 'application/json',
    'X-Hub-Key': config.sharedKey,
    'Authorization': `Bearer ${config.sharedKey}`
  };

  console.log(`[A2A888 Hub] Registering agent "${config.agentName}" with key "${regKey}"...`);
  const res = await fetch(regUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(regPayload)
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`A2A888 Hub 註冊失敗 (HTTP ${res.status}): ${errText}`);
  }

  const data = await res.json();
  const identity = data?.identity;

  if (!identity || !identity.agentId) {
    throw new Error(`A2A888 Hub 註冊回應格式不正確: ${JSON.stringify(data)}`);
  }

  if (data.duplicate && !identity.agentToken) {
    throw new Error(
      `代理人「${config.agentName}」已在 Hub 註冊過，但 Token 僅在首次註冊時回傳。請在 wrangler.toml 設定 A2A888_AGENT_TOKEN 或使用新金鑰。`
    );
  }

  // 4. 寫入 KV 保存
  if (kv && typeof kv.put === 'function' && identity.agentToken) {
    try {
      await kv.put(kvKey, JSON.stringify({
        agentId: identity.agentId,
        agentToken: identity.agentToken,
        expiresAt: identity.expiresAt,
        registeredAt: new Date().toISOString()
      }));
      console.log(`[A2A888 Hub] Cached credentials for ${config.agentName} in KV.`);
    } catch (e) {
      console.warn('[A2A888 Hub] Failed to write credentials to KV:', e.message);
    }
  }

  return {
    ...config,
    agentId: identity.agentId,
    agentToken: identity.agentToken
  };
}

/**
 * 取得 Hub 上的所有註冊代理人 (支援記憶體快取)
 */
export async function listHubPeers(env, options = {}) {
  const forceRefresh = options.forceRefresh === true;
  const now = Date.now();

  if (!forceRefresh && _hubPeersCache.peers.length > 0 && (now - _hubPeersCache.timestamp) < CACHE_TTL_MS) {
    return _hubPeersCache.peers;
  }

  const creds = await ensureHubRegistration(env);
  const url = `${creds.hubUrl}/hub/v1/agents${options.onlyOnline ? '?state=online' : ''}`;

  const headers = {
    'X-Agent-ID': creds.agentId,
    'Authorization': `Bearer ${creds.agentToken}`
  };
  if (creds.sharedKey) {
    headers['X-Hub-Key'] = creds.sharedKey;
  }

  const res = await fetch(url, { method: 'GET', headers });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`讀取 Hub 節點列表失敗 (HTTP ${res.status}): ${errText}`);
  }

  const data = await res.json();
  const peers = data.agents || [];

  _hubPeersCache = {
    peers,
    timestamp: now
  };

  return peers;
}

/**
 * 取得當前快取的 Hub 節點列表 (供 Prompt 同步讀取，不發送網路請求)
 */
export function getCachedHubPeers() {
  return _hubPeersCache.peers || [];
}

/**
 * 解析目標代理人的 Agent ID (支援依 displayName 或 agentId 匹配)
 */
export async function resolveTargetAgent(env, targetIdentifier) {
  if (targetIdentifier.startsWith('agent-')) {
    return {
      agentId: targetIdentifier,
      displayName: targetIdentifier
    };
  }

  const peers = await listHubPeers(env);
  const targetLower = targetIdentifier.trim().toLowerCase();

  // 1. 完全匹配 displayName
  const exact = peers.find(p => p.displayName && p.displayName.toLowerCase() === targetLower);
  if (exact) return exact;

  // 2. 部分包含匹配
  const partial = peers.find(p =>
    p.displayName && (
      p.displayName.toLowerCase().includes(targetLower) ||
      targetLower.includes(p.displayName.toLowerCase())
    )
  );
  if (partial) return partial;

  // 3. 別名匹配
  const aliasMatch = peers.find(p => p.agentId.toLowerCase().includes(targetLower));
  if (aliasMatch) return aliasMatch;

  const availableList = peers.map(p => `${p.displayName} (${p.state})`).join(', ');
  throw new Error(`在 A2A888 Hub 找不到名為「${targetIdentifier}」的代理人。可用的代理人：${availableList || '無'}`);
}

/**
 * 向 Hub 發送任務並選擇性等待回覆
 */
export async function sendHubTask(env, targetIdentifier, taskMessage, options = {}) {
  const creds = await ensureHubRegistration(env);
  const target = await resolveTargetAgent(env, targetIdentifier);

  const taskId = options.taskId || `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const contextId = options.contextId || `ctx_${Date.now()}`;
  const idempotencyKey = options.idempotencyKey || `idem_${taskId}`;

  // 儲存委派 Context 到 KV，供異步回覆時追蹤 Telegram 聊天室
  const kv = env?.DATABASE || WORKER_ENV?.DATABASE || (typeof DATABASE !== 'undefined' ? DATABASE : null);
  if (kv && (options.chatId || options.botToken)) {
    try {
      await kv.put(`a2a_outbound:${contextId}`, JSON.stringify({
        chatId: options.chatId,
        botToken: options.botToken,
        targetName: target.displayName,
        taskMessage,
        createdAt: Date.now()
      }), { expirationTtl: 7200 });
    } catch (e) {
      console.warn('[A2A888 Hub] Failed to save outbound context to KV:', e.message);
    }
  }

  const sendUrl = `${creds.hubUrl}/hub/v1/agents/${target.agentId}/tasks`;
  const headers = {
    'Content-Type': 'application/json',
    'X-Agent-ID': creds.agentId,
    'Authorization': `Bearer ${creds.agentToken}`
  };
  if (creds.sharedKey) {
    headers['X-Hub-Key'] = creds.sharedKey;
  }

  const payload = {
    taskId,
    contextId,
    idempotencyKey,
    message: taskMessage
  };

  console.log(`[A2A888 Hub] Sending task to ${target.displayName} (${target.agentId})...`);
  const res = await fetch(sendUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`A2A888 Hub 發送任務失敗 (HTTP ${res.status}): ${errText}`);
  }

  const result = await res.json();

  // 若不需等待回覆，直接回傳發送結果
  if (options.waitForReply === false) {
    return `✅ 任務已成功投遞至 A2A888 Hub 給「${target.displayName}」\n• 狀態：${result.state || 'QUEUED'}\n• Task ID: ${taskId}`;
  }

  // 等待對象透過 Inbox 回覆 (預設等待最高 35 秒，適應遠端 LLM 延遲，不消耗 CPU Time)
  const timeoutMs = options.timeoutMs || 35000;
  const startTime = Date.now();
  const pollIntervalMs = 1200;

  console.log(`[A2A888 Hub] Waiting up to ${timeoutMs}ms for reply from ${target.displayName}...`);

  while (Date.now() - startTime < timeoutMs) {
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));

    try {
      const inboxUrl = `${creds.hubUrl}/hub/v1/agents/${creds.agentId}/inbox?afterSequence=0`;
      const inboxRes = await fetch(inboxUrl, { method: 'GET', headers });

      if (inboxRes.ok) {
        const inboxData = await inboxRes.json();
        const items = inboxData.items || [];

        // 優先精確匹配 contextId 或包含 taskId
        const replyItem = items.find(item =>
          item.state !== 'ACKNOWLEDGED' && (
            item.contextId === contextId ||
            (item.taskId && item.taskId.includes(taskId))
          )
        ) || items.find(item =>
          item.state !== 'ACKNOWLEDGED' && (
            item.requesterAgentId === target.agentId &&
            (item.taskId?.startsWith('reply') || item.taskId?.startsWith('task-reply'))
          )
        );

        if (replyItem) {
          console.log(`[A2A888 Hub] Found reply from ${replyItem.requesterAgentId} (seq: ${replyItem.sequence})`);

          // ACK 該回覆任務
          const ackUrl = `${creds.hubUrl}/hub/v1/agents/${creds.agentId}/inbox/${replyItem.sequence}/ack`;
          await fetch(ackUrl, { method: 'POST', headers }).catch(e => console.warn('ACK error:', e.message));

          if (kv) {
            await kv.delete(`a2a_outbound:${contextId}`).catch(() => {});
          }

          return replyItem.message;
        }
      }
    } catch (pollErr) {
      console.warn('[A2A888 Hub] Poll reply error:', pollErr.message);
    }
  }

  // 超時回退說明（異步推播承諾）
  return `⏳ 任務已成功投遞給「${target.displayName}」。\n對方目前正由 LLM 運算處理中；一旦對方回傳結果，小江管家會自動在聊天室推播回覆給您！`;
}

/**
 * 處理 Hub 收件匣中的未處理任務
 */
export async function processHubInbox(env, context = null) {
  const creds = await ensureHubRegistration(env);
  const headers = {
    'Content-Type': 'application/json',
    'X-Agent-ID': creds.agentId,
    'Authorization': `Bearer ${creds.agentToken}`
  };
  if (creds.sharedKey) {
    headers['X-Hub-Key'] = creds.sharedKey;
  }

  const inboxUrl = `${creds.hubUrl}/hub/v1/agents/${creds.agentId}/inbox?afterSequence=0`;
  const res = await fetch(inboxUrl, { method: 'GET', headers });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`讀取 Hub 收件匣失敗 (HTTP ${res.status}): ${errText}`);
  }

  const data = await res.json();
  const items = data.items || [];
  const pendingItems = items.filter(item => item.state !== 'ACKNOWLEDGED');

  if (pendingItems.length === 0) {
    return { count: 0, items: [] };
  }

  console.log(`[A2A888 Hub] Processing ${pendingItems.length} inbox item(s)...`);
  const processed = [];

  for (const item of pendingItems) {
    try {
      // 避免自己回覆自己的 echo 訊息
      if (item.requesterAgentId === creds.agentId) {
        // 直接 ACK
        await fetch(`${creds.hubUrl}/hub/v1/agents/${creds.agentId}/inbox/${item.sequence}/ack`, {
          method: 'POST',
          headers
        });
        continue;
      }

      console.log(`[A2A888 Hub] Handling task ${item.taskId} from ${item.requesterAgentId}: ${item.message}`);

      // 檢查是否為先前委派任務的異步回覆 (Outbound Reply)
      const kv = env?.DATABASE || WORKER_ENV?.DATABASE || (typeof DATABASE !== 'undefined' ? DATABASE : null);
      let outboundMeta = null;
      if (kv && item.contextId) {
        try {
          const raw = await kv.get(`a2a_outbound:${item.contextId}`);
          if (raw) outboundMeta = JSON.parse(raw);
        } catch (e) {
          console.warn('[A2A888 Hub] KV get error:', e.message);
        }
      }

      const isReply = Boolean(
        outboundMeta ||
        (item.taskId && (item.taskId.startsWith('reply') || item.taskId.startsWith('task-reply')))
      );

      if (isReply) {
        console.log(`[A2A888 Hub] Relaying async reply from ${item.requesterAgentId} to Telegram (seq: ${item.sequence})`);

        const targetChatId = outboundMeta?.chatId || ENV.USER_CONFIG.FAMILY_GROUP_ID || (Array.isArray(ENV.CHAT_WHITE_LIST) ? ENV.CHAT_WHITE_LIST[0] : (ENV.CHAT_WHITE_LIST || '').split(',')[0]);
        let botToken = outboundMeta?.botToken;
        if (!botToken) {
          botToken = Array.isArray(ENV.TELEGRAM_AVAILABLE_TOKENS) ? ENV.TELEGRAM_AVAILABLE_TOKENS[0] : (ENV.TELEGRAM_AVAILABLE_TOKENS || '').split(',')[0];
        }

        let senderDisplayName = outboundMeta?.targetName;
        if (!senderDisplayName) {
          const peers = getCachedHubPeers();
          const match = peers.find(p => p.agentId === item.requesterAgentId);
          senderDisplayName = match ? match.displayName : '協作代理人';
        }

        if (targetChatId && botToken) {
          const tgUrl = `https://api.telegram.org/bot${botToken.trim()}/sendMessage`;
          await fetch(tgUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: targetChatId,
              text: `🌸 *【來自「${senderDisplayName}」的協作回覆】*：\n\n${item.message}`,
              parse_mode: 'Markdown'
            })
          }).catch(e => console.error('[A2A888 Hub] Telegram push error:', e.message));
        }

        // ACK 該任務
        await fetch(`${creds.hubUrl}/hub/v1/agents/${creds.agentId}/inbox/${item.sequence}/ack`, {
          method: 'POST',
          headers
        });

        if (kv && item.contextId) {
          await kv.delete(`a2a_outbound:${item.contextId}`).catch(() => {});
        }

        processed.push({
          sequence: item.sequence,
          type: 'reply',
          from: item.requesterAgentId,
          message: item.message
        });
        continue;
      }

      // 建立 LLM 對話 Context
      const a2aContext = {
        SHARE_CONTEXT: {
          chatId: item.contextId || `hub_${item.taskId}`,
          chatHistoryKey: `history:hub:${item.contextId || item.taskId}`,
          currentBotToken: context?.SHARE_CONTEXT?.currentBotToken || 'A2A_HUB_INTERNAL',
          speakerId: item.requesterAgentId,
          chatType: 'private'
        },
        USER_CONFIG: { ...ENV.USER_CONFIG },
        CURRENT_CHAT_CONTEXT: {
          chat_id: item.contextId || `hub_${item.taskId}`,
          parse_mode: 'Markdown'
        },
        env: env || WORKER_ENV
      };

      const agent = loadChatLLM(a2aContext);
      if (!agent) {
        throw new Error('No LLM Provider available for Hub task processing');
      }

      const answer = await agent.request({
        message: item.message,
        history: [{
          role: 'system',
          content: `你是一個透過 A2A888 Hub 提供協作服務的 AI 代理人「${creds.agentName}」。請專業、直接地協助發問的代理人。`
        }]
      }, a2aContext, null);

      // 回覆發起者
      const replyUrl = `${creds.hubUrl}/hub/v1/agents/${item.requesterAgentId}/tasks`;
      const replyPayload = {
        taskId: `reply_${item.taskId}`,
        contextId: item.contextId,
        idempotencyKey: `reply_idem_${item.sequence}_${Date.now()}`,
        message: answer
      };

      await fetch(replyUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(replyPayload)
      });

      // ACK 此任務
      await fetch(`${creds.hubUrl}/hub/v1/agents/${creds.agentId}/inbox/${item.sequence}/ack`, {
        method: 'POST',
        headers
      });

      processed.push({
        sequence: item.sequence,
        from: item.requesterAgentId,
        message: item.message,
        answer
      });
    } catch (itemErr) {
      console.error(`[A2A888 Hub] Error processing task ${item.taskId}:`, itemErr);
    }
  }

  return { count: processed.length, items: processed };
}

/**
 * 取得 Hub 即時運作狀態
 */
export async function getHubStatus(env) {
  const creds = await ensureHubRegistration(env);
  const statusUrl = `${creds.hubUrl}/hub/v1/status`;
  const res = await fetch(statusUrl);
  if (!res.ok) {
    throw new Error(`讀取 Hub 狀態失敗 (HTTP ${res.status})`);
  }
  const statusData = await res.json();
  return {
    ...statusData,
    localAgent: {
      name: creds.agentName,
      id: creds.agentId
    }
  };
}

/**
 * /a2ahub Telegram 指令處理器
 */
export async function commandA2AHub(message, command, subcommand, context) {
  const args = (subcommand || '').trim();
  const parts = args.split(/\s+/).filter(Boolean);
  const action = parts[0] || 'status';

  const send = sendMessageToTelegramWithContext(context);

  try {
    if (action === 'status') {
      const status = await getHubStatus(context?.env || WORKER_ENV);
      let reply = `🌐 *888a2a-lite Hub 狀態*\n`;
      reply += `• Hub 網址：${status.hubId || 'public'} (${ENV.USER_CONFIG.A2A888_HUB_URL || 'https://a2a.david888.com'})\n`;
      reply += `• 模式：\`${status.mode || 'UNKNOWN'}\`\n`;
      reply += `• 目前線上代理人數：${status.registeredAgents ?? '未知'}\n`;
      reply += `• 佇列中任務數：${status.pendingTasks ?? 0}\n\n`;
      reply += `🤖 *本機註冊代理人*\n`;
      reply += `• 名稱：*${status.localAgent.name}*\n`;
      reply += `• Agent ID：\`${status.localAgent.id}\`\n\n`;
      reply += `💡 常用操作：\n• \`/a2ahub peers\` — 查詢所有同伴代理人\n• \`/a2ahub poll\` — 檢查並處理 Hub 收件匣\n• \`/a2ahub send <名稱> <任務>\` — 發送協作任務`;
      return send(reply);
    }

    if (action === 'peers') {
      const peers = await listHubPeers(context?.env || WORKER_ENV, { forceRefresh: true });
      if (peers.length === 0) {
        return send('ℹ️ 目前 Hub 上沒有找到註冊的代理人。');
      }

      let reply = `👥 *888a2a-lite Hub 代理人名冊 (${peers.length})*\n\n`;
      for (const p of peers) {
        const isOnline = p.state === 'ONLINE';
        const statusIcon = isOnline ? '🟢' : '⚪';
        const caps = p.capabilities ? p.capabilities.join(', ') : 'text/plain';
        reply += `${statusIcon} *${p.displayName}* (\`${p.agentId}\`)\n`;
        reply += `   狀態：${p.state} | 能力：${caps}\n`;
      }
      reply += `\n💡 您可以使用 \`/delegate [名稱] [任務]\` 直接將任務交派給任何代理人！`;
      return send(reply);
    }

    if (action === 'poll') {
      await send('🔄 正在檢查 888a2a-lite Hub 收件匣...');
      const result = await processHubInbox(context?.env || WORKER_ENV, context);
      if (result.count === 0) {
        return send('✅ 收件匣檢查完畢，目前沒有待處理的新任務。');
      }
      return send(`✅ 已成功處理並回覆了 ${result.count} 個 Hub 協作任務！`);
    }

    if (action === 'send') {
      const targetName = parts[1];
      const taskMessage = parts.slice(2).join(' ');

      if (!targetName || !taskMessage) {
        return send('❌ 格式錯誤。使用方法：\n`/a2ahub send <代理人名稱或ID> <任務訊息>`');
      }

      await send(`📤 正在投遞任務給「${targetName}」...`);
      const answer = await sendHubTask(context?.env || WORKER_ENV, targetName, taskMessage, { waitForReply: true });
      return send(`📨 *來自「${targetName}」的回覆*：\n\n${answer}`);
    }

    return send(
      `❓ 未知操作。請使用：\n• \`/a2ahub\` — 檢查 Hub 狀態\n• \`/a2ahub peers\` — 列出 Hub 代理人\n• \`/a2ahub poll\` — 處理收件匣\n• \`/a2ahub send <名稱> <任務>\` — 發送任務`
    );
  } catch (err) {
    console.error('[A2A888 Hub Command Error]', err);
    return send(`❌ A2A888 Hub 執行失敗：\n${err.message}`);
  }
}

/**
 * /delegate Telegram 指令處理器
 */
export async function commandDelegate(message, command, subcommand, context) {
  const send = sendMessageToTelegramWithContext(context);
  const args = (subcommand || '').trim();

  let agentAlias = '';
  let taskDescription = '';

  const matchQuoted = args.match(/^["']([^"']+)["']\s+([\s\S]*)$/);
  if (matchQuoted) {
    agentAlias = matchQuoted[1].trim();
    taskDescription = matchQuoted[2].trim();
  } else {
    const parts = args.split(/\s+/);
    agentAlias = parts[0];
    taskDescription = parts.slice(1).join(' ');
  }

  if (!agentAlias || !taskDescription) {
    return send(`ℹ️ *代理人協作指派 (/delegate)*\n\n用法：\n\`/delegate <代理人名稱> <任務內容>\`\n\n範例：\n• \`/delegate 甘露寺 幫我分析這篇文章\`\n• \`/delegate 甜甜 請查詢最新市場資訊\`\n• \`/delegate no.2 早安請打個招呼\``);
  }

  await send(`🔄 正在將任務指派給「${agentAlias}」...`);

  try {
    const { delegateToAgent } = await import('../agent/a2a-client.js');
    const result = await delegateToAgent(agentAlias, taskDescription);
    return send(`🤝 *「${agentAlias}」的協作回覆*：\n\n${result}`);
  } catch (e) {
    return send(`❌ 協作指派失敗：\n${e.message}`);
  }
}

/**
 * 處理來自 888a2a Hub 或協作代理人的 Webhook 回調 (POST /a2ahub/callback)
 * 實現 100% Serverless、0 秒延遲喚醒轉發
 * @param {Request} request
 * @param {Object} env
 * @returns {Promise<Response>}
 */
export async function handleA2AHubCallback(request, env = null) {
  const activeEnv = env || WORKER_ENV || ENV;
  const creds = await ensureHubRegistration(activeEnv);

  // 1. 驗證來源密鑰 (若有配置 A2A888_HUB_SHARED_KEY 或 A2A_SECRET)
  if (creds.sharedKey) {
    const hubKey = request.headers.get('X-Hub-Key') || request.headers.get('x-hub-key');
    const authHeader = request.headers.get('Authorization') || '';
    const bearerToken = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (hubKey !== creds.sharedKey && bearerToken !== creds.sharedKey && bearerToken !== creds.agentToken) {
      console.warn('[A2A888 Callback] Unauthorized webhook request.');
      return new Response(JSON.stringify({ ok: false, error: 'Unauthorized callback' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  // 2. 若為 GET 請求，視為輕量級觸發輪詢
  if (request.method === 'GET') {
    const result = await processHubInbox(activeEnv);
    return new Response(JSON.stringify({ ok: true, trigger: 'polled', result }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 3. 若為 POST 請求，解析 payload
  let payload;
  try {
    payload = await request.json();
  } catch (err) {
    // 若為空 body，觸發收件匣檢查
    const result = await processHubInbox(activeEnv);
    return new Response(JSON.stringify({ ok: true, trigger: 'empty_post_polled', result }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 支援單筆 item 或 items 陣列
  const items = Array.isArray(payload.items) ? payload.items : [payload];
  const processed = [];

  for (const item of items) {
    if (!item || !item.message) continue;

    console.log(`[A2A888 Callback] Processing callback item ${item.taskId || 'untasked'}: ${item.message}`);

    const kv = activeEnv?.DATABASE || WORKER_ENV?.DATABASE || (typeof DATABASE !== 'undefined' ? DATABASE : null);
    let outboundMeta = null;
    if (kv && item.contextId) {
      try {
        const raw = await kv.get(`a2a_outbound:${item.contextId}`);
        if (raw) outboundMeta = JSON.parse(raw);
      } catch (e) {
        console.warn('[A2A888 Callback] KV get error:', e.message);
      }
    }

    const isReply = Boolean(
      outboundMeta ||
      (item.taskId && (item.taskId.startsWith('reply') || item.taskId.startsWith('task-reply')))
    );

    if (isReply) {
      const targetChatId = outboundMeta?.chatId || ENV.USER_CONFIG.FAMILY_GROUP_ID || (Array.isArray(ENV.CHAT_WHITE_LIST) ? ENV.CHAT_WHITE_LIST[0] : (ENV.CHAT_WHITE_LIST || '').split(',')[0]);
      let botToken = outboundMeta?.botToken;
      if (!botToken) {
        botToken = Array.isArray(ENV.TELEGRAM_AVAILABLE_TOKENS) ? ENV.TELEGRAM_AVAILABLE_TOKENS[0] : (ENV.TELEGRAM_AVAILABLE_TOKENS || '').split(',')[0];
      }

      let senderDisplayName = outboundMeta?.targetName;
      if (!senderDisplayName) {
        const peers = getCachedHubPeers();
        const match = peers.find(p => p.agentId === item.requesterAgentId);
        senderDisplayName = match ? match.displayName : '協作代理人';
      }

      if (targetChatId && botToken) {
        const tgUrl = `https://api.telegram.org/bot${botToken.trim()}/sendMessage`;
        await fetch(tgUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: targetChatId,
            text: `🌸 *【來自「${senderDisplayName}」的即時回覆】*：\n\n${item.message}`,
            parse_mode: 'Markdown'
          })
        }).catch(e => console.error('[A2A888 Callback] Telegram push error:', e.message));
      }

      if (item.sequence) {
        await fetch(`${creds.hubUrl}/hub/v1/agents/${creds.agentId}/inbox/${item.sequence}/ack`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Agent-ID': creds.agentId,
            'Authorization': `Bearer ${creds.agentToken}`,
            'X-Hub-Key': creds.sharedKey
          }
        }).catch(() => {});
      }

      if (kv && item.contextId) {
        await kv.delete(`a2a_outbound:${item.contextId}`).catch(() => {});
      }

      processed.push({ taskId: item.taskId, type: 'reply_relayed' });
    } else {
      // 處理來自外部代理人發起的普通新任務 (Inbound Task)
      const { loadChatLLM } = await import('../agent/agents.js');
      const a2aContext = {
        SHARE_CONTEXT: {
          chatId: item.contextId || `hub_${item.taskId}`,
          chatHistoryKey: `history:hub:${item.contextId || item.taskId}`,
          currentBotToken: 'A2A_HUB_CALLBACK',
          speakerId: item.requesterAgentId,
          chatType: 'private'
        },
        USER_CONFIG: { ...ENV.USER_CONFIG },
        CURRENT_CHAT_CONTEXT: {
          chat_id: item.contextId || `hub_${item.taskId}`,
          parse_mode: 'Markdown'
        },
        env: activeEnv
      };

      const agent = loadChatLLM(a2aContext);
      if (agent) {
        const answer = await agent.request({
          message: item.message,
          history: [{
            role: 'system',
            content: `你是一個透過 A2A888 提供協作服務的 AI 代理人「${creds.agentName}」。請專業、直接地協助發問的代理人。`
          }]
        }, a2aContext, null);

        if (item.requesterAgentId) {
          const replyUrl = `${creds.hubUrl}/hub/v1/agents/${item.requesterAgentId}/tasks`;
          await fetch(replyUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Agent-ID': creds.agentId,
              'Authorization': `Bearer ${creds.agentToken}`,
              'X-Hub-Key': creds.sharedKey
            },
            body: JSON.stringify({
              taskId: `reply_${item.taskId || Date.now()}`,
              contextId: item.contextId,
              idempotencyKey: `reply_idem_${Date.now()}`,
              message: answer
            })
          }).catch(e => console.warn('[A2A888 Callback] Reply post error:', e.message));
        }

        if (item.sequence) {
          await fetch(`${creds.hubUrl}/hub/v1/agents/${creds.agentId}/inbox/${item.sequence}/ack`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Agent-ID': creds.agentId,
              'Authorization': `Bearer ${creds.agentToken}`,
              'X-Hub-Key': creds.sharedKey
            }
          }).catch(() => {});
        }

        processed.push({ taskId: item.taskId, type: 'task_processed', answer });
      }
    }
  }

  return new Response(JSON.stringify({ ok: true, processed }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
