## Context

Cognia currently uses a Rust Tauri MCP client/manager stack that supports core MCP protocol methods (`initialize`, `tools/*`, `resources/*`, `prompts/*`, `sampling/*`) and a React frontend that renders tool/resource outputs as text/image/resource blocks. The current stack does not negotiate the MCP Apps extension (`io.modelcontextprotocol/ui`), does not preserve MCP Apps-specific tool metadata (`_meta.ui.resourceUri` and related metadata), and does not host sandboxed UI widgets with a `ui/*` JSON-RPC bridge.

The change spans protocol negotiation, backend data models, frontend rendering runtime, and security enforcement. Because this is cross-cutting and security-sensitive, we need an explicit design before implementation.

## Goals / Non-Goals

**Goals:**
- Add MCP Apps extension negotiation support in MCP client initialization.
- Preserve MCP Apps-related descriptor/result metadata across backend and frontend boundaries.
- Render MCP App UI resources in a sandboxed iframe runtime.
- Implement `ui/*` bridge interactions needed for practical app use, including UI-initiated `tools/call`.
- Enforce CSP/domain and tool-access guardrails for third-party widgets.
- Gracefully degrade to existing MCP behavior when extension support is unavailable.

**Non-Goals:**
- Implement all ChatGPT-specific `window.openai` extension APIs.
- Redesign existing non-app MCP tool UX flows.
- Add cloud-hosted connector marketplace trust automation in this change.
- Introduce cross-device/session sync for widget runtime state.

## Decisions

### 1) Extension negotiation via initialize capabilities
- **Decision:** Add `extensions.io.modelcontextprotocol/ui` to client capabilities in `initialize` and parse server `capabilities.extensions` in response.
- **Rationale:** This aligns with MCP extension negotiation and allows explicit support detection.
- **Alternatives considered:**
  - Infer support from tool metadata only. Rejected: ambiguous and non-standard.
  - Always assume support. Rejected: unsafe and breaks compatibility.

### 2) Data model evolution for metadata passthrough
- **Decision:** Extend Rust/TS MCP types to include descriptor/result metadata needed by MCP Apps (`_meta`, `structuredContent`, and tool-level app metadata), while preserving current fields for backward compatibility.
- **Rationale:** MCP Apps requires metadata that is hidden from model text output but visible to widget runtime.
- **Alternatives considered:**
  - Strongly typed every possible metadata key. Rejected: brittle against evolving extension fields.
  - Keep metadata only in frontend. Rejected: loses fidelity across backend IPC boundaries.

### 3) Dedicated MCP App host runtime in frontend
- **Decision:** Introduce a dedicated host component to render `text/html;profile=mcp-app` in sandboxed iframe and manage bridge session lifecycle.
- **Rationale:** Keeps app runtime isolated from generic result rendering and enables focused security controls.
- **Alternatives considered:**
  - Inject raw HTML into existing result cards. Rejected: unsafe and not bridge-capable.
  - Open external browser window. Rejected: poor UX and weaker conversational integration.

### 4) Bridge protocol implementation with session scoping
- **Decision:** Implement a `postMessage` JSON-RPC bridge for `ui/notifications/tool-input`, `ui/notifications/tool-result`, `ui/message`, `ui/update-model-context`, and `tools/call` proxy. Track per-widget session IDs and validate message origin/session.
- **Rationale:** Prevents cross-widget leakage and supports concurrent widgets safely.
- **Alternatives considered:**
  - Global singleton message channel. Rejected: session confusion risk.

### 5) Security-first policy defaults
- **Decision:** Deny-by-default iframe sandbox and domain access policy; allow only domains declared by vetted resource metadata and local trusted defaults. Restrict UI-initiated tool calls to explicit visibility/allow rules.
- **Rationale:** Third-party widget code is untrusted; guardrails are mandatory.
- **Alternatives considered:**
  - Broad allowlist for speed. Rejected: unacceptable risk.

### 6) Graceful degradation path
- **Decision:** If extension negotiation fails or UI rendering fails, fallback to current text/resource output path without blocking tool completion.
- **Rationale:** Maintains existing MCP compatibility and avoids regressions.

## Risks / Trade-offs

- [Risk] Metadata schema drift across MCP Apps revisions → **Mitigation:** keep passthrough fields as flexible JSON plus strict validation at bridge boundaries.
- [Risk] XSS or privilege escalation via widget content → **Mitigation:** strict iframe sandbox, CSP/domain validation, and blocked parent DOM access.
- [Risk] Bridge complexity causing race conditions between tool updates and UI state → **Mitigation:** per-session routing, idempotent notification handling, and deterministic teardown.
- [Risk] Performance overhead from iframe rendering and message passing → **Mitigation:** lazy mount widgets, throttle high-frequency updates, and cap concurrent active widgets.
- [Risk] Regressions in existing tool result display → **Mitigation:** feature-flagged rollout with fallback to existing renderer.

## Migration Plan

1. Introduce data model changes and extension negotiation behind a feature flag.
2. Add frontend host runtime and bridge with no-op fallback path.
3. Enable rendering only for tools with valid app resource metadata.
4. Add integration tests for negotiation, bridge calls, and security enforcement.
5. Roll out gradually in desktop builds; monitor logs for bridge/session errors.
6. Remove/relax feature flag after validation period.

**Rollback strategy:** disable feature flag to revert to legacy text/resource rendering immediately, keeping protocol/model changes backward-compatible.

## Open Questions

- Should UI-initiated `tools/call` be globally gated by user consent per server, per tool, or per session?
- Do we need persistent widget state across chat reloads in phase 1, or can we limit to in-memory session state?
- Which CSP metadata fields should be supported in v1 (full standard + compatibility aliases, or strict standard-only)?
