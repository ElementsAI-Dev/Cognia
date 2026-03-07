# designer-lsp-completeness Specification

## Purpose
TBD - created by archiving change improve-lsp-feature-completeness. Update Purpose after archive.
## Requirements
### Requirement: LSP Request Timeout MUST Follow Editor Settings
Designer Monaco LSP requests SHALL use the configured `editorSettings.lsp.timeoutMs` as the default timeout budget instead of hardcoded constants.

#### Scenario: Configured timeout is applied to feature requests
- **WHEN** the user sets a non-default LSP timeout in editor settings and triggers an LSP-backed action
- **THEN** the outgoing LSP request metadata uses the configured timeout value

#### Scenario: Workspace symbols keeps explicit override policy
- **WHEN** workspace symbol search is executed
- **THEN** the request timeout follows the defined workspace-symbol timeout policy derived from configured timeout behavior

### Requirement: Workspace Symbol Search SHALL Be Discoverable Through Workbench Commands
The editor workbench command model MUST expose a workspace symbol search command when `workspaceSymbols` capability is available for the active editor context.

#### Scenario: Capability available
- **WHEN** the active editor context reports `workspaceSymbols` capability as enabled
- **THEN** the command palette and context command routing include a workspace symbol search command for that editor

#### Scenario: Capability unavailable
- **WHEN** the active editor context reports `workspaceSymbols` capability as disabled
- **THEN** the workspace symbol command is not presented as executable in workbench command surfaces

### Requirement: LSP Status Messaging SHALL Reflect Lifecycle Events
Designer editor status indicators SHALL surface LSP lifecycle transitions consistently for starting, installing, connected, fallback, disabled, and error states.

#### Scenario: Server install progress event arrives
- **WHEN** install progress events are received for the active language
- **THEN** editor status updates to installing state with progress detail

#### Scenario: Server status changed event arrives
- **WHEN** server status changed events are received for the active language
- **THEN** editor status and status detail are updated to the corresponding lifecycle state

### Requirement: LSP Feature Registration SHALL Remain Fallback-Safe
The editor SHALL continue to register local Monaco providers for any capability not provided by active LSP session features.

#### Scenario: Partial server capabilities
- **WHEN** LSP session connects but does not advertise a specific feature (for example code actions or document symbols)
- **THEN** the editor registers the local fallback provider for that feature

#### Scenario: Session startup fallback
- **WHEN** LSP startup fails or runtime is unavailable
- **THEN** the editor runs in fallback mode with local providers and a fallback reason

