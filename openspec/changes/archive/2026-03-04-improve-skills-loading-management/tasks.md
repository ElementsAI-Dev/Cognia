## 1. Skill Identity and Store Migration

- [x] 1.1 Extend skill types/store state with canonical sync metadata (for example native link fields, sync state, last sync timestamps, last sync error).
- [x] 1.2 Implement backward-compatible persist migration that maps legacy records to canonical identity using fallback matching.
- [x] 1.3 Add store utilities/selectors for bootstrap status and reconciliation diagnostics.

## 2. Deterministic Startup Bootstrap

- [x] 2.1 Implement a unified skills bootstrap flow that runs hydration, built-in reconciliation, and optional native reconciliation in deterministic order.
- [x] 2.2 Refactor `SkillProvider` and `SkillSyncInitializer` to use the unified bootstrap flow and avoid overlapping startup writes.
- [x] 2.3 Implement idempotent built-in reconciliation with version/fingerprint-aware update behavior.

## 3. Source-Aware Reconciliation and Sync Actions

- [x] 3.1 Implement reconciliation engine that matches skills by canonical identity first and legacy heuristics only for migration fallback.
- [x] 3.2 Define and implement source-aware ownership rules for builtin, native-installed, and web-only custom/imported skills.
- [x] 3.3 Update sync hooks to report explicit outcomes (success/partial/failure) and structured recoverable errors.
- [x] 3.4 Ensure retry sync reuses current source state and clears stale error status after successful reconciliation.

## 4. Management UI and Observability

- [x] 4.1 Surface bootstrap/sync state and last sync results in skill settings and discovery views.
- [x] 4.2 Standardize user-facing i18n error mapping for sync/reconciliation failures and provide retry entry points.
- [x] 4.3 Add structured logging for reconciliation actions (added/updated/skipped/conflicted) in providers/hooks.

## 5. Verification

- [x] 5.1 Add unit tests for startup ordering and environment-specific behavior (native available vs unavailable).
- [x] 5.2 Add unit tests for canonical identity reconciliation, conflict handling, and source-aware policies.
- [x] 5.3 Add integration-level tests for UI state reflection after reconciliation updates and sync failures/retries.
- [x] 5.4 Run `pnpm lint`, `pnpm test -- --runInBand`, and `pnpm exec tsc --noEmit` and resolve issues introduced by this change.
