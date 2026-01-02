# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Cognia is an AI-native chat and creation application with multi-provider support, built as a hybrid web/desktop application:

- **Frontend**: Next.js 16 with React 19.2, TypeScript, and Tailwind CSS v4
- **Desktop Framework**: Tauri 2.9 for cross-platform desktop apps
- **UI Components**: shadcn/ui with Radix UI primitives and Lucide icons
- **State Management**: Zustand stores + Dexie for IndexedDB persistence
- **AI Integration**: Vercel AI SDK with 14+ providers (OpenAI, Anthropic, Google, DeepSeek, Groq, Mistral, Ollama, xAI, Together AI, OpenRouter, Cohere, Fireworks, Cerebras, SambaNova)
- **Agent System**: Autonomous agent execution with tool calling, planning, sub-agent orchestration
- **MCP Support**: Full Model Context Protocol support for extended capabilities
- **Native Tools**: Desktop-only features (selection, awareness, context, screenshot) on Windows/macOS/Linux
- **i18n**: Multi-language support via `next-intl` (English, Chinese)

## Development Commands

```bash
# Frontend
pnpm dev              # Start Next.js dev server (localhost:3000)
pnpm build            # Production build (static export to out/)
pnpm start            # Serve production build
pnpm lint             # Run ESLint
pnpm lint --fix       # Auto-fix ESLint issues

# Testing - Unit
pnpm test             # Run Jest unit tests
pnpm test:watch       # Jest watch mode
pnpm test:coverage    # Jest with coverage (70%+ lines, 60%+ branches)
pnpm test -- path/to/file.test.ts           # Run single test file
pnpm test -- --testNamePattern="test name"  # Run tests matching pattern

# Testing - E2E
pnpm test:e2e         # Run Playwright e2e tests
pnpm test:e2e:ui      # Playwright UI mode
pnpm test:e2e:headed  # Playwright headed browser

# Desktop
pnpm tauri dev        # Run Tauri dev mode
pnpm tauri build      # Build desktop binaries
pnpm tauri info       # Check Tauri environment

# Adding shadcn components
pnpm dlx shadcn@latest add <component>

# Type checking
pnpm exec tsc --noEmit  # TypeScript strict mode check
```

## Architecture

### High-Level Architecture

Cognia is a hybrid web/desktop application that:
1. Runs as a Next.js app during development (`pnpm dev`)
2. Builds to static HTML for Tauri desktop distribution (`pnpm build`)
3. Uses Tauri's Rust backend for native capabilities (MCP process management, file system access, clipboard, screenshots, system monitoring)

**Key constraint**: Production builds use `output: "export"` for static site generation (`next.config.ts`). No server-side API routes can be used in deployed desktop apps—Tauri loads static files from `out/`.

**Native Tools**: Desktop-only features including smart text selection, system monitoring, context awareness, and screenshot capture with OCR. See [llmdoc/feature/native-tools-overview.md](llmdoc/feature/native-tools-overview.md) for details.

### Project Structure

- `app/` — Next.js App Router: `(chat)/`, `settings/`, `designer/`, `projects/`, `native-tools/`, `image-studio/`, `video-editor/`, `workflows/`, `api/`
- `components/` — Feature-based:
  - `ui/` — shadcn/Radix components (50+)
  - `chat/`, `sidebar/`, `settings/`, `artifacts/`, `canvas/`, `designer/`, `projects/`, `presets/`
  - `agent/` — Agent mode components (workflow selector, plan editor, execution steps)
  - `ai-elements/` — 30+ AI-specific components (message, code block, reasoning, artifact, plan)
  - `native/` — Native feature UI: clipboard, screenshot, focus tracking, context awareness
  - `workflow-editor/` — Visual workflow editor with React Flow (nodes, edges, panels, toolbar)
  - `export/`, `layout/`, `providers/`, `skills/`, `learning/`, `screen-recording/`, `selection-toolbar/`
