# Sidebar Customization System - Comprehensive Optimization Plan

**Date**: 2026-02-02  
**Status**: Deep Code Analysis Complete - Ready for Implementation  
**Feasibility**: ✅ All phases verified feasible

---

## 0. Feasibility Analysis Summary

| Phase | Feasibility | Evidence | Complexity |
|-------|-------------|----------|------------|
| Phase 1: Store | ✅ Verified | `preset-store.ts` shows exact pattern needed | Low |
| Phase 2: Widget DnD | ✅ Verified | `preset-quick-switcher.tsx` has working DnD | Low |
| Phase 3: Widget UI | ✅ Verified | `ai-settings-dialog.tsx` shows dialog pattern | Low |
| Phase 4: App Links | ✅ Verified | `app-sidebar.tsx:752-807` shows hardcoded links | Low |
| Phase 5: Search | ✅ Verified | `app-sidebar.tsx:208-256` confirms perf issue | High |
| Phase 6: Keyboard | ✅ Verified | `use-keyboard-shortcuts.ts` shows pattern | Medium |
| Phase 7: Session DnD | ✅ Verified | `session-store.ts` has folder/pin support | Medium |

---

## 1. Current Architecture Overview

### Core Components
| File | Purpose | Lines |
|------|---------|-------|
| `components/sidebar/app-sidebar.tsx` | Main sidebar component | ~1415 |
| `components/sidebar/sidebar-container.tsx` | Alternative sidebar wrapper | ~261 |
| `stores/system/ui-store.ts` | Basic UI state (open/close) | ~103 |
| `stores/settings/settings-store.ts` | Global settings including `sidebarWidth`, `sidebarCollapsed` | ~2792 |

### Sidebar Widgets (6 total)
1. **SidebarUsageStats** - Token usage statistics
2. **SidebarBackgroundTasks** - Background agent tasks
3. **SidebarQuickActions** - Quick action buttons
4. **SidebarRecentFiles** - Recent files list
5. **SidebarWorkflows** - Workflow shortcuts
6. **SidebarProjectSelector** - Project filtering

### Current Features
- Session grouping by time (Today, Yesterday, Last Week, Older)
- Session pinning
- Folder organization
- Project filtering
- Search functionality
- Collapsible groups
- Custom session icons (Lucide icons + custom images)
- Theme toggle
- Keyboard shortcuts dialog

---

## 2. Identified Issues & Gaps

### 🔴 Critical (High Priority)

#### 2.1 No Widget Customization
**Problem**: Widgets are hardcoded in fixed positions. Users cannot:
- Reorder widgets (drag & drop)
- Show/hide specific widgets
- Resize widgets
- Persist widget preferences

**Impact**: Poor user personalization, reduced productivity

#### 2.2 No Apps Section Customization
**Problem**: The "Apps" section in sidebar footer has 8 hardcoded links (Projects, Designer, Skills, Workflows, Native Tools, Git, LaTeX, Scheduler)
- Cannot reorder apps
- Cannot add/remove apps
- Cannot add custom shortcuts

**Impact**: Cluttered interface, irrelevant items for some users

#### 2.3 No Sidebar Sections Reordering
**Problem**: Main sections (Conversations, Widgets, Apps, Footer) have fixed order
- Users cannot prioritize what matters to them
- No option to move sections up/down

**Impact**: Suboptimal workflow for power users

### 🟡 Medium Priority

#### 2.4 Inconsistent State Management
**Problem**: 
- Collapsed groups stored in `localStorage` directly (`COLLAPSED_GROUPS_KEY`)
- Settings store manages `sidebarCollapsed` and `sidebarWidth`
- UI store manages `sidebarOpen`
- No unified sidebar customization store

**Impact**: Scattered logic, hard to maintain, potential sync issues

#### 2.5 Missing Keyboard Navigation
**Problem**: No keyboard shortcuts for:
- Moving between sessions (↑/↓)
- Opening session context menu
- Quick widget access
- Section navigation

**Impact**: Accessibility issues, reduced efficiency for keyboard users

#### 2.6 No Quick Actions Customization
**Problem**: `SidebarQuickActions` has 5 hardcoded actions
- Cannot add custom quick actions
- Cannot remove unwanted actions
- Cannot reorder actions

**Impact**: Limited personalization

#### 2.7 Performance Issues in Search
**Problem**: In `app-sidebar.tsx` lines 208-256:
- Search iterates through all sessions synchronously
- Loads all messages for content search
- No debounce optimization (only 300ms delay)
- No search result caching

**Impact**: Slow search for users with many sessions

### 🟢 Low Priority (Enhancements)

#### 2.8 No Session Drag-Drop Reordering
**Problem**: Sessions within groups cannot be manually reordered
- Only sorted by date or pinned status
- No drag-drop between folders

**Impact**: Limited organization options

