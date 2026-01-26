# Designer Module Optimization Plan

## Document Information

- **Project**: Cognia AI Chat Application
- **Module**: Visual Designer (V0-style web page designer)
- **Created**: 2025-01-26
- **Status**: Planning
- **Priority**: High

---

## Executive Summary

The Designer module provides a V0-style visual web page designer with AI-powered editing capabilities. This plan outlines comprehensive optimizations to improve performance, user experience, AI integration, collaboration features, and code quality.

**Current State**:
- 18 built-in templates across 5 categories
- 40+ component library items with drag-drop support
- AI-powered editing with 14+ provider support
- CDN-based package resolution
- Monaco editor integration
- Version history with undo/redo
- Export to CodeSandbox/StackBlitz/ZIP

**Optimization Goals**:
1. Performance: Virtualization, lazy loading, caching
2. AI Capabilities: Conversational editing, intelligent suggestions, context awareness
3. Collaboration: Real-time sync, sharing, permissions
4. User Experience: Visual builder, responsive design, accessibility
5. Code Quality: Test coverage, type safety, documentation

---

## Current State Analysis

### Module Structure

```
designer/
├── lib/designer/              # Core utilities (10 files)
│   ├── ai.ts                  # AI editing (generateText, generateObject)
│   ├── templates.ts           # 18 templates, 12 AI suggestions
│   ├── cdn-resolver.ts        # Multi-CDN package resolution
│   ├── export-utils.ts        # Export functionality
│   ├── tailwind-config.ts     # CSS variables, Tailwind config
│   └── index.ts               # Centralized exports
│
├── stores/designer/           # State management (3 files)
│   ├── designer-store.ts      # Main Zustand store
│   ├── designer-history-store.ts  # Persistent history
│   └── index.ts
│
├── hooks/designer/            # React hooks (10 files)
│   ├── use-designer.ts        # Unified designer hook
│   ├── use-designer-drag-drop.ts  # Drag-drop operations
│   └── [workflow hooks]
│
├── components/designer/       # UI components (40+ files)
│   ├── ai/                    # AI panels (chat, suggestions)
│   ├── core/                  # Browser, panel, card
│   ├── dnd/                   # Drag-drop components
│   ├── editor/                # Monaco, sandbox, file explorer
│   ├── panels/                # Component library, element tree, style panel
│   ├── preview/               # Preview, responsive controls
│   └── toolbar/               # Toolbar, inline editor, shortcuts
│
└── types/designer/            # TypeScript definitions (3 files)
    ├── designer.ts            # DesignerElement, ViewportSize, StyleCategory
    ├── designer-dnd.ts        # Drag types
    └── index.ts
```

### Existing Capabilities

| Feature | Status | Implementation |
|---------|--------|----------------|
| Template System | Complete | 18 templates (React/Vue/HTML) with categories |
| Component Library | Complete | 40+ components in 14 categories |
| AI Editing | Complete | Multi-provider via Vercel AI SDK |
| Drag-Drop | Complete | HTML5 drag-drop with position calculation |
| Version History | Complete | Undo/redo with 50-entry limit |
| Export | Complete | CodeSandbox, StackBlitz, ZIP download |
| Monaco Editor | Complete | CDN-loaded with fallback |
| CDN Resolution | Complete | 4 providers (esm.sh, skypack, unpkg, jsdelivr) |
| Tailwind Support | Complete | CSS variables, theme sync |
| Responsive Preview | Complete | Mobile/tablet/desktop/full viewports |

---

## Identified Gaps and Issues

### 1. Performance Issues

| Issue | Impact | Location |
|-------|--------|----------|
| No virtualization for element trees | Slow with 100+ elements | `components/designer/panels/element-tree.tsx` |
| Monaco loaded synchronously | Initial render delay | `components/designer/editor/monaco-sandpack-editor.tsx:82-84` |
| No lazy loading for components | Large bundle size | `components/designer/` |
| Sandpack rebundles on every change | Slow feedback loop | `components/designer/react-sandbox.tsx` |
| No debouncing on AI suggestions | Excessive API calls | `lib/designer/ai.ts` |

### 2. AI Limitations

| Limitation | Impact | Location |
|------------|--------|----------|
| No conversational context | Single-turn edits only | `lib/designer/ai.ts:executeDesignerAIEdit` |
| Limited suggestion types | 5 hardcoded categories | `lib/designer/ai.ts:aiSuggestionSchema` |
| No code-aware analysis | Misses component patterns | `lib/designer/templates.ts:AI_SUGGESTIONS` |
| No version diff awareness | Regenerates entire code | `lib/designer/ai.ts:cleanAICodeResponse` |
| No streaming responses | Poor UX for large edits | `lib/designer/ai.ts` |

### 3. Collaboration Missing

| Missing Feature | Impact | Priority |
|-----------------|--------|----------|
| Real-time collaboration | No multi-user editing | High |
| Design sharing | No shareable links | High |
| Comments/annotations | No feedback system | Medium |
| Permission system | No access control | Medium |
| Change tracking | No attribution | Low |

### 4. User Experience Gaps

