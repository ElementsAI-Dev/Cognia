# Plugin Point Governance Policy

This policy defines contract and lifecycle rules for Cognia plugin points.

## Contract Declaration

- Every plugin point MUST exist in `lib/plugin/contracts/plugin-points.ts`.
- Each point MUST declare: `kind`, `stability`, `status`, `owner`, `binding`, `introducedIn`.
- Deprecated points MUST include `deprecatedIn` and `replacementId`.

Benchmark alignment:
- VS Code: declarative contribution + activation contracts.
- Backstage: explicit extension-point boundaries.

## Activation Discipline

- Runtime-dispatched activation events are limited to:
  - `startup`
  - `onCommand:*`
  - `onTool:*`
- Legacy aliases are tolerated with migration diagnostics:
  - `onStartup` -> `startup`
  - `onAgentTool:*` -> `onTool:*`
- Virtual activation points are contract-declared but not runtime-dispatched and must surface diagnostics.

Benchmark alignment:
- VS Code: explicit activation event semantics and lazy activation patterns.

## Lifecycle Safety

- Plugin-owned extension registrations MUST be tracked and cleaned up on disable/unload.
- Hook registrations MUST be removed during plugin teardown.
- Conformance tests MUST fail when stale plugin-owned registrations survive teardown.

Benchmark alignment:
- JetBrains: dynamic plugin unload safety and strict lifecycle cleanup.

## Deterministic Ordering

- Extension render ordering MUST be deterministic by priority.
- Hook execution ordering MUST be deterministic by configured priority and runtime ordering policy.

Benchmark alignment:
- WordPress: deterministic action/filter ordering via priorities.

## Enforcement Modes

- `warn`: emit diagnostics for unknown/deprecated/virtual points.
- `block`: reject unsupported point declarations.

## Release Gates

Release gates MUST include:
- plugin point contract audit (`pnpm audit:plugin-points`)
- cross-SDK parity check (`pnpm check:plugin-point-parity`)
- readiness checks (`pnpm readiness:plugin-sdk`)
