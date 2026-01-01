// 新版 commandQueryBudget - 返回完整原始資料
export async function commandQueryBudget(message, command, subcommand, context) {
    if (ENV.USER_CONFIG.ENABLE_FAMILY_SHEETS !== true) return;
    try {
        const rawData = await readBudgetSheet(context.env);
        const parsedData = parseBudgetData(rawData);

        if (parsedData.length === 0) {
            return sendMessageToTelegramWithContext(context)(`📊 查無收支資料`);
        }

        // 直接返回所有資料，讓 LLM 自己分析
        let response = `📊 **家庭收支資料** (共 ${parsedData.length} 筆)\n\n`;
        response += `\`\`\`\n`;
        response += `月份      總共    玉山    星展    中信    國泰    富邦    工會    現金    房租\n`;
        response += `${'='.repeat(80)}\n`;

        for (const d of parsedData) {
            response += `${d.month.padEnd(8)} ${String(d.total).padEnd(7)} ${String(d.yushan).padEnd(7)} ${String(d.dbs).padEnd(7)} ${String(d.ctbc).padEnd(7)} ${String(d.cathay).padEnd(7)} ${String(d.fubon).padEnd(7)} ${String(d.union).padEnd(7)} ${String(d.cash).padEnd(7)} ${String(d.rent).padEnd(7)}\n`;
        }
        response += `\`\`\``;

        context.CURRENT_CHAT_CONTEXT.parse_mode = "Markdown";
        return sendMessageToTelegramWithContext(context)(response);

    } catch (e) {
        return sendMessageToTelegramWithContext(context)(`❌ 查詢失敗: ${e.message}`);
    }
}
