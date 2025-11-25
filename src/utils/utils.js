/**
 * Utility Functions
 * 通用工具函數
 */

/**
 * 渲染 HTML 頁面
 * @param {string} body - HTML body 內容
 * @returns {string} 完整的 HTML
 */
export function renderHTML(body) {
  return `
<html>  
  <head>
    <title>ChatGPT-Telegram-Workers</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="ChatGPT-Telegram-Workers">
    <meta name="author" content="TBXark">
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
        font-size: 1rem;
        font-weight: 400;
        line-height: 1.5;
        color: #212529;
        text-align: left;
        background-color: #fff;
      }
      h1 {
        margin-top: 0;
        margin-bottom: 0.5rem;
      }
      p {
        margin-top: 0;
        margin-bottom: 1rem;
      }
      a {
        color: #007bff;
        text-decoration: none;
        background-color: transparent;
      }
      a:hover {
        color: #0056b3;
        text-decoration: underline;
      }
      strong {
        font-weight: bolder;
      }
    </style>
  </head>
  <body>
    ${body}
  </body>
</html>
  `;
}

/**
 * 將錯誤轉換為字串
 * @param {Error} e - 錯誤對象
 * @returns {string} JSON 字串
 */
export function errorToString(e) {
  return JSON.stringify({
    message: e.message,
    stack: e.stack
  });
}

/**
 * 確保回應狀態碼為 200
 * @param {Response|null} resp - 回應對象
 * @returns {Response} 狀態碼為 200 的回應
 */
export function makeResponse200(resp) {
  if (resp === null) {
    return new Response('NOT HANDLED', { status: 200 });
  }
  if (resp.status === 200) {
    return resp;
  } else {
    return new Response(resp.body, {
      status: 200,
      headers: {
        'Original-Status': resp.status,
        ...resp.headers
      }
    });
  }
}

/**
 * 隨機選擇陣列中的一個元素
 * @param {Array} array - 陣列
 * @returns {*} 隨機元素
 */
export function randomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * 格式化時間戳
 * @param {number} timestamp - Unix 時間戳
 * @returns {string} 格式化的時間字串
 */
export function formatTimestamp(timestamp) {
  return new Date(timestamp * 1000).toLocaleString('zh-TW', {
    timeZone: 'Asia/Taipei'
  });
}
