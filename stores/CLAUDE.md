[根目录](../CLAUDE.md) > **stores**

---

# stores Module Documentation

## Module Responsibility

Zustand state management stores with localStorage persistence. Stores are organized by domain and manage application state.

## Directory Structure

- `agent/` — Agent execution tracking (agent-store, background-agent-store, sub-agent-store)
- `artifact/` — Artifacts, canvas, versions (artifact-store)
- `chat/` — Chat sessions, widget state (chat-store, chat-widget-store, session-store, quote-store, summary-store)
- `context/` — Clipboard context (clipboard-context-store)
- `data/` — Recent files, templates, vectors (recent-files-store, template-store, vector-store, memory-store)
- `designer/` — Designer state, history (designer-store, designer-history-store)
- `document/` — Document management (document-store)
- `learning/` — Learning mode state (learning-store)
- `mcp/` — MCP servers, marketplace (mcp-store, mcp-marketplace-store)
- `media/` — Media, screen recording (media-store, image-studio-store, screen-recording-store)
- `project/` — Projects, activities (project-store, project-activity-store)
- `scheduler/` — Task automation (scheduler-store)
- `settings/` — User preferences, presets (settings-store, preset-store, custom-theme-store, settings-profiles-store)
- `system/` — Native state, proxy, usage (native-store, proxy-store, usage-store, window-store, environment-store, virtual-env-store, ui-store)
- `tools/` — Skills, tools (skill-store, template-store, ppt-editor-store, jupyter-store)
- `workflow/` — Workflow definitions and execution (workflow-store, workflow-editor-store)
- `git/` — Git state (git-store)
- `a2ui/` — A2UI state (a2ui-store)
- `academic/` — Academic mode state (academic-store, knowledge-map-store)
- `plugin/` — Plugin state (plugin-store)
- `prompt/` — Prompt templates and marketplace (prompt-template-store, prompt-marketplace-store)
- `tool-history/` — Tool usage history (tool-history-store)
- `sandbox/` — Sandbox state (sandbox-store)

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

## Changelog

### 2025-01-14

- Initial module documentation created
- Indexed 25+ store directories
- Documented store patterns
