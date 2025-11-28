// 指令路由系統
import { 
  commandWeather, 
  commandWeatherAlert 
} from '../features/weather.js';
import { 
  commandStockTW, 
  commandStock 
} from '../features/stock.js';
import { 
  commandDictCN, 
  commandDictEN 
} from '../features/dictionary.js';
import {
  commandQimen,
  commandTempleOracleJP,
  commandTangPoetry,
  commandAnswerBook,
  commandAnswerBookOriginal,
  generateRandomPassword
} from '../features/divination.js';
import { commandLaw } from '../features/law.js';
import {
  commandIpLookup,
  commandDnsLookup,
  commandDnsLookup2
} from '../features/network.js';
import { commandDDGSearch } from '../features/search.js';
import {
  commandGenerateImg,
  commandGenerateImg2,
  commandSetImageProvider
} from '../features/image-gen.js';
import {
  commandGetHelp,
  commandCreateNewChatContext,
  commandUpdateUserConfig,
  commandUpdateUserConfigs,
  commandDeleteUserConfig,
  commandClearUserConfig,
  commandFetchUpdate,
  commandSystem,
  commandRegenerate
} from '../features/system.js';
import { commandLLMChange } from '../features/llm.js';

/**
 * 指令排序列表 - 決定指令在 Telegram 選單中的顯示順序
 * 把原生指令 "/setenv", "/delenv", "/version", "/redo" 隱藏
 */
export const commandSortList = [
  "/new",           // 新對話 
  "/bo",            // 解答之書原版
  "/qi",            // 奇門遁甲
  "/oracle",        // 淺草籤詩
  "/poetry",        // 唐詩
  "/law",           // 法律問答
  "/weatheralert",  // 天氣特報警報
  "/img",           // 產生圖片
  "/img2",          // 產生圖片2 (支援更多模型)
  "/setimg",        // 設定圖片生成模型
  "/dictcn",        // 中文字典 (要加參數)
  "/dicten",        // 英文字典 (要加參數)
  "/system",        // 查看系統狀態
  "/stock2",        // 美國國際股市 (要加參數)
  "/stock",         // 台灣股市 (要加參數)
  "/wt",            // 台灣地區天氣 (要加參數)
  "/ip",            // IP 查詢 (要加參數)
  "/dns",           // DNS 查詢 (要加參數)
  "/password",      // 隨機密碼
  "/boa",           // 解答之書
  "/llmchange",     // 切換 LLM
  "/help"           // 幫助
];

/**
 * 指令處理器配置
 * 每個指令包含：
 * - scopes: 適用範圍（私聊、群組、管理員）
 * - fn: 執行函數
 * - needAuth: 是否需要權限驗證（可選）
 */
