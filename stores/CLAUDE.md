[根目录](../CLAUDE.md) > **stores**

---

# stores Module Documentation

## Module Responsibility

Zustand state management stores with localStorage persistence. Stores are organized by domain and manage application state.

## Changelog

### 2026-02-13

- Added Zotero integration slice for academic paper management (`academic/slices/zotero-slice.ts`)
- Enhanced academic store with Zotero sync capabilities
- Added A2UI store for mini-apps state management

### 2025-01-14

- Initial module documentation created
- Indexed 25+ store directories
- Documented store patterns

---

## Directory Structure (36 directories)

- `a2ui/` — A2UI mini-apps state (a2ui-store)
- `academic/` — Academic mode state (academic-store, knowledge-map-store, zotero-slice)
- `agent/` — Agent execution tracking (agent-store, background-agent-store, sub-agent-store, custom-mode-store)
- `agent-trace/` — Agent trace state
- `ai/` — AI state
- `arena/` — Arena state (arena-store, leaderboard-sync-store)
- `artifact/` — Artifacts, canvas, versions (artifact-store)
- `canvas/` — Canvas state (comment-store, keybinding-store, chunked-document-store)
- `chat/` — Chat sessions, widget state (chat-store, chat-widget-store, session-store, quote-store, summary-store)
- `context/` — Context state (clipboard-context-store, selection-store, and more)
- `data/` — Recent files, templates, vectors (recent-files-store, template-store, vector-store, memory-store)
- `designer/` — Designer state, history (designer-store, designer-history-store)
- `document/` — Document management (document-store)
- `git/` — Git state (git-store)
- `input-completion/` — Input completion state (input-completion-store)
- `jupyter/` — Jupyter state
- `latex/` — LaTeX state
- `learning/` — Learning mode state (learning-store, speedpass-store)
- `mcp/` — MCP servers, marketplace (mcp-store, mcp-marketplace-store)
- `media/` — Media, screen recording (media-store, image-studio-store, screen-recording-store, screenshot-store, video-editor-store)
- `observability/` — Observability state
- `plugin/` — Plugin state (plugin-store)
- `project/` — Projects, activities (project-store, project-activity-store)
- `prompt/` — Prompt templates and marketplace (prompt-template-store, prompt-marketplace-store)
- `sandbox/` — Sandbox state (sandbox-store)
- `scheduler/` — Task automation (scheduler-store)
- `screenshot/` — Screenshot editor state (editor-store)
- `settings/` — User preferences, presets (settings-store, preset-store, custom-theme-store, settings-profiles-store, completion-settings-store)
- `skill-seekers/` — SkillSeekers state (skill-seekers-store)
- `skills/` — Skills state (skill-store)
- `sync/` — Sync state
- `system/` — Native state, proxy, usage (native-store, proxy-store, usage-store, window-store, environment-store, virtual-env-store, ui-store)
- `tool-history/` — Tool usage history (tool-history-store)
- `tools/` — Skills, tools (skill-store, template-store, ppt-editor-store, jupyter-store)
- `workflow/` — Workflow definitions and execution (workflow-store, workflow-editor-store)

## Entry Points

- `stores/index.ts` — Re-exports all stores and selectors

## Key Dependencies

- **Zustand**: State management
- **Dexie**: IndexedDB persistence
- **Zustand Persist**: localStorage persistence middleware

## Store Pattern

All stores follow this pattern:

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface MyState {
  data: string;
  setData: (data: string) => void;
}

