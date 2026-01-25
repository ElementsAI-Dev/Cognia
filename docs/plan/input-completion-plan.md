# Input Completion System Development Plan

## Document Information

- **Project**: Cognia AI Chat Application
- **Module**: Input Completion / Autocomplete
- **Created**: 2025-01-25
- **Status**: Planning
- **Priority**: High

---

## Executive Summary

Cognia currently has two separate input completion systems:

1. **MCP @Mention System** (Active): Autocomplete for MCP tools, resources, and prompts via `@` trigger
2. **Native AI Completion** (Desktop-only, Not Integrated): GitHub Copilot-style ghost text completion

This plan focuses on:
- Integrating native AI completion into chat input
- Unifying both systems with proper coexistence
- Adding new completion types (slash commands, emoji, etc.)
- Optimizing performance and user experience
- Ensuring cross-platform compatibility (web + desktop)

---

## Current State Analysis

### Active System: MCP @Mention

**Location**: `components/chat/chat-input.tsx`, `hooks/ui/use-mention.ts`, `components/chat/popovers/mention-popover.tsx`

**Features**:
- Trigger: Type `@` symbol
- Data: Connected MCP servers (tools, resources, prompts)
- UI: Command-based popover with keyboard navigation
- History: Integration with tool-history-store for sorting (recent/frequent/favorites)
- Output: `@server:tool_name` format

**Limitations**:
- Only works for MCP-related items
- No contextual suggestions for chat content
- No slash commands for quick actions

### Available But Not Integrated: Native AI Completion

**Location**: `hooks/input-completion/use-input-completion.ts`, `components/input-completion/completion-overlay.tsx`, Rust backend in `src-tauri/src/input_completion/`

**Features**:
- Desktop-only (Tauri Rust backend)
- AI-powered text completion (Ollama, OpenAI, Groq)
- IME-aware (Chinese/Japanese/Korean support)
- Ghost text overlay with Tab/Esc shortcuts
- Configurable providers and debouncing

**Limitations**:
- **NOT integrated into chat input**
- Desktop-only (no web support)
- Relies on low-level keyboard hooks (platform-specific)

### Architecture Gap

```
Current State:
ChatInput → useMention (@mention) → MCP Tools ✅
ChatInput → [NOT CONNECTED] → useInputCompletion ❌

Desired State:
ChatInput → unified completion system → multiple providers
    ├── @mention → MCP tools
    ├── AI text → ghost completion
    ├── /command → slash commands
    └── :emoji → emoji picker
```

---

## Development Plan

### Phase 1: Foundation & Integration (Priority: Critical)

#### 1.1 Create Unified Completion Architecture

**Files to Create**:
- `hooks/chat/use-input-completion-unified.ts` - New unified hook
- `types/chat/input-completion.ts` - Unified type definitions

**Design**:
```typescript
interface CompletionProvider {
  id: string;
  name: string;
  trigger: TriggerType;
  priority: number;
  isEnabled: boolean;
}

type TriggerType = 'symbol' | 'prefix' | 'contextual' | 'manual';

interface CompletionContext {
  input: string;
  cursorPosition: number;
  activeProvider: string | null;
  providers: CompletionProvider[];
}
```

**Files to Modify**:
- `components/chat/chat-input.tsx` - Replace `useMention` with `useInputCompletionUnified`

#### 1.2 Integrate Ghost Text Completion

**Files to Modify**:
- `components/chat/chat-input.tsx` - Add ghost text overlay
- `hooks/chat/use-input-completion-unified.ts` - Bridge to native completion

**Implementation**:
- Create web-compatible ghost text component (fallback for browser)
- Detect desktop environment: use native completion if available
- Add inline ghost text positioned after cursor
- Handle Tab/Esc shortcuts without conflict with @mention

**Conflict Resolution**:
| State | Tab Key | Escape Key |
|-------|---------|------------|
| @mention open | Select item | Close popover |
| Ghost text visible | Accept completion | Dismiss |
| Both | @mention takes priority | Dismiss both |

#### 1.3 Web-Compatible AI Completion