#### 2.9 No Widget Minimization
**Problem**: Widgets can only be collapsed, not minimized to icon
- Takes up space even when collapsed
- No "dock" mode for widgets

**Impact**: Wasted screen real estate

#### 2.10 Missing Visual Customization
**Problem**:
- No custom sidebar colors beyond theme
- No sidebar opacity control (background visible through sidebar not customizable)
- No widget density options

**Impact**: Limited visual personalization

---

## 3. Optimization Plan

### Phase 1: Create Sidebar Customization Store (Foundation)

**Reference Pattern**: `stores/settings/preset-store.ts` (lines 42-284)

**New file**: `stores/sidebar/sidebar-customization-store.ts`

```typescript
/**
 * Based on preset-store.ts pattern with persist middleware
 * Key features: reorderPresets action, toggleFavorite, resetToDefaults
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { nanoid } from 'nanoid';

// Default widgets matching current sidebar structure
const DEFAULT_WIDGETS: SidebarWidget[] = [
  { id: 'usage-stats', name: 'Usage Stats', enabled: true, order: 0, collapsed: false },
  { id: 'background-tasks', name: 'Background Tasks', enabled: true, order: 1, collapsed: false },
  { id: 'quick-actions', name: 'Quick Actions', enabled: true, order: 2, collapsed: false },
  { id: 'recent-files', name: 'Recent Files', enabled: true, order: 3, collapsed: true },
  { id: 'workflows', name: 'Workflows', enabled: true, order: 4, collapsed: false },
  { id: 'project-selector', name: 'Project Selector', enabled: true, order: 5, collapsed: false },
];

// Default app links from app-sidebar.tsx lines 752-807
const DEFAULT_APP_LINKS: SidebarAppLink[] = [
  { id: 'projects', label: 'projects', href: '/projects', icon: 'FolderKanban', color: 'text-blue-500', enabled: true, order: 0, isCustom: false },
  { id: 'designer', label: 'designer', href: '/designer', icon: 'Wand2', color: 'text-purple-500', enabled: true, order: 1, isCustom: false },
  { id: 'skills', label: 'skills', href: '/skills', icon: 'Sparkles', color: 'text-amber-500', enabled: true, order: 2, isCustom: false },
  { id: 'workflows', label: 'workflows', href: '/workflows', icon: 'Workflow', color: 'text-green-500', enabled: true, order: 3, isCustom: false },
  { id: 'native-tools', label: 'nativeTools', href: '/native-tools', icon: 'Wrench', color: 'text-orange-500', enabled: true, order: 4, isCustom: false },
  { id: 'git', label: 'Git', href: '/git', icon: 'GitBranch', color: 'text-cyan-500', enabled: true, order: 5, isCustom: false },
  { id: 'latex', label: 'latex', href: '/latex', icon: 'FileCode', color: 'text-teal-500', enabled: true, order: 6, isCustom: false },
  { id: 'scheduler', label: 'scheduler', href: '/scheduler', icon: 'Calendar', color: 'text-rose-500', enabled: true, order: 7, isCustom: false },
];

interface SidebarWidget {
  id: string;
  name: string;
  enabled: boolean;
  order: number;
  collapsed: boolean;
}

interface SidebarAppLink {
  id: string;
  label: string;
  href: string;
  icon: string; // Lucide icon name
  color: string;
  enabled: boolean;
  order: number;
  isCustom: boolean;
}

interface SidebarCustomizationState {
  // Widget configuration
  widgets: SidebarWidget[];
  
  // Apps configuration
  appLinks: SidebarAppLink[];
  
  // Group collapse state (migrated from localStorage COLLAPSED_GROUPS_KEY)
  collapsedGroups: Record<string, boolean>;
  
  // Visual preferences
  showSessionCount: boolean;
  compactMode: boolean;
  
  // Actions - following preset-store.ts pattern
  setWidgetEnabled: (id: string, enabled: boolean) => void;
  reorderWidgets: (activeId: string, overId: string) => void;
  toggleWidgetCollapsed: (id: string) => void;
  
  addCustomAppLink: (link: Omit<SidebarAppLink, 'id' | 'order' | 'isCustom'>) => string;
  updateAppLink: (id: string, updates: Partial<SidebarAppLink>) => void;
  removeAppLink: (id: string) => void;
  reorderAppLinks: (activeId: string, overId: string) => void;
  setAppLinkEnabled: (id: string, enabled: boolean) => void;
  
  toggleGroupCollapsed: (group: string) => void;
  
  resetToDefaults: () => void;
}

export const useSidebarCustomizationStore = create<SidebarCustomizationState>()(
  persist(
    (set, get) => ({
      widgets: DEFAULT_WIDGETS,
      appLinks: DEFAULT_APP_LINKS,
      collapsedGroups: { system: true },
      showSessionCount: true,
      compactMode: false,

      // Reorder pattern from preset-store.ts lines 190-208
      reorderWidgets: (activeId, overId) => {
        set((state) => {
          const oldIndex = state.widgets.findIndex((w) => w.id === activeId);
          const newIndex = state.widgets.findIndex((w) => w.id === overId);
          if (oldIndex === -1 || newIndex === -1) return state;
          
          const newWidgets = [...state.widgets];
          const [removed] = newWidgets.splice(oldIndex, 1);
          newWidgets.splice(newIndex, 0, removed);
          
          return { widgets: newWidgets.map((w, i) => ({ ...w, order: i })) };
        });
      },
      
      // ... other actions following same pattern
    }),
    {
      name: 'cognia-sidebar-customization',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
```

