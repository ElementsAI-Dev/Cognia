## ADDED Requirements

### Requirement: Skill reconciliation SHALL use canonical cross-source identity
The system SHALL reconcile frontend and native skill records using canonical identity metadata (including native identifiers when present) and SHALL use name-only matching only as a legacy fallback.

#### Scenario: Native-linked skill exists in frontend store
- **WHEN** a frontend skill record includes canonical metadata linking it to a native installed skill
- **THEN** reconciliation MUST match by canonical link and MUST NOT create a second frontend record for the same native skill

#### Scenario: Legacy record lacks canonical metadata
- **WHEN** a persisted frontend skill record does not include canonical native linkage metadata
- **THEN** the system MUST attempt one-time fallback matching and store canonical metadata for subsequent reconciliations

### Requirement: Reconciliation policies SHALL be source-aware
The system SHALL apply deterministic reconciliation behavior based on skill source ownership (built-in, custom/imported, native-installed) to avoid unintended overwrites.

#### Scenario: Native installed skill changes enabled state
- **WHEN** a native-installed skill is enabled or disabled in native storage
- **THEN** the frontend representation MUST mirror that enabled state after reconciliation

#### Scenario: Custom web-only skill has no native counterpart
- **WHEN** a custom or imported skill exists in a non-native environment
- **THEN** the system MUST keep that skill managed in frontend storage without emitting native-sync failures

#### Scenario: Built-in skill conflicts with non-built-in record by name
- **WHEN** a built-in identity collides with a non-built-in record name
- **THEN** the system MUST resolve identity without destructive overwrite and MUST emit a conflict signal for diagnostics

### Requirement: Sync actions SHALL provide explicit outcomes and recovery signals
The system SHALL expose explicit sync outcomes (success, partial, failure) with actionable error details for management workflows.

#### Scenario: Partial sync failure during write operations
- **WHEN** at least one skill operation fails but others succeed in the same sync run
- **THEN** the system MUST report partial completion, preserve successful updates, and expose recoverable error details for failed items

#### Scenario: User retries sync after failure
- **WHEN** a user triggers a retry after a failed or partial sync
- **THEN** the system MUST rerun reconciliation from current source state and clear stale error status on successful completion

### Requirement: Skill management views SHALL reflect reconciliation state consistently
The system SHALL provide consistent status indicators and error visibility across skill settings and discovery surfaces.

#### Scenario: Reconciliation updates installed skill list
- **WHEN** reconciliation adds, removes, or updates skills linked to native installation state
- **THEN** skill management and discovery views MUST reflect the same updated state without requiring manual page refresh

#### Scenario: Sync error is represented in UI
- **WHEN** reconciliation or sync produces a user-actionable error
- **THEN** the UI MUST display a localized error message and a retry path tied to current sync actions