**Files to Create**:
- `lib/ai/completion/completion-service.ts` - Web AI completion service
- `hooks/chat/use-ai-completion.ts` - React hook for web completion

**Design**:
- Use existing AI providers (via AI SDK) for completion
- Debounced trigger on typing pause
- Context: last N messages + current input
- Cache results to reduce API calls

---

### Phase 2: Slash Commands System (Priority: High)

#### 2.1 Slash Command Registry

**Files to Create**:
- `types/chat/slash-commands.ts` - Command definitions
- `lib/chat/slash-command-registry.ts` - Command registry

**Design**:
```typescript
interface SlashCommand {
  id: string;
  command: string; // e.g., "clear", "image", "summarize"
  description: string;
  icon?: string;
  category: CommandCategory;
  params?: CommandParameter[];
  handler: (params: Record<string, string>) => void;
}

type CommandCategory = 'chat' | 'agent' | 'media' | 'system' | 'custom';
```

**Initial Commands**:
- `/clear` - Clear conversation
- `/image [prompt]` - Generate image
- `/summarize` - Summarize conversation
- `/mode [chat|agent|research]` - Switch mode
- `/provider [name]` - Switch AI provider
- `/preset [name]` - Apply preset

#### 2.2 Slash Command UI

**Files to Create**:
- `components/chat/popovers/slash-command-popover.tsx`

**Features**:
- Trigger: Type `/`
- Grouped by category
- Keyboard navigation
- Parameter hints

#### 2.3 Command Execution Integration

**Files to Modify**:
- `components/chat/core/chat-container.tsx` - Handle command execution

---

### Phase 3: Emoji & Quick Insert (Priority: Medium)

#### 3.1 Emoji Picker

**Files to Create**:
- `lib/chat/emoji-data.ts` - Emoji database (common emojis)
- `components/chat/popovers/emoji-popover.tsx`

**Design**:
- Trigger: Type `:` (configurable, can conflict with markdown)
- Categories: Smileys, People, Animals, Food, activities, etc.
- Search by name (e.g., `:smile` → 😊)
- Frequently used section

#### 3.2 Quick Insert Templates

**Files to Create**:
- `lib/chat/quick-insert-registry.ts`
- `components/chat/popovers/quick-insert-popover.tsx`

**Design**:
- Trigger: Type `/` + tab through categories
- Categories: Code blocks, formatted text, common prompts
- Example: `/code` → insert code block template

---

### Phase 4: Contextual Suggestions (Priority: Medium)

#### 4.1 Smart Suggestions Based on Context

**Files to Create**:
- `lib/ai/completion/context-analyzer.ts`
- `hooks/chat/use-contextual-suggestions.ts`

**Features**:
- Suggest based on last message (continuation)
- Suggest based on detected intent (e.g., question → search web)
- Suggest common actions (e.g., code in message → format as code block)

#### 4.2 Floating Action Suggestions

**Files to Create**:
- `components/chat/contextual-action-bar.tsx`

**Design**:
- Appears below input when context detected
- Quick actions: "Search web", "Format as code", "Generate image"

---

### Phase 5: Performance & Optimization (Priority: High)

#### 5.1 Debouncing & Throttling

**Files to Modify**:
- `hooks/chat/use-input-completion-unified.ts`

**Strategy**:
- Debounce triggers: 200-300ms for symbol triggers, 400ms for AI
- Throttle suggestion updates
- Cancel pending requests on new input

#### 5.2 Caching Strategy

**Files to Create**:
- `lib/ai/completion/completion-cache.ts`

**Design**:
- LRU cache for completion results
- Key: input hash + context hash
- TTL: 5 minutes
- Max size: 100 entries

#### 5.3 Virtual Scrolling for Long Lists

**Files to Modify**:
- `components/chat/popovers/mention-popover.tsx` - Add virtual scrolling

**Library**: `@tanstack/react-virtual` or similar

---

### Phase 6: Cross-Platform Compatibility (Priority: High)

#### 6.1 Platform Detection