**Migration Strategy**:
```typescript
// In app-sidebar.tsx, replace:
const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() => {
  const stored = window.localStorage.getItem(COLLAPSED_GROUPS_KEY);
  // ...
});

// With:
const collapsedGroups = useSidebarCustomizationStore((s) => s.collapsedGroups);
const toggleGroupCollapsed = useSidebarCustomizationStore((s) => s.toggleGroupCollapsed);
```

**Tasks**:

- [ ] Create store with persist middleware (copy preset-store.ts pattern)
- [ ] Define default widget configuration (6 widgets)
- [ ] Define default app links (8 links from lines 752-807)
- [ ] Migrate `COLLAPSED_GROUPS_KEY` logic to store
- [ ] Add export/import functionality
- [ ] Write unit tests

**Files to modify**:

- Create: `stores/sidebar/sidebar-customization-store.ts`
- Create: `stores/sidebar/sidebar-customization-store.test.ts`
- Create: `stores/sidebar/index.ts`
- Update: `stores/index.ts`
- Create: `types/sidebar/index.ts`

**Effort**: ~4 hours

---

### Phase 2: Implement Widget Drag-Drop Reordering

**Reference Pattern**: `components/presets/preset-quick-switcher.tsx` (lines 26-86, 454-479)

**Dependencies**: Phase 1. `@dnd-kit` already installed (core@6.3.1, sortable@10.0.0)

**Implementation** (copy pattern from preset-quick-switcher.tsx):

```typescript
// components/sidebar/sidebar-widget-container.tsx
// Pattern from preset-quick-switcher.tsx lines 66-86
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

export function SidebarWidgetContainer({ collapsed }: { collapsed: boolean }) {
  const widgets = useSidebarCustomizationStore((s) => s.widgets);
  const reorderWidgets = useSidebarCustomizationStore((s) => s.reorderWidgets);

  // Same sensor config as preset-quick-switcher.tsx lines 67-76
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Same handleDragEnd pattern as preset-quick-switcher.tsx lines 79-86
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      reorderWidgets(active.id as string, over.id as string);
      toast.success(t('widgetOrderUpdated'));
    }
  }, [reorderWidgets, t]);

  const enabledWidgets = widgets.filter(w => w.enabled);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={enabledWidgets.map(w => w.id)} strategy={verticalListSortingStrategy}>
        {enabledWidgets.map((widget) => (
          <SortableWidget key={widget.id} widget={widget} collapsed={collapsed} />
        ))}
      </SortableContext>
    </DndContext>
  );
}

// SortableWidget pattern from preset-quick-switcher.tsx lines 454-479
function SortableWidget({ widget, collapsed }: { widget: SidebarWidget; collapsed: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
    id: widget.id 
  });

  const style = { transform: CSS.Transform.toString(transform), transition };

  // Render appropriate widget component based on widget.id
  const WidgetComponent = WIDGET_COMPONENTS[widget.id];
  
  return (
    <div ref={setNodeRef} style={style} className={isDragging ? 'opacity-50' : ''}>
      <WidgetComponent 
        collapsed={collapsed}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

// Widget component mapping
const WIDGET_COMPONENTS: Record<string, React.ComponentType<WidgetProps>> = {
  'usage-stats': SidebarUsageStats,
  'background-tasks': SidebarBackgroundTasks,
  'quick-actions': SidebarQuickActions,
  'recent-files': SidebarRecentFiles,
  'workflows': SidebarWorkflows,
  'project-selector': SidebarProjectSelector,
};
```

**Tasks**:

- [ ] Create `SidebarWidgetContainer` (copy preset-quick-switcher.tsx pattern)
- [ ] Create `SortableWidget` wrapper (copy SortablePresetItem pattern)
- [ ] Update each widget to accept `dragHandleProps`
- [ ] Add `GripVertical` drag handle icon to each widget header
- [ ] Test keyboard accessibility (Tab, Space, Arrow keys)
- [ ] Write tests

**Files to modify**:

