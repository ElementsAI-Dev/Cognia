# PPT Completeness Traceability

This document maps OpenSpec scenarios in
`openspec/changes/stabilize-ppt-editor-and-e2e-completeness/specs/ppt-editor-e2e-stability-assurance/spec.md`
to automated coverage.

## Scenario Mapping

| Spec Scenario | Automated Coverage |
|---|---|
| Seeded presentation opens without runtime recursion failure | `stores/tools/ppt-editor-store.test.ts` (selector reference stability), `e2e/features/ppt-completeness.spec.ts` (seeded flow asserts no "Maximum update depth exceeded") |
| Editor controls remain available after seeded load | `components/ppt/editor/editor-toolbar.test.tsx` (present/export contract IDs), `e2e/features/ppt-completeness.spec.ts` |
| Presentation mode trigger is contractually addressable | `lib/ppt/test-selectors.ts`, `components/ppt/editor/editor-toolbar.tsx`, `e2e/features/ppt-completeness.spec.ts` |
| Export menu options are contractually addressable | `lib/ppt/test-selectors.ts`, `components/ppt/editor/editor-toolbar.tsx`, `components/ppt/editor/editor-toolbar.test.tsx`, `e2e/features/ppt-completeness.spec.ts` |
| Seeded deck present-and-export flow passes | `e2e/features/ppt-completeness.spec.ts` |
| Traceability document reflects stability capability | This file (`docs/features/ppt-completeness-traceability.md`) |

## Validation Notes

- E2E seeded scenario now captures page and console errors into Playwright attachments (`ppt-page-errors`, `ppt-console-errors`) to improve runtime diagnosis.
- Slideshow and export assertions use shared selector contracts from `lib/ppt/test-selectors.ts` to reduce drift between UI and tests.
