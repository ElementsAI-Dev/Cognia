# Code Audit: `components/agent/`

**Date**: 2026-02-11
**Scope**: 76 files (38 source `.tsx`, 37 test files, 1 `index.ts`)
**Total Size**: ~750KB source code

---

## Executive Summary

The `components/agent` directory is well-structured with comprehensive test coverage (37/38 source files have tests). Code quality is generally high — no `as any`, no `@ts-ignore`, no `console.log` in production code, no empty catch blocks, no eslint-disable directives. Key issues are: **1 dead component**, **1 missing barrel export**, **1 `useMemo` misuse as side-effect**, **significant code duplication** across 7+ agent-team components, and **1 oversized file** (1038 lines).

---

## Issues by Priority

### [Priority: HIGH] H-1: `useMemo` Misused as Side-Effect in WorkflowSelector

**Location**: `@components/agent/workflow-selector.tsx:130-134`

**Current Problem**:
`useMemo` is used to call `initialize()` — a side-effectful function. `useMemo` is not guaranteed to run only once; React may discard and re-compute it. This should be `useEffect`.

```tsx
useMemo(() => {
  if (!isInitialized) {
    initialize();
  }
}, [isInitialized, initialize]);
```

**Suggested Fix**:
Replace with `useEffect`:
```tsx
useEffect(() => {
  if (!isInitialized) {
    initialize();
  }
}, [isInitialized, initialize]);
```

**Expected Benefit**:
- Reliability: prevents potential double-initialization in StrictMode
- Correctness: follows React rules of hooks

**Effort Estimate**: Small (< 1hr)

---

### [Priority: HIGH] H-2: Missing Barrel Export — `ExternalAgentConfigOptions`

**Location**: `@components/agent/index.ts`

**Current Problem**:
`ExternalAgentConfigOptions` is defined and used by `external-agent-manager.tsx`, but is NOT exported from `index.ts`. Other consumers importing from `@/components/agent` cannot access it. All other 37 source components are properly exported.

**Suggested Fix**:
Add to `index.ts`:
```ts
export { ExternalAgentConfigOptions } from './external-agent-config-options';
```

**Expected Benefit**:
- Maintainability: consistent barrel exports
- Usability: external consumers can import from barrel

**Effort Estimate**: Small (< 1hr)

---

### [Priority: HIGH] H-3: Dead Code — `_MessageItem` Component

**Location**: `@components/agent/agent-team-panel.tsx:264-289`

**Current Problem**:
`_MessageItem` is a fully implemented component (25 lines) prefixed with `_` to suppress unused warnings. It is never used anywhere — the panel delegates messages to `AgentTeamChat` instead.

**Suggested Fix**:
Remove the `_MessageItem` function and its `MessageItemProps` interface (lines 260-289).

**Expected Benefit**:
- Maintainability: eliminates dead code
- Bundle: minor reduction

**Effort Estimate**: Small (< 1hr)

---

### [Priority: MEDIUM] M-1: Oversized File — `custom-mode-editor.tsx` (1038 lines)

**Location**: `@components/agent/custom-mode-editor.tsx`

**Current Problem**:
At 1038 lines, this file contains 5 sub-components (`TemplateSelector`, `IconSelector`, `ToolSelector`, `McpToolSelector`, `CustomModeEditor`) plus type definitions. This exceeds the 300-line recommended maximum.

**Suggested Fix**:
Extract into separate files:
- `custom-mode-editor/template-selector.tsx` (~40 lines)
- `custom-mode-editor/icon-selector.tsx` (~70 lines)
- `custom-mode-editor/tool-selector.tsx` (~100 lines)
- `custom-mode-editor/mcp-tool-selector.tsx` (~150 lines)
- `custom-mode-editor/index.tsx` (main component, ~600 lines)

**Expected Benefit**:
- Maintainability: easier to navigate and modify individual selectors
- Testability: sub-components can be tested independently

**Effort Estimate**: Medium (1-4hr)

---

### [Priority: MEDIUM] M-2: Duplicated Team Data Resolution Pattern (7+ files)

**Location**: Multiple agent-team files

