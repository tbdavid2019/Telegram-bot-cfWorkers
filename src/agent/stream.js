/**
 * SSE (Server-Sent Events) Stream 處理
 * 用於處理 AI API 的串流回應
 */

export class Stream {
  constructor(response, controller, decoder = null, parser = null) {
    this.response = response;
    this.controller = controller;
    this.decoder = decoder || new SSEDecoder();
    this.parser = parser || openaiSseJsonParser;
  }

  async *iterMessages() {
    if (!this.response.body) {
      this.controller.abort();
      throw new Error("Attempted to iterate over a response with no body");
    }
    
    const lineDecoder = new LineDecoder();
    const iter = this.response.body;
    
    for await (const chunk of iter) {
      for (const line of lineDecoder.decode(chunk)) {
        const sse = this.decoder.decode(line);
        if (sse) {
          yield sse;
        }
      }
    }
    
    for (const line of lineDecoder.flush()) {
      const sse = this.decoder.decode(line);
      if (sse) {
        yield sse;
      }
    }
  }

  async *[Symbol.asyncIterator]() {
    let done = false;
    try {
      for await (const sse of this.iterMessages()) {
        if (done) continue;
        if (!sse) continue;
        
        const { finish, data } = this.parser(sse);
        if (finish) {
          done = finish;
          continue;
        }
        if (data) {
          yield data;
        }
      }
      done = true;
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        return;
      }
      throw e;
    } finally {
      if (!done) {
        this.controller.abort();
      }
    }
  }
}

export class SSEDecoder {
  constructor() {
    this.event = null;
    this.data = [];
    this.chunks = [];
  }

  decode(line) {
    if (line.endsWith("\r")) {
      line = line.substring(0, line.length - 1);
    }
    
    if (!line) {
      if (!this.event && !this.data.length) {
        return null;
      }
      const sse = {
        event: this.event,
        data: this.data.join("\n")
      };
      this.event = null;
      this.data = [];
      this.chunks = [];
      return sse;
    }
    
    this.chunks.push(line);
    if (line.startsWith(":")) {
      return null;
    }
    
    let [fieldName, _, value] = this.partition(line, ":");
    if (value.startsWith(" ")) {
      value = value.substring(1);
    }
    
    if (fieldName === "event") {
      this.event = value;
    } else if (fieldName === "data") {
      this.data.push(value);
    }
    
    return null;
  }

  partition(str, delimiter) {
    const index = str.indexOf(delimiter);
    if (index !== -1) {
      return [str.substring(0, index), delimiter, str.substring(index + delimiter.length)];
    }
    return [str, "", ""];
  }
}

export function openaiSseJsonParser(sse) {
  if (sse.data.startsWith("[DONE]")) {
    return { finish: true };
  }
  if (sse.event === null) {
    try {
      return { data: JSON.parse(sse.data) };
    } catch (e) {
      console.error(e, sse);
    }
  }
  return {};
}

export function cohereSseJsonParser(sse) {
  switch (sse.event) {
    case "text-generation":
      try {
        return { data: JSON.parse(sse.data) };
      } catch (e) {
        console.error(e, sse.data);
        return {};
      }
    case "stream-start":
      return {};
    case "stream-end":
      return { finish: true };
    default:
      return {};
  }
}

export function anthropicSseJsonParser(sse) {
  switch (sse.event) {
    case "content_block_delta":
      try {
        return { data: JSON.parse(sse.data) };
      } catch (e) {
        console.error(e, sse.data);
        return {};
      }
    case "message_start":
    case "content_block_start":
    case "content_block_stop":
      return {};
    case "message_stop":
      return { finish: true };
    default:
      return {};
  }
}

export class LineDecoder {
  constructor() {
    this.buffer = [];
    this.trailingCR = false;
  }

  static NEWLINE_CHARS = new Set(["\n", "\r"]);
  static NEWLINE_REGEXP = /\r\n|[\n\r]/g;

  decode(chunk) {
    let text = this.decodeText(chunk);
    
    if (this.trailingCR) {
      text = "\r" + text;
      this.trailingCR = false;
    }
    
    if (text.endsWith("\r")) {
      this.trailingCR = true;
      text = text.slice(0, -1);
    }
    
    if (!text) {
      return [];
    }
    
    const trailingNewline = LineDecoder.NEWLINE_CHARS.has(text[text.length - 1] || "");
    let lines = text.split(LineDecoder.NEWLINE_REGEXP);
    
    if (lines.length === 1 && !trailingNewline) {
      this.buffer.push(lines[0]);
      return [];
    }
    
    if (this.buffer.length > 0) {
      lines = [this.buffer.join("") + lines[0], ...lines.slice(1)];
      this.buffer = [];
    }
    
    if (!trailingNewline) {
      this.buffer = [lines.pop() || ""];
    }
    
    return lines;
  }

  decodeText(bytes) {
    if (bytes == null) {
      return "";
    }
    if (typeof bytes === "string") {
      return bytes;
    }
    
    if (typeof Buffer !== "undefined") {
      if (bytes instanceof Buffer) {
        return bytes.toString();
      }
      if (bytes instanceof Uint8Array) {
        return Buffer.from(bytes).toString();
      }
      throw new Error(`Unexpected: received non-Uint8Array (${bytes.constructor.name}) stream chunk in an environment with a global "Buffer" defined, which this library assumes to be Node. Please report this error.`);
    }
    
    if (typeof TextDecoder !== "undefined") {
      if (bytes instanceof Uint8Array || bytes instanceof ArrayBuffer) {
        this.textDecoder ??= new TextDecoder("utf8");
        return this.textDecoder.decode(bytes, { stream: true });
      }
      throw new Error(`Unexpected: received non-Uint8Array/ArrayBuffer (${bytes.constructor.name}) in a web platform. Please report this error.`);
    }
    
    throw new Error("Unexpected: neither Buffer nor TextDecoder are available as globals. Please report this error.");
  }

  flush() {
    if (!this.buffer.length && !this.trailingCR) {
      return [];
    }
    
    const lines = [this.buffer.join("")];
    this.buffer = [];
    this.trailingCR = false;
    return lines;
  }
}
