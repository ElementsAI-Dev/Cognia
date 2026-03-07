## 1. Unify BackgroundAgent lifecycle entry

- [x] 1.1 Refactor `hooks/agent/use-agent.ts` `runInBackground` to create agents through `BackgroundAgentManager` instead of store-only `createAgent`.
- [x] 1.2 Ensure `runInBackground` schedules execution through manager queue/start APIs with deterministic default behavior.
- [x] 1.3 Update `hooks/agent/use-background-agent.ts` synchronization logic to preserve manager as source of truth for lifecycle snapshots.

## 2. Enforce session-scoped visibility

- [x] 2.1 Guarantee concrete `sessionId` assignment for new background agents created from chat/agent flows.
- [x] 2.2 Ensure bridge-created background agents inherit source session context consistently.
- [x] 2.3 Add guard/fallback handling for legacy empty-session snapshots during hydration without breaking current session filtering.

## 3. Close delegation terminal-state handling

- [x] 3.1 Update `lib/ai/agent/agent-bridge.ts` `delegateToBackground` to resolve on `agent:cancelled` and `agent:timeout` in addition to existing terminal events.
- [x] 3.2 Define explicit delegation status/error mapping for timeout and cancellation outcomes.
- [x] 3.3 Ensure terminal listener cleanup is always executed after delegation resolution.

## 4. Wire persistence and recovery lifecycle

- [x] 4.1 Add one-time initialization path that calls `BackgroundAgentManager.restoreState()` when background-agent subsystem becomes active.
- [x] 4.2 Add best-effort unload/visibility lifecycle hooks to persist/shutdown background-agent state safely.
- [x] 4.3 Keep lifecycle wiring idempotent across repeated mounts/unmounts of hook consumers.

## 5. Expose team-to-background delegation flow

- [x] 5.1 Add a team workflow action path that invokes `delegateTaskToBackground` from existing panel/sheet controls.
- [x] 5.2 Surface delegation progress/result feedback in team UI state so users can see task handoff outcome.
- [x] 5.3 Ensure delegated task metadata is updated consistently for completed/failed/cancelled outcomes.

## 6. Tests and verification

- [x] 6.1 Extend `hooks/agent/use-agent.test.ts` to verify managed background creation and session assignment behavior.
- [x] 6.2 Extend `lib/ai/agent/agent-bridge.test.ts` to cover completion/failure/cancelled/timeout delegation resolution and listener cleanup.
- [x] 6.3 Extend `hooks/agent/use-background-agent.test.ts` for restore initialization and queue/state synchronization invariants.
- [x] 6.4 Extend `lib/ai/agent/background-agent-manager.test.ts` for persistence/recovery lifecycle integration expectations.
- [x] 6.5 Extend `hooks/agent/use-agent-team.test.tsx` (and related UI tests as needed) for team-to-background delegation invocation paths.

## 7. Documentation alignment

- [x] 7.1 Update `docs/features/agent-guide.md` to match implemented persistence and checkpoint semantics.
- [x] 7.2 Document delegation terminal behavior so cancellation and timeout outcomes are explicit to users and contributors.
