# Arena Components — Code Audit Report

**Date**: 2026-02-11
**Scope**: `components/arena/` (20 files, 10 source + 1 barrel + 8 tests + 1 missing test)
**Total Lines**: ~4,215 source lines (excluding tests)

---

## Executive Summary

The Arena module is a well-structured, feature-rich model comparison UI with good test coverage (8/11 components tested). The main concerns are: **2 bugs** (keyboard shortcut positional bias in blind mode, Zustand store state mutation via `.sort()`), **heavy code duplication** (~400 lines duplicated across 3 patterns), and **20+ missing i18n keys** relying on inline fallbacks. No security issues, no `any` types, no `@ts-ignore` directives.

---

## Issues by Priority

| Priority | Count |
|----------|-------|
| HIGH     | 4     |
| MEDIUM   | 8     |
| LOW      | 5     |
| **Total**| **17** |

---

## HIGH Priority

### H-1: BUG — Keyboard shortcuts vote for wrong model in blind mode

**Location**: `@components/arena/arena-battle-view.tsx:365-406`

**Current Problem**:
Keyboard shortcuts `1/a` and `2/b` vote using `battle.contestants[0]` and `battle.contestants[1]` (original order), but the **displayed** contestants (`displayContestants`) may be reversed in blind mode via the hash-based shuffle at lines 351-362. A user pressing "A" for the left-displayed model may actually vote for the right model.

**Suggested Fix**:
Use `displayContestants[0]` and `displayContestants[1]` instead of `battle.contestants[0]` and `battle.contestants[1]` in the keyboard handler.

**Expected Benefit**:
- Reliability: Prevents incorrect votes in blind mode, which is the primary fairness feature

**Effort Estimate**: Small (< 1hr)

---

### H-2: BUG — Zustand store state mutation via `.sort()`

**Location**: `@components/arena/arena-heatmap.tsx:53-63`

**Current Problem**:
```typescript
const topModels = useMemo(() => {
  return modelRatings
    .sort((a, b) => b.rating - a.rating) // ← mutates store state!
    .slice(0, maxModels)
```
`Array.sort()` mutates in-place. Since `modelRatings` comes directly from the Zustand store, this mutates shared state, causing unpredictable behavior across components that consume `modelRatings`.

**Suggested Fix**:
Change to `[...modelRatings].sort(...)` to create a copy before sorting.

**Expected Benefit**:
- Reliability: Prevents data corruption and stale/inconsistent renders across the app

**Effort Estimate**: Small (< 1hr)

---

### H-3: Code Duplication — `getSmartModelPair` (~30 lines × 2)

**Location**:
- `@components/arena/arena-chat-view.tsx:83-109`
- `@components/arena/arena-quick-battle.tsx:61-93`

**Current Problem**:
Identical ~30-line function duplicated verbatim: recommendation lookup → rating sort → cross-provider selection. Any bug fix or feature addition must be applied in both places.

**Suggested Fix**:
Extract to a shared hook `useSmartModelPair()` in `hooks/arena/` that encapsulates the model selection logic.

**Expected Benefit**:
- Maintainability: Single source of truth for model pair selection
- Reliability: Bug fixes apply once

**Effort Estimate**: Small (< 1hr)

---

### H-4: Code Duplication — `ContestantCard` / `InlineContestantCard` (~167 lines × 2)

**Location**:
- `@components/arena/arena-battle-view.tsx:79-246` (ContestantCard)
- `@components/arena/arena-inline-battle.tsx:43-210` (InlineContestantCard)

**Current Problem**:
Two nearly identical ~167-line components rendering contestant cards with status badges, metrics footer, copy/cancel buttons. Only minor differences: slightly different padding and `min-w-0` / `shrink-0` classes.

**Suggested Fix**:
Extract a shared `ContestantCard` component with a `variant` prop (`'dialog' | 'inline'`) for the minor styling differences.