**Files to Create**:
- `lib/native/platform-detector.ts`

**Design**:
```typescript
interface PlatformCapabilities {
  isDesktop: boolean;
  hasNativeCompletion: boolean;
  hasKeyboardHooks: boolean;
  platform: 'windows' | 'macos' | 'linux' | 'web';
}
```

#### 6.2 Conditional Feature Loading

**Files to Modify**:
- `hooks/chat/use-input-completion-unified.ts`

**Strategy**:
- Desktop: Use native completion when available
- Web: Use AI SDK completion as fallback
- Graceful degradation for missing features

---

### Phase 7: Settings & Configuration (Priority: Low)

#### 7.1 Completion Settings UI

**Files to Create**:
- `components/settings/completion-settings.tsx`
- `stores/settings/completion-settings-store.ts`

**Options**:
- Enable/disable each completion type
- Configure triggers (@ / :)
- Adjust debounce timing
- Select AI provider for completion
- Manage completion history

---

## Implementation Order

### Sprint 1: Foundation (Week 1-2)
1. Create unified completion types
2. Implement `useInputCompletionUnified` hook
3. Integrate ghost text into chat input
4. Basic web-compatible AI completion

### Sprint 2: Slash Commands (Week 2-3)
1. Create slash command registry
2. Implement slash command popover
3. Add initial commands (clear, image, summarize, mode)
4. Integrate command execution

### Sprint 3: Emoji & Quick Insert (Week 3-4)
1. Create emoji data and popover
2. Implement quick insert templates
3. Add conflict resolution for `:` trigger

### Sprint 4: Context & Optimization (Week 4-5)
1. Implement contextual suggestions
2. Add caching layer
3. Optimize debouncing
4. Add virtual scrolling

### Sprint 5: Polish & Testing (Week 5-6)
1. Cross-platform testing
2. Settings UI
3. Accessibility audit
4. Documentation

---

## Technical Specifications

### Type Definitions

**New File**: `types/chat/input-completion.ts`

```typescript
import type { MentionItem } from '@/types/mcp';

/** Completion provider types */
export type CompletionProviderType =
  | 'mention'      // MCP @mentions
  | 'ai-text'      // AI ghost text completion
  | 'slash'        // Slash commands
  | 'emoji'        // Emoji picker
  | 'quick-insert'; // Quick insert templates

/** Trigger types */
export type TriggerType =
  | 'symbol'       // Single character: @ / :
  | 'prefix'       // Word prefix: cmd/
  | 'contextual'   // Based on context
  | 'manual';      // Explicit trigger (Ctrl+Space)

/** Base completion item */
export interface CompletionItem {
  id: string;
  type: CompletionProviderType;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  metadata?: Record<string, unknown>;
}

/** Mention completion item */
export interface MentionCompletionItem extends CompletionItem {
  type: 'mention';
  data: MentionItem;
}

/** Slash command completion item */
export interface SlashCommandCompletionItem extends CompletionItem {
  type: 'slash';
  command: string;
  category: string;
  params?: CommandParameter[];
}

/** Emoji completion item */
export interface EmojiCompletionItem extends CompletionItem {
  type: 'emoji';
  emoji: string;
  category: string;
  keywords: string[];
}

/** AI text completion result */
export interface AITextCompletionResult {
  text: string;
  confidence: number;
  cursorOffset: number;
}

/** Unified completion state */
export interface UnifiedCompletionState {
  isOpen: boolean;
  activeProvider: CompletionProviderType | null;
  trigger: string | null;
  query: string;
  triggerPosition: number;
  items: CompletionItem[];
  selectedIndex: number;
}

/** Completion provider config */
export interface CompletionProviderConfig {
  type: CompletionProviderType;
  trigger: TriggerType;
  triggerChar?: string;
  priority: number;
  enabled: boolean;
}

/** Command parameter definition */
export interface CommandParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'enum';
  required: boolean;
  description?: string;
  enumValues?: string[];
  defaultValue?: unknown;
}
```

### Hook Interface

**New File**: `hooks/chat/use-input-completion-unified.ts`

