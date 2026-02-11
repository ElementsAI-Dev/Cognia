# Skills Module Optimization Plan

> Generated: 2025-02-12
> Updated: 2025-02-12
> Scope: `components/skills/`, `stores/skills/`, `hooks/skills/`, `lib/skills/`, `types/system/skill.ts`
> Status: **18/18 items completed** ✅

---

## Module Overview

### File Inventory (28 files)

| Layer | Files | Total Lines |
|-------|-------|-------------|
| Components | 18 + 1 sub-dir (`skill-generator/`) | ~7,500 |
| Store | `stores/skills/skill-store.ts` | 788 |
| Hooks | `hooks/skills/use-skills.ts` + 3 others | ~600 |
| Lib | 9 files in `lib/skills/` | ~3,500 |
| Types | `types/system/skill.ts` + `types/skill/skill-marketplace.ts` | ~500 |
| **Total** | **~32 files** | **~12,900** |

### Usage Points (4 consumers)

| Consumer | Components Used |
|----------|----------------|
| `app/(main)/skills/page.tsx` | `SkillPanel` |
| `components/settings/tools/skill-settings.tsx` | `SkillDetail`, `SkillDiscovery`, `SkillMarketplace` |
| `components/chat/core/chat-container.tsx` | `SkillSuggestions` |
| `components/chat/core/chat-header.tsx` | `ActiveSkillsIndicator` |

---

## Issues Identified

### 🔴 CRITICAL (Bugs / Data Loss)

#### C-1: `activeSkillIds` Not Persisted
- **File**: `stores/skills/skill-store.ts:769-772`
- **Issue**: `partialize` only saves `skills` and `usageStats`. When the app reloads, all active skill selections are lost.
- **Fix**: Add `activeSkillIds` to the `partialize` return object.
- **Impact**: User loses active skill context on every page reload.
- **Effort**: 1 line change.

#### C-2: Empty Catch Block Swallows Import Errors
- **File**: `components/skills/skill-panel.tsx:311`
- **Issue**: `catch { // Handle parse error }` — import failures are silently swallowed with zero user feedback.
- **Fix**: Add `toast.error()` with parse error details.
- **Impact**: Users paste invalid JSON and get no feedback.
- **Effort**: 3 lines.

#### C-3: React Anti-Pattern — State Update During Render
- **File**: `components/skills/skill-suggestions.tsx:94-99`
- **Issue**: `setLastQueryPrefix()` and `setIsDismissed()` are called directly during render (outside useEffect). This violates React's render purity contract and can cause infinite re-renders in strict mode.
- **Fix**: Move to `useEffect` with proper dependencies.
- **Impact**: Potential infinite render loops.
- **Effort**: ~10 lines refactor.

---

### 🟠 HIGH Priority (Quality / Maintainability)

#### H-1: Duplicated Category Constants Across 5+ Files
- **Files affected**:
  - `CATEGORY_ICONS` → `skill-card.tsx`, `skill-detail.tsx`, `skill-suggestions.tsx`
  - `CATEGORY_OPTIONS` (with icons + labels) → `skill-panel.tsx`, `skill-wizard.tsx`
  - `CATEGORY_COLORS` → `skill-card.tsx`
  - `CATEGORY_LABEL_KEYS` → `skill-detail.tsx`, `skill-selector.tsx`
- **Fix**: Extract to `components/skills/skill-constants.ts` (or `lib/skills/constants.ts`).
- **Effort**: Create 1 file, update 6 files.

#### H-2: Monolithic `skill-editor.tsx` (1,236 lines)
- **Issue**: Single file contains Monaco editor setup, AI command palette popup, markdown toolbar, text insertion logic, resource management panel, and preview panel.
- **Fix**: Extract into:
  - `skill-editor-toolbar.tsx` — formatting buttons + structure dropdown
  - `skill-editor-ai-popup.tsx` — AI optimization popup
  - Keep `skill-editor.tsx` as orchestrator (~400 lines)
- **Effort**: Medium (~2 hours).

#### H-3: Monolithic `skill-panel.tsx` (991 lines)
- **Issue**: Single file contains filtering logic, grid/list views, 4 dialog modals (delete, generator, import, view/edit), and analytics integration.
- **Fix**: Extract dialogs into:
  - `skill-import-dialog.tsx`
  - `skill-delete-dialog.tsx`
  - Keep `skill-panel.tsx` as page layout (~500 lines)
- **Effort**: Medium (~1.5 hours).

#### H-4: Dead Exported Components — `SkillTestPanel`, `SkillWizard`
- **Files**: `components/skills/skill-test-panel.tsx`, `components/skills/skill-wizard.tsx`
- **Issue**: Exported from `index.ts` but never imported by any page or component. Only referenced in their own test files.
- **Options**:
  - A) Integrate `SkillWizard` into skill-panel's "Create" flow (replace current inline creation).
  - B) Integrate `SkillTestPanel` into skill-detail's tabs.
  - C) Remove from `index.ts` exports if not planned for use.