| Gap | Impact | Location |
|-----|--------|----------|
| No visual builder | Code-only editing | `components/designer/panels/style-panel.tsx` |
| Limited responsive tools | Manual viewport switching | `components/designer/preview/responsive-controls.tsx` |
| No design tokens | Manual CSS variables | `lib/designer/tailwind-config.ts` |
| Basic component variants | No variant system | `components/designer/panels/component-library.tsx` |
| No plugin system | Fixed feature set | Core architecture |

### 5. Testing Gaps

| Gap | Coverage | Files |
|-----|----------|-------|
| Drag-drop edge cases | Partial | `hooks/designer/use-designer-drag-drop.test.ts` |
| AI workflow integration | None | Missing |
| Canvas integration | None | Missing |
| Export functionality | Partial | `lib/designer/export-utils.test.ts` |
| E2E scenarios | None | Missing |

### 6. Accessibility Issues

| Issue | Impact | Location |
|-------|--------|----------|
| Limited keyboard navigation | Mouse-dependent | Drag-drop system |
| No screen reader support | Not accessible | Preview canvas |
| Missing focus indicators | Poor focus management | All interactive elements |
| No ARIA labels | Confusing for assistive tech | Component library |

---

## Optimization Plan

### Phase 1: Performance & Stability (Week 1-2)

#### 1.1 Element Tree Virtualization

**Problem**: Element tree renders all nodes recursively, causing slowdowns with 100+ elements.

**Solution**: Implement virtual scrolling with `react-window` or `react-virtuoso`.

**Files to Create**:
- `components/designer/panels/element-tree-virtual.tsx`

**Files to Modify**:
- `components/designer/panels/element-tree.tsx`
- `hooks/designer/use-element-tree-visibility.ts` (new)

**Implementation**:
```typescript
// Virtualized element tree with lazy expansion
interface VirtualElementTreeNode {
  id: string;
  depth: number;
  visible: boolean;
  expanded: boolean;
  childCount: number;
}

// Use react-window with dynamic item height
// Lazy render children on expansion
// Preserve scroll position and selection
```

**Success Criteria**:
- Smooth rendering with 1000+ elements
- < 100ms render time for 500 elements
- Memory usage < 50MB for large trees

#### 1.2 Monaco Editor Lazy Loading

**Problem**: Monaco loads synchronously on mount, blocking initial render.

**Solution**: Dynamic import with code splitting and preloading hint.

**Files to Modify**:
- `components/designer/editor/monaco-sandpack-editor.tsx`

**Implementation**:
```typescript
// Preload Monaco in background
useEffect(() => {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'script';
  link.href = getMonacoCDNUrl();
  document.head.appendChild(link);
}, []);

// Dynamic import with suspense fallback
const Monaco = React.lazy(() => import('@monaco-editor/react'));
```

**Success Criteria**:
- Initial render < 500ms
- Monaco ready in < 2s
- No layout shift during load

#### 1.3 Sandpack Bundling Optimization

**Problem**: Sandpack rebundles on every keystroke, causing 2-5s delays.

**Solution**: Debounced bundling with optimistic updates.

**Files to Create**:
- `hooks/designer/use-sandpack-bundler.ts`

**Files to Modify**:
- `components/designer/react-sandbox.tsx`

**Implementation**:
```typescript
// Debounced bundling with progress indicator
const bundlerState = useSandpackBundler({
  debounceMs: 1000,
  minChangeDelay: 500,
  onProgress: (progress) => setBundlerProgress(progress),
});
```

**Success Criteria**:
- Bundling triggered only after pause
- Progress indicator shown
- Cancel previous bundle on new edit

#### 1.4 Component Lazy Loading

**Problem**: All Designer components loaded upfront, large bundle.

**Solution**: Code-split by feature with React.lazy().

**Files to Modify**:
- `components/designer/index.ts`

**Implementation**:
```typescript
// Lazy load heavy components
export const DesignerPanel = lazy(() => import('./core/designer-panel'));
export const ComponentLibrary = lazy(() => import('./panels/component-library'));
export const VersionHistoryPanel = lazy(() => import('./panels/version-history-panel'));
export const AIChatPanel = lazy(() => import('./ai/ai-chat-panel'));
export const AISuggestionsPanel = lazy(() => import('./ai/ai-suggestions-panel'));
```

**Success Criteria**:
- Initial bundle reduced by 40%
- Code splitting visible in bundle report
- No layout shift during lazy load

---

### Phase 2: AI Capabilities (Week 3-4)

#### 2.1 Conversational AI Editing

**Problem**: Current AI editing is single-turn, no context preservation.

**Solution**: Multi-turn conversation with message history.

**Files to Create**:
- `lib/designer/ai-conversation.ts`
- `hooks/designer/use-ai-conversation.ts`

**Files to Modify**:
- `components/designer/ai/ai-chat-panel.tsx`
- `types/designer/designer.ts` (add conversation types)

