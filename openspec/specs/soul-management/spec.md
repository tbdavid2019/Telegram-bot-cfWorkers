## ADDED Requirements

### Requirement: Load soul from URL
系統 SHALL 支援使用者透過 `/soul <url>` 指令從遠端 URL 載入 SOUL.md 人格模板，fetch 內容後存入 DATABASE。

#### Scenario: 成功載入 GitHub raw URL
- **WHEN** 使用者輸入 `/soul https://raw.githubusercontent.com/mergisi/awesome-openclaw-agents/main/agents/productivity/orion/SOUL.md`
- **THEN** 系統 fetch 該 URL，解析出名稱（第一個 `# ` 標題），將 name、source、content、loadedAt 存入 DATABASE key `soul:{chatId}:{botId}`，清除聊天歷史，回覆確認訊息（含 soul 名稱）

#### Scenario: URL 內容超過大小限制
- **WHEN** 使用者輸入 `/soul <url>` 且 response body 超過 10KB
- **THEN** 系統回覆錯誤訊息提示內容過大，不存入 DATABASE

#### Scenario: URL 抓取失敗
- **WHEN** 使用者輸入 `/soul <url>` 且 fetch 失敗（網路錯誤或非 2xx 狀態碼）
- **THEN** 系統回覆錯誤訊息提示抓取失敗，不存入 DATABASE

#### Scenario: 內容字元數超過限制
- **WHEN** 使用者輸入 `/soul <url>` 且文字內容超過 5000 字元
- **THEN** 系統將內容截斷至 5000 字元，存入 DATABASE，並在確認訊息中提示內容已截斷

### Requirement: Reset soul to default
系統 SHALL 支援使用者透過 `/soul reset` 指令清除自訂 soul，恢復使用預設 `SYSTEM_INIT_MESSAGE`。

#### Scenario: 成功重置
- **WHEN** 使用者輸入 `/soul reset`
- **THEN** 系統刪除 DATABASE 中 `soul:{chatId}:{botId}` 的資料，清除聊天歷史，回覆確認已恢復預設人格

#### Scenario: 目前沒有自訂 soul 時重置
- **WHEN** 使用者輸入 `/soul reset` 但 DATABASE 中無自訂 soul
- **THEN** 系統回覆提示目前已是預設人格，無需重置

### Requirement: View soul info
系統 SHALL 支援使用者透過 `/soul info` 指令查看目前使用的 soul 資訊。

#### Scenario: 有自訂 soul 時查看
- **WHEN** 使用者輸入 `/soul info` 且 DATABASE 中有自訂 soul
- **THEN** 系統回覆 soul 名稱、來源 URL、載入時間

#### Scenario: 無自訂 soul 時查看
- **WHEN** 使用者輸入 `/soul info` 且 DATABASE 中無自訂 soul
- **THEN** 系統回覆目前使用預設人格

### Requirement: Show usage help
系統 SHALL 在使用者輸入 `/soul`（無參數）時顯示使用說明。

#### Scenario: 顯示使用說明
- **WHEN** 使用者輸入 `/soul`（無任何參數）
- **THEN** 系統回覆使用說明，包含指令格式、推薦模板 repo URL（`https://github.com/mergisi/awesome-openclaw-agents`）

### Requirement: Clear history on soul change
系統 SHALL 在切換或重置 soul 時自動清除聊天歷史。

#### Scenario: 載入新 soul 時清除歷史
- **WHEN** 使用者成功載入新 soul（`/soul <url>`）
- **THEN** 系統刪除 DATABASE 中 `history:{chatId}:{botId}` 的聊天歷史

#### Scenario: 重置 soul 時清除歷史
- **WHEN** 使用者重置 soul（`/soul reset`）且確實有自訂 soul 存在
- **THEN** 系統刪除 DATABASE 中 `history:{chatId}:{botId}` 的聊天歷史
