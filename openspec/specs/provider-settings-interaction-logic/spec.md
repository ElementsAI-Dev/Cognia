## ADDED Requirements

### Requirement: Provider action eligibility SHALL enforce valid transitions
The system SHALL enforce action eligibility rules so provider state cannot transition into invalid or ambiguous states.

#### Scenario: Enabling remote provider without credentials
- **WHEN** a user attempts to enable a non-local provider that has no usable API credential
- **THEN** the system MUST block the state transition and present guidance for adding credentials first

#### Scenario: Testing custom provider with invalid base URL
- **WHEN** a user initiates custom provider connection testing with a syntactically invalid base URL
- **THEN** the system MUST reject the test before network execution and show a validation error

### Requirement: Batch operations SHALL apply only to the intended provider set
The system SHALL execute batch operations against the explicitly selected and currently visible provider set, with deterministic progress and result reporting.

#### Scenario: Select all with active filters
- **WHEN** a user uses select-all while filters are active
- **THEN** the selection MUST include only providers currently visible under those filters

#### Scenario: Filter change invalidates previous selection
- **WHEN** filters change and previously selected providers are no longer visible
- **THEN** the system MUST remove those hidden providers from active selection before batch actions run

#### Scenario: Batch test execution summary
- **WHEN** a batch test operation completes or is canceled
- **THEN** the system MUST present per-provider outcomes and an aggregate success/failure summary

### Requirement: Cross-view provider state SHALL remain synchronized
The system SHALL keep provider configuration and status synchronized between card and table workflows so users never see contradictory states.

#### Scenario: State changed in card workflow
- **WHEN** a provider is configured, enabled, or assigned a default model in card workflow
- **THEN** the table workflow MUST reflect the updated status without requiring a manual refresh

#### Scenario: State changed in table workflow
- **WHEN** a provider action is executed in table workflow
- **THEN** the corresponding card workflow MUST reflect the same configuration and status immediately