**Implementation**:
```typescript
interface AIConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  codeDiff?: CodeDiff;
}

interface CodeDiff {
  type: 'insert' | 'delete' | 'replace';
  range: { start: number; end: number };
  content: string;
}

// Conversation with context
interface AIConversation {
  id: string;
  designerId: string;
  messages: AIConversationMessage[];
  currentCode: string;
  metadata: {
    model: string;
    provider: string;
    tokenCount: number;
  };
}

// Streaming response with updates
async function* streamConversationEdit(
  conversation: AIConversation,
  newMessage: string
): AsyncGenerator<ConversationUpdate> {
  // Stream AI response
  // Apply incremental diffs
  // Update conversation history
}
```

**Success Criteria**:
- Multi-turn conversations with context
- Streaming responses visible in UI
- Conversation history persisted
- Token count tracked

#### 2.2 Intelligent Code Suggestions

**Problem**: Suggestions are generic, not code-aware.

**Solution**: AST-based analysis with pattern recognition.

**Files to Create**:
- `lib/designer/ai-analyzer.ts`
- `lib/designer/ast-parser.ts`

**Files to Modify**:
- `lib/designer/ai.ts` (extend suggestion schemas)

**Implementation**:
```typescript
// AST-based pattern detection
interface CodePattern {
  type: 'component' | 'hook' | 'utility' | 'layout';
  confidence: number;
  suggestions: Suggestion[];
}

interface Suggestion {
  type: 'refactor' | 'optimize' | 'accessibility' | 'responsive';
  title: string;
  description: string;
  code: string;
  priority: 'low' | 'medium' | 'high';
  reasoning: string;
}

// Parse code to AST
function analyzeCodePatterns(code: string): CodePattern[] {
  // Use @babel/parser for React/JSX
  // Detect component patterns
  // Identify optimization opportunities
  // Check accessibility issues
  // Analyze responsive design
}

// Generate contextual suggestions
async function generateContextualSuggestions(
  code: string,
  patterns: CodePattern[]
): Promise<Suggestion[]> {
  // Use AI to generate specific suggestions
  // Based on detected patterns
  // With code examples
}
```

**Success Criteria**:
- Detect 10+ common patterns
- Generate specific, actionable suggestions
- Show reasoning for each suggestion
- Apply suggestions with one click

#### 2.3 AI-Powered Component Generation

**Problem**: Component generation is basic, no variant support.

**Solution**: Multi-variant generation with style options.

**Files to Create**:
- `lib/designer/ai-generator.ts`
- `types/designer/component-generator.ts`

**Files to Modify**:
- `lib/designer/ai.ts` (add generateComponentVariants)

**Implementation**:
```typescript
interface ComponentVariant {
  id: string;
  name: string;
  description: string;
  code: string;
  framework: 'react' | 'vue' | 'html';
  style: 'minimal' | 'modern' | 'brutalist' | 'glassmorphism';
  features: string[];
}

interface ComponentGenerationRequest {
  description: string;
  variants: number;
  styles: string[];
  features: string[];
  framework: 'react' | 'vue' | 'html';
}

async function generateComponentVariants(
  request: ComponentGenerationRequest,
  config: DesignerAIConfig
): Promise<ComponentVariant[]> {
  // Use AI to generate multiple variants
  // With different styles
  // And feature combinations
}
```

**Success Criteria**:
- Generate 3-5 variants per request
- Support style customization
- Include feature selection
- Save variants to library

---

### Phase 3: Collaboration Features (Week 5-6)

#### 3.1 Real-Time Collaboration

**Problem**: No multi-user editing support.

**Solution**: CRDT-based real-time sync with Yjs.

**Files to Create**:
- `lib/designer/collaboration/crdt-doc.ts`
- `lib/designer/collaboration/awareness.ts`
- `hooks/designer/use-designer-collaboration.ts`
- `components/designer/collab/cursor-overlay.tsx`
- `components/designer/collab/user-presence.tsx`

**Files to Modify**:
- `stores/designer/designer-store.ts` (add collaboration state)
- `components/designer/core/designer-panel.tsx`

**Dependencies**:
- `yjs` - CRDT implementation
- `y-websocket` - WebSocket transport
- `y-indexeddb` - Local persistence

**Implementation**:
```typescript
// CRDT document for designer state
interface DesignerCRDTDoc {
  // Code document with collaborative editing
  code: Y.Text;

  // Element tree as shared structure
  elements: Y.Map<DesignerElement>;

  // Selection awareness
  selections: Y.Map<UserSelection>;

  // Cursor positions
  cursors: Y.Map<Cursor>;
}

interface UserSelection {
  userId: string;
  userName: string;
  color: string;
  selectedElementId: string | null;
  cursor: { x: number; y: number };
}

// WebSocket provider for sync
class DesignerCollaboration {
  private doc: Y.Doc;
  private provider: WebsocketProvider;

  connect(roomId: string, userId: string) {
    this.provider = new WebsocketProvider(
      `${WS_URL}/designer/${roomId}`,
      roomId,
      this.doc,
      { connect: true }
    );

    // Bind awareness for cursors
    this.provider.awareness.setLocalStateField('user', {
      id: userId,
      name: getUserName(),
      color: getUserColor(),
    });
  }

  disconnect() {
    this.provider.disconnect();
  }
}
```