```typescript
export interface UseInputCompletionUnifiedOptions {
  /** Available completion providers */
  providers?: CompletionProviderConfig[];
  /** Callback when item is selected */
  onSelect?: (item: CompletionItem) => void;
  /** Callback when completion state changes */
  onStateChange?: (state: UnifiedCompletionState) => void;
}

export interface UseInputCompletionUnifiedReturn {
  /** Current completion state */
  state: UnifiedCompletionState;

  /** Handle text input change */
  handleInputChange: (text: string, cursorPosition: number) => void;

  /** Handle keyboard events */
  handleKeyDown: (e: KeyboardEvent) => boolean;

  /** Select current item */
  selectItem: () => void;

  /** Close completion */
  closeCompletion: () => void;

  /** Manually trigger completion (Ctrl+Space) */
  triggerCompletion: () => void;

  /** Get ghost text (if any) */
  getGhostText: () => string | null;

  /** Accept ghost text */
  acceptGhostText: () => void;

  /** Dismiss ghost text */
  dismissGhostText: () => void;
}
```

### Component Integration

**Modified**: `components/chat/chat-input.tsx`

```tsx
// Replace useMention with unified hook
const {
  state: completionState,
  handleInputChange,
  handleKeyDown,
  selectItem,
  closeCompletion,
  getGhostText,
  acceptGhostText,
  dismissGhostText,
} = useInputCompletionUnified({
  providers: [
    { type: 'mention', trigger: 'symbol', triggerChar: '@', priority: 100, enabled: true },
    { type: 'slash', trigger: 'symbol', triggerChar: '/', priority: 90, enabled: true },
    { type: 'emoji', trigger: 'symbol', triggerChar: ':', priority: 80, enabled: isEmojiEnabled },
    { type: 'ai-text', trigger: 'contextual', priority: 50, enabled: isAICompletionEnabled },
  ],
  onSelect: (item) => {
    // Handle item selection
  },
});

// Update textarea onChange
<TextareaAutosize
  onChange={(e) => handleInputChange(e.target.value, e.target.selectionStart)}
  onKeyDown={(e) => {
    if (handleKeyDown(e.nativeEvent)) {
      e.preventDefault();
      return;
    }
    // Existing keyboard handling...
  }}
/>

// Render ghost text overlay
{getGhostText() && (
  <GhostTextOverlay
    text={getGhostText()!}
    onAccept={acceptGhostText}
    onDismiss={dismissGhostText}
    textareaRef={textareaRef}
  />
)}

// Render completion popover based on active provider
{completionState.isOpen && (
  <>
    {completionState.activeProvider === 'mention' && (
      <MentionPopover {...mentionProps} />
    )}
    {completionState.activeProvider === 'slash' && (
      <SlashCommandPopover {...slashProps} />
    )}
    {completionState.activeProvider === 'emoji' && (
      <EmojiPopover {...emojiProps} />
    )}
  </>
)}
```

---

## Configuration & Settings

### Settings Store Extension

**Modified**: `stores/settings/settings-store.ts`

```typescript
interface CompletionSettings {
  // Provider settings
  mentionEnabled: boolean;
  slashCommandsEnabled: boolean;
  emojiEnabled: boolean;
  aiCompletionEnabled: boolean;

  // AI completion settings
  aiCompletionProvider: 'ollama' | 'openai' | 'groq' | 'auto';
  aiCompletionDebounce: number;
  aiCompletionMaxTokens: number;

  // Trigger settings
  slashTriggerChar: string;  // Default: '/'
  emojiTriggerChar: string;  // Default: ':'

  // UI settings
  showInlinePreview: boolean;
  ghostTextOpacity: number;
  autoDismissDelay: number;
  maxSuggestions: number;
}
```

---

## Testing Strategy

### Unit Tests

**Files to Create**:
- `hooks/chat/use-input-completion-unified.test.ts`
- `lib/chat/slash-command-registry.test.ts`
- `lib/ai/completion/completion-cache.test.ts`

### Integration Tests

