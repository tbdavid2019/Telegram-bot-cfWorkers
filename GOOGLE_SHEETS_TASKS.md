# Google Sheets LLM Integration - Task List

## Phase 1: Research & Planning
- [x] Analyze existing codebase structure
- [x] Review Google Sheets API integration requirements
- [x] Design LLM tool/function calling schema
- [x] Define whitelist authorization mechanism

## Phase 2: Google Sheets Integration
- [ ] Set up Google Sheets API credentials
- [ ] Create service for reading family budget sheet
- [ ] Create service for reading/writing family schedule sheet
- [ ] Implement schedule update/delete operations
- [ ] Implement data parsing and formatting
- [ ] Create user name mapping utility

## Phase 3: LLM Function Calling
- [ ] Define function schemas for budget queries
- [ ] Define function schemas for schedule operations (QUERY/CREATE/UPDATE/DELETE)
- [ ] Add to system prompt (no explicit commands)
- [ ] Integrate with existing LLM system
- [ ] Handle LLM responses and execute sheet operations
- [ ] Implement feature toggle (ENABLE_FAMILY_SHEETS)

## Phase 4: Authorization & Context Handling
- [ ] Implement whitelist check for family members
- [ ] Detect message context (group vs private)
- [ ] Implement @mention with both User ID and username support
- [ ] Handle reply-to logic for different contexts
- [ ] Configure feature toggle for aws/chatgpt bots only

## Phase 5: Testing & Verification
- [ ] Test budget queries with natural language
- [ ] Test schedule creation in group chat with @mentions
- [ ] Test schedule update operations
- [ ] Test schedule delete operations
- [ ] Test schedule queries
- [ ] Verify whitelist authorization
- [ ] Verify feature toggle (gemini bot should not have access)
- [ ] Test error handling