- `lib/` — Domain utilities:
  - `ai/` — AI integration organized in subdirectories:
    - `agent/` — Agent executor, loop, orchestrator, tools
    - `chat/` — Chat utilities
    - `generation/` — Content generation (selection AI, etc.)
    - `memory/` — Memory providers
    - `tools/` — Tool definitions
    - `workflows/` — Workflow definitions
  - `db/`, `document/`, `export/`, `file/`, `i18n/`, `search/`, `themes/`, `vector/`, `native/`, `skills/`, `learning/`, `designer/`
- `hooks/` — Modular hook directories:
  - `ai/` — `use-agent`, `use-background-agent`, `use-skills`, `use-sub-agent`
  - `chat/` — `use-summary`, chat utilities
  - `context/` — `use-clipboard-context`, `use-project-context`
  - `designer/` — `use-designer-drag-drop`, `use-workflow-editor`, `use-workflow-execution`, `use-workflow-keyboard-shortcuts`
  - `media/` — `use-speech`
  - `native/` — `use-native`, `use-notification`, `use-window`
  - `network/` — `use-proxy`
  - `rag/` — RAG-related hooks
  - `sandbox/` — `use-environment`, `use-jupyter-kernel`, `use-session-env`, `use-virtual-env`
  - `ui/` — `use-global-shortcuts`, `use-learning-mode`, `use-learning-tools`, `use-mention`, `use-quote-shortcuts`, `use-selection-toolbar`
  - `utils/` — `use-element-resize`
- `stores/` — Modular store directories:
  - `agent/` — Agent execution tracking
  - `artifact/` — Artifacts, canvas, versions
  - `chat/` — Chat widget state
  - `context/` — Clipboard context, quote state
  - `data/` — Recent files, templates, vectors
  - `designer/` — Designer state, history
  - `document/` — Document management
  - `learning/` — Learning mode state
  - `mcp/` — MCP servers, marketplace
  - `media/` — Media, screen recording
  - `project/` — Projects, activities
  - `settings/` — User settings, presets, custom themes
  - `system/` — Native state, proxy, usage, window
  - `tools/` — Skills
  - `workflow/` — Workflow definitions and execution
- `types/` — TypeScript definitions: provider, message, artifact, session, memory, project, preset, usage, mcp, agent, workflow, learning, skill, environment, summary
- `src-tauri/` — Rust backend: `awareness/`, `context/`, `screenshot/`, `selection/`, `mcp/`, `sandbox/`, `commands/`

### Path Aliases

- `@/components`, `@/lib`, `@/hooks`, `@/stores`, `@/types`, `@/ui` (→ `components/ui`)

## Store Architecture

All Zustand stores use localStorage persistence with the `persist` middleware. Stores are organized in modular directories:

| Directory | Stores | Purpose |
|-----------|--------|---------|
| `stores/agent/` | `agent-store` | Agent execution tracking, tool invocations |
| `stores/artifact/` | `artifact-store` | Artifacts, canvas documents, version history |
| `stores/chat/` | `chat-store`, `chat-widget-store` | Chat sessions, widget state |
| `stores/context/` | `clipboard-context-store`, `quote-store` | Clipboard context, quoted content |
| `stores/data/` | `recent-files-store`, `template-store`, `vector-store` | Recent files, templates, vector data |
| `stores/designer/` | `designer-store`, `designer-history-store` | Designer state, undo/redo history |
| `stores/document/` | `document-store` | Document management |
| `stores/learning/` | `learning-store` | Learning mode state |
| `stores/mcp/` | `mcp-store`, `mcp-marketplace-store` | MCP servers, marketplace |
| `stores/media/` | `media-store`, `screen-recording-store` | Video/image, screen recording |
| `stores/project/` | `project-store`, `project-activity-store` | Projects, knowledge bases, activities |
| `stores/settings/` | `settings-store`, `preset-store`, `custom-theme-store` | User preferences, presets, themes |
| `stores/system/` | `native-store`, `proxy-store`, `usage-store`, `window-store` | Native state, proxy, usage tracking |
| `stores/tools/` | `skill-store` | Custom skills and suggestions |
| `stores/workflow/` | `workflow-store`, `workflow-editor-store` | Workflow definitions and execution |

