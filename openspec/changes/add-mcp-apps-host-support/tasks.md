## 1. Protocol and Data Model Foundations

- [x] 1.1 Extend Rust MCP types to represent extension capabilities (`capabilities.extensions`), tool descriptor app metadata, and tool result `structuredContent`/`_meta` passthrough.
- [x] 1.2 Extend TypeScript MCP types and store contracts to mirror new backend fields while preserving backward compatibility with current tool/result rendering.
- [x] 1.3 Add/adjust Rust and TypeScript serialization tests to verify round-trip compatibility for legacy and MCP Apps-enabled payloads.

## 2. Backend MCP Apps Capability Handling

- [x] 2.1 Update MCP client initialization to advertise `io.modelcontextprotocol/ui` support and persist per-server extension support state.
- [x] 2.2 Add protocol method/constants coverage for required app bridge traffic (`ui/notifications/*`, `ui/message`, `ui/update-model-context`, and UI-initiated `tools/call` proxy handling).
- [x] 2.3 Implement manager-level session-aware routing/events for widget lifecycle and bridge requests without regressing existing MCP notification handling.

## 3. Frontend MCP App Host Runtime

- [x] 3.1 Implement a dedicated MCP App host component that mounts `text/html;profile=mcp-app` content in sandboxed iframes with per-widget session IDs.
- [x] 3.2 Implement frontend bridge runtime for postMessage JSON-RPC: receive tool-input/tool-result notifications and send UI-originated requests through approved backend channels.
- [x] 3.3 Integrate host runtime into tool result UI so MCP Apps render when available and fall back to existing text/resource cards on unsupported or failed paths.

## 4. Security and Policy Enforcement

- [x] 4.1 Enforce deny-by-default iframe sandbox configuration and validate widget origin/session before processing any bridge message.
- [x] 4.2 Enforce CSP/domain allowlists for widget network/resource access based on approved metadata policy.
- [x] 4.3 Add host-side permission checks for UI-initiated `tools/call` and external navigation mediation (block/allow with explicit user-visible error states).

## 5. Verification, Rollout, and Documentation

- [x] 5.1 Add automated tests for extension negotiation, metadata passthrough, and bridge method validation (including rejection paths).
- [x] 5.2 Add integration/e2e coverage for widget render, UI tool-call round trips, and graceful fallback behavior.
- [x] 5.3 Gate MCP Apps host runtime behind a feature flag and add structured logs/metrics for session errors and policy denials.
- [x] 5.4 Update internal MCP documentation and contributor guidance for MCP Apps host architecture, security constraints, and rollout/rollback operations.
