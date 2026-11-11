import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  markdownToTelegramHtml,
  balanceTelegramHtmlTags,
  parseMarkdownTables,
  splitRowCells,
  parseAlignment,
  isDelimiterRow,
  formatMarkdownTableToHtml
} from '../src/utils/md2tgmd.js';
import {
  markdownTableToRichBlock,
  extractRichBlocksFromMarkdown
} from '../src/telegram/rich.js';
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

  describe('GFM Markdown Table Parser & Rendering (Phase 2)', () => {
    test('正確解析五欄天氣預報表格，消除 raw pipe 偽影並優雅排版', () => {
      const weatherMarkdown = `### 臺北市未來一週天氣預報

| 日期 | 天氣狀況 | 降雨機率 | 氣溫區間 | 體感與變化重點 |
| :--- | :---: | ---: | :--- | :--- |
| 週三 03/12 | 陰有局部短暫陣雨 | 70% | 18°C - 23°C | 氣溫微涼，出門備傘 |
| 週四 03/13 | 多雲時晴 | 20% | 20°C - 28°C | 白天溫暖微熱，日夜溫差大 |
| 週五 03/14 | 多雲午後短暫雷陣雨 | 40% | 21°C - 27°C | 午後山區注意短時強降雨 |`;

      const tables = parseMarkdownTables(weatherMarkdown);
      assert.equal(tables.length, 1);
      assert.equal(tables[0].caption, '臺北市未來一週天氣預報');
      assert.deepEqual(tables[0].headers, ['日期', '天氣狀況', '降雨機率', '氣溫區間', '體感與變化重點']);
      assert.deepEqual(tables[0].aligns, ['left', 'center', 'right', 'left', 'left']);
      assert.equal(tables[0].rows.length, 3);

      const html = markdownToTelegramHtml(weatherMarkdown);
      // 確保無 raw pipe 偽影殘留
      assert.ok(!html.includes('|---|---|'), '不應殘留 Markdown 分隔線');
      assert.ok(!html.includes('| :--- |'), '不應殘留對齊語法');
      // 驗證標題保留
      assert.match(html, /<b>臺北市未來一週天氣預報<\/b>/);
      // 驗證第一欄加粗與其他欄位呈現
      assert.match(html, /• <b>週三 03\/12<\/b> \| <b>天氣狀況:<\/b> 陰有局部短暫陣雨 \| <b>降雨機率:<\/b> 70% \| <b>氣溫區間:<\/b> 18°C - 23°C \| <b>體感與變化重點:<\/b> 氣溫微涼，出門備傘/);
      assert.match(html, /• <b>週四 03\/13<\/b> \| <b>天氣狀況:<\/b> 多雲時晴 \| <b>降雨機率:<\/b> 20% \| <b>氣溫區間:<\/b> 20°C - 28°C \| <b>體感與變化重點:<\/b> 白天溫暖微熱，日夜溫差大/);
      assert.match(html, /• <b>週五 03\/14<\/b> \| <b>天氣狀況:<\/b> 多雲午後短暫雷陣雨 \| <b>降雨機率:<\/b> 40% \| <b>氣溫區間:<\/b> 21°C - 27°C \| <b>體感與變化重點:<\/b> 午後山區注意短時強降雨/);
    });

    test('正確解析對齊符號 (:---, :---:, ---:) 與單元格轉義管道符', () => {
      const input = `| 左欄 | 置中欄 | 右欄 | 轉義符 |\n| :--- | :---: | ---: | --- |\n| A1 | B1 | C1 | X \\| Y |`;
      const tables = parseMarkdownTables(input);
      assert.equal(tables.length, 1);
      assert.deepEqual(tables[0].aligns, ['left', 'center', 'right', 'left']);
      assert.equal(tables[0].rows[0][3], 'X | Y', '轉義管道符 \\| 應被正確還原為 | 且不截斷單元格');

      const richBlock = markdownTableToRichBlock(input);
      assert.ok(richBlock);
      assert.equal(richBlock.cells[0][0].align, 'left');
      assert.equal(richBlock.cells[0][1].align, 'center');
      assert.equal(richBlock.cells[0][2].align, 'right');
      assert.equal(richBlock.cells[1][3].text, 'X | Y');
    });

    test('表格單元格內 HTML 保留字元 (<, >, &) 必須嚴格轉義', () => {
      const input = `| 標的代碼 | 篩選條件 & 指標 | 備註說明 |\n| :--- | :--- | :--- |\n| <NVDA> | PE > 30 & EPS < 5 | 建議 & 追蹤 <強烈買進> |`;
      const html = markdownToTelegramHtml(input);

      assert.match(html, /&lt;NVDA&gt;/);
      assert.match(html, /PE &gt; 30 &amp; EPS &lt; 5/);
      assert.match(html, /建議 &amp; 追蹤 &lt;強烈買進&gt;/);
      assert.ok(!html.includes('<NVDA>'), '不能出現未轉義之 HTML 自定義標籤');
      assert.ok(!html.includes('<強烈買進>'), '不能出現未轉義之 HTML 自定義標籤');
    });

    test('容錯處理空單元格與不規則行列 (ragged rows)', () => {
      const input = `| 欄位A | 欄位B | 欄位C |\n| :--- | :--- | :--- |\n| 1 | | 3 |\n| 4 | 5 |`;
      const html = markdownToTelegramHtml(input);

      // 第一行第 2 欄為空，應安全降級為 —
      assert.match(html, /• <b>1<\/b> \| <b>欄位B:<\/b> — \| <b>欄位C:<\/b> 3/);
      // 第二行缺少第 3 欄，應安全容錯補齊 —
      assert.match(html, /• <b>4<\/b> \| <b>欄位B:<\/b> 5 \| <b>欄位C:<\/b> —/);

      // 驗證 RichBlock 也正確正規化
      const block = markdownTableToRichBlock(input);
      assert.equal(block.cells[1][1].text, '—');
      assert.equal(block.cells[2][2].text, '—');
    });

    test('完整保留表格前後之一般 Markdown 散文與段落排版', () => {
      const input = `早安！以下為為您查詢的即時氣象報告：\n\n| 日期 | 天氣狀況 | 降雨機率 |\n| :--- | :---: | ---: |\n| 今天 03/12 | 陰短暫雨 | 80% |\n\n出門請務必攜帶雨具，祝您有美好的一天！`;
      const html = markdownToTelegramHtml(input);

      assert.ok(html.startsWith('早安！以下為為您查詢的即時氣象報告：\n\n'));
      assert.match(html, /• <b>今天 03\/12<\/b> \| <b>天氣狀況:<\/b> 陰短暫雨 \| <b>降雨機率:<\/b> 80%/);
      assert.ok(html.endsWith('\n\n出門請務必攜帶雨具，祝您有美好的一天！'));
    });

    test('extractRichBlocksFromMarkdown 能正確分離文字與 Telegram 10.3 富文本表格', () => {
      const input = `文字說明段落一\n\n[Table: 股票清單]\n| 代碼 | 名稱 |\n| --- | --- |\n| 2330 | 台積電 |\n\n文字說明段落二`;
      const result = extractRichBlocksFromMarkdown(input);

      assert.equal(result.blocks.length, 1);
      assert.equal(result.blocks[0].type, 'table');
      assert.equal(result.blocks[0].caption, '股票清單');
      assert.equal(result.blocks[0].cells.length, 2);
      assert.deepEqual(result.blocks[0].cells[0], [
        { text: '代碼', is_header: true, align: 'left' },
        { text: '名稱', is_header: true, align: 'left' }
      ]);
      assert.deepEqual(result.blocks[0].cells[1], [
        { text: '2330', align: 'left' },
        { text: '台積電', align: 'left' }
      ]);

      assert.ok(result.text.includes('文字說明段落一'));
      assert.ok(result.text.includes('文字說明段落二'));
      assert.ok(!result.text.includes('| 2330 | 台積電 |'), '提取後純文字中不應包含原始表格 Markdown');

      assert.ok(result.fallbackText.includes('<b>股票清單</b>'));
      assert.ok(result.fallbackText.includes('• <b>2330</b> | <b>名稱:</b> 台積電'));
    });

    test('代碼塊 (```, ~~~) 內的表格不被誤解析為表格', () => {
      const input = '```markdown\n| a | b |\n|---|---|\n| 1 | 2 |\n```';
      const html = markdownToTelegramHtml(input);
      assert.ok(html.includes('<pre><code'), '應保持為代碼區塊');
      assert.ok(!html.includes('• <b>1</b>'), '代碼塊內的表格絕不能被解析為條列表格');
    });

    test('表單元格內含超連結時雙引號安全轉義為 &quot;', () => {
      const input = '| 網站 | 連結 |\n|---|---|\n| 範例 | [測試](https://example.com/?q="test") |';
      const html = markdownToTelegramHtml(input);
      assert.ok(html.includes('&quot;test&quot;'), 'URL 屬性雙引號應安全轉義');
      assert.ok(!html.includes('href="https://example.com/?q="test"'), '不能出現未轉義之雙引號破壞 attribute');
    });

    test('首欄包含 <code> 時不產生 <b><code> 巢狀結構', () => {
      const input = '| 命令 | 說明 |\n|---|---|\n| `/stock` | 查股票 |';
      const html = markdownToTelegramHtml(input);
      assert.ok(html.includes('• <code>/stock</code> | <b>說明:</b> 查股票'));
      assert.ok(!html.includes('<b><code>'), '嚴格禁止 <b><code> 實體巢狀衝突');
    });

    test('表頭欄數與分隔欄數不一致時不判定為表格 (保持 Setext 語意)', () => {
      const input = 'A | B\n---\n普通段落文字';
      const tables = parseMarkdownTables(input);
      assert.equal(tables.length, 0, '欄數不符不得判定為表格');
    });
  });
});