**Expected Benefit**:
- Maintainability: Removes ~160 lines of duplication
- Consistency: UI changes apply uniformly

**Effort Estimate**: Medium (1-4hr)

---

## MEDIUM Priority

### M-1: Code Duplication — Vote handling logic (~60 lines × 2)

**Location**:
- `@components/arena/arena-battle-view.tsx:259-331`
- `@components/arena/arena-inline-battle.tsx:213-283`

**Current Problem**:
Both components duplicate the entire vote orchestration: `ensureVoteAllowed`, `handleDeclareTie`, `handleDeclareBothBad`, `handleVote`, `handleCopy`, `handleCancel`, plus identical store selector calls. ~60 lines of identical logic.

**Suggested Fix**:
Extract a `useArenaVoting(battleId)` hook that returns `{ ensureVoteAllowed, handleVote, handleDeclareTie, handleDeclareBothBad, handleCopy, handleCancel, isRevealing, setIsRevealing }`.

**Expected Benefit**:
- Maintainability: Centralizes vote logic
- Reliability: Consistent voting behavior

**Effort Estimate**: Small (< 1hr)

---

### M-2: `arena-battle-view.tsx` exceeds 300-line limit (653 lines)

**Location**: `@components/arena/arena-battle-view.tsx`

**Current Problem**:
At 653 lines, this file is more than double the recommended 300-line maximum. Contains `ContestantCard` (167 lines), `ArenaBattleViewComponent` (~400 lines), keyboard handlers, and diff view integration.

**Suggested Fix**:
After extracting shared `ContestantCard` (H-4) and `useArenaVoting` (M-1), the file will naturally shrink to ~350 lines. Further split footer/diff sections into sub-components if still over.

**Expected Benefit**:
- Maintainability: Easier to navigate, review, and modify

**Effort Estimate**: Medium (included in H-4 and M-1)

---

### M-3: Hardcoded English strings in `arena-error-boundary.tsx`

**Location**: `@components/arena/arena-error-boundary.tsx:55-66`

**Current Problem**:
Error boundary renders hardcoded English: `"failed to load"`, `"Something went wrong"`, `"An unexpected error occurred."`, `"Try again"`. This component is a class component, so it can't use `useTranslations()` directly.

**Suggested Fix**:
Accept translated strings as props or wrap in a functional component that provides translations via context.

**Expected Benefit**:
- i18n: Proper CJK language support (project requirement)

**Effort Estimate**: Small (< 1hr)

---

### M-4: 20+ i18n calls with inline `{ fallback: '...' }` pattern

**Location**: `@components/arena/arena-stats.tsx` (18 instances), `@components/arena/arena-diff-view.tsx` (6 instances), `@components/arena/arena-battle-view.tsx` (2 instances)

**Current Problem**:
Over 20 translation calls use `t('stats.noData', { fallback: 'No battle data yet' })` pattern, indicating missing i18n keys in `lib/i18n/messages/en/arena.json` and `lib/i18n/messages/zh-CN/arena.json`.

**Suggested Fix**:
Add all missing keys to both locale files (`en` and `zh-CN`) and remove fallback objects.

**Expected Benefit**:
- i18n: Proper translations, consistent behavior, no runtime fallback overhead

**Effort Estimate**: Small (< 1hr)

---

### M-5: `console.error` instead of project `loggers` utility

**Location**: `@components/arena/arena-quick-battle.tsx:100`

**Current Problem**:
```typescript
console.error('Not enough models available for quick battle');
```
Project convention (per AGENTS.md) is to use structured loggers for error output.

**Suggested Fix**:
Replace with `loggers.ui.error('Not enough models available for quick battle')`.

**Expected Benefit**:
- Consistency: Follows project conventions for error logging

**Effort Estimate**: Small (< 1hr)

---

### M-6: `ArenaStats` not wrapped in `memo()`

**Location**: `@components/arena/arena-stats.tsx:342`

