## ADDED Requirements

### Requirement: Provider readiness state SHALL be computed consistently
The system SHALL compute a deterministic readiness state for each provider (built-in, local, and custom) from configuration and latest connection verification result so users can understand what step is missing.

#### Scenario: Remote provider has no usable credential
- **WHEN** a non-local provider has neither a primary API key nor any valid key in the key list
- **THEN** the provider state MUST be shown as unconfigured and test actions MUST be unavailable

#### Scenario: Provider has configuration but no successful verification
- **WHEN** a provider has required credentials and base settings but no successful connection test in current settings context
- **THEN** the provider state MUST be shown as configured and a clear verify action MUST be available

#### Scenario: Provider passes connection verification
- **WHEN** a provider connection test returns success
- **THEN** the provider state MUST be shown as verified and available for normal use

### Requirement: Core setup actions SHALL be available in both card and table workflows
The system SHALL expose the same core setup actions for built-in providers across card and table workflows, including configure, enable/disable, test connection, and default model selection.

#### Scenario: User configures from table workflow
- **WHEN** the user triggers configure from a provider row in table workflow
- **THEN** the system MUST open the provider configuration workflow with that provider focused and ready for edits

#### Scenario: Provider action is unavailable due to prerequisites
- **WHEN** a user attempts an action that requires missing prerequisites
- **THEN** the action MUST remain disabled and the UI MUST provide a reason indicating what is missing

### Requirement: Setup guidance SHALL direct users to complete provider configuration
The system SHALL provide actionable guidance when users cannot proceed because of missing provider setup, including empty states, filtered-zero-result states, and missing-field prompts.

#### Scenario: No provider can be used
- **WHEN** there are no enabled and configured providers for the current settings context
- **THEN** the UI MUST show clear next actions for adding credentials, enabling a provider, or configuring a local/custom provider

#### Scenario: Filter returns no providers
- **WHEN** active search or capability filters produce zero matches
- **THEN** the UI MUST show a recoverable empty result state with actions to clear or adjust filters

