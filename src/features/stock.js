/**
 * Stock Features
 * 股票查詢功能
 */

import { sendMessageToTelegramWithContext } from '../telegram/telegram.js';

// 台股熱門股票快捷列表
const TW_HOT_STOCKS = [
  { name: '台積電', code: '2330' },
  { name: '鴻海', code: '2317' },
  { name: '緯穎', code: '6669' },
  { name: '富邦金', code: '2881' },
  { name: '國泰金', code: '2882' },
  { name: '中華電', code: '2412' },
  { name: '聯發科', code: '2454' },
  { name: '台達電', code: '2308' },
];

// 美股熱門股票快捷列表
const US_HOT_STOCKS = [
  { name: 'Tesla', code: 'TSLA' },
  { name: 'NVIDIA', code: 'NVDA' },
  { name: 'Google', code: 'GOOGL' },
  { name: 'Amazon', code: 'AMZN' },
  { name: 'Microsoft', code: 'MSFT' },
  { name: 'Apple', code: 'AAPL' },
  { name: 'Meta', code: 'META' },
  { name: 'AMD', code: 'AMD' },
];

/**
 * 處理台股查詢的 callback query（按鈕點擊）
 */
export async function handleStockTWCallback(message, context) {
  const callbackData = message.callback_query?.data;
  if (!callbackData || !callbackData.startsWith('/stock:')) {
    return null;
  }
  
  const stockCode = callbackData.replace('/stock:', '');
  return fetchTWStock(stockCode, context);
}

/**
 * 處理美股查詢的 callback query（按鈕點擊）
 */
export async function handleStock2Callback(message, context) {
  const callbackData = message.callback_query?.data;
  if (!callbackData || !callbackData.startsWith('/stock2:')) {
    return null;
  }
  
  const stockCode = callbackData.replace('/stock2:', '');
  return fetchUSStock(stockCode, context);
}

/**
 * 台灣股票查詢指令
 * 使用 Yahoo Finance API，支援台股和美股
 * @param {Object} message - Telegram 訊息對象
 * @param {string} command - 指令名稱
 * @param {string} subcommand - 股票代碼
 * @param {Object} context - 上下文對象
 */
export async function commandStockTW(message, command, subcommand, context) {
  const stockCode = subcommand.trim().toUpperCase();

  // 如果沒有提供股票代碼，顯示快捷按鈕選單
  if (!stockCode) {
    return showTWStockButtons(context);
  }

  return fetchTWStock(stockCode, context);
}

/**
 * 顯示台股快捷按鈕選單
 */
async function showTWStockButtons(context) {
  let msg = `🇹🇼 *台股查詢*\n`;
  msg += `━━━━━━━━━━━━━━━\n`;
  msg += `請選擇熱門股票或手動輸入：\n\n`;
  msg += `*手動查詢方式:*\n`;
  msg += `/stock <股票代碼>\n`;
  msg += `例: \`/stock 2330\`\n`;
  
  // 建立 inline keyboard 按鈕（每行 2 個按鈕）
  const buttons = [];
  let row = [];
  
  for (let i = 0; i < TW_HOT_STOCKS.length; i++) {
    const stock = TW_HOT_STOCKS[i];
    row.push({
      text: `${stock.name} (${stock.code})`,
      callback_data: `/stock:${stock.code}`
    });
    
    if (row.length === 2 || i === TW_HOT_STOCKS.length - 1) {
      buttons.push(row);
      row = [];
    }
  }
  
  context.CURRENT_CHAT_CONTEXT.reply_markup = JSON.stringify({
    inline_keyboard: buttons
  });
  
  context.CURRENT_CHAT_CONTEXT.parse_mode = "Markdown";
  return sendMessageToTelegramWithContext(context)(msg);
}

/**
 * 查詢台股資料
 */
