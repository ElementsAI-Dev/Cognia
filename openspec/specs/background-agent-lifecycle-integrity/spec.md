# background-agent-lifecycle-integrity Specification

## Purpose
TBD - created by archiving change fix-background-agent-end-to-end-integrity. Update Purpose after archive.
## Requirements
### Requirement: Background agents MUST enter a manager-controlled lifecycle
All user-facing background-agent creation flows SHALL create agents through `BackgroundAgentManager` and SHALL execute through manager queue/start APIs rather than store-only snapshots.

#### Scenario: Run-in-background path creates a managed executable agent
- **WHEN** a caller starts a background task from the agent hook
- **THEN** the system creates the agent in `BackgroundAgentManager` and schedules execution through queue/start lifecycle events

#### Scenario: Store and manager state remain synchronized through events
- **WHEN** manager emits lifecycle events (`created`, `queued`, `started`, `progress`, terminal events)
- **THEN** `useBackgroundAgent` synchronizes agent snapshots and queue state into the store without requiring manual reconciliation

### Requirement: Background agents MUST be session-scoped and visible
New background agents SHALL have a concrete `sessionId` and SHALL be visible in session-filtered views for that session.

#### Scenario: Agent created with active session is visible in panel lists
- **WHEN** a background agent is created without explicit session override
- **THEN** the system binds it to the active session and includes it in `useBackgroundAgent` session-filtered agent collections

#### Scenario: Delegated background agent inherits source session
- **WHEN** a task is delegated from a team or other source that includes a session context
- **THEN** the created background agent uses that session context and is visible in that session's background UI

### Requirement: Persistence and recovery lifecycle MUST be explicitly wired
The application SHALL invoke manager restore on subsystem initialization and SHALL persist/shutdown background-agent state during app lifecycle exit boundaries.

#### Scenario: Persisted agents are restored on initialization
- **WHEN** the background-agent subsystem initializes and persisted snapshots exist
- **THEN** the manager restores eligible agents and normalizes interrupted runtime state according to defined recovery rules

#### Scenario: Exit boundary triggers best-effort persistence
- **WHEN** the application enters an unload or visibility-exit boundary
- **THEN** the system performs best-effort background-agent persistence/shutdown so recoverable state is retained

### Requirement: Checkpoint resume semantics MUST be deterministic
Pause/resume behavior SHALL explicitly represent queue-based execution continuity with checkpoint metadata, and SHALL NOT claim unsupported full in-memory replay semantics.

#### Scenario: Paused agent resumes with checkpoint flag and queued execution
- **WHEN** a paused agent is resumed
- **THEN** the system marks resume metadata, requeues the agent, and continues execution under documented checkpoint semantics

#### Scenario: User-facing behavior matches documented checkpoint guarantees
- **WHEN** checkpoint and resume behavior is displayed or documented
- **THEN** the described behavior matches implemented semantics and does not imply unsupported full replay

