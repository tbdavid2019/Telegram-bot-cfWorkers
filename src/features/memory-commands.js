import { ENV } from '../config/env.js';
import { getCombinedMemory, clearUserMemory, getGlobalMemory } from './memory.js';

export async function commandViewMemory(message, command, subcommand, context) {
  if (!ENV.USER_CONFIG.ENABLE_LONG_TERM_MEMORY) {
    return '⚠️ 長期記憶功能未開啟。\n\n請在 wrangler.toml 設定 `ENABLE_LONG_TERM_MEMORY = "true"` 啟用。';
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

export async function commandClearMemory(message, command, subcommand, context) {
  if (!ENV.USER_CONFIG.ENABLE_LONG_TERM_MEMORY) {
    return '⚠️ 長期記憶功能未開啟。';
  }

  try {
    const userId = context.SHARE_CONTEXT.chatHistoryKey.split(':').pop();
    const success = await clearUserMemory(userId);
    
    if (success) {
      return '✅ 您的個人記憶已清除。\n\n全域知識庫保持不變。';
    } else {
      return '❌ 清除記憶失敗，請稍後再試。';
    }
  } catch (error) {
    console.error('[Memory] Clear memory error:', error);
    return '❌ 清除記憶時發生錯誤。';
  }
}

export async function commandViewGlobalMemory(message, command, subcommand, context) {
  if (!ENV.USER_CONFIG.ENABLE_LONG_TERM_MEMORY) {
    return '⚠️ 長期記憶功能未開啟。';
  }

  try {
    const globalMem = await getGlobalMemory();
    return `🌍 **全域知識庫**\n\n${globalMem}\n\n_（需要管理員權限才能編輯）_`;
  } catch (error) {
    console.error('[Memory] View global memory error:', error);
    return '❌ 讀取全域記憶時發生錯誤。';
  }
}
