/**
 * Telegram Bot API 10.3 Rich Message 構建模組
 * 包含富文本原生表格 (InputRichBlockTable)、相容性 HTML 轉換與段落感知降級切分
 */

import { balanceTelegramHtmlTags, parseMarkdownTables, markdownToTelegramHtml, cleanCellPlainText, formatTableAsAsciiBox } from '../utils/md2tgmd.js';
import { escapeHTML } from '../utils/utils.js';

/**
 * 將單一單元格轉換為 Telegram 10.3 RichBlockTableCell 物件
 * @param {any} cell
 * @param {boolean} [isHeader=false]
 * @returns {{ text: string, is_header?: boolean, align?: 'left'|'center'|'right' }}
 */
function toCell(cell, isHeader = false) {
  let cellObj;
  if (Array.isArray(cell)) {
    cellObj = { text: cell.map(cellToString).join('') };
  } else if (cell !== null && typeof cell === 'object') {
    cellObj = {
      text: cell.text !== undefined && cell.text !== null ? String(cell.text) : '',
      ...(cell.align && ['left', 'center', 'right'].includes(cell.align) ? { align: cell.align } : {})
    };
    if (cell.is_header) {
      cellObj.is_header = true;
    }
  } else {
    cellObj = { text: cell === null || cell === undefined ? '' : String(cell) };
  }

  if (isHeader) {
    cellObj.is_header = true;
  }
  return cellObj;
}

/**
 * 提取單元格字串值供文字模式使用
 * @param {any} cell
 * @returns {string}
 */
export function cellToString(cell) {
  if (cell === null || cell === undefined) return '';
  if (Array.isArray(cell)) {
    return cell.map((c) => (typeof c === 'object' && c !== null ? c.text || '' : String(c))).join('');
  }
  if (typeof cell === 'object' && cell !== null && cell.text !== undefined) {
    return String(cell.text);
  }
  return String(cell);
}

/**
 * 構建 Telegram Bot API 10.3 原生表格物件 (InputRichBlockTable)
 * @param {Object} options
 * @param {Array<string|any>} [options.headers=[]] - 表頭欄位
 * @param {Array<Array<string|any>>} [options.rows=[]] - 資料行陣列
 * @param {boolean} [options.is_compact=true] - 是否緊湊排列
 * @param {boolean} [options.is_striped=true] - 是否斑馬紋交替色彩
 * @param {string} [options.caption] - 表格標題說明
 * @returns {Object|null} InputRichBlockTable，若無有效內容則回傳 null
 */
export function buildRichTable({
  headers = [],
  rows = [],
  is_compact = true,
  is_striped = true,
  caption
} = {}) {
  const MAX_COLUMNS = 20;
  const MAX_ROWS = 50;
  const cells = [];

  const safeHeadersArr = Array.isArray(headers) ? headers : [];
  const safeRowsArr = Array.isArray(rows) ? rows : [];

  // 1. 處理表頭（若存在）
  if (safeHeadersArr.length > 0) {
    let safeHeaders = safeHeadersArr;
    if (safeHeaders.length > MAX_COLUMNS) {
      safeHeaders = safeHeaders.slice(0, MAX_COLUMNS);
    }
    cells.push(safeHeaders.map((h) => toCell(h, true)));
  }

  // 2. 處理資料行
  if (safeRowsArr.length > 0) {
    const limitedRows = safeRowsArr.slice(0, MAX_ROWS);
    for (const row of limitedRows) {
      let safeRow = Array.isArray(row) ? row : [row];
      if (safeRow.length > MAX_COLUMNS) {
        safeRow = safeRow.slice(0, MAX_COLUMNS);
      }
      cells.push(safeRow.map((c) => toCell(c, false)));
    }
  }

  if (cells.length === 0) {
    return null;
  }

  // 補齊不規則行寬 (ragged rows normalization)
  const maxWidth = Math.max(...cells.map((r) => r.length));
  for (const row of cells) {
    while (row.length < maxWidth) {
      row.push({ text: '—' });
    }
    for (const cell of row) {
      if (!cell.text || cell.text.trim() === '') {
        cell.text = '—';
      }
    }
  }

  const tableBlock = {
    type: 'table',
    cells
  };

  if (Boolean(is_compact)) {
    tableBlock.is_compact = true;
  }
  if (Boolean(is_striped)) {
    tableBlock.is_striped = true;
  }

  if (caption !== undefined && caption !== null && String(caption).trim() !== '') {
    tableBlock.caption = String(caption).trim();
  }

  return tableBlock;
}

/**
 * 將表格結構轉換為相容標準 Telegram HTML 的條列格式，供 Fallback 使用
 * @param {Object} options
 * @param {Array<string|any>} [options.headers=[]] - 表頭欄位
 * @param {Array<Array<string|any>>} [options.rows=[]] - 資料行陣列
 * @param {string} [options.caption] - 表格標題
 * @returns {string} Telegram HTML 字串
 */
