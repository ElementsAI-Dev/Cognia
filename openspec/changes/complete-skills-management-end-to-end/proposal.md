## Why

Skills management currently works as a set of partially connected flows across frontend store, native SSOT, marketplace install, discovery install, and agent/context consumption. We need a deterministic end-to-end workflow so user actions always converge to one consistent state across UI, native storage, and runtime tool/prompt usage.

## What Changes

- Enforce end-to-end consistency for skill lifecycle actions (create, edit, enable/disable, install/uninstall, delete) across frontend and native environments.
- Close reconciliation gaps by handling native-side removals and stale records, not only add/update paths.
- Make startup/bootstrap and post-startup refresh paths converge to the same canonical skill set without requiring manual page reloads.
- Define desktop-mode integration rules for marketplace and generated-skill installs so they can be promoted to native-managed records when applicable.
- Ensure context sync and agent-facing skill discovery stay current with active skill state changes during runtime.
- Strengthen validation and integration coverage so full-chain behavior is testable beyond mocked in-page simulations.

## Capabilities

### New Capabilities
- `skills-management-actions`: Defines authoritative action routing and state convergence rules for skill CRUD/install/uninstall/toggle operations across frontend and native SSOT.
- `skills-context-discovery-sync`: Defines guarantees for keeping active skill context files and agent-facing skill references fresh after skill state changes.

### Modified Capabilities
- `skills-loading-lifecycle`: Extend requirements to cover post-bootstrap native data arrival and deterministic readiness behavior under async native initialization.
- `skills-management-reconciliation`: Extend requirements to include native deletion reconciliation, explicit refresh semantics, and UI parity guarantees across management surfaces.

## Impact

- Frontend: `hooks/skills/use-skill-sync.ts`, `hooks/skills/use-skill-bootstrap.ts`, `hooks/skills/use-native-skills.ts`, `stores/skills/skill-store.ts`, `components/skills/*`, `components/settings/tools/skill-settings.tsx`.
- Native bridge and backend: `lib/native/skill.ts`, `src-tauri/src/commands/extensions/skill.rs`, `src-tauri/src/skill/service.rs`.
- Agent/context path: `hooks/context/use-auto-sync.ts`, `components/providers/initializers/context-sync-initializer.tsx`, `lib/context/skills-sync.ts`, `lib/ai/agent/context-aware-executor.ts`.
- Quality gates: unit/integration/e2e specs under `hooks/skills/*.test.ts`, `stores/skills/*.test.ts`, `components/skills/*.test.tsx`, `e2e/features/skill*.spec.ts`.