**Success Criteria**:
- Real-time code editing with cursors
- Conflict-free merge with CRDT
- User presence indicators
- Automatic reconnection
- Offline support with sync on reconnect

#### 3.2 Design Sharing System

**Problem**: No way to share designs with others.

**Solution**: Shareable links with permission levels.

**Files to Create**:
- `lib/designer/sharing/share-manager.ts`
- `hooks/designer/use-designer-sharing.ts`
- `components/designer/sharing/share-dialog.tsx`
- `components/designer/sharing/permission-settings.tsx`

**Types to Add**:
```typescript
interface ShareableDesign {
  id: string;
  ownerId: string;
  code: string;
  template: DesignerTemplate;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
}

interface SharePermission {
  userId: string;
  level: 'view' | 'comment' | 'edit';
  expiresAt?: Date;
}

interface ShareLink {
  id: string;
  designId: string;
  token: string;
  permission: SharePermission['level'];
  createdAt: Date;
  accessCount: number;
}
```

**Implementation**:
```typescript
// Create shareable link
async function createShareLink(
  designId: string,
  permission: SharePermission['level'],
  expiresAt?: Date
): Promise<ShareLink> {
  // Generate unique token
  // Store in database
  // Return shareable URL
}

// Access shared design
async function accessSharedDesign(
  token: string
): Promise<{ design: ShareableDesign; permission: SharePermission['level'] }> {
  // Validate token
  // Check expiration
  // Return design with permission level
}

// Manage permissions
async function updateSharePermissions(
  designId: string,
  permissions: SharePermission[]
): Promise<void> {
  // Update permission list
  // Notify collaborators
}
```

**Success Criteria**:
- Generate shareable URLs
- Set permission levels (view/comment/edit)
- Optional expiration dates
- Track access count
- Revoke access

#### 3.3 Comments and Annotations

**Problem**: No feedback system for collaborative review.

**Solution**: Element-level comments with threading.

**Files to Create**:
- `lib/designer/collaboration/comments.ts`
- `hooks/designer/use-designer-comments.ts`
- `components/designer/collab/comment-thread.tsx`
- `components/designer/collab/comment-popover.tsx`

**Types to Add**:
```typescript
interface DesignComment {
  id: string;
  designId: string;
  elementId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  resolved: boolean;
  replies: CommentReply[];
}

interface CommentReply {
  id: string;
  commentId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: Date;
}
```

**Implementation**:
```typescript
// Add comment to element
async function addComment(
  designId: string,
  elementId: string,
  content: string
): Promise<DesignComment> {
  // Create comment
  // Link to element
  // Notify collaborators
}

// Thread replies
async function addReply(
  commentId: string,
  content: string
): Promise<CommentReply> {
  // Add reply to thread
  // Notify participants
}

// Resolve comment
async function resolveComment(
  commentId: string
): Promise<void> {
  // Mark as resolved
  // Update UI indicator
}
```

**Success Criteria**:
- Add comments to elements
- Threaded replies
- Resolve/unresolve comments
- Visual indicator for commented elements
- Notification system

---

### Phase 4: User Experience (Week 7-8)

#### 4.1 Visual Property Editor

**Problem**: Properties require code editing, not user-friendly.

**Solution**: Visual editor with common properties.

**Files to Create**:
- `components/designer/panels/visual-editor.tsx`
- `components/designer/panels/property-inputs/`
  - `spacing-input.tsx`
  - `color-picker.tsx`
  - `typography-controls.tsx`
  - `layout-controls.tsx`
- `lib/designer/property-parser.ts`

**Files to Modify**:
- `components/designer/panels/style-panel.tsx`

**Implementation**:
```typescript
// Visual property controls
interface PropertyInput {
  property: string;
  type: 'spacing' | 'color' | 'typography' | 'layout' | 'border' | 'shadow';
  value: string;
  onChange: (value: string) => void;
}

// Spacing input with visual preview
function SpacingInput({ property, value, onChange }: PropertyInput) {
  // Parse value (e.g., "1rem 2rem")
  // Visual box model preview
  // Individual side controls
  // Tailwind class suggestions
}

// Color picker with presets
function ColorPicker({ property, value, onChange }: PropertyInput) {
  // Tailwind color palette
  // Custom color picker
  // Recent colors
  // CSS variable picker
}

// Typography controls
function TypographyControls({ property, value, onChange }: PropertyInput) {
  // Font family dropdown
  // Font size slider/input
  // Font weight buttons
  // Line height slider
  // Letter spacing
}
```

**Success Criteria**:
- Visual controls for 20+ properties
- Live preview in canvas
- Tailwind class generation
- CSS variable support
- Undo/redo support

#### 4.2 Responsive Design Tools

**Problem**: Manual viewport switching, no breakpoint management.

**Solution**: Breakpoint-aware editing with media query support.

**Files to Create**:
- `lib/designer/responsive/breakpoint-manager.ts`
- `hooks/designer/use-responsive-editing.ts`
- `components/designer/preview/breakpoint-controls.tsx`
- `components/designer/preview/media-query-editor.tsx`

