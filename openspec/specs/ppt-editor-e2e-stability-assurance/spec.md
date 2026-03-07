## ADDED Requirements

### Requirement: Seeded PPT editor entry SHALL be stable
The system SHALL allow users to open persisted PPT presentations without triggering recursive render/update failures that block editor interaction.

#### Scenario: Seeded presentation opens without runtime recursion failure
- **WHEN** a persisted presentation is loaded into the PPT editor route
- **THEN** the editor MUST render successfully without "Maximum update depth exceeded" or equivalent recursive update runtime errors

#### Scenario: Editor controls remain available after seeded load
- **WHEN** a seeded presentation is loaded and editor initialization completes
- **THEN** presentation, slideshow, and export entry controls MUST remain interactive and visible

### Requirement: PPT automation contracts SHALL be explicit for critical controls
The system SHALL expose stable automation selectors for critical PPT interaction controls used by regression tests.

#### Scenario: Presentation mode trigger is contractually addressable
- **WHEN** automation targets the start-presentation control in editor mode
- **THEN** the UI MUST provide a stable selector contract that resolves to the control across supported localizations

#### Scenario: Export menu options are contractually addressable
- **WHEN** automation opens the PPT export menu
- **THEN** each supported export option in scope MUST be reachable through stable selector contracts

### Requirement: Seeded PPT end-to-end regression flow SHALL be verifiable
The system SHALL maintain automated end-to-end coverage for the seeded existing-deck flow from editor entry to slideshow and export availability checks.

#### Scenario: Seeded deck present-and-export flow passes
- **WHEN** CI executes the seeded PPT completeness scenario
- **THEN** the test MUST complete editor entry, slideshow launch/exit, and export menu assertion steps without runtime abort

### Requirement: PPT stability scenarios SHALL be traceable to tests
The system SHALL maintain scenario-to-test traceability artifacts for seeded editor stability and end-to-end validation paths.

#### Scenario: Traceability document reflects stability capability
- **WHEN** this capability is introduced or modified
- **THEN** traceability documentation MUST map each requirement scenario to at least one automated test path