**Current Problem**:
The pattern `team.taskIds.map(id => allTasks[id]).filter(Boolean)` and `team.teammateIds.map(id => allTeammates[id]).filter(Boolean)` is duplicated across **7+ files**:
- `agent-team-panel.tsx`
- `agent-team-graph.tsx`
- `agent-team-task-board.tsx`
- `agent-team-result-card.tsx`
- `agent-team-analytics.tsx`
- `agent-team-timeline.tsx`
- `agent-team-panel-sheet.tsx`

**Suggested Fix**:
Create shared hooks or store selectors:
```ts
// In stores/agent/agent-team-store.ts or hooks/agent/
export function useTeamTeammates(teamId: string) { ... }
export function useTeamTasks(teamId: string) { ... }
export function useTeamMessages(teamId: string) { ... }
```

**Expected Benefit**:
- Maintainability: single source of truth for data resolution
- Performance: potential memoization optimization in one place
- DRY: eliminates ~50 duplicated lines

**Effort Estimate**: Medium (1-4hr)

---

### [Priority: MEDIUM] M-3: Hardcoded Error Messages (5 files)

**Location**: Multiple files

**Current Problem**:
Several error toast messages are hardcoded in English instead of using i18n:
- `@components/agent/custom-mode-editor.tsx:564` — `'Mode generation failed'`
- `@components/agent/agent-flow-visualizer.tsx:89` — `'Failed to execute sub-agents'`
- `@components/agent/agent-flow-visualizer.tsx:98` — `'Failed to execute sub-agent'`
- `@components/agent/external-agent-config-options.tsx:164` — `'Failed to set config option'`

**Suggested Fix**:
Replace with `t('errorKey')` using existing translation hooks already available in each component.

**Expected Benefit**:
- i18n: proper internationalization
- Consistency: matches the rest of the codebase

**Effort Estimate**: Small (< 1hr)

---

### [Priority: MEDIUM] M-4: Unused `_onClaim` Parameter in TaskCard

**Location**: `@components/agent/agent-team-task-board.tsx:331`

**Current Problem**:
```tsx
function TaskCard({ task, teammates, allTasks, onSetStatus, onClaim: _onClaim, onAssign }: TaskCardProps)
```
The `onClaim` prop is received but prefixed with `_` (unused). The `claimTask` action is passed from the parent but never used in the TaskCard. This is either dead prop plumbing or a missing feature.

**Suggested Fix**:
Either integrate `onClaim` into the task card UI (e.g., a "Claim" button for unclaimed tasks) or remove it from `TaskCardProps` and the parent.

**Expected Benefit**:
- Clarity: removes dead prop or completes feature

**Effort Estimate**: Small (< 1hr)

---

### [Priority: MEDIUM] M-5: `background-agent-panel.tsx` Notification Leak

**Location**: `@components/agent/background-agent-panel.tsx:177-191`

**Current Problem**:
The `useEffect` that watches `completedAgents` for notifications uses a crude heuristic (`Date.now() - agent.completedAt.getTime() < 1000`) to detect "recently completed" agents. This can:
1. Fire duplicate notifications on re-renders within the 1s window
2. Miss notifications if the component mounts >1s after completion

**Suggested Fix**:
Track already-notified agent IDs with a `useRef<Set<string>>`:
```tsx
const notifiedRef = useRef<Set<string>>(new Set());
useEffect(() => {
  completedAgents.forEach(agent => {
    if (!notifiedRef.current.has(agent.id)) {
      notifiedRef.current.add(agent.id);
      handleAgentComplete(agent);
    }
  });
}, [completedAgents, sendNotification, t]);
```

**Expected Benefit**:
- Reliability: no duplicate or missed notifications
- Performance: no Date.now() comparison per render

**Effort Estimate**: Small (< 1hr)

---

### [Priority: LOW] L-1: Emoji in Production Code

**Location**: `@components/agent/agent-summary-dialog.tsx:300,446,546`

**Current Problem**:
Uses raw emoji `🔧` for tool badges instead of Lucide icons, inconsistent with the rest of the agent components which use Lucide `Wrench` icon.

**Suggested Fix**:
Replace `🔧` with `<Wrench className="h-3 w-3 mr-1" />` (already imported in other agent files).

**Expected Benefit**:
- Consistency: uniform icon system across all agent components

**Effort Estimate**: Small (< 1hr)

---

