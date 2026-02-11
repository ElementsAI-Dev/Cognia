# Code Audit Report: `components/a2ui`

**Date**: 2026-02-11
**Scope**: `d:\Project\Cognia\components\a2ui\` (69 files, 7 subdirectories)
**Auditor**: Cascade AI

---

## Executive Summary

The `components/a2ui` module is a well-structured UI component system with good test coverage, proper memoization, and smart code-splitting. Key areas for improvement are: **deprecated context hook usage across ~30 leaf components** causing unnecessary re-renders, **duplicate code patterns** (category constants, delete dialogs, icon resolution), **hardcoded English strings** in academic components bypassing i18n, and a **`console.error`** in the error boundary violating project logging conventions.

**Total issues**: 16
- HIGH: 3
- MEDIUM: 8
- LOW: 5

**Estimated total effort**: ~12–18 hours

---

## Phase 1: File Inventory

| Category | Count | Files |
|----------|-------|-------|
| Source components (.tsx) | 38 | Core renderers, layout, display, form, data, academic, app-builder |
| Test files (.test.tsx) | 27 | Co-located tests for nearly every component |
| Barrel exports (index.ts) | 6 | Root + layout, display, form, data, academic, quick-app-builder |
| Subdirectories | 7 | academic, data, display, form, layout, quick-app-builder |

**Largest files** (>300 lines):
- `app-detail-dialog.tsx` — 531 lines
- `app-gallery.tsx` — 497 lines
- `quick-app-builder.tsx` — 486 lines
- `app-card.tsx` — 362 lines
- `a2ui-interactive-guide.tsx` — 352 lines
- `a2ui-table.tsx` — 325 lines
- `a2ui-chart.tsx` — 317 lines

---

## Phase 4: Optimization Plan

### [Priority: HIGH] PERF-1: Deprecated `useA2UIContext()` Used in ~30 Leaf Components

**Location**: All files in `display/`, `form/`, `data/`, `layout/` that import from `../a2ui-context`

**Current Problem**:
The `a2ui-context.tsx` file defines a split-context architecture (`A2UIActionsCtx` + `A2UIDataCtx`) with `useA2UIActions()` and `useA2UIData()` for targeted subscriptions. However, **every leaf component** (A2UIText, A2UIButton, A2UICheckbox, A2UITable, etc.) calls the deprecated `useA2UIContext()` which merges both contexts via `useMemo()`, causing **all components to re-render on any context change** — whether data or actions.

The doc comment at line 211 explicitly says:
```
@deprecated Prefer useA2UIActions() + useA2UIData() for better performance.
```

**Suggested Fix**:
Replace `useA2UIContext()` calls with targeted hooks:
- Components that only read data (Text, Badge, Progress, Image): use `useA2UIData()`
- Components that only need actions (Button): use `useA2UIActions()`
- Components that need both (TextField, Select, Table): use both separately

**Expected Benefit**:
- Performance: Significant reduction in unnecessary re-renders for data-heavy surfaces
- Maintainability: Aligns implementation with the documented architecture

**Effort Estimate**: Medium (2–4hr) — mechanical refactor across ~30 files

---

### [Priority: HIGH] PERF-2: `A2UIAnimation` Calls `useA2UIContext()` Without Using Return Value

**Location**: `@components/a2ui/display/a2ui-animation.tsx:193`

**Current Problem**:
```typescript
useA2UIContext(); // Called but return value discarded
```
This subscribes the Animation component to **all** context changes for no reason. Every data model update triggers a re-render of every animation on the surface.

**Suggested Fix**:
Remove the unused `useA2UIContext()` call entirely. The component doesn't use any context values — it only uses props (`component`, `renderChild`).

**Expected Benefit**:
- Performance: Eliminates unnecessary re-renders of animation components
- Correctness: Removes misleading dependency

**Effort Estimate**: Small (<15min)

---

### [Priority: HIGH] i18n-1: Hardcoded English Strings in Academic Components

**Location**: 
- `@components/a2ui/academic/academic-analysis-panel.tsx` — "AI Paper Analysis", "Regenerate", "Suggested Questions", "Related Topics", "Copy Analysis", "Ask Follow-up", "Analyzing paper..."
- `@components/a2ui/academic/academic-search-results.tsx` — "All Sources", "Sort by", "Open Access", "Searching papers...", "No papers found", "Load More Results"
- `@components/a2ui/academic/academic-paper-card.tsx` — "Details", "Add", "PDF", "Analyze", "Open Access"
- `@components/a2ui/display/a2ui-interactive-guide.tsx:236` — "No steps defined"
- `@components/a2ui/a2ui-surface.tsx` — "Loading...", "Error loading surface", "No content to display", "Rendering..."
- `@components/a2ui/a2ui-error-boundary.tsx` — "render error", "Retry"
- `@components/a2ui/data/a2ui-table.tsx` — "No data available", "Previous", "Next", "Page X of Y", "Showing X to Y"
- `@components/a2ui/quick-app-builder/template-card.tsx:69` — "Create"
- `@components/a2ui/quick-app-builder/app-card.tsx:80` — "Custom App"
- `@components/a2ui/app-card.tsx:276` — "Custom App"

**Current Problem**:
Numerous components contain hardcoded English strings instead of using `useTranslations()`. This breaks i18n and is inconsistent with the rest of the module (e.g., `app-gallery.tsx`, `quick-app-builder.tsx` properly use `t()`).

**Suggested Fix**:
Add i18n keys to `lib/i18n/messages/en/a2ui.json` and `zh-CN/a2ui.json`, and replace hardcoded strings with `t()` calls.

**Expected Benefit**:
- Correctness: Enables Chinese localization for academic and core components
- Consistency: All components follow the same i18n pattern

**Effort Estimate**: Medium (2–3hr)

---

### [Priority: MEDIUM] CODE-1: Duplicate `CATEGORY_KEYS` / `CATEGORY_I18N_MAP` Constants

**Location**:
- `@components/a2ui/app-detail-dialog.tsx:66-73`
- `@hooks/a2ui/use-app-gallery-filter.ts` (imported by `app-gallery.tsx`)

**Current Problem**:
`CATEGORY_KEYS` and `CATEGORY_I18N_MAP` are defined in both `app-detail-dialog.tsx` and `use-app-gallery-filter`. If a category is added/removed, two locations must be updated.

**Suggested Fix**:
Import `CATEGORY_KEYS` and `CATEGORY_I18N_MAP` from the hook module (or extract to a shared constants file like `lib/a2ui/constants.ts`).

**Expected Benefit**:
- Maintainability: Single source of truth for categories
- Reliability: Prevents drift between gallery and detail dialog

**Effort Estimate**: Small (<30min)

---

### [Priority: MEDIUM] CODE-2: Duplicate Delete Confirmation Dialog Pattern

**Location**:
- `@components/a2ui/quick-app-builder.tsx:462-480`
- `@components/a2ui/app-gallery.tsx:424-447`

**Current Problem**:
Both components implement identical delete confirmation dialogs with the same state management pattern (`deleteConfirmId` state, Dialog component, cancel/confirm buttons). This is ~20 lines of duplicated JSX + state.

**Suggested Fix**:
Extract a `DeleteConfirmDialog` component:
```tsx
interface DeleteConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}
```

**Expected Benefit**:
- Maintainability: Single implementation for delete confirmation
- Consistency: Uniform UX across all deletion flows

**Effort Estimate**: Small (<1hr)

---

### [Priority: MEDIUM] CODE-3: Duplicate Icon Resolution Pattern

**Location**:
- `@components/a2ui/app-card.tsx:88` — `icons[template.icon as keyof typeof icons]`
- `@components/a2ui/quick-app-builder/app-card.tsx:47` — same pattern
- `@components/a2ui/quick-app-builder/template-card.tsx:19` — same pattern
- `@components/a2ui/quick-app-builder/flash-app-tab.tsx:105` — same pattern
- `@components/a2ui/quick-app-builder.tsx:316,340` — same pattern

**Current Problem**:
The `icons[x as keyof typeof icons]` pattern is repeated 6+ times. No validation on icon name — if `template.icon` is invalid, `IconComponent` is silently `undefined`.

**Suggested Fix**:
Extract a utility:
```typescript
function resolveIcon(iconName?: string): LucideIcon | null {
  if (!iconName) return null;
  return icons[iconName as keyof typeof icons] ?? null;
}
```

**Expected Benefit**:
- Maintainability: Single resolution point
- Reliability: Clear fallback behavior

**Effort Estimate**: Small (<30min)

---

### [Priority: MEDIUM] CODE-4: `console.error` in Error Boundary Instead of `loggers`

**Location**: `@components/a2ui/a2ui-error-boundary.tsx:34`

**Current Problem**:
```typescript
console.error(`A2UI Component Error [${this.props.componentType}#${this.props.componentId}]:`, error, errorInfo);
```
Project convention (per AGENTS.md) requires using `loggers.ui.error()` from `@/lib/logger`. All other files in this module correctly use `loggers`.

**Suggested Fix**:
Replace with `loggers.ui.error(...)`. Since this is a class component, import loggers at module level.

**Expected Benefit**:
- Consistency: Follows project logging conventions
- Observability: Errors routed through unified logging pipeline

**Effort Estimate**: Small (<15min)

---

### [Priority: MEDIUM] CODE-5: Redundant Default Exports Alongside Named Exports

**Location**: 9 files have both `export function X` and `export default X`:
- `app-card.tsx`, `app-detail-dialog.tsx`, `app-gallery.tsx`, `quick-app-builder.tsx`
- `academic-analysis-panel.tsx`, `academic-paper-card.tsx`, `academic-search-results.tsx`
- `a2ui-animation.tsx`, `a2ui-interactive-guide.tsx`

**Current Problem**:
The barrel `index.ts` only uses named exports. The default exports are never imported anywhere (verified by grep). Having both creates ambiguity about which import style to use.

**Suggested Fix**:
Remove `export default` from these files. The project convention (per AGENTS.md) is named exports.

**Expected Benefit**:
- Consistency: Single export style
- Bundle size: Tree-shaking works better with named exports

**Effort Estimate**: Small (<30min)

---

### [Priority: MEDIUM] PERF-3: `app-gallery.tsx` Renders `A2UIInlineSurface` Twice for Mobile/Desktop

**Location**: `@components/a2ui/app-gallery.tsx:349-421`

**Current Problem**:
The preview panel is rendered twice — once in a `hidden sm:flex` container (desktop) and once in a `sm:hidden` container (mobile). Both `A2UIInlineSurface` instances mount simultaneously, creating **two active surface subscriptions** and doubling rendering cost.

**Suggested Fix**:
Use a single `A2UIInlineSurface` instance and move it to the appropriate container via CSS or a responsive layout wrapper. Alternatively, conditionally render based on a `useMediaQuery` hook.

**Expected Benefit**:
- Performance: Only one surface instance mounted at a time
- Memory: Halves the subscription/state overhead

**Effort Estimate**: Medium (1–2hr)

---

### [Priority: MEDIUM] CODE-6: `A2UIChart` — Large `renderChart` Function (230+ lines)

**Location**: `@components/a2ui/data/a2ui-chart.tsx:70-300`

**Current Problem**:
The `renderChart` function is a 230-line switch statement with 7 cases (line, bar, pie, area, scatter, radar, donut). Each case shares identical Tooltip styling (repeated 7 times) and similar axis configuration.

**Suggested Fix**:
1. Extract shared `tooltipStyle` constant
2. Extract axis rendering helpers (`renderCartesianAxes`, `renderPolarAxes`)
3. Consider extracting each chart type into its own sub-component

**Expected Benefit**:
- Maintainability: Easier to modify shared styling
- Readability: Each chart type is self-contained

**Effort Estimate**: Medium (1–2hr)

---

### [Priority: MEDIUM] CODE-7: Academic Components Not Exported from Root `index.ts`

**Location**: `@components/a2ui/index.ts`

**Current Problem**:
The `academic/` subdirectory has its own `index.ts` barrel but is **not re-exported** from the root `components/a2ui/index.ts`. Consumers must know about the subdirectory structure to import academic components.

**Suggested Fix**:
Add to root `index.ts`:
```typescript
export { AcademicPaperCard, AcademicSearchResults, AcademicAnalysisPanel } from './academic';
```

**Expected Benefit**:
- Discoverability: All A2UI components importable from `@/components/a2ui`
- Consistency: Matches pattern of layout, display, form, data re-exports

**Effort Estimate**: Small (<15min)

---

### [Priority: LOW] STYLE-1: `display/index.ts` Missing Animation and InteractiveGuide Exports

**Location**: `@components/a2ui/display/index.ts`

**Current Problem**:
`A2UIAnimation` and `A2UIInteractiveGuide` are not exported from `display/index.ts`. The renderer imports them directly via lazy-loading, but they're invisible from the barrel.

**Suggested Fix**:
Add exports (consumers won't tree-shake issues since they're lazy-loaded in the renderer):
```typescript
export { A2UIAnimation } from './a2ui-animation';
export { A2UIInteractiveGuide } from './a2ui-interactive-guide';
```

**Expected Benefit**:
- Discoverability: Components visible in barrel exports

**Effort Estimate**: Small (<15min)

---

### [Priority: LOW] STYLE-2: Inconsistent `Quick Apps` Title — Not i18n'd

**Location**: `@components/a2ui/quick-app-builder.tsx:213`

**Current Problem**:
```tsx
<h2 className="font-semibold text-sm sm:text-base">Quick Apps</h2>
```
Hardcoded English while the rest of the same file uses `t()`.

**Suggested Fix**:
Replace with `t('quickApps')` or similar i18n key.

**Expected Benefit**:
- Consistency: Matches surrounding code

**Effort Estimate**: Small (<15min)

---

### [Priority: LOW] STYLE-3: Tooltip Content Hardcoded as "Grid" / "List"

**Location**: `@components/a2ui/app-gallery.tsx:264,277`

**Current Problem**:
```tsx
<TooltipContent>Grid</TooltipContent>
<TooltipContent>List</TooltipContent>
```

**Suggested Fix**:
Use `t('viewGrid')` / `t('viewList')`.

**Effort Estimate**: Small (<15min)

---

### [Priority: LOW] STYLE-4: `data/a2ui-table.tsx` Has Inline Locale Fallbacks

**Location**: `@components/a2ui/data/a2ui-table.tsx:240,288-309`

**Current Problem**:
The table uses a `locale` prop with inline fallbacks (`'No data available'`, `'Previous'`, `'Next'`, `'Page X of Y'`). This duplicates what should come from i18n.

**Suggested Fix**:
Use `useTranslations()` as the default when `component.locale` is not provided.

**Effort Estimate**: Small (<30min)

---

### [Priority: LOW] TEST-1: `quick-app-builder/index.ts` Exports `AppCard` — Name Collision

**Location**: `@components/a2ui/quick-app-builder/index.ts:2`

**Current Problem**:
Exports `AppCard` from `./app-card` but the component is actually named `QuickAppCard`. The root `index.ts` also exports `AppCard` from `./app-card.tsx`. While there's no direct conflict because they're in different modules, the naming is confusing.

**Suggested Fix**:
Rename the export in `quick-app-builder/index.ts` to `QuickAppCard` for clarity, or remove the misleading re-export.

**Effort Estimate**: Small (<15min)

---

## Phase 5: Summary Report

### Statistics
| Metric | Value |
|--------|-------|
| Total files | 69 |
| Source files | 38 |
| Test files | 27 |
| Barrel files | 6 |
| Total issues | 16 |
| HIGH priority | 3 |
| MEDIUM priority | 8 |
| LOW priority | 5 |

### Recommended Action Order
1. **PERF-2** — Remove unused `useA2UIContext()` in Animation (5min, immediate win)
2. **CODE-4** — Replace `console.error` with `loggers` in error boundary (5min)
3. **CODE-1** — Deduplicate `CATEGORY_KEYS`/`CATEGORY_I18N_MAP` (30min)
4. **CODE-5** — Remove redundant default exports (30min)
5. **CODE-7** — Add academic exports to root index.ts (15min)
6. **CODE-3** — Extract icon resolution utility (30min)
7. **PERF-1** — Migrate leaf components from `useA2UIContext()` to split hooks (2-4hr)
8. **i18n-1** — Add i18n for hardcoded strings (2-3hr)
9. **CODE-2** — Extract shared delete confirmation dialog (1hr)
10. **PERF-3** — Fix double `A2UIInlineSurface` mount in gallery (1-2hr)
11. **CODE-6** — Refactor chart component (1-2hr)
12. Remaining LOW items (STYLE-1 through TEST-1) — (1hr total)

### Quick Wins (High Impact, Low Effort)
- **PERF-2**: 5 minutes, eliminates wasted re-renders on all animations
- **CODE-4**: 5 minutes, fixes logging convention violation
- **CODE-1**: 30 minutes, removes constant duplication
- **CODE-7**: 15 minutes, improves module discoverability

### Strengths Noted
- ✅ Excellent test coverage (27/38 source files have co-located tests)
- ✅ Smart code-splitting with `React.lazy` for Chart, Animation, InteractiveGuide
- ✅ Proper `memo()` on all leaf components
- ✅ Well-designed split-context architecture (just underutilized)
- ✅ No `any` types, `@ts-ignore`, or `@ts-expect-error` anywhere
- ✅ No empty catch blocks
- ✅ Consistent use of `loggers` (except error boundary)
- ✅ Good accessibility (aria labels, keyboard handling in dialog surface)
- ✅ Clean barrel exports with proper re-exports
