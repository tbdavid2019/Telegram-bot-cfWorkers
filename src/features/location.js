/**
 * Location Features
 * 地理位置查詢功能 (Google Maps Places API)
 */

import { sendMessageToTelegramWithContext, answerCallbackQuery } from '../telegram/telegram.js';
import { ENV } from '../config/env.js';

/**
 * 處理位置訊息
 * @param {Object} message - Telegram 訊息
 * @param {Object} context - 上下文
 */
export async function handleLocationMessage(message, context) {
  // 檢查是否啟用位置服務
  if (!ENV.ENABLE_LOCATION_SERVICE) {
    return null;
  }

  if (!message.location) {
    return null;
  }

  const { latitude, longitude } = message.location;

  // 構建選擇按鈕
  // 使用 callback_data 傳遞經緯度和類型: /loc:type:lat,lon
  // 為了節省長度，我們把座標取小數點後 6 位
  const lat = parseFloat(latitude).toFixed(6);
  const lon = parseFloat(longitude).toFixed(6);

  const buttons = [
    [
      { text: "⛽ 加油站", callback_data: `/loc:gas_station:${lat},${lon}` },
      { text: "🅿️ 停車場", callback_data: `/loc:parking:${lat},${lon}` }
    ],
    [
      { text: "🏪 超商", callback_data: `/loc:convenience_store:${lat},${lon}` },
      { text: "☕ 咖啡廳", callback_data: `/loc:cafe:${lat},${lon}` }
    ],
    [
      { text: "🍽️ 餐廳", callback_data: `/loc:restaurant:${lat},${lon}` },
      { text: "🏧 ATM", callback_data: `/loc:atm:${lat},${lon}` }
    ]
  ];

  context.CURRENT_CHAT_CONTEXT.reply_markup = JSON.stringify({
    inline_keyboard: buttons
  });

  return sendMessageToTelegramWithContext(context)(`📍 收到您的位置！\n(${lat}, ${lon})\n\n請問您想尋找附近的什麼設施？`);
}

/**
 * 處理位置查詢的回調
 */
