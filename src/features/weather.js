/**
 * Weather Features
 * 天氣查詢功能
 */

import {
  sendMessageToTelegramWithContext,
  sendRichMessageWithContext,
  buildInlineKeyboard,
  answerCallbackQuery
} from '../telegram/telegram.js';
import { buildRichTable } from '../telegram/rich.js';
import { escape } from '../utils/md2tgmd.js';

// 預設的快捷城市列表
const QUICK_CITIES = [
  { name: '台北市', callback: '/wt:台北市' },
  { name: '台中市', callback: '/wt:台中市' },
  { name: '高雄市', callback: '/wt:高雄市' },
  { name: '新竹市', callback: '/wt:新竹市' },
  { name: '台南市', callback: '/wt:台南市' },
  { name: '花蓮市', callback: '/wt:花蓮市' },
];

/**
 * 常用氣象英中對照表（補足 wttr.in 英文回傳）
 */
const WEATHER_DESC_MAP = {
  'Sunny': '晴天',
  'Clear': '晴朗',
  'Partly cloudy': '多雲時晴',
  'Partly Cloudy': '多雲時晴',
  'Cloudy': '陰天',
  'Overcast': '陰天',
  'Mist': '薄霧',
  'Fog': '濃霧',
  'Freezing fog': '凍霧',
  'Patchy rain nearby': '局部短暫雨',
  'Patchy rain possible': '局部短暫雨',
  'Patchy snow possible': '局部短暫雪',
  'Patchy sleet possible': '局部凍雨',
  'Patchy freezing drizzle possible': '局部凍毛雨',
  'Thundery outbreaks nearby': '雷陣雨可能',
  'Thundery outbreaks possible': '雷陣雨可能',
  'Blowing snow': '吹雪',
  'Blizzard': '暴風雪',
  'Patchy light drizzle': '局部小毛雨',
  'Light drizzle': '小毛雨',
  'Freezing drizzle': '凍毛雨',
  'Heavy freezing drizzle': '大凍毛雨',
  'Patchy light rain': '局部小雨',
  'Light rain': '小雨',
  'Moderate rain at times': '時有中雨',
  'Moderate rain': '中雨',
  'Heavy rain at times': '時有大雨',
  'Heavy rain': '大雨',
  'Light freezing rain': '小凍雨',
  'Moderate or heavy freezing rain': '中到大凍雨',
  'Light sleet': '小冰雹',
  'Moderate or heavy sleet': '中到大冰雹',
  'Patchy light snow': '局部小雪',
  'Light snow': '小雪',
  'Patchy moderate snow': '局部中雪',
  'Moderate snow': '中雪',
  'Patchy heavy snow': '局部大雪',
  'Heavy snow': '大雪',
  'Ice pellets': '冰粒',
  'Light rain shower': '短暫小雨',
  'Moderate or heavy rain shower': '短暫中大雨',
  'Torrential rain shower': '驟雨暴雨',
  'Light sleet showers': '小冰雹驟雨',
  'Moderate or heavy sleet showers': '中到大冰雹驟雨',
  'Light snow showers': '小雪驟雪',
  'Moderate or heavy snow showers': '中到大雪驟雪',
  'Light showers of ice pellets': '短暫小冰粒',
  'Moderate or heavy showers of ice pellets': '短暫中到大冰粒',
  'Patchy light rain with thunder': '局部雷陣雨',
  'Moderate or heavy rain with thunder': '中到大雷雨',
  'Patchy light snow with thunder': '局部雷雪',
  'Moderate or heavy snow with thunder': '中到大雷雪'
};

const WIND_DIR_MAP = {
  'N': '北風', 'NNE': '北北東風', 'NE': '東北風', 'ENE': '東北東風',
  'E': '東風', 'ESE': '東南東風', 'SE': '東南風', 'SSE': '南南東風',
  'S': '南風', 'SSW': '南南西風', 'SW': '西南風', 'WSW': '西南西風',
  'W': '西風', 'WNW': '西北西風', 'NW': '西北風', 'NNW': '北北西風'
};

export function translateWeatherDesc(desc) {
  if (!desc) return '—';
  const trimmed = desc.trim();
  return WEATHER_DESC_MAP[trimmed] || trimmed;
}

export function translateWindDir(dir) {
  if (!dir) return '—';
  return WIND_DIR_MAP[dir.toUpperCase().trim()] || dir;
}

export function getVisualWidth(str) {
  let w = 0;
  for (const ch of String(str || '')) {
    w += ch.charCodeAt(0) > 255 ? 2 : 1;
  }
  return w;
}