**Current Problem**:
```typescript
export const ArenaStats = ArenaStatsComponent;  // ← no memo()
```
All other arena components use `memo()` (`ArenaHeatmap`, `ArenaLeaderboard`, `ArenaHistory`, `ArenaQuickBattle`, `ArenaInlineBattle`, `ArenaBattleView`). `ArenaStats` contains a heavy `computeStats()` function that iterates battles multiple times.

**Suggested Fix**:
Change to `export const ArenaStats = memo(ArenaStatsComponent);`.

**Expected Benefit**:
- Performance: Prevents unnecessary re-computation when parent re-renders with same props

**Effort Estimate**: Small (< 1hr)

---

### M-7: `arena-dialog.tsx` doesn't sync with `initialPrompt` prop changes

**Location**: `@components/arena/arena-dialog.tsx:84`

**Current Problem**:
```typescript
const [prompt, setPrompt] = useState(initialPrompt);
```
`useState(initialPrompt)` only uses the initial value once. When `initialPrompt` changes (e.g., user types in chat input, then opens arena dialog), the dialog shows stale prompt text.

**Suggested Fix**:
Add `useEffect` to sync: `useEffect(() => { setPrompt(initialPrompt); }, [initialPrompt]);`
Or use a controlled pattern via `key={initialPrompt}` on the component.

**Expected Benefit**:
- UX: Dialog always reflects the current chat input

**Effort Estimate**: Small (< 1hr)

---

### M-8: LCS diff algorithm O(m×n) memory

**Location**: `@components/arena/arena-diff-view.tsx:51`

**Current Problem**:
```typescript
const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
```
Allocates O(m×n) memory. With `maxLen = 2000` words, worst case is 4M array entries (~32MB). This runs on every re-render if responses change.

**Suggested Fix**:
Use Hirschberg's algorithm for O(min(m,n)) space, or reduce `maxLen` to a more conservative value like 500. Alternatively, memoize the result more aggressively.

**Expected Benefit**:
- Performance: Reduces memory pressure for long responses

**Effort Estimate**: Medium (1-4hr)

---

## LOW Priority

### L-1: Missing tests for 3 components

**Location**:
- `@components/arena/arena-stats.tsx` — no test file
- `@components/arena/arena-diff-view.tsx` — no test file
- `@components/arena/arena-error-boundary.tsx` — no test file

**Current Problem**:
3 of 11 source components (27%) lack test coverage. `arena-stats.tsx` has complex `computeStats` logic; `arena-diff-view.tsx` has the LCS algorithm; `arena-error-boundary.tsx` handles error states.

**Suggested Fix**:
Add test files for each. Priority: `arena-diff-view.test.tsx` (algorithmic correctness), `arena-stats.test.tsx` (stat computation), `arena-error-boundary.test.tsx` (error handling).

**Expected Benefit**:
- Reliability: Catches regressions in business-critical calculations

**Effort Estimate**: Medium (1-4hr)

---

### L-2: `getProviderColor` hardcoded map

**Location**: `@components/arena/arena-dialog.tsx:183-194`

**Current Problem**:
Provider color mapping is hardcoded locally. This pattern is likely duplicated in other modules.

**Suggested Fix**:
Extract to a shared utility (e.g., `lib/ai/provider-colors.ts`) reusable across the codebase.

**Expected Benefit**:
- Maintainability: Single source of truth for provider theming

**Effort Estimate**: Small (< 1hr)

---

### L-3: `handleExport` uses manual DOM manipulation

**Location**: `@components/arena/arena-leaderboard.tsx:209-217`

**Current Problem**:
Creates an `<a>` element, appends to body, clicks, removes. Works but is fragile and could leak if interrupted.

**Suggested Fix**:
Use a shared `downloadJson()` utility or existing `lib/export/` module.

**Expected Benefit**:
- Maintainability: Reusable download logic

**Effort Estimate**: Small (< 1hr)

---

### L-4: `computeStats` makes 6+ array passes