**Files to Modify**:
- `types/designer/designer.ts` (add breakpoint types)

**Implementation**:
```typescript
// Breakpoint configuration
interface Breakpoint {
  id: string;
  name: string;
  minWidth: number;
  maxWidth?: number;
  icon: string;
}

const DEFAULT_BREAKPOINTS: Breakpoint[] = [
  { id: 'xs', name: 'Mobile', minWidth: 0, maxWidth: 639, icon: '📱' },
  { id: 'sm', name: 'Small', minWidth: 640, maxWidth: 767, icon: '📱' },
  { id: 'md', name: 'Medium', minWidth: 768, maxWidth: 1023, icon: '💻' },
  { id: 'lg', name: 'Large', minWidth: 1024, maxWidth: 1279, icon: '🖥️' },
  { id: 'xl', name: 'XL', minWidth: 1280, maxWidth: 1535, icon: '🖥️' },
  { id: '2xl', name: '2XL', minWidth: 1536, icon: '🖥️' },
];

// Per-breakpoint styles
interface ResponsiveStyle {
  base: Record<string, string>;
  breakpoints: Record<string, Record<string, string>>;
}

// Media query generator
function generateMediaQueries(
  styles: ResponsiveStyle
): string {
  // Generate Tailwind responsive classes
  // Or custom media queries
}
```

**Success Criteria**:
- Edit per-breakpoint styles
- Visual breakpoint indicator
- Media query preview
- Responsive component library
- Breakpoint duplication

#### 4.3 Design Tokens System

**Problem**: CSS variables are hardcoded, no token management.

**Solution**: Design tokens with semantic naming.

**Files to Create**:
- `lib/designer/tokens/token-manager.ts`
- `lib/designer/tokens/token-registry.ts`
- `components/designer/panels/design-tokens-panel.tsx`
- `components/designer/panels/token-editor.tsx`

**Files to Modify**:
- `lib/designer/tailwind-config.ts` (use tokens)

**Implementation**:
```typescript
// Design token definition
interface DesignToken {
  id: string;
  name: string;
  type: 'color' | 'spacing' | 'typography' | 'radius' | 'shadow';
  value: string;
  semanticName?: string; // e.g., "primary", "danger"
  description?: string;
}

// Token categories
interface TokenCategory {
  id: string;
  name: string;
  tokens: DesignToken[];
}

// Token registry
class TokenRegistry {
  private tokens: Map<string, DesignToken>;

  // Get token by name
  getToken(name: string): DesignToken | undefined;

  // Set token value
  setToken(name: string, value: string): void;

  // Generate CSS variables
  generateCSS(): string;

  // Generate Tailwind config
  generateTailwindConfig(): object;
}

// Apply tokens to component
function applyTokens(
  code: string,
  tokens: DesignToken[]
): string {
  // Replace hardcoded values with token references
  // e.g., "#000" -> "hsl(var(--foreground))"
}
```

**Success Criteria**:
- Define custom design tokens
- Semantic naming
- Token categories
- Apply to components
- Export as CSS/JSON
- Import token sets

#### 4.4 Component Variant System

**Problem**: No variant management for components.

**Solution**: Variant system with inheritance.

**Files to Create**:
- `lib/designer/variants/variant-manager.ts`
- `types/designer/variants.ts`
- `components/designer/panels/variant-editor.tsx`

**Files to Modify**:
- `components/designer/panels/component-library.tsx`

**Implementation**:
```typescript
// Component variant
interface ComponentVariant {
  id: string;
  baseId: string;
  name: string;
  description?: string;
  modifications: {
    className?: string;
    styles?: Record<string, string>;
    content?: string;
  };
}

// Variant manager
class VariantManager {
  // Create variant from component
  createVariant(
    componentId: string,
    name: string
  ): ComponentVariant;

  // Apply variant to element
  applyVariant(
    elementId: string,
    variantId: string
  ): void;

  // Get all variants for component
  getVariants(componentId: string): ComponentVariant[];
}
```

**Success Criteria**:
- Create component variants
- Inherit from base component
- Override properties
- Variant library
- Quick apply from library

---

### Phase 5: Plugin System (Week 9-10)

#### 5.1 Plugin Architecture

**Problem**: Fixed feature set, no extensibility.

**Solution**: Plugin system with hooks.

**Files to Create**:
- `lib/designer/plugins/plugin-manager.ts`
- `lib/designer/plugins/plugin-registry.ts`
- `types/designer/plugins.ts`
- `hooks/designer/use-designer-plugins.ts`

