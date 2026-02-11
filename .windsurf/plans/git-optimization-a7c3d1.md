# Git Module Optimization Plan

> Comprehensive optimization for `components/git`, `stores/git`, `hooks/native/use-git*`, `lib/native/git.ts`, `lib/native/gitignore-templates.ts`, and `types/system/git.ts`.

---

## Module Inventory

### Files (27 component files + 7 core files = 34 total)

| Layer | File | Lines | Status |
|-------|------|-------|--------|
| **Types** | `types/system/git.ts` | 771 | ⚠️ Oversized, needs splitting |
| **Service** | `lib/native/git.ts` | 1456 | ⚠️ Oversized monolith |
| **Service** | `lib/native/gitignore-templates.ts` | 565 | ✅ Clean |
| **Store** | `stores/git/git-store.ts` | 1680 | ⚠️ Oversized monolith |
| **Store** | `stores/git/index.ts` | 19 | ✅ Clean |
| **Hook** | `hooks/native/use-git.ts` | 747 | ⚠️ Oversized, too many responsibilities |
| **Hook** | `hooks/native/use-git-history.ts` | 185 | ✅ Clean |
| **Page** | `app/(main)/git/page.tsx` | 503 | ⚠️ Duplicate loading state management |
| **Component** | `components/git/git-panel.tsx` | 600 | ⚠️ Handles too many concerns |
| **Component** | `components/git/git-status-panel.tsx` | 364 | ✅ Clean |
| **Component** | `components/git/git-diff-viewer.tsx` | 560 | ⚠️ Custom parser, should use library |
| **Component** | `components/git/git-branch-manager.tsx` | 401 | ✅ Clean |
| **Component** | `components/git/git-commit-history.tsx` | 388 | ✅ Clean |
| **Component** | `components/git/git-file-tree.tsx` | 495 | ✅ Clean |
| **Component** | `components/git/git-stash-panel.tsx` | 355 | ✅ Clean |
| **Component** | `components/git/git-commit-graph.tsx` | 405 | ✅ Well-structured |
| **Component** | `components/git/git-stats-dashboard.tsx` | 421 | ✅ Well-structured |
| **Component** | `components/git/git-checkpoint-panel.tsx` | 343 | ✅ Clean |
| **Component** | `components/git/git-tag-panel.tsx` | 344 | ✅ Clean |
| **Component** | `components/git/git-remote-panel.tsx` | ~300 | ✅ Clean |
| **Component** | `components/git/gitignore-template-selector.tsx` | ~216 | ⚠️ Not exported from index.ts |
| **Component** | `components/git/index.ts` | 17 | ⚠️ Missing GitignoreTemplateSelector |
| **External** | `components/projects/project-git-panel.tsx` | 558 | ✅ Clean |
| **External** | `components/settings/system/git-settings.tsx` | 521 | ✅ Clean |
| **Tests** | 13 test files in `components/git/` | — | ✅ Good coverage |

### Consumers
- `app/(main)/git/page.tsx` — Main Git page (uses GitPanel + 5 sub-panels)
- `components/projects/project-git-panel.tsx` — Project-level Git integration
- `components/settings/system/git-settings.tsx` — Git settings page
- `stores/agent/external-agent-store.ts` — Uses selectCurrentRepo selector
- `stores/sync/sync-store.ts` — Uses selectCurrentRepo selector
- `lib/agent-trace/recorder.ts` — Uses Git store for blame
- `lib/db/repositories/agent-trace-repository.ts` — Uses Git store

---

## Identified Issues

### ARCH-1: Monolithic Service File (Critical)
**File:** `lib/native/git.ts` (1456 lines)
**Problem:** Single file handles ALL Git operations — installation, config, repo ops, staging, commits, remotes, branches, stash, reset, blame, history, credentials, tags, cherry-pick, graph, stats, checkpoints, AND git2 native library. Violates single-responsibility principle.
**Impact:** Difficult to maintain, test, and navigate.

### ARCH-2: Monolithic Store (Critical)
**File:** `stores/git/git-store.ts` (1680 lines)
**Problem:** Single store with ~60 actions covering every Git operation. Massive boilerplate — nearly every action follows the same try/catch/set pattern.
**Impact:** Hard to read, massive re-render surface, difficult to test individual operations.

