## Why

The current LSP implementation is functionally rich but not fully complete in product behavior: some configured settings are not enforced at runtime, and several implemented LSP lifecycle APIs are not exposed through usable product flows. We should close these gaps now to make LSP behavior predictable and fully operable for desktop Monaco users.

## What Changes

- Make editor LSP runtime behavior consistent with settings by applying configured request timeout values to LSP requests instead of hardcoded timeouts.
- Make provider preference order effective by implementing sequential fallback across configured providers during server readiness and auto-install flows.
- Expose implemented LSP server lifecycle capabilities (recommend/search, install, uninstall, list, resolve launch) in a user-facing management flow rather than leaving them as internal-only APIs.
- Promote workspace symbol search to editor workbench command surfaces so it is consistently discoverable where LSP supports it.
- Add coverage and verification for the above behaviors (frontend and command-level integration paths).

## Capabilities

### New Capabilities
- `designer-lsp-completeness`: Ensures desktop Monaco LSP behavior, command availability, and feature discoverability are complete and consistent with user settings.
- `lsp-server-lifecycle-management`: Provides a complete user-facing flow for LSP server recommendation, installation, listing, launch resolution, and removal.

### Modified Capabilities
- None.

## Impact

- Affected frontend: Monaco LSP adapter, designer editor integration, editor workbench command surfaces, and settings-driven behavior.
- Affected backend: Tauri LSP installer/resolver fallback logic for provider ordering and server readiness behavior.
- Affected API usage: Existing `lsp_*` Tauri commands for registry/install/list/uninstall/resolve will be actively integrated into product flows.
- Affected tests/docs: LSP integration tests and related behavior documentation will need updates.
