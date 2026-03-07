## Context

Current skill loading/management is distributed across:
- `SkillProvider` for built-in imports.
- `SkillSyncInitializer` for startup sync (`syncFromNative` then `syncToNative`).
- Persisted Zustand state in `skill-store`.
- Native installed-skill records from Tauri commands.

This creates overlap and weak identity matching (mostly by name/directory), which can lead to duplicate skills, stale enabled/disabled state, and non-deterministic startup behavior. The design needs to preserve web-only mode while making desktop/native behavior predictable and debuggable.

## Goals / Non-Goals

**Goals:**
- Define one deterministic startup loading lifecycle for skills.
- Define stable skill identity and reconciliation rules between frontend and native records.
- Prevent duplicate imports and stale state drift for built-in and native-managed skills.
- Make sync state visible and actionable for management UI and logs.
- Keep behavior compatible in both web (no native) and Tauri environments.

**Non-Goals:**
- Redesigning the entire Skills UI information architecture.
- Changing skill authoring format (`SKILL.md`) or marketplace protocol.
- Replacing native skill service APIs in this change.
- Implementing new recommendation/ranking algorithms for skill matching.

## Decisions

### 1. Introduce a canonical Skill identity envelope

Decision:
- Extend frontend skill records with sync metadata (for example `nativeSkillId`, `nativeDirectory`, `origin`, `lastSyncedAt`, `syncFingerprint`).
- Use this metadata as primary identity when reconciling with native records.
- Keep name-based matching only as fallback for legacy data migration.

Why:
- Name-only matching is ambiguous and fails across rename/version drift.
- Native IDs and directories are already available and stable enough for reconciliation.

Alternatives considered:
- Keep current name/directory heuristics only: rejected due collision and drift risk.
- Use content hash as only key: rejected because content can legitimately change while identity should remain stable.

### 2. Replace multi-entry startup with a single bootstrap pipeline

Decision:
- Introduce a single startup bootstrap path for skills:
  1. Wait for skill store hydration.
  2. Reconcile built-ins using manifest version/fingerprint policy.
  3. If native available, fetch installed records and reconcile frontend state.
  4. Publish final readiness state (`idle`/`syncing`/`error` + timestamps).
- `SkillProvider` and `SkillSyncInitializer` become orchestration-safe wrappers around this unified flow.

Why:
- The current split can execute overlapping writes at startup.
- A phased pipeline gives deterministic ordering and easier debugging/testing.

Alternatives considered:
- Keep two independent initializers and add guards: rejected because ordering and state visibility remain implicit.

### 3. Apply source-aware reconciliation policies

Decision:
- Reconciliation rules depend on source:
  - `builtin`: managed by built-in manifest policy (import missing; update compatible fields when built-in version changes).
  - `custom/imported` in web mode: frontend store remains authoritative.
  - native-installed (desktop): native record is authoritative for install/enabled state; frontend mirrors metadata/content snapshots.
- Startup sync avoids unconditional `syncToNative`; writes to native become explicit actions or bounded by clear rules.

Why:
- Blind two-way startup sync can overwrite user intent and create churn.
- Source-aware behavior matches real ownership boundaries.

Alternatives considered:
- Native as global SSOT for all skills always: rejected for web mode and for built-in content that should ship with app.
- Frontend as global SSOT always: rejected because desktop native service manages installation lifecycle.

### 4. Add explicit management and observability surfaces

Decision:
- Track sync lifecycle and last result in store (`lastSyncAt`, `lastSyncDirection`, `lastSyncError`, `syncState`).
- Standardize user-facing sync errors (i18n keys) and log events for reconcile actions (added/updated/skipped/conflicted).
- Surface reconciliation status in skill management/discovery views.

Why:
- Current failures are hard to trace and user feedback is inconsistent.
- Clear status reduces support/debug time.

Alternatives considered:
- Keep logs only: rejected because users still cannot understand or recover from sync issues.

## Risks / Trade-offs

- [Persisted data migration mismatch] → Add backward-compatible migration with fallback name matching and telemetry for unresolved mappings.
- [Built-in update policy may overwrite user-edited fields] → Limit built-in auto-updates to safe fields; never overwrite user custom content without explicit action.
- [More startup steps can increase initial latency] → Run non-blocking phases where possible and expose partial-ready state to UI.
- [Different behavior between web and desktop may confuse users] → Make mode-specific behavior explicit in UI copy and sync status.

## Migration Plan

1. Extend skill type/store schema with sync metadata and status fields.
2. Add persist migration for old records (derive initial metadata via fallback matching).
3. Implement unified bootstrap/reconcile service and wire provider initializers to it.
4. Update sync hook and management UI to consume new sync state and actions.
5. Add/adjust tests for startup order, reconciliation policies, and migration edge cases.
6. Rollback strategy: keep legacy fallback path guarded by feature flag until reconciliation tests are stable.

## Open Questions

- Should built-in content updates be opt-in per skill when local edits are detected?
- Do we need a dedicated “Resolve conflict” UI, or is logging + safe skip sufficient for this phase?
- Should startup perform lightweight native read-only sync first and defer writeback to user-triggered actions only?
