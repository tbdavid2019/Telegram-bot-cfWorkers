/**
 * Unified chat model profile resolution.
 * A selected profile owns the provider, model, endpoint and provider options.
 */

export function getAllLLMProfiles(context) {
  return context?.USER_CONFIG?.LLM_PROFILES || {};
}

export function resolveLLMProfileName(context, requestedName) {
  if (!requestedName) return '';
  const profiles = getAllLLMProfiles(context);
  const names = Object.keys(profiles);
  const lowerReq = String(requestedName).trim().toLowerCase();

  // 1. Direct match on profile key (case-insensitive)
  const directMatch = names.find((name) => name.toLowerCase() === lowerReq);
  if (directMatch) return directMatch;

  // 2. Match on profile.aliases
  for (const name of names) {
    const profile = profiles[name];
    if (Array.isArray(profile?.aliases) && profile.aliases.some((a) => String(a).trim().toLowerCase() === lowerReq)) {
      return name;
    }
  }

  return '';
}

export function getCurrentProfileName(context) {
  const profiles = getAllLLMProfiles(context);
  // 1. 如果使用者有手動切換過 CURRENT_LLM_PROFILE，且該 profile 存在於目前的 profiles 中
  const userProfile = resolveLLMProfileName(context, context?.USER_CONFIG?.CURRENT_LLM_PROFILE);
  if (userProfile && profiles[userProfile]) {
    return userProfile;
  }

  // 2. 否則一律使用環境變數設定的 DEFAULT_LLM_PROFILE
  const defaultProfile = resolveLLMProfileName(context, context?.env?.DEFAULT_LLM_PROFILE)
    || resolveLLMProfileName(context, context?.USER_CONFIG?.DEFAULT_LLM_PROFILE);
  if (defaultProfile && profiles[defaultProfile]) {
    return defaultProfile;
  }

  // 3. 預設主力為 gemini
  if (profiles.gemini) {
    return 'gemini';
  }

  return Object.keys(profiles)[0] || '';
}

export function getActiveLLMProfile(context) {
  const name = getCurrentProfileName(context);
  return name ? getAllLLMProfiles(context)[name] : null;
}

export function getProfileProvider(profile) {
  const provider = String(profile?.provider || 'openai').toLowerCase();
  if (provider === 'workers-ai') return 'workers';
  if (provider === 'openai-compatible') return 'openai';
  return provider;
}
