[根目录](../CLAUDE.md) > **hooks**

---

# hooks Module Documentation

## Module Responsibility

Custom React hooks organized by domain. These hooks provide reusable stateful logic and side-effect management for the Cognia application.

## Directory Structure

- `ai/` — AI-related hooks (use-ai-registry, use-structured-output, use-sub-agent)
- `agent/` — Agent hooks (use-agent, use-background-agent, use-plan-executor)
- `chat/` — Chat hooks (use-summary, use-translate, use-artifact-detection)
- `context/` — Context hooks (use-awareness, use-context, use-project-context, use-clipboard-context)
- `designer/` — Designer hooks (use-designer, use-workflow-*, use-designer-drag-drop)
- `media/` — Media hooks (use-image-generation, use-speech)
- `native/` — Native hooks (use-native, use-notification, use-window, use-file-watcher, use-screenshot)
- `network/` — Network hooks (use-proxy, use-network-status, use-geolocation)
- `rag/` — RAG hooks (use-rag, use-memory, use-vector-db, use-enhanced-rag)
- `sandbox/` — Sandbox hooks (use-environment, use-jupyter-kernel, use-session-env, use-virtual-env)
- `ui/` — UI hooks (use-global-shortcuts, use-learning-mode, use-learning-tools, use-mention, use-quote-shortcuts, use-selection-toolbar, use-copy, use-keyboard-shortcuts)
- `utils/` — Utility hooks (use-debounce, use-mobile, use-resize-observer, use-element-resize)
- `ppt/` — PPT generation hooks
- `image-studio/` — Image studio hooks
- `video-studio/` — Video studio hooks
- `a2ui/` — A2UI hooks
- `canvas/` — Canvas hooks
- `skills/` — Skills hooks

## Entry Points

- `hooks/index.ts` — Re-exports all hooks from subdirectories

## Key Dependencies

- **React**: React hooks API
- **Zustand**: State management integration
- **AI SDK**: Vercel AI SDK integration
- **Tauri**: Native APIs (via `@tauri-apps/api`)

## Hook Categories

### AI/Agent Hooks

- `useAgent()` — Agent mode execution
- `useBackgroundAgent()` — Background agent queue management
- `useSubAgent()` — Sub-agent management
- `usePlanExecutor()` — Plan execution
- `useAiRegistry()` — AI provider registry
- `useStructuredOutput()` — Structured output generation

### Chat Hooks

- `useSummary()` — Conversation summarization
- `useTranslate()` — Translation
- `useArtifactDetection()` — Artifact detection in messages

### Context Hooks

- `useAwareness()` — System awareness
- `useContext()` — Context detection
- `useProjectContext()` — Project context
- `useClipboardContext()` — Clipboard monitoring

### Designer Hooks

- `useDesigner()` — Designer state
- `useWorkflow()` — Workflow management
- `useWorkflowExecution()` — Workflow execution
- `useWorkflowKeyboardShortcuts()` — Keyboard shortcuts
- `useDesignerDragDrop()` — Drag-and-drop

### Native Hooks

- `useNative()` — Native feature detection
- `useNotification()` — Desktop notifications
- `useWindow()` — Window management
- `useFileWatcher()` — File system watching
- `useScreenshot()` — Screenshot capture

### UI Hooks

- `useGlobalShortcuts()` — Global keyboard shortcuts
- `useLearningMode()` — Learning mode
- `useLearningTools()` — Learning tools
- `useMention()` — @mention functionality
- `useQuoteShortcuts()` — Quote shortcuts
- `useSelectionToolbar()` — Selection toolbar
- `useCopy()` — Copy to clipboard
- `useKeyboardShortcuts()` — Keyboard shortcuts

### RAG Hooks

- `useRag()` — RAG pipeline
- `useMemory()` — Memory management
- `useVectorDb()` — Vector database
- `useEnhancedRag()` — Enhanced RAG

### Sandbox Hooks

- `useEnvironment()` — Environment management
- `useJupyterKernel()` — Jupyter kernel
- `useSessionEnv()` — Session environment
- `useVirtualEnv()` — Virtual environment

## Common Patterns

### Creating Hooks

```typescript
// hooks/category/my-hook.ts
import { useState, useCallback } from 'react';

export function useMyHook(initialValue: string) {
  const [value, setValue] = useState(initialValue);

  const updateValue = useCallback((newValue: string) => {
    setValue(newValue);
  }, []);

  return { value, updateValue };
}
```

### Using with Zustand Stores

```typescript
import { useChatStore } from '@/stores';

export function useMyHook() {
  const messages = useChatStore(selectMessages);
  const addMessage = useChatStore(state => state.addMessage);

  return { messages, addMessage };
}
```

## Testing

- **Framework**: Jest
- **Coverage**: Good
- **Test Files**: Extensive test coverage (`.test.ts` files)

## Related Files

- `stores/` — Zustand stores
- `lib/` — Business logic
- `types/` — Type definitions

## Changelog

### 2025-01-14

- Initial module documentation created
- Indexed 15+ hook directories
- Documented hook patterns