- Create: `components/sidebar/sidebar-widget-container.tsx`
- Update: `components/sidebar/app-sidebar.tsx` (replace direct widget rendering)
- Update: `components/sidebar/widgets/sidebar-usage-stats.tsx` (add dragHandleProps)
- Update: `components/sidebar/widgets/sidebar-background-tasks.tsx`
- Update: `components/sidebar/widgets/sidebar-quick-actions.tsx`
- Update: `components/sidebar/widgets/sidebar-recent-files.tsx`
- Update: `components/sidebar/widgets/sidebar-workflows.tsx`
- Update: `components/sidebar/widgets/sidebar-project-selector.tsx`

**Effort**: ~3 hours

---

### Phase 3: Widget Show/Hide Settings

**Reference Pattern**: `components/chat/dialogs/ai-settings-dialog.tsx` (dialog structure with sliders/toggles)

**Implementation**:

```typescript
// components/sidebar/sidebar-customization-dialog.tsx
// Pattern from ai-settings-dialog.tsx
'use client';

import { useTranslations } from 'next-intl';
import { Settings2, RotateCcw, GripVertical, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSidebarCustomizationStore } from '@/stores/sidebar';

interface SidebarCustomizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SidebarCustomizationDialog({ open, onOpenChange }: SidebarCustomizationDialogProps) {
  const t = useTranslations('sidebar');
  const widgets = useSidebarCustomizationStore((s) => s.widgets);
  const appLinks = useSidebarCustomizationStore((s) => s.appLinks);
  const setWidgetEnabled = useSidebarCustomizationStore((s) => s.setWidgetEnabled);
  const setAppLinkEnabled = useSidebarCustomizationStore((s) => s.setAppLinkEnabled);
  const resetToDefaults = useSidebarCustomizationStore((s) => s.resetToDefaults);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            <Settings2 className="h-5 w-5" />
            {t('customizeSidebar') || 'Customize Sidebar'}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="widgets" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="widgets">{t('widgets') || 'Widgets'}</TabsTrigger>
            <TabsTrigger value="apps">{t('apps') || 'Apps'}</TabsTrigger>
          </TabsList>

          <TabsContent value="widgets">
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-3 py-2">
                <p className="text-xs text-muted-foreground mb-3">
                  {t('widgetsDesc') || 'Toggle widgets on/off. Drag to reorder.'}
                </p>
                {widgets.map((widget) => (
                  <div key={widget.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground/50" />
                      <Label className="text-sm font-medium">{widget.name}</Label>
                    </div>
                    <Switch
                      checked={widget.enabled}
                      onCheckedChange={(enabled) => setWidgetEnabled(widget.id, enabled)}
                    />
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="apps">
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-3 py-2">
                <p className="text-xs text-muted-foreground mb-3">
                  {t('appsDesc') || 'Show/hide app shortcuts in sidebar.'}
                </p>
                {appLinks.map((link) => (
                  <div key={link.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50">
                    <div className="flex items-center gap-2">
                      <span className={link.color}>{/* Icon component */}</span>
                      <Label className="text-sm font-medium">{t(link.label) || link.label}</Label>
                      {link.isCustom && (
                        <span className="text-[10px] bg-muted px-1 rounded">Custom</span>
                      )}
                    </div>
                    <Switch
                      checked={link.enabled}
                      onCheckedChange={(enabled) => setAppLinkEnabled(link.id, enabled)}
                    />
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <Button variant="outline" size="sm" onClick={resetToDefaults} className="gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" />
            {t('resetDefaults') || 'Reset to Defaults'}
          </Button>
          <Button onClick={() => onOpenChange(false)}>
            {t('done') || 'Done'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

**Add trigger in sidebar footer** (app-sidebar.tsx line ~900):

```typescript
// Add to system menu section
<SidebarMenuItem>
  <SidebarMenuButton onClick={() => setCustomizeDialogOpen(true)} tooltip={t('customizeSidebar')}>
    <Settings2 className="h-4 w-4" />
    <span>{t('customize')}</span>
  </SidebarMenuButton>
</SidebarMenuItem>
```

**Tasks**:

- [ ] Create `SidebarCustomizationDialog` component (copy ai-settings-dialog.tsx structure)
- [ ] Add widget toggle UI with Switch components
- [ ] Add app link toggle UI
- [ ] Add "Reset to Defaults" button
- [ ] Add trigger button in sidebar footer
- [ ] Add i18n keys to translations
- [ ] Write tests

**Files to create/modify**:

- Create: `components/sidebar/sidebar-customization-dialog.tsx`
- Create: `components/sidebar/sidebar-customization-dialog.test.tsx`
- Update: `components/sidebar/app-sidebar.tsx` (add dialog state and trigger)

**Effort**: ~2 hours

---

### Phase 4: Custom App Links

**Current State**: App links hardcoded in `app-sidebar.tsx` lines 752-807 (8 links)

**Implementation**:

```typescript
// Add to sidebar-customization-dialog.tsx - Apps tab
<TabsContent value="apps">
  <ScrollArea className="h-[300px] pr-4">
    {/* Existing app links */}
    {appLinks.map((link) => (/* ... */))}
    
    {/* Add Custom Link Button */}
    <Button 
      variant="outline" 
      size="sm" 
      className="w-full mt-3"
      onClick={() => setShowAddLinkForm(true)}
    >
      <Plus className="h-4 w-4 mr-1" />
      {t('addCustomLink') || 'Add Custom Link'}
    </Button>
  </ScrollArea>
