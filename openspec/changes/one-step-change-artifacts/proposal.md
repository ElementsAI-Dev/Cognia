## Why

Creating a new OpenSpec change currently requires multiple manual steps, which slows down early planning and leads to inconsistent artifacts. A one-step proposal flow reduces setup friction and ensures implementation-ready artifacts are produced with predictable quality.

## What Changes

- Add a one-step proposal workflow that scaffolds a change and generates required artifacts in dependency order.
- Derive a kebab-case change name from either explicit input or a free-form description.
- Generate `proposal.md`, `design.md`, and `tasks.md` using schema-driven instructions and templates.
- Ensure dependency-aware artifact generation (for example, design/specs after proposal, tasks after design/specs).
- Provide a clear completion status and prompt users to run `/opsx:apply` when apply-required artifacts are complete.

## Capabilities

### New Capabilities
- `one-step-change-proposal`: Create a change and automatically produce all apply-required planning artifacts in a single guided flow.

### Modified Capabilities
- None.

## Impact

- Affected areas: OpenSpec command workflow used by planning agents.
- Artifacts and conventions: `openspec/changes/<name>/proposal.md`, `design.md`, `tasks.md`, and `specs/**`.
- No runtime API changes expected; impact is on planning ergonomics, consistency, and readiness for implementation.
