# Documentation Source of Truth

- Last verified: 2026-03-10
- Purpose: keep developer-facing documentation aligned with executable repository behavior.

## 1. Canonical Commands

Verified against `package.json` scripts.

| Workflow | Canonical command | Source |
|---|---|---|
| Web development | `pnpm dev` | `package.json:scripts.dev` |
| Production build (.next) | `pnpm build` | `package.json:scripts.build` |
| Static export build (out/) | `pnpm build:export` | `package.json:scripts.build:export` |
| Production server | `pnpm start` | `package.json:scripts.start` |
| Lint | `pnpm lint` | `package.json:scripts.lint` |
| Unit tests | `pnpm test` | `package.json:scripts.test` |
| Unit tests (watch) | `pnpm test:watch` | `package.json:scripts.test:watch` |
| Unit tests (coverage) | `pnpm test:coverage` | `package.json:scripts.test:coverage` |
| Plugin point contract audit | `pnpm audit:plugin-points` | `package.json:scripts.audit:plugin-points` |
| Plugin point parity check | `pnpm check:plugin-point-parity` | `package.json:scripts.check:plugin-point-parity` |
| Plugin SDK readiness gate | `pnpm readiness:plugin-sdk` | `package.json:scripts.readiness:plugin-sdk` |
| Canvas benchmark traceability gate | `pnpm check:canvas-benchmark-traceability` | `package.json:scripts.check:canvas-benchmark-traceability` |
| Canvas e2e quality gate | `pnpm check:canvas-e2e-quality` | `package.json:scripts.check:canvas-e2e-quality` |
| E2E tests | `pnpm test:e2e` | `package.json:scripts.test:e2e` |
| E2E tests (UI) | `pnpm test:e2e:ui` | `package.json:scripts.test:e2e:ui` |
| E2E tests (headed) | `pnpm test:e2e:headed` | `package.json:scripts.test:e2e:headed` |
| Android init | `pnpm tauri:android:init` | `package.json:scripts.tauri:android:init` |
| Android dev | `pnpm tauri:android:dev` | `package.json:scripts.tauri:android:dev` |
| Android build | `pnpm tauri:android:build` | `package.json:scripts.tauri:android:build` |

Direct CLI invocations used by repository workflows (no `package.json` alias):

- `pnpm tauri dev`
- `pnpm tauri build`
- `pnpm tauri info`
- `pnpm exec tsc --noEmit`
- `pnpm lint --fix`

## 2. Testing and Coverage Truth

Verified against `jest.config.ts` and `package.json` scripts.

### Coverage thresholds

- Statements: `55`
- Branches: `50`
- Functions: `40`
- Lines: `55`

### Test command mapping

- Unit test entrypoint: `pnpm test`
- Coverage entrypoint: `pnpm test:coverage`
- E2E entrypoint: `pnpm test:e2e`

## 3. Subsystem to Canonical Documentation Mapping

| Implemented subsystem | Canonical documentation entry |
|---|---|
| Next.js web application | `README.md`, `docs/development/getting-started.md` |
| Tauri desktop runtime | `README.md`, `docs/development/building.md` |
| Convex cloud sync runtime contract | `docs/reference/convex-sync-operations.md`, `docs/reference/documentation-source-of-truth.md` |
| Agent orchestration and delegation | `docs/features/agent-integration.md`, `docs/reference/agent-orchestration-dify.md` |
| External agent ACP validity/sessions diagnostics contract | `docs/reference/agent-orchestration-dify.md`, `types/agent/external-agent.ts`, `types/core/session.ts` |
| Canvas completeness contract and benchmark evidence | `docs/features/canvas-editor.md`, `docs/reference/canvas-benchmark-scorecard.md` |
| Plugin point contract governance | `docs/features/plugin-development.md`, `docs/reference/plugin-point-governance-policy.md` |
| Testing workflow and thresholds | `TESTING.md`, `docs/development/testing.md` |
| Contributor process and quality gates | `CONTRIBUTING.md`, `docs/development/contributing.md` |

## 4. Maintenance Contract

When implementation-facing behavior changes, update this file and linked canonical docs in the same change if any of the following changed:

- `package.json` scripts or command expectations
- `jest.config.ts` coverage thresholds or test behavior contracts
- Tauri build/runtime path expectations
- Agent orchestration boundaries or runtime ownership
- External agent validity snapshot fields, ACP extension support-gating, or strict/fallback reason-code persistence contract

## 5. Evidence Sources

- `package.json`
- `jest.config.ts`
- `next.config.ts`
- `src-tauri/tauri.conf.json`
- `lib/ai/agent/**`
- `hooks/agent/**`
- `components/providers/initializers/external-agent-initializer.tsx`
- `lib/sync/**`
- `convex/http.ts`
- `convex/sync.ts`
