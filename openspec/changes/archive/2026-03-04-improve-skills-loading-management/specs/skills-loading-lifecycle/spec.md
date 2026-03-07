## ADDED Requirements

### Requirement: Skills startup bootstrap SHALL execute in deterministic phases
The system SHALL initialize skills through a single ordered bootstrap flow that separates store hydration, built-in reconciliation, and native reconciliation.

#### Scenario: Desktop mode startup with native skill service available
- **WHEN** the app starts in an environment where native skill service is available
- **THEN** the system MUST execute skill initialization in this order: hydrate persisted store, reconcile built-ins, reconcile native installed skills, and then mark skills bootstrap as ready

#### Scenario: Web mode startup without native skill service
- **WHEN** the app starts in an environment where native skill service is not available
- **THEN** the system MUST skip native reconciliation, complete hydration plus built-in reconciliation, and mark skills bootstrap as ready without native errors

### Requirement: Built-in skill loading SHALL be idempotent and upgrade-safe
The system SHALL reconcile built-in skills by canonical built-in identity so repeated startup runs do not create duplicates and built-in updates can be applied safely.

#### Scenario: Repeated startup with unchanged built-in definitions
- **WHEN** startup runs multiple times with the same built-in skill manifest
- **THEN** the system MUST keep exactly one record per built-in skill identity and MUST NOT append duplicate built-in entries

#### Scenario: Built-in definition changes between versions
- **WHEN** a built-in skill definition version or fingerprint changes
- **THEN** the system MUST update built-in-managed fields for that built-in record while preserving user-managed state fields that are out of built-in ownership

### Requirement: Bootstrap status SHALL be observable for UI and diagnostics
The system SHALL expose skill bootstrap state and timestamps so management UI and logs can report initialization progress and failures consistently.

#### Scenario: Bootstrap in progress
- **WHEN** skill initialization has started and has not completed
- **THEN** the system MUST expose a syncing/loading bootstrap state that can be rendered by management UI

#### Scenario: Bootstrap failure
- **WHEN** any bootstrap phase fails
- **THEN** the system MUST expose a structured error state and retain enough context for logs and user-facing recovery messaging
