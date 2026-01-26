# Selection Toolbar Enhancement - Implementation Tasks

## Phase 1: Type Definitions

### Task 1.1: Update selection-toolbar.ts types
- [ ] Add `ToolbarMode` type ('full' | 'compact')
- [ ] Add `ActionGroup` type
- [ ] Add `ActionGroupConfig` interface
- [ ] Add `CustomActionConfig` interface  
- [ ] Add `ToolbarPreset` interface
- [ ] Update `SelectionConfig` with new fields
- [ ] Update `DEFAULT_SELECTION_CONFIG`

**Files**: `types/system/selection-toolbar.ts`

## Phase 2: Store Updates

### Task 2.1: Update selection-store.ts
- [ ] Add new state fields for toolbar mode
- [ ] Add `setToolbarMode` action
- [ ] Add `toggleToolbarMode` action
- [ ] Add `updateQuickActions` action
- [ ] Add `updateCustomActions` action
- [ ] Add `toggleActionGroup` action
- [ ] Update persist partialize for new fields
- [ ] Add selectors for new state

**Files**: `stores/context/selection-store.ts`

## Phase 3: Component Updates

### Task 3.1: Update toolbar.tsx - Layout Improvements
- [ ] Extract action groups into logical sections
- [ ] Add collapsible group headers
- [ ] Add horizontal scroll container
- [ ] Improve visual hierarchy with better spacing
- [ ] Add subtle group dividers

**Files**: `components/selection-toolbar/toolbar.tsx`

### Task 3.2: Update toolbar.tsx - Compact Mode
- [ ] Add mode state from store
- [ ] Add mode toggle button
- [ ] Implement conditional rendering for compact/full mode
- [ ] Add smooth transition animations
- [ ] Add keyboard shortcut (Shift+C) for mode toggle

**Files**: `components/selection-toolbar/toolbar.tsx`

### Task 3.3: Update settings-panel.tsx
- [ ] Add compact mode toggle switch
- [ ] Add quick actions customization section
- [ ] Add action group expansion toggles
- [ ] Add preset management (save/load/delete)

**Files**: `components/selection-toolbar/settings-panel.tsx`

## Phase 4: i18n Updates

### Task 4.1: Add translations
- [ ] Add compact mode labels
- [ ] Add settings panel labels
- [ ] Add preset management labels
- [ ] Add action group labels

**Files**: Translation files (if applicable)

## Phase 5: Testing

### Task 5.1: Update unit tests
- [ ] Test new store actions
- [ ] Test mode switching
- [ ] Test preset save/load

**Files**: `stores/context/selection-store.test.ts`, `components/selection-toolbar/toolbar.test.tsx`

## Execution Order

1. Task 1.1 (Types) - Foundation
2. Task 2.1 (Store) - State management
3. Task 3.1 (Layout) - Visual improvements
4. Task 3.2 (Compact Mode) - Core feature
5. Task 3.3 (Settings) - Configuration UI
6. Task 4.1 (i18n) - Localization
7. Task 5.1 (Tests) - Verification
