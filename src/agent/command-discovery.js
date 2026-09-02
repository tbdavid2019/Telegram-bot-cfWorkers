/**
 * LLM 指令發現模組
 * 提取可用指令、檢查權限、生成系統提示詞
 */

import { commandHandlers } from '../telegram/commands.js';
import { ENV, CONST } from '../config/env.js';
import { getChatRoleWithContext } from '../telegram/telegram.js';

/**
 * 檢查用戶對特定指令的權限
 * @param {string} command - 指令名稱（如 "/wt"）
 * @param {Object} context - 當前上下文
 * @returns {Promise<boolean>} 是否有權限
 */
export async function checkCommandPermission(command, context) {
    const handler = commandHandlers[command];
    if (!handler) {
        if (command === '/delegate') return true;
        return false;
    }

    const { scopes, needAuth } = handler;
    const chatType = context.SHARE_CONTEXT.chatType;
    const chatId = context.CURRENT_CHAT_CONTEXT.chat_id;
    const speakerId = context.SHARE_CONTEXT.speakerId;

    // 檢查 scopes
    if (!scopes || scopes.length === 0) {
        return false;
    }

    // 私聊檢查
    if (chatType === 'private') {
        if (!scopes.includes('all_private_chats')) {
            return false;
        }
    }

    // 群組檢查
    if (CONST.GROUP_TYPES.includes(chatType)) {
        const hasGroupScope = scopes.includes('all_group_chats');
        const hasAdminScope = scopes.includes('all_chat_administrators');

        if (!hasGroupScope && !hasAdminScope) {
            return false;
        }

        // 如果需要管理員權限
        if (hasAdminScope && !hasGroupScope) {
            const getChatRole = getChatRoleWithContext(context);
            const role = await getChatRole(speakerId);
            if (role !== 'administrator' && role !== 'creator') {
                return false;
            }
        }
    }

    // 檢查 needAuth
    if (needAuth && typeof needAuth === 'function') {
        const authResult = needAuth(chatType);
        if (!authResult) {
            return false;
        }
    }

    return true;
}

/**
 * 提取所有可用指令的元數據
 * @param {Object} context - 當前上下文
 * @returns {Promise<Array>} 可用指令列表
 */
export async function extractAvailableCommands(context) {
    const commands = [];

    for (const [command, handler] of Object.entries(commandHandlers)) {
        // 跳過隱藏的系統指令
        const hiddenCommands = ['/setenv', '/delenv', '/clearenv', '/setenvs', '/version', '/start', '/redo'];
        if (hiddenCommands.includes(command)) {
            continue;
        }

        // 檢查權限
        const hasPermission = await checkCommandPermission(command, context);
        if (!hasPermission) {
            continue;
        }

        commands.push({
            command,
            description: handler.description || '無說明',
            scopes: handler.scopes || []
        });
    }

    return commands;
}

/**
 * 生成 LLM 系統提示詞（包含可用指令列表）
 * @param {Object} context - 當前上下文
 * @returns {Promise<string>} 系統提示詞
 */
