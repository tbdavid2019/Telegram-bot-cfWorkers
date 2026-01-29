# 開發注意事項 (Development Notes)

> ⚠️ **重要**：此文件記錄專案中容易踩到的坑和需要特別注意的設計模式，請在開發前詳細閱讀！

---

## 📌 目錄

- [Cloudflare Workers 環境變數與 Bindings](#cloudflare-workers-環境變數與-bindings)
  - [KV/R2/D1 Binding 的正確使用方式](#kvr2d1-binding-的正確使用方式)
  - [常見錯誤：Binding 未傳遞](#常見錯誤binding-未傳遞)
- [模組化架構注意事項](#模組化架構注意事項)
- [記憶體功能設計模式](#記憶體功能設計模式)

---

## Cloudflare Workers 環境變數與 Bindings

### KV/R2/D1 Binding 的正確使用方式

#### 問題背景

在 Cloudflare Workers 中，KV、R2、D1 等資源是透過 **binding** 的方式注入到 `env` 物件中，而不是環境變數。

**錯誤的理解**：
```javascript
// ❌ 錯誤：以為可以從 ENV.USER_CONFIG 直接取得
const bucket = ENV.USER_CONFIG.MEMORY_BUCKET;  // undefined!
```

**正確的理解**：
```javascript
// ✅ 正確：Binding 存在於 Cloudflare Workers 傳入的 env 物件中
async fetch(request, env, ctx) {
  const bucket = env.MEMORY_BUCKET;  // ✅ 這才是正確的
}
```

---

### 常見錯誤：Binding 未傳遞

#### 錯誤案例 (2026-01-29)

**症狀**：
```
[Memory] R2 read error: TypeError: Cannot read properties of null (reading 'MEMORY_BUCKET')
```

**根本原因**：

1. **Cloudflare Workers 入口** (`src/index.js`)：
   ```javascript
   async fetch(request, env, ctx) {
     initEnv(env, i18n);  // env 包含所有 bindings (KV, R2, D1...)
     return await handleRequest(request);
   }
   ```

2. **initEnv() 只保存了部分 binding** (`src/config/env.js`)：
   ```javascript
   // ❌ 舊版：只保存了 DATABASE 和 API_GUARD
   export function initEnv(env, i18n) {
     DATABASE = env.DATABASE;      // ✅ 有保存
     API_GUARD = env.API_GUARD;    // ✅ 有保存
     // ❌ 問題：env.MEMORY_BUCKET 沒有被保存！
   }
   ```

3. **Memory 模組期望接收 env 物件** (`src/features/memory.js`)：
   ```javascript
   async function getFromR2(path, env) {
     if (!env.MEMORY_BUCKET) {  // ❌ env 是 null 或 undefined
       return null;
     }
     await env.MEMORY_BUCKET.get(path);
   }
   ```

4. **調用時沒有傳遞 env**：
   ```javascript
   // ❌ 沒有傳 env 參數
   const memory = await getCombinedMemory(userId);
   ```

#### 解決方案

**Step 1: 在 `src/config/env.js` 中保存完整的 env 物件**

```javascript
// src/config/env.js
export let DATABASE = null;
export let API_GUARD = null;
export let WORKER_ENV = null;  // ← 新增：保存完整的 env 物件

export function initEnv(env, i18n) {
  DATABASE = env.DATABASE;
  API_GUARD = env.API_GUARD;
  WORKER_ENV = env;  // ← 保存整個 env 物件（包含所有 bindings）
  // ...
}
```

**Step 2: 在功能模組中使用 WORKER_ENV 作為預設值**

```javascript
// src/features/memory.js
import { ENV, DATABASE, WORKER_ENV } from '../config/env.js';

// ✅ 使用 WORKER_ENV 作為預設值
async function getFromR2(path, env = WORKER_ENV) {
  if (!env || !env.MEMORY_BUCKET) {
    console.error('[Memory] R2 bucket not bound');
    return null;
  }
  const obj = await env.MEMORY_BUCKET.get(path);
  return await obj.text();
}

// ✅ 調用時自動使用 WORKER_ENV
export async function getGlobalMemory(env = null) {
  const mode = ENV.USER_CONFIG.MEMORY_STORAGE_MODE || 'kv';
  
  if (mode === 'r2') {
    // 如果沒有傳 env，會自動使用 WORKER_ENV
    return await getFromR2('memory/global.md', env);
  }
  // ...
}
```

**Step 3: wrangler.toml 中的 Binding 設定**

```toml
[env.chatgpt]
name = "tgbotchatgpt"

[env.chatgpt.vars]
ENABLE_LONG_TERM_MEMORY = "true"
MEMORY_STORAGE_MODE = "r2"

# ✅ KV Binding
[[env.chatgpt.kv_namespaces]]
binding = "DATABASE"
id = "60092cb2a75f48ebb98159373de89a09"

# ✅ R2 Binding
[[env.chatgpt.r2_buckets]]
binding = "MEMORY_BUCKET"
bucket_name = "telegram-bot-memories"
```

---

### 設計原則

#### ✅ DO（推薦做法）

1. **保存完整的 env 物件**：
   ```javascript
   export let WORKER_ENV = null;
   
   export function initEnv(env, i18n) {
     WORKER_ENV = env;  // 保存完整的 env
   }
   ```

2. **使用預設參數傳遞 env**：
   ```javascript
   async function myFunction(userId, env = WORKER_ENV) {
     if (!env || !env.MY_BINDING) {
       console.error('Binding not found');
       return null;
     }
     // 使用 env.MY_BINDING
   }
   ```

3. **加強 null 檢查**：
   ```javascript
   if (!env || !env.MEMORY_BUCKET) {
     console.error('[Memory] R2 bucket not bound');
     return null;
   }
   ```

4. **在 wrangler.toml 中明確設定 binding**：
   ```toml
   [[env.xxx.r2_buckets]]
   binding = "MEMORY_BUCKET"
   bucket_name = "telegram-bot-memories"
   ```

#### ❌ DON'T（避免的做法）

1. **不要假設 binding 可以從 ENV.USER_CONFIG 取得**：
   ```javascript
   // ❌ 錯誤
   const bucket = ENV.USER_CONFIG.MEMORY_BUCKET;  // undefined!
   ```

2. **不要直接使用 null 的 env**：
   ```javascript
   // ❌ 錯誤：沒有檢查 env 是否存在
   async function getFromR2(path, env) {
     await env.MEMORY_BUCKET.get(path);  // 如果 env 是 null 會報錯
   }
   ```

3. **不要忘記在 initEnv 中保存 binding**：
   ```javascript
   // ❌ 錯誤：新增的 binding 沒有被保存
   export function initEnv(env, i18n) {
     DATABASE = env.DATABASE;
     // 忘記保存 WORKER_ENV = env;
   }
   ```

---

## 模組化架構注意事項

### 環境變數的引用方式

本專案使用 `UserConfig` 類來管理用戶可配置的環境變數。

**正確的引用方式**：

```javascript
// ✅ 正確
import { ENV } from '../config/env.js';
const apiKey = ENV.USER_CONFIG.MY_API_KEY;

// ❌ 錯誤
import { ENV } from '../config/env.js';
const apiKey = ENV.MY_API_KEY;  // undefined!
```

### 新增環境變數的步驟

1. **在 `UserConfig` 類中定義屬性** (`src/config/env.js`)：
   ```javascript
   export class UserConfig {
     MY_API_KEY = null;
     MY_SETTING = false;
   }
   ```

2. **在 `ENV_TYPES` 中定義類型** (`src/config/env.js`)：
   ```javascript
   const ENV_TYPES = {
     MY_API_KEY: "string",
     MY_SETTING: "boolean"
   };
   ```

3. **在程式碼中使用 `ENV.USER_CONFIG`**：
   ```javascript
   const config = {
     apiKey: ENV.USER_CONFIG.MY_API_KEY,
     enabled: ENV.USER_CONFIG.MY_SETTING
   };
   ```

4. **在 `wrangler.toml` 中設定值**：
   ```toml
   [env.your_env.vars]
   MY_API_KEY = "your-key"
   MY_SETTING = "true"
   ```

---

## 記憶體功能設計模式

### 雙儲存模式 (KV vs R2)

記憶體功能支援兩種儲存模式：

#### KV 模式（預設，免費）

- **優點**：完全免費，不需要綁信用卡
- **儲存位置**：現有的 KV namespace
- **Key 格式**：
  - `memory:global` → 全域知識庫
  - `memory:user:650289664` → 用戶記憶

**設定**：
```toml
[env.xxx.vars]
ENABLE_LONG_TERM_MEMORY = "true"
MEMORY_STORAGE_MODE = "kv"
MEMORY_AUTO_SAVE = "true"

[[env.xxx.kv_namespaces]]
binding = "DATABASE"
id = "your-kv-namespace-id"
```

#### R2 模式（需綁信用卡）

- **優點**：檔案格式，方便手動編輯
- **儲存位置**：獨立的 R2 bucket
- **檔案路徑**：
  - `memory/global.md` → 全域知識庫
  - `memory/user_650289664.md` → 用戶記憶

**設定**：
```toml
[env.xxx.vars]
ENABLE_LONG_TERM_MEMORY = "true"
MEMORY_STORAGE_MODE = "r2"
MEMORY_AUTO_SAVE = "true"

[[env.xxx.kv_namespaces]]
binding = "DATABASE"
id = "your-kv-namespace-id"

[[env.xxx.r2_buckets]]
binding = "MEMORY_BUCKET"
bucket_name = "telegram-bot-memories"
```

### 記憶體函數的調用模式

```javascript
// ✅ 推薦：使用預設參數，自動使用 WORKER_ENV
const memory = await getCombinedMemory(userId);

// ✅ 也可以：手動傳遞 env（用於測試或特殊情況）
const memory = await getCombinedMemory(userId, customEnv);
```

---

## 除錯技巧

### 檢查 Binding 是否正確綁定

1. **查看 wrangler.toml**：
   ```toml
   [[env.xxx.r2_buckets]]
   binding = "MEMORY_BUCKET"  # 檢查 binding 名稱
   bucket_name = "telegram-bot-memories"  # 檢查 bucket 名稱
   ```

2. **在程式碼中加入 debug log**：
   ```javascript
   export function initEnv(env, i18n) {
     console.log('[Debug] env keys:', Object.keys(env));
     console.log('[Debug] MEMORY_BUCKET exists:', !!env.MEMORY_BUCKET);
     WORKER_ENV = env;
   }
   ```

3. **檢查 Cloudflare Dashboard**：
   - 確認 R2 bucket 已建立
   - 確認 bucket 名稱與 wrangler.toml 一致

4. **使用 wrangler tail 查看日誌**：
   ```bash
   npx wrangler tail --env chatgpt
   ```

---

## 常見問題 FAQ

### Q1: 為什麼我的 R2 binding 讀取失敗？

**A**: 檢查以下幾點：
1. ✅ `wrangler.toml` 中是否正確設定 `[[env.xxx.r2_buckets]]`
2. ✅ `initEnv()` 中是否有 `WORKER_ENV = env;`
3. ✅ 函數中是否使用 `env = WORKER_ENV` 作為預設參數
4. ✅ Cloudflare Dashboard 中 R2 bucket 是否已建立

### Q2: KV 和 R2 可以共用嗎？

**A**: 可以。兩個 bot 可以共用同一個 R2 bucket，因為每個用戶的記憶檔案是用 `user_` 前綴區分的。

### Q3: 如何在本地測試 R2 功能？

**A**: 
```bash
npx wrangler dev --env chatgpt --remote
```
使用 `--remote` 參數可以連接到真實的 R2 bucket。

### Q4: 新增其他 binding (如 D1) 需要注意什麼？

**A**: 
1. 在 `wrangler.toml` 中設定 binding
2. 在 `src/config/env.js` 中不需要額外處理（因為已經保存了 `WORKER_ENV`）
3. 在使用的模組中使用 `WORKER_ENV.YOUR_BINDING`

---

## 更新記錄

- **2026-01-29 (20:00)**: 補充指令處理器函數簽名規範
- **2026-01-29 (19:00)**: 初始版本，記錄 R2 binding 傳遞問題

---

## 指令處理器函數簽名規範

### 問題背景 (2026-01-29)

**症狀**：
```
[Memory] View memory error: TypeError: Cannot read properties of undefined (reading 'chatHistoryKey')
```

**根本原因**：

指令處理器的函數簽名不一致。系統調用時傳入 4 個參數，但函數只定義了 2 個參數。

#### 錯誤案例

```javascript
// ❌ 錯誤：只有 2 個參數
export async function commandViewMemory(message, context) {
  const userId = context.SHARE_CONTEXT.chatHistoryKey.split(':').pop();
  // context 是 undefined！因為實際上接收到的是 command 參數
}
```

**實際調用**（來自 `src/telegram/commands.js:417`）：
```javascript
return await handler.fn(message, command, subcommand, context);
//                        ^^^^^^  ^^^^^^^  ^^^^^^^^^^  ^^^^^^^
//                        第1個   第2個    第3個        第4個
```

所以：
- `message` → message ✅
- `command` → context ❌（函數以為這是 context，其實是 command）
- `subcommand` → 沒接收到
- `context` → 沒接收到

#### 正確做法

**所有指令處理器必須使用統一的函數簽名**：

```javascript
// ✅ 正確：4 個參數（即使不使用也要定義）
export async function commandViewMemory(message, command, subcommand, context) {
  const userId = context.SHARE_CONTEXT.chatHistoryKey.split(':').pop();
  // 現在 context 才是真正的 context！
}
```

### 強制規範

#### ✅ 所有指令處理器的標準簽名

```javascript
export async function commandXXX(message, command, subcommand, context) {
  // message: Telegram 訊息物件
  // command: 指令名稱（如 "/memory"）
  // subcommand: 子指令參數（指令後的文字）
  // context: 上下文物件（包含 SHARE_CONTEXT、USER_CONFIG 等）
  
  // 即使不使用某些參數，也必須在函數簽名中定義
}
```

#### ❌ 錯誤的做法

```javascript
// ❌ 參數數量不對
export async function commandXXX(message, context) { }

// ❌ 參數順序不對
export async function commandXXX(context, message, command) { }

// ❌ 使用不同的參數名（雖然技術上可以，但不推薦）
export async function commandXXX(msg, cmd, sub, ctx) { }
```

### 檢查清單

新增指令處理器時，請確認：

1. ✅ 函數簽名是否為 `(message, command, subcommand, context)`
2. ✅ 即使不使用 `command` 或 `subcommand`，是否仍然定義了這些參數
3. ✅ 是否在 `src/telegram/commands.js` 的 `commandHandlers` 中註冊
4. ✅ 是否在 `commandSortList` 中加入（如果要顯示在選單）
5. ✅ 測試時是否能正確接收到 `context.SHARE_CONTEXT`

### 參考範例

**好的範例**（來自 `src/features/system.js`）：

```javascript
export async function commandGetHelp(message, command, subcommand, context) {
  const { sendMessageToTelegramWithContext } = await import('../telegram/telegram.js');
  // 使用 context
  return sendMessageToTelegramWithContext(context)('...');
}

export async function commandCreateNewChatContext(message, command, subcommand, context) {
  // 即使不使用 command 和 subcommand，也定義了這些參數
  await DATABASE.delete(context.SHARE_CONTEXT.chatHistoryKey);
  // ...
}
```

**修正後的範例**（`src/features/memory-commands.js`）：

```javascript
// ✅ 正確：4 個參數
export async function commandViewMemory(message, command, subcommand, context) {
  if (!ENV.USER_CONFIG.ENABLE_LONG_TERM_MEMORY) {
    return '⚠️ 長期記憶功能未開啟。';
  }

  try {
    const userId = context.SHARE_CONTEXT.chatHistoryKey.split(':').pop();
    const memory = await getCombinedMemory(userId);
    return `📚 **您的長期記憶**\n\n${memory}`;
  } catch (error) {
    console.error('[Memory] View memory error:', error);
    return '❌ 讀取記憶時發生錯誤。';
  }
}
```

---

## 更新記錄

- **2026-01-29 (20:00)**: 補充指令處理器函數簽名規範
- **2026-01-29 (19:00)**: 初始版本，記錄 R2 binding 傳遞問題
