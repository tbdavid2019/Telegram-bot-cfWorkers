/**
 * Stock Features
 * 股票查詢功能
 */

import { sendMessageToTelegramWithContext } from '../telegram/telegram.js';

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

  if (!stockCode) {
    return sendMessageToTelegramWithContext(context)('請提供股票代碼。用法：/stock <股票代碼或美股代碼>');
  }

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

  if (!stockSymbol) {
    return sendMessageToTelegramWithContext(context)('請提供股票代號。用法：/stock2 <股票代號>');
  }

  const apiKey = 'psHDQQHMeQMi9fpTXvxa8D6JR8zaPB9q';
  const url = `https://financialmodelingprep.com/api/v3/quote/${stockSymbol}?apikey=${apiKey}`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'request'
      }
    });

    const data = await response.json();

    if (data && data.length > 0) {
      const stockInfo = data[0];
      const formattedStockInfo = formatStockInfo(stockInfo);
      return sendMessageToTelegramWithContext(context)(formattedStockInfo);
    } else {
      return sendMessageToTelegramWithContext(context)(
        `未找到 ${stockSymbol} 的股票信息。請確認股票代號是否正確。`
      );
    }
    
  } catch (e) {
    console.error('Fetch error:', e);
    return sendMessageToTelegramWithContext(context)(`ERROR: ${e.message}`);
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