async function fetchTWStock(stockCode, context) {
  // 智慧判斷股票類型並格式化代碼
  const formattedCode = formatStockCode(stockCode);
  
  try {
    // 使用 Yahoo Finance API v8
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${formattedCode}`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
      throw new Error(`找不到股票代碼 ${stockCode} 的資料`);
    }

    const result = data.chart.result[0];
    const meta = result.meta;
    const quote = result.indicators.quote[0];
    
    if (!meta || !quote) {
      throw new Error('股票資料格式錯誤');
    }

    const stockType = detectStockType(formattedCode);
    const formattedStockInfo = formatUniversalStockData(meta, quote, stockCode, stockType);
    return sendMessageToTelegramWithContext(context)(formattedStockInfo);
    
  } catch (e) {
    console.error(`Stock Query Error: ${e.message}`); 
    return sendMessageToTelegramWithContext(context)(
      `查詢股票失敗: ${e.message}\n\n建議:\n1. 台股請輸入數字代碼 (如: 2330)\n2. 美股請輸入英文代碼 (如: TSLA, AAPL)\n3. 檢查是否為交易時間\n4. 稍後再試`
    );
  }
}

/**
 * 智慧判斷並格式化股票代碼
 * @param {string} stockCode - 原始股票代碼
 * @returns {string} 格式化後的代碼
 */
function formatStockCode(stockCode) {
  // 如果已經包含交易所後綴，直接返回
  if (stockCode.includes('.') || /^[A-Z]+$/.test(stockCode)) {
    return stockCode;
  }
  
  // 如果是純數字，判斷為台股，加上 .TW
  if (/^\d+$/.test(stockCode)) {
    return `${stockCode}.TW`;
  }
  
  // 其他情況（混合字母數字）直接返回，讓 API 自行判斷
  return stockCode;
}

/**
 * 檢測股票類型
 * @param {string} formattedCode - 格式化後的代碼
 * @returns {string} 股票類型
 */
function detectStockType(formattedCode) {
  if (formattedCode.endsWith('.TW')) {
    return 'taiwan';
  } else if (formattedCode.endsWith('.HK')) {
    return 'hongkong';
  } else if (formattedCode.includes('.')) {
    return 'international';
  } else {
    return 'us'; // 預設為美股
  }
}

/**
 * 格式化通用股票資料
 * @param {Object} meta - 股票元數據
 * @param {Object} quote - 股票報價數據
 * @param {string} originalCode - 原始代碼
 * @param {string} stockType - 股票類型
 * @returns {string} 格式化的股票資訊
 */
function formatUniversalStockData(meta, quote, originalCode, stockType) {
  const symbol = meta.symbol || originalCode;
  const currency = meta.currency || 'USD';
  const exchangeName = meta.exchangeName || meta.fullExchangeName || '未知交易所';
  
  // 股票完整名稱
  const stockName = meta.longName || meta.shortName || meta.displayName || '';
  
  // 當前價格
  const currentPrice = meta.regularMarketPrice || meta.previousClose;
  const previousClose = meta.previousClose;
  
  // 計算漲跌
  const change = currentPrice - previousClose;
  const changePercent = ((change / previousClose) * 100);
  
  // 今日開高低量
  const dayHigh = meta.regularMarketDayHigh || 'N/A';
  const dayLow = meta.regularMarketDayLow || 'N/A';
  const dayOpen = quote.open ? quote.open[quote.open.length - 1] : meta.regularMarketOpen || 'N/A';
  const volume = meta.regularMarketVolume || 'N/A';
  
  // 根據股票類型設定標題和格式
  const marketEmoji = getMarketEmoji(stockType);
  
  // 格式化數字
  const formatNumber = (num) => {
    if (typeof num !== 'number') return num;
    return num.toLocaleString('zh-TW', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatVolume = (vol) => {
    if (typeof vol !== 'number') return vol;
    if (vol >= 1000000000) {
      return `${(vol / 1000000000).toFixed(1)}B`;
    } else if (vol >= 1000000) {
      return `${(vol / 1000000).toFixed(1)}M`;
    } else if (vol >= 1000) {
      return `${(vol / 1000).toFixed(1)}K`;
    }
    return vol.toLocaleString();
  };

  // 判斷漲跌顏色符號
  const trendSymbol = change > 0 ? '📈' : change < 0 ? '📉' : '➡️';
  const changeSymbol = change > 0 ? '+' : '';

  return `${marketEmoji} **${symbol}** ${stockName ? `(${stockName})` : ''}

💰 **現價**: ${formatNumber(currentPrice)} ${currency}
${trendSymbol} **漲跌**: ${changeSymbol}${formatNumber(change)} (${changeSymbol}${changePercent.toFixed(2)}%)

📈 **今日最高**: ${formatNumber(dayHigh)}
📉 **今日最低**: ${formatNumber(dayLow)}  
🔓 **開盤價**: ${formatNumber(dayOpen)}
📊 **成交量**: ${formatVolume(volume)}
🔒 **昨收**: ${formatNumber(previousClose)}

⏰ 資料來源: Yahoo Finance`;
}

/**
 * 根據股票類型獲取市場表情符號
 * @param {string} stockType - 股票類型
 * @returns {string} 表情符號
 */
function getMarketEmoji(stockType) {
  switch (stockType) {
    case 'taiwan': return '🇹🇼';
    case 'us': return '🇺🇸';
    case 'hongkong': return '🇭🇰';
    case 'international': return '🌍';
    default: return '📊';
  }
}

/**
 * 國際股票查詢指令
 * 使用 Financial Modeling Prep API
 * @param {Object} message - Telegram 訊息對象
 * @param {string} command - 指令名稱
 * @param {string} subcommand - 股票代碼
 * @param {Object} context - 上下文對象
 */
export async function commandStock(message, command, subcommand, context) {
  const stockSymbol = subcommand.trim().toUpperCase();

  // 如果沒有提供股票代碼，顯示快捷按鈕選單
  if (!stockSymbol) {
    return showUSStockButtons(context);
  }

  return fetchUSStock(stockSymbol, context);
}

/**
 * 顯示美股快捷按鈕選單
 */
async function showUSStockButtons(context) {
  let msg = `🇺🇸 *美股/國際股查詢*\n`;
  msg += `━━━━━━━━━━━━━━━\n`;
  msg += `請選擇熱門股票或手動輸入：\n\n`;
  msg += `*手動查詢方式:*\n`;
  msg += `/stock2 <股票代碼>\n`;
  msg += `例: \`/stock2 TSLA\`\n`;
  
  // 建立 inline keyboard 按鈕（每行 2 個按鈕）
  const buttons = [];
  let row = [];
  
  for (let i = 0; i < US_HOT_STOCKS.length; i++) {
    const stock = US_HOT_STOCKS[i];
    row.push({
      text: `${stock.name} (${stock.code})`,
      callback_data: `/stock2:${stock.code}`
    });
    
    if (row.length === 2 || i === US_HOT_STOCKS.length - 1) {
      buttons.push(row);
      row = [];
    }
  }
  
  context.CURRENT_CHAT_CONTEXT.reply_markup = JSON.stringify({
    inline_keyboard: buttons
  });
  
  context.CURRENT_CHAT_CONTEXT.parse_mode = "Markdown";
  return sendMessageToTelegramWithContext(context)(msg);
}

/**
 * 查詢美股資料（使用 Yahoo Finance API）
 */
async function fetchUSStock(stockSymbol, context) {
  try {
    // 使用 Yahoo Finance API v8（與台股相同）
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${stockSymbol}`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
      throw new Error(`找不到股票代碼 ${stockSymbol} 的資料`);
    }

    const result = data.chart.result[0];
    const meta = result.meta;
    const quote = result.indicators.quote[0];
    
    if (!meta || !quote) {
      throw new Error('股票資料格式錯誤');
    }

    const formattedStockInfo = formatUniversalStockData(meta, quote, stockSymbol, 'us');
    return sendMessageToTelegramWithContext(context)(formattedStockInfo);
    
  } catch (e) {
    console.error(`Stock2 Query Error: ${e.message}`);
    return sendMessageToTelegramWithContext(context)(
      `查詢股票失敗: ${e.message}\n\n建議:\n1. 確認股票代碼正確 (如: TSLA, AAPL)\n2. 檢查是否為交易時間\n3. 稍後再試`
    );
  }
}

/**
 * 格式化股票資訊（Financial Modeling Prep API）
 * @param {Object} stock - 股票資料
 * @returns {string} 格式化的股票資訊
 */
function formatStockInfo(stock) {
  return `
  股票名稱: ${stock.name} (${stock.symbol})
  當前價格: $${stock.price.toFixed(2)}
  今日漲跌: ${stock.change.toFixed(2)} (${stock.changesPercentage.toFixed(2)}%)
  今日最低價: $${stock.dayLow.toFixed(2)}
  今日最高價: $${stock.dayHigh.toFixed(2)}
  年度最低價: $${stock.yearLow.toFixed(2)}
  年度最高價: $${stock.yearHigh.toFixed(2)}
  市值: $${(stock.marketCap / 1e9).toFixed(2)} 十億美元
  交易所: ${stock.exchange}
  成交量: ${stock.volume.toLocaleString()}
  平均成交量: ${stock.avgVolume.toLocaleString()}
  開盤價: $${stock.open.toFixed(2)}
  昨日收盤價: $${stock.previousClose.toFixed(2)}
  每股收益 (EPS): $${stock.eps.toFixed(2)}
  市盈率 (P/E): ${stock.pe.toFixed(2)}
  `;
}

// 14 位投資大師名稱對照表
const ANALYST_NAMES = {
  'warren_buffett_agent': '👴 華倫·巴菲特 (Warren Buffett)',
  'warren_buffett': '👴 華倫·巴菲特 (Warren Buffett)',
  'charlie_munger_agent': '🧠 查理·蒙格 (Charlie Munger)',
  'charlie_munger': '🧠 查理·蒙格 (Charlie Munger)',
  'ben_graham_agent': '📜 班傑明·葛拉漢 (Ben Graham)',
  'ben_graham': '📜 班傑明·葛拉漢 (Ben Graham)',
  'cathie_wood_agent': '🚀 凱薩琳·伍德 / 木頭姐 (Cathie Wood)',
  'cathie_wood': '🚀 凱薩琳·伍德 / 木頭姐 (Cathie Wood)',
  'bill_ackman_agent': '🎯 比爾·艾克曼 (Bill Ackman)',
  'bill_ackman': '🎯 比爾·艾克曼 (Bill Ackman)',
  'nancy_pelosi_agent': '🏛️ 南希·裴洛西 (Nancy Pelosi)',
  'nancy_pelosi': '🏛️ 南希·裴洛西 (Nancy Pelosi)',
  'michael_burry_agent': '🐻 麥可·貝瑞 / 大賣空 (Michael Burry)',
  'michael_burry': '🐻 麥可·貝瑞 / 大賣空 (Michael Burry)',
  'peter_lynch_agent': '📊 彼得·林區 (Peter Lynch)',
  'peter_lynch': '📊 彼得·林區 (Peter Lynch)',
  'phil_fisher_agent': '🌱 菲利普·費雪 (Phil Fisher)',
  'phil_fisher': '🌱 菲利普·費雪 (Phil Fisher)',
  'wsb_agent': '🎰 華爾街賭場 (WallStreetBets)',
  'wsb': '🎰 華爾街賭場 (WallStreetBets)',
  'technical_analyst_agent': '📈 技術分析師 (Technicals)',
  'technical_analyst': '📈 技術分析師 (Technicals)',
  'fundamentals_analyst_agent': '📑 基本面分析師 (Fundamentals)',
  'fundamentals_analyst': '📑 基本面分析師 (Fundamentals)',
  'sentiment_analyst_agent': '📰 即時新聞情緒 (Sentiment)',
  'sentiment_analyst': '📰 即時新聞情緒 (Sentiment)',
  'valuation_analyst_agent': '💵 內在估值分析師 (DCF Valuation)',
  'valuation_analyst': '💵 內在估值分析師 (DCF Valuation)',
  'risk_management_agent': '🛡️ 風險管理 (Risk Management)',
  'risk_management': '🛡️ 風險管理 (Risk Management)'
};

function getSignalTag(signal) {
  const s = String(signal || '').toLowerCase();
  if (s.includes('bull') || s.includes('buy')) return '🟢 看多 (BUY)';
  if (s.includes('bear') || s.includes('sell')) return '🔴 看空 (SELL)';
  if (s.includes('short')) return '🔴 做空 (SHORT)';
  return '⚪ 中立 (HOLD)';
}

function getActionTag(action) {
  const a = String(action || '').toLowerCase();
  if (a === 'buy') return '🟢 買入 (BUY)';
  if (a === 'sell') return '🔴 賣出 (SELL)';
  if (a === 'short') return '🔴 做空 (SHORT)';
  if (a === 'hold') return '⚪ 觀望 (HOLD)';
  return a.toUpperCase();
}

/**
 * 格式化 AI 對沖基金報告
 */
function formatFundReport(data, tickers) {
  let reply = '【📈 AI 對沖基金・投資分析報告】\n';
  reply += `標的：${tickers.join(', ')}\n\n`;

  const decisions = data.decisions || {};
  const roundTable = data.round_table || {};
  const analystSignals = data.analyst_signals || {};

  for (const ticker of tickers) {
    const dec = decisions[ticker];
    const rt = roundTable[ticker];

    // 1. 最終委員會決策
    if (dec) {
      reply += `🎯 *【投資委員會最終決策・${ticker}】*\n`;
      reply += `• 建議動作：${getActionTag(dec.action)}\n`;
      if (dec.confidence !== undefined) {
        reply += `• 決策信心度：${dec.confidence}%\n`;
      }
      if (dec.quantity) {
        reply += `• 建議倉位股數：${dec.quantity} 股\n`;
      }
      if (dec.reasoning) {
        reply += `• 決策理由：${dec.reasoning}\n`;
      }
      reply += '\n';
    }

    // 2. 圓桌會議共識與辯論
    if (rt && (rt.consensus_view || rt.discussion_summary)) {
      reply += `🏛️ *【圓桌會議辯論與共識】*\n`;
      if (rt.signal) {
        reply += `• 會議整體傾向：${getSignalTag(rt.signal)} (信心度: ${rt.confidence || 0}%)\n`;
      }
      if (rt.consensus_view) {
        reply += `• 會議共識：${rt.consensus_view}\n`;
      }
      if (rt.discussion_summary) {
        reply += `• 多空交鋒焦點：${rt.discussion_summary}\n`;
      }
      if (rt.dissenting_opinions) {
        reply += `• 分歧與保留意見：${rt.dissenting_opinions}\n`;
      }
      reply += '\n';
    }

    // 3. 各大師獨立信號
    const personaEntries = Object.entries(analystSignals).filter(
      ([agentName]) => agentName !== 'round_table' && agentName !== 'risk_management_agent'
    );
    if (personaEntries.length > 0) {
      reply += `👥 *【傳奇投資大師獨立評級】*\n`;
      for (const [agentKey, signalObj] of personaEntries) {
        const sig = signalObj[ticker];
        if (!sig) continue;
        const displayName = ANALYST_NAMES[agentKey] || agentKey.replace('_agent', '');
        const tag = getSignalTag(sig.signal);
        const conf = sig.confidence !== undefined ? ` (${sig.confidence}%)` : '';
        reply += `• ${displayName}：${tag}${conf}\n`;
        if (sig.reasoning && typeof sig.reasoning === 'string') {
          reply += `  └ 觀點：${sig.reasoning}\n`;
        }
      }
      reply += '\n';
    }
  }

  return reply.trim();
}

/**
 * AI 對沖基金投資分析指令
 * @param {Object} message - Telegram 訊息對象
 * @param {string} command - 指令名稱
 * @param {string} subcommand - 股票代碼或分析參數
 * @param {Object} context - 上下文對象
 */
export async function commandFund(message, command, subcommand, context) {
  const input = (subcommand || '').trim();
  if (!input) {
    return sendMessageToTelegramWithContext(context)(
      '📈 *AI 對沖基金・多大師投資決策與圓桌辯論*\n\n' +
      '請在指令後輸入股票代碼（支援美股、台股與多標的）。\n\n' +
      '📝 *使用範例*：\n' +
      '• `/fund NVDA` （分析輝達，含巴菲特、木頭姐、貝瑞等大師決策與圓桌辯論）\n' +
      '• `/fund TSLA` （分析特斯拉）\n' +
      '• `/fund 2330.TW` （分析台積電）\n' +
      '• `/fund AAPL,MSFT` （多標的組合分析）\n' +
      '• `/fund NVDA all` （召集全部 14 位投資大師進行全方位分析）\n\n' +
      '👥 *涵蓋 14 位傳奇投資大師與分析維度*：\n' +
      '• 價值派：巴菲特、蒙格、葛拉漢、艾克曼\n' +
      '• 成長/創新派：木頭姐、費雪、彼得·林區\n' +
      '• 反向/事件派：麥可·貝瑞 (大賣空)、裴洛西 (國會交易)、WSB (社群散戶)\n' +
      '• 量化數據：技術指標、財務基本面、即時新聞情緒、DCF 估值模型'
    );
  }

  // 解析股票代號
  const parts = input.split(/\s+/);
  const tickerArg = parts[0];
  const isAllAnalysts = input.toLowerCase().includes('all');

  // 整理 ticker 格式（例如 2330 -> 2330.TW，英文字母大寫）
  const tickers = tickerArg.split(',').map(t => {
    let clean = t.trim().toUpperCase();
    if (/^\d{4,6}$/.test(clean)) {
      clean = `${clean}.TW`;
    }
    return clean;
  }).filter(Boolean);

  if (tickers.length === 0) {
    return sendMessageToTelegramWithContext(context)('錯誤: 請輸入有效的股票代碼（如 NVDA, TSLA, 2330.TW）。');
  }

  const selectedAnalysts = isAllAnalysts ? [] : [
    'warren_buffett',
    'cathie_wood',
    'michael_burry',
    'peter_lynch',
    'technical_analyst',
    'valuation_analyst'
  ];

  const url = 'http://dns.glsoft.ai:6000/api/analysis';
  const payload = {
    tickers: tickers.length === 1 ? tickers[0] : tickers,
    selectedAnalysts,
    enableRoundTable: true,
    roundTableRounds: 1
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`HTTP ${response.status}: ${errText || response.statusText}`);
    }

    const data = await response.json();
    const formattedReport = formatFundReport(data, tickers);
    return sendMessageToTelegramWithContext(context)(formattedReport);
  } catch (e) {
    console.error('AI Hedge Fund Error:', e);
    return sendMessageToTelegramWithContext(context)(`❌ AI 對沖基金分析失敗：${e.message}\n\n請確認代號正確或稍後再試。`);
  }
}

