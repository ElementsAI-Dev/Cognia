# background-agent-delegation-reliability Specification

## Purpose
TBD - created by archiving change fix-background-agent-end-to-end-integrity. Update Purpose after archive.
## Requirements
### Requirement: Background delegation MUST resolve for all terminal outcomes
Delegation operations targeting BackgroundAgent SHALL resolve for all terminal states, including `completed`, `failed`, `cancelled`, and `timeout`.

#### Scenario: Completed background delegation resolves successfully
- **WHEN** a delegated background agent emits `agent:completed`
- **THEN** the delegation is marked completed, returns a result, and unsubscribes terminal listeners

#### Scenario: Cancelled or timed-out background delegation resolves without hanging
- **WHEN** a delegated background agent emits `agent:cancelled` or `agent:timeout`
- **THEN** the delegation resolves to a terminal non-success outcome and does not remain pending

### Requirement: Delegation terminal mapping MUST preserve outcome semantics
The bridge SHALL map background terminal states to explicit delegation statuses and SHALL preserve reason details for upstream consumers.

#### Scenario: Timeout is surfaced with timeout reason
- **WHEN** a delegated background agent times out
- **THEN** the resolved delegation includes timeout-specific error context for the caller

#### Scenario: Cancellation is surfaced as cancellation outcome
- **WHEN** a delegated background agent is cancelled
- **THEN** the resolved delegation indicates cancellation semantics and caller workflows can branch accordingly

### Requirement: Delegation lifecycle MUST release resources after terminal resolution
After any terminal delegation resolution, the system SHALL remove event subscriptions and avoid stale listeners for subsequent delegations.

#### Scenario: Listener cleanup occurs after terminal event
- **WHEN** a delegation resolves due to any terminal event
- **THEN** no active terminal listener remains for that delegation target agent

### Requirement: Team workflow MUST expose delegation-to-background path
Agent team flows SHALL provide an invocable path for task delegation to BackgroundAgent where delegation is intended behavior.

#### Scenario: Team action triggers background delegation
- **WHEN** a team user invokes "delegate task to background" from supported team workflow controls
- **THEN** the system calls team delegation APIs and creates a tracked background delegation record

