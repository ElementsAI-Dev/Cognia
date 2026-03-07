## ADDED Requirements

### Requirement: MCP Apps Extension Negotiation
The MCP client SHALL advertise support for `io.modelcontextprotocol/ui` during initialization and MUST record whether each connected server supports the extension.

#### Scenario: Server supports UI extension
- **WHEN** Cognia sends `initialize` and receives server capabilities containing `extensions.io.modelcontextprotocol/ui`
- **THEN** Cognia marks the server as MCP Apps-capable and enables app rendering paths for that server

#### Scenario: Server does not support UI extension
- **WHEN** initialization response omits `extensions.io.modelcontextprotocol/ui`
- **THEN** Cognia keeps legacy MCP behavior and does not attempt MCP Apps UI runtime activation

### Requirement: MCP Apps Metadata Preservation
Cognia SHALL preserve MCP Apps-relevant tool descriptor and tool result metadata across backend and frontend boundaries, including UI resource references and widget-private metadata.

#### Scenario: Tool descriptor contains UI resource reference
- **WHEN** a server returns a tool descriptor with `_meta.ui.resourceUri`
- **THEN** Cognia stores and exposes that value to the frontend host runtime without lossy transformation

#### Scenario: Tool result contains private metadata
- **WHEN** a tool result includes `_meta` and `structuredContent`
- **THEN** Cognia passes `structuredContent` and `content` to model-visible views and passes `_meta` only to widget runtime consumers

### Requirement: UI Resource Rendering Runtime
Cognia SHALL render MCP App resources (`text/html;profile=mcp-app`) in a sandboxed iframe runtime tied to the invoking tool context.

#### Scenario: Render valid app resource
- **WHEN** a tool invocation resolves to a valid app resource payload
- **THEN** Cognia mounts the app in a sandboxed iframe and associates it with a stable widget session identifier

#### Scenario: Render fallback on invalid resource
- **WHEN** app resource content is missing, malformed, or blocked by policy
- **THEN** Cognia does not mount iframe content and falls back to non-app result rendering with an error indicator

### Requirement: UI Bridge Tool Invocation
Cognia SHALL support UI-initiated MCP tool calls through bridge-mediated `tools/call` requests with session and permission validation.

#### Scenario: Allowed bridge tool call
- **WHEN** a widget sends a valid `tools/call` bridge request for an allowed tool
- **THEN** Cognia executes the tool via MCP manager and returns the result to the originating widget session

#### Scenario: Disallowed bridge tool call
- **WHEN** a widget requests a tool that is not visible/allowed for UI invocation
- **THEN** Cognia rejects the request with an explicit error and does not execute the tool

### Requirement: Graceful Degradation
Cognia MUST preserve successful tool completion even when MCP Apps rendering or bridge operations fail.

#### Scenario: Bridge initialization failure
- **WHEN** widget bridge initialization fails after tool execution succeeds
- **THEN** Cognia still surfaces tool outputs through existing text/resource renderers and logs the bridge failure
