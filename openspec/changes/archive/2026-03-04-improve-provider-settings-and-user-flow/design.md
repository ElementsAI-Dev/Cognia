## Context

`ProviderSettings` already includes rich capabilities (multi-key management, rotation, connection testing, batch operations, OAuth, local/custom providers, import/export), but the user journey is fragmented across different interaction surfaces and inconsistent action gating. This causes two practical issues:

- Users can miss critical steps (configure, verify, then enable) and end up with providers that look enabled but are not usable.
- The same provider may expose actions differently between table and card workflows, creating uncertainty about what to do next.

This change standardizes provider setup flow and interaction logic without introducing a new provider backend model.

## Goals / Non-Goals

**Goals:**
- Define a deterministic provider readiness model used by UI rendering and action gating.
- Ensure core provider actions are consistently discoverable in card and table workflows.
- Enforce safe transitions for enable/test/batch actions with clear user-facing guidance.
- Improve batch operation predictability and result visibility.
- Add focused test coverage for readiness, eligibility, and cross-view synchronization behaviors.

**Non-Goals:**
- Replacing existing provider storage schema in `useSettingsStore`.
- Redesigning provider cards/tables from scratch.
- Changing provider protocol implementations or external API contracts.
- Introducing server-side orchestration for settings flow.

## Decisions

### Decision 1: Introduce derived readiness + eligibility selectors
- Decision: Add centralized derived selectors (pure functions) for provider readiness state and action eligibility, shared by card and table render logic.
- Rationale: Current checks are repeated in multiple UI branches, which drifts behavior over time. Centralizing reduces divergence and improves testability.
- Alternatives considered:
  - Keep inline conditional checks in each component branch.
  - Rejected because behavior remains duplicated and hard to reason about.
  - Move all readiness logic into persisted store state.
  - Rejected because readiness is mostly derived from existing settings and transient test outcomes, and does not need permanent storage.

### Decision 2: Normalize action gating and feedback paths
- Decision: Route provider actions through shared guard helpers that return either `allowed` or `blocked(reason)` before mutation/testing calls.
- Rationale: Prevents invalid transitions (for example, enabling a remote provider without credentials) and guarantees consistent user feedback.
- Alternatives considered:
  - Keep current permissive mutations and rely on later error handling.
  - Rejected because it allows invalid intermediate states and increases user confusion.

### Decision 3: Keep batch scope tied to visible + selected providers
- Decision: Batch operations will strictly target the intersection of selected IDs and currently visible provider IDs.
- Rationale: This matches user mental model in filtered lists and avoids accidental operations on hidden items.
- Alternatives considered:
  - Preserve selection globally regardless of visibility.
  - Rejected because batch actions become non-obvious and high-risk when filters are active.

### Decision 4: Validate and sync cross-view state from a single source
- Decision: Use store-backed provider settings as the single source of truth and derive both card/table status from the same selectors; ensure table "configure" flows into focused card editing.
- Rationale: Eliminates contradictory status across views and keeps existing store architecture.
- Alternatives considered:
  - Maintain separate UI-only state mirrors per view.
  - Rejected because synchronization overhead and divergence risk increase.

## Risks / Trade-offs

- [Risk] Stricter gating may block workflows some users currently rely on.
  - Mitigation: Provide explicit blocked reasons and one-click next actions; keep local-provider exceptions where credentials are optional.
- [Risk] Centralized selectors may miss special-provider edge cases (OpenRouter, CLIProxyAPI, OAuth providers).
  - Mitigation: Add provider-type-specific selector tests and targeted integration tests in `provider-settings.test.tsx`.
- [Risk] Batch behavior changes may surprise users with existing saved selections.
  - Mitigation: Show clear selected count based on visible scope and reset invalid selections on filter change.
- [Trade-off] Additional abstraction increases initial code size.
  - Mitigation: Constrain helpers to readiness/eligibility only and avoid broad refactors outside provider settings.

## Migration Plan

1. Add readiness/eligibility helper module(s) and unit tests.
2. Integrate helpers in `ProviderSettings` card and table actions.
3. Align batch selection/test/toggle behavior with visible-scope rules.
4. Update user-facing messaging for blocked actions and empty states.
5. Run targeted provider settings tests and full lint/typecheck before merge.

Rollback:
- Revert helper integration in `provider-settings.tsx` while leaving store schema unchanged; no data migration is required.

## Open Questions

- Should successful connection verification be persisted across app restarts, or remain session-local?
- Should enabling without verification be soft-allowed (with warning) for some provider categories?
- Do we need telemetry for blocked actions to measure UX friction after rollout?