**Note**: Native tools features (selection, awareness, context, screenshot) are only available in Tauri desktop builds.

## AI Integration

### Supported Providers (14 total)

- OpenAI (`@ai-sdk/openai`): GPT-4o, GPT-4o Mini, o1, o1 Mini
- Anthropic (`@ai-sdk/anthropic`): Claude 4 Sonnet/Opus, Claude 3.5 Haiku
- Google (`@ai-sdk/google`): Gemini 2.0 Flash, Gemini 1.5 Pro/Flash
- Mistral (`@ai-sdk/mistral`): Mistral Large, Mistral Small
- DeepSeek: OpenAI-compatible API (deepseek-chat, deepseek-coder)
- Groq: OpenAI-compatible API (Llama 3.3, Mixtral)
- xAI: OpenAI-compatible API (Grok)
- Together AI: OpenAI-compatible API
- OpenRouter: Multi-provider routing
- Cohere, Fireworks, Cerebras, SambaNova
- Ollama: Self-hosted models at `http://localhost:11434`

### Auto-Router

The auto-router (`lib/ai/auto-router.ts`) supports two routing modes:
- **Rule-based**: Fast pattern matching for simple/complex detection
- **LLM-based**: Uses small models (Groq Llama 3.1, GPT-4o Mini, Gemini Flash) for accurate classification

Three-tier intelligent routing:
- **Fast tier**: Simple queries (Groq Llama 3.3, Gemini Flash, GPT-4o Mini, Haiku)
- **Balanced tier**: General tasks (Gemini 1.5 Pro, GPT-4o, Claude Sonnet)
- **Powerful tier**: Complex reasoning (Claude Opus, o1, DeepSeek Reasoner)

### Key Files

- `lib/ai/client.ts` — Provider client creation with API key rotation
- `lib/ai/use-ai-chat.ts` — Custom chat hook with streaming
- `lib/ai/auto-router.ts` — Intelligent model selection
- `lib/ai/image-utils.ts` — Vision support utilities
- `lib/ai/image-generation.ts` — DALL-E integration
- `lib/ai/summarizer.ts` — Conversation summarization
- `lib/ai/memory/` — Memory provider implementations

## Agent System

### Three-Tier Architecture

1. **Application Layer**: React hooks (`useAgent`, `useBackgroundAgent`), UI panels, settings
2. **Orchestration Layer**: Agent loop, planning, sub-agent coordination, background queue management
3. **Execution Layer**: AgentExecutor with AI SDK `generateText`, unified tool system

### Tool Integration

- **Built-in Tools**: File operations, search, web access
- **MCP Tools**: Full Model Context Protocol integration
- **Skills**: Custom skill execution framework
- **RAG**: Retrieval-augmented generation from knowledge bases

### Key Files

- `lib/ai/agent/agent-executor.ts` — Core execution with tool calling
- `lib/ai/agent/agent-loop.ts` — Multi-step execution loop
- `lib/ai/agent/agent-orchestrator.ts` — Sub-agent coordination
- `lib/ai/agent/background-agent-manager.ts` — Queue and persistence
- `lib/ai/agent/agent-tools.ts` — Built-in tool definitions
- `lib/ai/agent/environment-tools.ts` — Environment/sandbox tools
- `hooks/ai/use-agent.ts` — React hook for agent mode
- `hooks/ai/use-background-agent.ts` — Background agent execution
- `hooks/ai/use-sub-agent.ts` — Sub-agent management

## MCP (Model Context Protocol)

### Rust Backend (`src-tauri/src/mcp/`)
- `manager.rs` — Server lifecycle management
- `client.rs` — JSON-RPC 2.0 protocol implementation
- `transport/stdio.rs` — stdio transport
- `transport/sse.rs` — SSE transport
- `protocol/` — Tools, resources, prompts protocols

