// 測試法律問答 API
async function testLawAPI() {
  const question = "AI產生的不實訊息，散播者會構成加重誹謗罪嗎？";
  const url = 'https://taiwan-law-bot-dev.onrender.com/chat';
  
  const payload = {
    messages: [
      {
        role: "user",
        content: question
      }
    ],
    stream: true,
    is_paid_user: true,
    is_thinking_mode: true,
    general_public_mode: false,
    writing_mode: true,
    ai_high_court_only: false,
    model: "gpt-4o"
  };

  try {
    console.log('發送請求到:', url);
    console.log('請求內容:', JSON.stringify(payload, null, 2));
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    console.log('回應狀態:', response.status);
    console.log('回應標頭:', Object.fromEntries(response.headers.entries()));
    
    const text = await response.text();
    console.log('回應內容長度:', text.length);
    console.log('回應內容前500字符:', text.substring(0, 500));
    
    // 嘗試解析串流回應
    if (text.includes('data: ')) {
      console.log('\n=== 解析串流回應 ===');
      const lines = text.split('\n');
      let fullResponse = '';
      
      for (const line of lines) {
        if (line.startsWith('data: ') && !line.includes('[DONE]')) {
          try {
            const dataStr = line.substring(6);
            if (dataStr.trim()) {
              const data = JSON.parse(dataStr);
              if (data.choices && data.choices[0] && data.choices[0].delta && data.choices[0].delta.content) {
                fullResponse += data.choices[0].delta.content;
              }
            }
          } catch (e) {
            // 忽略解析錯誤的行
          }
        }
      }
      
      console.log('完整回應:', fullResponse);
    }
    
  } catch (error) {
    console.error('錯誤:', error.message);
  }
}

// 如果是 Node.js 環境則運行測試
if (typeof fetch === 'undefined') {
  // Node.js 環境，使用 node-fetch 或其他 fetch polyfill
  console.log('請在瀏覽器環境或有 fetch 支援的環境中運行此測試');
} else {
  testLawAPI();
}
