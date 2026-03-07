# Prompt Marketplace Completeness Traceability

This document maps OpenSpec scenarios to automated test coverage.

## Scenario Matrix

| Spec Scenario | Coverage Type | Test File(s) |
| --- | --- | --- |
| Remote source is available | Store contract | `stores/prompt/prompt-marketplace-store.test.ts` |
| Remote source unavailable falls back with warning | Store contract | `stores/prompt/prompt-marketplace-store.test.ts` |
| Combined browse filters are applied | Component behavior | `components/prompt/marketplace/prompt-marketplace-browser.test.tsx` |
| Prompt install succeeds and operation status updates | Store contract + detail interaction | `stores/prompt/prompt-marketplace-store.test.ts`, `components/prompt/marketplace/prompt-marketplace-detail.test.tsx` |
| Update check marks prompts updatable | Store contract + E2E loop | `stores/prompt/prompt-marketplace-store.test.ts`, `e2e/features/prompt-marketplace-completeness.spec.ts` |
| Favorites/recent state propagates across views | Store contract | `stores/prompt/prompt-marketplace-store.test.ts` |
| Review submit blocks duplicate reviews | Store contract | `stores/prompt/prompt-marketplace-store.test.ts` |
| Helpful vote flow works | Detail interaction | `components/prompt/marketplace/prompt-marketplace-detail.test.tsx` |
| Preview test validates required variables and resets deterministically | Component behavior | `components/prompt/marketplace/prompt-preview-dialog.test.tsx` |
| Publish form validates required metadata and normalizes tags | Component behavior | `components/prompt/marketplace/prompt-publish-dialog.test.tsx` |
| Export produces versioned payload | Store contract + component behavior | `stores/prompt/prompt-marketplace-store.test.ts`, `components/prompt/marketplace/prompt-import-export.test.tsx` |
| Import applies conflict strategy and returns per-item report | Store contract + component behavior | `stores/prompt/prompt-marketplace-store.test.ts`, `components/prompt/marketplace/prompt-import-export.test.tsx` |
| Browse → install → update loop | E2E | `e2e/features/prompt-marketplace-completeness.spec.ts` |
| Publish → export → import loop | E2E | `e2e/features/prompt-marketplace-completeness.spec.ts` |

## Notes

- Store contract tests are the primary regression gate for canonical state transitions and operation-state semantics.
- Component tests verify user-visible validation/feedback and integration with store actions.
- E2E tests cover closed-loop flows under the settings prompt marketplace surface.
