## Why

PPT chain validation currently shows a deterministic break in the seeded edit/present/export path: the page can hit a React "Maximum update depth exceeded" error before presentation controls become available. In parallel, PPT page tests and E2E selectors have drifted from current UI contracts, so "completeness" cannot be asserted with reliable automated evidence.

## What Changes

- Stabilize PPT editor state subscription/render behavior so seeded presentations can enter editor mode without recursive update loops.
- Align PPT surface test contracts (unit + E2E selectors and expectations) with the current page/editor/preview/slideshow UI structure.
- Restore end-to-end coverage for the core seeded flow: open existing deck -> present -> export options visible and invokable.
- Add explicit scenario-to-test traceability updates and targeted validation evidence for the repaired chain.

## Capabilities

### New Capabilities
- `ppt-editor-e2e-stability-assurance`: Define required PPT editor stability and verifiable end-to-end behavior for seeded presentation editing, slideshow entry, and export action availability.

### Modified Capabilities
- None.

## Impact

- Affected code:
  - `components/ppt/editor/**`
  - `stores/tools/ppt-editor-store.ts`
  - `app/(main)/ppt/page.tsx`
  - `app/(main)/ppt/page.test.tsx`
  - `e2e/features/ppt-completeness.spec.ts`
  - `docs/features/ppt-completeness-traceability.md`
- Validation scope:
  - PPT editor Jest suites
  - PPT page Jest suites
  - Playwright PPT completeness scenarios
- Risk:
  - State subscription adjustments may alter editor render/update timing and require regression checks for undo/redo, selection, and slideshow transitions.
