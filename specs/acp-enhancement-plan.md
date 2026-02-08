# ACP Enhancement Plan

## Overview

Enhancement of the existing ACP (Agent Client Protocol) implementation to align with the latest official ACP specification at https://agentclientprotocol.com. This plan addresses missing features, simplified implementations, and spec compliance gaps identified through thorough code review and protocol specification analysis.

## Gap Analysis Summary

### HIGH PRIORITY

1. **Session Config Options** — Entirely missing. New spec feature superseding Session Modes.
2. **Tool Call Enhancements** — Diff content, terminal embedding, locations, rawInput/rawOutput, proper PermissionOption kinds.
3. **Rich Content Types** — Audio content type, annotations on content blocks missing.
4. **`current_mode_update` notification** — Agent-initiated mode changes not handled.
5. **`config_options_update` notification** — Agent-initiated config option changes not handled.

### MEDIUM PRIORITY

6. **Session `mcpServers` parameter** — Pass MCP server configs during session creation.
7. **Terminal enhancements** — `outputByteLimit`, `truncated`, `exitStatus.signal`, `env` as EnvVariable[].
8. **File system `line`/`limit` params** — Partial file reading support.
9. **Extension method routing** — Methods starting with `_` for custom extensions.
10. **`_meta` field propagation** — On all protocol types.

### LOW PRIORITY (RFD / Future)

11. **Session List** — `session/list` endpoint for discovering existing sessions.

## Implementation Plan

### Phase 1: Types & Protocol Types (types/agent/external-agent.ts)

- Add `AcpConfigOption`, `AcpConfigOptionValue`, `AcpConfigOptionCategory` types
- Add `AcpToolCallDiffContent`, `AcpToolCallTerminalContent`, `AcpToolCallLocation` types
- Add `AcpPermissionOptionKind` type
- Add `AcpAudioContent` type
- Add `AcpContentAnnotations` type
- Add `AcpConfigOptionsUpdate` session update type
- Add `AcpCurrentModeUpdate` session update type
- Update `AcpSessionUpdate` union to include new types
- Add `AcpExtensionMethod` type for custom extension methods

### Phase 2: ACP Client (lib/ai/agent/external/acp-client.ts)

- Handle `config_options_update` session notifications
- Handle `current_mode_update` session notifications
- Add `setConfigOption` method (session/set_config_option)
- Parse `configOptions` from session/new response
- Pass `mcpServers` in session/new params
- Support `line`/`limit` in fs/read_text_file handler
- Support `outputByteLimit` in terminal/create handler
- Route extension methods (starting with `_`)

### Phase 3: Protocol Adapter (lib/ai/agent/external/protocol-adapter.ts)

- Add `setConfigOption` to ProtocolAdapter interface
- Add `getConfigOptions` to ProtocolAdapter interface

### Phase 4: Manager (lib/ai/agent/external/manager.ts)

- Expose `setConfigOption` and `getConfigOptions` methods
- Forward new notification events

### Phase 5: Translators (lib/ai/agent/external/translators.ts)

- Add diff content translation
- Add terminal content translation
- Add tool call location translation

### Phase 6: Hooks & Store

- Add config option state and actions to `useExternalAgent` hook
- Add config option actions to `external-agent-store.ts`

### Phase 7: UI Components

- Create `ExternalAgentConfigOptions` component for config option selectors
- Integrate into `ExternalAgentManager` component
