import { getActiveLLMProfile, getProfileProvider } from './profiles.js';

/**
 * Cloudflare Workers AI chat integration.
 * Uses the native Workers AI binding exposed as env.AI.
 */

export function getWorkersAIBinding(context) {
  return context?.env?.AI || context?.AI_BINDING || null;
}

export function isWorkersAIEnable(context) {
  return typeof getWorkersAIBinding(context)?.run === 'function';
}

export function renderWorkersAIMessage(item) {
  const images = item.images || [];
  if (images.length === 0) {
    return { role: item.role, content: item.content || '' };
  }

  const content = [];
  if (item.content) {
    content.push({ type: 'text', text: item.content });
  }
  for (const image of images) {
    content.push({
      type: 'image_url',
      image_url: { url: image }
    });
  }

  return { role: item.role, content };
}

/**
 * Workers AI may return the text-generation schema, Responses API schema,
 * or OpenAI Chat Completions schema depending on the model/input format.
 */
export function extractWorkersAIText(result) {
  if (typeof result?.response === 'string' && result.response.length > 0) {
    return result.response;
  }
  if (typeof result?.output_text === 'string' && result.output_text.length > 0) {
    return result.output_text;
  }

  const responseParts = (result?.output || [])
    .flatMap((item) => item?.content || [])
    .map((part) => part?.text)
    .filter((text) => typeof text === 'string' && text.length > 0);
  if (responseParts.length > 0) {
    return responseParts.join('');
  }

  const completionParts = (result?.choices || [])
    .flatMap((choice) => {
      const content = choice?.message?.content;
      if (typeof content === 'string') return [content];
      if (Array.isArray(content)) return content.map((part) => part?.text);
      return [];
    })
    .filter((text) => typeof text === 'string' && text.length > 0);
  return completionParts.join('');
}

export async function requestCompletionsFromWorkersAI(params, context, onStream) {
  const ai = getWorkersAIBinding(context);
  if (!ai) {
    throw new Error('Workers AI binding is not available');
  }

  const profile = getActiveLLMProfile(context);
  const workersProfile = getProfileProvider(profile) === 'workers' ? profile : null;
  const model = workersProfile?.model || context.USER_CONFIG.WORKERS_CHAT_MODEL;
  if (!model) {
    throw new Error('WORKERS_CHAT_MODEL is not configured');
  }

  const { message, images, prompt, history } = params;
  const messages = [...(history || []), { role: 'user', content: message, images }];
  if (prompt) {
    messages.unshift({
      role: context.USER_CONFIG.SYSTEM_INIT_MESSAGE_ROLE || 'system',
      content: prompt
    });
  }

  const extraParams = workersProfile?.options || context.USER_CONFIG.WORKERS_AI_EXTRA_PARAMS || {};
  const result = await ai.run(model, {
    ...extraParams,
    stream: false,
    messages: messages.map(renderWorkersAIMessage)
  });

  const responseText = extractWorkersAIText(result);
  if (!responseText) {
    console.error('[Workers AI] Empty text response', {
      resultKeys: result && typeof result === 'object' ? Object.keys(result) : [],
      usage: result?.usage,
      finishReason: result?.choices?.[0]?.finish_reason
    });
    throw new Error('Workers AI returned an empty text response');
  }

  return responseText;
}