### ARCH-3: Oversized Types File (Medium)
**File:** `types/system/git.ts` (771 lines)
**Problem:** All Git types, interfaces, helper functions, and constants in one file. Helper functions (formatCommitDate, formatCommitMessage, getStatusColor, etc.) mixed with type definitions.
**Impact:** Slower IDE performance, harder to find specific types.

### ARCH-4: Hook Does Too Much (Medium)
**File:** `hooks/native/use-git.ts` (747 lines)
**Problem:** Single hook provides 40+ operations. Two massive `useShallow` calls selecting ~15 state fields and ~35 actions.
**Impact:** Any consumer gets the entire Git API surface; hard to optimize subscriptions.

### CODE-1: Unused Component Export (Low)
**File:** `components/git/gitignore-template-selector.tsx`
**Problem:** Component exists with tests but is NOT exported from `components/git/index.ts` and not imported anywhere outside its test.
**Impact:** Dead component that should be integrated or removed.

### CODE-2: Unused Hook (Low)
**File:** `hooks/native/use-git-history.ts`
**Problem:** Exported from `hooks/native/index.ts` but never imported by any consumer outside its test file.
**Impact:** Dead code — hook provides undo/reflog functionality that no UI component uses.

### CODE-3: Unused Store Selectors (Low)
**Files:** `stores/git/git-store.ts` lines 1669-1679
**Problem:** 10 selectors exported (`selectGitStatus`, `selectIsGitInstalled`, etc.) but only `selectCurrentRepo` is used externally (by agent and sync stores). The other 9 are unused.
**Impact:** Unnecessary code, though low cost.

### CODE-4: console.error in Store/Components (Low)
**Files:** `stores/git/git-store.ts` (2 occurrences), `components/git/git-panel.tsx` (1 occurrence)
**Problem:** Raw `console.error` calls instead of using project logger.
**Impact:** Inconsistent with project conventions.

### CODE-5: Duplicate Loading State Pattern in Page (Medium)
**File:** `app/(main)/git/page.tsx`
**Problem:** 5 separate boolean loading states (`graphLoading`, `statsLoading`, `checkpointsLoading`, `tagsLoading`, `remotesLoading`) with identical patterns. Each tab's `onRefresh` handler manually toggles its own loading boolean.
**Impact:** Boilerplate, could be a single `loadingTab` state or handled by the store.

### CODE-6: Custom Diff Parser Should Use Library (Medium)
**File:** `components/git/git-diff-viewer.tsx`
**Problem:** Hand-rolled diff line parser (~50 lines) that parses unified diff format. Libraries like `react-diff-view` or `@git-diff-view/react` provide robust parsing, syntax highlighting, split/unified views, and virtual scrolling.
**Impact:** Missing features (syntax highlighting, virtual scrolling for large diffs), potential edge-case bugs in custom parser.

### CODE-7: Store Action Boilerplate (Medium)
**File:** `stores/git/git-store.ts`
**Problem:** Nearly every action follows the same pattern:
```typescript
actionName: async (...args) => {
  const { currentRepoPath } = get();
  if (!currentRepoPath) return false;
  set({ operationStatus: 'running' });
  try {
    const result = await gitService.someMethod(...);
    if (result.success) {
      await get().loadSomething();
      set({ operationStatus: 'success' });
      return true;
    } else {
      set({ lastError: result.error || '...', operationStatus: 'error' });
      return false;
    }
  } catch (error) {
    set({ lastError: ..., operationStatus: 'error' });
    return false;
  }
}
```
~40 actions repeat this with minor variations.
**Impact:** 1000+ lines of boilerplate that could be reduced to ~200 with a helper.

### CODE-8: GitPanel ref API Not Connected (Low)
**File:** `app/(main)/git/page.tsx` lines 48-53
**Problem:** `gitPanelRef` is defined with expected methods (`stageAll`, `commit`, `push`, `pull`) but `GitPanel` component doesn't expose these via `forwardRef`/`useImperativeHandle`. Keyboard shortcuts (Ctrl+S, Ctrl+Enter, etc.) silently fail.
**Impact:** Keyboard shortcuts on the Git page are broken.