export function tableToLegacyHtml(tableInput = {}) {
  try {
    const asciiBox = formatTableAsAsciiBox(tableInput);
    if (asciiBox && asciiBox.trim() !== '') {
      return asciiBox;
    }
  } catch (_) {
    // 降級回退到條列式清單
  }

  let { headers = [], rows = [], caption } = tableInput || {};

  // 若 headers/rows 為空，但傳入了 Telegram 10.3 Native Rich Table 結構的 cells
  if ((!headers || headers.length === 0) && Array.isArray(tableInput.cells) && tableInput.cells.length > 0) {
    if (tableInput.cells[0].some(c => c && c.is_header)) {
      headers = tableInput.cells[0];
      rows = tableInput.cells.slice(1);
    } else {
      rows = tableInput.cells;
    }
  }

  if (caption !== undefined && caption !== null && String(caption).trim() !== '') {
    parts.push(`<b>${escapeHTML(String(caption).trim())}</b>`);
  }

  const safeHeaders = Array.isArray(headers) ? headers : [];
  const safeRows = Array.isArray(rows) ? rows : [];

  if (safeRows.length > 0) {
    for (const rawRow of safeRows) {
      const row = Array.isArray(rawRow) ? rawRow : [rawRow];
      const rowParts = [];
      for (let i = 0; i < row.length; i++) {
        const headerName = safeHeaders[i] ? cellToString(safeHeaders[i]) : '';
        const val = cellToString(row[i]);
        if (headerName) {
          rowParts.push(`<b>${escapeHTML(headerName)}:</b> ${escapeHTML(val)}`);
        } else {
          rowParts.push(escapeHTML(val));
        }
      }
      parts.push(`• ${rowParts.join(' | ')}`);
    }
  } else if (safeHeaders.length > 0) {
    const headerParts = safeHeaders.map((h) => `<b>${escapeHTML(cellToString(h))}</b>`);
    parts.push(`• ${headerParts.join(' | ')}`);
  }

  return parts.join('\n');
}

/**
 * 安全截斷字串，不截斷 UTF-16 surrogate pairs (如 emoji) 或 HTML entity
 * @param {string} str
 * @param {number} maxLen
 * @returns {number} 安全的截斷索引
 */
function findSafeCutIndex(str, maxLen) {
  if (str.length <= maxLen) return str.length;

  let cut = maxLen;
  // 避免切斷 UTF-16 surrogate pair (High surrogate 0xD800..0xDBFF)
  const code = str.charCodeAt(cut - 1);
  if (code >= 0xd800 && code <= 0xdbff) {
    cut--;
  }

  // 避免切斷 HTML entity (例如 &amp; 或 &#123;)
  const lastAmp = str.lastIndexOf('&', cut);
  if (lastAmp !== -1 && cut - lastAmp < 10) {
    const semi = str.indexOf(';', lastAmp);
    if (semi === -1 || semi >= cut) {
      cut = lastAmp;
    }
  }

  // 避免切斷 HTML tag (例如 <b 或 </b>)
  const lastTagOpen = str.lastIndexOf('<', cut);
  if (lastTagOpen !== -1) {
    const tagClose = str.indexOf('>', lastTagOpen);
    if (tagClose === -1 || tagClose >= cut) {
      cut = lastTagOpen;
    }
  }

  return cut > 0 ? cut : maxLen;
}

/**
 * 當富文本降級至 sendMessage 時，安全切分超長文本
 * 預留 HTML closing tags 安全預算，確保最終每塊長度 ≤ limit (預設 4000)
 * @param {string} text
 * @param {number} [limit=4000]
 * @returns {string[]}
 */
