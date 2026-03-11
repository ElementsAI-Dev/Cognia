# Testing Guide

This guide defines the canonical test workflow for Cognia.

- Verified against: `package.json`, `jest.config.ts`, `playwright.config.ts`
- Last verified: 2026-03-10

## 1. Test Stack

- Unit/integration: Jest + React Testing Library
- E2E: Playwright
- Environment: jsdom (unit), real browser (E2E)

## 2. Canonical Commands

```bash
# Unit + integration
pnpm test
pnpm test:watch
pnpm test:coverage

# End-to-end
pnpm test:e2e
pnpm test:e2e:ui
pnpm test:e2e:headed
```

Optional direct invocations used in debugging workflows:

```bash
pnpm test path/to/file.test.tsx
pnpm test --testNamePattern="Button"
pnpm test:e2e e2e/features/chat.spec.ts
pnpm test:e2e --grep "Chat Flow"
```

## 3. Coverage Contract

Global thresholds are enforced in `jest.config.ts`:

- Statements: `55`
- Branches: `50`
- Functions: `40`
- Lines: `55`

Coverage output (from `pnpm test:coverage`) is written to `coverage/`:

- HTML report: `coverage/lcov-report/index.html`
- LCOV: `coverage/lcov.info`
- JUnit XML: `coverage/junit.xml`
- Clover XML: `coverage/clover.xml`

## 4. Test File Placement

- Unit tests are co-located with source files as `*.test.ts` / `*.test.tsx`.
- E2E specs live under `e2e/` grouped by feature.

## 5. Pre-PR Validation

Run this baseline before requesting review:

```bash
pnpm lint
pnpm test
pnpm exec tsc --noEmit
```

For changes touching user-critical flows, also run:

```bash
pnpm test:e2e
```

## 6. Practical Notes

- Mock Tauri/external integrations via `__mocks__/` where possible.
- Prefer behavior-focused assertions over implementation detail assertions.
- Keep slow or flaky E2E scenarios isolated and retry-aware.

## 7. Troubleshooting

### Coverage appears missing

- Confirm `collectCoverage` is enabled by `--coverage` (via `pnpm test:coverage`).
- Confirm target files are not excluded by `coveragePathIgnorePatterns`.

### E2E fails to start the app

- Ensure `pnpm dev` can start on `http://localhost:3000`.
- Re-run with `pnpm test:e2e:ui` to inspect failures interactively.
