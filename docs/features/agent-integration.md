# Agent Integration (Built-in + External ACP)

This document describes the current end-to-end Agent integration in Cognia, including built-in agent execution, external ACP agents, chat/session linkage, cancellation semantics, and platform behavior.

## Scope

- Built-in agent execution (`useAgent`)
- External agent execution (`useExternalAgent` + `ExternalAgentManager`)
- Chat routing and fallback (`components/chat/core/chat-container.tsx`)
- Persisted external agent configuration (`stores/agent/external-agent-store`)
- Startup synchronization (`ExternalAgentInitializer`)

## Standards Baseline

The implementation aligns with:

- MCP spec baseline:
  - [MCP 2025-11-05](https://modelcontextprotocol.io/specification/2025-11-05)
  - [MCP 2025-06-18](https://modelcontextprotocol.io/specification/2025-06-18)
  - [MCP Transports](https://modelcontextprotocol.io/specification/2025-11-05/basic/transports)
  - [MCP Security Best Practices](https://modelcontextprotocol.io/specification/2025-06-18/basic/security_best_practices)
- ACP capabilities and session lifecycle:
  - [ACP Home](https://agentclientprotocol.com/)
  - [ACP Prompt Turn](https://agentclientprotocol.com/protocol/prompt-turn)
  - [ACP Session Delete RFD](https://agentclientprotocol.com/blog/session-delete-rfd)
- A2A references (reserved, not executable in current release):
  - [A2A Spec](https://a2aproject.github.io/A2A/latest/specification/)
  - [A2A Core](https://a2aproject.github.io/A2A/latest/topics/core/)

## Architecture

### Single Source of Truth

- Configuration truth: `useExternalAgentStore`
- Runtime truth: `ExternalAgentManager`
- Synchronization bridge:
  - `components/providers/initializers/external-agent-initializer.tsx`
  - `hooks/agent/use-external-agent.ts`

### Startup Initialization

On app startup:

1. `ExternalAgentInitializer` reads persisted external agent configs.
2. Executable ACP configs are registered into `ExternalAgentManager`.
3. `autoConnectOnStartup` controls startup connect attempts.
4. Runtime connection status is written back to store `connectionStatus`.

## Protocol + Platform Matrix

## Executable Protocols

- `acp`: supported

## Non-Executable Protocols (explicitly disabled)

- `a2a`
- custom `http`
- custom `websocket`

These remain visible in settings as `Coming Soon`, are preserved in storage, but cannot be executed until protocol executors are implemented.

## Transport Behavior

- `stdio`:
  - Tauri: supported
  - Web: blocked with explicit user-facing reason
- `http` / `websocket` / `sse` under ACP:
  - Supported according to adapter/runtime capability

## Migration Behavior

External agent persisted state now uses store persist version `2`.

During migration:

- Existing non-ACP entries are retained.
- They are annotated in `metadata`:
  - `unsupported: true`
  - `unsupportedProtocol`
  - `unsupportedReason`
- They remain editable and can be migrated to ACP in UI.

No non-ACP config is silently deleted.

## Chat Routing and Fallback

Chat agent messages now route with this order:

1. If session has `externalAgentId` and external agent is available, execute externally.
2. If external execution fails, show warning/telemetry and automatically fallback to built-in `runAgent`.
3. If no external agent is configured, execute built-in path directly.

Implemented in:

- `components/chat/core/chat-container.tsx`

## Session Continuity

`Session` now supports persisted external session reuse:

- `externalAgentId?: string`
- `externalAgentSessionId?: string`

Execution flow:

1. Chat passes `session.externalAgentSessionId` as `ExternalAgentExecutionOptions.sessionId`.
2. External result/session events update `externalAgentSessionId`.
3. Next turn reuses the same external ACP session when valid.

## Cancellation Semantics

## Built-in Agent

- `AgentConfig` includes `abortSignal?: AbortSignal`.
- `useAgent.stop()` now:
  - aborts in-flight model generation via `AbortController`
  - cancels planning loop token (`createAgentLoopCancellationToken`)

## External Agent

- `ExternalAgentExecutionOptions` includes `sessionId?: string`.
- External execute/streaming both resolve session consistently:
  - explicit `options.sessionId`
  - legacy context compatibility (`context.custom.sessionId`)
  - resume/create fallback
- `useExternalAgent.cancel()` targets current executing external session.

## UI Behavior

All external-agent entry points are aligned:

- `components/agent/external-agent-manager.tsx`
- `components/settings/agent/external-agent-settings.tsx`
- `components/agent/external-agent-selector.tsx`

They consistently:

- Disable unsupported protocols (`Coming Soon`)
- Prevent connect/execute for blocked configs
- Show actionable reason for blocked execution
- Preserve legacy/non-ACP configs for migration

## Key API / Type Updates

- `types/core/session.ts`
  - `externalAgentSessionId?: string`
- `types/agent/external-agent.ts`
  - `ExternalAgentExecutionOptions.sessionId?: string`
- `lib/ai/agent/agent-executor.ts`
  - `AgentConfig.abortSignal?: AbortSignal`

## Observability

External execution path uses trace bridge metadata and keeps ACP session id + chat session id linkage for debugging:

- `lib/ai/agent/external/manager.ts`

## Validation Coverage

Main validation includes:

- `hooks/agent/use-external-agent.test.ts`
- `hooks/agent/use-agent.test.ts`
- `lib/ai/agent/external/manager.test.ts`
- `components/agent/external-agent-manager.test.tsx`
- `components/settings/agent/external-agent-settings.test.tsx`
- `components/agent/external-agent-selector.test.tsx`
- `components/chat/core/chat-container.test.tsx`

For browser-level flow verification, see:

- `e2e/features/external-agent-routing.spec.ts`