</TabsContent>

// Custom link form (inline in dialog or separate component)
function AddCustomLinkForm({ onSubmit, onCancel }) {
  const [label, setLabel] = useState('');
  const [href, setHref] = useState('');
  const [icon, setIcon] = useState('Link');
  const [color, setColor] = useState('text-gray-500');
  
  const handleSubmit = () => {
    // Validate URL
    if (!href.startsWith('/') && !href.startsWith('http')) {
      toast.error(t('invalidUrl'));
      return;
    }
    onSubmit({ label, href, icon, color, enabled: true });
  };
  
  return (
    <div className="space-y-3 p-3 border rounded-lg">
      <Input placeholder="Label" value={label} onChange={(e) => setLabel(e.target.value)} />
      <Input placeholder="URL (e.g., /path or https://...)" value={href} onChange={(e) => setHref(e.target.value)} />
      <IconSelector value={icon} onChange={setIcon} />
      <ColorPicker value={color} onChange={setColor} />
      <div className="flex gap-2">
        <Button size="sm" onClick={handleSubmit}>Add</Button>
        <Button size="sm" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}
```

**Update app-sidebar.tsx** to render links from store:

```typescript
// Replace hardcoded links in app-sidebar.tsx lines 752-807 with:
const enabledAppLinks = useSidebarCustomizationStore((s) => s.appLinks.filter(l => l.enabled));

<CollapsibleContent className="space-y-2">
  {/* Render links in pairs */}
  {chunk(enabledAppLinks, 2).map((pair, i) => (
    <div key={i} className="flex gap-2">
      {pair.map((link) => (
        <Link key={link.id} href={link.href} className="flex-1" target={link.href.startsWith('http') ? '_blank' : undefined}>
          <div className="flex items-center gap-2 rounded-lg border border-transparent px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent/50">
            <DynamicIcon name={link.icon} className={cn('h-4 w-4', link.color)} />
            <span>{t(link.label) || link.label}</span>
          </div>
        </Link>
      ))}
    </div>
  ))}
</CollapsibleContent>
```

**Tasks**:

- [ ] Add "Add Custom Link" button to Apps tab
- [ ] Create `AddCustomLinkForm` component with validation
- [ ] Create simple `IconSelector` component (dropdown of common Lucide icons)
- [ ] Create `ColorPicker` for link color
- [ ] Add edit/delete actions for custom links
- [ ] Update app-sidebar.tsx to render from store
- [ ] Support external links with `target="_blank"` and `rel="noopener"`
- [ ] Write tests

**Files to create/modify**:

- Update: `components/sidebar/sidebar-customization-dialog.tsx`
- Create: `components/sidebar/add-custom-link-form.tsx`
- Create: `components/sidebar/icon-selector.tsx`
- Update: `components/sidebar/app-sidebar.tsx` (use store for links)

**Effort**: ~3 hours

---

### Phase 5: Search Performance Optimization

**Current Problem** (app-sidebar.tsx lines 208-256):

```typescript
// CURRENT: Synchronous iteration with DB reads for EACH session
for (const session of sortedSessions) {
  const messages = await messageRepository.getBySessionId(session.id); // DB READ
  const matchingMessage = messages.find((m) =>
    m.content.toLowerCase().includes(lowerQuery)  // Linear scan
  );
}
```

**Solution**: Create a dedicated search hook with indexing and caching.

**Implementation**:

```typescript
// hooks/sidebar/use-sidebar-search.ts
'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { messageRepository } from '@/lib/db/repositories';
import type { Session, SearchResult } from '@/types';

// Simple in-memory cache for search results
const searchCache = new Map<string, { results: SearchResult[]; timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds

export function useSidebarSearch(sessions: Session[]) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Build title index for fast title search (O(1) lookup)
  const titleIndex = useMemo(() => {
    const index = new Map<string, Set<string>>(); // word -> sessionIds
    for (const session of sessions) {
      const words = session.title.toLowerCase().split(/\s+/);
      for (const word of words) {
        if (word.length < 2) continue;
        if (!index.has(word)) index.set(word, new Set());
        index.get(word)!.add(session.id);
      }
    }
    return index;
  }, [sessions]);
  
  // Fast title search using index
  const searchTitles = useCallback((query: string): string[] => {
    const words = query.toLowerCase().split(/\s+/).filter(w => w.length >= 2);
    if (words.length === 0) return [];
    
    // Find intersection of sessionIds for all query words
    let matchingIds: Set<string> | null = null;
    for (const word of words) {
      const matches = new Set<string>();
      for (const [indexWord, ids] of titleIndex) {
        if (indexWord.includes(word)) {
          ids.forEach(id => matches.add(id));
        }
      }
      matchingIds = matchingIds 
        ? new Set([...matchingIds].filter(id => matches.has(id)))
        : matches;
    }
    return matchingIds ? [...matchingIds] : [];
  }, [titleIndex]);
  
  // Content search with caching (runs after title search)
  const searchContent = useDebouncedCallback(async (query: string, excludeIds: Set<string>) => {
    const cacheKey = `content:${query}`;
    const cached = searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.results;
    }
    
    const contentResults: SearchResult[] = [];
    const lowerQuery = query.toLowerCase();
    
    // Limit content search to recent sessions (performance)
    const recentSessions = sessions
      .filter(s => !excludeIds.has(s.id))
      .slice(0, 50); // Only search last 50 sessions
    
    for (const session of recentSessions) {
      try {
        const messages = await messageRepository.getBySessionId(session.id);
        const match = messages.find(m => m.content.toLowerCase().includes(lowerQuery));
        if (match) {
          const idx = match.content.toLowerCase().indexOf(lowerQuery);
          const snippet = match.content.slice(Math.max(0, idx - 30), idx + query.length + 30);
          contentResults.push({ session, matchType: 'content', snippet: `...${snippet}...` });
        }
      } catch (e) {
        console.error(`Search error for session ${session.id}:`, e);
      }
    }
    
    searchCache.set(cacheKey, { results: contentResults, timestamp: Date.now() });
    return contentResults;
  }, 500); // 500ms debounce for content search
  
  // Main search function
  const handleSearch = useDebouncedCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    
    setIsSearching(true);
    
    // 1. Fast title search (instant)
    const titleMatchIds = searchTitles(query);
    const titleResults = titleMatchIds
      .map(id => sessions.find(s => s.id === id))
      .filter(Boolean)
      .map(session => ({ session: session!, matchType: 'title' as const }));
    
    setSearchResults(titleResults);
    
    // 2. Background content search (debounced)
    const excludeIds = new Set(titleMatchIds);
    const contentResults = await searchContent(query, excludeIds);
    
    setSearchResults([...titleResults, ...(contentResults || [])]);
    setIsSearching(false);
  }, 150); // 150ms debounce for title search
  
  return { searchQuery, setSearchQuery: handleSearch, searchResults, isSearching, clearSearch: () => {
    setSearchQuery('');
    setSearchResults([]);
  }};
}
```

**Update app-sidebar.tsx** to use hook:

```typescript
// Replace lines 169-266 with:
const { searchQuery, setSearchQuery, searchResults, isSearching, clearSearch } = useSidebarSearch(sortedSessions);
```

**Tasks**:

- [ ] Create `useSidebarSearch` hook with title indexing
- [ ] Implement search result caching with 30s TTL
- [ ] Split search into fast title (150ms debounce) + slow content (500ms debounce)
- [ ] Limit content search to last 50 sessions for performance
- [ ] Update app-sidebar.tsx to use new hook
- [ ] Add performance benchmarks (target: <100ms for 100 sessions)
- [ ] Write tests

**Files to create/modify**:

- Create: `hooks/sidebar/use-sidebar-search.ts`
- Create: `hooks/sidebar/use-sidebar-search.test.ts`
- Update: `components/sidebar/app-sidebar.tsx`

**Effort**: ~4 hours

**Expected Improvement**:
| Metric | Before | After |
|--------|--------|-------|
| Title search (100 sessions) | ~500ms | <50ms |
| Content search (100 sessions) | ~2000ms | <500ms (cached) |
| Memory usage | High (loads all messages) | Low (lazy + cache) |

---

### Phase 6: Keyboard Navigation

**Reference Pattern**: `hooks/ui/use-keyboard-shortcuts.ts` (lines 65-210)

**Implementation**:

```typescript
// hooks/sidebar/use-sidebar-keyboard.ts
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSessionStore } from '@/stores';
import type { Session } from '@/types';

