/**
 * Law Features
 * 法律問答功能
 */

import { sendMessageToTelegramWithContext } from '../telegram/telegram.js';

/**
 * 分段發送長訊息的輔助函數
 * @param {Object} context - 上下文對象
 * @param {string} message - 訊息內容
 * @param {number} maxLength - 最大長度
 */
async function sendLongMessage(context, message, maxLength = 4000) {
  if (message.length <= maxLength) {
    return sendMessageToTelegramWithContext(context)(message);
  }

  const parts = [];
  let currentPart = '';
  const lines = message.split('\n');

  for (const line of lines) {
    if ((currentPart + line + '\n').length > maxLength) {
      if (currentPart) {
        parts.push(currentPart.trim());
        currentPart = '';
      }
      
      // 如果單行就超過限制，強制分割
      if (line.length > maxLength) {
        let remainingLine = line;
        while (remainingLine.length > maxLength) {
          parts.push(remainingLine.substring(0, maxLength));
          remainingLine = remainingLine.substring(maxLength);
        }
        if (remainingLine) {
          currentPart = remainingLine + '\n';
        }
      } else {
        currentPart = line + '\n';
      }
    } else {
      currentPart += line + '\n';
    }
  }

  if (currentPart.trim()) {
    parts.push(currentPart.trim());
  }

  // 依序發送每個部分
  for (let i = 0; i < parts.length; i++) {
    const partMessage = i === 0 ? parts[i] : `(續 ${i + 1}/${parts.length})\n\n${parts[i]}`;
    await sendMessageToTelegramWithContext(context)(partMessage);
    
    // 在多段訊息之間添加小延遲，避免發送過快
    if (i < parts.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
}

/**
 * 法律問答指令
 * @param {Object} message - Telegram 訊息對象
 * @param {string} command - 指令名稱
 * @param {string} subcommand - 法律問題
 * @param {Object} context - 上下文對象
 */
export async function commandLaw(message, command, subcommand, context) {
  const question = (subcommand || '').trim();
  if (!question) {
    return sendMessageToTelegramWithContext(context)('錯誤: 請在指令後面輸入法律問題。例如：/law AI產生的不實訊息，散播者會構成加重誹謗罪嗎？');
  }

  const url = 'https://taiwan-law-bot-dev.onrender.com/chat';
  const payload = {
    messages: [
      {
        role: 'user',
        content: question
      }
    ],
    stream: true,
    is_paid_user: true,
    is_thinking_mode: true,
    general_public_mode: false,
    writing_mode: true,
    ai_high_court_only: false,
    model: 'gpt-4o'
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return sendMessageToTelegramWithContext(context)(`錯誤: API回應狀態 ${response.status}`);
    }

    const text = await response.text();

    // 處理包含法律搜索結果的 JSON 響應
    if (text.startsWith('{') && text.endsWith('}')) {
      try {
        const data = JSON.parse(text);
        
        // 檢查是否有 AI 回答
        let aiAnswer = '';
        if (data.choices && data.choices[0] && data.choices[0].message) {
          aiAnswer = data.choices[0].message.content || '';
        }
        
        // 組裝回答
        let reply = `【法律問答】\n問題：${question}\n\n`;
        
        if (aiAnswer) {
          reply += `AI 分析：\n${aiAnswer}\n\n`;
        }
        
        // 檢查是否有相關判決案例
        if (data.related_cases && Array.isArray(data.related_cases) && data.related_cases.length > 0) {
          reply += `📚 相關判決案例：\n\n`;
          
          // 只顯示前3個最相關的案例
          const casesToShow = data.related_cases.slice(0, 3);
          
          casesToShow.forEach((case_item, index) => {
            reply += `${index + 1}. ${case_item.title || '判決案例'}\n`;
            reply += `   法院：${case_item.court || '未知'}\n`;
            reply += `   案號：${case_item.case_number || '未知'}\n`;
            
            if (case_item.summary) {
              // 摘要太長時截取前200字
              let summary = case_item.summary;
              if (summary.length > 200) {
                summary = summary.substring(0, 200) + '...';
              }
              reply += `   摘要：${summary}\n`;
            }
            
            if (case_item.score) {
              reply += `   相關度：${(case_item.score * 100).toFixed(1)}%\n`;
            }
            
            reply += '\n';
          });
          
          if (data.related_cases.length > 3) {
            reply += `還有 ${data.related_cases.length - 3} 個相關案例...\n\n`;
          }
        }
        
        reply += '※ 此回答僅供參考，如有具體法律問題請諮詢專業律師。';
        
        return sendLongMessage(context, reply);
        
      } catch (e) {
        return sendMessageToTelegramWithContext(context)(`錯誤: 無法解析API回應。錯誤詳情: ${e.message}`);
      }
    }

    // 處理流式回應格式 (如果是 Server-Sent Events)
    if (text.includes('data: ')) {
      const lines = text.split('\n');
      let fullResponse = '';
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.substring(6);
          if (jsonStr === '[DONE]') break;
          
          try {
            const data = JSON.parse(jsonStr);
            if (data.choices && data.choices[0] && data.choices[0].delta) {
              fullResponse += data.choices[0].delta.content || '';
            }
          } catch (e) {
            // 忽略解析錯誤
          }
        }
      }
      
      if (fullResponse) {
        const reply = `【法律問答】\n問題：${question}\n\nAI 分析：\n${fullResponse}\n\n※ 此回答僅供參考，如有具體法律問題請諮詢專業律師。`;
        return sendLongMessage(context, reply);
      }
    }

    return sendMessageToTelegramWithContext(context)(`錯誤: 無法處理API回應。`);
  } catch (e) {
    return sendMessageToTelegramWithContext(context)(`錯誤: ${e.message}`);
  }
}