- **Effort**: Option A/B: Medium. Option C: Trivial.

#### H-5: `console.warn` / `console.error` in Production Code
- **File**: `components/skills/skill-editor.tsx:417,423,430,612`
- **Issue**: 4 instances of `console.warn`/`console.error` should use the project's `loggers` utility.
- **Fix**: Replace with `loggers.ui.warn()` / `loggers.ui.error()`.
- **Effort**: 4 line changes.

---

### 🟡 MEDIUM Priority (Performance / UX)

#### M-1: No Search Debounce
- **Files**: `skill-panel.tsx`, `skill-selector.tsx`, `skill-marketplace.tsx`
- **Issue**: Search filters re-compute on every keystroke. With large skill sets this causes unnecessary re-renders.
- **Fix**: Use `useDeferredValue` (React 19) or `useDebouncedValue` for search inputs.
- **Effort**: ~5 lines per file.

#### M-2: No List Virtualization
- **File**: `skill-panel.tsx` grid/list rendering
- **Issue**: All skill cards render at once with Framer Motion `AnimatePresence`. With 100+ skills, this causes jank.
- **Fix**: Consider `react-window` or `@tanstack/react-virtual` for the skill list. Alternatively, add pagination (simpler).
- **Effort**: Medium (virtualization) or Low (pagination).

#### M-3: Empty Catch Blocks in Skill Generator
- **File**: `components/skills/skill-generator/skill-generator-panel.tsx:104,129`
- **Issue**: `catch { // Error handled by store }` — while the store may track errors, the user gets no immediate feedback at the component level.
- **Fix**: Add `toast.error()` fallback or verify store error state is displayed.
- **Effort**: Low.

#### M-4: `_compact` Prop Accepted But Unused
- **File**: `components/skills/skill-panel.tsx:139`
- **Issue**: `compact: _compact = false` is destructured from props but never used.
- **Fix**: Either implement compact mode or remove the prop from the interface.
- **Effort**: 1 line to remove, or medium to implement.

#### M-5: Import Dialog Uses Raw `<textarea>` Instead of Themed Component
- **File**: `components/skills/skill-panel.tsx:959`
- **Issue**: Uses native `<textarea>` instead of shadcn `Textarea` component, inconsistent with the rest of the UI.
- **Fix**: Replace with `<Textarea>` from `@/components/ui/textarea`.
- **Effort**: 1 line.

#### M-6: `_isSyncing` Destructured But Unused
- **File**: `components/skills/skill-discovery.tsx:276`
- **Issue**: `isSyncing: _isSyncing` destructured from hook but never referenced.
- **Fix**: Remove or use for UI loading indicator.
- **Effort**: 1 line.

---

### 🟢 LOW Priority (Polish / Best Practices)

#### L-1: Accessibility Gaps
- **Files**: `skill-panel.tsx`, `skill-card.tsx`, `skill-selector.tsx`
- **Issues**:
  - Filter buttons missing `aria-label` attributes
  - Badge close buttons lack accessible names
  - Grid/list toggle missing `role="radiogroup"` semantics
- **Fix**: Add ARIA attributes.
- **Effort**: Low, ~20 attribute additions.

#### L-2: Hardcoded i18n Fallback Strings in Marketplace
- **File**: `components/skills/skill-marketplace.tsx`
- **Issue**: Multiple `t('key') || 'Hardcoded fallback'` patterns (e.g., lines 171, 190, 299, 303, etc.). Should use i18n defaults instead.
- **Fix**: Ensure all keys exist in `skills.json` and remove `||` fallbacks.
- **Effort**: Low.

#### L-3: Duplicate `processSelectionWithAI` Pattern
- **Files**: `skill-panel.tsx`, `skill-detail.tsx`
- **Issue**: Both files implement nearly identical `onRequestAI` callback patterns for AI-assisted editing.
- **Fix**: Extract to shared hook `useSkillAI()`.
- **Effort**: Low.

#### L-4: Missing Loading Skeleton for Skill Detail View
- **File**: `components/skills/skill-detail.tsx`
- **Issue**: No skeleton/loading state when skill data is being fetched or validated.
- **Fix**: Add `Skeleton` components for the loading state.
- **Effort**: Low.

#### L-5: Test File Co-location
- **Files**: All `*.test.tsx` files in `components/skills/`
- **Status**: Tests are already co-located — good. No action needed, just noting compliance.

---

## Implementation Priority Order

| Phase | Items | Effort | Impact |
|-------|-------|--------|--------|
| **Phase 1: Critical Fixes** | C-1, C-2, C-3 | ~30 min | Fixes bugs + data loss |
| **Phase 2: Code Quality** | H-1, H-5, M-5, M-6, L-2 | ~1 hour | DRY, consistency |
| **Phase 3: Component Splitting** | H-2, H-3, L-3 | ~3 hours | Maintainability |
| **Phase 4: Dead Code** | H-4, M-4 | ~1 hour | Clean exports |
| **Phase 5: Performance** | M-1, M-2 | ~2 hours | Scalability |
| **Phase 6: UX Polish** | M-3, L-1, L-4 | ~1 hour | Accessibility + UX |