export const commandHandlers = {
  // 天氣相關
  "/wt": {
    scopes: ["all_private_chats", "all_group_chats", "all_chat_administrators"],
    fn: commandWeather,
    description: "查詢天氣 - 使用: /wt [城市名稱]"
  },
  "/weatheralert": {
    scopes: ["all_private_chats", "all_group_chats", "all_chat_administrators"],
    fn: commandWeatherAlert,
    description: "台灣天氣特報"
  },

  // 股票相關
  "/stock": {
    scopes: ["all_private_chats", "all_group_chats", "all_chat_administrators"],
    fn: commandStockTW,
    description: "台灣股票查詢 - 使用: /stock [股票代號]"
  },
  "/stock2": {
    scopes: ["all_private_chats", "all_group_chats", "all_chat_administrators"],
    fn: commandStock,
    description: "國際股票查詢 - 使用: /stock2 [股票代號]"
  },

  // 字典相關
  "/dictcn": {
    scopes: ["all_private_chats", "all_group_chats", "all_chat_administrators"],
    fn: commandDictCN,
    description: "中文字典查詢 - 使用: /dictcn [詞語]"
  },
  "/dicten": {
    scopes: ["all_private_chats", "all_group_chats", "all_chat_administrators"],
    fn: commandDictEN,
    description: "英文字典查詢 - 使用: /dicten [單字]"
  },

  // 占卜相關
  "/qi": {
    scopes: ["all_private_chats", "all_group_chats", "all_chat_administrators"],
    fn: commandQimen,
    description: "奇門遁甲問事 - 使用: /qi [問題]"
  },
  "/oracle": {
    scopes: ["all_private_chats", "all_group_chats", "all_chat_administrators"],
    fn: commandTempleOracleJP,
    description: "淺草寺籤詩"
  },
  "/poetry": {
    scopes: ["all_private_chats", "all_group_chats", "all_chat_administrators"],
    fn: commandTangPoetry,
    description: "隨機唐詩"
  },
  "/boa": {
    scopes: ["all_private_chats", "all_group_chats", "all_chat_administrators"],
    fn: commandAnswerBook,
    description: "解答之書"
  },
  "/bo": {
    scopes: ["all_private_chats", "all_group_chats", "all_chat_administrators"],
    fn: commandAnswerBookOriginal,
    description: "解答之書原版"
  },
  "/password": {
    scopes: ["all_private_chats", "all_group_chats", "all_chat_administrators"],
    fn: generateRandomPassword,
    description: "生成隨機密碼"
  },

  // 法律相關
  "/law": {
    scopes: ["all_private_chats", "all_group_chats", "all_chat_administrators"],
    fn: commandLaw,
    description: "台灣法律問答 - 使用: /law [法律問題]"
  },

  // 網路工具
  "/ip": {
    scopes: ["all_private_chats", "all_group_chats", "all_chat_administrators"],
    fn: commandIpLookup,
    description: "IP 位址查詢 - 使用: /ip [IP位址]"
  },
  "/dns": {
    scopes: ["all_private_chats", "all_group_chats", "all_chat_administrators"],
    fn: commandDnsLookup,
    description: "DNS 查詢 (Cloudflare) - 使用: /dns [網域]"
  },
  "/dns2": {
    scopes: ["all_private_chats", "all_group_chats", "all_chat_administrators"],
    fn: commandDnsLookup2,
    description: "DNS 查詢 (Netlify) - 使用: /dns2 [網域]"
  },

  // 搜尋相關
  "/web": {
    scopes: ["all_private_chats", "all_group_chats", "all_chat_administrators"],
    fn: commandDDGSearch,
    description: "網路搜尋 - 使用: /web [關鍵字]"
  },

  // AI 圖片生成
  "/img": {
    scopes: ["all_private_chats", "all_chat_administrators"],
    fn: commandGenerateImg,
    description: "AI 圖片生成 - 使用: /img [描述]"
  },
  "/img2": {
    scopes: ["all_private_chats", "all_chat_administrators"],
    fn: commandGenerateImg2,
    description: "並行生成圖片（多服務） - 使用: /img2 [描述]"
  },
  "/setimg": {
    scopes: ["all_private_chats", "all_chat_administrators"],
    fn: commandSetImageProvider,
    description: "設定圖片生成服務 - 使用: /setimg [provider]"
  },

  // LLM 切換
  "/llmchange": {
    scopes: ["all_private_chats", "all_chat_administrators"],
    fn: commandLLMChange,
    needAuth: (chatType) => chatType === "private" ? null : ["administrator", "creator"],
    description: "切換 LLM 模型 - 使用: /llmchange [profile] [model]"
  },

  // 系統指令
  "/help": {
    scopes: ["all_private_chats", "all_chat_administrators"],
    fn: commandGetHelp,
    description: "顯示幫助訊息"
  },
  "/new": {
    scopes: ["all_private_chats", "all_group_chats", "all_chat_administrators"],
    fn: commandCreateNewChatContext,
    description: "開始新對話"
  },
  "/start": {
    scopes: [],
    fn: commandCreateNewChatContext,
    description: "開始使用"
  },
  "/setenv": {
    scopes: [],
    fn: commandUpdateUserConfig,
    needAuth: (msg, ctx) => true, // 需要權限檢查
    description: "設定環境變數 - 使用: /setenv KEY=VALUE"
  },
  "/setenvs": {
    scopes: [],
    fn: commandUpdateUserConfigs,
    needAuth: (msg, ctx) => true,
    description: "批次設定環境變數"
  },
  "/delenv": {
    scopes: [],
    fn: commandDeleteUserConfig,
    needAuth: (msg, ctx) => true,
    description: "刪除環境變數"
  },
  "/clearenv": {
    scopes: [],
    fn: commandClearUserConfig,
    needAuth: (msg, ctx) => true,
    description: "清除所有環境變數"
  },
  "/version": {
    scopes: ["all_private_chats", "all_chat_administrators"],
    fn: commandFetchUpdate,
    description: "檢查更新"
  },
  "/system": {
    scopes: ["all_private_chats", "all_chat_administrators"],
    fn: commandSystem,
    needAuth: (msg, ctx) => true,
    description: "顯示系統狀態"
  },
  "/redo": {
    scopes: ["all_private_chats", "all_group_chats", "all_chat_administrators"],
    fn: commandRegenerate,
    description: "重新生成上一則回覆"
  }
};

/**
 * 取得所有可用指令列表
 * @returns {Array<{command: string, description: string}>}
 */
export function getAvailableCommands() {
  return Object.entries(commandHandlers).map(([command, config]) => ({
    command,
    description: config.description || '無說明'
  }));
}

/**
 * 檢查指令是否存在
 * @param {string} command - 指令名稱
 * @returns {boolean}
 */
export function isValidCommand(command) {
  return command in commandHandlers;
}

/**
 * 取得指令處理器
 * @param {string} command - 指令名稱
 * @returns {Object|null} 指令處理器配置
 */
export function getCommandHandler(command) {
  return commandHandlers[command] || null;
}

