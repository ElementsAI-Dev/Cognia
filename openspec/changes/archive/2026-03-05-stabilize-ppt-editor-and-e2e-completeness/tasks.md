## 1. Stabilize Seeded Editor State Path

- [x] 1.1 Audit `stores/tools/ppt-editor-store.ts` and `components/ppt/editor/**` for selectors/subscriptions that create unstable references during seeded deck load
- [x] 1.2 Refactor derived-state subscriptions to preserve referential stability and eliminate recursive update loops on editor initialization
- [x] 1.3 Add or update focused editor/store tests that cover seeded initialization and selection updates to prevent "Maximum update depth exceeded" regressions

## 2. Normalize PPT Automation Contracts

- [x] 2.1 Add stable `data-testid` contracts for present trigger, slideshow root/exit controls, and export trigger/options in PPT page/editor surfaces
- [x] 2.2 Update `app/(main)/ppt/page.test.tsx` to validate current component wiring and required control contracts instead of legacy assumptions
- [x] 2.3 Align shared selector constants/helpers used by Jest and Playwright so control targeting is localization-independent

## 3. Restore Seeded End-to-End Completeness Flow

- [x] 3.1 Rework `e2e/features/ppt-completeness.spec.ts` to follow the current seeded existing-deck flow and normalized selectors
- [x] 3.2 Assert end-to-end editor readiness, slideshow launch/exit, and export option availability in one deterministic scenario
- [x] 3.3 Ensure the PPT completeness scenario preserves actionable failure artifacts (trace/screenshot/log context) for runtime debugging

## 4. Reconcile Traceability and Verification Handoff

- [x] 4.1 Update `docs/features/ppt-completeness-traceability.md` so every new stability scenario maps to at least one automated test path
- [x] 4.2 Run targeted PPT verification suites (PPT page Jest path and PPT Playwright completeness scenario) and confirm they pass after fixes
- [x] 4.3 Record validation evidence in the change handoff notes and confirm no remaining coverage gaps before `/opsx:apply`