**Location**: `@components/arena/arena-stats.tsx:82-158`

**Current Problem**:
Iterates the battles array 6+ times with separate `.filter()` calls for completed, tie, bothBad, decisive, blindMode, multiTurn. Could be consolidated into a single pass.

**Suggested Fix**:
Use a single `reduce()` to accumulate all counts in one pass.

**Expected Benefit**:
- Performance: O(n) instead of O(6n), matters with large battle histories

**Effort Estimate**: Small (< 1hr)

---

### L-5: `ArenaDiffView` hardcoded height

**Location**: `@components/arena/arena-diff-view.tsx:203,219`

**Current Problem**:
`h-[300px]` is hardcoded for both diff panels. Doesn't adapt to parent context or viewport size.

**Suggested Fix**:
Accept a `maxHeight` prop or use `max-h-[300px]` with flex-grow.

**Expected Benefit**:
- UX: Better responsiveness in different layout contexts

**Effort Estimate**: Small (< 1hr)

---

## Recommended Action Order

| # | Issue | Priority | Effort | Type |
|---|-------|----------|--------|------|
| 1 | H-1: Keyboard shortcut blind mode bug | HIGH | Small | Bug fix |
| 2 | H-2: Zustand store mutation via .sort() | HIGH | Small | Bug fix |
| 3 | M-7: Dialog prompt sync bug | MEDIUM | Small | Bug fix |
| 4 | H-3: Extract `useSmartModelPair` hook | HIGH | Small | Refactor |
| 5 | M-1: Extract `useArenaVoting` hook | MEDIUM | Small | Refactor |
| 6 | H-4: Extract shared `ContestantCard` | HIGH | Medium | Refactor |
| 7 | M-4: Add missing i18n keys | MEDIUM | Small | i18n |
| 8 | M-3: i18n for error boundary | MEDIUM | Small | i18n |
| 9 | M-6: Wrap ArenaStats in memo() | MEDIUM | Small | Perf |
| 10| M-5: Replace console.error with loggers | MEDIUM | Small | Convention |
| 11| L-1: Add missing test files | LOW | Medium | Testing |
| 12| L-4: Single-pass computeStats | LOW | Small | Perf |
| 13| M-8: LCS memory optimization | MEDIUM | Medium | Perf |
| 14| L-2: Extract provider color map | LOW | Small | Refactor |
| 15| L-3: Shared download utility | LOW | Small | Refactor |
| 16| L-5: Responsive diff view height | LOW | Small | UX |
| 17| M-2: File size (resolved by #5-6) | MEDIUM | — | Resolved |

## Quick Wins (high impact, low effort)

1. **H-1**: Fix keyboard shortcuts — 1-line change, prevents wrong votes
2. **H-2**: Add spread before `.sort()` — 1-line change, prevents state corruption
3. **M-7**: Add `useEffect` for prompt sync — 3-line change
4. **M-6**: Add `memo()` wrapper — 1-line change
5. **M-5**: Replace `console.error` — 1-line change

## Estimated Total Effort

- **Small fixes (1-8, 10, 12, 14-16)**: ~8 hours
- **Medium refactors (6, 11, 13)**: ~8 hours
- **Total**: ~16 hours

## Positive Observations

- ✅ Zero `any` types, `@ts-ignore`, or `@ts-expect-error`
- ✅ Zero eslint-disable directives
- ✅ Zero security vulnerabilities (no hardcoded secrets, no XSS vectors)
- ✅ Good i18n coverage (except stats/diff view fallbacks)
- ✅ Consistent naming conventions (PascalCase components, camelCase functions)
- ✅ Proper `memo()` usage on most components
- ✅ Clean barrel exports in `index.ts`
- ✅ All components properly `'use client'` annotated
- ✅ Good test quality with comprehensive mock strategies (8/11 files)
- ✅ Well-structured prop interfaces with TypeScript
- ✅ Proper error boundaries for fault isolation
