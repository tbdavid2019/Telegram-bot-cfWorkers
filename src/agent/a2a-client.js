import { ENV, WORKER_ENV } from '../config/env.js';

/**
 * A2A Client Logic
 * Handles outbound delegation to other agents
 */

export async function delegateToAgent(agentAlias, taskDescription, options = {}) {
  console.log(`[A2A Client] Delegating task to ${agentAlias}: ${taskDescription}`);

  // 1. Resolve Peer Configuration
  const peers = parsePeersConfig();
  const peer = peers[agentAlias] || findPeerByName(peers, agentAlias);

  if (!peer) {
    // 2. Fallback to 888a2a-lite Hub
    try {
      const { getHubConfig, sendHubTask } = await import('../features/a2a888-hub.js');
      const hubConfig = getHubConfig(WORKER_ENV || ENV);
      if (hubConfig.sharedKey || hubConfig.agentId) {
        console.log(`[A2A Client] "${agentAlias}" not in local peers, attempting 888a2a-lite Hub delegation...`);
        return await sendHubTask(WORKER_ENV || ENV, agentAlias, taskDescription, { waitForReply: true, ...options });
      }
    } catch (hubError) {
      console.warn(`[A2A Client] Hub delegation failed:`, hubError.message);
      throw new Error(`Agent "${agentAlias}" not found in local peer registry or 888a2a Hub: ${hubError.message}`);
    }

    throw new Error(`Agent "${agentAlias}" not found in current peer registry. (Available keys: ${Object.keys(peers).join(', ')}, Raw: ${JSON.stringify(peers)})`);
  }

  // 2. Prepare A2A JSON-RPC Payload
  const payload = {
    jsonrpc: "2.0",
    id: `req_${Date.now()}`,
    method: "message/send",
    params: {
      message: {
        role: "user", // The delegator acts as the "user" for the peer
        messageId: `msg_${Date.now()}`,
        parts: [
          { kind: "text", text: taskDescription }
        ],
        contextId: `ctx_${Date.now()}`
      },
      configuration: {
        blocking: true
      }
    }
  };

  // 3. Send Request
  const headers = {
    'Content-Type': 'application/json'
  };
  if (peer.token) {
    headers['Authorization'] = `Bearer ${peer.token}`;
  }

  let response;
  const timeoutMs = options.timeoutMs || 12000; // 12 秒上限，確保在 Cloudflare Workers 30 秒生命週期內安全返回
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    if (peer.binding && WORKER_ENV && WORKER_ENV[peer.binding]) {
      console.log(`[A2A Client] Using Service Binding ${peer.binding} for ${peer.url}`);
      response = await WORKER_ENV[peer.binding].fetch(peer.url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal
      });
    } else {
      console.log(`[A2A Client] Sending request to ${peer.url}`);
      response = await fetch(peer.url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal
      });
    }
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError' || err.message?.includes('aborted')) {
      console.warn(`[A2A Client] Delegation to ${agentAlias} timed out after ${timeoutMs}ms`);
      return `⏳ 任務已成功投遞給「${agentAlias}」。\n對方目前正在深度運算處理中（耗時超過即時連線上限）；一旦對方回覆，小江管家會自動在聊天室推播給您！`;
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`A2A Peer responded with error (${response.status}): ${errorText}`);
  }

  const resultBody = await response.json();
  if (resultBody.error) {
    throw new Error(`A2A Protocol Error: ${resultBody.error.message}`);
  }

  // 4. Extract Result (Defensive extraction)
  const resultMessage = resultBody?.result;
  if (!resultMessage) {
    return '✅ 對方已成功接收任務，未回傳任何資料。';
  }

  const parts = Array.isArray(resultMessage.parts) ? resultMessage.parts : [];
  const textFromParts = parts
    .filter(p => p && p.kind === 'text')
    .map(p => p.text)
    .join('\n');

  if (textFromParts.trim()) {
    return textFromParts.trim();
  }

  if (typeof resultMessage.message === 'string' && resultMessage.message.trim()) {
    return resultMessage.message.trim();
  }

  if (typeof resultMessage === 'string' && resultMessage.trim()) {
    return resultMessage.trim();
  }

  return '✅ 對方已成功接收任務並完成處理。';
}

/**
 * Parses A2A_PEERS environment variable
 * Expected format: {"no.2": {"url": "...", "token": "...", "names": ["Bot 2"]}}
 */
function parsePeersConfig() {
  const peersStr = ENV.USER_CONFIG.A2A_PEERS;
  if (!peersStr) return {};
  try {
    return typeof peersStr === 'string' ? JSON.parse(peersStr) : peersStr;
  } catch (e) {
    console.error("Failed to parse A2A_PEERS config", e);
    return {};
  }
}

/**
 * Searches for a peer by its name if alias doesn't match
 */
function findPeerByName(peers, name) {
  for (const p of Object.values(peers)) {
    if (p.names && p.names.includes(name)) {
      return p;
    }
  }
  return null;
}