export function padEndVisual(str, targetWidth) {
  const s = String(str || '');
  const currentWidth = getVisualWidth(s);
  if (currentWidth >= targetWidth) return s;
  return s + ' '.repeat(targetWidth - currentWidth);
}

/**
 * 處理天氣查詢的 callback query（按鈕點擊）
 */
export async function handleWeatherCallback(message, context) {
  const callbackData = message.callback_query?.data;
  if (!callbackData || !callbackData.startsWith('/wt:')) {
    return null;
  }

  const cityName = callbackData.replace('/wt:', '');
  return fetchAndSendWeather(cityName, context);
}

/**
 * 天氣查詢指令
 * @param {Object} message - Telegram 訊息對象
 * @param {string} command - 指令名稱
 * @param {string} subcommand - 子指令參數
 * @param {Object} context - 上下文對象
 */
export async function commandWeather(message, command, subcommand, context) {
  const locationName = subcommand.trim();

  // 如果沒有提供城市名稱，顯示快捷按鈕選單
  if (!locationName) {
    return showWeatherCityButtons(context);
  }

  return fetchAndSendWeather(locationName, context);
}

/**
 * 顯示城市快捷按鈕選單
 */
async function showWeatherCityButtons(context) {
  const msg = `<b>🌦️ 天氣查詢</b>\n\n<pre><code>請點選快捷城市，或輸入：\n/wt &lt;城市名稱&gt; (例: /wt 花蓮市)</code></pre>`;

  const buttons = [
    [
      { text: '📍 台北', callback_data: '/wt:台北' },
      { text: '📍 台中', callback_data: '/wt:台中' },
      { text: '📍 高雄', callback_data: '/wt:高雄' }
    ],
    [
      { text: '📍 新竹', callback_data: '/wt:新竹' },
      { text: '📍 台南', callback_data: '/wt:台南' },
      { text: '📍 花蓮', callback_data: '/wt:花蓮' }
    ],
    [
      { text: '⚠️ 全台天氣特報', callback_data: '/weatheralert' }
    ]
  ];

  if (context && context.CURRENT_CHAT_CONTEXT) {
    context.CURRENT_CHAT_CONTEXT.reply_markup = buildInlineKeyboard(buttons);
    context.CURRENT_CHAT_CONTEXT.parse_mode = 'HTML';
  }

  return sendMessageToTelegramWithContext(context)(msg);
}

/**
 * 查詢並發送天氣資訊
 */
async function fetchAndSendWeather(locationName, context) {
  const url = `https://v2.wttr.in/${encodeURIComponent(locationName)}?format=j1&lang=zh`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data && data.current_condition && data.current_condition.length > 0) {
      const resolvedName = (data.nearest_area && data.nearest_area[0] && data.nearest_area[0].areaName && data.nearest_area[0].areaName[0] && data.nearest_area[0].areaName[0].value) || locationName;
      const forecasts = data.weather || [];

      // 1. 建立 Telegram 10.3 Native Rich Table
      const headers = ['日期', '天氣', '最高', '最低', '降雨%'];
      const tableRows = forecasts.map((day, index) => {
        const [y, m, d] = (day.date || '').split('-').map(Number);
        let dateLabel = '—';
        if (y && m && d) {
          const date = new Date(Date.UTC(y, m - 1, d));
          const dayName = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'][date.getUTCDay()];
          dateLabel = index === 0 ? '今天' : index === 1 ? '明天' : (index === 2 ? '後天' : dayName);
        }
        const midHour = (day.hourly && (day.hourly[4] || day.hourly[Math.floor(day.hourly.length / 2)])) || {};
        const rawDesc = (midHour.lang_zh && midHour.lang_zh[0]?.value) || (midHour.weatherDesc && midHour.weatherDesc[0]?.value) || '';
        const weatherDesc = translateWeatherDesc(rawDesc);
        const rainChance = midHour.chanceofrain ? `${midHour.chanceofrain}%` : '—';
        return [
          dateLabel,
          weatherDesc,
          `${day.maxtempC || '—'}°C`,
          `${day.mintempC || '—'}°C`,
          rainChance
        ];
      });

      const weatherTable = buildRichTable({
        headers,
        rows: tableRows,
        caption: `${resolvedName} 未來預報`,
        is_compact: true,
        is_striped: true
      });

      // 2. 建立 Inline Keyboard 快捷選單（含 64-byte 截斷保護與快捷按鈕矩陣）
      let safeCity = locationName;
      while (new TextEncoder().encode('/wt:' + safeCity).length > 64 && safeCity.length > 0) {
        safeCity = Array.from(safeCity).slice(0, -1).join('');
      }
      const reloadCallback = safeCity ? `/wt:${safeCity}` : '/wt';

      const keyboard = buildInlineKeyboard([
        [
          { text: '🔄 重新整理', callback_data: reloadCallback },
          { text: '⚠️ 天氣特報', callback_data: '/weatheralert' }
        ],
        [
          { text: '📍 台北', callback_data: '/wt:台北' },
          { text: '📍 台中', callback_data: '/wt:台中' },
          { text: '📍 高雄', callback_data: '/wt:高雄' }
        ],
        [
          { text: '📍 新竹', callback_data: '/wt:新竹' },
          { text: '📍 台南', callback_data: '/wt:台南' },
          { text: '📍 花蓮', callback_data: '/wt:花蓮' }
        ]
      ]);

      if (context && context.CURRENT_CHAT_CONTEXT) {
        context.CURRENT_CHAT_CONTEXT.reply_markup = keyboard;
        context.CURRENT_CHAT_CONTEXT.parse_mode = 'HTML';
      }

      // 3. 格式化相容備援文字（<pre><code> 等寬無贅詞卡片）
      const formattedWeatherInfo = formatWeatherCard(data, resolvedName);

      if (weatherTable) {
        return sendRichMessageWithContext(context)({ blocks: [weatherTable] }, formattedWeatherInfo);
      } else {
        return sendMessageToTelegramWithContext(context)(formattedWeatherInfo);
      }
    } else {
      if (context && context.CURRENT_CHAT_CONTEXT) {
        context.CURRENT_CHAT_CONTEXT.parse_mode = 'HTML';
      }
      return sendMessageToTelegramWithContext(context)(`<b>🌦️ 天氣查詢</b>\n\n<pre><code>未找到 ${escape(locationName)} 的天氣資訊。</code></pre>`);
    }
  } catch (e) {
    if (context && context.CURRENT_CHAT_CONTEXT) {
      context.CURRENT_CHAT_CONTEXT.parse_mode = 'HTML';
    }
    return sendMessageToTelegramWithContext(context)(`<b>🌦️ 天氣查詢</b>\n\n<pre><code>查詢失敗: ${escape(e.message)}</code></pre>`);
  }
}