### [Priority: LOW] L-2: Duplicate `formatElapsed` / `formatTokens` Utilities

**Location**: `@components/agent/session-replay.tsx:434-446`

**Current Problem**:
`formatElapsed` and `formatTokens` are utility functions defined inline. The codebase already has `formatDurationShort` in `@/lib/utils` (used by other agent components like `tool-timeline.tsx`, `agent-flow-visualizer.tsx`). There's also `formatCost` from `@/lib/agent-trace/cost-estimator`.

**Suggested Fix**:
Replace `formatElapsed` with `formatDurationShort` from `@/lib/utils`. Move `formatTokens` to `@/lib/utils` if it's used elsewhere, or keep inline if truly local.

**Expected Benefit**:
- DRY: reuse existing utility
- Consistency: unified formatting across components

**Effort Estimate**: Small (< 1hr)

---

### [Priority: LOW] L-3: Large Lucide Icon Import in `agent-team-panel.tsx`

**Location**: `@components/agent/agent-team-panel.tsx:12-38`

**Current Problem**:
Imports **27 icons** from `lucide-react` but only uses ~20 of them. While tree-shaking should handle this, the visual noise increases cognitive load.

**Suggested Fix**:
Audit and remove unused icon imports. Consider if `StatusIcon` map (lines 81-96) would benefit from the shared `STATUS_ICONS` map already defined in `agent-team-graph.tsx`.

**Expected Benefit**:
- Readability: cleaner import section

**Effort Estimate**: Small (< 1hr)

---

### [Priority: LOW] L-4: Hardcoded Column Labels in TaskBoard

**Location**: `@components/agent/agent-team-task-board.tsx:77-82`

**Current Problem**:
Kanban column labels are hardcoded: `'Blocked'`, `'Pending'`, `'In Progress'`, `'Review'`, `'Done'`. The component already has `useTranslations('agentTeam')` but doesn't use it for these.

**Suggested Fix**:
Replace with `t('taskBoard.columnBlocked')`, etc.

**Expected Benefit**:
- i18n: proper internationalization

**Effort Estimate**: Small (< 1hr)

---

## Summary Statistics

| Category | HIGH | MEDIUM | LOW | Total |
|----------|------|--------|-----|-------|
| Structure | 0 | 1 | 1 | 2 |
| Dead Code | 1 | 1 | 0 | 2 |
| Bug/Logic | 1 | 1 | 0 | 2 |
| i18n | 0 | 1 | 1 | 2 |
| DRY | 0 | 1 | 1 | 2 |
| Export | 1 | 0 | 0 | 1 |
| Style | 0 | 0 | 1 | 1 |
| **Total** | **3** | **5** | **4** | **12** |

## Positives

- **Test coverage**: 37/38 source files have co-located tests (97%)
- **No type safety issues**: Zero `as any`, `@ts-ignore`, `@ts-expect-error`
- **No console statements**: Clean production code
- **No empty catch blocks**: All errors handled with toast or underscore-prefixed vars
- **No eslint-disable**: Zero suppressed lint rules
- **Good lazy loading**: `AgentTeamGraph` is lazy-loaded (heavy xyflow dependency)
- **Consistent patterns**: All components use `useTranslations`, `cn()`, shadcn/ui

## Recommended Action Order (Quick Wins First)

1. **H-1** — Fix `useMemo` → `useEffect` (1 line change, prevents bugs)
2. **H-2** — Add missing barrel export (1 line)
3. **H-3** — Remove dead `_MessageItem` (~30 lines)
4. **M-3** — Replace hardcoded error strings with i18n (4 files, ~4 lines each)
5. **M-4** — Fix unused `_onClaim` prop
6. **M-5** — Fix notification leak with `useRef`
7. **L-1** — Replace emoji with Lucide icons
8. **L-2** — Replace `formatElapsed` with `formatDurationShort`
9. **L-4** — i18n for TaskBoard column labels
10. **L-3** — Clean up unused icon imports
11. **M-2** — Extract shared team data hooks (medium effort)
12. **M-1** — Split `custom-mode-editor.tsx` (medium effort)

## Estimated Total Effort

- **Quick wins (H-1 through M-5)**: ~3 hours
- **Full plan including M-1, M-2**: ~8-10 hours
