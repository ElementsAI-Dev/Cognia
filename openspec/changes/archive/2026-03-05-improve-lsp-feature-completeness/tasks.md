## 1. Timeout Behavior Alignment

- [x] 1.1 Add LSP request-timeout option plumbing from editor settings into Monaco LSP adapter initialization.
- [x] 1.2 Replace hardcoded adapter request timeout defaults with settings-backed timeout policy (including workspace-symbol-specific policy).
- [x] 1.3 Verify request metadata for completion/hover/definition/references/rename/code-actions/workspace-symbols uses configured timeout values.

## 2. Provider-Order Readiness Fallback

- [x] 2.1 Refactor backend `ensure_server_ready` flow to iterate configured providers in order instead of using only the first provider.
- [x] 2.2 Preserve explicit success/failure semantics for provider fallback and return actionable reason when all providers fail.
- [x] 2.3 Add/adjust backend tests for provider-order success path and full-failure path.

## 3. LSP Server Lifecycle Management Surface

- [x] 3.1 Implement a user-facing LSP management section under editor settings to show installed servers and active-language status.
- [x] 3.2 Integrate recommendation/search actions using `lspRegistryGetRecommended` and `lspRegistrySearch`.
- [x] 3.3 Integrate install/uninstall/list/resolve workflows using `lspInstallServer`, `lspUninstallServer`, `lspListInstalledServers`, and `lspResolveLaunch`.
- [x] 3.4 Surface resolved launch source/provider details in UI status text for troubleshooting.

## 4. Workspace Symbol Discoverability in Workbench

- [x] 4.1 Add a default editor workbench command contribution for workspace symbol search.
- [x] 4.2 Gate command visibility/executability by `workspaceSymbols` capability from editor context matrix.
- [x] 4.3 Ensure existing designer editor action and workbench command route to a consistent workspace symbol query flow.

## 5. Verification and Regression Coverage

- [x] 5.1 Expand frontend tests for timeout propagation, workspace-symbol command visibility, and lifecycle status messaging.
- [x] 5.2 Expand integration tests around LSP lifecycle API usage paths in the new management flow.
- [x] 5.3 Run targeted verification (`pnpm test` for affected suites, `pnpm exec tsc --noEmit`) and fix regressions introduced by this change.
- [x] 5.4 Update user-facing/internal docs to reflect LSP management flow and provider-order fallback behavior.
