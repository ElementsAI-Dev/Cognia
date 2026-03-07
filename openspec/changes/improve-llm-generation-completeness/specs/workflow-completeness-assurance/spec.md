## ADDED Requirements

### Requirement: LLM generation workflow coverage SHALL be included in completeness assurance
Workflow completeness assurance SHALL include user-facing LLM generation workflows so that generation features remain consistently available, correctly wired, and verifiable across product surfaces.

#### Scenario: Generation workflow ownership traceability
- **WHEN** a generation workflow is introduced or updated
- **THEN** the workflow MUST declare its canonical runtime owner and entrypoint mapping as part of completeness checks

#### Scenario: Generation workflow regression visibility
- **WHEN** a previously available generation workflow loses runtime wiring or valid provider resolution
- **THEN** automated completeness verification MUST fail before release

### Requirement: Completeness evidence SHALL include generation-specific verification artifacts
Completeness validation for workflows SHALL include generation-specific tests that prove provider compatibility and route lifecycle status for impacted workflows.

#### Scenario: Generation-specific traceability in CI
- **WHEN** CI executes completeness verification for workflow changes
- **THEN** at least one automated test case MUST cover each impacted generation workflow requirement scenario