interface UseSidebarKeyboardOptions {
  sessions: Session[];
  enabled?: boolean;
  onNewChat?: () => void;
  onFocusSearch?: () => void;
}

export function useSidebarKeyboard({
  sessions,
  enabled = true,
  onNewChat,
  onFocusSearch,
}: UseSidebarKeyboardOptions) {
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const setActiveSession = useSessionStore((s) => s.setActiveSession);
  const togglePinSession = useSessionStore((s) => s.togglePinSession);
  
  const sessionRefs = useRef<Map<string, HTMLElement>>(new Map());
  
  const registerSessionRef = useCallback((id: string, el: HTMLElement | null) => {
    if (el) sessionRefs.current.set(id, el);
    else sessionRefs.current.delete(id);
  }, []);
  
  const focusSession = useCallback((index: number) => {
    if (index < 0 || index >= sessions.length) return;
    setFocusedIndex(index);
    sessionRefs.current.get(sessions[index].id)?.focus();
  }, [sessions]);
  
  useEffect(() => {
    if (!enabled) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInSidebar = target.closest('[data-sidebar]');
      const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      
      // / - Focus search (global, not in input)
      if (e.key === '/' && !isInputField) {
        e.preventDefault();
        onFocusSearch?.();
        return;
      }
      
      // n - New chat (global, not in input)
      if (e.key === 'n' && !isInputField && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        onNewChat?.();
        return;
      }
      
      // Sidebar-specific shortcuts
      if (!isInSidebar) return;
      
      // j/ArrowDown - Move down
      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        focusSession(Math.min(focusedIndex + 1, sessions.length - 1));
      }
      
      // k/ArrowUp - Move up
      if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        focusSession(Math.max(focusedIndex - 1, 0));
      }
      
      // Enter - Select session
      if (e.key === 'Enter' && focusedIndex >= 0) {
        e.preventDefault();
        setActiveSession(sessions[focusedIndex].id);
      }
      
      // p - Pin/unpin
      if (e.key === 'p' && focusedIndex >= 0 && !e.ctrlKey) {
        e.preventDefault();
        togglePinSession(sessions[focusedIndex].id);
      }
      
      // Home/End - First/last session
      if (e.key === 'Home') { e.preventDefault(); focusSession(0); }
      if (e.key === 'End') { e.preventDefault(); focusSession(sessions.length - 1); }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled, sessions, focusedIndex, focusSession, setActiveSession, togglePinSession, onNewChat, onFocusSearch]);
  
  return { focusedIndex, setFocusedIndex, registerSessionRef };
}
```

**Keyboard Shortcuts**:

| Shortcut | Action |
|----------|--------|
| `Ctrl+B` | Toggle sidebar |
| `/` | Focus search |
| `n` | New chat |
| `↑/↓` or `j/k` | Navigate sessions |
| `Enter` | Open selected session |
| `p` | Toggle pin on selected session |
| `Home/End` | First/last session |
| `Escape` | Clear search / deselect |

**Tasks**:

- [ ] Create `useSidebarKeyboard` hook (copy use-keyboard-shortcuts.ts pattern)
- [ ] Implement roving tabindex for session list
- [ ] Add vim-style j/k navigation
- [ ] Add visual focus indicator (`ring-2 ring-primary`)
- [ ] Update `KeyboardShortcutsDialog` with sidebar shortcuts
- [ ] Write accessibility tests

**Files to create/modify**:

- Create: `hooks/sidebar/use-sidebar-keyboard.ts`
- Create: `hooks/sidebar/use-sidebar-keyboard.test.ts`
- Update: `components/sidebar/app-sidebar.tsx`
- Update: `hooks/ui/use-keyboard-shortcuts.ts` (add shortcuts to list)

**Effort**: ~3 hours

---

### Phase 7: Session Drag-Drop (Optional Enhancement)

**Reference Pattern**: `components/presets/preset-quick-switcher.tsx` (DnD) + `stores/chat/session-store.ts` (folder support)

**Current State**: `session-store.ts` already has folder support (lines 63-67, 186-225):
- `createFolder`, `deleteFolder`, `updateFolder`
- `moveSessionToFolder`
- `folders: ChatFolder[]`

**Implementation**:

```typescript
// Add to session-store.ts - reorder sessions action
reorderSessions: (activeId: string, overId: string) => {
  set((state) => {
    const sessions = [...state.sessions];
    const oldIndex = sessions.findIndex((s) => s.id === activeId);
    const newIndex = sessions.findIndex((s) => s.id === overId);
    if (oldIndex === -1 || newIndex === -1) return state;
    
    const [removed] = sessions.splice(oldIndex, 1);
    sessions.splice(newIndex, 0, removed);
    
    return { sessions };
  });
},

