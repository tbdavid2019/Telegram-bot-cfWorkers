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
  if (typeof text === 'object' && text.text !== undefined && text.text !== null) {
    text = text.text;
  }
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
 * 計算單一字元的顯示寬度 (East Asian Width)
 * CJK 漢字、假名、諺文、全形標點符號與 Emoji 為 2 寬度，ASCII 為 1 寬度
 * @param {string} char
 * @returns {number}
 */
export function getCharDisplayWidth(char) {
  if (!char) return 0;
  const code = char.codePointAt(0);
  if (!code) return 0;

  // 控制字元與零寬字元 (ZWJ, ZWNJ, BOM, Variation Selectors 等)
  if (code < 32 || (code >= 0x7f && code < 0xa0)) return 0;
  if (code === 0x200b || code === 0x200c || code === 0x200d || code === 0xfeff || (code >= 0xfe00 && code <= 0xfe0f)) return 0;

  // CJK, Fullwidth, Hangul, Kana, Emojis
  if (
    (code >= 0x1100 && code <= 0x115f) || // Hangul Jamo
    (code >= 0x2e80 && code <= 0xa4cf && code !== 0x303f) || // CJK Radicals, Kangxi, Hiragana, Katakana, Bopomofo, Hangul
    (code >= 0xac00 && code <= 0xd7a3) || // Hangul Syllables
    (code >= 0xf900 && code <= 0xfaff) || // CJK Compatibility Ideographs
    (code >= 0xfe10 && code <= 0xfe19) || // Vertical forms
    (code >= 0xfe30 && code <= 0xfe6f) || // CJK Compatibility Forms
    (code >= 0xff01 && code <= 0xff60) || // Fullwidth Forms
    (code >= 0xffe0 && code <= 0xffe6) || // Fullwidth Symbols
    (code >= 0x2100 && code <= 0x214f && (code === 0x2103 || code === 0x2109)) || // ℃, ℉
    (code >= 0x2600 && code <= 0x27bf) || // Misc symbols (⛩, ☀️, ☁, ⚡)
    (code >= 0x1f300 && code <= 0x1faff) || // Emojis & Pictographs (Unicode 13+)
    (code >= 0x20000 && code <= 0x2fffd) ||
    (code >= 0x30000 && code <= 0x3fffd)
  ) {
    return 2;
  }
  return 1;
}

/**
 * 計算字串之視覺顯示寬度
 * @param {string} str
 * @returns {number}
 */
export function getStringDisplayWidth(str) {
  if (str === undefined || str === null) return 0;
  const s = String(str);
  if (!s) return 0;
  let width = 0;
  for (const ch of Array.from(s)) {
    width += getCharDisplayWidth(ch);
  }
  return width;
}

/**
 * 依據對齊方式將單元格填充至指定視覺寬度
 * @param {string} text
 * @param {number} targetWidth
 * @param {'left'|'center'|'right'} [align='left']
 * @returns {string}
 */
function padCellVisual(text, targetWidth, align = 'left') {
  const currentWidth = getStringDisplayWidth(text);
  const diff = Math.max(0, targetWidth - currentWidth);
  if (diff === 0) return text;
  if (align === 'right') {
    return ' '.repeat(diff) + text;
  }
  if (align === 'center') {
    const leftPad = Math.floor(diff / 2);
    const rightPad = diff - leftPad;
    return ' '.repeat(leftPad) + text + ' '.repeat(rightPad);
  }
  return text + ' '.repeat(diff);
}

/**
 * 將結構化表格渲染為真實的 Unicode Box-Drawing 視覺格線表格
 * 計算 East Asian Width 視覺寬度，自動處理對齊並包裹於 <pre><code> 標籤中
 * @param {Object} table
 * @returns {string}
 */