/**
 * 執行指令
 * @param {string} command - 指令名稱
 * @param {Object} message - Telegram 訊息物件
 * @param {string} subcommand - 子指令或參數
 * @param {Object} context - 上下文物件
 * @returns {Promise<any>}
 */
export async function executeCommand(command, message, subcommand, context) {
  const handler = getCommandHandler(command);
  
  if (!handler) {
    throw new Error(`未知指令: ${command}`);
  }

  // 檢查權限（如果需要）
  if (handler.needAuth) {
    const authResult = await handler.needAuth(message, context);
    if (!authResult) {
      throw new Error('權限不足');
    }
  }

  // 執行指令
  return await handler.fn(message, command, subcommand, context);
}

/**
 * Echo 指令（開發模式專用）
 */
export async function commandEcho(message, command, subcommand, context) {
  const { sendMessageToTelegramWithContext } = await import('./telegram.js');
  let msg = "<pre>";
  msg += JSON.stringify({ message }, null, 2);
  msg += "</pre>";
  context.CURRENT_CHAT_CONTEXT.parse_mode = "HTML";
  return sendMessageToTelegramWithContext(context)(msg);
}

/**
 * 處理指令訊息
 * @param {Object} message - Telegram 訊息物件
 * @param {Object} context - 上下文物件
 * @returns {Promise<Response|null>}
 */
export async function handleCommandMessage(message, context) {
  const { sendMessageToTelegramWithContext, getChatRoleWithContext } = await import('./telegram.js');
  const { ENV, CUSTOM_COMMAND } = await import('../config/env.js');
  
  // 開發模式下添加 echo 指令
  if (ENV.DEV_MODE) {
    commandHandlers["/echo"] = {
      help: "[DEBUG ONLY] echo message",
      scopes: ["all_private_chats", "all_chat_administrators"],
      fn: commandEcho,
      needAuth: commandAuthCheck.default
    };
  }
  
  // 處理自訂指令
  if (CUSTOM_COMMAND[message.text]) {
    message.text = CUSTOM_COMMAND[message.text];
  }
  
  // 遍歷指令處理器
  for (const key in commandHandlers) {
    if (message.text === key || message.text.startsWith(key + " ")) {
      const command = commandHandlers[key];
      
      // 權限檢查
      try {
        if (command.needAuth) {
          const roleList = command.needAuth(context.SHARE_CONTEXT.chatType);
          if (roleList) {
            const chatRole = await getChatRoleWithContext(context)(context.SHARE_CONTEXT.speakerId);
            if (chatRole === null) {
              return sendMessageToTelegramWithContext(context)("ERROR: Get chat role failed");
            }
            if (!roleList.includes(chatRole)) {
              return sendMessageToTelegramWithContext(context)(`ERROR: Permission denied, need ${roleList.join(" or ")}`);
            }
          }
        }
      } catch (e) {
        return sendMessageToTelegramWithContext(context)(`ERROR: ${e.message}`);
      }
      
      // 執行指令
      const subcommand = message.text.substring(key.length).trim();
      try {
        return await command.fn(message, key, subcommand, context);
      } catch (e) {
        return sendMessageToTelegramWithContext(context)(`ERROR: ${e.message}`);
      }
    }
  }
  
  return null;
}

/**
 * 綁定指令到 Telegram
 * @param {string} token - Bot Token
 * @returns {Promise<Object>}
 */
export async function bindCommandForTelegram(token) {
  const { ENV } = await import('../config/env.js');
  
  const scopeCommandMap = {
    all_private_chats: [],
    all_group_chats: [],
    all_chat_administrators: []
  };
  
  for (const key of commandSortList) {
    if (ENV.HIDE_COMMAND_BUTTONS.includes(key)) {
      continue;
    }
    if (Object.prototype.hasOwnProperty.call(commandHandlers, key) && commandHandlers[key].scopes) {
      for (const scope of commandHandlers[key].scopes) {
        if (!scopeCommandMap[scope]) {
          scopeCommandMap[scope] = [];
        }
        scopeCommandMap[scope].push(key);
      }
    }
  }
  
  const result = {};
  for (const scope in scopeCommandMap) {
    result[scope] = await fetch(
      `https://api.telegram.org/bot${token}/setMyCommands`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          commands: scopeCommandMap[scope].map((command) => ({
            command,
            // 優先使用 commandHandlers 中的 description，再使用 I18N，最後用指令名稱
            description: commandHandlers[command]?.description 
              || ENV.I18N?.command?.help?.[command.substring(1)] 
              || command.substring(1)
          })),
          scope: {
            type: scope
          }
        })
      }
    ).then((res) => res.json());
  }
  
  return { ok: true, result };
}

/**
 * 取得指令文件列表
 * @returns {Array<{command: string, description: string}>}
 */
export function commandsDocument() {
  // 使用同步方式，從已載入的 commandHandlers 取得指令列表
  return Object.keys(commandHandlers).map((key) => {
    return {
      command: key,
      description: commandHandlers[key].description || key.substring(1)
    };
  });
}
