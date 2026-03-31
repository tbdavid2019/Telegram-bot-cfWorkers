## ADDED Requirements

### Requirement: Soul overrides system prompt
LLM 請求流程 SHALL 在組裝 system prompt 時，優先使用 DATABASE 中的自訂 soul 內容，取代 `SYSTEM_INIT_MESSAGE`。

#### Scenario: 有自訂 soul 時使用 soul 作為 prompt
- **WHEN** 使用者發送一般訊息觸發 LLM 對話，且 DATABASE 中存在 `soul:{chatId}:{botId}` 資料
- **THEN** `requestCompletionsFromLLM()` 使用 soul 的 `content` 欄位取代 `context.USER_CONFIG.SYSTEM_INIT_MESSAGE` 作為 system prompt 的基底，commandPrompt 和 memoryPrompt 仍正常追加

#### Scenario: 無自訂 soul 時使用預設 prompt
- **WHEN** 使用者發送一般訊息觸發 LLM 對話，且 DATABASE 中無 `soul:{chatId}:{botId}` 資料
- **THEN** `requestCompletionsFromLLM()` 使用原本的 `context.USER_CONFIG.SYSTEM_INIT_MESSAGE` 作為 system prompt，行為與現有完全一致

### Requirement: Soul compatible with existing features
Soul prompt 覆蓋 SHALL 與現有的 Command Discovery、長期記憶、LLM Profiles 功能完全相容。

#### Scenario: Soul + Command Discovery
- **WHEN** 使用者有自訂 soul 且 `ENABLE_COMMAND_DISCOVERY=true`
- **THEN** system prompt 為 `soul.content + commandPrompt + memoryPrompt`，三者正常組合

#### Scenario: Soul + LLM Profile 切換
- **WHEN** 使用者有自訂 soul 且使用 `/llmchange` 切換了 LLM Profile
- **THEN** soul 的 prompt 內容不受 LLM Profile 切換影響，兩者獨立運作