export function formatTableAsAsciiBox(table) {
  if (!table) return '';

  let headers = [];
  let rows = [];
  let aligns = table.aligns || [];

  if (Array.isArray(table.cells) && table.cells.length > 0) {
    if (table.cells[0].some((c) => c && c.is_header)) {
      headers = table.cells[0].map((c) => cleanCellPlainText(c));
      rows = table.cells.slice(1).map((r) => r.map((c) => cleanCellPlainText(c)));
    } else {
      rows = table.cells.map((r) => r.map((c) => cleanCellPlainText(c)));
    }
  } else {
    headers = (table.headers || []).map((h) => cleanCellPlainText(h));
    rows = (table.rows || []).map((r) => (Array.isArray(r) ? r : [r]).map((c) => cleanCellPlainText(c)));
  }

  const colCount = Math.max(headers.length, ...rows.map((r) => r.length), 0);
  if (colCount === 0) return '';

  // 補齊不規則行
  const normalizedHeaders = [...headers];
  while (normalizedHeaders.length < colCount) normalizedHeaders.push('');

  const normalizedRows = rows.map((r) => {
    const nr = [...r];
    while (nr.length < colCount) nr.push('');
    return nr;
  });

  // 計算每欄最大顯示寬度（最少為 1）
  const colWidths = [];
  for (let c = 0; c < colCount; c++) {
    const hWidth = normalizedHeaders.length > 0 ? getStringDisplayWidth(normalizedHeaders[c]) : 0;
    const rWidths = normalizedRows.map((r) => getStringDisplayWidth(r[c]));
    const maxW = Math.max(1, hWidth, ...rWidths);
    colWidths.push(maxW);
  }

  const boxLines = [];

  // 頂部邊框: ┌──────┬──────┐
  const topBorder = '┌' + colWidths.map((w) => '─'.repeat(w + 2)).join('┬') + '┐';
  boxLines.push(topBorder);

  // 表頭（若存在）
  if (normalizedHeaders.some((h) => h.trim() !== '')) {
    const headerCells = normalizedHeaders.map((h, i) => {
      const align = aligns[i] || 'left';
      return ' ' + padCellVisual(h, colWidths[i], align) + ' ';
    });
    boxLines.push('│' + headerCells.join('│') + '│');

    // 表頭與資料行分隔線: ├──────┼──────┤
    const headerSep = '├' + colWidths.map((w) => '─'.repeat(w + 2)).join('┼') + '┤';
    boxLines.push(headerSep);
  }

  // 資料行
  for (const row of normalizedRows) {
    const rowCells = row.map((cell, i) => {
      const align = aligns[i] || 'left';
      return ' ' + padCellVisual(cell, colWidths[i], align) + ' ';
    });
    boxLines.push('│' + rowCells.join('│') + '│');
  }

  // 底部邊框: └──────┴──────┘
  const bottomBorder = '└' + colWidths.map((w) => '─'.repeat(w + 2)).join('┴') + '┘';
  boxLines.push(bottomBorder);

  // 轉義 HTML 保留字元 (&, <, >)
  const escapedBox = boxLines
    .map((line) => line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'))
    .join('\n');

  let result = '';
  if (table.caption && String(table.caption).trim()) {
    result += `<b>${escape(String(table.caption).trim())}</b>\n`;
  }
  result += `<pre><code>${escapedBox}</code></pre>`;

  return result;
}

/**
 * 將結構化表格轉換為適合 Telegram 手機畫面展示的優雅條列 HTML (相容備援格式)
 * 第一欄主鍵加粗，其他欄位以 <b>表頭:</b> 數值 呈現
 * @param {Object} table
 * @returns {string}
 */
export function formatTableAsBulletList(table) {
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
 * 將結構化表格轉換為適合 Telegram 展示的 HTML 格式
 * 優先輸出真實視覺方框格線 (Box-drawing) 程式碼區塊
 * @param {Object} table
 * @param {Object} [options={}]
 * @returns {string}
 */
export function formatMarkdownTableToHtml(table, options = {}) {
  if (!table) return '';
  if (options.mode === 'list') {
    return formatTableAsBulletList(table);
  }
  const boxHtml = formatTableAsAsciiBox(table);
  if (!boxHtml) return '';
  return boxHtml;
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
