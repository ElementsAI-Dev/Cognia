# Selection Toolbar Enhancement Specification

## Overview

Enhance the existing selection toolbar component to provide better layout organization, compact mode support, and custom functionality configuration. This enhancement focuses on improving user experience while maintaining backward compatibility.

## Goals

1. **Better Layout Organization** - Reorganize toolbar buttons into logical groups with improved visual hierarchy
2. **Compact Mode Support** - Add a simplified/compact mode that shows only essential actions
3. **Custom Actions** - Allow users to configure which actions appear and their order
4. **Improved UX** - Better responsiveness, accessibility, and visual feedback

## Current State Analysis

### Existing Components
- `components/selection-toolbar/toolbar.tsx` - Main toolbar (1374 lines)
- `components/selection-toolbar/toolbar-button.tsx` - Reusable button component
- `components/selection-toolbar/settings-panel.tsx` - Configuration panel
- `hooks/ui/use-selection-toolbar.ts` - Toolbar logic hook
- `stores/context/selection-store.ts` - Zustand store with persist
- `types/system/selection-toolbar.ts` - Type definitions

### Current Features
- 17 selection actions (explain, translate, summarize, etc.)
- Multi-selection support
- Reference resources
- Translation memory
- Keyboard shortcuts
- TTS read aloud
- History panel
- OCR panel
- Templates panel
- Clipboard panel

## Requirements

### Functional Requirements

#### FR-1: Compact Mode
- Toggle between full mode and compact mode
- Compact mode shows only: translate, explain, copy, send-to-chat
- Persist user preference in localStorage
- Keyboard shortcut to toggle (Shift+C)
- Visual indicator showing current mode

#### FR-2: Improved Layout
- Group actions into collapsible sections:
  - **Primary Actions**: translate, explain, summarize, copy
  - **Writing Tools**: rewrite, grammar, expand, shorten, tone-formal, tone-casual
  - **Code Tools**: code-explain, code-optimize
  - **Utilities**: search, send-to-chat, define, extract, knowledge-map
- Add subtle dividers between groups
- Support horizontal scrolling when space is limited

#### FR-3: Custom Actions Configuration
- Allow users to:
  - Reorder pinned actions via drag-and-drop
  - Choose which actions appear in compact mode
  - Define custom keyboard shortcuts
  - Create action presets (e.g., "Developer", "Writer", "Translator")
- Persist configuration in store

#### FR-4: Quick Action Slots
- 4 configurable quick action slots visible in both modes
- Default: translate, explain, summarize, copy
- Users can customize via settings

### Non-Functional Requirements

#### NFR-1: Performance
- Toolbar should render in < 50ms
- Mode switching should be instant (< 100ms)
- No layout shift during transitions

#### NFR-2: Accessibility
- Full keyboard navigation support
- ARIA labels on all buttons
- Focus management when panels open/close
- Screen reader announcements for mode changes

#### NFR-3: Responsiveness
- Adapt layout for different window sizes
- Support minimum width of 280px
- Maximum width constraint to prevent excessive stretching

## Technical Design

### Type Changes

```typescript
// types/system/selection-toolbar.ts

export type ToolbarMode = 'full' | 'compact';

export type ActionGroup = 'primary' | 'writing' | 'code' | 'utility';

export interface ActionGroupConfig {
  id: ActionGroup;
  expanded: boolean;
  order: number;
}

export interface CustomActionConfig {
  action: SelectionAction;
  enabled: boolean;
  order: number;
  group: ActionGroup;
  customShortcut?: string;
}

export interface ToolbarPreset {
  id: string;
  name: string;
  mode: ToolbarMode;
  quickActions: SelectionAction[];
  customActions: CustomActionConfig[];
  groups: ActionGroupConfig[];
}

// Update SelectionConfig
export interface SelectionConfig {
  // ... existing fields
  
  // New fields
  toolbarMode: ToolbarMode;
  quickActions: SelectionAction[];
  customActions: CustomActionConfig[];
  actionGroups: ActionGroupConfig[];
  activePreset: string | null;
  presets: ToolbarPreset[];
}
```

### Store Changes

```typescript
// stores/context/selection-store.ts

export interface SelectionActions {
  // ... existing actions
  
  // New actions
  setToolbarMode: (mode: ToolbarMode) => void;
  toggleToolbarMode: () => void;
  updateQuickActions: (actions: SelectionAction[]) => void;
  updateCustomActions: (actions: CustomActionConfig[]) => void;
  toggleActionGroup: (groupId: ActionGroup) => void;
  savePreset: (preset: Omit<ToolbarPreset, 'id'>) => void;
  loadPreset: (presetId: string) => void;
  deletePreset: (presetId: string) => void;
}
```

### Component Changes

#### toolbar.tsx Modifications
1. Add `toolbarMode` prop and state
2. Implement conditional rendering based on mode
3. Add mode toggle button
4. Reorganize action groups with collapsible sections
5. Add horizontal scroll container for overflow

#### settings-panel.tsx Modifications
1. Add compact mode toggle switch
2. Add quick actions customization section
3. Add preset management UI
4. Add action reordering via drag-and-drop

### Default Configuration

```typescript
export const DEFAULT_SELECTION_CONFIG: SelectionConfig = {
  // ... existing defaults
  
  toolbarMode: 'full',
  quickActions: ['translate', 'explain', 'summarize', 'copy'],
  customActions: ALL_ACTIONS.map((a, i) => ({
    action: a.action,
    enabled: true,
    order: i,
    group: a.category === 'ai' ? 'primary' : 
           a.category === 'edit' ? 'writing' :
           a.category === 'code' ? 'code' : 'utility',
  })),
  actionGroups: [
    { id: 'primary', expanded: true, order: 0 },
    { id: 'writing', expanded: false, order: 1 },
    { id: 'code', expanded: false, order: 2 },
    { id: 'utility', expanded: false, order: 3 },
  ],
  activePreset: null,
  presets: [],
};
```

## UI/UX Design

### Compact Mode Layout
```
┌─────────────────────────────────────────────────────────┐
│ ≡ │ 🔄 🔍 📋 💬 │ 🔊 │ ⚙ │ ✕ │
└─────────────────────────────────────────────────────────┘
     Quick Actions   TTS  Settings Close
```

### Full Mode Layout
```
┌─────────────────────────────────────────────────────────────────────────┐
│ ≡ │ Mode │ 🔄 🔍 📝 📋 │ 📚 │ 🔊 │ Layers │ Link │ ⋯ │ 📑 📋 📷 ⏱ ❓ ⛶ │ ✕ │
└─────────────────────────────────────────────────────────────────────────┘
  Drag Mode  Primary    Trans TTS  Multi  Ref  More  Templates/Clip/OCR  Close
```

### Mode Toggle Animation
- Smooth width transition (200ms ease-out)
- Fade in/out for appearing/disappearing elements
- Scale animation for mode toggle button

## Migration Strategy

1. Add new fields to `SelectionConfig` with defaults
2. Update store with backward-compatible merge
3. Existing configurations will auto-migrate with defaults
4. No breaking changes to existing API

## Testing Strategy

1. Unit tests for new store actions
2. Component tests for mode switching
3. E2E tests for preset save/load
4. Accessibility audit for keyboard navigation
5. Performance benchmarks for render times

## Success Metrics

- Toolbar render time < 50ms
- Mode switch time < 100ms
- User can customize toolbar in < 30 seconds
- No regression in existing functionality