**Implementation**:
```typescript
// Plugin definition
interface DesignerPlugin {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;

  // Lifecycle hooks
  onLoad?: () => void | Promise<void>;
  onUnload?: () => void | Promise<void>;

  // Extension points
  commands?: PluginCommand[];
  components?: PluginComponent[];
  panels?: PluginPanel[];
  aiProviders?: PluginAIProvider[];
}

// Plugin command
interface PluginCommand {
  id: string;
  name: string;
  description: string;
  handler: (context: PluginContext) => void | Promise<void>;
  keybinding?: string;
}

// Plugin component
interface PluginComponent {
  id: string;
  name: string;
  category: string;
  code: string;
  icon?: string;
}

// Plugin panel
interface PluginPanel {
  id: string;
  name: string;
  component: React.ComponentType;
  location: 'left' | 'right' | 'bottom';
}

// Plugin AI provider
interface PluginAIProvider {
  id: string;
  name: string;
  generate: (
    prompt: string,
    context: PluginContext
  ) => Promise<string>;
}

// Plugin execution context
interface PluginContext {
  code: string;
  selectedElement: DesignerElement | null;
  elements: Record<string, DesignerElement>;
  updateCode: (code: string) => void;
  updateElement: (id: string, updates: Partial<DesignerElement>) => void;
}
```

**Success Criteria**:
- Plugin lifecycle management
- Command registration
- Component injection
- Panel registration
- AI provider extension
- Sandboxed execution

#### 5.2 Built-in Plugins

**Problem**: Need example plugins.

**Solution**: Create starter plugins.

**Files to Create**:
- `lib/designer/plugins/builtins/
  - accessibility-plugin.ts
  - seo-plugin.ts
  - animation-plugin.ts
  - export-plugin.ts`

**Implementation**:
```typescript
// Accessibility plugin
const accessibilityPlugin: DesignerPlugin = {
  id: 'accessibility',
  name: 'Accessibility Checker',
  version: '1.0.0',

  commands: [
    {
      id: 'a11y-check',
      name: 'Check Accessibility',
      description: 'Run accessibility audit',
      handler: async (context) => {
        const issues = await checkAccessibility(context.code);
        // Show results in panel
      },
    },
  ],

  panels: [
    {
      id: 'a11y-panel',
      name: 'Accessibility',
      component: AccessibilityPanel,
      location: 'right',
    },
  ],
};

// SEO plugin
const seoPlugin: DesignerPlugin = {
  id: 'seo',
  name: 'SEO Analyzer',
  version: '1.0.0',

  commands: [
    {
      id: 'seo-analyze',
      name: 'Analyze SEO',
      description: 'Analyze page for SEO',
      handler: async (context) => {
        const score = await analyzeSEO(context.code);
        // Show score and suggestions
      },
    },
  ],
};

// Animation plugin
const animationPlugin: DesignerPlugin = {
  id: 'animation',
  name: 'Animation Library',
  version: '1.0.0',

  components: [
    {
      id: 'fade-in',
      name: 'Fade In',
      category: 'Animation',
      code: '<div className="animate-fade-in">Content</div>',
    },
    // More animations...
  ],
};
```

**Success Criteria**:
- 3-5 built-in plugins
- Plugin marketplace integration
- Plugin installation UI
- Plugin documentation

---

### Phase 6: Testing & Quality (Week 11-12)

#### 6.1 Test Coverage

**Problem**: Limited test coverage, missing critical paths.

**Solution**: Comprehensive test suite.

**Files to Create**:

| Test File | Coverage |
|-----------|----------|
| `lib/designer/ai-conversation.test.ts` | Conversational AI |
| `lib/designer/ai-analyzer.test.ts` | Code analysis |
| `lib/designer/collaboration/crdt-doc.test.ts` | CRDT operations |
| `hooks/designer/use-ai-conversation.test.ts` | Conversation hook |
| `hooks/designer/use-designer-collaboration.test.ts` | Collaboration hook |
| `hooks/designer/use-responsive-editing.test.ts` | Responsive editing |
| `components/designer/collab/cursor-overlay.test.tsx` | Cursor display |
| `components/designer/panels/visual-editor.test.tsx` | Visual editor |
| `components/designer/panels/variant-editor.test.tsx` | Variant editor |

**Target Coverage**:
- Lines: 85%+
- Branches: 75%+
- Functions: 80%+

#### 6.2 E2E Testing

**Problem**: No end-to-end tests for Designer workflows.

**Solution**: Playwright E2E tests.

**Files to Create**:
- `e2e/designer/
  - template-selection.spec.ts`
  - `visual-editing.spec.ts`
  - `ai-editing.spec.ts`
  - `collaboration.spec.ts`
  - `export.spec.ts`

**Implementation**:
```typescript
// Template selection
test('select and use template', async ({ page }) => {
  await page.goto('/designer');
  await page.click('[data-testid="template-landing"]');
  await page.click('[data-testid="use-template"]');
  await expect(page.locator('preview')).toContainText('Build something');
});

// Visual editing
test('edit element properties', async ({ page }) => {
  await page.goto('/designer');
  await page.click('[data-element-id="hero"]');
  await page.fill('[data-testid="prop-color"]', '#ff0000');
  await expect(page.locator('preview iframe')).toHaveCSS(/color: rgb(255, 0, 0)/);
});

// AI editing
test('generate component with AI', async ({ page }) => {
  await page.goto('/designer');
  await page.click('[data-testid="ai-input"]');
  await page.fill('[data-testid="ai-input"]', 'Create a login form');
  await page.click('[data-testid="ai-submit"]');
  await expect(page.locator('preview')).toContainText('Login');
});

// Collaboration
test('real-time collaboration', async ({ browser }) => {
  const context1 = await browser.newContext();
  const context2 = await browser.newContext();
  const page1 = await context1.newPage();
  const page2 = await context2.newPage();

  await page1.goto('/designer?room=test');
  await page2.goto('/designer?room=test');

  await page1.click('[data-element-id="hero"]');
  await page1.fill('[data-testid="prop-text"]', 'Changed text');

  await expect(page2.locator('[data-element-id="hero"]')).toContainText('Changed text');
});

// Export
test('export to ZIP', async ({ page }) => {
  await page.goto('/designer');
  await page.click('[data-testid="export-menu"]');
  await page.click('[data-testid="export-zip"]');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('[data-testid="confirm-export"]'),
  ]);

  expect(download.suggestedFilename()).toMatch(/\.zip$/);
});
```

