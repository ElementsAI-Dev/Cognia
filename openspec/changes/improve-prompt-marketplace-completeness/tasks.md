## 1. Repository Layer & Data Contracts

- [ ] 1.1 Create `lib/prompts/marketplace.ts` repository interface covering browse/search/detail/reviews/publish/update/import-validation operations
- [ ] 1.2 Implement remote provider adapter with typed response mapping and structured error normalization
- [ ] 1.3 Implement sample fallback adapter and source-state reporting (`remote` / `fallback`)
- [ ] 1.4 Add shared helpers in `lib/prompts/marketplace-utils.ts` for filter composition, schema guards, and entity normalization

## 2. Store Refactor & Lifecycle Completeness

- [ ] 2.1 Refactor `prompt-marketplace-store` to consume repository APIs instead of direct sample-only mutation paths
- [ ] 2.2 Introduce per-operation state tracking for install/update/uninstall/publish/import/review actions
- [ ] 2.3 Implement complete install lifecycle semantics including update check/apply and uninstall rollback-safe failure handling
- [ ] 2.4 Ensure favorites/recent/history/collections activity updates stay cross-tab consistent from a single canonical state source

## 3. Browse, Detail, and Interaction Modules

- [ ] 3.1 Align browse filtering/sorting/pagination behavior so combined filters are consistently applied in desktop and mobile
- [ ] 3.2 Ensure detail actions (copy/share/favorite/install/uninstall) provide explicit success/error feedback and no stale loading state
- [ ] 3.3 Complete review and helpful flows with rating aggregate updates and duplicate-review policy enforcement
- [ ] 3.4 Harden preview flow for required variable validation, model execution errors, and deterministic result reset behavior

## 4. Publish and Import/Export Hardening

- [ ] 4.1 Add publish input validation rules (required fields, category validity, tag normalization) with field-level UI feedback
- [ ] 4.2 Define and enforce versioned import/export schema for marketplace prompt portability
- [ ] 4.3 Implement conflict handling strategies (`skip` / `overwrite` / `duplicate`) and per-item import result reporting
- [ ] 4.4 Persist publish/import outcomes into marketplace activity state and ensure counters/listings update correctly

## 5. Quality Gates & Regression Coverage

- [ ] 5.1 Expand store contract tests for remote/fallback source behavior and operation-state transitions
- [ ] 5.2 Add/refresh component tests for browse filters, detail interactions, publish validation, and import/export failure paths
- [ ] 5.3 Add E2E coverage for browse → install → update and publish → export → import critical closed loops
- [ ] 5.4 Create scenario-to-test traceability notes linking spec scenarios to concrete test files

## 6. Rollout, Safeguards, and Documentation

- [ ] 6.1 Add feature flag or guarded switch to control remote-first rollout and fallback behavior
- [ ] 6.2 Add user-visible source/fallback and recoverable error messaging in marketplace surfaces
- [ ] 6.3 Run full validation (`pnpm lint && pnpm test && pnpm exec tsc --noEmit`) and fix regressions
- [ ] 6.4 Update internal docs for prompt marketplace architecture, operation states, and troubleshooting guidance