/**
 * 格式化天氣卡片（無贅詞、等寬對齊、<pre><code> 風格）
 * @param {Object} data - API 回傳的天氣資料
 * @param {string} [locationName] - 查詢地點名稱
 * @returns {string} 格式化 HTML 卡片
 */
export function formatWeatherCard(data, locationName) {
  const resolvedName = locationName || (data.nearest_area && data.nearest_area[0]?.areaName?.[0]?.value) || '預報';
  const current = data.current_condition?.[0] || {};
  const forecasts = data.weather || [];

  const temp = current.temp_C ?? '—';
  const feelsLike = current.FeelsLikeC ?? '—';
  const rawDesc = (current.lang_zh && current.lang_zh[0]?.value) || (current.weatherDesc && current.weatherDesc[0]?.value) || '';
  const desc = translateWeatherDesc(rawDesc);
  const humidity = current.humidity ?? '—';
  const rain = current.chanceofrain ?? (forecasts[0]?.hourly?.[4]?.chanceofrain ?? '0');
  const uv = current.uvIndex ?? '—';
  const windDir = translateWindDir(current.winddir16Point);
  const windSpeed = current.windspeedKmph ?? '—';

  let card = `現況  ${temp}°C (體感 ${feelsLike}°C)  ${desc}\n`;
  card += `指標  濕度 ${humidity}% | 降雨 ${rain}% | UV ${uv}\n`;
  card += `風向  ${windDir} ${windSpeed} km/h\n\n`;
  card += `[ 未來預報 ]\n`;

  forecasts.forEach((day, index) => {
    const [y, m, d] = (day.date || '').split('-').map(Number);
    let dateLabel = '—';
    if (y && m && d) {
      const date = new Date(Date.UTC(y, m - 1, d));
      const dayName = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'][date.getUTCDay()];
      dateLabel = index === 0 ? '今天' : index === 1 ? '明天' : (index === 2 ? '後天' : dayName);
    }

    const midHour = (day.hourly && (day.hourly[4] || day.hourly[Math.floor(day.hourly.length / 2)])) || {};
    const dayRawDesc = (midHour.lang_zh && midHour.lang_zh[0]?.value) || (midHour.weatherDesc && midHour.weatherDesc[0]?.value) || '';
    const dayDesc = translateWeatherDesc(dayRawDesc);
    const dayRain = midHour.chanceofrain ? `${midHour.chanceofrain}%` : '—';
    const tempRange = `${day.mintempC || '—'}~${day.maxtempC || '—'}°C`;

    const colDate = padEndVisual(dateLabel, 6);
    const colTemp = padEndVisual(tempRange, 10);
    const colRain = padEndVisual(`降雨 ${dayRain}`, 10);
    card += `${colDate}${colTemp}${colRain}${dayDesc}\n`;
  });

  return `<b>🌦️ ${escape(resolvedName)} 的天氣預報</b>\n\n<pre><code>${escape(card.trimEnd())}</code></pre>`;
}