**Files to Create**:
- `components/chat/chat-input-completion.integration.test.tsx`

### E2E Tests

**Files to Create**:
- `e2e/chat-completion.spec.ts`

**Scenarios**:
1. Type `@` → popover appears → select item → verify insert
2. Type `/` → popover appears → navigate with arrows → select
3. Type text → ghost text appears → Tab to accept
4. Test conflict: @mention open → Tab → mention selected
5. Cross-platform: web vs desktop completion behavior

---

## Accessibility Considerations

1. **Keyboard Navigation**: All completion popovers must be fully navigable
2. **Screen Reader**: ARIA labels and announcements for completions
3. **Focus Management**: Proper focus restoration after selection
4. **High Contrast**: Ghost text must be visible in high contrast mode
5. **Motion Preferences**: Respect `prefers-reduced-motion`

---

## Migration Path

### Backward Compatibility

1. Keep `useMention` hook intact (it's used elsewhere)
2. New `useInputCompletionUnified` wraps existing functionality
3. Gradual migration: switch chat-input first, then other components

### Rollback Plan

1. Feature flags for each completion type
2. Can disable unified system and revert to `useMention`
3. Settings to control provider availability

---

## Success Metrics

1. **User Engagement**
   - Completion acceptance rate (target: >30%)
   - Average time savings per message

2. **Performance**
   - Completion latency: <200ms for local, <500ms for AI
   - No input lag (typing feels instant)

3. **Adoption**
   - Slash command usage
   - AI completion acceptance rate

4. **Quality**
   - Relevant suggestions (measured by dismissal rate)
   - Bug reports related to completion

---

## Open Questions

1. **Emoji Trigger Conflict**: `:` conflicts with markdown emphasis
   - Option A: Only trigger emoji after space
   - Option B: Different trigger (e.g., `::`)
   - Option C: User-configurable

2. **AI Completion Cost**: Frequent API calls may increase costs
   - Implement strict caching
   - Optional feature (disabled by default)
   - Use local models when possible

3. **Mobile Support**: Touch interactions for completion popovers
   - Needs mobile-specific UX consideration

---

## Dependencies

### External Packages

- `@tanstack/react-virtual` - Virtual scrolling (if needed)
- Existing AI SDK - For web completion

### Internal Dependencies

- `types/mcp` - Mention types
- `stores/mcp` - MCP server state
- `stores/tool-history` - Tool usage stats
- `lib/ai` - AI provider integration
- `components/ui/command` - Command component base

---

## References

- Existing investigation: `llmdoc/agent/input-completion-investigation.md`
- Component docs: `components/CLAUDE.md`
- Hook docs: `hooks/CLAUDE.md`
- Type docs: `types/CLAUDE.md`

---

## Appendix: File Inventory

### Files to Create

```
hooks/chat/
  use-input-completion-unified.ts
  use-ai-completion.ts
  use-contextual-suggestions.ts

types/chat/
  input-completion.ts
  slash-commands.ts

lib/chat/
  slash-command-registry.ts
  quick-insert-registry.ts
  emoji-data.ts

lib/ai/completion/
  completion-service.ts
  completion-cache.ts
  context-analyzer.ts

components/chat/popovers/
  slash-command-popover.tsx
  emoji-popover.tsx
  quick-insert-popover.tsx

components/chat/
  ghost-text-overlay.tsx
  contextual-action-bar.tsx

components/settings/
  completion-settings.tsx

stores/settings/
  completion-settings-store.ts

tests/
  hooks/chat/use-input-completion-unified.test.ts
  lib/chat/slash-command-registry.test.ts
  lib/ai/completion/completion-cache.test.ts
  components/chat/chat-input-completion.integration.test.tsx

e2e/
  chat-completion.spec.ts
```

### Files to Modify

```
components/chat/chat-input.tsx
components/chat/core/chat-container.tsx
components/chat/popovers/mention-popover.tsx
hooks/ui/use-mention.ts
stores/settings/settings-store.ts
```

---

**Document Version**: 1.0
**Last Updated**: 2025-01-25
**Status**: Ready for Review
