# Cognia System Architecture Overview

## Introduction

Cognia is a hybrid web/desktop AI chat application that combines the modern React/Next.js web stack with Tauri's native desktop capabilities. This document provides a high-level architectural overview of the system, explaining the key design decisions, patterns, and principles that guide the application's structure.

## Table of Contents

1. [Hybrid Architecture](#hybrid-architecture)
2. [System Layers](#system-layers)
3. [Design Principles](#design-principles)
4. [Architectural Patterns](#architectural-patterns)
5. [Technology Stack Overview](#technology-stack-overview)
6. [Component Organization](#component-organization)

## Hybrid Architecture

Cognia operates in two distinct modes:

### Development Mode (Web)

- Runs as a standard Next.js development server
- Accessible at `http://localhost:3000`
- Full hot-reload and Fast Refresh support
- Uses Turbopack for optimized builds

### Production Mode (Desktop)

- Next.js builds to static HTML/CSS/JS (`output: "export"`)
- Static files emitted to `out/` directory
- Tauri bundles static files into a native desktop application
- No server-side runtime in production

```
+-------------------+     Build Process     +------------------+
|  Development      | -------------------> |  Production      |
|                   |                       |                  |
|  Next.js Dev      |   pnpm build          |  Static Files    |
|  Server           |                       |  (out/ folder)   |
|  (localhost:3000) |                       |                  |
+-------------------+                       +------------------+
       |                                           |
       v                                           v
+-------------------+                   +------------------+
|  Browser          |                   |  Tauri Desktop   |
|                   |                   |  App             |
+-------------------+                   +------------------+
```

### Static-First Constraint

The most critical architectural constraint is the static export requirement:

- **No API Routes**: Production builds cannot use Next.js API routes
- **No Server-Side Rendering**: All rendering must happen client-side
- **No Middleware**: No Next.js middleware for authentication/routing
- **Browser Compatibility**: All code must work in the browser environment

This constraint drives many architectural decisions:

- Client-led state management (Zustand stores)
- Browser storage APIs (localStorage, IndexedDB)
- Direct API calls to AI providers from the client
- Tauri invokes for native capabilities

## System Layers

Cognia's architecture follows a layered approach with clear separation of concerns:

```
+---------------------------------------------------------------+
|                      Presentation Layer                        |
|  React Components (app/, components/)                         |
|  - UI Rendering                                               |
|  - User Interaction                                           |
|  - Event Handling                                             |
+---------------------------+-----------------------------------+
                            |
                            v
+---------------------------------------------------------------+
|                    Business Logic Layer                       |
|  Custom Hooks (hooks/) - organized by category                |
|  - ai/: useAgent, useBackgroundAgent, useSubAgent, useSkills  |
|  - chat/: useMessages, useArtifactDetection                   |
|  - rag/: useRAG, useVectorDB, useMemory, useRAGPipeline       |
|  - media/: useSpeech, useTTS                                  |
|  - ui/: useKeyboardShortcuts                                  |
+---------------------------+-----------------------------------+
                            |
                            v
+---------------------------------------------------------------+
|                     State Management Layer                    |
|  Zustand Stores (stores/) - organized by category             |
|  - agent/: agent, background-agent, sub-agent, skill stores   |
|  - chat/: chat, session, quote, summary, widget stores        |
|  - media/: media, image-studio, screen-recording stores       |
|  - settings/: settings, preset, custom-theme stores           |
|  - system/: ui, usage, environment, proxy, window stores      |
|  - tools/: jupyter, ppt-editor, template stores               |
|  - workflow/: workflow, workflow-editor stores                |
+---------------------------+-----------------------------------+
                            |
                            v
+---------------------------------------------------------------+
|                      Data Access Layer                        |
|  Dexie (IndexedDB), localStorage, Tauri Commands             |
|  - Message persistence                                        |
|  - Document storage                                           |
|  - File system access (Tauri)                                |
|  - MCP server management (Rust)                              |
+---------------------------+-----------------------------------+
                            |
                            v
+---------------------------------------------------------------+
|                   Integration / Native Layer                  |
|  Rust Backend (src-tauri/src/)                               |
|  - MCP server process management                             |
|  - File system operations                                    |
|  - Native OS integration                                     |
+---------------------------------------------------------------+
```

### Layer Responsibilities

**Presentation Layer**

- Pure UI components using React 19.2
- Composition of shadcn/ui primitives
- Display data from stores
- Emit user actions to hooks

**Business Logic Layer**

- Custom hooks encapsulate business logic
- Orchestrate interactions between stores
- Handle side effects (API calls, persistence)
- Reusable across components

**State Management Layer**

- Zustand stores manage application state
- Persistent storage via localStorage
- Type-safe actions and selectors
- Cross-component state sharing

**Data Access Layer**

- Dexie wraps IndexedDB for structured data
- localStorage for simple key-value storage
- Tauri commands for native operations
- Repository pattern for data access

**Integration / Native Layer**

- Rust backend for desktop-specific features
- MCP server lifecycle management
- System-level operations
- Cross-platform compatibility

## Design Principles

### 1. Client-Led Architecture

All application logic runs on the client side:

```typescript
// Provider settings stored in browser localStorage
const providerSettings = useSettingsStore(state => state.providerSettings);

// AI calls made directly from browser
const result = await streamText({
  model: openai('gpt-4o'),
  messages: convertedMessages,
});
```

**Benefits:**

- Simpler deployment (no backend servers)
- Reduced latency (no server round-trips)
- Offline capability
- Privacy (data stays local)

**Trade-offs:**

- API keys stored in browser (unencrypted)
- No server-side validation
- Limited by browser resources

### 2. Modular Components

Components are organized by feature, not type:

```
components/
├── chat/              # Chat interface components
├── artifacts/         # Artifact viewer
├── canvas/            # Monaco editor panel
├── agent/             # Agent execution visualization
├── projects/          # Project management
├── settings/          # Settings pages
├── presets/           # Preset management
├── ai-elements/       # AI-specific UI components
└── ui/                # Generic shadcn/ui components
```

Each feature directory contains:

- React components
- Feature-specific hooks
- Sub-components
- Index file for exports

### 3. Type Safety First

Comprehensive TypeScript coverage:

```typescript
// Centralized type definitions
types/
├── artifact.ts
├── session.ts
├── message.ts
├── provider.ts
├── mcp.ts
├── memory.ts
├── project.ts
├── preset.ts
└── usage.ts
```

- All stores are typed
- Component props are strongly typed
- AI SDK integration uses CoreMessage types
- MCP protocol types defined in Rust and TypeScript

### 4. Separation of Concerns

Clear boundaries between layers:

- **Components** don't call Tauri directly
- **Hooks** manage business logic, not UI
- **Stores** don't make API calls
- **Repositories** handle all data access

```typescript
// Good: Component uses hook
function ChatContainer() {
  const { sendMessage, stop } = useAIChat({ provider, model });
  return <ChatInput onSend={sendMessage} onStop={stop} />;
}

// Bad: Component calls API directly
function ChatContainer() {
  const [loading, setLoading] = useState(false);
  const handleSend = async (msg) => {
    setLoading(true);
    await fetch('/api/chat', ...); // API routes don't work in production!
    setLoading(false);
  };
}
```

### 5. Progressive Enhancement

Core features work without advanced functionality:

- Basic chat works without MCP servers
- Chat works without projects
- All features work without presets
- Voice input falls back gracefully if Web Speech API unavailable

## Architectural Patterns

### 1. Store Pattern (Zustand)

Zustand provides a lightweight, type-safe state management solution:

```typescript
// Store definition
interface SessionState {
  sessions: Session[];
  activeSessionId: string | null;
  createSession: (input?: CreateSessionInput) => Session;
  updateSession: (id: string, updates: UpdateSessionInput) => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      sessions: [],
      activeSessionId: null,
      createSession: (input) => { /* ... */ },
      updateSession: (id, updates) => { /* ... */ },
    }),
    {
      name: 'cognia-sessions',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
```

**Features:**

- Minimal boilerplate
- Built-in persistence via middleware
- TypeScript-first design
- No Context Provider overhead

### 2. Repository Pattern

Data access abstracted behind repositories:

```typescript
// Message repository
export const messageRepository = {
  getBySession: async (sessionId: string) => {
    return await db.messages
      .where('sessionId')
      .equals(sessionId)
      .toArray();
  },

  create: async (message: DBMessage) => {
    return await db.messages.add(message);
  },

  // ... other CRUD operations
};
```

**Benefits:**

- Centralized data access logic
- Easy to swap storage implementations
- Testable (can mock repositories)
- Consistent query patterns

### 3. Command Pattern (Tauri)

Tauri commands for native operations:

```rust
// Rust backend
#[tauri::command]
async fn mcp_add_server(
    id: String,
    config: McpServerConfig,
) -> Result<(), McpError> {
    manager.add_server(id, config).await?;
    Ok(())
}
```

```typescript
// TypeScript frontend
const addServer = async (id: string, config: McpServerConfig) => {
  await invoke('mcp_add_server', { id, config });
};
```

**Benefits:**

- Type-safe invocation (with tauri-cli codegen)
- Async/await on both sides
- Error propagation across FFI boundary
- Clear API contract

### 4. Observer Pattern (Event-Driven)

MCP servers emit events to frontend:

```typescript
// Rust emits events
app_handle.emit("mcp:server-update", &server_state)?;

// Frontend listens
useEffect(() => {
  const unlisten = await listen<McpServerState>(
    'mcp:server-update',
    (event) => {
      // Update store
    }
  );
  return () => unlisten();
}, []);
```

**Use Cases:**

- MCP server state changes
- Tool call progress updates
- Notification delivery
- Health check results

### 5. Strategy Pattern (AI Providers)

Multiple AI providers with common interface:

```typescript
const getProviderModel = (
  provider: ProviderName,
  model: string,
  apiKey: string,
  baseURL?: string
) => {
  switch (provider) {
    case 'openai':
      return openai(model, { apiKey, baseURL });
    case 'anthropic':
      return anthropic(model, { apiKey });
    case 'google':
      return google(model, { apiKey });
    // ... other providers
  }
};
```

**Benefits:**

- Easy to add new providers
- Consistent API across providers
- Auto-routing can select optimal provider
- Fallback mechanisms

## Technology Stack Overview

### Frontend

- **React 19.2**: Latest React with improved rendering and concurrent features
- **Next.js 16**: App Router, Turbopack, static export
- **TypeScript 5**: Type safety and developer experience
- **Tailwind CSS v4**: Utility-first CSS with inline theme configuration
- **shadcn/ui**: Radix UI primitives + CVA variants

### State & Data

- **Zustand v5**: Lightweight state management with persist middleware
- **Dexie v4**: IndexedDB wrapper for structured data
- **localStorage**: Simple key-value storage for Zustand stores

### AI Integration

- **Vercel AI SDK v5**: Unified interface for 7 AI providers
  - OpenAI (GPT-4o, o1, o1-mini)
  - Anthropic (Claude Sonnet/Opus/Haiku)
  - Google (Gemini 1.5 Pro, Gemini 2.0 Flash)
  - Mistral, DeepSeek, Groq, Ollama
- **Auto-router**: Intelligent model selection based on task complexity

### Desktop

- **Tauri 2.9**: Cross-platform desktop framework
  - Rust backend for MCP server management
  - Native windowing and system integration
  - Plugin system for OS capabilities

### Editor

- **Monaco Editor**: VS Code's editor with:
  - 30+ language syntax highlighting
  - IntelliSense support
  - Diff view for version comparison
  - Multi-cursor editing

### Testing

- **Jest**: Unit testing with jsdom environment
- **Playwright**: End-to-end testing with headed/headless modes

## Component Organization

### Feature-Based Structure

Components are organized by feature rather than type:

```
components/
├── chat/                    # Chat interface
│   ├── chat-container.tsx   # Main orchestrator
│   ├── chat-input.tsx       # Input with voice/file support
│   ├── chat-header.tsx      # Mode/model selector
│   ├── messages.tsx         # Message list
│   └── index.ts
│
├── artifacts/               # Artifact system
│   ├── artifact-panel.tsx   # Artifact viewer
│   ├── artifact-preview.tsx # Artifact preview
│   └── index.ts
│
├── canvas/                  # Canvas editor
│   ├── canvas-panel.tsx     # Monaco editor wrapper
│   ├── version-history-panel.tsx
│   └── index.ts
│
├── agent/                   # Agent execution
│   ├── agent-steps.tsx      # Tool execution visualization
│   └── index.ts
│
├── settings/                # Settings pages
│   ├── provider-settings.tsx
│   ├── mcp-settings.tsx
│   └── index.ts
│
└── ui/                      # Generic components (shadcn)
    ├── button.tsx
    ├── dialog.tsx
    ├── dropdown-menu.tsx
    └── 50+ more...
```

### Component Hierarchy

```
app/(chat)/page.tsx
└── components/layout/app-layout.tsx
    ├── components/sidebar/app-sidebar.tsx
    │   ├── components/chat/chat-header.tsx
    │   └── components/sidebar/session-list.tsx
    │
    └── components/chat/chat-container.tsx
        ├── components/chat/welcome-state.tsx
        ├── components/chat/messages.tsx
        │   ├── components/ai-elements/ai-message.tsx
        │   ├── components/ai-elements/reasoning-block.tsx
        │   └── components/ai-elements/tool-call-card.tsx
        │
        └── components/chat/chat-input.tsx
            ├── components/chat/voice-input-button.tsx
            └── components/chat/file-upload-area.tsx
```

### Props vs Store Access

**Props for:**

- Component-specific configuration
- Event handlers
- Derived data
- UI state (open/closed, selected)

**Store for:**

- Application state (sessions, messages)
- User settings (providers, theme)
- Cross-component data (artifacts, MCP servers)
- Persistent data

```typescript
// Good: Use props for component config
<ChatInput
  onSend={handleSendMessage}
  placeholder="Type a message..."
  disabled={isSending}
/>

// Good: Use store for app state
const sessions = useSessionStore(state => state.sessions);
const activeSession = useSessionStore(state => getActiveSession());
```

## Key Architectural Decisions

### Why Static Export?

1. **Desktop App Requirement**: Tauri needs static files for distribution
2. **Simplicity**: No server deployment complexity
3. **Privacy**: All data stays on user's machine
4. **Offline**: No network dependency for core features

### Why Zustand over Redux?

1. **Simplicity**: Less boilerplate than Redux
2. **Performance**: No Context Provider overhead
3. **Type Safety**: Excellent TypeScript support
4. **Persistence**: Built-in persist middleware

### Why Dexie over LocalStorage?

1. **Structure**: IndexedDB supports complex data relationships
2. **Performance**: Async operations, indexes for queries
3. **Capacity**: Much larger storage limit than localStorage
4. **Type Safety**: Strongly typed schema

### Why MCP in Rust?

1. **Process Management**: Rust excels at spawning/managing child processes
2. **Performance**: Low overhead for stdio communication
3. **Safety**: Memory safety for concurrent operations
4. **Cross-Platform**: Consistent behavior across Windows/Mac/Linux

## Conclusion

Cognia's architecture balances simplicity, performance, and maintainability:

- **Hybrid Approach**: Development speed of web, distribution of desktop
- **Client-Led**: No backend complexity, full offline capability
- **Type-Safe**: Comprehensive TypeScript coverage
- **Modular**: Clear separation of concerns, feature-based organization
- **Extensible**: Easy to add new AI providers, MCP servers, features

The static-first constraint drives many architectural decisions, resulting in a clean separation between presentation (React) and integration (Rust), with state management (Zustand) and data access (Dexie) providing the bridge.

## Related Documentation

- [Tech Stack Details](./tech-stack.md) - Detailed technology breakdown
- [Data Flow](./data-flow.md) - Request/response and state synchronization
- [MCP Architecture](./mcp-architecture.md) - MCP system design

**File Path**: `d:\Project\Cognia\docs\architecture\overview.md`

**Last Updated**: January 3, 2026