**Success Criteria**:
- 20+ E2E test scenarios
- All critical paths covered
- CI/CD integration
- < 5min total execution time

#### 6.3 Accessibility Testing

**Problem**: Accessibility not validated.

**Solution**: Automated and manual accessibility tests.

**Files to Create**:
- `e2e/designer/accessibility.spec.ts`
- `lib/designer/testing/a11y-audit.ts`

**Implementation**:
```typescript
// Automated a11y tests with axe-core
test('accessibility audit', async ({ page }) => {
  await page.goto('/designer');

  // Run axe-core
  const results = await page.evaluate(() => {
    return axe.run(document);
  });

  expect(results.violations).toHaveLength(0);
});

// Keyboard navigation
test('keyboard navigation', async ({ page }) => {
  await page.goto('/designer');

  // Tab through interface
  await page.keyboard.press('Tab');
  await expect(page.locator(':focus')).toBeVisible();

  // Enter/Space to activate
  await page.keyboard.press('Enter');

  // Escape to close
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-testid="panel"]')).not.toBeVisible();
});

// Screen reader
test('screen reader announcements', async ({ page }) => {
  await page.goto('/designer');

  const announcements = await page.evaluate(() => {
    const liveRegions = document.querySelectorAll('[aria-live]');
    return Array.from(liveRegions).map(el => el.textContent);
  });

  expect(announcements).toContain(expect.stringMatching(/element selected/i));
});
```

**Success Criteria**:
- Zero axe violations
- Full keyboard navigation
- Screen reader compatible
- ARIA labels complete
- Focus management correct

#### 6.4 Performance Testing

**Problem**: No performance benchmarks.

**Solution**: Performance test suite.

**Files to Create**:
- `e2e/designer/performance.spec.ts`
- `lib/designer/testing/benchmarks.ts`

**Implementation**:
```typescript
// Performance metrics
test('initial load performance', async ({ page }) => {
  const metrics = await page.goto('/designer').then(response => {
    return response?.timing();
  });

  expect(metrics?.responseEnd).toBeLessThan(3000); // 3s load
});

// Large tree performance
test('large element tree performance', async ({ page }) => {
  await page.goto('/designer');

  // Generate 500 elements
  await page.evaluate(() => {
    for (let i = 0; i < 500; i++) {
      window.designerStore.addElement({
        tagName: 'div',
        className: 'test',
      });
    }
  });

  // Measure render time
  const renderTime = await page.evaluate(() => {
    const start = performance.now();
    // Trigger re-render
    window.designerStore.setViewport('mobile');
    return performance.now() - start;
  });

  expect(renderTime).toBeLessThan(500); // < 500ms
});

// Memory leak test
test('no memory leaks on repeated operations', async ({ page }) => {
  await page.goto('/designer');

  const initialMemory = await page.evaluate(() => {
    return (performance as any).memory.usedJSHeapSize;
  });

  // Perform 100 operations
  for (let i = 0; i < 100; i++) {
    await page.click('[data-testid="add-element"]');
    await page.click('[data-testid="undo"]');
  }

  const finalMemory = await page.evaluate(() => {
    return (performance as any).memory.usedJSHeapSize;
  });

  // Memory should not grow > 10MB
  expect(finalMemory - initialMemory).toBeLessThan(10 * 1024 * 1024);
});
```

**Success Criteria**:
- Initial load < 3s
- Large tree render < 500ms
- No memory leaks
- Bundle size < 500KB
- Lighthouse score > 90

---

## Implementation Roadmap

### Week 1-2: Performance & Stability
- Day 1-3: Element tree virtualization
- Day 4-5: Monaco lazy loading
- Day 6-8: Sandpack optimization
- Day 9-10: Component lazy loading
- Day 11-12: Testing and bug fixes

### Week 3-4: AI Capabilities
- Day 1-4: Conversational AI
- Day 5-7: Intelligent suggestions
- Day 8-10: Component generation
- Day 11-12: Testing and integration

### Week 5-6: Collaboration
- Day 1-5: Real-time collaboration (Yjs)
- Day 6-8: Design sharing
- Day 9-10: Comments and annotations
- Day 11-12: Testing and deployment