// components/sidebar/draggable-session-list.tsx
export function DraggableSessionList({ sessions, folders }: Props) {
  const reorderSessions = useSessionStore((s) => s.reorderSessions);
  const moveSessionToFolder = useSessionStore((s) => s.moveSessionToFolder);
  
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    
    const activeData = active.data.current;
    const overData = over.data.current;
    
    // Session dropped on folder
    if (overData?.type === 'folder') {
      moveSessionToFolder(active.id as string, over.id as string);
      toast.success(t('movedToFolder'));
      return;
    }
    
    // Session reordering
    if (active.id !== over.id) {
      reorderSessions(active.id as string, over.id as string);
    }
  };
  
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      {/* Folder drop zones */}
      {folders.map((folder) => (
        <DroppableFolder key={folder.id} folder={folder} />
      ))}
      
      {/* Sortable sessions */}
      <SortableContext items={sessions.map(s => s.id)} strategy={verticalListSortingStrategy}>
        {sessions.map((session) => (
          <SortableSession key={session.id} session={session} />
        ))}
      </SortableContext>
    </DndContext>
  );
}

// Droppable folder component
function DroppableFolder({ folder }: { folder: ChatFolder }) {
  const { isOver, setNodeRef } = useDroppable({
    id: folder.id,
    data: { type: 'folder', folderId: folder.id },
  });
  
  return (
    <div ref={setNodeRef} className={cn('transition-colors', isOver && 'bg-accent')}>
      <SidebarFolder folder={folder} />
    </div>
  );
}
```

**Visual Feedback**:
- Dragging: `opacity-50`, `z-50`
- Drop target active: `ring-2 ring-primary`, `bg-accent/50`
- Invalid drop: `ring-2 ring-destructive`

**Tasks**:

- [ ] Add `reorderSessions` action to `session-store.ts`
- [ ] Create `DraggableSessionList` component
- [ ] Create `SortableSession` wrapper component
- [ ] Create `DroppableFolder` for folder drop targets
- [ ] Add visual drop indicators
- [ ] Write tests

**Files to create/modify**:

- Update: `stores/chat/session-store.ts` (add reorderSessions)
- Create: `components/sidebar/draggable-session-list.tsx`
- Create: `components/sidebar/sortable-session.tsx`
- Update: `components/sidebar/app-sidebar.tsx`

**Effort**: ~4 hours (optional, lower priority)

---

## 4. Implementation Priority Matrix

| Phase | Priority | Effort | Impact | Dependencies |
|-------|----------|--------|--------|--------------|
| Phase 1: Store | 🔴 Critical | Medium | High | None |
| Phase 2: Widget DnD | 🔴 Critical | Medium | High | Phase 1 |
| Phase 3: Widget Settings | 🔴 Critical | Low | High | Phase 1 |
| Phase 4: Custom Links | 🟡 Medium | Low | Medium | Phase 1, 3 |
| Phase 5: Search Perf | 🟡 Medium | High | Medium | None |
| Phase 6: Keyboard Nav | 🟡 Medium | Medium | High | None |
| Phase 7: Session DnD | 🟢 Low | High | Low | Phase 1 |

---

## 5. File Changes Summary

### New Files (13)
```
stores/sidebar/
├── sidebar-customization-store.ts
├── sidebar-customization-store.test.ts
└── index.ts

