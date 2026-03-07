## Context

Skills management currently spans multiple independently evolving paths: frontend skill CRUD, native repository/discovery/install commands, startup bootstrap reconciliation, marketplace import, generated-skill auto-install, and agent/context skill consumption. While canonical identity and bootstrap phases were introduced, runtime action routing still diverges between surfaces and can leave frontend state, native SSOT, and context/agent views out of sync.

Current constraints:
- Web mode has no native skill service and must remain fully functional.
- Desktop mode must treat native installed records as authoritative for installation lifecycle.
- Existing specs already define bootstrap and reconciliation behavior; this change extends and closes operational gaps.
- User-facing recovery must remain localized and actionable.

Stakeholders:
- Users managing skills in Settings/Skills/Marketplace/Generator surfaces.
- Agent runtime depending on accurate active-skill prompt/tool/context state.
- Maintainers debugging sync failures and state drift.

## Goals / Non-Goals

**Goals:**
- Guarantee deterministic state convergence for skill lifecycle actions across frontend and native environments.
- Ensure reconciliation handles add/update/remove flows, including native-side deletions.
- Remove refresh ambiguity by aligning startup and post-startup sync semantics.
- Define desktop-native promotion path for marketplace and generated skills.
- Ensure context and agent skill references stay fresh as active skills change.
- Improve full-chain verification with behavior-oriented integration coverage.

**Non-Goals:**
- Replacing the entire skill architecture or rewriting the native skill service.
- Redesigning all skills UI interactions.
- Introducing new marketplace protocols or skill package formats.
- Changing SKILL.md authoring conventions.

## Decisions

### 1. Introduce a unified skill action orchestrator for write paths

Decision:
- Add a shared orchestration layer for skill lifecycle actions (create/update/delete/enable/disable/install/uninstall) used by Settings, Skills page, Discovery, Marketplace, and Generator-related entry points.
- The orchestrator applies source- and environment-aware ownership rules, then executes appropriate frontend/native mutations.

Why:
- Current UI surfaces call store actions directly and bypass native synchronization in many paths.
- Centralized routing is required for deterministic behavior and consistent diagnostics.

Alternatives considered:
- Keep surface-level ad hoc calls: rejected due drift and duplicate policy logic.
- Force all writes through native APIs: rejected because web mode and purely frontend skills must remain first-class.

### 2. Extend reconciliation to include native deletion and stale-link cleanup

Decision:
- Add a delete-reconciliation pass in `syncFromNative`:
  - detect frontend records that are native-linked but absent from current native installed set;
  - remove records that are native-owned mirrors;
  - downgrade/link-clear records that were user-owned but linked by legacy fallback.
- Record diagnostics for removed and downgraded records.

Why:
- Existing reconciliation only adds/updates; removed native skills can remain as stale frontend records.

Alternatives considered:
- Keep stale records until manual cleanup: rejected because it violates parity expectations and causes confusing UI/tool state.

### 3. Make bootstrap/native readiness deterministic under async native loading

Decision:
- Keep phased bootstrap order, but add native-readiness convergence behavior:
  - first bootstrap run executes with current native snapshot;
  - when native installed snapshot transitions from empty/uninitialized to loaded, trigger a bounded follow-up reconciliation.
- Preserve explicit bootstrap/sync metadata updates for UI and logs.

Why:
- Native data may arrive after initial bootstrap hook execution; single-fire bootstrap can miss installed records.

Alternatives considered:
- Blocking bootstrap until native fully loaded: rejected due startup latency and UX impact.

### 4. Define desktop promotion policy for marketplace and generated installs

Decision:
- In desktop mode, marketplace/generated installations are promoted to native-managed records via orchestrator policy (write content/resources to SSOT and register local), then linked canonically.
- In web mode, these remain frontend-managed with explicit sync-origin metadata.

Why:
- Current marketplace path imports to frontend only, creating lifecycle inconsistency with native-managed installs.

Alternatives considered:
- Leave marketplace/generated as frontend-only in all modes: rejected for desktop consistency requirements.

### 5. Rework context sync to avoid stale closures and ensure active-skill freshness

Decision:
- Ensure periodic and manual context sync resolves active skills from latest store state at execution time, not captured startup snapshots.
- Re-enable or replace change-triggered sync behavior with debounce and bounded frequency.

Why:
- Current initializer starts interval sync with `syncOnChange: false`, risking stale active-skill snapshots in context files.

Alternatives considered:
- Rely only on interval with captured values: rejected as correctness risk for agent skill discovery.

### 6. Replace pseudo-E2E simulation with full-chain assertions for critical flows

Decision:
- Add/upgrade integration tests that validate real hook/store/native-bridge behavior for key lifecycle scenarios; reduce reliance on `page.evaluate` local simulations for chain-critical guarantees.

Why:
- Current broad mocked simulations do not prove actual end-to-end convergence.

Alternatives considered:
- Keep current tests unchanged: rejected because they under-detect chain breakage.

## Risks / Trade-offs

- [Policy complexity growth across skill sources] -> Mitigation: encode ownership matrix in one orchestrator module with explicit tests per source/environment pair.
- [Bootstrap follow-up reconcile may cause extra sync churn] -> Mitigation: trigger only on native snapshot readiness transition and guard with idempotent canonical matching.
- [Desktop promotion of marketplace/generated skills may increase operation latency] -> Mitigation: show progress state and classify failures as recoverable partial outcomes.
- [Legacy records might be reclassified incorrectly during stale-link cleanup] -> Mitigation: conservative downgrade path, structured diagnostics, and retry capability.
- [Broader integration tests increase CI time] -> Mitigation: keep critical-path suites targeted and move heavy non-critical checks to nightly jobs if needed.

## Migration Plan

1. Add orchestrator API and route existing UI actions through it behind a feature flag.
2. Implement deletion reconciliation and stale-link cleanup in sync engine.
3. Add native-readiness follow-up reconciliation in bootstrap lifecycle.
4. Integrate desktop promotion flow for marketplace and generated installs.
5. Update context sync execution to fetch latest active skills at sync time; add bounded change-triggered sync.
6. Expand/replace tests for full-chain state convergence and failure/retry semantics.
7. Roll out feature flag by default after verification, then remove legacy action paths.

Rollback:
- Disable orchestrator feature flag and revert to current direct store action paths while retaining non-breaking metadata fields.

## Open Questions

- Should desktop promotion be synchronous (blocking UX) or async with optimistic UI for marketplace/generated installs?
- For stale native-linked records that were user-edited, should fallback behavior keep content snapshot as custom skill or require user conflict resolution?
- Should deletion reconciliation run on every refresh or only when native installed snapshot version changes?
- Do we need a dedicated user-visible "sync report" panel, or are inline status/errors sufficient for this phase?
