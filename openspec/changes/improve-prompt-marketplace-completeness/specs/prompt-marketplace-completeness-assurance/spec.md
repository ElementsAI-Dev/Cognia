## ADDED Requirements

### Requirement: Prompt marketplace data source SHALL support remote-first execution with explicit fallback
The system SHALL resolve marketplace data through a unified repository layer that prefers remote data and falls back to local sample data only when remote access is unavailable, and it MUST expose which source is currently active.

#### Scenario: Remote source is available
- **WHEN** marketplace browse/detail/search requests succeed through the remote provider
- **THEN** the system MUST render remote data and mark source state as `remote`

#### Scenario: Remote source is unavailable
- **WHEN** remote provider fails due to network, auth, or upstream errors
- **THEN** the system MUST switch to fallback mode, return usable marketplace data, and surface source state as `fallback` with a recoverable warning

### Requirement: Browse module SHALL provide complete discovery behavior
The browse experience MUST support full query filtering, category filtering, quality-tier filtering, rating filtering, sorting, and incremental pagination without silently dropping any active filter.

#### Scenario: User applies combined filters
- **WHEN** the user sets query, category, quality tiers, and minimum rating together
- **THEN** the result set MUST satisfy all active filters and reflect the active filter count consistently in desktop and mobile views

#### Scenario: User resets discovery filters
- **WHEN** the user chooses clear/reset filters
- **THEN** the system MUST restore default sort and unfiltered result state, including featured/trending sections

### Requirement: Installation lifecycle SHALL be complete and recoverable
The system SHALL provide full install lifecycle semantics for each marketplace prompt, including install, update-check, update-apply, uninstall, and per-item operation status/error handling.

#### Scenario: Prompt install succeeds
- **WHEN** a user installs a marketplace prompt
- **THEN** the system MUST create a local template, track installation metadata, and update installed counts/state in all relevant tabs

#### Scenario: Prompt update is available and applied
- **WHEN** check-for-updates detects a newer marketplace version for an installed prompt
- **THEN** the UI MUST mark that prompt as updatable, and update action MUST synchronize local template content/version while clearing update flags

#### Scenario: Prompt uninstall fails
- **WHEN** uninstall operation cannot remove local template or marketplace linkage
- **THEN** the system MUST preserve previous install state and show a user-visible recoverable error

### Requirement: User activity modules SHALL maintain consistent cross-tab state
Favorites, recently viewed, collection follow, and author profile entry behavior SHALL be persisted and synchronized so that any action in one module is reflected everywhere else without refresh.

#### Scenario: User toggles favorite from card or detail
- **WHEN** a user favorites or unfavorites a prompt from any entry point
- **THEN** favorites state MUST update immediately on browse cards, detail view, and favorites tab count

#### Scenario: User opens prompt details
- **WHEN** a prompt detail is opened from browse/favorites/installed/recent tabs
- **THEN** the prompt MUST be recorded in recently viewed history with recency ordering and deduplication

### Requirement: Detail, preview, and review interactions SHALL be fully executable
The detail module MUST support full prompt inspection, content copy/share, preview variable filling, test-run feedback, review submission, and helpful voting with explicit success/error feedback.

#### Scenario: User submits a review
- **WHEN** a user provides rating and review content and submits
- **THEN** the system MUST persist the review, update rating aggregates, and prevent duplicate self-review where policy disallows it

#### Scenario: User executes preview test
- **WHEN** required variables are filled and user triggers test run
- **THEN** the system MUST execute preview generation and return either result text or a structured error message without leaving stale loading state

### Requirement: Publishing workflow SHALL enforce completeness and validation
Publishing from local templates MUST require mandatory metadata validation and produce a marketplace prompt entity with consistent category/tags/version/author fields.

#### Scenario: Publish form contains invalid required fields
- **WHEN** required fields such as name, description, or category are missing or invalid
- **THEN** publish action MUST be blocked with field-level validation feedback

#### Scenario: Publish succeeds
- **WHEN** a valid local template is published
- **THEN** a new marketplace prompt MUST be created, added to marketplace listing, and tracked under user published activity

### Requirement: Import and export SHALL provide schema-safe portability
Prompt import/export MUST use a versioned schema and report per-item outcomes (imported/skipped/failed), with conflict strategy support and detailed error reporting.

#### Scenario: Export installed prompts
- **WHEN** user exports installed prompts
- **THEN** the system MUST generate a versioned JSON payload containing all required prompt fields for re-import

#### Scenario: Import contains duplicates and malformed items
- **WHEN** user imports a payload with duplicate IDs and invalid records
- **THEN** the system MUST apply configured conflict strategy, skip or reject invalid items safely, and present an import report with counts and errors

### Requirement: Completeness SHALL be protected by scenario-aligned automated tests
The repository MUST include automated tests that map to critical marketplace scenarios so no module can regress into partial or simplified behavior unnoticed.

#### Scenario: Store contract regression
- **WHEN** marketplace store behavior changes for search/install/update/publish/import flows
- **THEN** contract tests MUST fail if canonical state transitions or error handling guarantees are broken

#### Scenario: End-to-end marketplace flow regression
- **WHEN** a regression breaks browse-to-install-to-update or publish/import critical paths
- **THEN** E2E tests MUST fail before merge