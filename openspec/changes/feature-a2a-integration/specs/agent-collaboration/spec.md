## ADDED Requirements

### Requirement: Task Delegation Capability
The LLM SHALL have the ability to delegate a specific request to another agent via a tool call.

#### Scenario: Delegate to Bot 2
- **WHEN** the user says "Ask Bot 2 to check the weather"
- **THEN** the LLM SHALL invoke the `delegate_to_agent` tool with `agent: "Bot 2"` and `task: "check the weather"`.

### Requirement: A2A Task Formulation
The system SHALL formulate a valid A2A "Task" object when delegating a request to a peer.

#### Scenario: Send A2A Task
- **WHEN** the `delegate_to_agent` tool is called
- **THEN** the system SHALL send a `createTask` or `sendMessage` JSON-RPC request to the peer's A2A endpoint.

### Requirement: Result Handling
The system SHALL receive the result of a delegated task and present it to the user.

#### Scenario: Receive and Display Result
- **WHEN** the peer agent returns a successful A2A response with a task result
- **THEN** the system SHALL format the result and send it as a Telegram message.
