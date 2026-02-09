# Plugin System Enhancement Plan

## Executive Summary

After thorough analysis of the existing plugin system codebase, online best practices research (VS Code extension model, event-driven architecture patterns, n8n plugin system), and cross-referencing with application features, this plan identifies **concrete gaps** and proposes **targeted enhancements** organized by priority.

---

## Current State Analysis

### What Works Well ✅
- **Core lifecycle**: Plugin install → load → activate → enable/disable → unload is solid
- **Hook dispatchers**: PluginLifecycleHooks + PluginEventHooks cover many events
- **Agent integration**: Pre/Post tool hooks, agent lifecycle hooks all wired up
- **Store integration**: Session, project, artifact, canvas, settings stores all dispatch hooks
- **AI chat flow**: Stream start/chunk/end, chat error, user prompt submit, pre/post tool use connected
- **Export hooks**: Word/Excel export call dispatchExportStart/Complete
- **External agent hooks**: Connected in use-external-agent.ts
- **Extension point component**: `PluginExtensionPoint` exists with rendering logic

### Critical Gaps Found 🔴

---

## Phase 1: Wire Up Disconnected Hooks (HIGH Priority)

These dispatchers exist in `hooks-system.ts` but are **never called** from application code.

### 1.1 Message Delete Hook — Not Called
- **File**: `lib/plugin/messaging/hooks-system.ts` line 833 — `dispatchOnMessageDelete` exists
- **Problem**: Chat container and session store never call it when messages are deleted
- **Fix**: Call `getPluginLifecycleHooks().dispatchOnMessageDelete(messageId, sessionId)` in message deletion logic in `components/chat/core/chat-container.tsx`

### 1.2 Command Dispatch Hook — Not Called
- **File**: `lib/plugin/messaging/hooks-system.ts` line 1026 — `dispatchOnCommand` exists
- **Problem**: No command handler in the app calls this dispatcher
- **Fix**: Integrate into the command palette / slash command handler so plugin commands get dispatched

### 1.3 UI Hooks — None Called
- `dispatchSidebarToggle` — never called from sidebar components
- `dispatchPanelOpen` / `dispatchPanelClose` — never called from panel management
- `dispatchContextMenuShow` — never called from context menu handlers
- **Fix**: Wire these into:
  - `components/sidebar/app-sidebar.tsx` — sidebar toggle
  - `stores/artifact/artifact-store.ts` — panel open/close (panelOpen state changes)
  - Context menu components — context menu show

### 1.4 Workflow Hooks — Never Called from Application
- `dispatchWorkflowStart/StepComplete/Complete/Error` — only defined in workflow-integration.ts
- `PluginWorkflowIntegration` class has `notifyWorkflow*` methods but they're never invoked
- **Fix**: If agent-loop.ts or other workflow orchestrators exist, call `getPluginWorkflowIntegration().notifyWorkflowStart()` etc.

### 1.5 Vector/RAG Hooks — Never Called
- `dispatchDocumentsIndexed` — never called from vector indexing code
- `dispatchVectorSearch` — never called from search code  
- `dispatchRAGContextRetrieved` — never called from RAG retrieval code
- **Fix**: Wire into `lib/vector/` and `lib/rag/` or wherever embedding/search operations occur

### 1.6 Token Usage Hook — Not Called from Streaming
- `notifyTokenUsage` exists in workflow-integration but NOT called from `use-ai-chat.ts`
- **Fix**: After streaming completes in `use-ai-chat.ts`, call `pluginIntegration.notifyTokenUsage(sessionId, usage)` when usage data is available

### 1.7 PostChatReceive Hook — Not Called from Chat
- `dispatchPostChatReceive` exists but is never called from `chat-container.tsx` after AI response
- **Fix**: Call after AI response is finalized in chat-container.tsx

---

## Phase 2: Fix Broken Implementations (HIGH Priority)

### 2.1 A2UI Bridge — Empty Plugin Context
- **File**: `lib/plugin/bridge/a2ui-bridge.ts` lines 148-171
- **Problem**: `createWrappedComponent` injects empty mock objects (`{} as never`) for ALL context APIs
- **Impact**: Plugin A2UI components receive non-functional context — they can't log, store data, or use any API
- **Fix**: Inject the actual `PluginContext` from `PluginManager.contexts` map instead of empty mocks

### 2.2 HookDispatcher Generic Class — Unused
- **File**: `lib/plugin/messaging/hooks-system.ts` lines 1-520
- **Problem**: The sophisticated `HookDispatcher` class with middleware, caching, timeouts is defined but NOT used by `PluginLifecycleHooks` or `PluginEventHooks`
- Both managers implement their own simpler dispatch loops
- **Fix**: Either refactor to use HookDispatcher internally (gaining middleware/timeout/caching), or remove it to avoid dead code

---

## Phase 3: Add Missing Extension Points (MEDIUM Priority)

### 3.1 Render `PluginExtensionPoint` in More Locations
Currently only rendered in `app-sidebar.tsx` (2 points). The `ExtensionPoint` type defines 20+ points:
- `sidebar.left.top/bottom`, `sidebar.right.top/bottom`
- `toolbar.left/center/right`
- `chat.header/footer/input.before/input.after`
- `message.before/after/actions`
- `settings.general/appearance/plugins`
- `statusbar.left/center/right`
- `panel.header/footer`

**Action**: Add `<PluginExtensionPoint point="..." />` renders in:
- Chat header/footer/input area components
- Message rendering components (before/after message, action buttons)
- Settings pages
- Status bar component
- Panel header/footer areas

### 3.2 Add New Hook Categories for Unhooked Features