types/sidebar/
└── index.ts

components/sidebar/
├── sidebar-widget-container.tsx
├── sidebar-widget-container.test.tsx
├── sortable-widget.tsx
├── sidebar-customization-dialog.tsx
├── sidebar-customization-dialog.test.tsx
└── custom-link-form.tsx

hooks/sidebar/
├── use-sidebar-search.ts
└── use-sidebar-keyboard-navigation.ts

lib/sidebar/
├── search-worker.ts
└── search-index.ts
```

### Modified Files (8)
```
stores/index.ts
components/sidebar/app-sidebar.tsx
components/sidebar/widgets/sidebar-usage-stats.tsx
components/sidebar/widgets/sidebar-quick-actions.tsx
components/sidebar/widgets/sidebar-workflows.tsx
components/sidebar/widgets/sidebar-background-tasks.tsx
components/sidebar/widgets/sidebar-recent-files.tsx
components/layout/keyboard-shortcuts-dialog.tsx
```

---

## 6. Testing Strategy

### Unit Tests
- Store actions and selectors
- Search indexing logic
- Widget ordering logic

### Integration Tests
- Widget drag-drop reordering
- Custom link CRUD operations
- Settings persistence

### E2E Tests
- Full customization workflow
- Keyboard navigation
- Search performance

---

## 7. Migration Plan

1. **Phase 1 Migration**: Migrate `COLLAPSED_GROUPS_KEY` from localStorage to new store
2. **Backward Compatibility**: Read old localStorage values and migrate to store on first load
3. **Settings Export**: Include sidebar customization in settings export/import

---

## 8. Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Widget customization options | 0 | 6 widgets configurable |
| App links customizable | 0 | Unlimited custom links |
| Search latency (100 sessions) | ~500ms | <100ms |
| Keyboard shortcuts | 2 | 10+ |
| User satisfaction (hypothetical) | N/A | >85% |

---

## 9. Next Steps

1. Review and approve this plan
2. Begin Phase 1 implementation (sidebar customization store)
3. Iterate through phases based on priority
4. Gather user feedback after Phase 3
5. Refine remaining phases based on feedback

---

**Author**: Cascade AI Assistant  
**Review Status**: Pending User Approval
