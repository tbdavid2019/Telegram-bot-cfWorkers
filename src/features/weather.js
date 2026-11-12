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

// 預設的快捷城市列表
const QUICK_CITIES = [
  { name: '高雄市', callback: '/wt:高雄市' },
  { name: '台北市', callback: '/wt:台北市' },
  { name: '嘉義市', callback: '/wt:嘉義市' },
  { name: '台中市', callback: '/wt:台中市' },
  { name: '新竹市', callback: '/wt:新竹市' },
  { name: '台南市', callback: '/wt:台南市' },
];

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
  let msg = `🌤️ *天氣查詢*\n`;
  msg += `━━━━━━━━━━━━━━━\n`;
  msg += `請選擇城市或手動輸入：\n\n`;
  msg += `*手動查詢方式:*\n`;
  msg += `/wt <城市名稱>\n`;
  msg += `例: \`/wt 花蓮市\`\n`;
  msg += `例: \`/wt Tokyo\`\n`;

  // 建立 inline keyboard 按鈕（每行 2 個按鈕）
  const buttons = [];
  let row = [];

  for (let i = 0; i < QUICK_CITIES.length; i++) {
    const city = QUICK_CITIES[i];
    row.push({
      text: city.name,
      callback_data: city.callback
    });

    // 每 2 個按鈕換一行
    if (row.length === 2 || i === QUICK_CITIES.length - 1) {
      buttons.push(row);
      row = [];
    }
  }

  // 設定 inline keyboard
  context.CURRENT_CHAT_CONTEXT.reply_markup = JSON.stringify({
    inline_keyboard: buttons
  });

  context.CURRENT_CHAT_CONTEXT.parse_mode = "Markdown";
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
        const [y, m, d] = day.date.split('-').map(Number);
        const date = new Date(Date.UTC(y, m - 1, d));
        const dayName = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'][date.getUTCDay()];
        const dateLabel = index === 0 ? '今天' : index === 1 ? '明天' : dayName;
        const weatherDesc = (day.hourly && day.hourly[4] && day.hourly[4].lang_zh && day.hourly[4].lang_zh[0]?.value) || '—';
        const rainChance = (day.hourly && day.hourly[4] && day.hourly[4].chanceofrain) ? `${day.hourly[4].chanceofrain}%` : '—';
        return [
          dateLabel,
          weatherDesc,
          `${day.maxtempC}°C`,
          `${day.mintempC}°C`,
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

      // 2. 建立 Inline Keyboard 快捷選單
      const keyboard = buildInlineKeyboard([
        [
          { text: '🔄 重新整理', callback_data: `/wt:${locationName}` },
          { text: '🌦️ 選擇其他城市', callback_data: '/wt' }
        ]
      ]);
      if (context && context.CURRENT_CHAT_CONTEXT) {
        context.CURRENT_CHAT_CONTEXT.reply_markup = keyboard;
      }

      // 3. 格式化相容備援文字（含 Markdown 表格，供 fallback 時呈現方框格線）
      const formattedWeatherInfo = formatWeatherInfo(data);

      if (weatherTable) {
        return sendRichMessageWithContext(context)({ blocks: [weatherTable] }, formattedWeatherInfo);
      } else {
        return sendMessageToTelegramWithContext(context)(formattedWeatherInfo);
      }
    } else {
      return sendMessageToTelegramWithContext(context)(`未找到 ${locationName} 的天氣信息。`);
    }
  } catch (e) {
    return sendMessageToTelegramWithContext(context)(`ERROR: ${e.message}`);
  }
}

/**
 * 格式化天氣資訊
 * @param {Object} data - API 回傳的天氣資料
 * @returns {string} 格式化的天氣資訊
 */
function formatWeatherInfo(data) {
  const locationName = data.nearest_area[0].areaName[0].value;
  const current = data.current_condition[0];
  const forecasts = data.weather || [];

  const currentWeather = `
當前天氣：
溫度：${current.temp_C}°C
體感溫度：${current.FeelsLikeC}°C
天氣狀況：${current.lang_zh[0].value}
降雨機率：${current.chanceofrain}%
濕度：${current.humidity}%
風速：${current.windspeedKmph} km/h
風向：${current.winddir16Point}
  `;

  // 附帶 Markdown 表格供 Fallback 呈現精緻 Box-drawing
  let tableMd = `\n| 日期 | 天氣狀況 | 最高溫 | 最低溫 | 降雨機率 |\n| :--- | :--- | :--- | :--- | :--- |\n`;
  forecasts.forEach((day, index) => {
    const [y, m, d] = day.date.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    const dayName = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'][date.getUTCDay()];
    const dateLabel = index === 0 ? '今天' : index === 1 ? '明天' : dayName;
    const weatherDesc = (day.hourly && day.hourly[4] && day.hourly[4].lang_zh && day.hourly[4].lang_zh[0]?.value) || '—';
    const rainChance = (day.hourly && day.hourly[4] && day.hourly[4].chanceofrain) ? `${day.hourly[4].chanceofrain}%` : '—';
    tableMd += `| ${dateLabel} | ${weatherDesc} | ${day.maxtempC}°C | ${day.mintempC}°C | ${rainChance} |\n`;
  });

  return `${locationName} 的天氣預報：\n${currentWeather}\n未來預報：\n${tableMd}`;
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

    // 檢查回應是否為有效的 JSON 格式
    if (text.startsWith('{') && text.endsWith('}')) {
      try {
        const data = JSON.parse(text);

        if (data.records && data.records.location) {
          const locations = data.records.location;
          let weatherReport = '天氣特報:\n';

          locations.forEach(location => {
            if (location.hazardConditions.hazards.length > 0) {
              const hazard = location.hazardConditions.hazards[0].info;
              weatherReport += `縣市: ${location.locationName}\n特報內容: ${hazard.phenomena} - ${hazard.significance}\n`;
              weatherReport += `時間: ${location.hazardConditions.hazards[0].validTime.startTime} ~ ${location.hazardConditions.hazards[0].validTime.endTime}\n\n`;
            }
          });

          if (weatherReport === '天氣特報:\n') {
            weatherReport = '目前沒有特報內容。';
          }

          return sendMessageToTelegramWithContext(context)(weatherReport);
        } else {
          return sendMessageToTelegramWithContext(context)('抱歉，無法取得天氣特報。');
        }
      } catch (jsonError) {
        return sendMessageToTelegramWithContext(context)(`錯誤: 無法解析JSON回應。回應內容: ${text}`);
      }
    } else {
      return sendMessageToTelegramWithContext(context)(`錯誤: API回應錯誤，內容: ${text}`);
    }
  } catch (e) {
    return sendMessageToTelegramWithContext(context)(`錯誤: ${e.message}`);
  }
}
