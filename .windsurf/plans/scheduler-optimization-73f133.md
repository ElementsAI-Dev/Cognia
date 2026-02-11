# Scheduler Module Optimization Plan

> **Module**: `components/scheduler`, `hooks/scheduler`, `lib/scheduler`, `stores/scheduler`, `types/scheduler`
> **Generated**: 2025-07-16
> **Status**: Plan Review

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State Assessment](#2-current-state-assessment)
3. [Problem Identification](#3-problem-identification)
4. [Optimization Items](#4-optimization-items)
5. [Implementation Phases](#5-implementation-phases)
6. [Workload Estimation](#6-workload-estimation)

---

## 1. Executive Summary

The scheduler module is a feature-rich task automation system supporting cron scheduling, interval/one-time/event triggers, notifications, script execution, plugin integration, and system-level OS scheduling (Windows/macOS/Linux). The codebase is well-structured with clear separation of concerns but has **26 identified issues** across architecture, performance, code quality, error handling, and type safety.

**Key risks**: dual initialization race condition, unreliable setTimeout-based scheduling in background tabs, no multi-tab locking, and a monolithic 994-line page component.

**Estimated total effort**: ~8-12 days

---

## 2. Current State Assessment

### 2.1 Module Structure (21 files)

| Layer | Files | Lines | Status |
|-------|-------|-------|--------|
| `lib/scheduler/` | 8 files | ~2,500 | Core engine, good separation |
| `types/scheduler/` | 2 files | ~740 | Complete type definitions |
| `stores/scheduler/` | 2 files | ~540 | Zustand store with selectors |
| `hooks/scheduler/` | 3 files | ~590 | React integration hooks |
| `components/scheduler/` | 10 files | ~2,900 | UI components |
| `app/(main)/scheduler/` | 3 files | ~1,900 | Page + layout + tests |
| `src-tauri/src/scheduler/` | 6 files | ~1,200 | Rust system scheduler |
| **Total** | **34 files** | **~10,370** | |

### 2.2 Feature Coverage

- ✅ Cron, interval, one-time, event-triggered scheduling
- ✅ Task CRUD with IndexedDB persistence (Dexie)
- ✅ Retry logic with configurable attempts and delay
- ✅ Desktop, toast, and webhook notifications
- ✅ Script execution in sandbox with validation
- ✅ Plugin task handler registry
- ✅ Event-driven task chaining
- ✅ System-level scheduling (Windows/macOS/Linux)
- ✅ Risk assessment and admin elevation for system tasks
- ✅ Responsive mobile/desktop layout with master-detail
- ✅ Search, filter, statistics dashboard
- ✅ i18n support (English + Chinese)

### 2.3 Code Quality Scan Results

| Check | Result |
|-------|--------|
| `TODO`/`FIXME` markers | ✅ None found |
| `as any` usage | ✅ None found |
| `console.log` (outside logger) | ⚠️ 5 instances in `scheduler-initializer.tsx` |
| `as unknown as` casts | ⚠️ 4 instances in `types/scheduler/index.ts` |
| Test coverage | ⚠️ Only 2 test files (`page.test.tsx`, `use-scheduler.test.ts`) |

---

## 3. Problem Identification

### 3.1 Architecture & Design (P0 - Critical)

#### ARCH-1: Dual Initialization Race Condition
- **Location**: `components/scheduler/scheduler-initializer.tsx` + `hooks/scheduler/use-scheduler.ts` + `stores/scheduler/scheduler-store.ts`
- **Problem**: Two independent initialization paths exist:
  1. `SchedulerInitializer` component calls `initSchedulerSystem()` directly
  2. `useScheduler` hook triggers `store.initialize()` which also calls `initSchedulerSystem()`
  - Both use separate guards (`hasInitialized` ref vs `isInitialized` store state) and can fire simultaneously
- **Impact**: Double initialization, wasted resources, potential race conditions in executor registration
- **Fix**: Unify to a single initialization entry point; remove `SchedulerInitializer` or make the store the single source of truth

#### ARCH-2: setTimeout-Based Scheduling is Unreliable
- **Location**: `lib/scheduler/task-scheduler.ts` (timer management throughout)
- **Problem**: 
  - Browsers throttle `setTimeout`/`setInterval` in background tabs (minimum 1000ms intervals, some browsers pause entirely)
  - Timer drift accumulates for long-running intervals
  - Process crash/page refresh loses all pending timers (no durability)
  - No compensation for system sleep/hibernate
- **Impact**: Tasks may miss their scheduled execution windows
- **Fix**: Use Web Workers for timing-critical operations; implement persistent next-run tracking with catch-up logic on page focus; integrate `document.visibilitychange` API

#### ARCH-3: No Multi-Tab Task Locking
- **Location**: `lib/scheduler/task-scheduler.ts`
- **Problem**: When multiple browser tabs are open, each tab initializes its own scheduler instance. The same task can execute simultaneously in multiple tabs.
- **Impact**: Duplicate task executions, data corruption
- **Fix**: Implement a leader election mechanism using `BroadcastChannel` API or IndexedDB-based locks (Web Locks API where available)

#### ARCH-4: Singleton Pattern with Module-Level State
- **Location**: `lib/scheduler/task-scheduler.ts` (module-level `instance` variable)
- **Problem**: Module-level singleton is unsafe for SSR contexts and makes testing difficult
- **Fix**: Use a factory pattern with proper lifecycle management; provide instance via React context

### 3.2 Performance (P1 - High)

#### PERF-1: Store refreshAll Triggers Cascading Re-renders
- **Location**: `stores/scheduler/scheduler-store.ts:323-338`
- **Problem**: `refreshAll()` calls `loadTasks()` and `loadStatistics()` sequentially, each calling `set()` individually. With `selectedTaskId`, a third `loadTaskExecutions()` fires. Each `set()` triggers a Zustand subscriber notification.
- **Fix**: Batch state updates using a single `set()` call with all loaded data

#### PERF-2: Inefficient IndexedDB Queries
- **Location**: `lib/scheduler/scheduler-db.ts`
- **Problem**: 
  - `getAllTasks()` loads all tasks into memory
  - `getFilteredTasks()` loads all then filters client-side
  - No pagination for execution history (hard-coded limit of 50)
  - Serialization/deserialization on every read
- **Fix**: Use Dexie's `where()` clauses for indexed filtering; implement cursor-based pagination; cache deserialized results

#### PERF-3: Auto-Refresh Polling Without Visibility Check
- **Location**: `hooks/scheduler/use-scheduler.ts:61-69`
- **Problem**: 60-second polling continues even when the tab is not visible, wasting resources
- **Fix**: Pause polling when `document.hidden === true`; resume on `visibilitychange` event

#### PERF-4: Module-Level Selector Caches are Fragile
- **Location**: `stores/scheduler/scheduler-store.ts:469-504`
- **Problem**: `_activeTasksCache`, `_pausedTasksCache`, `_upcomingTasksCache` are module-level mutable variables with manual cache invalidation based on reference equality
- **Fix**: Use Zustand's built-in `useShallow` or derive selectors properly to leverage React's own memoization

### 3.3 Code Quality (P1 - High)

#### CODE-1: Monolithic Page Component (994 lines)
- **Location**: `app/(main)/scheduler/page.tsx`
- **Problem**: Single file contains all state management, event handlers, both App and System scheduler views, mobile/desktop layouts, and 6 dialogs/sheets
- **Fix**: Extract into sub-components:
  - `SchedulerHeader` (header + tabs)
  - `AppSchedulerView` (stats + search + master-detail)
  - `SystemSchedulerView` (system tasks list + actions)
  - `SchedulerDialogs` (all sheets/dialogs)

#### CODE-2: console.log Instead of Logger
- **Location**: `components/scheduler/scheduler-initializer.tsx` (5 instances)
- **Problem**: Uses `console.log`/`console.error` instead of the project's `loggers` utility, inconsistent with other modules
- **Fix**: Replace with `loggers.component` or appropriate logger category

#### CODE-3: Duplicated Utility Functions
- **Location**: `components/scheduler/task-details.tsx:119-124` and `components/scheduler/stats-overview.tsx:53-58`
- **Problem**: `formatDuration()` is defined identically in both files. `formatRelativeTime` in `stats-overview.tsx` overlaps with `formatNextRun` in `task-list.tsx`
- **Fix**: Extract to shared `lib/scheduler/format-utils.ts`

#### CODE-4: Mixed Chinese/English Hardcoded Strings
- **Location**: `components/scheduler/script-task-editor.tsx` (throughout)
- **Problem**: Labels use inline bilingual format: `"脚本语言 / Script Language"`, `"沙盒执行 / Sandbox Execution"`, etc. instead of the i18n system
- **Fix**: Move all strings to `lib/i18n/messages/{locale}/scheduler.json`

#### CODE-5: Redundant useCallback Wrappers in Hook
- **Location**: `hooks/scheduler/use-scheduler.ts:72-168`
- **Problem**: Every action is wrapped in `useCallback` that just delegates to `store.method()`. Since `store` is stable (Zustand), these wrappers add overhead without value.
- **Fix**: Return store methods directly; only wrap if adding extra logic

#### CODE-6: Hardcoded i18n Fallbacks
- **Location**: Throughout all components
- **Problem**: Every `useTranslations` call uses `t('key') || 'English fallback'` pattern. This bypasses the i18n system's built-in fallback mechanism.
- **Fix**: Configure default locale fallback in next-intl; remove inline fallbacks

### 3.4 Error Handling (P1 - High)

#### ERR-1: Silent Error Swallowing in Store
- **Location**: `stores/scheduler/scheduler-store.ts` (all action methods)
- **Problem**: All store actions catch errors, set a string `error` state, and return `null`/`false`. Callers have no way to distinguish error types or handle them specifically.
- **Fix**: Define a `SchedulerError` class with error codes; optionally re-throw after logging so callers can handle

#### ERR-2: Fixed Retry Delay Without Exponential Backoff
- **Location**: `lib/scheduler/task-scheduler.ts` (retry logic)
- **Problem**: Task retry uses a fixed `retryDelay` (default 5000ms). Best practices recommend exponential backoff with jitter to prevent thundering herd effect.
- **Fix**: Implement `delay = retryDelay * (2 ^ attempt) + random_jitter`; cap at `maxDelay`

#### ERR-3: Webhook Notification Failures Not Retried
- **Location**: `lib/scheduler/notification-integration.ts`
- **Problem**: Webhook fetch has basic try/catch but no retry logic, no configurable timeout, no response validation
- **Fix**: Add retry with exponential backoff for webhook notifications; add timeout via `AbortController`

### 3.5 Type Safety (P2 - Medium)

#### TYPE-1: Unsafe `as unknown as` Casts in Serialization
- **Location**: `types/scheduler/index.ts` (4 instances)
- **Problem**: Serialization/deserialization functions use `as unknown as` to cast between stored and runtime types
- **Fix**: Replace with runtime type guards using discriminated unions or `zod` schema validation

#### TYPE-2: Missing Form Validation Edge Cases
- **Location**: `components/scheduler/task-form.tsx:173-237`
- **Problem**: 
  - Interval minimum value not validated (could be 0 or negative after parseInt)
  - "Once" trigger accepts past dates
  - Event type not validated against `SchedulerEventType`
  - No max length for name/description
- **Fix**: Add comprehensive validation with user-friendly error messages

### 3.6 Missing Features (P2 - Medium)

#### FEAT-1: No Execution Timeout Enforcement
- **Location**: `lib/scheduler/task-scheduler.ts`
- **Problem**: `config.timeout` is defined in types but unclear if actually enforced with `AbortController` or `Promise.race` during execution
- **Fix**: Wrap executor calls with `Promise.race([execution, timeoutPromise])` using `AbortController`

#### FEAT-2: No Task Dependency/Chaining
- **Problem**: No way to define "run Task B after Task A completes". Event integration exists but requires manual setup.
- **Fix**: Add optional `dependsOn: string[]` field to `ScheduledTask`; scheduler checks dependencies before execution

#### FEAT-3: No Bulk Operations
- **Problem**: Can't pause/resume/delete multiple tasks at once from the UI
- **Fix**: Add multi-select to `TaskList`; add bulk action buttons

#### FEAT-4: No Execution Log Viewer
- **Problem**: Task execution logs (`TaskExecutionLog[]`) are stored but no UI to view detailed logs
- **Fix**: Add expandable log viewer in execution history

### 3.7 Testing (P2 - Medium)

#### TEST-1: Insufficient Test Coverage
- **Problem**: Only 2 test files exist:
  - `app/(main)/scheduler/page.test.tsx` (page rendering)
  - `hooks/scheduler/use-scheduler.test.ts` (hook basics)
  - No tests for: `task-scheduler.ts`, `cron-parser.ts`, `scheduler-db.ts`, `notification-integration.ts`, `script-executor.ts`, store actions
- **Fix**: Add unit tests for all core lib files and store; target 70% line coverage

---

## 4. Optimization Items

### Priority Legend
- **P0**: Critical - Must fix, causes bugs or data issues
- **P1**: High - Significant quality/performance improvement  
- **P2**: Medium - Nice to have, improves maintainability

### Quick Wins (< 30 min each)

| ID | Item | Files | Est. |
|----|------|-------|------|
| CODE-2 | Replace console.log with loggers | `scheduler-initializer.tsx` | 10 min |
| CODE-3 | Extract shared format utilities | `task-details.tsx`, `stats-overview.tsx` → new `format-utils.ts` | 20 min |
| CODE-5 | Remove redundant useCallback wrappers | `use-scheduler.ts` | 15 min |
| PERF-3 | Add visibility API check to polling | `use-scheduler.ts` | 15 min |

### Medium Effort (1-4 hours each)

| ID | Item | Files | Est. |
|----|------|-------|------|
| ARCH-1 | Unify initialization paths | `scheduler-initializer.tsx`, `scheduler-store.ts`, `use-scheduler.ts` | 2h |
| PERF-1 | Batch store state updates | `scheduler-store.ts` | 1h |
| PERF-4 | Replace manual selector caches | `scheduler-store.ts` | 1h |
| CODE-1 | Split page into sub-components | `page.tsx` → 4 new components | 3h |
| CODE-4 | Move script-editor strings to i18n | `script-task-editor.tsx`, i18n JSON files | 1h |
| CODE-6 | Remove hardcoded i18n fallbacks | All component files | 2h |
| ERR-1 | Add structured SchedulerError class | `lib/scheduler/`, `stores/scheduler/` | 2h |
| ERR-2 | Implement exponential backoff retry | `task-scheduler.ts` | 1.5h |
| ERR-3 | Add webhook retry with timeout | `notification-integration.ts` | 1h |
| TYPE-1 | Replace unsafe casts with type guards | `types/scheduler/index.ts` | 1.5h |
| TYPE-2 | Add comprehensive form validation | `task-form.tsx` | 1.5h |
| FEAT-1 | Enforce execution timeout | `task-scheduler.ts` | 1.5h |

### Large Effort (4+ hours each)

| ID | Item | Files | Est. |
|----|------|-------|------|
| ARCH-2 | Web Worker + visibility-aware scheduling | `task-scheduler.ts`, new worker file | 8h |
| ARCH-3 | Multi-tab leader election | New `lib/scheduler/tab-lock.ts` | 4h |
| ARCH-4 | Factory pattern for scheduler instance | `task-scheduler.ts`, `scheduler-store.ts` | 3h |
| PERF-2 | Optimize IndexedDB queries + pagination | `scheduler-db.ts`, `scheduler-store.ts` | 4h |
| TEST-1 | Comprehensive unit test suite | New test files for all lib modules | 8h |
| FEAT-2 | Task dependency chains | `types/`, `lib/scheduler/`, `components/scheduler/` | 6h |
| FEAT-3 | Bulk operations UI | `task-list.tsx`, `page.tsx` | 3h |

---

## 5. Implementation Phases

### Phase 1: Critical Fixes & Quick Wins (Day 1-2)
> Goal: Eliminate bugs and race conditions

1. **ARCH-1** - Unify initialization (remove `SchedulerInitializer` duplicate path, let store be single entry)
2. **CODE-2** - Replace console.log with loggers
3. **CODE-3** - Extract shared format utilities
4. **CODE-5** - Remove redundant useCallback wrappers
5. **PERF-3** - Add visibility API check to auto-refresh polling
6. **ERR-2** - Implement exponential backoff with jitter for retries

### Phase 2: Performance & Code Quality (Day 3-5)
> Goal: Improve rendering performance and maintainability

7. **PERF-1** - Batch store state updates in refreshAll
8. **PERF-4** - Replace module-level selector caches with proper patterns
9. **CODE-1** - Split page.tsx into sub-components
10. **ERR-1** - Add structured SchedulerError class
11. **TYPE-2** - Add comprehensive form validation
12. **FEAT-1** - Enforce execution timeout with AbortController

### Phase 3: Reliability & Robustness (Day 6-8)
> Goal: Production-grade reliability

13. **ARCH-3** - Multi-tab leader election (BroadcastChannel + Web Locks)
14. **ARCH-2** - Visibility-aware scheduling with background tab compensation
15. **ERR-3** - Webhook retry with exponential backoff and timeout
16. **PERF-2** - Optimize IndexedDB queries with proper indexing and pagination
17. **TYPE-1** - Replace unsafe type casts with runtime validation

### Phase 4: Polish & Features (Day 9-12)
> Goal: Complete the module

18. **CODE-4** - Move script-editor strings to i18n
19. **CODE-6** - Remove hardcoded i18n fallbacks across all components
20. **TEST-1** - Comprehensive test suite (cron-parser, scheduler-db, task-scheduler, store)
21. **FEAT-3** - Bulk operations UI
22. **ARCH-4** - Factory pattern for scheduler instance
23. **FEAT-2** - Task dependency chains (if time permits)

---

## 6. Workload Estimation

| Phase | Items | Estimated Hours |
|-------|-------|-----------------|
| Phase 1: Critical Fixes | 6 items | 5-6h |
| Phase 2: Performance & Quality | 6 items | 10-12h |
| Phase 3: Reliability | 5 items | 18-22h |
| Phase 4: Polish & Features | 5 items | 22-28h |
| **Total** | **22 items** | **55-68h (~8-12 days)** |

### Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Web Worker scheduling changes timing behavior | Medium | Test extensively; keep setTimeout fallback |
| Multi-tab locking adds complexity | Medium | Use proven patterns (BroadcastChannel); feature-flag it |
| Page split breaks existing tests | Low | Update page.test.tsx in same PR |
| IndexedDB migration needed for new indexes | Low | Use Dexie's version upgrade mechanism |

---

## Appendix: Files Inventory

### `lib/scheduler/` (Core Engine)
- `index.ts` - Module exports + `initSchedulerSystem()`/`stopSchedulerSystem()`
- `task-scheduler.ts` - `TaskSchedulerImpl` class (752 lines)
- `cron-parser.ts` - Cron expression utilities (444 lines)
- `scheduler-db.ts` - Dexie IndexedDB layer (385 lines)
- `notification-integration.ts` - Notification dispatch (262 lines)
- `event-integration.ts` - Event-triggered tasks (106 lines)
- `script-executor.ts` - Sandbox script execution (300 lines)
- `executors/index.ts` - Built-in executor registry (387 lines)
- `executors/plugin-executor.ts` - Plugin task execution (187 lines)

### `types/scheduler/`
- `index.ts` - Core types + defaults + serialization (498 lines)
- `system-scheduler.ts` - System scheduler types (239 lines)

### `stores/scheduler/`
- `scheduler-store.ts` - Zustand store + selectors (513 lines)
- `index.ts` - Re-exports (24 lines)

### `hooks/scheduler/`
- `use-scheduler.ts` - Main scheduler hook (209 lines)
- `use-system-scheduler.ts` - System scheduler hook (372 lines)
- `index.ts` - Re-exports (13 lines)

### `components/scheduler/`
- `task-list.tsx` - Task list with status/type indicators (302 lines)
- `task-details.tsx` - Task detail view with tabs (487 lines)
- `task-form.tsx` - Create/edit form (658 lines)
- `stats-overview.tsx` - Dashboard statistics cards (280 lines)
- `script-task-editor.tsx` - Script editing component (242 lines)
- `scheduler-initializer.tsx` - Lifecycle component (64 lines)
- `system-task-form.tsx` - System task create/edit form
- `task-confirmation-dialog.tsx` - Confirmation + elevation dialogs
- `workflow-schedule-dialog.tsx` - Quick workflow scheduling
- `backup-schedule-dialog.tsx` - Quick backup scheduling
- `index.ts` - Re-exports (16 lines)

### `app/(main)/scheduler/`
- `page.tsx` - Main scheduler page (994 lines)
- `page.test.tsx` - Page tests
- `layout.tsx` - Layout wrapper

### `src-tauri/src/scheduler/` (Rust Backend)
- `mod.rs` - Module definition + `SchedulerState`
- `types.rs` - System task types
- `service.rs` - `SystemScheduler` trait
- `error.rs` - Error types
- `windows.rs` - Windows Task Scheduler implementation
- `linux.rs` - Linux systemd implementation
- `macos.rs` - macOS launchd implementation