export async function handleLocationCallback(message, context) {
  const callbackData = message.callback_query?.data;
  if (!callbackData || !callbackData.startsWith('/loc:')) {
    return null;
  }

  // 檢查是否啟用位置服務
  if (!ENV.ENABLE_LOCATION_SERVICE) {
    return sendMessageToTelegramWithContext(context)("⚠️ 位置服務已在配置中禁用。");
  }

  // 格式: /loc:type:lat,lon
  const parts = callbackData.split(':');
  if (parts.length < 3) return null;

  const type = parts[1];
  const coords = parts[2].split(',');
  if (coords.length < 2) return null;

  const lat = parseFloat(coords[0]);
  const lon = parseFloat(coords[1]);

  await sendMessageToTelegramWithContext(context)(`🔍 正在搜尋附近的 ${getReadableType(type)}...`);

  try {
    const places = await searchNearbyPlaces(lat, lon, type);
    if (places.length === 0) {
      return sendMessageToTelegramWithContext(context)(`⚠️ 在您附近找不到 ${getReadableType(type)}。`);
    }

    let reply = `📍 附近的 *${getReadableType(type)}*：\n\n`;

    for (const place of places) {
      const name = place.displayName?.text || place.name;
      const rating = place.rating ? `⭐ ${place.rating}` : '';
      const address = place.shortFormattedAddress || place.formattedAddress || '';
      const googleMapsUrl = place.googleMapsUri || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}&query_place_id=${place.name.split('/').pop()}`;

      // 計算大約距離 (簡單估算，非精確)
      // Google API 其實有返回 distanceMeters，如果有則使用
      const distance = place.distanceMeters ? ` (${place.distanceMeters}m)` : '';

      // 判斷是否營業中
      const isOpen = place.regularOpeningHours?.openNow ? '🟢 營業中' : (place.regularOpeningHours ? '🔴 休息中' : '');

      reply += `[${name}](${googleMapsUrl}) ${rating}\n`;
      reply += `${address}${distance}\n`;
      if (isOpen) reply += `${isOpen}\n`;
      reply += `━━━━━━━━━━━━━━━\n`;
    }

    context.CURRENT_CHAT_CONTEXT.parse_mode = "Markdown";
    // 移除鍵盤
    // context.CURRENT_CHAT_CONTEXT.reply_markup = JSON.stringify({ remove_keyboard: true }); 
    // 不，我們可能想保留之前的 inline keyboard，或者發送新的。
    // 這裡我們不設置 reply_markup 來讓它只顯示文本，或者我們可以給一個"清除"按鈕。

    return sendMessageToTelegramWithContext(context)(reply);

  } catch (error) {
    console.error('Values API Error:', error);
    return sendMessageToTelegramWithContext(context)(`❌ 搜尋發生錯誤: ${error.message}`);
  }
}

function getReadableType(type) {
  const map = {
    'gas_station': '加油站',
    'restaurant': '餐廳',
    'convenience_store': '便利商店',
    'parking': '停車場',
    'cafe': '咖啡廳',
    'atm': 'ATM'
  };
  return map[type] || type;
}

/**
 * GPS 指令 - 請求用戶發送位置
 * @param {Object} message - Telegram 訊息
 * @param {string} command - 指令名稱
 * @param {string} subcommand - 子指令參數
 * @param {Object} context - 上下文對象
 */
export async function commandGPS(message, command, subcommand, context) {
  // 檢查是否啟用位置服務
  if (!ENV.ENABLE_LOCATION_SERVICE) {
    return sendMessageToTelegramWithContext(context)("⚠️ 位置服務未啟用。");
  }

  const keyboard = {
    keyboard: [
      [{ text: "📍 分享我的位置 (Share Location)", request_location: true }]
    ],
    resize_keyboard: true,
    one_time_keyboard: true
  };

  context.CURRENT_CHAT_CONTEXT.reply_markup = JSON.stringify(keyboard);
  return sendMessageToTelegramWithContext(context)("請點擊下方按鈕分享您的位置，以便查詢附近設施。");
}

/**
 * 呼叫 Google Places API (New)
 */
async function searchNearbyPlaces(lat, lon, type) {
  // 優先使用 GOOGLE_MAPS_API_KEY，如果沒有則使用 GOOGLE_API_KEY (Fallback)
  const apiKey = ENV.USER_CONFIG.GOOGLE_MAPS_API_KEY || ENV.USER_CONFIG.GOOGLE_API_KEY;

  if (!apiKey) {
    throw new Error("GOOGLE_MAPS_API_KEY (or GOOGLE_API_KEY) is not configured");
  }

  // 根據類型選擇使用 searchNearby (明確類型) 或 searchText (關鍵字)
  // New Places API: https://places.googleapis.com/v1/places:searchNearby

  const url = `https://places.googleapis.com/v1/places:searchNearby`;

  let requestBody = {
    locationRestriction: {
      circle: {
        center: {
          latitude: lat,
          longitude: lon
        },
        radius: 1000.0 // 1公里
      }
    },
    maxResultCount: 5,
    rankPreference: "DISTANCE",
    languageCode: "zh-TW"
  };

  if (type === 'toilet') {
    // 廁所比較特殊，移除。
    // 如果未來需要，可以參考之前的實現。
    throw new Error("Toilet search is removed");
  } else {
    requestBody.includedTypes = [type];
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      // FieldMask 是必須的
      'X-Goog-FieldMask': 'places.name,places.displayName,places.formattedAddress,places.shortFormattedAddress,places.rating,places.googleMapsUri,places.regularOpeningHours,places.location',
      // 加入 Referer Header 以通過 Google API 的 HTTP Referrer 限制 (使用您白名單中的網域)
      'Referer': 'https://tbdavid2019.github.io/'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Google API Error: ${response.status} - ${errText}`);
  }

  const data = await response.json();

  // 計算距離 (簡單的 Haversine，因為 searchNearby 不一定總是返回 distanceMeters，除非我們要求)
  // 其實 searchNearby 本身不返回 distanceMeters ? 
  // 根據文檔，searchNearby 的 response 是 { places: [] }
  // 對，它不直接返回 distanceMeters，我們需要自己算或者不在意。
  // 為了使用者體驗，簡單算一下好了。

  const places = data.places || [];
  return places.map(p => ({
    ...p,
    distanceMeters: calculateDistance(lat, lon, p.location.latitude, p.location.longitude)
  }));
}

async function searchByText(lat, lon, query) {
  // 優先使用 GOOGLE_MAPS_API_KEY，如果沒有則使用 GOOGLE_API_KEY (Fallback)
  const apiKey = ENV.USER_CONFIG.GOOGLE_MAPS_API_KEY || ENV.USER_CONFIG.GOOGLE_API_KEY;

  if (!apiKey) {
    throw new Error("GOOGLE_MAPS_API_KEY (or GOOGLE_API_KEY) is not configured");
  }

  const url = `https://places.googleapis.com/v1/places:searchText`;

  const requestBody = {
    textQuery: query,
    locationBias: {
      circle: {
        center: {
          latitude: lat,
          longitude: lon
        },
        radius: 1000.0
      }
    },
    maxResultCount: 5,
    rankPreference: "DISTANCE", // 對 searchText 有效
    languageCode: "zh-TW"
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'places.name,places.displayName,places.formattedAddress,places.shortFormattedAddress,places.rating,places.googleMapsUri,places.regularOpeningHours,places.location',
      // 加入 Referer Header 以通過 Google API 的 HTTP Referrer 限制
      'Referer': 'https://tbdavid2019.github.io/'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Google API Text Search Error: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  const places = data.places || [];
  return places.map(p => ({
    ...p,
    distanceMeters: calculateDistance(lat, lon, p.location.latitude, p.location.longitude)
  }));
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}
