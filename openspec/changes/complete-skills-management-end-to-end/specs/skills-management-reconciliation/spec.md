## MODIFIED Requirements

### Requirement: Reconciliation policies SHALL be source-aware
The system SHALL apply deterministic reconciliation behavior based on skill source ownership (built-in, custom/imported, native-installed) to avoid unintended overwrites and stale native-linked records.

#### Scenario: Native installed skill changes enabled state
- **WHEN** a native-installed skill is enabled or disabled in native storage
- **THEN** the frontend representation MUST mirror that enabled state after reconciliation

#### Scenario: Custom web-only skill has no native counterpart
- **WHEN** a custom or imported skill exists in a non-native environment
- **THEN** the system MUST keep that skill managed in frontend storage without emitting native-sync failures

#### Scenario: Built-in skill conflicts with non-built-in record by name
- **WHEN** a built-in identity collides with a non-built-in record name
- **THEN** the system MUST resolve identity without destructive overwrite and MUST emit a conflict signal for diagnostics

#### Scenario: Native-linked frontend record is missing from native installed set
- **WHEN** reconciliation detects a frontend record linked to native identity that is absent from current native installed records
- **THEN** the system MUST remove or safely downgrade the stale linkage according to ownership policy and emit reconciliation diagnostics

### Requirement: Sync actions SHALL provide explicit outcomes and recovery signals
The system SHALL expose explicit sync outcomes (success, partial, failure) with actionable error details for management workflows and user-triggered refresh/retry operations.

#### Scenario: Partial sync failure during write operations
- **WHEN** at least one skill operation fails but others succeed in the same sync run
- **THEN** the system MUST report partial completion, preserve successful updates, and expose recoverable error details for failed items

#### Scenario: User retries sync after failure
- **WHEN** a user triggers a retry after a failed or partial sync
- **THEN** the system MUST rerun reconciliation from current source state and clear stale error status on successful completion

#### Scenario: User triggers manual refresh from discovery or management UI
- **WHEN** a user requests refresh from a skill discovery or management surface
- **THEN** the system MUST execute full reconciliation semantics (including remove/add/update handling) and return one explicit sync outcome state

### Requirement: Skill management views SHALL reflect reconciliation state consistently
The system SHALL provide consistent status indicators and error visibility across skill settings and discovery surfaces and SHALL reflect reconciliation output without manual page reload.

#### Scenario: Reconciliation updates installed skill list
- **WHEN** reconciliation adds, removes, or updates skills linked to native installation state
- **THEN** skill management and discovery views MUST reflect the same updated state without requiring manual page refresh

#### Scenario: Sync error is represented in UI
- **WHEN** reconciliation or sync produces a user-actionable error
- **THEN** the UI MUST display a localized error message and a retry path tied to current sync actions

#### Scenario: Recovery after successful retry
- **WHEN** a retry sync run succeeds after a previous failure
- **THEN** management and discovery surfaces MUST clear stale error indicators and display the latest converged state
