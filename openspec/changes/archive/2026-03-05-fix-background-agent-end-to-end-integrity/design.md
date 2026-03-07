## Context

BackgroundAgent behavior is currently split across manager-driven execution and store-only creation paths. This creates lifecycle divergence: some agents are visible but never execute, some delegated background tasks do not resolve, and persistence/recovery semantics exist in manager code but are not consistently invoked by app lifecycle hooks.

The change spans multiple modules (`use-agent`, `use-background-agent`, manager, bridge, team UI/hooks), so we need explicit architecture-level decisions before implementation.

## Goals / Non-Goals

**Goals:**
- Ensure all background execution paths use a manager-controlled lifecycle.
- Ensure delegation to BackgroundAgent resolves for all terminal states.
- Ensure restore/persist lifecycle is explicitly wired and observable.
- Ensure pause/resume checkpoint behavior is deterministic and documented.
- Ensure team-to-background delegation can be invoked from product-facing flows.

**Non-Goals:**
- No cross-process or server-side long-running background execution.
- No redesign of AgentOrchestrator planning logic.
- No new background-agent storage backend beyond current local persistence model.
- No change to existing capability semantics outside BackgroundAgent and delegation integrity scope.

## Decisions

### 1. Standardize lifecycle entry through `BackgroundAgentManager`
- Decision: `useAgent.runInBackground` will stop creating store-only snapshots and instead create managed agents via `BackgroundAgentManager`, then enqueue/start through manager APIs.
- Rationale: A single state machine avoids divergence between UI snapshots and runtime state.
- Alternative considered: keep store-first creation and rely on later `hydrateAgent` reconciliation. Rejected because it preserves race conditions and hidden non-executing agents.

### 2. Enforce session binding for background agents
- Decision: all newly created background agents must receive a concrete `sessionId` (active session or explicit caller input), and session filters in `useBackgroundAgent` remain authoritative.
- Rationale: prevents "created but invisible" agents in session-scoped views.
- Alternative considered: show global background agents in all sessions. Rejected because it weakens session isolation and complicates UX semantics.

### 3. Close delegation terminal-state handling in `AgentBridge`
- Decision: `delegateToBackground` will resolve not only on `agent:completed` and `agent:failed`, but also on `agent:cancelled` and `agent:timeout`, with explicit delegation status mapping.
- Rationale: delegation promises must be total over the source lifecycle to avoid pending operations.
- Alternative considered: synthesize timeout/cancelled as manager-side `agent:failed` only. Rejected because it hides terminal distinctions needed by upstream callers.

### 4. Wire manager persistence/recovery to app lifecycle
- Decision: call `restoreState()` once when background-agent subsystem initializes, and trigger persistence/shutdown hooks during app unload/visibility transitions as best effort.
- Rationale: persistence APIs must be actively invoked to match documented behavior.
- Alternative considered: rely only on per-agent `persistState` in execution finally blocks. Rejected because it misses startup restoration and abrupt app exit paths.

### 5. Define checkpoint semantics as execution continuity, not full replay
- Decision: resume semantics will be explicitly documented and tested as queue resume with checkpoint metadata, not guaranteed full in-memory orchestration replay.
- Rationale: current checkpoints do not capture full executor context; pretending full replay creates false guarantees.
- Alternative considered: implement full replay now. Rejected for scope/complexity; can be future enhancement.

### 6. Expose team-to-background delegation in UI action flow
- Decision: integrate existing `delegateTaskToBackground` hook capability into team-facing control flow so background delegation is actually reachable from UI behavior.
- Rationale: capability exists in manager/hook layer but is currently not wired in practical workflows.
- Alternative considered: keep API-only access. Rejected because it does not satisfy end-to-end integrity for product flows.

## Risks / Trade-offs

- [Risk] Lifecycle hook wiring (`restoreState`/shutdown) can introduce duplicate initialization in multiple mounts. -> Mitigation: add idempotent one-time guard and tests for repeated hook mounts.
- [Risk] Expanding bridge terminal handling may alter caller expectations for cancellation semantics. -> Mitigation: define explicit status mapping and cover with contract tests.
- [Risk] Session binding strictness may hide legacy agents with empty session IDs. -> Mitigation: migrate existing empty-session snapshots to active session during hydration where safe, and log fallback cases.
- [Risk] Team panel integration can increase UI complexity. -> Mitigation: introduce a focused action path and keep default behavior unchanged for non-delegated tasks.

## Migration Plan

1. Implement lifecycle-entry unification and session binding in hooks.
2. Implement bridge terminal-state completion mapping.
3. Add manager lifecycle wiring for restore/shutdown with idempotent initialization.
4. Wire team-to-background delegation into panel flows.
5. Update/extend unit tests for manager, bridge, and hooks.
6. Update user-facing docs to match implemented persistence/checkpoint semantics.
7. Rollback strategy: feature-level revert is safe because changes are additive to runtime flow; persisted snapshots remain JSON-compatible.

## Open Questions

- Should `runInBackground` default to `queueAgent` or immediate `startAgent` for new agents? (Current proposal prefers queue for consistency with concurrency limits.)
- For `timeout` in delegation, should upstream status be `failed` or a dedicated terminal status? (Current proposal maps to failed with timeout reason attached.)