---

## Detailed Implementation Steps

### Phase 1: Critical Fixes (~30 min)

**Step 1.1 — C-1: Persist `activeSkillIds`**
```
File: stores/skills/skill-store.ts
Line: 769-772

Current:
  partialize: (state) => ({
    skills: state.skills,
    usageStats: state.usageStats,
  }),

Change to:
  partialize: (state) => ({
    skills: state.skills,
    usageStats: state.usageStats,
    activeSkillIds: state.activeSkillIds,
  }),
```

**Step 1.2 — C-2: Add Error Feedback to Import**
```
File: components/skills/skill-panel.tsx
Line: 311

Current:
  } catch {
    // Handle parse error
  }

Change to:
  } catch (err) {
    toast.error(t('importFailed'), err instanceof Error ? err.message : t('invalidJson'));
  }
```

**Step 1.3 — C-3: Fix Render-Phase State Update**
```
File: components/skills/skill-suggestions.tsx
Lines: 82-99

Remove the direct setState during render.
Replace with useEffect:

  useEffect(() => {
    if (queryPrefix !== lastQueryPrefix) {
      setLastQueryPrefix(queryPrefix);
      if (isDismissed) {
        setIsDismissed(false);
      }
    }
  }, [queryPrefix, lastQueryPrefix, isDismissed]);
```

### Phase 2: Code Quality (~1 hour)

**Step 2.1 — H-1: Extract Shared Category Constants**
Create `components/skills/skill-constants.ts` containing:
- `CATEGORY_ICONS` (JSX map)
- `CATEGORY_COLORS` (color map)
- `CATEGORY_OPTIONS` (options array with icons, labels, descriptions)
- Update 6 importing files.

**Step 2.2 — H-5: Replace console.* with loggers**
4 replacements in `skill-editor.tsx`.

**Step 2.3 — M-5: Replace raw textarea with Textarea**
1 replacement in `skill-panel.tsx:959`.

**Step 2.4 — M-6: Remove unused _isSyncing**
1 line in `skill-discovery.tsx:276`.

**Step 2.5 — L-2: Remove hardcoded i18n fallbacks**
Ensure all marketplace i18n keys exist, remove `|| 'fallback'` patterns.

### Phase 3: Component Splitting (~3 hours)

**Step 3.1 — H-2: Split skill-editor.tsx**
- Extract `SkillEditorToolbar` (~200 lines)
- Extract `SkillEditorAIPopup` (~150 lines)
- Keep `SkillEditor` as orchestrator (~800 lines → ~400 lines)

**Step 3.2 — H-3: Split skill-panel.tsx**
- Extract `SkillImportDialog` (~50 lines)
- Extract `SkillDeleteDialog` (~30 lines)
- Keep `SkillPanel` as page layout (~991 lines → ~600 lines)

**Step 3.3 — L-3: Extract useSkillAI hook**
- Shared `onRequestAI` pattern → `hooks/skills/use-skill-ai.ts`

### Phase 4: Dead Code (~1 hour)

**Step 4.1 — H-4: Integrate or Remove Dead Components**
- Option A (recommended): Wire `SkillWizard` into skill-panel create flow
- Option B: Wire `SkillTestPanel` into skill-detail tabs
- Remove from `index.ts` if not integrated

**Step 4.2 — M-4: Remove unused `compact` prop**
- Remove from `SkillPanelProps` interface and destructuring

### Phase 5: Performance (~2 hours)

**Step 5.1 — M-1: Add Search Debounce**
- Use `useDeferredValue` in skill-panel, skill-selector, skill-marketplace

**Step 5.2 — M-2: Add Pagination or Virtualization**
- Add simple pagination (20 items/page) to skill-panel grid view

### Phase 6: UX Polish (~1 hour)

**Step 6.1 — M-3: Add Toast Feedback to Generator Catch Blocks**
**Step 6.2 — L-1: Add ARIA Attributes**
**Step 6.3 — L-4: Add Loading Skeleton to Skill Detail**

---

## Constraints

- **No breaking changes** to existing barrel exports (`components/skills/index.ts`)
- **Backward compatible** — all existing consumers must continue working
- **No new dependencies** unless strictly necessary (prefer built-in React APIs)
- **Follow existing patterns**: `cn()` utility, `useTranslations()`, Zustand persist, co-located tests

## Expected Benefits

| Metric | Before | After |
|--------|--------|-------|
| Largest file | 1,236 lines | ~600 lines |
| Duplicated constants | 5+ files | 1 shared file |
| Persisted state | skills, usageStats | + activeSkillIds |
| Dead exports | 2 components | 0 |
| console.* calls | 4 | 0 (uses loggers) |
| Empty catch blocks | 3 | 0 |
| Search debounce | None | useDeferredValue |
