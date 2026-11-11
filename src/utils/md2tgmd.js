/**
 * Markdown 轉 Telegram HTML 格式
 * 支援 CommonMark 標題、粗體、斜體、刪除線、引用、清單、程式碼區塊、超連結及 GFM 表格
 * 自動轉義 HTML 特殊字元並確保所有標籤完整閉合，徹底解決實體解析失敗導致的純文字降級問題
 */

/**
 * 轉義 HTML 特殊字元 (&, <, >)
 * @param {any} str
 * @returns {string}
 */
export function escape(str) {
  if (str === undefined || str === null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

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
 * 將單行表格文本安全拆分為單元格陣列，支援轉義管道符 \| 與頭尾邊界容錯
 * @param {string} line
 * @returns {string[]}
 */
export function splitRowCells(line) {
  if (!line || typeof line !== 'string') return [];
  let trimmed = line.trim();
  if (trimmed.startsWith('|')) {
    trimmed = trimmed.slice(1);
  }
  if (trimmed.endsWith('|') && !trimmed.endsWith('\\|')) {
    trimmed = trimmed.slice(0, -1);
  }
  // 依非轉義管道符 (?<!\\)\| 拆分
  const rawCells = trimmed.split(/(?<!\\)\|/);
  return rawCells.map((c) => c.replace(/\\\|/g, '|').trim());
}

/**
 * 解析表格對齊符號 (:---, :---:, ---:, ---)
 * @param {string} cell
 * @returns {'left'|'center'|'right'}
 */
export function parseAlignment(cell) {
  if (!cell || typeof cell !== 'string') return 'left';
  const trimmed = cell.trim();
  const leftColon = trimmed.startsWith(':');
  const rightColon = trimmed.endsWith(':');
  if (leftColon && rightColon) return 'center';
  if (rightColon) return 'right';
  if (leftColon) return 'left';
  return 'left';
}

/**
 * 判斷該行是否為 GFM 表格分隔線行 (| :--- | :---: | ---: |)
 * @param {string} line
 * @returns {boolean}
 */
export function isDelimiterRow(line) {
  if (!line || typeof line !== 'string') return false;
  const trimmed = line.trim();
  if (!trimmed.includes('|') && !trimmed.includes('-')) return false;
  const cells = splitRowCells(trimmed);
  if (cells.length === 0) return false;
  return cells.every((c) => /^:?-{1,}:?$/.test(c));
}

/**
 * 格式化單元格內容：轉義 HTML 特殊字元、支援行內程式碼與連結、清理外層重複粗體標記
 * @param {any} text
 * @returns {string}
 */
export function formatCellContent(text) {
  if (text === undefined || text === null) return '';
  let str = String(text).trim();
  // 若單元格已有 **bold** 或 __bold__，去除外層以避免重複標籤
  if ((str.startsWith('**') && str.endsWith('**') && str.length >= 4) ||
      (str.startsWith('__') && str.endsWith('__') && str.length >= 4)) {
    str = str.slice(2, -2).trim();
  }
  // 表格內換行標籤替換為空格，避免手機端破碎排版
  str = str.replace(/<br\s*\/?>/gi, ' ');
  // 轉義 HTML 特殊字元 (&, <, >)
  str = str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  // 支援單元格內的超連結 [text](url) - 並嚴格轉義 URL 屬性中的雙引號，杜絕 HTML 屬性逃逸
  str = str.replace(/\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/g, (match, label, url) => {
    const safeUrl = url.replace(/"/g, '&quot;');
    return `<a href="${safeUrl}">${label}</a>`;
  });
  // 支援單元格內的行內 code `...`
  str = str.replace(/`([^`\n]+)`/g, '<code>$1</code>');
  return str;
}

/**
 * 清理單元格文字為純文字（供 Telegram 10.3 InputRichBlockTable 原生表格使用）
 * @param {any} text
 * @returns {string}
 */
export function cleanCellPlainText(text) {
  if (text === undefined || text === null) return '';
  let str = String(text).trim();
  if ((str.startsWith('**') && str.endsWith('**') && str.length >= 4) ||
      (str.startsWith('__') && str.endsWith('__') && str.length >= 4)) {
    str = str.slice(2, -2).trim();
  }
  str = str.replace(/<br\s*\/?>/gi, ' ');
  str = str.replace(/`([^`\n]+)`/g, '$1');
  str = str.replace(/\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/g, '$1');
  return str.trim();
}

/**
 * 提取表格前緊鄰的 Caption 標題
 * @param {string} line
 * @returns {string|null}
 */
function extractTableCaption(line) {
  if (!line || typeof line !== 'string') return null;
  const trimmed = line.trim();
  const m = trimmed.match(/^\[?(?:Table|表)(?:\s*\d+)?\s*[:：]\s*(.+?)\]?$/i) ||
            trimmed.match(/^<caption>(.+?)<\/caption>$/i) ||
            trimmed.match(/^#{1,6}\s+(.+)$/) ||
            trimmed.match(/^\*\*([^*\n]+)\*\*:?$/);
  return m ? m[1].trim() : null;
}

/**
 * 從 Markdown 文本中解析所有 GFM 表格區塊
 * 自動識別並排除 Code Blocks (``` 或 ~~~ 或 4-space 縮排)
 * @param {string} markdown
 * @returns {Array<{ raw: string, tableOnly: string, headers: string[], aligns: string[], rows: string[][], caption?: string, startLine: number, endLine: number }>}
 */
export function parseMarkdownTables(markdown) {
  if (!markdown || typeof markdown !== 'string') return [];

  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const tables = [];
  const codeFences = new Set();

  // 1. 預先標記所有 Code Blocks (```, ~~~)，代碼塊內之表格嚴格禁止解析
  let insideCode = false;
  let codeFenceChar = '';
  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    const trimmed = line.trim();
    if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
      const fence = trimmed.slice(0, 3);
      if (!insideCode) {
        insideCode = true;
        codeFenceChar = fence;
        codeFences.add(idx);
      } else if (fence === codeFenceChar) {
        insideCode = false;
        codeFences.add(idx);
      } else {
        codeFences.add(idx);
      }
    } else if (insideCode) {
      codeFences.add(idx);
    } else if (/^\s{4,}/.test(line)) {
      // 4-space 縮進代碼塊亦排除
      codeFences.add(idx);
    }
  }

  let i = 0;
  while (i < lines.length - 1) {
    if (codeFences.has(i) || codeFences.has(i + 1)) {
      i++;
      continue;
    }

    const headerLine = lines[i];
    if (headerLine.includes('|')) {
      const nextLine = lines[i + 1];
      if (isDelimiterRow(nextLine)) {
        const headers = splitRowCells(headerLine);
        const delimiterCells = splitRowCells(nextLine);

        // 嚴格 GFM 規格：表頭欄位數必須與分隔欄位數相等，否則不視為表格（避免誤吞 Setext 標題）
        if (headers.length === 0 || headers.length !== delimiterCells.length) {
          i++;
          continue;
        }

        let caption = undefined;
        let tableStartLine = i;

        // 檢查緊鄰前一行（或空行前一行）是否為 Table Caption
        if (i > 0 && !codeFences.has(i - 1)) {
          const prev1 = lines[i - 1].trim();
          let cap = extractTableCaption(prev1);
          if (cap) {
            caption = cap;
            tableStartLine = i - 1;
          } else if (prev1 === '' && i > 1 && !codeFences.has(i - 2)) {
            const prev2 = lines[i - 2].trim();
            cap = extractTableCaption(prev2);
            if (cap) {
              caption = cap;
              tableStartLine = i - 2;
            }
          }
        }

        const aligns = delimiterCells.map(parseAlignment);
        const rows = [];
        let j = i + 2;

        while (j < lines.length) {
          if (codeFences.has(j)) break;
          const rowLine = lines[j];
          const trimmedRow = rowLine.trim();
          if (!trimmedRow || !trimmedRow.includes('|')) break;
          if (isDelimiterRow(rowLine)) break;

          const rowCells = splitRowCells(rowLine);
          rows.push(rowCells);
          j++;
        }

        const raw = lines.slice(tableStartLine, j).join('\n');
        const tableOnly = lines.slice(i, j).join('\n');

        tables.push({
          raw,
          tableOnly,
          headers,
          aligns,
          rows,
          caption,
          startLine: tableStartLine,
          endLine: j - 1
        });

        i = j;
        continue;
      }
    }
    i++;
  }

  return tables;
}

/**
 * 將結構化表格轉換為適合 Telegram 手機畫面展示的優雅條列 HTML
 * 第一欄主鍵加粗（若為 <code> 則不重複包 <b> 避免實體巢狀衝突），其他欄位以 <b>表頭:</b> 數值 呈現
 * @param {Object} table
 * @returns {string}
 */
export function formatMarkdownTableToHtml(table) {
  if (!table) return '';
  const parts = [];

  if (table.caption && String(table.caption).trim()) {
    parts.push(`<b>${formatCellContent(String(table.caption).trim())}</b>`);
  }

  const headers = Array.isArray(table.headers) ? table.headers : [];
  const rows = Array.isArray(table.rows) ? table.rows : [];

  if (rows.length > 0) {
    for (const rawRow of rows) {
      const row = Array.isArray(rawRow) ? rawRow : [rawRow];
      if (row.length === 0) continue;

      const firstRaw = row[0] !== undefined && row[0] !== '' ? row[0] : '—';
      const firstVal = formatCellContent(firstRaw);
      // 若第一欄本身已包含 <code> 或行內 code 佔位符，Telegram 官方禁止 <b><code>...</code></b> 巢狀，直接呈現
      const isCode = firstVal.includes('<code>') || firstVal.includes('\x00IC');
      const formattedFirst = isCode ? firstVal : `<b>${firstVal}</b>`;

      const otherParts = [];
      const colCount = Math.max(row.length, headers.length);

      for (let c = 1; c < colCount; c++) {
        const headerName = headers[c] ? formatCellContent(headers[c]) : '';
        const cellRaw = row[c];
        const cellVal = cellRaw !== undefined && cellRaw !== '' ? formatCellContent(cellRaw) : '—';
        if (headerName) {
          otherParts.push(`<b>${headerName}:</b> ${cellVal}`);
        } else {
          otherParts.push(cellVal);
        }
      }

      if (otherParts.length > 0) {
        parts.push(`• ${formattedFirst} | ${otherParts.join(' | ')}`);
      } else {
        parts.push(`• ${formattedFirst}`);
      }
    }
  } else if (headers.length > 0) {
    const headerParts = headers.map((h) => `<b>${formatCellContent(h)}</b>`);
    parts.push(`• ${headerParts.join(' | ')}`);
  }

  return parts.join('\n');
}

/**
 * 將標準 Markdown (含 LLM 常用輸出格式及 GFM 表格) 轉換為 Telegram HTML 格式
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

  // 3. 處理 GFM Markdown 表格轉換為 Telegram HTML 格式
  const tables = parseMarkdownTables(text);
  const tablePlaceholders = [];
  if (tables.length > 0) {
    let replacedText = '';
    let lastIndex = 0;
    for (let k = 0; k < tables.length; k++) {
      const tb = tables[k];
      const ph = `\x00TB${tablePlaceholders.length}\x00`;
      const htmlTable = formatMarkdownTableToHtml(tb);
      tablePlaceholders.push(htmlTable);

      const idx = text.indexOf(tb.raw, lastIndex);
      if (idx !== -1) {
        replacedText += text.slice(lastIndex, idx) + ph;
        lastIndex = idx + tb.raw.length;
      }
    }
    replacedText += text.slice(lastIndex);
    text = replacedText;
  }

  // 4. 轉義普通文本中的 HTML 保留字元 (&, <, >)
  text = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // 5. 處理 Markdown 標題 (# Title -> <b>Title</b>)
  text = text.replace(/^#{1,6}\s+(.+)$/gm, "<b>$1</b>");

  // 6. 處理引用 (> quote -> <blockquote>quote</blockquote>)
  text = text.replace(/^(?:&gt;|>)\s*(.+)$/gm, "<blockquote>$1</blockquote>");

  // 7. 處理清單符號：行首的 * 或 - 或 + 後接空格，轉為圓點符號 • 避免干擾粗體語法
  text = text.replace(/^(\s*)[*+-]\s+/gm, "$1• ");

  // 8. 處理雙星號/雙底線粗體 **text** 或 __text__
  text = text.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
  text = text.replace(/__(.+?)__/g, "<b>$1</b>");

  // 9. 處理單底線斜體 _text_
  text = text.replace(/(?<![a-zA-Z0-9_\u4e00-\u9fa5])_([^_]+?)_(?![a-zA-Z0-9_\u4e00-\u9fa5])/g, "<i>$1</i>");

  // 10. 處理刪除線 ~~text~~ 或 ~text~
  text = text.replace(/~~(.+?)~~/g, "<s>$1</s>");
  text = text.replace(/~([^~]+?)~/g, "<s>$1</s>");

  // 11. 處理超連結 [text](url)
  text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/g, (match, label, url) => {
    const safeUrl = url.replace(/"/g, '&quot;');
    return `<a href="${safeUrl}">${label}</a>`;
  });

  // 12. 還原表格佔位符
  for (let i = 0; i < tablePlaceholders.length; i++) {
    text = text.replace(`\x00TB${i}\x00`, tablePlaceholders[i]);
  }

  // 13. 還原行內 Code 佔位符
  for (let i = 0; i < inlineCodes.length; i++) {
    text = text.replace(`\x00IC${i}\x00`, inlineCodes[i]);
  }

  // 14. 還原 Code Block 佔位符
  for (let i = 0; i < codeBlocks.length; i++) {
    text = text.replace(`\x00CB${i}\x00`, codeBlocks[i]);
  }

  // 15. 保證所有 HTML 標籤正確閉合
  return balanceTelegramHtmlTags(text);
}