export async function generateCommandSystemPrompt(context) {
    const commands = await extractAvailableCommands(context);

    if (commands.length === 0) {
        return '';
    }

    let prompt = '## 可用指令\n\n';
    prompt += '你可以使用以下指令幫助用戶：\n\n';

    // 按類別組織指令
    const cachedCategories = {
        '天氣相關': ['/wt', '/weatheralert'],
        '股票相關': ['/stocktw', '/stock', '/stock2', '/fund'],
        '占卜相關': ['/qi', '/mei', '/tarot', '/bazi', '/fengshui', '/yinyuan', '/oracle', '/poetry', '/boa', '/bo'],
        '法律相關': ['/law'],
        '字典相關': ['/dict', '/dictcn', '/dicten'],
        '網路工具': ['/web', '/read', '/ip', '/dns', '/dns2'],
        '雲端資產': ['/box', '/boxlist', '/boxsearch', '/boxstats'],
        '知識發布': ['/wiki', '/wikiread'],
        '位置服務': ['/gps'],
        '圖片生成': ['/img', '/img2', '/setimg'],
        '系統功能': ['/help', '/new', '/system', '/model'],
        '代理協作': ['/delegate']
    };

    // 根據環境變數決定是否加入家庭管理功能
    if (ENV.USER_CONFIG.ENABLE_FAMILY_SHEETS) {
        cachedCategories['家庭管理'] = ['/budget', '/schedule'];
    } else {
        // 明確告知 LLM 沒有相關權限，防止 Hallucination
        prompt += '注意：你目前沒有權限訪問家庭行程表或收支表。如果用戶詢問相關資訊（如「查行程」、「記帳」等），請明確告知無法查詢，不要嘗試假裝查詢。\n\n';
    }

    for (const [category, categoryCommands] of Object.entries(cachedCategories)) {
        const categoryItems = commands.filter(c => categoryCommands.includes(c.command));
        if (categoryItems.length > 0) {
            prompt += `### ${category}\n`;
            for (const cmd of categoryItems) {
                prompt += `- \`${cmd.command}\` - ${cmd.description}\n`;
            }
            prompt += '\n';
        }
    }


    // 其他未分類的指令
    const categorizedCommands = Object.values(cachedCategories).flat();
    const otherCommands = commands.filter(c => !categorizedCommands.includes(c.command));
    if (otherCommands.length > 0) {
        prompt += '### 其他功能\n';
        for (const cmd of otherCommands) {
            prompt += `- \`${cmd.command}\` - ${cmd.description}\n`;
        }
        prompt += '\n';
    }

    // 加入可用的協作代理人 (A2A_PEERS)
    const peers = ENV.USER_CONFIG.A2A_PEERS;
    if (peers && typeof peers === 'object' && Object.keys(peers).length > 0) {
        prompt += '## 可聯絡的協作代理人 (A2A Peers)\n';
        prompt += '你可以使用 /delegate 指令將任務指派給以下代理人（請直接使用名稱或別名作為參數）：\n';
        for (const [key, peer] of Object.entries(peers)) {
            const names = peer.names ? peer.names.join(', ') : key;
            prompt += `- **${key}** (別名: ${names})\n`;
        }
        prompt += '\n';
    }

    // 加入當前時間資訊
    const now = new Date();
    const currentDateTime = now.toLocaleString('zh-TW', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Taipei'
    });
    prompt += `\n**當前時間**：${currentDateTime}\n\n`;

    // 使用說明
    prompt += '## 原生底層工具調用（完全自主執行）\n\n';
    prompt += '系統已具備完整的原生底層工具庫。當用戶詢問以下領域時，**請主動在回覆開頭輸出相應的 `[CALL:指令 參數]` 標記**。系統會在背景自動攔截執行並將真實數據反饋給你，讓你基於客觀數據直接回答用戶，用戶完全無感：\n\n';
    prompt += '**格式**：`[CALL:指令 參數]`\n\n';
    prompt += '**常見自主觸發範例**：\n';
    prompt += '- **🌐 即時搜尋與查證**：用戶問「SpaceX 是否上市 / 查最新時事」→ `[CALL:/web 關鍵字]`\n';
    prompt += '- **📄 網頁/文件閱讀**：用戶給出任何網址請你閱讀或分析 → `[CALL:/read 網址]`\n';
    prompt += '- **🌤️ 即時天氣**：用戶問「台北天氣 / 高雄會下雨嗎」→ `[CALL:/wt 台北]` 或 `[CALL:/wt 高雄]`\n';
    prompt += '- **📈 股票行情**：用戶問「台積電目前股價 / 輝達今天多少」→ `[CALL:/stock 2330.TW]` 或 `[CALL:/stock NVDA]`\n';
    prompt += '- **🏛️ AI 對沖基金分析**：用戶問「微軟可以買嗎 / 投資大師怎麼看特斯拉」→ `[CALL:/fund MSFT]` 或 `[CALL:/fund TSLA]`\n';
    prompt += '- **🔮 塔羅牌占卜**：用戶問「幫我抽張塔羅牌看下週面試」→ `[CALL:/tarot 下週面試順利嗎？]`\n';
    prompt += '- **📜 生辰八字**：用戶問「算八字：1995-08-18 男 看事業」→ `[CALL:/bazi 1995-08-18 男 看事業]`\n';
    prompt += '- **🧭 八宅風水**：用戶問「客廳座北朝南，財位如何擺設」→ `[CALL:/fengshui 坐北朝南 客廳財位擺設]`\n';
    prompt += '- **💞 月老姻緣與合婚**：用戶問「我想求個月老籤」→ `[CALL:/yinyuan 求問今年正緣]`；「1995與1997合不合」→ `[CALL:/yinyuan 1995 1997 我們合適嗎]`\n';
    prompt += '- **☯️ 奇門遁甲與梅花易數**：用戶問「奇門遁甲問今天談判」→ `[CALL:/qi 今天商務談判運勢]`；「梅花易數占卜」→ `[CALL:/mei 是否適合換工作]`\n';
    prompt += '- **⛩️ 淺草寺籤詩與解答之書**：用戶問「幫我抽淺草寺籤」→ `[CALL:/oracle]`；「解答之書」→ `[CALL:/boa]`\n';
    prompt += '- **⚖️ 台灣法律諮詢**：用戶問「網路誹謗的刑責構成要件」→ `[CALL:/law 網路散布不實言論構成誹謗罪的要件是什麼？]`\n';
    prompt += '- **🛠️ 網路工具與字典**：用戶問「查 8.8.8.8 的 IP」→ `[CALL:/ip 8.8.8.8]`；「google.com 的 DNS」→ `[CALL:/dns google.com]`；「查詢成語」→ `[CALL:/dictcn 臥薪嘗膽]`\n';
    prompt += '- **📘 David888 Wiki 長文/報導/整理自動發布（LLM 專用長文推送工具）**：當用戶要求「撰寫 2000 字長文報導 / 整理產品手冊 / 深度分析戰爭時事 / 製作英語商務口說對話 / 教學手冊 / 書籍手冊」時，請直接撰寫完整詳實的 Markdown 長文，並主動調用：\n';
    prompt += '  `[CALL:/wiki {"slug": "自訂英文slug", "title": "文章標題", "content": "# 文章主標題\\n\\n> 執行摘要：...\\n\\n[TOC]\\n\\n## 第一章\\n內文...", "theme": "claude-canvas"}]`\n';
    prompt += '  ⚠️ **Wiki 格式核心規範**：\n';
    prompt += '  1. **第一行必為 `# 文章主標題`**：嚴禁在標題前輸出任何前置寒暄廢話（如「好的，為您整理...」），`[TOC]` 目錄與 `> 執行摘要` 必須放置於 `# 文章主標題` 之後！\n';
    prompt += '  2. **Mermaid 節點文字必須用雙引號包裹**：例如 `NODE["/api/proxy"]`，嚴禁在括號內出現未加引號的斜線路徑 `/` 或未成對括號，避免解析錯誤。\n';
    prompt += '  3. **善用現代豐富語法**：支援 `==重點高亮==`、`[color=red]自訂色彩[/color]`、代碼標題 ` ```js [app.js] `、代碼行號 ` ```js=1 `、學術雙欄 `<div class="two-column-layout">`、GitHub 警示標籤 `> [!NOTE]` 與雙向註腳 `[^1]`。\n';
    prompt += '  4. **多章節電子書模式 (Book Mode)**：撰寫多單元手冊時，可規劃發布各章節 note，再發布 Hub Manifest 筆記（內含各章節連結 `- [章節](/share/...)`），並回傳 `/book` 閱讀器。\n';
    prompt += '  5. **精華導讀與連結回傳**：Wiki 發布後系統回傳 `shareUrl`，請在 Telegram 僅呈現精華摘要與公開閱讀連結（Share URL、`/present` 簡報、`/book` 電子書），絕不可在 Telegram 重複印出萬字全文！\n';
    prompt += '- **📦 888box 雲端資產轉存**：用戶請你將影片源、圖片、音訊、文件轉存到 888box → `[CALL:/box <url> <標題>]`\n';
    prompt += '- **👥 代理人協調**：用戶問「請 no.2 打個招呼」→ `[CALL:/delegate no.2 打個招呼]`\n';
    prompt += '- **📅 家庭收支與日程**（若已啟用）：記帳 → `[CALL:/budgetwrite {"month": "2025/12", "category": "rent", "amount": 15000}]`；加行程 → `[CALL:/scheduleadd {"date": "2025/01/02", "time": "15:00", "targetUser": "爸爸", "event": "好市多"}]`\n\n';
    prompt += '**重要多輪引導與自主聯網規則**：\n';
    prompt += '1. **🌐 零幻覺與即時聯網自主查證（鐵律）**：你的靜態權重有截止時間，絕對不可憑空猜測任何即時市場狀態、公司上市現狀、即時股價、最新時事新聞或突發事件。**遇到此類問題，必須主動輸出 `[CALL:/web 關鍵字]` 查證**。\n';
    prompt += '2. **📘 長文與產品/時事/教學深度整理自動推送 Wiki**：當用戶提到「透過 wiki 寫... / 撰寫 2000 字長文報導 / 白宮主導的戰爭整理 / 英語商務口說對話 / 產品文檔 / 系列教學手冊」，請直接撰寫高質量完整長文（**第一行必須是 `# 大標題`，接著是 `> 摘要` 與 `[TOC]`**），並在第一輪輸出 `[CALL:/wiki {"slug":"...","title":"...","content":"# 大標題\\n\\n[TOC]\\n\\n..."}]` 發布至 David888 Wiki。工具執行成功後，在 Telegram 中只提供簡短精要導讀，並附上專屬公開閱讀連結 (`shareUrl`)、簡報連結 (`/present`) 與電子書連結 (`/book`)，絕不要在 Telegram 重複印出萬字全文。\n';
    prompt += '3. **八字排盤**：需要西元出生日期（YYYY-MM-DD）與性別。如果用戶只說「幫我算八字/算命」而未提供出生日期，請先以親切語氣在對話中詢問用戶的出生年月日與性別，待用戶提供後再生成 `[CALL:/bazi ...]`。\n';
    prompt += '4. **生肖合婚**：若用戶想看兩人是否相配，請先詢問雙方的西元出生年份（如 1995 與 1997），獲取後生成 `[CALL:/yinyuan 年份1 年份2 問題]`。\n';
    prompt += '5. **無感執行**：所有調用標記會被系統在底層攔截與執行，用戶不會看到標記；工具結果反饋後你會直接生成最終客觀且結構分明的答案。\n';
    prompt += '7. **💡 智慧續問建議（Follow-up Suggestions）**：在給出最終完整回答後，請根據該輪對話主題與分析結果，主動在回覆的最末尾輸出 2~4 個具深度、延伸性且精簡具體的續問建議（格式為 `[SUGGEST:Emoji 問題內容]`，例如 `[SUGGEST:📱 Apple 近期 3nm 晶片在高階 iPhone 出貨比例？]`、`[SUGGEST:🤖 NVIDIA 3nm GPU 主要應用於哪些 AI 產品？]`）。每個問題長度請保持精準有力（建議 15~25 字元），系統會自動將其轉化為 Telegram 互動按鈕供用戶一鍵追問。\n';

    return prompt;
}

