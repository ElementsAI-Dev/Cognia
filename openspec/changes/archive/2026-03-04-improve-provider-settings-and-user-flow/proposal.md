## Why

The current provider settings page already contains many advanced features, but the setup journey is fragmented and hard to complete correctly on the first try. We need a coherent flow that ensures users can fully use existing provider capabilities and finish configuration with fewer invalid or redundant actions.

## What Changes

- Introduce a complete provider setup workflow with explicit readiness states (unconfigured, configured, verified, ready to use).
- Ensure key provider capabilities are consistently available and discoverable in both card and table views:
  - connection testing
  - default model selection
  - API key list/rotation controls
  - OAuth actions (where supported)
  - custom/local provider configuration entry points
- Align batch actions (select, enable/disable, test selected) with clear eligibility rules and progress feedback.
- Optimize interaction logic to prevent invalid state transitions (for example enabling remote providers without usable credentials) and reduce duplicated user steps.
- Improve empty/filter/result guidance so users can recover quickly when no providers match or when required setup fields are missing.

## Capabilities

### New Capabilities
- `provider-settings-complete-workflow`: Defines the end-to-end setup and readiness workflow for built-in, local, and custom providers so core features are fully usable.
- `provider-settings-interaction-logic`: Defines deterministic user interaction and validation rules for provider actions, batch operations, and cross-view consistency.

### Modified Capabilities
- None.

## Impact

- Affected UI and interaction logic in provider settings components under `components/settings/provider/`.
- Potential updates to settings page integration (`app/(main)/settings/page.tsx`) and provider-related store behavior in `stores/settings/`.
- Additional unit tests for provider workflow states, action eligibility, and batch behaviors.
