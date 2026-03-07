## 1. Input and Change Setup

- [ ] 1.1 Implement input parsing to accept either explicit kebab-case name or free-form description.
- [ ] 1.2 Add deterministic kebab-case name derivation for description-based requests.
- [ ] 1.3 Detect existing change-name collisions and prompt for continue-vs-new behavior.
- [ ] 1.4 Run `openspec new change "<name>"` and validate scaffold creation path.

## 2. Status and Dependency Orchestration

- [ ] 2.1 Implement status loader using `openspec status --change "<name>" --json`.
- [ ] 2.2 Parse `applyRequires` and artifact readiness (`ready`, `blocked`, `done`) from status JSON.
- [ ] 2.3 Build generation loop that selects only dependency-satisfied (`ready`) artifacts each iteration.
- [ ] 2.4 Re-check status after each artifact write and stop when all `applyRequires` artifacts are `done`.

## 3. Artifact Generation

- [ ] 3.1 Implement instruction fetcher via `openspec instructions <artifact-id> --change "<name>" --json`.
- [ ] 3.2 Read all completed dependency artifact files before generating each artifact.
- [ ] 3.3 Generate `proposal.md` from template and proposal guidance.
- [ ] 3.4 Generate `design.md` from template and design guidance.
- [ ] 3.5 Generate capability spec files under `specs/<capability>/spec.md` from proposal capabilities.
- [ ] 3.6 Generate `tasks.md` with tracked checkbox format (`- [ ] X.Y ...`) from specs/design context.
- [ ] 3.7 Verify each artifact file exists on disk immediately after writing.

## 4. Completion Output and Operator UX

- [ ] 4.1 Implement progress reporting for each generated artifact (e.g., `Created <artifact-id>`).
- [ ] 4.2 Print final human-readable status with `openspec status --change "<name>"`.
- [ ] 4.3 Add completion summary with change location, artifact list, and apply-ready message.
- [ ] 4.4 Include final prompt to run `/opsx:apply` for implementation.

## 5. Validation and Regression Coverage

- [ ] 5.1 Add tests for explicit-name and description-based name derivation paths.
- [ ] 5.2 Add tests for dependency-ordered artifact generation and apply-ready stop condition.
- [ ] 5.3 Add tests that enforce artifact dependency reading before generation.
- [ ] 5.4 Add tests for idempotent behavior when artifacts or change directory already exist.
