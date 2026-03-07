## ADDED Requirements

### Requirement: One-step proposal accepts either a name or natural-language intent
The system SHALL accept either a kebab-case change name or a free-form description and resolve it to a valid change identifier before scaffolding.

#### Scenario: Explicit kebab-case name is provided
- **WHEN** the user provides a valid kebab-case name
- **THEN** the system MUST use that exact value as the change name

#### Scenario: Description is provided without explicit name
- **WHEN** the user provides a free-form description of what to build
- **THEN** the system MUST derive a deterministic kebab-case change name from that description

### Requirement: One-step proposal generates artifacts in dependency order
The system SHALL scaffold the change first and then generate artifacts only when their dependencies are satisfied according to OpenSpec status metadata.

#### Scenario: Artifact is ready
- **WHEN** an artifact is marked `ready` in change status
- **THEN** the system MUST fetch instructions for that artifact and generate the output file at the instructed path

#### Scenario: Artifact dependencies are incomplete
- **WHEN** an artifact is marked `blocked` with missing dependencies
- **THEN** the system MUST defer generation until dependencies are marked done

### Requirement: Artifact generation stops at apply-ready state
The system SHALL re-check change status after each artifact generation and complete the flow once all artifacts required by `applyRequires` are done.

#### Scenario: Apply-required artifacts complete
- **WHEN** every artifact listed in `applyRequires` has status `done`
- **THEN** the system MUST present final status and indicate readiness to run `/opsx:apply`

#### Scenario: Change not yet apply-ready
- **WHEN** any artifact in `applyRequires` is not `done`
- **THEN** the system MUST continue generating newly ready artifacts in dependency order

### Requirement: Generated artifacts follow OpenSpec instructions and templates
The system SHALL create artifact content using schema-provided templates and rules, and MUST use completed dependency artifacts as context.

#### Scenario: Artifact has dependency files
- **WHEN** instructions list completed dependency artifacts
- **THEN** the system MUST read those dependency files before writing the new artifact

#### Scenario: Instructions include non-output constraints
- **WHEN** instructions include context or rules metadata
- **THEN** the system MUST apply them as writing constraints and MUST NOT copy those metadata blocks verbatim into output artifacts
