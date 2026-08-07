/**
 * Unified chat model profile resolution.
 * A selected profile owns the provider, model, endpoint and provider options.
 */

export function getAllLLMProfiles(context) {
  return context?.USER_CONFIG?.LLM_PROFILES || {};
}

export function resolveLLMProfileName(context, requestedName) {
  if (!requestedName) return '';
  const names = Object.keys(getAllLLMProfiles(context));
  return names.find((name) => name.toLowerCase() === String(requestedName).toLowerCase()) || '';
}

export function getCurrentProfileName(context) {
  return resolveLLMProfileName(context, context?.USER_CONFIG?.CURRENT_LLM_PROFILE)
    || resolveLLMProfileName(context, context?.USER_CONFIG?.DEFAULT_LLM_PROFILE);
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
