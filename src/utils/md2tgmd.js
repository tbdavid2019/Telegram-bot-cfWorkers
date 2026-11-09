/**
 * Markdown 轉 Telegram HTML 格式
 * 支援 CommonMark 標題、粗體、斜體、刪除線、引用、清單、程式碼區塊及超連結
 * 自動轉義 HTML 特殊字元並確保所有標籤完整閉合，徹底解決實體解析失敗導致的純文字降級問題
 */

/**
 * 補齊 Telegram 支援之未閉合 HTML 標籤
 * @param {string} html 
 * @returns {string}
 */
export function balanceTelegramHtmlTags(html) {
  if (!html || typeof html !== "string") return "";

  const tagRegex = /<\/?([a-zA-Z0-9_-]+)(?:\s+[^>]*)?>/g;
  const stack = [];
  const validTags = new Set([
    "b", "strong", "i", "em", "u", "ins", "s", "strike", "del",
    "span", "tg-spoiler", "a", "code", "pre", "blockquote"
  ]);

  let match;
  while ((match = tagRegex.exec(html)) !== null) {
    const fullTag = match[0];
    const tagName = match[1].toLowerCase();
    const isClosing = fullTag.startsWith("</");

    if (!validTags.has(tagName)) continue;

    if (isClosing) {
      const lastIndex = stack.lastIndexOf(tagName);
      if (lastIndex !== -1) {
        stack.splice(lastIndex, 1);
      }
    } else {
      stack.push(tagName);
    }
  }

  let balanced = html;
  while (stack.length > 0) {
    const tag = stack.pop();
    balanced += `</${tag}>`;
  }
  return balanced;
}

/**
 * 將標準 Markdown (含 LLM 常用輸出格式) 轉換為 Telegram HTML 格式
 * @param {string} markdown 
 * @returns {string}
 */
export function markdownToTelegramHtml(markdown) {
  if (markdown === undefined || markdown === null) return "";
  if (typeof markdown !== "string") markdown = String(markdown);
  if (!markdown.trim()) return markdown;

  // 1. 保留多行 Code Blocks (```lang ... ```)
  const codeBlocks = [];
  let text = markdown.replace(/```([a-zA-Z0-9_-]*)\n?([\s\S]*?)```/g, (match, lang, code) => {
    const placeholder = `\x00CB${codeBlocks.length}\x00`;
    const escapedCode = code
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    const langAttr = lang ? ` class="language-${lang}"` : "";
    codeBlocks.push(`<pre><code${langAttr}>${escapedCode}</code></pre>`);
    return placeholder;
  });

  // 2. 保留行內 Code (`...`)
  const inlineCodes = [];
  text = text.replace(/`([^`\n]+)`/g, (match, code) => {
    const placeholder = `\x00IC${inlineCodes.length}\x00`;
    const escapedCode = code
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    inlineCodes.push(`<code>${escapedCode}</code>`);
    return placeholder;
  });

  // 3. 轉義普通文本中的 HTML 保留字元 (&, <, >)
  text = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // 4. 處理 Markdown 標題 (# Title -> <b>Title</b>)
  text = text.replace(/^#{1,6}\s+(.+)$/gm, "<b>$1</b>");

  // 5. 處理引用 (> quote -> <blockquote>quote</blockquote>)
  text = text.replace(/^(?:&gt;|>)\s*(.+)$/gm, "<blockquote>$1</blockquote>");

  // 6. 處理清單符號：行首的 * 或 - 或 + 後接空格，轉為圓點符號 • 避免干擾粗體語法
  text = text.replace(/^(\s*)[*+-]\s+/gm, "$1• ");

  // 7. 處理雙星號/雙底線粗體 **text** 或 __text__（支援結尾有空格的容錯，如 **標題: **）
  text = text.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
  text = text.replace(/__(.+?)__/g, "<b>$1</b>");

  // 8. 處理單星號粗體 *text*（確保邊界非字元與非空格，避免誤傷乘號或單獨星號）
  text = text.replace(/(?<![a-zA-Z0-9_\u4e00-\u9fa5\*])\*([^\*\n\s](?:[^\*\n]*?[^\*\n\s])?)\*(?![a-zA-Z0-9_\u4e00-\u9fa5\*])/g, "<b>$1</b>");

  // 9. 處理斜體 _text_（確保邊界非字元與非底線，避免誤傷 variable_name 與 user_config）
  text = text.replace(/(?<![a-zA-Z0-9_\u4e00-\u9fa5])_([^_\n\s](?:[^_\n]*?[^_\n\s])?)_(?![a-zA-Z0-9_\u4e00-\u9fa5])/g, "<i>$1</i>");

  // 10. 處理刪除線 ~~text~~ 或 ~text~
  text = text.replace(/~~(.+?)~~/g, "<s>$1</s>");
  text = text.replace(/(?<![a-zA-Z0-9_~])~([^~\n\s](?:[^~\n]*?[^~\n\s])?)~(?![a-zA-Z0-9_~])/g, "<s>$1</s>");

  // 11. 處理超連結 [text](url)
  text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/g, "<a href=\"$2\">$1</a>");

  // 12. 還原行內 code 與 code blocks
  text = text.replace(/\x00IC(\d+)\x00/g, (match, index) => inlineCodes[Number(index)] || "");
  text = text.replace(/\x00CB(\d+)\x00/g, (match, index) => codeBlocks[Number(index)] || "");

  // 13. 自動補齊未閉合標籤
  return balanceTelegramHtmlTags(text);
}

/**
 * 相容既有 import 介面
 */
export function escape(text) {
  return markdownToTelegramHtml(text);
}