export function splitRichTextIntoLegacyChunks(text, limit = 4000) {
  if (text === undefined || text === null) return [];
  const str = typeof text !== 'string' ? String(text) : text;
  if (!str) return [];

  const maxLimit = typeof limit === 'number' && limit > 100 ? limit : 4000;
  // 預留 64 字元給未閉合 HTML 標籤補齊
  const textBudget = maxLimit - 64;

  if (str.length <= textBudget) {
    return [balanceTelegramHtmlTags(str)];
  }

  const chunks = [];
  // 優先嘗試雙換行與單換行切分
  const paragraphs = str.split(/(?<=\n)/);
  let currentChunk = '';

  for (const p of paragraphs) {
    if (p.length > textBudget) {
      if (currentChunk.length > 0) {
        chunks.push(balanceTelegramHtmlTags(currentChunk));
        currentChunk = '';
      }
      let remaining = p;
      while (remaining.length > 0) {
        if (remaining.length <= textBudget) {
          currentChunk = remaining;
          break;
        }
        const cutIndex = findSafeCutIndex(remaining, textBudget);
        const sub = remaining.slice(0, cutIndex);
        chunks.push(balanceTelegramHtmlTags(sub));
        remaining = remaining.slice(cutIndex);
      }
    } else {
      if (currentChunk.length + p.length <= textBudget) {
        currentChunk += p;
      } else {
        if (currentChunk.length > 0) {
          chunks.push(balanceTelegramHtmlTags(currentChunk));
        }
        currentChunk = p;
      }
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(balanceTelegramHtmlTags(currentChunk));
  }

  return chunks;
}

/**
 * 將 GFM Markdown 表格字串轉換為 Telegram 10.3 原生 InputRichBlockTable 物件
 * @param {string} tableMarkdown - GFM 表格 Markdown 字串
 * @param {Object} [options={}]
 * @param {string} [options.caption] - 自訂表格標題（若無則自動提取 Markdown 標題/Caption）
 * @param {boolean} [options.is_compact=true] - 是否緊湊排列
 * @param {boolean} [options.is_striped=true] - 是否斑馬紋交替色彩
 * @returns {Object|null} InputRichBlockTable，若無有效內容則回傳 null
 */
export function markdownTableToRichBlock(tableInput, options = {}) {
  if (!tableInput) return null;

  let table;
  if (typeof tableInput === 'object' && tableInput !== null && Array.isArray(tableInput.headers)) {
    table = tableInput;
  } else if (typeof tableInput === 'string') {
    const tables = parseMarkdownTables(tableInput);
    if (tables.length === 0) return null;
    table = tables[0];
  } else {
    return null;
  }

  const aligns = table.aligns || [];

  const headers = (table.headers || []).map((h, i) => {
    const align = aligns[i];
    return {
      text: cleanCellPlainText(h),
      ...(align && ['left', 'center', 'right'].includes(align) ? { align } : {})
    };
  });

  const rows = (table.rows || []).map((row) =>
    (Array.isArray(row) ? row : [row]).map((cell, i) => {
      const align = aligns[i];
      return {
        text: cleanCellPlainText(cell),
        ...(align && ['left', 'center', 'right'].includes(align) ? { align } : {})
      };
    })
  );

  const caption = options.caption !== undefined ? options.caption : table.caption;

  return buildRichTable({
    headers,
    rows,
    is_compact: options.is_compact !== undefined ? Boolean(options.is_compact) : true,
    is_striped: options.is_striped !== undefined ? Boolean(options.is_striped) : true,
    caption
  });
}

/**
 * 從 Markdown 文本中提取 Telegram 10.3 富文本表格區塊，並將文本拆分為常規文字與富文本物件
 * @param {string} markdown - 原始 Markdown 訊息
 * @returns {{ text: string, blocks: Array<Object>, fallbackText: string, segments: Array<Object> }}
 */
export function extractRichBlocksFromMarkdown(markdown) {
  if (markdown === undefined || markdown === null) {
    return {
      text: '',
      blocks: [],
      fallbackText: '',
      segments: []
    };
  }

  const str = typeof markdown !== 'string' ? String(markdown) : markdown;
  if (!str.trim()) {
    return {
      text: str,
      blocks: [],
      fallbackText: str,
      segments: [{ type: 'text', content: str }]
    };
  }

  const normalized = str.replace(/\r\n/g, '\n');
  const tables = parseMarkdownTables(normalized);

  if (tables.length === 0) {
    const fallback = markdownToTelegramHtml(normalized);
    return {
      text: normalized,
      blocks: [],
      fallbackText: fallback,
      segments: [{ type: 'text', content: normalized }]
    };
  }

  const blocks = [];
  const segments = [];
  let lastIndex = 0;

  for (const table of tables) {
    const richBlock = markdownTableToRichBlock(table, { caption: table.caption });
    if (richBlock) {
      blocks.push(richBlock);
    }

    const idx = normalized.indexOf(table.raw, lastIndex);
    if (idx !== -1) {
      const textBefore = normalized.slice(lastIndex, idx);
      if (textBefore.trim()) {
        segments.push({ type: 'text', content: textBefore });
      }
      segments.push({ type: 'table', block: richBlock, raw: table.raw });
      lastIndex = idx + table.raw.length;
    }
  }

  if (lastIndex < normalized.length) {
    const textAfter = normalized.slice(lastIndex);
    if (textAfter.trim()) {
      segments.push({ type: 'text', content: textAfter });
    }
  }

  let cleanText = normalized;
  for (const table of tables) {
    cleanText = cleanText.replace(table.raw, '');
  }
  cleanText = cleanText.replace(/\n{3,}/g, '\n\n').trim();

  const fallbackText = markdownToTelegramHtml(normalized);

  return {
    text: cleanText,
    blocks,
    fallbackText,
    segments
  };
}