export const useMyStore = create<MyState>()(
  persist(
    (set) => ({
      data: '',
      setData: (data) => set({ data }),
    }),
    { name: 'cognia-my-store' } // localStorage key
  )
);
```

## Store Categories

### Agent Stores

- `useAgentStore` — Agent execution tracking, tool invocations
- `useBackgroundAgentStore` — Background agent queue
- `useSubAgentStore` — Sub-agent management

### Chat Stores

- `useChatStore` — Chat sessions, messages
- `useChatWidgetStore` — Chat widget state
- `useSessionStore` — Session management
- `useQuoteStore` — Quoted content
- `useSummaryStore` — Conversation summaries

### Settings Stores

- `useSettingsStore` — User preferences
- `usePresetStore` — Model presets
- `useCustomThemeStore` — Custom themes
- `useSettingsProfilesStore` — Settings profiles

### System Stores

- `useNativeStore` — Native features state
- `useProxyStore` — Proxy configuration
- `useUsageStore` — Usage tracking
- `useWindowStore` — Window state
- `useEnvironmentStore` — Environment tools
- `useVirtualEnvStore` — Virtual environments
- `useUIStore` — UI state

### Media Stores

- `useMediaStore` — Images and videos
- `useImageStudioStore` — Image editing state
- `useScreenRecordingStore` — Screen recording
- `useVideoEditorStore` — Video editing state

### Academic Stores

- `useAcademicStore` — Academic mode state
  - Paper library management
  - Search results
  - Analysis state
- `useKnowledgeMapStore` — Knowledge map state
- `zotero-slice` — Zotero integration
  - `setZoteroConfig` — Configure Zotero connection
  - `syncWithZotero` — Full sync with Zotero library
  - `importFromZotero` — Import papers from Zotero
  - `exportToZoteroBibTeX` — Export papers as BibTeX

### A2UI Stores

- `useA2UIStore` — A2UI mini-apps state
  - Surface management
  - Message processing
  - App instance tracking

### Arena Stores

- `useArenaStore` — Arena state
- `useLeaderboardSyncStore` — Leaderboard synchronization

## Slice Pattern (for complex stores)

Complex stores use slices to organize related functionality:

```typescript
// stores/academic/slices/zotero-slice.ts
export interface ZoteroActions {
  setZoteroConfig: (config: ZoteroConfig | null) => void;
  syncWithZotero: () => Promise<ZoteroSyncResult | null>;
  importFromZotero: (query?: string) => Promise<number>;
  exportToZoteroBibTeX: (paperIds: string[]) => string[];
}

export function createZoteroSlice(
  set: (updater: ((state: AcademicState) => Partial<AcademicState>) | Partial<AcademicState>) => void,
  get: () => AcademicState
): ZoteroActions {
  return {
    setZoteroConfig: (config) => { /* ... */ },
    syncWithZotero: async () => { /* ... */ },
    // ...
  };
}
```

## Selectors

Each store exports selectors for optimized subscriptions:

```typescript
// Example selectors
export const selectMessages = (state: ChatState) => state.messages;
export const selectIsLoading = (state: ChatState) => state.isLoading;
```

## Common Patterns

### Creating Stores

```typescript
// stores/category/my-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface MyStoreState {
  // State
  items: Item[];
  // Actions
  addItem: (item: Item) => void;
  removeItem: (id: string) => void;
}

export const useMyStore = create<MyStoreState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => set({ items: [...get().items, item] }),
      removeItem: (id) => set({ items: get().items.filter(i => i.id !== id) }),
    }),
    { name: 'cognia-my-store' }
  )
);

// Selectors
export const selectItems = (state: MyStoreState) => state.items;
```

### Using with Components

```typescript
import { useMyStore, selectItems } from '@/stores';

function MyComponent() {
  // Subscribe to specific state
  const items = useMyStore(selectItems);
  const addItem = useMyStore(state => state.addItem);

  return (
    <div>
      {items.map(item => <div key={item.id}>{item.name}</div>)}
      <button onClick={() => addItem({ id: '1', name: 'New' })}>Add</button>
    </div>
  );
}
```

## Testing

- **Framework**: Jest
- **Coverage**: Good
- **Test Files**: Extensive test coverage (`.test.ts` files)

## Related Files

- `types/` — Type definitions
- `hooks/` — React hooks
- `lib/` — Business logic
