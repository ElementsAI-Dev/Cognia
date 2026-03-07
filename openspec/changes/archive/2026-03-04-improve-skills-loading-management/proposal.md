## Why

The current Skills flow is split across multiple startup paths (`SkillProvider`, `SkillSyncInitializer`, persisted Zustand state, and native skill service) with heuristic matching by name/directory. This can produce duplicate entries, stale status, and non-deterministic startup behavior, making skill management harder to trust and maintain.

## What Changes

- Define a deterministic Skills loading lifecycle at app startup, including clear ordering for built-in import, persisted state hydration, and native synchronization.
- Introduce explicit reconciliation rules between frontend and native skill records (identity matching, create/update/disable/delete behavior, and conflict handling).
- Improve built-in skill management so built-ins can be upgraded safely without duplicate imports or silent drift.
- Improve management UX state for sync and reconciliation (status, last sync result, and actionable error states).
- Add tests for startup loading order, reconciliation behavior, and management actions under native and non-native environments.

## Capabilities

### New Capabilities
- `skills-loading-lifecycle`: Deterministic startup loading and initialization contract for all skill sources.
- `skills-management-reconciliation`: Consistent cross-source skill management and synchronization rules.

### Modified Capabilities
- None.

## Impact

- Affected areas: `components/providers/initializers/skill-provider.tsx`, `components/providers/initializers/skill-sync-initializer.tsx`, `hooks/skills/use-skill-sync.ts`, `hooks/skills/use-native-skills.ts`, `stores/skills/skill-store.ts`, and skills management UI components.
- Data/state impact: possible persisted-skill metadata adjustments to support stable identity and reconciliation.
- Quality impact: expanded unit tests for provider initialization, sync hooks, and store reconciliation cases.
