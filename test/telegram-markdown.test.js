import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { markdownToTelegramHtml, balanceTelegramHtmlTags } from '../src/utils/md2tgmd.js';
import { sendMessageToTelegram } from '../src/telegram/telegram.js';

describe('Telegram Markdown / HTML Rendering', () => {
  test('應將 **bold: ** 容錯轉換為 Telegram 支援之 <b> 標籤', () => {
    const input = '1. **季度獲利連番超預期 (Beat Rate 100%): **\n回顧近四季...';
    const output = markdownToTelegramHtml(input);
    assert.match(output, /<b>季度獲利連番超預期 \(Beat Rate 100%\): <\/b>/);
  });

  test('應將清單開頭之 * 與後續粗體分離，轉為 • 避免實體解析衝突', () => {
    const input = '* **當前市值: ** 約 **58.089 兆 TWD**。';
    const output = markdownToTelegramHtml(input);
    assert.equal(output, '• <b>當前市值: </b> 約 <b>58.089 兆 TWD</b>。');
  });

  test('應支援破折號與加號清單符號轉換為 •', () => {
    const input = '- 項目一\n+ 項目二';
    const output = markdownToTelegramHtml(input);
    assert.equal(output, '• 項目一\n• 項目二');
  });

  test('變數名稱與識別碼中的底線不應誤轉為斜體', () => {
    const input = '變數為 DEFAULT_LLM_PROFILE 與 user_config_key';
    const output = markdownToTelegramHtml(input);
    assert.equal(output, '變數為 DEFAULT_LLM_PROFILE 與 user_config_key');
  });

  test('獨立文字斜體 _text_ 應正確轉換為 <i>', () => {
    const input = '這是 _斜體註解_ 測試';
    const output = markdownToTelegramHtml(input);
    assert.equal(output, '這是 <i>斜體註解</i> 測試');
  });

  test('刪除線 ~~text~~ 與 ~text~ 應正確轉換為 <s>', () => {
    const input = '這是 ~~刪除線~~ 與 ~單波浪刪除~';
    const output = markdownToTelegramHtml(input);
    assert.equal(output, '這是 <s>刪除線</s> 與 <s>單波浪刪除</s>');
  });

  test('標題語法 # 與 ## 應轉換為 <b> 標籤', () => {
    const input = '## 估值情境與市場預期';
    const output = markdownToTelegramHtml(input);
    assert.equal(output, '<b>估值情境與市場預期</b>');
  });

  test('引用語法 > 應轉換為 <blockquote> 標籤', () => {
    const input = '> 這是一段引言';
    const output = markdownToTelegramHtml(input);
    assert.equal(output, '<blockquote>這是一段引言</blockquote>');
  });

  test('尖括號如 /stock2 <股票代碼> 應轉義為 &lt; 和 &gt;，避免非法 HTML 標籤崩潰', () => {
    const input = '使用說明：請輸入 /stock2 <股票代碼> 查詢';
    const output = markdownToTelegramHtml(input);
    assert.equal(output, '使用說明：請輸入 /stock2 &lt;股票代碼&gt; 查詢');
  });

  test('程式碼區塊 (Code Blocks) 應完整保留格式並轉義內部 HTML 字元，且不被 Markdown 規則干擾', () => {
    const input = '範例程式：\n```python\nif a < b and b > 0:\n    print("**not bold**")\n```';
    const output = markdownToTelegramHtml(input);
    assert.match(output, /<pre><code class="language-python">if a &lt; b and b &gt; 0:\n    print\("\*\*not bold\*\*"\)\n<\/code><\/pre>/);
  });

  test('行內程式碼 (Inline Code) 應正確轉換為 <code> 並轉義特殊字元', () => {
    const input = '請使用 `const isValid = a < b;` 判斷';
    const output = markdownToTelegramHtml(input);
    assert.equal(output, '請使用 <code>const isValid = a &lt; b;</code> 判斷');
  });

  test('超連結 [Google](https://google.com) 應轉換為 <a href="...">', () => {
    const input = '請參考 [官網連結](https://example.com/test?id=1&name=tg)';
    const output = markdownToTelegramHtml(input);
    assert.equal(output, '請參考 <a href="https://example.com/test?id=1&amp;name=tg">官網連結</a>');
  });

  test('未閉合的 HTML 標籤應自動補齊，杜絕 Telegram 400 錯誤', () => {
    const broken = '<b>粗體未閉合 <i>斜體也未閉合';
    const balanced = balanceTelegramHtmlTags(broken);
    assert.equal(balanced, '<b>粗體未閉合 <i>斜體也未閉合</i></b>');
  });

  test('sendMessageToTelegram 應將 parse_mode: "Markdown" 自動轉為 HTML 發送給 Telegram', async () => {
    let capturedBody = null;
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async (url, options) => {
        capturedBody = JSON.parse(options.body);
        return new Response(JSON.stringify({ ok: true, result: { message_id: 999 } }), { status: 200 });
      };

      const testMsg = '💰 **現價**: 1,000 USD\n* **本益比: ** 20 倍';
      await sendMessageToTelegram(testMsg, 'FAKE_TOKEN', { chat_id: 12345, parse_mode: 'Markdown' });

      assert.ok(capturedBody);
      assert.equal(capturedBody.parse_mode, 'HTML');
      assert.match(capturedBody.text, /💰 <b>現價<\/b>: 1,000 USD/);
      assert.match(capturedBody.text, /• <b>本益比: <\/b> 20 倍/);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('sendMessageToTelegram 當 Telegram 回傳非 200 時應優雅降級為純文字發送', async () => {
    const calls = [];
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async (url, options) => {
        const body = JSON.parse(options.body);
        calls.push(body);
        if (body.parse_mode === 'HTML') {
          // 模擬 Telegram 實體報錯 400
          return new Response(JSON.stringify({ ok: false, description: "Bad Request: can't parse entities" }), { status: 400 });
        }
        return new Response(JSON.stringify({ ok: true, result: { message_id: 1000 } }), { status: 200 });
      };

      const testMsg = '測試訊息 **粗體**';
      await sendMessageToTelegram(testMsg, 'FAKE_TOKEN', { chat_id: 12345, parse_mode: 'Markdown' });

      assert.equal(calls.length, 2);
      assert.equal(calls[0].parse_mode, 'HTML');
      assert.equal(calls[1].parse_mode, undefined);
      assert.equal(calls[1].text, '測試訊息 **粗體**');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