### Frontend
- `stores/mcp/mcp-store.ts` — Zustand store for MCP state
- `stores/mcp/mcp-marketplace-store.ts` — MCP marketplace state
- `lib/ai/agent/mcp-tools.ts` — MCP tool integration for agents
- `components/settings/mcp/mcp-settings.tsx` — MCP management UI
- `components/settings/mcp/mcp-server-dialog.tsx` — Add/edit server dialog
- `components/settings/mcp/mcp-install-wizard.tsx` — Quick install wizard

### Server Templates

Built-in quick install templates: Filesystem, GitHub, PostgreSQL, SQLite, Brave Search, Memory, Puppeteer, Slack.

## Native Tools (Desktop Only)

### Features

- **Selection System**: 12 expansion modes, AI-powered actions (explain, translate, summarize), selection history with search, clipboard history with pinning
- **Awareness System**: Real-time system monitoring (CPU, memory, disk, battery, network), activity tracking (12 types), smart suggestions, focus tracking
- **Context System**: Window/app/file/browser/editor detection with 500ms caching
- **Screenshot System**: Multi-mode capture (fullscreen, window, region) with OCR and searchable history

### Platform Support

- **Windows**: Full support (Windows OCR, battery monitoring, browser/editor context)
- **macOS**: Partial support (basic OCR, limited battery monitoring, no browser/editor context)
- **Linux**: Partial support (basic OCR, no battery monitoring, no browser/editor context)

### Key Files

- Rust: `src-tauri/src/awareness/`, `src-tauri/src/context/`, `src-tauri/src/screenshot/`, `src-tauri/src/selection/`
- Frontend: `lib/native/`, `hooks/native/use-*.ts`, `stores/system/native-store.ts`, `components/native/`

## Designer System

V0-style visual web page designer with AI-powered editing:

- **Components**: 40+ component library (14 categories) with drag-drop insertion
- **Live Preview**: Real-time preview with CDN fallback and error handling
- **AI Integration**: AI-powered content generation and editing via `lib/designer/ai.ts`
- **Export**: Export to HTML, React components via `lib/designer/export-utils.ts`
- **Templates**: Built-in templates in `lib/designer/templates.ts`

### Key Files

- `components/designer/core/designer-panel.tsx` — Main designer component
- `components/designer/panels/element-tree.tsx` — Component hierarchy view
- `components/designer/panels/style-panel.tsx` — Visual style editor
- `components/designer/preview/designer-preview.tsx` — Live preview
- `components/designer/toolbar/designer-toolbar.tsx` — Toolbar controls
- `components/designer/dnd/designer-dnd-context.tsx` — Drag-and-drop context
- `stores/designer/designer-store.ts` — Designer state management
- `stores/designer/designer-history-store.ts` — Undo/redo history
- `lib/designer/` — AI, export, templates utilities

## Export System

Multi-format export capabilities in `lib/export/`:

| Format | File | Features |
|--------|------|----------|
| Markdown | `rich-markdown.ts` | GFM, code highlighting, math |
| HTML | `beautiful-html.ts`, `animated-html.ts` | Styled export, animations |
| PDF | `beautiful-pdf.ts` | Formatted PDF generation |
| Word | `word-export.ts` | DOCX via docx library |
| Excel | `excel-export.ts` | XLSX via SheetJS |
| Diagrams | `chat-diagram.ts`, `agent-diagram.ts` | Visual conversation/agent flow |

## Workflow Editor System

Visual workflow editor for creating and executing automation workflows:

- **Visual Editor**: React Flow-based node graph editor with drag-drop nodes
- **Node Types**: Annotation nodes, group nodes, custom nodes for different operations
- **Execution Engine**: Step-by-step workflow execution with debug support
- **Variable Management**: Global and local variables with scope management

### Key Files

