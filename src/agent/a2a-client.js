import { ENV, WORKER_ENV } from '../config/env.js';

/**
 * A2A Client Logic
 * Handles outbound delegation to other agents
 */

export async function delegateToAgent(agentAlias, taskDescription) {
  console.log(`[A2A Client] Delegating task to ${agentAlias}: ${taskDescription}`);

  // 1. Resolve Peer Configuration
  const peers = parsePeersConfig();
  const peer = peers[agentAlias] || findPeerByName(peers, agentAlias);

  if (!peer) {
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
  if (peer.binding && WORKER_ENV && WORKER_ENV[peer.binding]) {
    console.log(`[A2A Client] Using Service Binding ${peer.binding} for ${peer.url}`);
    response = await WORKER_ENV[peer.binding].fetch(peer.url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });
  } else {
    console.log(`[A2A Client] Sending request to ${peer.url}`);
    response = await fetch(peer.url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`A2A Peer responded with error (${response.status}): ${errorText}`);
  }

  const resultBody = await response.json();
  if (resultBody.error) {
    throw new Error(`A2A Protocol Error: ${resultBody.error.message}`);
  }

  // 4. Extract Result
  const resultMessage = resultBody.result;
  const answer = resultMessage.parts
    .filter(p => p.kind === 'text')
    .map(p => p.text)
    .join('\n');

  return answer;
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
