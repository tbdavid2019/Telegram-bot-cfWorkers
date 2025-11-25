/**
 * HTTP Request 處理
 * 用於發送請求到各種 AI API
 */

import { ENV } from '../config/env.js';
import { Stream } from './stream.js';

export function fixOpenAICompatibleOptions(options) {
  options = options || {};
  options.streamBuilder = options.streamBuilder || function(r, c) {
    return new Stream(r, c);
  };
  options.contentExtractor = options.contentExtractor || function(d) {
    return d?.choices?.[0]?.delta?.content;
  };
  options.fullContentExtractor = options.fullContentExtractor || function(d) {
    return d.choices?.[0]?.message.content;
  };
  options.errorExtractor = options.errorExtractor || function(d) {
    return d.error?.message;
  };
  return options;
}

export function isJsonResponse(resp) {
  return resp.headers.get("content-type").indexOf("json") !== -1;
}

export function isEventStreamResponse(resp) {
  const types = ["application/stream+json", "text/event-stream"];
  const content = resp.headers.get("content-type");
  for (const type of types) {
    if (content.indexOf(type) !== -1) {
      return true;
    }
  }
  return false;
}

export async function requestChatCompletions(url, header, body, context, onStream, onResult = null, options = null) {
  const controller = new AbortController();
  const { signal } = controller;
  let timeoutID = null;
  let lastUpdateTime = Date.now();
  
  if (ENV.CHAT_COMPLETE_API_TIMEOUT > 0) {
    timeoutID = setTimeout(() => controller.abort(), ENV.CHAT_COMPLETE_API_TIMEOUT);
  }
  
  const resp = await fetch(url, {
    method: "POST",
    headers: header,
    body: JSON.stringify(body),
    signal
  });
  
  if (timeoutID) {
    clearTimeout(timeoutID);
  }
  
  options = fixOpenAICompatibleOptions(options);
  
  if (onStream && resp.ok && isEventStreamResponse(resp)) {
    const stream = options.streamBuilder(resp, controller);
    let contentFull = "";
    let lengthDelta = 0;
    let updateStep = 50;
    
    try {
      for await (const data of stream) {
        const c = options.contentExtractor(data) || "";
        if (c === "") {
          continue;
        }
        lengthDelta += c.length;
        contentFull = contentFull + c;
        
        if (lengthDelta > updateStep) {
          if (ENV.TELEGRAM_MIN_STREAM_INTERVAL > 0) {
            const delta = Date.now() - lastUpdateTime;
            if (delta < ENV.TELEGRAM_MIN_STREAM_INTERVAL) {
              continue;
            }
            lastUpdateTime = Date.now();
          }
          lengthDelta = 0;
          updateStep += 20;
          await onStream(`${contentFull}\n...`);
        }
      }
    } catch (e) {
      contentFull += `\nERROR: ${e.message}`;
    }
    
    return contentFull;
  }
  
  if (!isJsonResponse(resp)) {
    throw new Error(resp.statusText);
  }
  
  const result = await resp.json();
  if (!result) {
    throw new Error("Empty response");
  }
  
  if (options.errorExtractor(result)) {
    throw new Error(options.errorExtractor(result));
  }
  
  try {
    await onResult?.(result);
    return options.fullContentExtractor(result);
  } catch (e) {
    console.error(e);
    throw Error(JSON.stringify(result));
  }
}