- `components/workflow-editor/workflow-editor-panel.tsx` — Main editor component
- `components/workflow-editor/node-palette.tsx` — Available node types
- `components/workflow-editor/custom-edge.tsx` — Custom edge rendering
- `components/workflow-editor/debug-panel.tsx` — Debug visualization
- `components/workflow-editor/execution-panel.tsx` — Execution monitoring
- `stores/workflow/` — Workflow state management
- `hooks/designer/use-workflow-*.ts` — Workflow hooks

## Skills System

Custom skill framework for extending AI capabilities:

- **Skill Definition**: Define custom skills with parameters and execution logic
- **Skill Suggestions**: AI-powered skill recommendations based on context
- **Skill Analytics**: Usage tracking and performance metrics
- **Skill Wizard**: Guided skill creation interface

### Key Files

- `components/skills/skill-panel.tsx` — Main skill management
- `components/skills/skill-editor.tsx` — Skill editing interface
- `components/skills/skill-wizard.tsx` — Guided creation
- `components/skills/skill-suggestions.tsx` — AI recommendations
- `stores/tools/skill-store.ts` — Skill state management
- `lib/skills/` — Skill execution framework
- `hooks/ai/use-skills.ts` — Skills React hook

## Learning Mode

Interactive learning system for educational content:

- `components/learning/learning-mode-panel.tsx` — Main learning interface
- `components/learning/flashcard.tsx` — Flashcard component
- `components/learning/quiz.tsx` — Quiz component
- `components/learning/review-session.tsx` — Review sessions
- `components/learning/learning-history-panel.tsx` — Learning history
- `components/learning/learning-notes-panel.tsx` — Notes management
- `stores/learning/learning-store.ts` — Learning state
- `hooks/ui/use-learning-mode.ts` — Learning mode hook
- `hooks/ui/use-learning-tools.ts` — Learning tools hook
- `lib/learning/prompts.ts` — Learning-specific prompts

## Sandbox System (Code Execution)

Secure code execution environment in `src-tauri/src/sandbox/`:

- **Docker/Podman**: Container-based isolation (`docker.rs`, `podman.rs`)
- **Native**: Direct execution for trusted code (`native.rs`)
- **Languages**: Multi-language support (`languages.rs`)
- **Runtime**: Execution management (`runtime.rs`)

## Internationalization

Multi-language support via `next-intl`:

- `lib/i18n/messages/en.json` — English translations
- `lib/i18n/messages/zh-CN.json` — Chinese translations
- Use `useTranslations()` hook in components

## Component Patterns

### Adding UI Components

```bash
pnpm dlx shadcn@latest add <component>
```

### Creating New Stores

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ExampleState {
  data: string;
  setData: (data: string) => void;
}

export const useExampleStore = create<ExampleState>()(
  persist(
    (set) => ({
      data: '',
      setData: (data) => set({ data }),
    }),
    { name: 'cognia-example' } // localStorage key
  )
);
```

### Styling

- **Tailwind v4**: CSS variables defined in `app/globals.css` with `@theme inline`
- **Dark mode**: Class-based (apply `.dark` class to parent)
- **Utility**: Use `cn()` from `@/lib/utils` to merge Tailwind classes

## Important Constraints

### Static Export Compatibility

- No server-side API routes in production (Tauri loads static files from `out/`)
- Tauri plugins are aliased to stubs in `next.config.ts` for browser builds
- Session management uses Zustand state instead of URL parameters

### Security Notes

- Provider API keys stored in localStorage unencrypted
- MCP server environment variables stored in plaintext config file
- MCP servers run with full system access — only install trusted servers

### Testing Coverage Exclusions

Excluded from coverage (require external services/runtime):
- `lib/search/` — External search APIs (Tavily)
- `lib/vector/` — Vector DB clients (Pinecone, Qdrant, ChromaDB)
- `lib/native/` — Tauri runtime
- `lib/project/import-export.ts` — File system operations

## Development Notes

- Package manager: pnpm (required)
- Static export: `out/` directory for Tauri builds
- Conventional commits: Enforced via commitlint + Husky
- Monaco Editor: Dynamically imported with SSR disabled
- Rust toolchain: v1.77.2+ required for Tauri builds