### UX-1: No Error Toast/Notification (Medium)
**Problem:** Errors are displayed as inline `Alert` components that can be easily missed. No toast notifications for success/failure of operations.
**Impact:** Poor UX — user may not notice operation failures.

### UX-2: No Confirmation for Destructive Operations in GitPanel (Medium)
**File:** `components/git/git-panel.tsx`
**Problem:** `handleCommit` stages ALL files and commits without user review. No confirmation dialog for discard operations.
**Impact:** Risk of accidentally committing unwanted changes.

### UX-3: Diff Viewer Lacks Syntax Highlighting (Medium)
**File:** `components/git/git-diff-viewer.tsx`
**Problem:** Diffs are rendered as plain text with +/- coloring. No language-aware syntax highlighting.
**Impact:** Harder to read code changes compared to GitHub/VS Code diff viewers.

---

## Optimization Plan

### Step 1: Extract Store Action Helper (CODE-7)
**Priority:** High | **Effort:** Small | **Risk:** Low
**Files:** `stores/git/git-store.ts`

Create a `withGitOperation` helper to eliminate the repetitive try/catch/set pattern:
```typescript
async function withGitOperation<T>(
  get: () => GitState & GitActions,
  set: (partial: Partial<GitState>) => void,
  operation: (repoPath: string) => Promise<GitOperationResult<T>>,
  onSuccess?: (data: T | undefined) => Promise<void> | void,
): Promise<T | null | boolean> { ... }
```
This alone could reduce the store from 1680 → ~800 lines.

### Step 2: Split Service File (ARCH-1)
**Priority:** High | **Effort:** Medium | **Risk:** Low
**Files:** `lib/native/git.ts` → split into:
- `lib/native/git/index.ts` — Re-export everything (backward compatible)
- `lib/native/git/installation.ts` — checkInstalled, install, openWebsite
- `lib/native/git/config.ts` — getConfig, setConfig
- `lib/native/git/repository.ts` — init, clone, status, fullStatus, isRepo
- `lib/native/git/staging.ts` — stage, stageAll, unstage
- `lib/native/git/commits.ts` — commit, getLog, getFileStatus, getDiff, showCommit
- `lib/native/git/remotes.ts` — push, pull, fetch, getRemotes, addRemote, removeRemote
- `lib/native/git/branches.ts` — getBranches, createBranch, deleteBranch, checkout, merge, rename
- `lib/native/git/stash.ts` — stash, getStashList
- `lib/native/git/advanced.ts` — blame, reset, discard, revert, cherryPick, mergeAbort
- `lib/native/git/history.ts` — recordOperation, getHistory, undo, clear, reflog, recover
- `lib/native/git/credentials.ts` — list, set, remove, detectSsh, test
- `lib/native/git/tags.ts` — getTagList, createTag, deleteTag, pushTag
- `lib/native/git/graph.ts` — getLogGraph
- `lib/native/git/stats.ts` — getRepoStats
- `lib/native/git/checkpoints.ts` — create, list, restore, delete
- `lib/native/git/git2.ts` — All git2 native library operations
- `lib/native/git/project.ts` — initProjectRepo, autoCommit, export/restore chat/designer

Keep `gitService` object in `index.ts` for backward compatibility.

### Step 3: Split Types File (ARCH-3)
**Priority:** Medium | **Effort:** Small | **Risk:** Low
**Files:** `types/system/git.ts` → split into:
- `types/system/git/index.ts` — Re-export everything
- `types/system/git/core.ts` — Status enums, GitRepoInfo, GitCommitInfo, GitFileStatus, GitBranchInfo
- `types/system/git/operations.ts` — Options types (Init, Clone, Commit, Push, Pull, etc.)
- `types/system/git/results.ts` — Result types (GitOperationResult, GitStatusResult, etc.)
- `types/system/git/advanced.ts` — Blame, history, credentials, tags, checkpoints, graph, stats
- `types/system/git/config.ts` — ProjectGitConfig, AutoCommitConfig, SessionGitMetadata
- `types/system/git/helpers.ts` — formatCommitDate, formatCommitMessage, getStatusColor, etc.

### Step 4: Fix Broken Keyboard Shortcuts (CODE-8)
**Priority:** High | **Effort:** Small | **Risk:** Low
**Files:** `components/git/git-panel.tsx`, `app/(main)/git/page.tsx`

