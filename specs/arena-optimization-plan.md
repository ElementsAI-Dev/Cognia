# Arena Module Optimization Plan

> Generated from comprehensive code audit of the Arena module.
> Covers: `components/arena`, `hooks/arena`, `stores/arena`, `types/arena`, `lib/ai/arena`, `app/(main)/arena`

---

## Table of Contents

1. [Current State Summary](#1-current-state-summary)
2. [Bugs & Critical Fixes](#2-bugs--critical-fixes)
3. [Architecture Improvements](#3-architecture-improvements)
4. [Performance Optimizations](#4-performance-optimizations)
5. [Code Quality](#5-code-quality)
6. [UX Enhancements](#6-ux-enhancements)
7. [Implementation Roadmap](#7-implementation-roadmap)

---

## 1. Current State Summary

### Module Inventory

| Layer | File | Lines | Purpose |
|-------|------|-------|---------|
| **Types** | `types/arena/index.ts` | 406 | Core types: battles, contestants, preferences, ratings, stats, settings |
| **Types** | `types/arena/leaderboard-sync.ts` | 445 | Remote leaderboard sync types |
| **Store** | `stores/arena/arena-store.ts` | 1021 | Main Zustand store: battle lifecycle, ELO + BT ratings, anti-gaming |
| **Store** | `stores/arena/leaderboard-sync-store.ts` | 601 | Remote leaderboard sync state |
| **Hook** | `hooks/arena/use-arena.ts` | 405 | Battle execution with streaming |
| **Hook** | `hooks/arena/use-leaderboard-sync.ts` | 350 | Leaderboard sync hook |
| **Lib** | `lib/ai/arena/bradley-terry.ts` | 464 | Bradley-Terry MLE implementation |
| **Lib** | `lib/ai/arena/bootstrap.ts` | 289 | Bootstrap confidence intervals |
| **Lib** | `lib/ai/arena/leaderboard-api.ts` | 446 | API client with retry/timeout |
| **Lib** | `lib/ai/arena/rlhf-export.ts` | 382 | RLHF/DPO/HH-RLHF data export |
| **Components** | 8 files | ~3,234 | Full UI: dialog, battle view, chat view, leaderboard, heatmap, history, quick battle, inline battle |
| **Page** | `app/(main)/arena/page.tsx` | 168 | Arena page with tabs |
| **Tests** | 12 test files | ~2,400+ | Comprehensive test coverage across all layers |

**Total**: ~8,600+ lines across 25+ files

### Architecture Highlights
- **Dual rating systems**: Both ELO (online, per-vote) and Bradley-Terry (batch, recalculated) maintained in parallel
- **Blind mode**: Anonymizes model names during voting to reduce bias
- **Multi-turn**: Supports continued conversation battles
- **Anti-gaming**: Vote rate limiting (10 votes/hour) and minimum viewing time (5s)
- **RLHF export**: Supports 6 export formats (RLHF, DPO, HH-RLHF, OpenAI, OpenAI-Comparison, JSONL)
- **Remote sync**: Leaderboard synchronization with caching, retry, auto-refresh

---

## 2. Bugs & Critical Fixes

### BUG-1: `dateRange` filter declared but never applied (HIGH)
**File**: `lib/ai/arena/rlhf-export.ts` → `exportBattles()`
**Issue**: `dateRange` is defined in `ExportOptions` interface (line 67) and destructured (though not extracted from options), but **never used** in the filter logic (lines 192-210). The test at `rlhf-export.test.ts:232` expects it to work but passes coincidentally.
**Fix**: Add date range filtering in the `filteredBattles` filter function:
```typescript
// After category check, add:
if (dateRange) {
  const battleTime = b.createdAt.getTime();
  if (battleTime < dateRange.start || battleTime > dateRange.end) {
    return false;
  }
}
```

### BUG-2: `openai-comparison` format not handled in switch (MEDIUM)
**File**: `lib/ai/arena/rlhf-export.ts` → `exportBattles()`
**Issue**: `ExportFormat` type includes `'openai-comparison'` (line 56), but the switch statement (lines 214-242) only handles `'openai'` — the `'openai-comparison'` case falls through to the `default`/`jsonl` case, producing wrong output format.
**Fix**: Add explicit case or alias the `'openai-comparison'` case to `'openai'`:
```typescript
case 'openai':
case 'openai-comparison':
  data = battlesToOpenAIComparison(filteredBattles, { includeTies });
  break;
```

### BUG-3: Unused variable `_settings` (LOW)
**File**: `components/arena/arena-dialog.tsx:103`
**Issue**: `const _settings = useArenaStore((state) => state.settings)` is assigned but never used. This causes an unnecessary store subscription and re-renders.
**Fix**: Remove the line.

### BUG-4: Debug `console.log` left in production code (LOW)
**File**: `components/arena/arena-quick-battle.tsx:208`
**Issue**: `console.log('Shuffled models:', models)` — debug logging left in shuffle button handler.
**Fix**: Remove the console.log statement.

---

## 3. Architecture Improvements

### ARCH-1: Unify rating system — deprecate ELO in favor of BT (HIGH)
**Problem**: The store maintains **two independent rating systems**:
- ELO ratings: Updated per-vote in `selectWinner()` (lines ~860-920 of arena-store.ts)
- Bradley-Terry ratings: Batch-recalculated via `recalculateBTRatings()`

Per LMSYS research (confirmed by their transition from ELO to BT), Bradley-Terry is strictly superior:
- **Order-independent**: ELO ratings change depending on game order; BT does not
- **More stable**: BT provides significantly more stable rankings
- **Confidence intervals**: BT naturally supports CI via bootstrap; ELO does not

**Proposal**:
1. Remove ELO calculation from `selectWinner()` flow
2. Always use BT ratings as the primary rating system
3. Keep a lightweight ELO for real-time display feedback if needed, but mark as "provisional"
4. Store only BT ratings in persisted state

### ARCH-2: Split the monolithic arena-store (HIGH)
**Problem**: `arena-store.ts` at 1021 lines handles too many concerns.
**Proposal**: Split into focused stores:
- `battle-store.ts` — Battle lifecycle (create, update contestants, cancel)
- `rating-store.ts` — BT ratings, recalculation, model stats
- `preference-store.ts` — Voting, preferences, anti-gaming
- `arena-settings-store.ts` — Settings only

Use Zustand's slice pattern or keep as separate stores with cross-store selectors.

### ARCH-3: Move heavy computation off main thread (MEDIUM)
**Problem**: `recalculateBTRatings()` runs synchronously with 1000 bootstrap samples. The MM algorithm iterates up to 100 times per sample. For N models, this is O(1000 × 100 × N²) — can block the UI.
**Proposal**:
- Use a Web Worker for BT + bootstrap computation
- Provide progress callback for large datasets
- Cache intermediate results to avoid full recomputation on every vote

### ARCH-4: Use IndexedDB (Dexie) for battle storage (MEDIUM)
**Problem**: All battle data (including full response text) is persisted to `localStorage` via Zustand persist. localStorage has a ~5MB limit — a few hundred battles with long responses will hit this.
**Proposal**:
- Migrate battle/response storage to Dexie (already used elsewhere in Cognia)
- Keep only lightweight metadata (IDs, ratings, settings) in localStorage
- Add pagination/cursor-based queries for battle history
- Implement automatic archival of old battles

---

## 4. Performance Optimizations

### PERF-1: Granular store selectors (HIGH)
**Problem**: Components subscribe to broad state slices like `state.battles` — any change to any battle triggers re-renders everywhere.
**Current**:
```typescript
const battles = useArenaStore((state) => state.battles);
```
**Proposal**: Add derived selectors:
```typescript
export const selectActiveBattle = (state) => 
  state.activeBattleId ? state.battles.find(b => b.id === state.activeBattleId) : undefined;
export const selectCompletedBattleCount = (state) => 
  state.battles.filter(b => b.winnerId || b.isTie).length;
export const selectRecentBattles = (limit: number) => (state) => 
  state.battles.slice(0, limit);
```

### PERF-2: Memoize heatmap computation (MEDIUM)
**Problem**: Heatmap data recomputes on every render. Head-to-head matrix is O(n²) for n models.
**Proposal**: 
- Memoize `computeHeadToHead` results with a version counter
- Only recompute when preferences change (not on every render)
- Consider `useMemo` with dependency on `preferences.length`

### PERF-3: Virtualize long lists (MEDIUM)
**Problem**: ArenaHistory renders all battles; ArenaLeaderboard renders all models.
**Proposal**: Use `@tanstack/react-virtual` or similar for:
- Battle history list (ArenaHistory)
- Leaderboard table (ArenaLeaderboard)
- Heatmap for large model counts

### PERF-4: Debounce BT recalculation (LOW)
**Problem**: `recalculateBTRatings` is called after every vote. In rapid voting sessions, this causes redundant computation.
**Proposal**: Debounce recalculation with ~500ms delay, or batch multiple votes before recalculating.

### PERF-5: Use Map for O(1) lookups (LOW)
**Problem**: Multiple `battles.find()`, `preferences.find()`, `ratings.find()` patterns — all O(n).
**Proposal**: Maintain a `Map<string, ArenaBattle>` alongside the array, or use a normalized state shape:
```typescript
battles: Record<string, ArenaBattle>
battleIds: string[] // ordered
```

---

## 5. Code Quality

### CQ-1: Remove unused exports (LOW)
**Unused in production** (only referenced in test files or internally):
- `generateStratifiedBootstrapSamples` — never imported outside `bootstrap.ts`/tests
- `predictWinProbability` — never imported outside `bradley-terry.ts`/tests
- `ratingToBtScore` — never imported outside `bradley-terry.ts`/tests
- `groupIntoTiers` — never imported outside `bootstrap.ts`/tests

**Recommendation**: Keep exports (they're useful utilities) but consider marking as `@internal` or moving to a `utils` sub-module. They may be useful for future features like tier badges.

### CQ-2: Fix `as any` type assertion (LOW)
**File**: `hooks/arena/use-arena.ts:128`
```typescript
const usageAny = usage as any;
```
**Issue**: AI SDK usage type is loosely typed. This is already documented with eslint-disable.
**Proposal**: Create a proper type guard or utility:
```typescript
function extractTokenUsage(usage: unknown): { input: number; output: number } {
  const u = usage as Record<string, unknown>;
  return {
    input: (u?.promptTokens ?? u?.inputTokens ?? 0) as number,
    output: (u?.completionTokens ?? u?.outputTokens ?? 0) as number,
  };
}
```

### CQ-3: Add error boundaries to Arena components (MEDIUM)
**Problem**: No error boundaries — a crash in any arena component crashes the whole page.
**Proposal**: Wrap major sections (battle view, leaderboard, heatmap, history) with error boundaries that show graceful fallback UI.

### CQ-4: Standardize model ID handling (LOW)
**Problem**: `getModelId(provider, model)` and `parseModelId(modelId)` pattern is used but model ID construction (`\`${provider}:${model}\``) is also done inline in multiple files.
**Proposal**: Enforce using `getModelId`/`parseModelId` everywhere and add lint rule or code review check.

---

## 6. UX Enhancements

### UX-1: Keyboard shortcuts for voting (MEDIUM)
**Current**: Voting requires mouse clicks on buttons.
**Proposal**: Add keyboard shortcuts:
- `1` or `A` → Vote for Model A
- `2` or `B` → Vote for Model B
- `T` → Declare tie
- `S` → Skip / cancel
- Show shortcut hints in UI

### UX-2: Response diff view (LOW)
**Proposal**: Add a toggle to show a side-by-side diff of model responses, highlighting differences. Useful for close comparisons.

### UX-3: Model performance trends (LOW)
**Proposal**: Add a simple line chart showing rating changes over time for each model. Can use the existing battle history data.

### UX-4: Improved blind mode UX (LOW)
**Current**: Blind mode uses "Model A" / "Model B" labels.
**Proposal**: 
- Add randomized color coding for visual distinction
- Scramble response order randomly (not always left=A, right=B)
- Add "reveal" animation after voting

### UX-5: Battle statistics dashboard (LOW)
**Proposal**: Add a stats tab showing:
- Total battles, avg response time, most battled models
- Category distribution pie chart
- Voting pattern analysis (bias detection)

---

## 7. Implementation Roadmap

### Phase 1: Bug Fixes (Estimated: 1-2 hours)
| Priority | Item | Files |
|----------|------|-------|
| HIGH | BUG-1: Fix dateRange filter | `lib/ai/arena/rlhf-export.ts` |
| MEDIUM | BUG-2: Fix openai-comparison switch | `lib/ai/arena/rlhf-export.ts` |
| LOW | BUG-3: Remove unused `_settings` | `components/arena/arena-dialog.tsx` |
| LOW | BUG-4: Remove debug console.log | `components/arena/arena-quick-battle.tsx` |

### Phase 2: Performance Quick Wins (Estimated: 2-3 hours)
| Priority | Item | Files |
|----------|------|-------|
| HIGH | PERF-1: Granular store selectors | `stores/arena/arena-store.ts`, all components |
| MEDIUM | PERF-2: Memoize heatmap | `components/arena/arena-heatmap.tsx` |
| LOW | PERF-4: Debounce BT recalculation | `stores/arena/arena-store.ts` |

### Phase 3: Architecture (Estimated: 4-6 hours)
| Priority | Item | Files |
|----------|------|-------|
| HIGH | ARCH-1: Unify to BT-only rating | `stores/arena/arena-store.ts` |
| HIGH | ARCH-2: Split monolithic store | `stores/arena/` |
| MEDIUM | CQ-3: Add error boundaries | `components/arena/` |

### Phase 4: Storage & Performance (Estimated: 3-4 hours)
| Priority | Item | Files |
|----------|------|-------|
| MEDIUM | ARCH-4: IndexedDB migration | `stores/arena/`, `lib/db/` |
| MEDIUM | ARCH-3: Web Worker for BT | `lib/ai/arena/`, new worker file |
| MEDIUM | PERF-3: Virtualize lists | `components/arena/arena-history.tsx`, `arena-leaderboard.tsx` |

### Phase 5: UX Enhancements (Estimated: 3-4 hours)
| Priority | Item | Files |
|----------|------|-------|
| MEDIUM | UX-1: Keyboard shortcuts | `components/arena/arena-battle-view.tsx`, `arena-inline-battle.tsx` |
| LOW | UX-2: Response diff view | New component |
| LOW | UX-4: Improved blind mode | `components/arena/arena-battle-view.tsx` |

### Phase 6: Code Quality Polish (Estimated: 1-2 hours)
| Priority | Item | Files |
|----------|------|-------|
| LOW | CQ-1: Document unused exports | `lib/ai/arena/` |
| LOW | CQ-2: Fix `as any` assertion | `hooks/arena/use-arena.ts` |
| LOW | CQ-4: Standardize model IDs | Multiple files |
| LOW | PERF-5: Map-based lookups | `stores/arena/arena-store.ts` |

---

## References

- [LMSYS Blog: ELO → BT transition](https://lmsys.org/blog/2023-12-07-leaderboard/) — Rationale for preferring BT over ELO
- [Arena-Rank](https://news.lmarena.ai/arena-rank/) — Open-source ranking package with reweighting, closed-form CIs, 30x speedup
- [BT Optimization Blog](https://cthorrez.github.io/blog/posts/fast_llm_ratings/) — 19min → 8s speedup techniques: vectorization, deduplication, multinomial bootstrapping
- [ELO vs BT Comparison](https://hippocampus-garden.com/elo_vs_bt/) — Stability analysis showing BT superiority
- [Gaming the Arena](https://arxiv.org/abs/2512.15252) — Research on vote manipulation vulnerabilities
- [K-Sort Arena](https://arxiv.org/abs/2408.14468) — K-wise comparison for more efficient convergence