// 相容舊名稱別名
export const formatWeatherInfo = formatWeatherCard;

/**
 * 設定天氣特報快捷選單按鈕
 */
function setWeatherAlertMenu(context) {
  if (context && context.CURRENT_CHAT_CONTEXT) {
    context.CURRENT_CHAT_CONTEXT.reply_markup = buildInlineKeyboard([
      [
        { text: '🔄 重新整理特報', callback_data: '/weatheralert' },
        { text: '🌦️ 台北天氣', callback_data: '/wt:台北' },
        { text: '🌦️ 高雄天氣', callback_data: '/wt:高雄' }
      ]
    ]);
  }
}

/**
 * 格式化中央氣象署天氣特報卡片
 * @param {Object} data - CWA API 回傳的特報資料
 * @returns {string} 格式化 HTML 卡片
 */
export function formatWeatherAlertCard(data) {
  if (!data?.records?.location) {
    return `<b>⚠️ 台灣即時天氣特報</b>\n\n<pre><code>無法取得即時天氣特報資料</code></pre>`;
  }

  // 依警報現象分組 (phenomena + significance)
  const alertGroups = new Map();
  for (const loc of data.records.location) {
    const hazards = loc.hazardConditions?.hazards || [];
    for (const h of hazards) {
      const info = h.info || {};
      const key = `${info.phenomena || ''}${info.significance || '特報'}`;
      if (!key) continue;

      if (!alertGroups.has(key)) {
        alertGroups.set(key, {
          title: key,
          locations: [],
          startTime: h.validTime?.startTime || '',
          endTime: h.validTime?.endTime || ''
        });
      }
      const group = alertGroups.get(key);
      if (!group.locations.includes(loc.locationName)) {
        group.locations.push(loc.locationName);
      }
    }
  }

  if (alertGroups.size === 0) {
    return `<b>⚠️ 台灣即時天氣特報</b>\n\n<pre><code>全台各地目前無即時天氣特報發布</code></pre>`;
  }

  let card = '';
  for (const [_, group] of alertGroups) {
    card += `[ ${group.title} ]\n`;
    card += `範圍  ${group.locations.join('、')}\n`;
    if (group.startTime && group.endTime) {
      const formatTime = (t) => t.replace(/^\d{4}-/, '').replace('-', '/').replace(/:\d{2}$/, '');
      card += `時間  ${formatTime(group.startTime)} ~ ${formatTime(group.endTime)}\n`;
    }
    card += '\n';
  }

  return `<b>⚠️ 台灣即時天氣特報</b>\n\n<pre><code>${escape(card.trimEnd())}</code></pre>`;
}

/**
 * 台灣天氣特報指令
 * @param {Object} message - Telegram 訊息對象
 * @param {string} command - 指令名稱
 * @param {string} subcommand - 子指令參數
 * @param {Object} context - 上下文對象
 */
export async function commandWeatherAlert(message, command, subcommand, context) {
  const url = 'https://opendata.cwa.gov.tw/api/v1/rest/datastore/W-C0033-001?Authorization=CWA-AFB7BD45-6D32-4CA4-B619-D8BBC81B1ABA&format=JSON';

  try {
    const response = await fetch(url);
    const text = await response.text();

    if (context && context.CURRENT_CHAT_CONTEXT) {
      context.CURRENT_CHAT_CONTEXT.parse_mode = 'HTML';
    }
    setWeatherAlertMenu(context);

    // 檢查回應是否為有效的 JSON 格式
    if (text.startsWith('{') && text.endsWith('}')) {
      try {
        const data = JSON.parse(text);
        const weatherReport = formatWeatherAlertCard(data);
        return sendMessageToTelegramWithContext(context)(weatherReport);
      } catch (jsonError) {
        return sendMessageToTelegramWithContext(context)(`<b>⚠️ 台灣即時天氣特報</b>\n\n<pre><code>無法解析中央氣象署資料</code></pre>`);
      }
    } else {
      return sendMessageToTelegramWithContext(context)(`<b>⚠️ 台灣即時天氣特報</b>\n\n<pre><code>中央氣象署 API 回應異常</code></pre>`);
    }
  } catch (e) {
    return sendMessageToTelegramWithContext(context)(`<b>⚠️ 台灣即時天氣特報</b>\n\n<pre><code>查詢失敗: ${escape(e.message)}</code></pre>`);
  }
}