#### Academic Module Hooks
```typescript
onAcademicSessionCreate?: (sessionId: string, subject: string) => void;
onCitationAdd?: (sessionId: string, citation: unknown) => void;
onLatexCompile?: (sessionId: string, content: string) => void;
```

#### Sandbox/Code Execution Hooks
```typescript
onCodeExecutionStart?: (language: string, code: string) => void;
onCodeExecutionComplete?: (language: string, result: unknown) => void;
onCodeExecutionError?: (language: string, error: Error) => void;
```

#### MCP Server Hooks
```typescript
onMCPServerConnect?: (serverId: string, serverName: string) => void;
onMCPServerDisconnect?: (serverId: string) => void;
onMCPToolCall?: (serverId: string, toolName: string, args: unknown) => void;
```

#### Input Completion Hooks (Desktop)
```typescript
onCompletionSuggestion?: (text: string, context: unknown) => void;
onCompletionAccept?: (text: string) => void;
onCompletionDismiss?: () => void;
```

---

## Phase 4: Plugin SDK Improvements (MEDIUM Priority)

### 4.1 SDK Missing Utilities
The plugin SDK (`plugin-sdk/typescript/src/`) should expose:
- **Debounce/throttle helpers** for event handlers
- **Data validation utilities** beyond Schema
- **Common UI patterns** (notification helpers, confirmation dialogs)
- **Type-safe event emitter** with known event types
- **Storage helpers** with serialization/deserialization

### 4.2 SDK Extended API Access
Verify the SDK exposes the full `PluginContextAPI` (session, project, vector, theme, export, i18n, canvas, artifact, notifications, ai, extensions, permissions). Currently plugins may only get base `PluginContext`.

### 4.3 Improve Plugin Developer Experience
- Add a `defineHooks()` type helper for better autocomplete of all 80+ hooks
- Add `defineConfig()` for type-safe config schema definition
- Document lifecycle diagrams and hook execution order

---

## Phase 5: Integration with Existing Features (MEDIUM Priority)

### 5.1 Plugin ↔ Scheduler Integration
- Verify scheduled tasks actually execute plugin handlers
- Ensure `onScheduledTaskCreate/Update/Delete/Pause/Resume/BeforeRun` hooks are dispatched from scheduler store

### 5.2 Plugin ↔ i18n Integration
- Verify `PluginI18nLoader` actually loads translations at plugin activation
- Ensure plugin translations merge with app translations seamlessly

### 5.3 Plugin ↔ Settings Integration
- Ensure plugin config schemas generate settings UI automatically
- Wire `onConfigChange` to settings store changes
- Plugin settings should appear in the settings page under a "Plugins" section

---

## Phase 6: Robustness & Security (LOW Priority)

### 6.1 Error Boundary for Plugin Components
- Wrap `PluginExtensionPoint` renders in React error boundaries
- Currently if a plugin component throws, it could crash the host component

### 6.2 Hook Execution Timeouts
- `HookDispatcher` has timeout support but it's unused
- Long-running plugin hooks could block UI
- Add configurable timeouts to `PluginLifecycleHooks.dispatchOn*` methods

### 6.3 Permission Validation at Hook Call Time
- Currently permissions are registered at install time but not checked at hook execution
- Plugin calling `context.shell.execute()` should verify `shell:execute` permission

### 6.4 Plugin Isolation
- Frontend plugins run in the same JS context
- Consider using `PluginSandbox` (which exists but usage is unclear) for untrusted plugins

---

## Implementation Order

| Order | Phase | Effort | Impact |
|-------|-------|--------|--------|
| 1 | Phase 1: Wire disconnected hooks | Low-Medium | High — makes existing hooks actually work |
| 2 | Phase 2: Fix broken implementations | Medium | High — A2UI bridge is non-functional |
| 3 | Phase 3.1: Render extension points | Low | Medium — enables plugin UI injection |
| 4 | Phase 4.2: SDK extended API | Low | Medium — plugins can access full API |
| 5 | Phase 3.2: New hook categories | Medium | Medium — new integration points |
| 6 | Phase 5: Feature integration | Medium | Medium — end-to-end verification |
| 7 | Phase 4.1/4.3: SDK utilities | Medium | Low-Medium — DX improvement |
| 8 | Phase 6: Security/robustness | Medium | Low — stability improvement |

---

## Files to Modify (Estimated)

### Phase 1 (7 files)
- `components/chat/core/chat-container.tsx` — add message delete + post-chat-receive hooks
- `stores/chat/session-store.ts` — add missing dispatches
- `components/sidebar/app-sidebar.tsx` — sidebar toggle hook
- `stores/artifact/artifact-store.ts` — panel open/close hooks
- `lib/ai/generation/use-ai-chat.ts` — token usage hook
- `lib/vector/` files — vector/RAG hooks
- Command handler files — command dispatch hook

### Phase 2 (2 files)
- `lib/plugin/bridge/a2ui-bridge.ts` — fix context injection
- `lib/plugin/messaging/hooks-system.ts` — integrate or remove HookDispatcher

### Phase 3 (8+ files)
- Various component files to add `<PluginExtensionPoint />`
- `types/plugin/plugin-hooks.ts` — new hook interfaces
- `lib/plugin/messaging/hooks-system.ts` — new dispatchers

### Phase 4 (3+ files)
- `plugin-sdk/typescript/src/` — SDK enhancements
- `lib/plugin/core/context.ts` — extended API exposure

---

## Non-Goals (Explicitly Out of Scope)
- Rewriting the plugin system from scratch
- Adding new plugin types beyond frontend/python/hybrid
- Building a real marketplace backend
- Duplicating existing functionality
