import { ENV, DATABASE, WORKER_ENV } from '../config/env.js';

const MEMORY_GLOBAL_KEY = 'memory:global';
const MEMORY_USER_PREFIX = 'memory:user:';

const DEFAULT_GLOBAL_MEMORY = `# 全域知識庫

## 最後更新
${new Date().toISOString().split('T')[0]}

## 家庭資訊
（尚無記錄）

## 公開設定
（尚無記錄）

## 共享知識
（尚無記錄）
`;

const DEFAULT_USER_MEMORY_TEMPLATE = (userId) => `# 用戶記憶 - User ${userId}

## 最後更新
${new Date().toISOString().split('T')[0]}

## 身份與角色
（尚無記錄）

## 偏好設定
（尚無記錄）

## 興趣與習慣
（尚無記錄）

## 重要對話記錄
（尚無記錄）
`;

async function getFromKV(key) {
  try {
    const value = await DATABASE.get(key, 'text');
    return value;
  } catch (error) {
    console.error(`[Memory] KV read error for key ${key}:`, error);
    return null;
  }
}

async function setToKV(key, value) {
  try {
    await DATABASE.put(key, value);
    return true;
  } catch (error) {
    console.error(`[Memory] KV write error for key ${key}:`, error);
    return false;
  }
}

async function getFromR2(path, env) {
  try {
    const resolvedEnv = env ?? WORKER_ENV;
    if (!resolvedEnv || !resolvedEnv.MEMORY_BUCKET) {
      console.error('[Memory] R2 bucket not bound');
      return null;
    }
    const obj = await resolvedEnv.MEMORY_BUCKET.get(path);
    if (!obj) return null;
    return await obj.text();
  } catch (error) {
    console.error(`[Memory] R2 read error for path ${path}:`, error);
    return null;
  }
}

async function setToR2(path, value, env) {
  try {
    const resolvedEnv = env ?? WORKER_ENV;
    if (!resolvedEnv || !resolvedEnv.MEMORY_BUCKET) {
      console.error('[Memory] R2 bucket not bound');
      return false;
    }
    await resolvedEnv.MEMORY_BUCKET.put(path, value);
    return true;
  } catch (error) {
    console.error(`[Memory] R2 write error for path ${path}:`, error);
    return false;
  }
}

export async function getGlobalMemory(env = null) {
  if (!ENV.USER_CONFIG.ENABLE_LONG_TERM_MEMORY) {
    return '';
  }

  const mode = ENV.USER_CONFIG.MEMORY_STORAGE_MODE || 'kv';
  let content = null;

  if (mode === 'r2') {
    content = await getFromR2('memory/global.md', env);
  } else {
    content = await getFromKV(MEMORY_GLOBAL_KEY);
  }

  return content || DEFAULT_GLOBAL_MEMORY;
}

export async function getUserMemory(userId, env = null) {
  if (!ENV.USER_CONFIG.ENABLE_LONG_TERM_MEMORY) {
    return '';
  }

  const mode = ENV.USER_CONFIG.MEMORY_STORAGE_MODE || 'kv';
  let content = null;

  if (mode === 'r2') {
    content = await getFromR2(`memory/user_${userId}.md`, env);
  } else {
    content = await getFromKV(MEMORY_USER_PREFIX + userId);
  }

  return content || DEFAULT_USER_MEMORY_TEMPLATE(userId);
}

export async function saveGlobalMemory(content, env = null) {
  if (!ENV.USER_CONFIG.ENABLE_LONG_TERM_MEMORY) {
    return false;
  }

  const mode = ENV.USER_CONFIG.MEMORY_STORAGE_MODE || 'kv';

  if (mode === 'r2') {
    return await setToR2('memory/global.md', content, env);
  } else {
    return await setToKV(MEMORY_GLOBAL_KEY, content);
  }
}

export async function saveUserMemory(userId, content, env = null) {
  if (!ENV.USER_CONFIG.ENABLE_LONG_TERM_MEMORY) {
    return false;
  }

  const mode = ENV.USER_CONFIG.MEMORY_STORAGE_MODE || 'kv';

  if (mode === 'r2') {
    return await setToR2(`memory/user_${userId}.md`, content, env);
  } else {
    return await setToKV(MEMORY_USER_PREFIX + userId, content);
  }
}

export async function clearUserMemory(userId, env = null) {
  if (!ENV.USER_CONFIG.ENABLE_LONG_TERM_MEMORY) {
    return false;
  }

  const defaultContent = DEFAULT_USER_MEMORY_TEMPLATE(userId);
  return await saveUserMemory(userId, defaultContent, env);
}

export async function getCombinedMemory(userId, env = null) {
  if (!ENV.USER_CONFIG.ENABLE_LONG_TERM_MEMORY) {
    return '';
  }

  const [globalMem, userMem] = await Promise.all([
    getGlobalMemory(env),
    getUserMemory(userId, env)
  ]);

  return `## 📚 長期記憶

### 全域知識庫
${globalMem}

---

### 個人記憶
${userMem}
`;
}

export async function updateMemoryFromConversation(userId, userMessage, assistantResponse, env = null) {
  if (!ENV.USER_CONFIG.ENABLE_LONG_TERM_MEMORY || !ENV.USER_CONFIG.MEMORY_AUTO_SAVE) {
    return false;
  }

  const currentMemory = await getUserMemory(userId, env);
  const timestamp = new Date().toISOString().split('T')[0];
  
  const updateSection = `

## 對話記錄 (${timestamp})
**用戶**: ${userMessage.substring(0, 200)}${userMessage.length > 200 ? '...' : ''}
**助手**: ${assistantResponse.substring(0, 200)}${assistantResponse.length > 200 ? '...' : ''}
`;

  const updatedMemory = currentMemory + updateSection;
  
  return await saveUserMemory(userId, updatedMemory, env);
}
