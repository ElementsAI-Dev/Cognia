# Cognia Technology Stack

## Introduction

This document provides a comprehensive overview of the technologies used in Cognia, explaining what each technology is, why it was chosen, its specific version, and how it's used in the application.

## Table of Contents

1. [Core Framework](#core-framework)
2. [UI & Styling](#ui--styling)
3. [State Management](#state-management)
4. [Data Persistence](#data-persistence)
5. [AI Integration](#ai-integration)
6. [Desktop Framework](#desktop-framework)
7. [Code Editor](#code-editor)
8. [Testing](#testing)
9. [Build Tools](#build-tools)
10. [Type Safety](#type-safety)

## Core Framework

### Next.js 16.0.0

**What is it?**
Next.js is a React framework that provides features like routing, code splitting, and server-side rendering.

**Why Next.js?**
- File-based routing with App Router
- Built-in optimizations (code splitting, tree shaking)
- Static site generation (`output: "export"`)
- Strong TypeScript support
- Active development and community

**Version Choice:**
Next.js 16 is the latest version with:
- Improved Turbopack bundler
- Better React 19 integration
- Enhanced static export support

**Usage in Cognia:**
```typescript
// app/(chat)/page.tsx - Chat interface route
// app/settings/page.tsx - Settings route
// app/projects/page.tsx - Projects route
```

**Key Configuration:**
```typescript
// next.config.ts
const nextConfig: NextConfig = {
  output: isProd ? "export" : undefined,  // Static export for Tauri
  images: { unoptimized: true },           // Required for static export
  serverExternalPackages: [                // Tauri plugins
    '@tauri-apps/plugin-fs',
    '@tauri-apps/plugin-dialog',
  ],
};
```

### React 19.2.0

**What is it?**
React is a JavaScript library for building user interfaces with components.

**Why React?**
- Component-based architecture
- Virtual DOM for performance
- Large ecosystem and community
- Strong TypeScript support

**Version Choice:**
React 19.2 includes:
- Improved concurrent rendering
- Better Suspense support
- Enhanced form handling
- Server Actions (not used due to static export)

**Usage in Cognia:**
```typescript
// Functional components with hooks
export function ChatContainer() {
  const [messages, setMessages] = useState<Message[]>([]);
  const { sendMessage, stop } = useAIChat({ provider, model });

  return <div>{messages.map(m => <Message key={m.id} {...m} />)}</div>;
}
```

## UI & Styling

### Tailwind CSS v4.1.18

**What is it?**
Tailwind CSS is a utility-first CSS framework for rapidly building custom designs.

**Why Tailwind CSS?**
- Rapid UI development without writing CSS files
- Consistent design system
- Responsive design utilities
- Dark mode support
- Tree-shakeable (unused styles removed)

**Version Choice:**
Tailwind CSS v4 is the latest major version with:
- Inline theme configuration with CSS variables
- No configuration file needed
- Improved performance
- Better TypeScript support

**Usage in Cognia:**
```css
/* app/globals.css */
@theme inline {
  --color-primary: oklch(0.5 0.15 250);
  --color-secondary: oklch(0.6 0.12 250);
  /* Color palette in OKLCH color space */
}
```

```typescript
// Component usage
<button className="bg-primary text-white hover:bg-primary/90">
  Send Message
</button>
```

### shadcn/ui + Radix UI

**What is shadcn/ui?**
shadcn/ui is a collection of re-usable components built with Radix UI and Tailwind CSS.

**What is Radix UI?**
Radix UI provides unstyled, accessible components that serve as the foundation for shadcn/ui.

**Why shadcn/ui?**
- Copy-paste components (not npm package dependency)
- Full customization control
- Accessibility built-in (ARIA attributes, keyboard navigation)
- TypeScript support
- Active maintenance

**Usage in Cognia:**
```bash
# Add new components
pnpm dlx shadcn@latest add command
pnpm dlx shadcn@latest add popover
```

```typescript
// Component usage
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';

<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent>
    <DialogHeader>Settings</DialogHeader>
  </DialogContent>
</Dialog>
```

**Components Used (50+):**
- Button, Input, Textarea
- Dialog, Dropdown Menu, Popover
- Tabs, Accordion, Scroll Area
- Select, Checkbox, Radio Group
- Tooltip, Alert, Toast (Sonner)
- Command (Cmd+K palette)
- And 40+ more...

### Lucide React 0.546.0

**What is it?**
Lucide React is a collection of 1000+ icons as React components.

**Why Lucide?**
- Tree-shakeable (only import used icons)
- Consistent stroke width
- Customizable via props (size, color, stroke)
- Active maintenance

**Usage in Cognia:**
```typescript
import { Send, Mic, Paperclip } from 'lucide-react';

<button><Send className="w-4 h-4" /></button>
```

### Class Variance Authority (CVA) 0.7.1

**What is it?**
CVA is a library for creating variant-based component APIs with Tailwind CSS.

**Why CVA?**
- Type-safe variant props
- Composable styles
- Used by shadcn/ui for component variants

**Usage in Cognia:**
```typescript
const buttonVariants = cva({
  base: "inline-flex items-center justify-center rounded-md font-medium",
  variants: {
    variant: {
      default: "bg-primary text-white",
      destructive: "bg-red-500 text-white",
      outline: "border border-input bg-background",
    },
    size: {
      default: "h-10 px-4 py-2",
      sm: "h-9 rounded-md px-3",
      lg: "h-11 rounded-md px-8",
    },
  },
});

// Usage: <Button variant="destructive" size="lg">Delete</Button>
```

## State Management

### Zustand v5.0.9

**What is it?**
Zustand is a small, fast, and scalable state management solution using simplified flux principles.

**Why Zustand over Redux/Context?**
- Minimal boilerplate
- No Provider components needed
- Built-in TypeScript support
- Persist middleware for localStorage
- Performance (no unnecessary re-renders)
- Small bundle size (~1KB)

**Version Choice:**
Zustand v5 includes:
- Improved TypeScript types
- Better devtools integration
- Enhanced persist middleware

**Usage in Cognia:**
```typescript
// stores/session-store.ts
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

// Component usage
const sessions = useSessionStore(state => state.sessions);
const createSession = useSessionStore(state => state.createSession);
```

**Stores in Cognia:**
| Store | Key | Purpose |
|-------|-----|---------|
| `artifact-store.ts` | cognia-artifacts | Artifacts, canvas, version history |
| `session-store.ts` | cognia-sessions | Chat sessions with branching |
| `settings-store.ts` | cognia-settings | Provider config, theme, instructions |
| `agent-store.ts` | cognia-agents | Agent execution tracking |
| `memory-store.ts` | cognia-memory | Cross-session AI memory |
| `project-store.ts` | cognia-projects | Project organization |
| `usage-store.ts` | cognia-usage | Token and cost tracking |
| `preset-store.ts` | cognia-presets | Chat configuration presets |
| `mcp-store.ts` | (not persisted) | MCP server state |

## Data Persistence

### Dexie v4.2.1 + dexie-react-hooks v4.2.0

**What is Dexie?**
Dexie is a wrapper around IndexedDB that provides a more intuitive API and better TypeScript support.

**Why Dexie over raw IndexedDB?**
- Promise-based API (vs. event-based)
- Type-safe schema definitions
- Query methods similar to SQL
- Reactive hooks for React components
- Better error handling

**Version Choice:**
Dexie v4 provides:
- Improved TypeScript inference
- Better async/await support
- Enhanced observability

**Usage in Cognia:**
```typescript
// lib/db/schema.ts
export const db = new Dexie('CogniaDB');

db.version(1).stores({
  sessions: '++id, title, createdAt, updatedAt',
  messages: '++id, sessionId, createdAt, role, [sessionId+createdAt]',
  documents: '++id, sessionId, type, createdAt',
  projects: '++id, title, createdAt',
  knowledgeFiles: '++id, projectId, filename, uploadedAt',
});

// Repository pattern
export const messageRepository = {
  getBySession: async (sessionId: string) => {
    return await db.messages
      .where('sessionId')
      .equals(sessionId)
      .sortBy('createdAt');
  },
  create: async (message: DBMessage) => {
    return await db.messages.add(message);
  },
};

// Component usage with React hooks
const messages = useLiveQuery(() => db.messages
  .where('sessionId')
  .equals(sessionId)
  .sortBy('createdAt')
);
```

**Schema:**
```typescript
// Tables and indexes
sessions:      '++id, title, createdAt, updatedAt'
messages:      '++id, sessionId, createdAt, role, content, [sessionId+createdAt]'
documents:     '++id, sessionId, type, title, content, language, createdAt'
projects:      '++id, title, description, createdAt'
knowledgeFiles: '++id, projectId, filename, path, uploadedAt'
```

### localStorage

**What is it?**
Browser API for storing key-value pairs persistently.

**Why localStorage?**
- Simple API for key-value data
- Synchronous access (faster for small data)
- Works well with Zustand persist middleware
- Survives browser restarts

**Usage in Cognia:**
- Zustand store persistence (via `createJSONStorage()`)
- Simple settings that don't require IndexedDB complexity

**Limitations:**
- 5-10MB storage limit (vs. IndexedDB's ~1GB)
- Synchronous operations can block main thread
- No structured queries

## AI Integration

### Vercel AI SDK v5 (ai v5.0.115)

**What is it?**
The AI SDK is a TypeScript toolkit for building AI-powered applications with streaming, tool calling, and multi-provider support.

**Why Vercel AI SDK?**
- Unified API for multiple AI providers
- Built-in streaming support
- Tool calling framework
- React hooks (`useChat`, `useCompletion`)
- Type-safe message formats
- Active development by Vercel

**Version Choice:**
AI SDK v5 provides:
- Improved streaming performance
- Better error handling
- Enhanced tool calling
- React 19 support

**Usage in Cognia:**
```typescript
import { generateText, streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';

// Provider client creation
const model = openai('gpt-4o', { apiKey });

// Streaming chat
const result = await streamText({
  model,
  messages: convertedMessages,
  system: systemPrompt,
  temperature: 0.7,
});

for await (const chunk of result.textStream) {
  onChunk(chunk);
}
```

**Supported Providers (7 total):**
| Provider | Package | Models Used |
|----------|---------|-------------|
| OpenAI | `@ai-sdk/openai` v2.0.88 | GPT-4o, GPT-4o Mini, o1, o1 Mini |
| Anthropic | `@ai-sdk/anthropic` v2.0.56 | Claude 4 Sonnet, Claude 4 Opus, Claude 3.5 Haiku |
| Google | `@ai-sdk/google` v2.0.49 | Gemini 2.0 Flash, Gemini 1.5 Pro |
| Mistral | `@ai-sdk/mistral` v2.0.26 | Mistral Large, Mistral Small |
| DeepSeek | `openai` (compatible) | DeepSeek Chat, DeepSeek Reasoner |
| Groq | `openai` (compatible) | Llama 3.3, Mixtral |
| Ollama | `openai` (compatible) | Self-hosted models at `http://localhost:11434` |

### Custom AI Features

**Auto-Router** (`lib/ai/auto-router.ts`):
- Classifies task complexity (simple/moderate/complex)
- Selects optimal model from tiers (fast/balanced/powerful)
- Considers vision, tool, and reasoning requirements
- Fallback mechanisms

**Memory Injection** (`lib/ai/use-ai-chat.ts`):
- Auto-detects memories from user messages
- Injects relevant memories into system prompt
- Cross-session memory persistence

**API Key Rotation**:
- Multiple API keys per provider
- Round-robin or usage-based rotation
- Automatic failover on rate limits

**Usage Tracking**:
- Token counting per message
- Cost estimation
- Provider usage statistics

## Desktop Framework

### Tauri 2.9

**What is Tauri?**
Tauri is a framework for building tiny, fast binaries for all major desktop platforms.

**Why Tauri over Electron?**
- **Smaller bundle size**: ~3MB vs. ~150MB for Electron
- **Better security**: Rust-based backend, no Chromium vulnerabilities
- **Lower memory usage**: 10-20x less than Electron
- **Native performance**: Direct OS API access
- **Web technology frontend**: React/Next.js experience

**Version Choice:**
Tauri 2.9 provides:
- Stable v2 API
- Improved plugin system
- Better Windows support
- Enhanced security model

**Usage in Cognia:**
```rust
// src-tauri/src/main.rs
fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // Initialize MCP manager
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            mcp_add_server,
            mcp_connect_server,
            mcp_call_tool,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

**Tauri Plugins Used:**
- `@tauri-apps/plugin-fs`: File system access
- `@tauri-apps/plugin-dialog`: Native file dialogs
- `@tauri-apps/plugin-shell`: Open URLs, execute commands
- `@tauri-apps/plugin-global-shortcut`: Global keyboard shortcuts
- `@tauri-apps/plugin-notification`: System notifications
- `@tauri-apps/plugin-updater`: Auto-update functionality

**Configuration:**
```json
// src-tauri/tauri.conf.json
{
  "build": {
    "frontendDist": "../out",           // Static files from Next.js build
    "beforeDevCommand": "pnpm dev -p 3001",
    "beforeBuildCommand": "pnpm build"
  },
  "app": {
    "windows": [{
      "title": "Cognia",
      "width": 1400,
      "height": 900,
      "resizable": true
    }]
  }
}
```

### Rust Backend

**Why Rust for MCP?**
- Process management: Spawning stdio child processes
- Performance: Low overhead for JSON-RPC communication
- Safety: Memory safe for concurrent server connections
- Async runtime: Tokio for efficient async I/O

**Key Dependencies:**
```toml
# src-tauri/Cargo.toml
[dependencies]
tauri = { version = "2.9", features = ["shell-open"] }
tokio = { version = "1", features = ["full"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
uuid = { version = "1", features = ["v4"] }
chrono = "0.4"
```

## Code Editor

### Monaco Editor 4.7.0 (@monaco-editor/react)

**What is Monaco Editor?**
Monaco Editor is the code editor that powers VS Code.

**Why Monaco Editor?**
- Feature-rich (IntelliSense, syntax highlighting, multi-cursor)
- 30+ language support out of the box
- Diff view for version comparison
- Keyboard shortcuts similar to VS Code
- Active development by Microsoft

**Usage in Cognia:**
```typescript
import Editor from '@monaco-editor/react';

<Editor
  height="100%"
  language={language}
  value={content}
  onChange={(value) => setContent(value)}
  theme="vs-dark"
  options={{
    minimap: { enabled: false },
    fontSize: 14,
    lineNumbers: 'on',
    scrollBeyondLastLine: false,
  }}
/>
```

**Shiki 3.20.0:**
- Syntax highlighting library used for message code blocks
- 30+ language support
- VS Code-quality highlighting
- Light/dark themes

## Testing

### Jest 30.2.0

**What is Jest?**
Jest is a JavaScript testing framework with built-in assertions, mocking, and test runners.

**Why Jest?**
- Zero configuration required
- Built-in assertions and mocking
- Snapshot testing
- Parallel test execution
- Coverage reporting
- React Testing Library integration

**Configuration:**
```typescript
// jest.config.ts
export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'lib/**/*.{ts,tsx}',
    'stores/**/*.{ts,tsx}',
  ],
  coverageThreshold: {
    global: {
      lines: 70,
      statements: 70,
      branches: 60,
      functions: 60,
    },
  },
};
```

### Playwright 1.57.0

**What is Playwright?**
Playwright is a Node.js library for end-to-end testing across Chromium, Firefox, and WebKit.

**Why Playwright?**
- Cross-browser testing (Chrome, Firefox, Safari)
- Auto-waiting for elements
- Network interception
- Trace files for debugging
- Visual regression testing
- Parallel execution

**Usage in Cognia:**
```typescript
// e2e/chat.spec.ts
test('can send a message and receive response', async ({ page }) => {
  await page.goto('/');
  await page.fill('[data-testid="chat-input"]', 'Hello, AI!');
  await page.click('[data-testid="send-button"]');
  await expect(page.locator('.ai-message')).toBeVisible();
});
```

**Excluded from Coverage:**
- `lib/search/` - External search APIs
- `lib/vector/` - Vector DB clients
- `lib/native/` - Tauri runtime
- `lib/project/import-export.ts` - File system operations

## Build Tools

### Turbopack (Next.js 16)

**What is Turbopack?**
Turbopack is a bundler written in Rust, replacing Webpack in Next.js 16.

**Benefits:**
- 700x faster updates than Webpack
- 10x faster cold starts
- Native Rust performance
- Incremental compilation

### TypeScript 5.9.3

**What is TypeScript?**
TypeScript is a typed superset of JavaScript that compiles to plain JavaScript.

**Why TypeScript?**
- Catch errors at compile time
- Better IDE support (autocomplete, refactoring)
- Self-documenting code
- Safer refactoring
- Improved developer experience

**Configuration:**
```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "preserve",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "allowJs": true,
    "strict": true,
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

### pnpm (Package Manager)

**What is pnpm?**
pnpm is a fast, disk space efficient package manager.

**Why pnpm over npm/yarn?**
- Efficient disk usage (hard links)
- Faster installations
- Strict dependency handling
- Monorepo support
- Works with Node.js module resolution

## Type Safety

### Zod 4.2.1

**What is Zod?**
Zod is a TypeScript-first schema validation library.

**Why Zod?**
- Runtime type validation
- Automatic TypeScript type inference
- Used for API request/response validation
- MCP protocol schema validation

**Usage in Cognia:**
```typescript
import { z } from 'zod';

// Schema definition
const MessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  createdAt: z.date(),
});

// Type inference
type Message = z.infer<typeof MessageSchema>;

// Validation
const result = MessageSchema.parse(rawMessage);
```

## Additional Libraries

### UI Utilities

- **react-resizable-panels**: Split pane views for artifact/canvas panels
- **@tanstack/react-virtual**: Virtual scrolling for large lists
- **embla-carousel-react**: Carousel for artifacts/presets
- **sonner**: Toast notifications
- **cmdk**: Command palette (Cmd+K)

### Data Visualization

- **recharts 3.6.0**: Charting library for usage statistics
- **@xyflow/react**: Flow diagrams for agent visualization
- **vega/vega-lite/react**: Declarative visualization

### File Handling

- **mammoth**: Convert .docx to HTML
- **jszip**: ZIP file creation/extraction
- **xlsx**: Excel file parsing
- **pdfjs-dist**: PDF rendering
- **pptxgenjs**: PowerPoint presentation generation

### Internationalization

- **next-intl**: i18n support for multiple languages
- **date-fns**: Date formatting and manipulation

## Summary

Cognia's technology stack prioritizes:

1. **Developer Experience**: TypeScript, ESLint, Prettier, Husky
2. **Performance**: Zustand, Turbopack, React 19, Tauri
3. **User Experience**: Tailwind CSS, shadcn/ui, Monaco Editor
4. **Type Safety**: TypeScript, Zod, strict mode
5. **Maintainability**: Modular architecture, separation of concerns
6. **Bundle Size**: Tree-shaking, code splitting, pnpm efficiency

### Bundle Size Comparison

| Technology | Approx. Size | Notes |
|------------|-------------|-------|
| Tauri Desktop App | ~3-5 MB | Rust + Webview |
| Electron Equivalent | ~150-200 MB | Chromium + Node |
| Next.js Static Build | ~500 KB - 2 MB | Gzipped, depends on routes |
| Zustand | ~1 KB | Minified |
| React 19 | ~45 KB | Minified |
| AI SDK | ~50 KB | Per provider |

## Related Documentation

- [System Overview](./overview.md) - High-level architecture
- [Data Flow](./data-flow.md) - How data moves through the system
- [MCP Architecture](./mcp-architecture.md) - MCP integration details

**File Path**: `d:\Project\Cognia\docs\architecture\tech-stack.md`
