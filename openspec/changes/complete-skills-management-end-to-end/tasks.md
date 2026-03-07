## 1. Unified Action Orchestration

- [x] 1.1 Add a shared skill action orchestrator API that routes lifecycle actions by source ownership and runtime environment.
- [x] 1.2 Refactor Skills page and Settings skill management handlers to use the orchestrator instead of direct store-only mutations.
- [x] 1.3 Route discovery install/uninstall and related enable/disable/update flows through orchestrator outcomes and shared diagnostics.

## 2. Reconciliation and Bootstrap Convergence

- [x] 2.1 Extend `syncFromNative` reconciliation to handle native-linked stale records when native entries are removed.
- [x] 2.2 Implement ownership-aware stale-link handling (remove native-owned mirrors, safely downgrade legacy-linked user-owned records).
- [x] 2.3 Add bounded follow-up native reconciliation when native installed snapshot becomes available after initial bootstrap.
- [x] 2.4 Ensure bootstrap/sync metadata transitions remain deterministic and accurately reflect follow-up reconciliation progress.

## 3. Desktop Promotion for Marketplace and Generated Skills

- [x] 3.1 Integrate marketplace install flow with desktop native promotion (write content/resources to SSOT and register local native record).
- [x] 3.2 Integrate generated-skill completion flow with the same desktop promotion path and canonical native linkage updates.
- [x] 3.3 Implement partial-failure handling for promotion steps with recoverable retry metadata and localized errors.

## 4. Context Sync Freshness

- [x] 4.1 Update context auto-sync execution to read latest active skills at sync time instead of captured startup snapshots.
- [x] 4.2 Add debounced change-triggered skill context sync with bounded frequency.
- [x] 4.3 Ensure manual sync overrides pending debounced runs and produces converged context output state.

## 5. UI and Observability Consistency

- [x] 5.1 Ensure management/discovery surfaces render converged add/update/remove states without manual refresh.
- [x] 5.2 Standardize localized sync error and retry UX across skill management/discovery/marketplace-related surfaces.
- [x] 5.3 Add structured logs and sync diagnostics for orchestrated actions, stale-link cleanup, and follow-up native reconciliation.

## 6. Verification

- [x] 6.1 Add unit tests for orchestrator ownership routing and source-aware action behavior in web and desktop modes.
- [x] 6.2 Add unit/integration tests for deletion reconciliation, follow-up bootstrap convergence, and retry outcome transitions.
- [x] 6.3 Add integration tests for marketplace/generated desktop promotion and partial-failure recovery.
- [x] 6.4 Add context sync tests that verify active-skill freshness after runtime toggles.
- [x] 6.5 Replace or reduce chain-critical `page.evaluate` pseudo-simulations with assertions against real hook/store/native bridge behavior.
- [ ] 6.6 Run `pnpm lint`, `pnpm test -- --runInBand`, and `pnpm exec tsc --noEmit` and address regressions.
