import { JsonRpcTransportHandler } from '@a2a-js/sdk/server';
import { ENV } from '../config/env.js';
import { requestCompletionsFromLLM } from '../agent/llm.js';
import { loadChatLLM } from '../agent/agents.js';
import { getAvailableCommands } from '../telegram/commands.js';

/**
 * A2A Feature Handler
 * Manages incoming A2A protocol messages and Agent Card
 */

class TelegramBotA2AHandler {
  constructor() {
    this._agentCard = null;
  }

  /**
   * Generates or returns the Agent Card
   * Includes bot name, description, and available commands as capabilities
   */
  async getAgentCard() {
    if (this._agentCard) return this._agentCard;

    const commands = getAvailableCommands();
    const commandList = commands.map(c => `${c.command}: ${c.description}`).join('\n');

    this._agentCard = {
      name: ENV.USER_CONFIG.A2A_AGENT_NAME || (ENV.TELEGRAM_BOT_NAME && ENV.TELEGRAM_BOT_NAME[0]) || "Telegram A2A Bot",
      description: `A collaborative AI agent accessible via Telegram. \nAvailable Commands:\n${commandList}`,
      url: "", 
      version: "1.0.0",
      provider: "Telegram-bot-cfWorkers",
      capabilities: {
        streaming: false,
        pushNotifications: false,
        extensions: commands.map(c => ({
          uri: `telegram://command${c.command}`,
          description: c.description
        }))
      }
    };
    return this._agentCard;
  }

  /**
   * Handles message/send from another agent
   * Connects the A2A request to the bot's LLM pipeline
   */
  async sendMessage(params, context) {
    const incomingMessage = params.message;
    console.log(`[A2A] Received message: ${incomingMessage.messageId} (Task: ${incomingMessage.taskId})`);
    
    // 1. Prepare query from A2A parts
    const textParts = incomingMessage.parts.filter(p => p.kind === 'text').map(p => p.text);
    const query = textParts.join('\n');

    // 2. Create a minimal mock context for the LLM pipeline
    // A2A requests don't have a chat_id in the same way Telegram does
    const chatId = incomingMessage.contextId || `a2a_${incomingMessage.taskId || "default"}`;
    const a2aContext = {
      SHARE_CONTEXT: {
        chatId: chatId,
        chatHistoryKey: `history:a2a:${chatId}`,
        currentBotToken: "A2A_INTERNAL", // Placeholder
        speakerId: "a2a_peer_agent",
        chatType: "private"
      },
      USER_CONFIG: {
        ...ENV.USER_CONFIG,
        SYSTEM_INIT_MESSAGE: ENV.USER_CONFIG.SYSTEM_INIT_MESSAGE,
        USER_TIMEZONE: ENV.USER_CONFIG.USER_TIMEZONE
      },
      CURRENT_CHAT_CONTEXT: {
        chat_id: chatId,
        parse_mode: "Markdown"
      },
      env: context.env // Pass worker env
    };

    // 3. Load LLM and request completions
    try {
      const llm = loadChatLLM(a2aContext)?.request;
      if (!llm) {
        throw new Error("No LLM provider enabled for A2A");
      }

      const llmParams = {
        message: query,
        images: incomingMessage.parts.filter(p => p.kind === 'image').map(p => p.url)
      };

      // We don't use onStream for A2A blocking calls
      const answer = await requestCompletionsFromLLM(llmParams, a2aContext, llm, null, null);

      // 4. Return A2A Message Response
      return {
        kind: 'message',
        role: 'agent',
        messageId: `a2a_resp_${Date.now()}`,
        parts: [
          { kind: 'text', text: answer }
        ],
        taskId: incomingMessage.taskId,
        contextId: incomingMessage.contextId
      };
    } catch (error) {
      console.error("[A2A Execution Error]", error);
      throw error;
    }
  }

  // A2A v1.0 standard methods
  async getTask(params, context) { throw new Error("Tasks not persistent in this implementation"); }
  async cancelTask(params, context) { throw new Error("Cancellation not supported"); }
}

const botHandler = new TelegramBotA2AHandler();
const transportHandler = new JsonRpcTransportHandler(botHandler);

/**
 * Main entry point for /a2a route
 */
export async function handleA2ARequest(request, env) {
  try {
    const body = await request.json();
    
    // Auth Check (Basic Implementation)
    // In production, you'd check a token in headers against ENV.A2A_SECRET
    
    const context = {
      user: { isAuthenticated: true, id: "a2a_peer" },
      env: env
    };

    const response = await transportHandler.handle(body, context);
    
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error("[A2A Route Error]", error);
    return new Response(JSON.stringify({
      jsonrpc: "2.0",
      id: null,
      error: { code: -32603, message: error.message }
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

/**
 * Endpoint for /.well-known/agent.json
 */
export async function handleAgentDiscovery(request) {
  const card = await botHandler.getAgentCard();
  return new Response(JSON.stringify(card), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
