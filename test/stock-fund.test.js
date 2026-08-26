import test from 'node:test';
import assert from 'node:assert/strict';
import { commandFund } from '../src/features/stock.js';
import { commandHandlers, isValidCommand } from '../src/telegram/commands.js';

test('commandFund is registered in commandHandlers', () => {
  assert.equal(isValidCommand('/fund'), true);
  assert.equal(typeof commandHandlers['/fund']?.fn, 'function');
});

test('commandFund prompts usage guide when input is empty', async () => {
  let sentMessage = '';
  const context = {
    SHARE_CONTEXT: { currentBotToken: 'fake_token' },
    CURRENT_CHAT_CONTEXT: { chat_id: 12345 }
  };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    if (typeof url === 'string' && url.includes('api.telegram.org')) {
      const body = JSON.parse(opts.body);
      sentMessage = body.text;
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }
    return originalFetch(url, opts);
  };

  try {
    await commandFund({}, '/fund', '', context);
    assert.match(sentMessage, /AI 對沖基金/);
    assert.match(sentMessage, /使用範例/);
    assert.match(sentMessage, /14 位傳奇投資大師/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('commandFund formats ticker, calls API, and formats report correctly', async () => {
  let sentMessage = '';
  const context = {
    SHARE_CONTEXT: { currentBotToken: 'fake_token' },
    CURRENT_CHAT_CONTEXT: { chat_id: 12345 }
  };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    if (typeof url === 'string' && url.includes('api.telegram.org')) {
      const body = JSON.parse(opts.body);
      sentMessage = body.text;
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }
    if (typeof url === 'string' && url.includes('api/analysis')) {
      const reqBody = JSON.parse(opts.body);
      assert.equal(reqBody.tickers, 'NVDA');
      assert.equal(reqBody.enableRoundTable, true);
      assert.ok(Array.isArray(reqBody.selectedAnalysts));

      return new Response(JSON.stringify({
        decisions: {
          NVDA: {
            action: 'short',
            confidence: 90.0,
            quantity: 469,
            reasoning: '估值過高且缺乏安全邊際'
          }
        },
        round_table: {
          NVDA: {
            signal: 'neutral',
            confidence: 65.0,
            consensus_view: '長期 AI 龍頭但短期估值受限',
            discussion_summary: '巴菲特與木頭姐針對創新 vs 估值激烈辯論',
            dissenting_opinions: '木頭姐強調算力長期指數級成長'
          }
        },
        analyst_signals: {
          warren_buffett_agent: {
            NVDA: {
              signal: 'bearish',
              confidence: 90.0,
              reasoning: '內在價值不足，安全邊際為負'
            }
          },
          cathie_wood_agent: {
            NVDA: {
              signal: 'neutral',
              confidence: 45.0,
              reasoning: '破壞式創新潛力大但當前數據中立'
            }
          }
        }
      }), { status: 200 });
    }
    return originalFetch(url, opts);
  };

  try {
    await commandFund({}, '/fund', 'nvda', context);
    assert.match(sentMessage, /【📈 AI 對沖基金・投資分析報告】/);
    assert.match(sentMessage, /標的：NVDA/);
    assert.match(sentMessage, /建議動作：🔴 做空 \(SHORT\)/);
    assert.match(sentMessage, /決策信心度：90%/);
    assert.match(sentMessage, /469 股/);
    assert.match(sentMessage, /圓桌會議辯論與共識/);
    assert.match(sentMessage, /長期 AI 龍頭但短期估值受限/);
    assert.match(sentMessage, /巴菲特/);
    assert.match(sentMessage, /木頭姐/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('commandFund resolves Chinese company names and cleans bilingual text', async () => {
  let sentMessage = '';
  const context = {
    SHARE_CONTEXT: { currentBotToken: 'fake_token' },
    CURRENT_CHAT_CONTEXT: { chat_id: 12345 }
  };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    if (typeof url === 'string' && url.includes('api.telegram.org')) {
      const body = JSON.parse(opts.body);
      sentMessage = body.text;
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }
    if (typeof url === 'string' && url.includes('api/analysis')) {
      const reqBody = JSON.parse(opts.body);
      // "微軟可以買嗎" should resolve to "MSFT"
      assert.equal(reqBody.tickers, 'MSFT');

      return new Response(JSON.stringify({
        decisions: {
          MSFT: {
            action: 'buy',
            confidence: 88.0,
            quantity: 200,
            reasoning: 'English reasoning.\n【繁體中文解析】多數分析師看好微軟雲端與AI成長力道。'
          }
        },
        round_table: {
          MSFT: {
            signal: 'bullish',
            confidence: 75.0,
            consensus_view: 'English consensus. 委員會認為微軟長期護城河深厚，具備高度成長潛力。',
            discussion_summary: 'English discussion. 巴菲特與木頭姐重點討論雲端成長率與估值。',
            dissenting_opinions: 'English dissent. 麥可·貝瑞對自由現金流殖利率提出審慎看法。'
          }
        },
        analyst_signals: {
          technical_analyst_agent: {
            MSFT: {
              confidence: 60.0,
              signal: 'bullish',
              strategy_signals: {
                trend_following: { signal: 'bullish' },
                momentum: { signal: 'neutral' }
              }
            }
          },
          valuation_agent: {
            MSFT: {
              confidence: 90.0,
              signal: 'bullish',
              reasoning: {
                dcf_analysis: { details: '內在價值高於市價 (Gap: 45%)', signal: 'bullish' }
              }
            }
          },
          warren_buffett_agent: {
            MSFT: {
              signal: 'neutral',
              confidence: 50.0,
              reasoning: 'English text.\n【繁體中文解析】雖然具備優異股東權益報酬率，但安全邊際尚未達到30%水準。'
            }
          }
        }
      }), { status: 200 });
    }
    return originalFetch(url, opts);
  };

  try {
    await commandFund({}, '/fund', '微軟可以買嗎', context);
    assert.match(sentMessage, /【📈 AI 對沖基金・投資分析報告】/);
    assert.match(sentMessage, /標的：MSFT/);
    assert.match(sentMessage, /建議動作：🟢 買入 \(BUY\)/);
    assert.match(sentMessage, /多數分析師看好微軟雲端與AI成長力道/);
    assert.match(sentMessage, /技術分析師/);
    assert.match(sentMessage, /趨勢追蹤: 🟢 看多 \(BUY\)/);
    assert.match(sentMessage, /內在估值分析師/);
    assert.match(sentMessage, /DCF估值: 內在價值高於市價/);
    assert.match(sentMessage, /安全邊際尚未達到30%水準/);
    // Ensure raw English headers are cleaned
    assert.doesNotMatch(sentMessage, /English text/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
