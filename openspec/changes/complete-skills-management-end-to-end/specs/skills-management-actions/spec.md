## ADDED Requirements

### Requirement: Skill lifecycle actions SHALL use authoritative routing by source and environment
The system SHALL route skill lifecycle actions through a single orchestration policy that determines whether frontend state, native SSOT, or both are authoritative based on skill source and runtime environment.

#### Scenario: Desktop action on native-managed skill
- **WHEN** a user triggers enable, disable, update metadata, or uninstall for a native-managed skill in desktop mode
- **THEN** the system MUST execute native operation(s), reconcile frontend canonical linkage, and report a single action outcome

#### Scenario: Web action on frontend-managed skill
- **WHEN** a user triggers create, edit, enable, disable, or delete for a frontend-managed skill in web mode
- **THEN** the system MUST complete the action in frontend storage without native invocation errors

### Requirement: Lifecycle actions SHALL converge visible state across management surfaces
The system SHALL ensure that successful lifecycle actions produce consistent state in skills management, discovery, and other skill list surfaces without requiring manual page refresh.

#### Scenario: Toggle enabled state from any management surface
- **WHEN** a user enables or disables a skill from a management UI surface
- **THEN** all skill list surfaces MUST render the updated enabled state after action completion

#### Scenario: Delete or uninstall action removes visible stale entries
- **WHEN** a user deletes a frontend-managed skill or uninstalls a native-managed skill
- **THEN** the corresponding entry MUST be removed from managed lists and MUST NOT remain as an active stale record

### Requirement: Desktop marketplace and generated installs SHALL support native promotion
In desktop mode, the system SHALL support promotion of installable marketplace or generated skills into native-managed records with canonical linkage.

#### Scenario: Marketplace install in desktop mode
- **WHEN** a user installs a marketplace skill in desktop mode
- **THEN** the system MUST persist skill content/resources to native SSOT, register the native record, and link frontend identity to native canonical metadata

#### Scenario: Native promotion partially fails
- **WHEN** content import succeeds but native registration fails
- **THEN** the system MUST preserve recoverable frontend state, mark action result as partial failure, and expose retry information
