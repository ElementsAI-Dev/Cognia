## 1. Readiness And Eligibility Foundation

- [x] 1.1 Add a shared provider readiness selector module that derives unconfigured/configured/verified states for built-in, local, and custom providers.
- [x] 1.2 Add shared provider action eligibility guards (enable, test, configure, batch eligibility) that return allow/blocked with user-facing reason text.
- [x] 1.3 Wire selector and guard inputs to existing settings store data and test-result state without introducing new persisted schema fields.

## 2. Provider Settings Workflow Integration

- [x] 2.1 Integrate shared readiness and eligibility logic into card workflow actions in `provider-settings.tsx` and related provider card interactions.
- [x] 2.2 Integrate the same readiness and eligibility logic into table workflow actions, including configure-from-table focus behavior.
- [x] 2.3 Ensure core setup actions (configure, enable/disable, test, default model) are consistently available or consistently blocked with reason in both views.
- [x] 2.4 Enforce preflight validation for custom provider testing (including base URL validation) before running network test calls.

## 3. Batch Actions And User Guidance

- [x] 3.1 Restrict batch operations to the intersection of selected and currently visible providers under active filters.
- [x] 3.2 Keep selection state synchronized with filter changes by removing hidden providers from active selection before batch execution.
- [x] 3.3 Improve batch progress/result feedback to include deterministic completion/cancel summary and per-provider outcomes.
- [x] 3.4 Update empty states and blocked-action guidance to provide actionable next steps when providers are unconfigured or filtered out.

## 4. Verification And Regression Safety

- [x] 4.1 Add unit tests for readiness selectors and action eligibility guards across provider categories and edge cases.
- [x] 4.2 Extend `provider-settings` interaction tests to cover cross-view synchronization, invalid transition blocking, and batch selection semantics.
- [x] 4.3 Run and pass `pnpm lint`, provider-settings related Jest tests, and `pnpm exec tsc --noEmit` before implementation completion.