Add `forwardRef` + `useImperativeHandle` to `GitPanel` to expose `stageAll`, `commit`, `push`, `pull` methods. This fixes the non-functional keyboard shortcuts on the Git page.

### Step 5: Integrate Unused Components (CODE-1, CODE-2)
**Priority:** Medium | **Effort:** Small | **Risk:** Low

**CODE-1:** Add `GitignoreTemplateSelector` export to `components/git/index.ts` and integrate it into the repo initialization flow in `GitPanel` or `app/(main)/git/page.tsx`.

**CODE-2:** Integrate `useGitHistory` into `GitCommitHistory` component — add an "Undo Last Operation" button and reflog viewer accessible from the history tab.

### Step 6: Replace console.error with Logger (CODE-4)
**Priority:** Low | **Effort:** Trivial | **Risk:** None
**Files:** `stores/git/git-store.ts`, `components/git/git-panel.tsx`

Replace 3 `console.error` calls with `createLogger('git')` pattern used elsewhere.

### Step 7: Clean Up Unused Selectors (CODE-3)
**Priority:** Low | **Effort:** Trivial | **Risk:** None
**Files:** `stores/git/git-store.ts`, `stores/git/index.ts`

Either remove the 9 unused selectors or keep them as public API (they have negligible cost). If keeping, add JSDoc comments.

### Step 8: Simplify Page Loading States (CODE-5)
**Priority:** Low | **Effort:** Small | **Risk:** Low
**File:** `app/(main)/git/page.tsx`

Replace 5 separate loading booleans with a single `loadingTab: MainTab | null` state. Reduces state variables from 5 → 1.

### Step 9: Add Toast Notifications (UX-1)
**Priority:** Medium | **Effort:** Small | **Risk:** Low
**Files:** `components/git/git-panel.tsx`, `stores/git/git-store.ts`

Use the project's toast system to show success/error notifications for Git operations. Can be added in the `withGitOperation` helper from Step 1.

### Step 10: Add Commit Review Before Auto-Stage (UX-2)
**Priority:** Medium | **Effort:** Small | **Risk:** Low
**File:** `components/git/git-panel.tsx`

Change `handleCommit` to show a review dialog with staged/unstaged files before committing, instead of blindly staging all and committing.

### Step 11: Upgrade Diff Viewer (CODE-6, UX-3) [DEFERRED]
**Priority:** Low | **Effort:** Large | **Risk:** Medium
**File:** `components/git/git-diff-viewer.tsx`

Consider replacing the custom diff parser with `@git-diff-view/react` for:
- Syntax highlighting
- Virtual scrolling for large diffs
- GitHub-style UI
- SSR support

This is a larger change that should be evaluated separately. The current viewer works, just lacks polish.

---

## Implementation Order

| Order | Step | Priority | Effort | Blocked By |
|-------|------|----------|--------|------------|
| 1 | Step 1: Store action helper | High | Small | — |
| 2 | Step 4: Fix keyboard shortcuts | High | Small | — |
| 3 | Step 6: Replace console.error | Low | Trivial | — |
| 4 | Step 7: Clean up selectors | Low | Trivial | — |
| 5 | Step 8: Simplify loading states | Low | Small | — |
| 6 | Step 2: Split service file | High | Medium | Step 1 |
| 7 | Step 3: Split types file | Medium | Small | — |
| 8 | Step 5: Integrate unused components | Medium | Small | — |
| 9 | Step 9: Add toast notifications | Medium | Small | Step 1 |
| 10 | Step 10: Commit review dialog | Medium | Small | — |
| — | Step 11: Upgrade diff viewer | Low | Large | Deferred |

---

## Metrics

| Metric | Before | After (Expected) |
|--------|--------|-------------------|
| `git-store.ts` lines | 1680 | ~800 |
| `lib/native/git.ts` lines | 1456 | ~100 (index) + 17 modules |
| `types/system/git.ts` lines | 771 | ~50 (index) + 6 modules |
| Unused exports | 12+ | 0 |
| Broken keyboard shortcuts | 4 | 0 |
| Console.error usage | 3 | 0 |
| Test coverage | Good | Maintained |