### Week 7-8: User Experience
- Day 1-3: Visual property editor
- Day 4-5: Responsive design tools
- Day 6-7: Design tokens
- Day 8-10: Component variants
- Day 11-12: Testing and refinement

### Week 9-10: Plugin System
- Day 1-5: Plugin architecture
- Day 6-8: Built-in plugins
- Day 9-10: Plugin marketplace
- Day 11-12: Testing and documentation

### Week 11-12: Testing & Quality
- Day 1-4: Unit tests (85%+ coverage)
- Day 5-7: E2E tests (20+ scenarios)
- Day 8-9: Accessibility tests
- Day 10-11: Performance benchmarks
- Day 12: Final validation and documentation

---

## Success Metrics

### Performance
| Metric | Current | Target |
|--------|---------|--------|
| Initial load time | ~3s | < 2s |
| Monaco ready time | ~2s | < 1.5s |
| Large tree render | ~1s | < 500ms |
| Bundle size | ~600KB | < 500KB |
| Memory usage | ~100MB | < 80MB |

### Functionality
| Feature | Status |
|---------|--------|
| Conversational AI | Planned |
| Intelligent suggestions | Planned |
| Real-time collaboration | Planned |
| Visual editor | Planned |
| Responsive tools | Planned |
| Design tokens | Planned |
| Component variants | Planned |
| Plugin system | Planned |

### Quality
| Metric | Current | Target |
|--------|---------|--------|
| Test coverage (lines) | ~60% | > 85% |
| Test coverage (branches) | ~50% | > 75% |
| E2E scenarios | 0 | > 20 |
| Accessibility violations | Unknown | 0 |
| Lighthouse score | Unknown | > 90 |

### User Experience
| Metric | Target |
|--------|--------|
| Time to first template | < 10s |
| AI response time | < 5s |
| Drag-drop latency | < 100ms |
| Collaboration sync latency | < 200ms |
| Satisfaction score | > 4.5/5 |

---

## Dependencies

### New Packages Required

| Package | Purpose | Version |
|---------|---------|---------|
| `react-window` | Virtual scrolling | ^1.8.10 |
| `react-virtuoso` | Alternative virtualization | ^4.7.0 |
| `yjs` | CRDT implementation | ^13.6.10 |
| `y-websocket` | WebSocket provider | ^1.5.0 |
| `y-indexeddb` | Local persistence | ^9.0.12 |
| `@babel/parser` | AST parsing | ^7.24.0 |
| @babel/types` | AST types | ^7.24.0 |
| `uuid` | UUID generation | ^9.0.1 |
| `nanoid` | Alternative IDs | ^5.0.4 |
| `date-fns` | Date utilities | ^3.0.0 |

### Optional Enhancements

| Package | Purpose |
|---------|---------|
| `perfect-freehand` | Hand drawing |
| `react-markdown` | Markdown rendering |
| `react-syntax-highlighter` | Code highlighting |
| `framer-motion` | Animations |
| `recharts` | Charts |
| `@tanstack/react-query` | Data fetching |

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Yjs learning curve | Medium | Start with simple sync, add features incrementally |
| AST parsing complexity | Medium | Use battle-tested @babel packages, limit scope |
| Plugin security | High | Sandboxed execution, code review, permissions |
| Performance regression | Medium | Benchmark before/after, monitor metrics |
| Bundle size growth | Medium | Code splitting, lazy loading, tree shaking |
| Collaboration conflicts | Low | CRDT prevents conflicts, operational transforms |
| AI API costs | Medium | Caching, debouncing, token limits |
| Browser compatibility | Low | Progressive enhancement, fallbacks |

---

## Documentation Updates

### Files to Create

| File | Purpose |
|------|---------|
| `docs/features/designer-ai.md` | AI features guide |
| `docs/features/designer-collaboration.md` | Collaboration guide |
| `docs/features/designer-plugins.md` | Plugin development |
| `docs/api/designer-plugin-api.md` | Plugin API reference |
| `docs/guides/designer-tutorials.md` | User tutorials |

### Files to Update

| File | Updates |
|------|---------|
| `CLAUDE.md` | Add new features, update counts |
| `llmdoc/index.md` | Add new documentation links |
| `llmdoc/feature/designer-system.md` | Update feature docs |
| `types/designer/index.ts` | Export new types |

---

## Open Questions

1. **Backend Requirements**: Does collaboration require a backend server, or can we use a public WebSocket relay?
2. **Storage**: Where are shared designs stored? Database vs file system?
3. **Authentication**: How are users authenticated for collaboration?
4. **AI Costs**: How do we track and limit AI usage per user?
5. **Plugin Distribution**: How are plugins distributed? Central marketplace vs npm?

---

## Next Steps

1. **Review and Approve**: Get stakeholder approval on this plan
2. **Prioritize Phases**: Determine if any phases should be reordered
3. **Resource Planning**: Assign developers to each phase
4. **Setup Infrastructure**: Provision backend services for collaboration
5. **Begin Implementation**: Start with Phase 1 (Performance & Stability)

---

**Document Version**: 1.0
**Last Updated**: 2025-01-26
**Status**: Ready for Review
