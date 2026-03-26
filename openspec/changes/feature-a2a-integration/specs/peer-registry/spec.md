## ADDED Requirements

### Requirement: Peer Configuration in Wrangler
The system SHALL support configuring A2A peers via the `A2A_PEERS` environment variable as a JSON-encoded string.

#### Scenario: Parse Peer Config
- **WHEN** the system initializes and finds a valid JSON string in `A2A_PEERS`
- **THEN** it SHALL parse the string and load the peers' names, URLs, and tokens into the local registry.

### Requirement: Name and Alias Lookup
The system SHALL support lookups for peer agents by their canonical A2A NAME or any defined ALIAS.

#### Scenario: Lookup Alias
- **WHEN** the `delegate_to_agent` tool is called with `agent: "no.2"`
- **THEN** the system SHALL find that "no.2" is an alias for "Bot 2" and resolves to its correct A2A URL.

### Requirement: Dynamic Registry Updates
The system SHALL allow updating the peer registry without requiring a code change (via environment variable updates).

#### Scenario: Update Peer URL
- **WHEN** a peer's URL is updated in the Cloudflare Dashboard environment variables
- **THEN** after a Worker restart, the bot SHALL use the new URL for all subsequent A2A calls.
