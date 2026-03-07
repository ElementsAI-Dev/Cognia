## Why

BackgroundAgent currently has lifecycle gaps across entry points, manager events, and UI/store synchronization, which can leave agents non-executing, non-visible, or stuck in pending delegation states. This is causing real behavior drift from expected "end-to-end background execution" and should be fixed now before more agent features build on top of this path.

## What Changes

- Standardize BackgroundAgent creation/execution so background runs always enter manager-controlled lifecycle (creation, queue/start, progress, terminal state) instead of store-only snapshots.
- Ensure session-scoped visibility is consistent for newly created background agents and delegated background tasks.
- Close bridge delegation lifecycle for BackgroundAgent terminal states, including `completed`, `failed`, `cancelled`, and `timeout`, so delegations always resolve.
- Define and enforce persistence/recovery behavior at app lifecycle boundaries (startup/restore and shutdown/persist), including explicit non-goals for cross-process execution.
- Clarify checkpoint semantics so pause/resume behavior is deterministic and does not imply unsupported state restoration.
- Add targeted tests for lifecycle transitions, delegation resolution, restore/shutdown flows, and UI integration paths.

## Capabilities

### New Capabilities
- `background-agent-lifecycle-integrity`: Guarantees consistent BackgroundAgent lifecycle behavior from creation through terminal states, including visibility, queue state sync, and persistence/recovery boundaries.
- `background-agent-delegation-reliability`: Guarantees cross-system delegation to BackgroundAgent resolves for all terminal outcomes and propagates completion/failure/cancellation semantics back to source systems.

### Modified Capabilities
- (none)

## Impact

- Affected code:
  - `hooks/agent/use-agent.ts`
  - `hooks/agent/use-background-agent.ts`
  - `lib/ai/agent/background-agent-manager.ts`
  - `lib/ai/agent/agent-bridge.ts`
  - `hooks/agent/use-agent-team.ts`
  - `components/agent/agent-team-panel-sheet.tsx`
  - `components/agent/agent-team-panel.tsx`
- Affected tests:
  - `lib/ai/agent/background-agent-manager.test.ts`
  - `lib/ai/agent/agent-bridge.test.ts`
  - `hooks/agent/use-background-agent.test.ts`
  - `hooks/agent/use-agent.test.ts`
  - `hooks/agent/use-agent-team.test.tsx`
- Documentation and behavior alignment:
  - `docs/features/agent-guide.md`
