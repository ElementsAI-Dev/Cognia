## ADDED Requirements

### Requirement: LSP Server Lifecycle SHALL Be User-Operable
The system SHALL provide a user-facing flow to discover, install, list, uninstall, and inspect language-server runtime status using existing LSP lifecycle APIs.

#### Scenario: User opens LSP server management view
- **WHEN** the user navigates to LSP management in editor settings
- **THEN** the UI shows installed servers and current status for the active language

#### Scenario: User performs install or uninstall
- **WHEN** the user triggers install or uninstall for a server
- **THEN** the UI executes the corresponding lifecycle command and refreshes visible server state

### Requirement: Recommendation and Search SHALL Be Provider-Aware
The system SHALL expose both recommended servers and searchable registry entries with provider attribution so users can choose sources explicitly.

#### Scenario: Load recommended servers
- **WHEN** a language is selected in LSP management
- **THEN** the UI fetches and displays recommended servers for configured providers

#### Scenario: Search registry
- **WHEN** the user enters a search query
- **THEN** the UI returns matching server entries including provider identity and install metadata

### Requirement: Provider Order MUST Define Readiness Fallback Sequence
Backend server readiness logic MUST attempt providers in configured order and proceed to the next provider when earlier candidates fail.

#### Scenario: Primary provider fails and secondary succeeds
- **WHEN** readiness resolution cannot install/resolve through the first configured provider but succeeds through a later provider
- **THEN** readiness returns a usable launch configuration from the successful provider

#### Scenario: All configured providers fail
- **WHEN** readiness attempts fail for every configured provider
- **THEN** readiness returns failure with a reason that reflects aggregate fallback exhaustion

### Requirement: Launch Resolution SHALL Be Transparent to Users
The system SHALL expose the resolved launch command source (installed extension, local binary, or runtime fallback) in user-visible status detail for troubleshooting.

#### Scenario: Installed extension launch resolved
- **WHEN** launch resolution returns an installed extension runtime
- **THEN** the UI status detail indicates the resolved extension/provider source

#### Scenario: Legacy or runtime fallback launch resolved
- **WHEN** launch resolution falls back to local binary or runtime resolver path
- **THEN** the UI status detail indicates fallback source and any trust/approval constraints
