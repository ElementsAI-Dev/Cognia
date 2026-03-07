## MODIFIED Requirements

### Requirement: Skills startup bootstrap SHALL execute in deterministic phases
The system SHALL initialize skills through a single ordered bootstrap flow that separates store hydration, built-in reconciliation, and native reconciliation, and SHALL converge to native-installed truth when native installed data becomes available after initial bootstrap.

#### Scenario: Desktop mode startup with native skill service available
- **WHEN** the app starts in an environment where native skill service is available
- **THEN** the system MUST execute skill initialization in this order: hydrate persisted store, reconcile built-ins, reconcile native installed skills, and then mark skills bootstrap as ready

#### Scenario: Web mode startup without native skill service
- **WHEN** the app starts in an environment where native skill service is not available
- **THEN** the system MUST skip native reconciliation, complete hydration plus built-in reconciliation, and mark skills bootstrap as ready without native errors

#### Scenario: Native installed snapshot becomes available after initial bootstrap
- **WHEN** native installed skills are loaded after an initial bootstrap pass that completed with incomplete native snapshot data
- **THEN** the system MUST trigger a bounded follow-up native reconciliation and converge frontend installed-state view to current native records

### Requirement: Bootstrap status SHALL be observable for UI and diagnostics
The system SHALL expose skill bootstrap and follow-up reconciliation state transitions and timestamps so management UI and logs can report initialization progress, convergence progress, and failures consistently.

#### Scenario: Bootstrap in progress
- **WHEN** skill initialization has started and has not completed
- **THEN** the system MUST expose a syncing/loading bootstrap state that can be rendered by management UI

#### Scenario: Bootstrap failure
- **WHEN** any bootstrap phase fails
- **THEN** the system MUST expose a structured error state and retain enough context for logs and user-facing recovery messaging

#### Scenario: Follow-up native reconciliation in progress
- **WHEN** a post-bootstrap native convergence run is triggered
- **THEN** the system MUST expose sync state transitions and completion timestamps without resetting persistent bootstrap metadata incorrectly
