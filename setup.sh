#!/bin/bash
# 快速開始腳本

echo "🚀 Telegram Bot 模組化開發環境設置"
echo ""

# 檢查 pnpm
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm 未安裝，請先安裝 pnpm:"
    echo "   npm install -g pnpm"
    exit 1
fi

echo "✅ 檢查 pnpm: $(pnpm --version)"
echo ""

# 安裝依賴
echo "📦 安裝依賴..."
pnpm install

echo ""
echo "✅ 設置完成！"
echo ""
echo "📖 可用指令:"
echo "   pnpm run build    - 打包成 dist/telegram.work.js"
echo "   pnpm run dev      - 監聽模式 (自動重新打包)"
echo ""
echo "📁 目錄結構:"
echo "   src/              - 原始模組化程式碼 (開發用)"
echo "   dist/             - 打包輸出 (部署用)"
echo "   telegram.work.js  - 原始單檔版本 (保留參考)"
echo ""
echo "📝 下一步:"
echo "   1. 修改 src/ 下的檔案"
echo "   2. 執行 pnpm run build"
echo "   3. 將 dist/telegram.work.js 上傳到 Cloudflare Workers"
echo ""
