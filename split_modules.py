#!/usr/bin/env python3
"""
自動拆分 telegram.work.js 成多個模組
"""

import os
import re

# 讀取原始檔案
with open('telegram.work.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 定義各個模組的分界標記
sections = {
    'src/config/context.js': (
        '// src/config/context.js',
        '// src/utils/md2tgmd.js'
    ),
    'src/utils/md2tgmd.js': (
        '// src/utils/md2tgmd.js',
        '// src/telegram/telegram.js'
    ),
    'src/utils/cache.js': (
        '// src/utils/cache.js',
        '// src/utils/image.js'
    ),
    'src/utils/image.js': (
        '// src/utils/image.js',
        '// src/agent/openai.js'
    ),
    'src/agent/stream.js': (
        '// src/agent/stream.js',
        '// src/agent/request.js'
    ),
    'src/agent/request.js': (
        '// src/agent/request.js',
        '// src/utils/cache.js'
    ),
    'src/agent/openai.js': (
        '// src/agent/openai.js',
        '// src/agent/workersai.js'
    ),
    'src/agent/workersai.js': (
        '// src/agent/workersai.js',
        '// src/agent/gemini.js'
    ),
    'src/agent/gemini.js': (
        '// src/agent/gemini.js',
        '// src/agent/mistralai.js'
    ),
    'src/agent/mistralai.js': (
        '// src/agent/mistralai.js',
        '// src/agent/cohere.js'
    ),
    'src/agent/cohere.js': (
        '// src/agent/cohere.js',
        '// src/agent/anthropic.js'
    ),
    'src/agent/anthropic.js': (
        '// src/agent/anthropic.js',
        '// src/agent/azure.js'
    ),
    'src/agent/azure.js': (
        '// src/agent/azure.js',
        '// src/agent/agents.js'
    ),
    'src/agent/agents.js': (
        '// src/agent/agents.js',
        '// src/agent/llm.js'
    ),
    'src/agent/llm.js': (
        '// src/agent/llm.js',
        '// src/telegram/command.js'
    ),
}

print("開始拆分模組...")

for filepath, (start_marker, end_marker) in sections.items():
    # 找到開始和結束位置
    start_idx = content.find(start_marker)
    end_idx = content.find(end_marker)
    
    if start_idx == -1:
        print(f"⚠️  找不到開始標記: {start_marker}")
        continue
    
    if end_idx == -1:
        print(f"⚠️  找不到結束標記: {end_marker}")
        # 如果沒有結束標記，就取到檔案結尾
        module_content = content[start_idx:]
    else:
        module_content = content[start_idx:end_idx]
    
    # 移除開頭的註解標記
    module_content = module_content.replace(start_marker, '').strip()
    
    # 轉換為 ES6 export/import 語法
    # 這裡需要手動處理，因為原始碼使用 var 而非 export
    
    # 確保目錄存在
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    
    # 寫入檔案
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(module_content + '\n')
    
    print(f"✓ 已建立: {filepath} ({len(module_content)} 字元)")

print("\n✅ 拆分完成！")
print("\n⚠️  注意: 你需要手動:")
print("1. 在每個檔案中加上 export/import 語法")
print("2. 處理模組間的依賴關係")
print("3. 建立 telegram.js 和 commands.js")
