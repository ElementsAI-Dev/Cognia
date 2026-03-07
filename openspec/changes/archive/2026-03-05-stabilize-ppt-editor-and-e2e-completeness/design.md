## Context

The current PPT implementation already covers creation, editing, preview/slideshow, and export features, but seeded end-to-end validation reveals a deterministic runtime break before key editor controls are available. The failure presents as a React update-depth loop in the PPT editor path, and existing page/E2E tests no longer reflect the current UI composition and selector contracts.

This change is a stabilization and verification reconciliation effort across `app/(main)/ppt`, `components/ppt/editor`, `stores/tools/ppt-editor-store`, and PPT-focused test suites. Stakeholders are users relying on existing deck workflows and maintainers needing trustworthy CI signals for completeness claims.

## Goals / Non-Goals

**Goals:**
- Eliminate recursive update behavior in seeded PPT editor entry so existing presentations can be opened reliably.
- Establish stable, explicit UI test contracts for critical present/export controls used by E2E and page-level tests.
- Restore deterministic seeded-flow verification from editor entry through slideshow and export action availability.
- Reconcile scenario-to-test traceability so implementation handoff includes auditable validation evidence.

**Non-Goals:**
- No redesign of PPT UX, generation strategy, or slideshow feature set.
- No replacement of Zustand, Next.js routing, or existing export pipelines.
- No expansion into unrelated workflow capabilities outside PPT stability and verification.

## Decisions

### Decision 1: Stabilize editor state subscriptions to avoid render-loop triggers
- Approach: Refactor PPT editor derived-state consumption so subscribed snapshots remain referentially stable unless meaningful data changes, especially for selection-derived collections.
- Why: Dynamic selectors returning fresh composite objects/arrays can produce repeated subscription churn and recursive update cascades under seeded data.
- Alternative considered: Add local guard flags/retry wrappers around editor rendering.
- Why not: Guarding symptoms does not remove unstable subscription patterns and can mask future regressions.

### Decision 2: Define explicit automation contracts for critical PPT controls
- Approach: Add and preserve stable `data-testid` contracts for core controls required by regression flows (start presentation, export trigger/options, slideshow root).
- Why: Current E2E assumptions and runtime UI contracts drifted apart, causing false negatives and brittle tests.
- Alternative considered: Keep tests based only on visible text/icon structure.
- Why not: Text/icon-only locators are more fragile under localization and visual refinements.

### Decision 3: Rebase page-level tests on current architecture, not legacy mocks
- Approach: Update PPT page tests to mock the current component graph (`PPTCreationHub`, template/gallery behavior, current editor integration) and remove deprecated assumptions.
- Why: Existing tests still target retired component contracts and fail before asserting relevant behavior.
- Alternative considered: Delete stale tests and rely only on E2E.
- Why not: Unit/page tests remain necessary for fast failure localization and branch-level feedback.

### Decision 4: Treat traceability + targeted validation as a release gate
- Approach: Update scenario-to-test mapping and rerun targeted Jest + Playwright suites to produce concrete evidence for each repaired scenario.
- Why: The prior change is blocked at verification handoff; this gate prevents repeating "claimed complete but unverifiable" outcomes.
- Alternative considered: Mark completeness based on manual spot checks.
- Why not: Manual checks are non-repeatable and insufficient for CI-backed assurance.

## Risks / Trade-offs

- [Risk] Subscription stabilization may alter editor rerender timing for selection-heavy interactions.
  - Mitigation: Run focused editor store/component suites (selection, undo/redo, slideshow entry) and verify no behavior regressions.
- [Risk] New test contracts can lock in implementation details.
  - Mitigation: Limit explicit IDs to workflow-critical controls only; avoid over-tagging presentational nodes.
- [Risk] E2E stability may still be affected by unrelated dev-overlay/runtime noise.
  - Mitigation: Keep deterministic seeded fixture setup and isolate failure capture to PPT scenario outputs.
- [Trade-off] Additional validation steps increase pre-handoff effort.
  - Mitigation: Keep the command set targeted to PPT paths and reuse traceability mapping as living documentation.

## Migration Plan

1. Patch editor/store subscription patterns that can emit unstable snapshots in seeded deck rendering.
2. Add or normalize critical PPT `data-testid` contracts across editor/slideshow/export entry points.
3. Update PPT page tests and E2E selectors to match the live component structure.
4. Refresh `docs/features/ppt-completeness-traceability.md` mappings for this capability.
5. Run targeted Jest and Playwright suites; capture pass/fail evidence and unblock implementation handoff.

Rollback strategy:
- Revert editor subscription adjustments and test-contract additions as a single commit group if regressions appear in non-PPT flows.

## Open Questions

- Should stable test IDs for PPT controls be documented as a formal testing convention for other feature domains?
- Do we want an automated lint/check that flags E2E selectors not found in source to catch future drift earlier?
