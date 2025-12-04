/**
 * 統計模組
 * 記錄 Bot 使用情況
 */

import { DATABASE } from '../config/env.js';

// KV Keys
const STATS_USERS_KEY = 'stats:users';           // Set of user IDs
const STATS_GROUPS_KEY = 'stats:groups';         // Set of group IDs
const STATS_TOTAL_MESSAGES_KEY = 'stats:total_messages';  // Total message count
const STATS_DAILY_KEY_PREFIX = 'stats:daily:';   // Daily stats prefix

/**
 * 記錄使用者活動
 * @param {Object} context - 上下文對象
 */
export async function recordUserActivity(context) {
  try {
    const chatId = context.SHARE_CONTEXT.chatId;
    const speakerId = context.SHARE_CONTEXT.speakerId;
    const chatType = context.SHARE_CONTEXT.chatType;
    const botId = context.SHARE_CONTEXT.currentBotId;
    
    if (!chatId) return;
    
    // 使用 bot-specific keys
    const usersKey = `${STATS_USERS_KEY}:${botId}`;
    const groupsKey = `${STATS_GROUPS_KEY}:${botId}`;
    const totalKey = `${STATS_TOTAL_MESSAGES_KEY}:${botId}`;
    
    // 取得今日日期 (YYYY-MM-DD)
    const today = new Date().toISOString().split('T')[0];
    const dailyKey = `${STATS_DAILY_KEY_PREFIX}${botId}:${today}`;
    
    // 並行執行多個 KV 操作
    const promises = [];
    
    // 1. 記錄使用者 (用 JSON array 儲存 unique user IDs)
    if (speakerId) {
      promises.push(addToSet(usersKey, String(speakerId)));
    }
    
    // 2. 記錄群組
    if (chatType === 'group' || chatType === 'supergroup') {
      promises.push(addToSet(groupsKey, String(chatId)));
    }
    
    // 3. 增加總訊息數
    promises.push(incrementCounter(totalKey));
    
    // 4. 增加今日訊息數
    promises.push(incrementCounter(dailyKey, 86400)); // 24小時後過期
    
    await Promise.all(promises);
  } catch (e) {
    // 統計失敗不影響主要功能
    console.error('Stats recording error:', e);
  }
}

/**
 * 取得統計資料
 * @param {string} botId - Bot ID
 * @returns {Object} 統計資料
 */
export async function getStats(botId) {
  try {
    const usersKey = `${STATS_USERS_KEY}:${botId}`;
    const groupsKey = `${STATS_GROUPS_KEY}:${botId}`;
    const totalKey = `${STATS_TOTAL_MESSAGES_KEY}:${botId}`;
    
    const today = new Date().toISOString().split('T')[0];
    const dailyKey = `${STATS_DAILY_KEY_PREFIX}${botId}:${today}`;
    
    // 並行取得所有統計資料
    const [usersData, groupsData, totalMessages, todayMessages] = await Promise.all([
      DATABASE.get(usersKey),
      DATABASE.get(groupsKey),
      DATABASE.get(totalKey),
      DATABASE.get(dailyKey)
    ]);
    
    // 解析 Set 資料
    const users = usersData ? JSON.parse(usersData) : [];
    const groups = groupsData ? JSON.parse(groupsData) : [];
    
    return {
      totalUsers: users.length,
      totalGroups: groups.length,
      totalMessages: parseInt(totalMessages) || 0,
      todayMessages: parseInt(todayMessages) || 0
    };
  } catch (e) {
    console.error('Stats retrieval error:', e);
    return {
      totalUsers: 0,
      totalGroups: 0,
      totalMessages: 0,
      todayMessages: 0,
      error: e.message
    };
  }
}

/**
 * 新增元素到 Set（使用 JSON array 模擬）
 * @param {string} key - KV key
 * @param {string} value - 要新增的值
 */
async function addToSet(key, value) {
  try {
    const existing = await DATABASE.get(key);
    let set = existing ? JSON.parse(existing) : [];
    
    // 檢查是否已存在
    if (!set.includes(value)) {
      set.push(value);
      await DATABASE.put(key, JSON.stringify(set));
    }
  } catch (e) {
    // 如果解析失敗，重新初始化
    await DATABASE.put(key, JSON.stringify([value]));
  }
}

/**
 * 增加計數器
 * @param {string} key - KV key
 * @param {number} ttl - 過期時間（秒），可選
 */
async function incrementCounter(key, ttl = null) {
  try {
    const existing = await DATABASE.get(key);
    const count = (parseInt(existing) || 0) + 1;
    
    const options = ttl ? { expirationTtl: ttl } : {};
    await DATABASE.put(key, String(count), options);
  } catch (e) {
    const options = ttl ? { expirationTtl: ttl } : {};
    await DATABASE.put(key, '1', options);
  }
}
