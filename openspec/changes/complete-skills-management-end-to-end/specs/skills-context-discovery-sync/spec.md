## ADDED Requirements

### Requirement: Active skill context sync SHALL reflect current store state
The system SHALL synchronize active skill context artifacts from the latest store state so context files and discovery references remain accurate during runtime.

#### Scenario: Active skills change after startup
- **WHEN** active skill selection changes after initialization
- **THEN** the next sync run MUST include the new active skill set and exclude removed active skills

#### Scenario: Interval sync executes after state updates
- **WHEN** periodic sync executes in a long-running session
- **THEN** it MUST read the latest active skill state at execution time rather than a stale startup snapshot

### Requirement: Skill context sync SHALL support bounded change-triggered refresh
The system SHALL support debounced, bounded sync triggering on relevant skill-state changes to reduce stale context windows without excessive sync churn.

#### Scenario: Frequent active-skill toggles
- **WHEN** users perform rapid active-skill toggles
- **THEN** the system MUST coalesce sync requests within debounce bounds and produce one converged context state

#### Scenario: Manual sync after pending changes
- **WHEN** a user requests manual context sync while a debounced sync is pending
- **THEN** the system MUST run an immediate sync using current state and clear stale pending change flags

### Requirement: Agent-facing skill discovery references SHALL stay consistent with synced context
The system SHALL ensure skill references consumed by context-aware agent prompt assembly reflect successfully synced context artifacts.

#### Scenario: Context sync succeeds for updated active skills
- **WHEN** skill context sync completes successfully after active-skill changes
- **THEN** agent context prompt generation MUST include references for the updated active skill set

#### Scenario: Context sync fails for a subset of skills
- **WHEN** context sync fails for one or more active skills
- **THEN** the system MUST expose actionable sync error state and continue serving valid references for successfully synced skills
