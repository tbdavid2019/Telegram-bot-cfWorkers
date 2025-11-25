/**
 * Weather Features
 * 天氣查詢功能
 */

import { sendMessageToTelegramWithContext } from '../telegram/telegram.js';

/**
 * 天氣查詢指令
 * @param {Object} message - Telegram 訊息對象
 * @param {string} command - 指令名稱
 * @param {string} subcommand - 子指令參數
 * @param {Object} context - 上下文對象
 */
export async function commandWeather(message, command, subcommand, context) {
  const locationName = subcommand.trim();

  if (!locationName) {
    return sendMessageToTelegramWithContext(context)('請提供地區名稱。用法：/wt <地區名稱>');
  }

  const url = `https://wttr.in/${encodeURIComponent(locationName)}?format=j1&lang=zh`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data && data.current_condition && data.current_condition.length > 0) {
      const formattedWeatherInfo = formatWeatherInfo(data);
      return sendMessageToTelegramWithContext(context)(formattedWeatherInfo);
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
  const forecasts = data.weather;

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

  const forecastInfo = forecasts.map((day, index) => {
    const date = new Date(day.date);
    const dayName = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][date.getDay()];
    return `
${index === 0 ? '今天' : index === 1 ? '明天' : dayName} (${day.date}):
天氣狀況：${day.hourly[4].lang_zh[0].value}
最高溫度：${day.maxtempC}°C
最低溫度：${day.mintempC}°C
降雨機率：${day.hourly[4].chanceofrain}%
    `;
  }).join('\n');

  return `
${locationName} 的天氣預報：

${currentWeather}

未來預報：
${forecastInfo}
  `;
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
