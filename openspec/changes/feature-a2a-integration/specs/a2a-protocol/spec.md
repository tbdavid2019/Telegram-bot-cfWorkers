## ADDED Requirements

### Requirement: A2A Endpoint
The system SHALL expose a POST endpoint at `/a2a` to receive A2A protocol messages.

#### Scenario: Valid A2A Request
- **WHEN** a POST request is sent to `/a2a` with a valid JSON-RPC 2.0 payload
- **THEN** the system SHALL respond with a valid JSON-RPC 2.0 response and an HTTP 200 OK status.

### Requirement: Agent Card Hosting
The system SHALL provide an "Agent Card" (via discovery or the A2A endpoint) that describes the bot's capabilities and authentication requirements.

#### Scenario: Fetch Agent Card
- **WHEN** an A2A client requests the Agent Card
- **THEN** the system SHALL return a JSON object compliant with the A2A v1.0 specification.

### Requirement: A2A Authentication
The system SHALL verify the `Authorization` header for all incoming A2A requests based on the configured tokens.

#### Scenario: Unauthorized Request
- **WHEN** an A2A request is sent without a valid token
- **THEN** the system SHALL respond with an HTTP 401 Unauthorized or a JSON-RPC 2.0 Error.
