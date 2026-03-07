## Context

The repository already has a complete protocol-facing LSP stack:
- Tauri command layer (`lsp_*`) with install/registry/resolver/runtime APIs.
- Frontend client (`lib/monaco/lsp/lsp-client.ts`) exposing these commands.
- Monaco adapter (`lib/monaco/lsp/monaco-lsp-adapter.ts`) binding language features into the designer editor.

Current gaps are mostly integration and behavior consistency:
- Editor LSP timeout is configurable in settings but adapter request timeouts are still hardcoded.
- Provider order is configurable but backend readiness currently only tries the first provider.
- Registry/install/list/uninstall/resolve APIs are implemented but not surfaced through an end-user management flow.
- Workspace symbols are available as a local Monaco action but not consistently exposed in editor workbench command surfaces.

## Goals / Non-Goals

**Goals:**
- Ensure configured LSP timeout settings are actually used for LSP requests in runtime behavior.
- Make provider order deterministic and effective by trying providers in sequence for readiness/install flows.
- Provide a user-facing LSP server lifecycle flow (discover/recommend/install/list/uninstall/status/launch resolution).
- Make workspace symbol capability discoverable from standard editor command surfaces when supported.
- Add/adjust tests to prevent regressions in the above behaviors.

**Non-Goals:**
- Replacing the existing LSP transport architecture (stdio + Tauri invoke/events).
- Expanding to unsupported language profiles beyond current resolver strategy.
- Building cloud-side LSP orchestration or remote LSP hosting.
- Refactoring unrelated Monaco editors that are intentionally non-LSP in this change.

## Decisions

### Decision 1: Make timeout a first-class adapter input sourced from settings
- Decision: Pass `editorSettings.lsp.timeoutMs` into Monaco LSP adapter options and use it as the default request timeout across cancelable LSP calls (with a specific override for workspace symbols if needed).
- Rationale: This removes the current mismatch between UI configuration and runtime behavior and preserves a single source of truth in settings store.
- Alternatives considered:
  - Keep hardcoded timeouts and re-label UI: rejected because it keeps misleading behavior.
  - Apply timeout only in client layer without adapter option: rejected because adapter owns feature-level request policy.

### Decision 2: Implement provider-order fallback loop in backend readiness
- Decision: In `ensure_server_ready`, attempt install/readiness using providers in configured order until one succeeds, preserving final failure reason if all fail.
- Rationale: Provider order setting should define actual fallback semantics, not only a preferred first provider.
- Alternatives considered:
  - Retry only on network errors: rejected because provider asset availability can fail for other reasons.
  - Frontend-managed fallback by multiple install calls: rejected because readiness/install policy belongs in backend command path.

### Decision 3: Expose server lifecycle with a dedicated LSP management surface
- Decision: Add a user-facing management path (within editor settings domain) that uses existing `lspRegistrySearch`, `lspRegistryGetRecommended`, `lspInstallServer`, `lspUninstallServer`, `lspListInstalledServers`, and `lspResolveLaunch` APIs.
- Rationale: These APIs already exist and are tested, but users cannot operate them directly today.
- Alternatives considered:
  - Keep auto-install only: rejected because troubleshooting and explicit control remain opaque.
  - Put controls only in developer/debug panel: rejected because this is user-level editor behavior.

### Decision 4: Promote workspace symbols into workbench command model
- Decision: Add a default editor workbench command contribution for workspace symbol search and gate it by `workspaceSymbols` capability.
- Rationale: Feature discoverability should align with the command palette/workbench capability model.
- Alternatives considered:
  - Keep standalone Monaco action only: rejected because it is less discoverable and not context-command aligned.

## Risks / Trade-offs

- [Risk] More backend install attempts may increase startup latency when first providers fail.  
  → Mitigation: bound retries to configured provider list order and keep existing request timeout controls.

- [Risk] Lifecycle UI adds complexity to editor settings surface.  
  → Mitigation: ship a minimal flow first (recommended + installed list + install/uninstall + status).

- [Risk] Different provider catalogs may return divergent metadata.  
  → Mitigation: normalize entries through existing registry response model and preserve provider source labels.

- [Risk] Timeout values set too low may degrade UX with frequent fallbacks.  
  → Mitigation: keep sensible slider bounds/defaults and document fallback/error states.

## Migration Plan

1. Add timeout wiring from settings to adapter request policy.
2. Update backend provider fallback behavior while preserving existing API shape.
3. Implement LSP management UI integration against existing commands.
4. Add workspace symbol command contribution in editor workbench path.
5. Update/add tests for timeout application, provider fallback order, command availability, and lifecycle operations.
6. Rollout with current feature flags; no data migration required.

Rollback strategy:
- Revert change set to previous hardcoded timeout and single-provider readiness behavior.
- Disable new management UI entry points while retaining backend APIs.

## Open Questions

- Should LSP management entry live inside current “LSP Strategy” card or as a dedicated sub-page under settings/editor?
- Should workspace symbol command use a custom query UI (quick pick) instead of `window.prompt` in first iteration?
- Do we need per-language timeout overrides now, or keep one global timeout until usage data indicates need?
