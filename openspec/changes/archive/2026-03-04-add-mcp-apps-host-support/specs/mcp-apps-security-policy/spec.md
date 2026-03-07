## ADDED Requirements

### Requirement: Sandboxed Widget Isolation
MCP App widgets SHALL execute in sandboxed iframes that prevent access to parent DOM, cookies, and local storage outside explicitly approved channels.

#### Scenario: Default sandbox policy applied
- **WHEN** Cognia mounts an MCP App widget
- **THEN** the iframe is created with deny-by-default sandbox attributes and no direct parent-context access

#### Scenario: Widget attempts forbidden parent access
- **WHEN** widget script attempts to access restricted parent-window capabilities
- **THEN** access is blocked by sandbox and no privileged operation is executed

### Requirement: CSP and Domain Enforcement
Cognia SHALL enforce widget network/resource origins based on approved policy and MUST reject undeclared or disallowed origins.

#### Scenario: Allowed domain request
- **WHEN** widget requests a resource from an origin allowed by policy
- **THEN** the request is permitted and the widget continues normally

#### Scenario: Disallowed domain request
- **WHEN** widget requests a resource from an origin not in the approved policy
- **THEN** Cognia blocks the request path and records a security event

### Requirement: Bridge Message Validation
Cognia MUST validate bridge messages for session binding, origin constraints, method allowlist, and payload schema before executing actions.

#### Scenario: Valid bridge message
- **WHEN** a postMessage payload matches JSON-RPC shape, session binding, and allowed method set
- **THEN** Cognia processes the message and emits the corresponding response/notification

#### Scenario: Invalid or spoofed bridge message
- **WHEN** a message fails origin, session, or schema validation
- **THEN** Cognia drops the message, returns an error when possible, and does not execute side effects

### Requirement: UI-Initiated Tool Access Control
Cognia SHALL require explicit UI visibility/permission checks before executing widget-triggered `tools/call` requests.

#### Scenario: Tool not UI-visible
- **WHEN** widget requests a tool not marked for UI visibility or not allowed by host policy
- **THEN** Cognia denies the request and returns a permission error

#### Scenario: Tool UI-visible and allowed
- **WHEN** widget requests a tool that passes visibility and host policy checks
- **THEN** Cognia executes the tool and returns the result to the same widget session

### Requirement: External Navigation Safety
Cognia SHALL mediate external-link navigation from widgets and MUST require safety checks before opening external destinations.

#### Scenario: Approved external link
- **WHEN** widget requests navigation to an approved external origin
- **THEN** Cognia opens the link through a vetted host path and preserves conversation safety constraints

#### Scenario: Unapproved external link
- **WHEN** widget requests navigation to an unapproved or malformed destination
- **THEN** Cognia blocks navigation and surfaces a user-visible warning
