# Cognia Project Structure

This document provides a comprehensive overview of the Cognia project structure, including directory organization, file naming conventions, and where to place new code.

## Table of Contents

- [Directory Tree](#directory-tree)
- [Directory Purposes](#directory-purposes)
- [File Naming Conventions](#file-naming-conventions)
- [Import Path Aliases](#import-path-aliases)
- [Where to Put New Code](#where-to-put-new-code)
- [Key Files and Their Roles](#key-files-and-their-roles)

## Directory Tree

```
d:\Project\Cognia/
├── app/                                    # Next.js App Router
│   ├── (chat)/                             # Chat route group (shared layout)
│   │   ├── layout.tsx                      # Chat layout
│   │   └── page.tsx                        # Main chat interface
│   ├── settings/                           # Settings pages
│   │   └── page.tsx                        # Settings with tabs
│   ├── projects/                           # Project management
│   │   └── page.tsx                        # Projects list and details
│   ├── designer/                           # Designer/Canvas pages
│   ├── chat-widget/                        # Embeddable chat widget
│   ├── api/                                # API routes (dev-time only)
│   │   ├── chat-widget/                    # Widget API endpoints
│   │   ├── enhance-builtin-prompt/         # Prompt enhancement
│   │   ├── generate-preset/                # Preset generation
│   │   └── ...                             # Other API routes
│   ├── page.tsx                            # Landing page
│   ├── layout.tsx                          # Root layout
│   ├── providers.tsx                       # Client providers wrapper
│   └── globals.css                         # Global styles & Tailwind config
│
├── components/                             # React components (feature-based)
│   ├── ai-elements/                        # AI-specific component library (30+)
│   ├── agent/                              # Agent mode components (19 items)
│   ├── artifacts/                          # Artifacts system components
│   ├── canvas/                             # Canvas editor components
│   ├── chat/                               # Chat interface components (121 items)
│   ├── chat-widget/                        # Embeddable chat widget (8 items)
│   ├── designer/                           # Visual designer components (70 items)
│   ├── export/                             # Export functionality components
│   ├── image-studio/                       # Image editing studio (15 items)
│   ├── jupyter/                            # Jupyter notebook integration (7 items)
│   ├── layout/                             # Layout components (header, sidebar)
│   ├── learning/                           # Learning mode components (23 items)
│   ├── native/                             # Native desktop features (18 items)
│   ├── presets/                            # Preset system components
│   ├── projects/                           # Project management components
│   ├── providers/                          # Provider components
│   ├── sandbox/                            # Code sandbox components
│   ├── screen-recording/                   # Screen recording UI (5 items)
│   ├── selection-toolbar/                  # Selection toolbar (11 items)
│   ├── settings/                           # Settings page components (96 items)
│   ├── sidebar/                            # Sidebar components
│   ├── skills/                             # Skills system components (25 items)
│   ├── ui/                                 # shadcn/ui base components (41 items)
│   └── workflow/                            # Workflow components
│       ├── editor/                         # Visual workflow editor (50 items)
│       └── marketplace/                    # Template marketplace
│
├── hooks/                                  # Custom React hooks (organized by category)
│   ├── ai/                                 # AI/Agent hooks (18 items)
│   │   ├── use-agent.ts                    # Agent mode execution
│   │   ├── use-background-agent.ts         # Background agent management
│   │   ├── use-sub-agent.ts                # Sub-agent orchestration
│   │   ├── use-skills.ts                   # Skills integration
│   │   ├── use-structured-output.ts        # Zod-structured output
│   │   ├── use-unified-tools.ts            # Unified tool system
│   │   ├── use-plan-executor.ts            # Plan execution
│   │   ├── use-ollama.ts                   # Ollama integration
│   │   └── use-ai-registry.ts              # AI model registry
│   ├── chat/                               # Chat hooks (11 items)
│   │   ├── use-messages.ts                 # Message persistence
│   │   ├── use-artifact-detection.ts       # Artifact detection
│   │   └── ...
│   ├── context/                            # Context/Awareness hooks (9 items)
│   ├── designer/                           # Designer hooks (14 items)
│   ├── media/                              # Media hooks (8 items)
│   ├── native/                             # Native/Window hooks (14 items)
│   ├── network/                            # Network/Proxy hooks (7 items)
│   ├── rag/                                # RAG/Vector hooks (12 items)
│   │   ├── use-rag.ts                      # RAG retrieval
│   │   ├── use-vector-db.ts                # Vector database
│   │   ├── use-memory.ts                   # Memory management
│   │   ├── use-memory-provider.ts          # Memory provider
│   │   └── use-rag-pipeline.ts             # RAG pipeline
│   ├── sandbox/                            # Sandbox hooks (12 items)
│   ├── ui/                                 # UI hooks (21 items)
│   ├── utils/                              # Utility hooks (9 items)
│   ├── use-chat-widget.ts                  # Chat widget hook
│   └── index.ts                            # Hook exports
│
├── lib/                                    # Utility libraries
│   ├── ai/                                 # AI integration (170+ items)
│   │   ├── agent/                          # Agent system (22 items)
│   │   │   ├── agent-executor.ts           # Agent execution
│   │   │   ├── agent-loop.ts               # Agent loop
│   │   │   ├── agent-orchestrator.ts       # Multi-agent orchestration
│   │   │   ├── background-agent-manager.ts # Background agents
│   │   │   ├── sub-agent-executor.ts       # Sub-agent execution
│   │   │   ├── environment-tools.ts        # Environment tools
│   │   │   ├── jupyter-tools.ts            # Jupyter tools
│   │   │   └── mcp-tools.ts                # MCP tools
│   │   ├── core/                           # Core AI utilities (11 items)
│   │   ├── embedding/                      # Embedding utilities (9 items)
│   │   ├── generation/                     # Generation utilities (20 items)
│   │   ├── infrastructure/                 # Infrastructure (9 items)
│   │   ├── media/                          # Media processing (12 items)
│   │   ├── memory/                         # Memory system (15 items)
│   │   ├── prompts/                        # Prompt templates
│   │   ├── providers/                      # Provider utilities (7 items)
│   │   ├── rag/                            # RAG system (16 items)
│   │   ├── tools/                          # Tool definitions (32 items)
│   │   ├── tts/                            # Text-to-speech (6 items)
│   │   └── workflows/                      # Workflow definitions (8 items)
│   ├── db/                                 # Database (Dexie)
│   │   ├── index.ts                        # Dexie setup
│   │   ├── schema.ts                       # Database schema
│   │   └── repositories/                   # Data access layer
│   ├── designer/                           # Designer utilities (9 items)
│   ├── document/                           # Document processing (22 items)
│   ├── export/                             # Export utilities (24 items)
│   ├── file/                               # File utilities
│   ├── geolocation/                        # Geolocation utilities (5 items)
│   ├── i18n/                               # Internationalization (8 items)
│   ├── jupyter/                            # Jupyter utilities (5 items)
│   ├── learning/                           # Learning mode utilities (8 items)
│   ├── mcp/                                # MCP utilities (5 items)
│   ├── native/                             # Tauri native wrappers (23 items)
│   ├── search/                             # Search utilities (14 items)
│   ├── skills/                             # Skills system utilities (8 items)
│   ├── themes/                             # Theme configuration
│   ├── vector/                             # Vector database (9 items)
│   ├── workflow/                           # Workflow utilities
│   │   ├── editor/                         # Workflow editor utils (10 items)
│   │   └── marketplace/                    # Marketplace utils
│   └── utils.ts                            # Common utilities (cn, etc.)
│
├── stores/                                 # Zustand state management (organized by category)
│   ├── agent/                              # Agent stores (9 items)
│   │   ├── agent-store.ts                  # Agent execution tracking
│   │   ├── background-agent-store.ts       # Background agents
│   │   ├── sub-agent-store.ts              # Sub-agents
│   │   └── skill-store.ts                  # Skills state
│   ├── artifact/                           # Artifact stores
│   ├── chat/                               # Chat stores (10 items)
│   │   ├── chat-store.ts                   # Chat state
│   │   ├── session-store.ts                # Sessions, branches
│   │   ├── quote-store.ts                  # Text quotations
│   │   ├── summary-store.ts                # Summaries
│   │   └── chat-widget-store.ts            # Widget state
│   ├── context/                            # Context stores (5 items)
│   │   ├── clipboard-context-store.ts      # Clipboard monitoring
│   │   └── selection-store.ts              # Selection state
│   ├── data/                               # Data stores (5 items)
│   │   ├── memory-store.ts                 # Cross-session memory
│   │   └── vector-store.ts                 # Vector DB state
│   ├── designer/                           # Designer stores (5 items)
│   ├── document/                           # Document stores
│   ├── learning/                           # Learning stores
│   ├── mcp/                                # MCP stores (5 items)
│   │   ├── mcp-store.ts                    # MCP server management
│   │   └── mcp-marketplace-store.ts        # MCP marketplace
│   ├── media/                              # Media stores (7 items)
│   │   ├── media-store.ts                  # Images/videos
│   │   ├── image-studio-store.ts           # Image editor
│   │   └── screen-recording-store.ts       # Screen recording
│   ├── project/                            # Project stores (5 items)
│   ├── settings/                           # Settings stores (7 items)
│   │   ├── settings-store.ts               # User settings
│   │   ├── preset-store.ts                 # Presets
│   │   └── custom-theme-store.ts           # Custom themes
│   ├── system/                             # System stores (16 items)
│   │   ├── ui-store.ts                     # UI state
│   │   ├── usage-store.ts                  # Token/cost tracking
│   │   ├── environment-store.ts            # Environment state
│   │   ├── proxy-store.ts                  # Proxy configuration
│   │   ├── window-store.ts                 # Window state
│   │   └── virtual-env-store.ts            # Virtual environments
│   ├── tools/                              # Tools stores (6 items)
│   │   ├── jupyter-store.ts                # Jupyter sessions
│   │   ├── ppt-editor-store.ts             # PPT editor
│   │   └── template-store.ts               # Templates
│   ├── workflow/                           # Workflow stores (5 items)
│   │   ├── workflow-store.ts               # Workflow execution
│   │   └── workflow-editor-store.ts        # Editor state
│   └── index.ts                            # Store exports
│
├── types/                                  # TypeScript type definitions (53 files)
│   ├── agent.ts                            # Agent types
│   ├── agent-mode.ts                       # Agent mode types
│   ├── artifact.ts                         # Artifact types
│   ├── audio.ts                            # Audio types
│   ├── background-agent.ts                 # Background agent types
│   ├── cache.ts                            # Cache types
│   ├── chat-input.ts                       # Chat input types
│   ├── compression.ts                      # Compression types
│   ├── designer.ts                         # Designer types
│   ├── document.ts                         # Document types
│   ├── environment.ts                      # Environment types
│   ├── geolocation.ts                      # Geolocation types
│   ├── image-studio.ts                     # Image studio types
│   ├── jupyter.ts                          # Jupyter types
│   ├── learning.ts                         # Learning mode types
│   ├── mcp.ts                              # MCP types
│   ├── mcp-marketplace.ts                  # MCP marketplace types
│   ├── memory.ts                           # Memory types
│   ├── memory-provider.ts                  # Memory provider types
│   ├── message.ts                          # Message types
│   ├── ollama.ts                           # Ollama types
│   ├── openrouter.ts                       # OpenRouter types
│   ├── preset.ts                           # Preset types
│   ├── project.ts                          # Project types
│   ├── prompt.ts                           # Prompt types
│   ├── provider.ts                         # Provider configuration
│   ├── proxy.ts                            # Proxy types
│   ├── rag.ts                              # RAG types
│   ├── research.ts                         # Research types
│   ├── sandbox.ts                          # Sandbox types
│   ├── search.ts                           # Search types
│   ├── selection-toolbar.ts                # Selection toolbar types
│   ├── session.ts                          # Session types
│   ├── skill.ts                            # Skill types
│   ├── speech.ts                           # Speech types
│   ├── structured-output.ts                # Structured output types
│   ├── sub-agent.ts                        # Sub-agent types
│   ├── summary.ts                          # Summary types
│   ├── template.ts                         # Template types
│   ├── tool.ts                             # Tool types
│   ├── tts.ts                              # TTS types
│   ├── usage.ts                            # Usage tracking types
│   ├── vector.ts                           # Vector types
│   ├── video.ts                            # Video types
│   ├── websocket.ts                        # WebSocket types
│   ├── workflow.ts                         # Workflow types
│   ├── workflow-editor.ts                  # Workflow editor types
│   └── index.ts                            # Type exports
│
├── e2e/                                    # Playwright end-to-end tests
│   ├── ai/                                 # AI feature tests (11 items)
│   ├── core/                               # Core feature tests (11 items)
│   ├── features/                           # Feature-specific tests (65 items)
│   ├── integration/                        # Integration tests (5 items)
│   └── ui/                                 # UI component tests
│
├── src-tauri/                              # Tauri desktop backend
│   ├── src/
│   │   ├── main.rs                         # Rust entry point
│   │   ├── lib.rs                          # Library code
│   │   ├── http.rs                         # HTTP utilities
│   │   ├── awareness/                      # System awareness
│   │   ├── chat_widget/                    # Chat widget backend
│   │   ├── commands/                       # Tauri commands
│   │   │   ├── mod.rs
│   │   │   └── vector.rs                   # Vector DB commands
│   │   └── mcp/                            # MCP implementation
│   │       ├── mod.rs
│   │       ├── manager.rs                  # Server lifecycle
│   │       ├── client.rs                   # MCP client
│   │       ├── config.rs                   # Configuration
│   │       ├── transport/                  # Transport layer
│   │       └── protocol/                   # Protocol implementation
│   ├── tauri.conf.json                     # Tauri configuration
│   ├── Cargo.toml                          # Rust dependencies
│   └── capabilities/                       # Permissions config
│
├── docs/                                   # Documentation
│   ├── README.md                           # Documentation index
│   ├── api/                                # API reference (6 items)
│   ├── architecture/                       # Architecture docs (4 items)
│   ├── development/                        # Development guides (6 items)
│   └── features/                           # Feature documentation (13 items)
│
├── public/                                 # Static assets
│   └── icons/                              # Application icons
│
├── __mocks__/                              # Jest mocks (20+ items)
│
├── .github/                                # GitHub configuration
│   └── workflows/                          # CI/CD pipelines (7 items)
│
├── .windsurf/                              # Windsurf workflows
│   └── workflows/                          # Workflow definitions
│
├── .specify/                               # Specify templates
│   ├── memory/                             # Constitution
│   └── templates/                          # Document templates
│
├── components.json                         # shadcn/ui configuration
├── next.config.ts                          # Next.js configuration
├── tsconfig.json                           # TypeScript configuration
├── jest.config.ts                          # Jest configuration
├── playwright.config.ts                    # Playwright configuration
├── eslint.config.mjs                       # ESLint configuration
├── postcss.config.mjs                      # PostCSS configuration
├── package.json                            # Dependencies and scripts
├── pnpm-lock.yaml                          # pnpm lock file
├── AGENTS.md                               # Agent development guidelines
├── CLAUDE.md                               # Claude AI instructions
├── GEMINI.md                               # Gemini AI instructions
├── WARP.md                                 # Warp AI instructions
└── README.md                               # Project README
```

## Directory Purposes

### `/app` - Next.js App Router

Contains all application pages and routing logic using Next.js 16 App Router.

**Key Files**:

- `page.tsx` - Landing page
- `layout.tsx` - Root layout with providers
- `providers.tsx` - Client-side provider wrapper
- `globals.css` - Global styles and Tailwind v4 configuration

**Route Groups**:

- `(chat)/` - Chat interface with shared layout
- `settings/` - Settings pages (7 tabs)
- `projects/` - Project management
- `designer/` - Designer/Canvas workspace
- `skills/` - Skills system pages

**Convention**:

- Use route groups `(name)` for shared layouts without URL segments
- One `page.tsx` per route
- Keep pages thin, delegate to components

### `/components` - React Components

Feature-based component organization. Each subdirectory represents a major feature area.

**Key Directories**:

#### `/components/ui`

Base UI components from shadcn/ui (41+ components). These are generic, reusable components.

**Examples**: `button.tsx`, `dialog.tsx`, `dropdown-menu.tsx`, `input.tsx`

#### `/components/chat`

Chat interface components (121 items).

**Files**:

- `chat-container.tsx` - Main orchestrator
- `chat-input.tsx` - Message input with voice and file upload
- `chat-header.tsx` - Mode/model/preset selector
- `welcome-state.tsx` - Welcome screen

#### `/components/ai-elements`

AI-specific component library with 30+ specialized components for AI-powered applications.

**Examples**: `message.tsx`, `code-block.tsx`, `reasoning.tsx`, `artifact.tsx`, `plan.tsx`

#### `/components/agent`

Agent mode components for autonomous AI execution (19 items).

**Files**:

- `agent-flow-visualizer.tsx` - Execution flow visualization
- `agent-mode-selector.tsx` - Agent mode selection
- `agent-steps.tsx` - Step-by-step execution display

#### `/components/artifacts`

Artifacts system components.

**Files**:

- `artifact-panel.tsx` - Main panel
- `artifact-preview.tsx` - Preview cards
- `artifact-renderers.tsx` - Type-specific renderers

#### `/components/canvas`

Monaco-based canvas editor.

**Files**:

- `canvas-panel.tsx` - Editor with Monaco
- `version-history-panel.tsx` - Version management

#### `/components/chat-widget`

Embeddable chat widget components (8 items).

**Files**:

- `chat-widget.tsx` - Main widget component
- `chat-widget-header.tsx` - Widget header
- `chat-widget-input.tsx` - Input field
- `chat-widget-messages.tsx` - Message display
- `chat-widget-settings.tsx` - Widget settings

#### `/components/designer`

Visual designer components (70 items).

**Files**:

- Designer canvas and workspace
- Component palette and properties panel
- Design export functionality

#### `/components/image-studio`

Image editing studio components (15 items).

**Files**:

- `background-remover.tsx` - Background removal tool
- `image-adjustments.tsx` - Image adjustments panel
- `image-cropper.tsx` - Image cropping tool
- `image-upscaler.tsx` - Image upscaling tool
- `mask-canvas.tsx` - Mask painting canvas

#### `/components/jupyter`

Jupyter notebook integration (7 items).

**Files**:

- `interactive-notebook.tsx` - Notebook interface
- `kernel-status.tsx` - Kernel status indicator
- `variable-inspector.tsx` - Variable inspector

#### `/components/learning`

Learning mode components (23 items).

**Files**:

- `flashcard.tsx` - Flashcard component
- `quiz.tsx` - Quiz component
- `video.tsx` - Video learning component
- `ppt-editor.tsx` - PPT editor
- `ppt-preview.tsx` - PPT preview
- `learning-mode-panel.tsx` - Learning panel
- `review-session.tsx` - Review sessions

#### `/components/screen-recording`

Screen recording UI (5 items).

**Files**:

- `recording-controls.tsx` - Recording controls
- `region-selector.tsx` - Screen region selector

#### `/components/settings`

Settings page components (96 items, 7+ settings tabs).

**Files**:

- `provider-settings.tsx` - API key configuration
- `appearance-settings.tsx` - Theme customization
- `mcp-settings.tsx` - MCP server management

#### `/components/skills`

Skills system components (25 items).

**Files**:

- `skill-card.tsx` - Skill display card
- `skill-detail.tsx` - Skill detail view
- `skill-editor.tsx` - Skill editor
- `skill-panel.tsx` - Skills panel
- `skill-wizard.tsx` - Skill creation wizard

#### `/components/workflow`

Workflow components including editor and marketplace.

##### `/components/workflow/editor`

Visual workflow editor with React Flow (50 items).

**Files**:

- `workflow-editor-panel.tsx` - Main editor
- `workflow-toolbar.tsx` - Editor toolbar
- `node-palette.tsx` - Node selection palette
- `node-config-panel.tsx` - Node configuration
- `execution-panel.tsx` - Execution monitoring
- `debug-panel.tsx` - Debug tools
- `nodes/` - Custom node types (18 items)

##### `/components/workflow/marketplace`

Template marketplace components (6 items).

**Files**:

- `template-browser.tsx` - Template browsing
- `template-preview.tsx` - Template preview
- `git-integration-panel.tsx` - Git integration

**Convention**:

- Group components by feature, not by type
- Each feature directory has an `index.ts` for exports
- Use kebab-case for file names: `chat-input.tsx`, `preset-manager.tsx`

### `/hooks` - Custom React Hooks

Reusable React hooks organized by category for encapsulating stateful logic.

**Categories**:

- `ai/` - AI/Agent hooks (18 items)
  - `use-agent.ts` - Agent mode execution
  - `use-background-agent.ts` - Background agent management
  - `use-sub-agent.ts` - Sub-agent orchestration
  - `use-skills.ts` - Skills integration
  - `use-structured-output.ts` - Zod-structured output
  - `use-unified-tools.ts` - Unified tool system
  - `use-ollama.ts` - Ollama integration
  - `use-ai-registry.ts` - AI model registry

- `chat/` - Chat hooks (11 items)
  - `use-messages.ts` - Message persistence with IndexedDB
  - `use-artifact-detection.ts` - Artifact detection

- `rag/` - RAG/Vector hooks (12 items)
  - `use-rag.ts` - RAG retrieval
  - `use-vector-db.ts` - Vector database operations
  - `use-memory.ts` - Memory management
  - `use-memory-provider.ts` - Memory provider
  - `use-rag-pipeline.ts` - RAG pipeline

- `context/` - Context/Awareness hooks (9 items)
- `designer/` - Designer hooks (14 items)
- `media/` - Media hooks (8 items)
- `native/` - Native/Window hooks (14 items)
- `network/` - Network/Proxy hooks (7 items)
- `sandbox/` - Sandbox hooks (12 items)
- `ui/` - UI hooks (21 items)
- `utils/` - Utility hooks (9 items)

**Convention**:

- Prefix with `use-`: `use-agent.ts`, `use-speech.ts`
- One hook per file
- Export from category `index.ts`

### `/lib` - Utilities and Libraries

Business logic, utility functions, and integrations (170+ items in AI alone).

**Key Directories**:

#### `/lib/ai`

AI integration layer using Vercel AI SDK v5 (170+ items).

**Subdirectories**:

- `agent/` - Agent system (22 items)
  - `agent-executor.ts` - Agent execution engine
  - `agent-loop.ts` - Agent loop logic
  - `agent-orchestrator.ts` - Multi-agent orchestration
  - `background-agent-manager.ts` - Background agent management
  - `sub-agent-executor.ts` - Sub-agent execution
  - `environment-tools.ts` - Environment tools
  - `jupyter-tools.ts` - Jupyter notebook tools
  - `mcp-tools.ts` - MCP tools integration

- `core/` - Core AI utilities (11 items)
- `embedding/` - Embedding utilities (9 items)
- `generation/` - Generation utilities (20 items)
- `infrastructure/` - Infrastructure (9 items)
- `media/` - Media processing (12 items)
- `memory/` - Memory system (15 items)
- `prompts/` - Prompt templates
- `providers/` - Provider utilities (7 items)
- `rag/` - RAG system (16 items)
- `tools/` - Tool definitions (32 items)
- `tts/` - Text-to-speech (6 items)
- `workflows/` - Workflow definitions (8 items)

#### `/lib/db`

Dexie-based IndexedDB layer.

**Files**:

- `index.ts` - Dexie database setup
- `schema.ts` - Database schema definition
- `repositories/` - Data access layer

#### `/lib/export`

Multi-format export functionality (24 items).

**Formats**: PDF, Markdown, JSON, HTML, Word, Excel, Google Sheets

#### `/lib/document`

Document processing and parsing (22 items).

**Files**:

- `parsers/` - Format-specific parsers (CSV, PDF, HTML, Office)
- `document-processor.ts` - Processing pipeline

#### `/lib/jupyter`

Jupyter notebook utilities (5 items).

#### `/lib/mcp`

MCP utilities (5 items).

#### `/lib/workflow`

Workflow and editor utilities.

**Subdirectories**:

- `editor/` - Workflow editor utils (10 items)
- `git-integration-service.ts` - Git integration for templates

**Convention**:

- Pure functions when possible
- One module per concern
- Export from `index.ts` in each directory

### `/stores` - Zustand State Management

Global state with localStorage persistence using Zustand v5.

**Store Pattern**:

```typescript
// stores/example-store.ts
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

**Store Categories** (organized by domain):

- `agent/` - Agent stores (9 items)
  - `agent-store.ts` - Agent execution tracking
  - `background-agent-store.ts` - Background agents
  - `sub-agent-store.ts` - Sub-agents
  - `skill-store.ts` - Skills state

- `chat/` - Chat stores (10 items)
  - `chat-store.ts` - Chat state
  - `session-store.ts` - Sessions, branches
  - `quote-store.ts` - Text quotations
  - `summary-store.ts` - Summaries
  - `chat-widget-store.ts` - Widget state

- `context/` - Context stores (5 items)
  - `clipboard-context-store.ts` - Clipboard monitoring
  - `selection-store.ts` - Selection state

- `data/` - Data stores (5 items)
  - `memory-store.ts` - Cross-session memory
  - `vector-store.ts` - Vector DB state

- `media/` - Media stores (7 items)
  - `media-store.ts` - Images/videos
  - `image-studio-store.ts` - Image editor
  - `screen-recording-store.ts` - Screen recording

- `settings/` - Settings stores (7 items)
  - `settings-store.ts` - User settings
  - `preset-store.ts` - Presets
  - `custom-theme-store.ts` - Custom themes

- `system/` - System stores (16 items)
  - `ui-store.ts` - UI state
  - `usage-store.ts` - Token/cost tracking
  - `environment-store.ts` - Environment state
  - `proxy-store.ts` - Proxy configuration
  - `window-store.ts` - Window state

- `tools/` - Tools stores (6 items)
  - `jupyter-store.ts` - Jupyter sessions
  - `ppt-editor-store.ts` - PPT editor
  - `template-store.ts` - Templates

- `workflow/` - Workflow stores (5 items)
  - `workflow-store.ts` - Workflow execution
  - `workflow-editor-store.ts` - Editor state

- `mcp/` - MCP stores (5 items)
- `project/` - Project stores (5 items)
- `designer/` - Designer stores (5 items)
- `learning/` - Learning stores
- `document/` - Document stores
- `artifact/` - Artifact stores

**Convention**:

- Stores organized by domain category
- Use `persist` middleware for localStorage
- Export selectors for memoized access

### `/types` - TypeScript Definitions

Centralized type definitions for type safety (53 files).

**Key Files**:

- `agent.ts` - Agent types
- `background-agent.ts` - Background agent types
- `sub-agent.ts` - Sub-agent types
- `artifact.ts` - Artifact types (8 types, 17+ languages)
- `session.ts` - Session and branch types
- `message.ts` - Message types with branch support
- `provider.ts` - Provider configuration types
- `mcp.ts` - MCP server types
- `mcp-marketplace.ts` - MCP marketplace types
- `agent-mode.ts` - Agent mode types
- `learning.ts` - Learning mode types
- `workflow.ts` - Workflow types
- `workflow-editor.ts` - Workflow editor types
- `jupyter.ts` - Jupyter types
- `image-studio.ts` - Image studio types
- `video.ts` - Video types
- `sandbox.ts` - Sandbox types
- `environment.ts` - Environment types
- `proxy.ts` - Proxy types

**Convention**:

- One file per domain
- Export all types from `index.ts`
- Use strict types (no `any`)

### `/e2e` - End-to-End Tests

Playwright E2E tests organized by feature.

**Structure**:

- `ai/` - AI feature tests
- `core/` - Core functionality tests
- `features/` - Feature-specific tests
- `ui/` - UI component tests

**Naming**: `*.spec.ts` (e.g., `settings-ollama.spec.ts`)

### `/src-tauri` - Rust Backend

Tauri desktop application backend code.

**Key Directories**:

- `src/commands/` - Tauri commands exposed to frontend
- `src/mcp/` - MCP (Model Context Protocol) implementation
- `capabilities/` - Permission configuration

**Files**:

- `src/main.rs` - Application entry point
- `src/lib.rs` - Library code
- `Cargo.toml` - Rust dependencies
- `tauri.conf.json` - Tauri configuration

## File Naming Conventions

### General Rules

1. **Use kebab-case for files**: `chat-input.tsx`, `preset-manager.tsx`
2. **Use PascalCase for types**: `UserProviderSettings`, `ArtifactType`
3. **Use camelCase for variables/functions**: `createSession`, `getMessageById`
4. **Use UPPER_SNAKE_CASE for constants**: `MAX_TOKENS`, `DEFAULT_MODEL`

### Component Files

**Format**: `[name].tsx` or `[name].test.tsx`

**Examples**:

- `chat-container.tsx`
- `artifact-panel.tsx`
- `settings-provider.tsx`
- `use-messages.test.tsx`

### Hook Files

**Format**: `use-[name].ts`

**Examples**:

- `use-agent.ts`
- `use-session-search.ts`
- `use-keyboard-shortcuts.ts`

### Store Files

**Format**: `[domain]-store.ts`

**Examples**:

- `settings-store.ts`
- `session-store.ts`
- `artifact-store.ts`

### Type Files

**Format**: `[domain].ts`

**Examples**:

- `provider.ts`
- `message.ts`
- `workflow.ts`

### Test Files

**Format**: `[filename].test.ts` (unit tests) or `[feature].spec.ts` (E2E)

**Examples**:

- `utils.test.ts`
- `settings-store.test.ts`
- `projects-knowledge-base.spec.ts`

## Import Path Aliases

Configure in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"],
      "@/components/*": ["./components/*"],
      "@/lib/*": ["./lib/*"],
      "@/hooks/*": ["./hooks/*"],
      "@/stores/*": ["./stores/*"],
      "@/types/*": ["./types/*"],
      "@/ui/*": ["./components/ui/*"]
    }
  }
}
```

### Usage Examples

```typescript
// Import components
import { Button } from '@/components/ui/button';
import { ChatInput } from '@/components/chat/chat-input';

// Import hooks
import { useMessages } from '@/hooks/use-messages';
import { useAgent } from '@/hooks/use-agent';

// Import stores
import { useSettingsStore } from '@/stores/settings-store';
import { useSessionStore } from '@/stores/session-store';

// Import types
import type { Artifact } from '@/types/artifact';
import type { Message } from '@/types/message';

// Import utilities
import { cn } from '@/lib/utils';
import { createOpenAI } from '@ai-sdk/openai';
```

### Benefits

1. **Absolute imports**: No relative path hell (`../../../components/`)
2. **Refactoring**: Move files without breaking imports
3. **IDE Support**: Better autocomplete and navigation
4. **Readability**: Clear module boundaries

## Where to Put New Code

### Adding a New UI Component

**Scenario**: Add a new settings component for theme customization.

**Steps**:

1. Create file: `components/settings/theme-settings.tsx`
2. Update exports: `components/settings/index.ts`
3. Use in page: `app/settings/page.tsx`

**Example**:

```typescript
// components/settings/theme-settings.tsx
export function ThemeSettings() {
  return <div>Theme settings</div>;
}

// components/settings/index.ts
export { ThemeSettings } from './theme-settings';
```

### Adding a New Store

**Scenario**: Track user preferences for a new feature.

**Steps**:

1. Create file: `stores/feature-store.ts`
2. Define state interface
3. Create store with persist
4. Export from `stores/index.ts`

**Example**:

```typescript
// stores/feature-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FeatureState {
  enabled: boolean;
  toggle: () => void;
}

export const useFeatureStore = create<FeatureState>()(
  persist(
    (set) => ({
      enabled: false,
      toggle: () => set((state) => ({ enabled: !state.enabled })),
    }),
    { name: 'cognia-feature' }
  )
);
```

### Adding a New Hook

**Scenario**: Encapsulate logic for a new API integration.

**Steps**:

1. Create file: `hooks/use-feature.ts`
2. Implement hook with error handling
3. Export from `hooks/index.ts`

**Example**:

```typescript
// hooks/use-feature.ts
import { useState, useEffect } from 'react';

export function useFeature() {
  const [data, setData] = useState(null);

  useEffect(() => {
    // Fetch data
  }, []);

  return { data };
}
```

### Adding Utility Functions

**Scenario**: Add helper functions for data transformation.

**Steps**:

1. Create file: `lib/feature/helpers.ts`
2. Export pure functions
3. Export from `lib/feature/index.ts`

**Example**:

```typescript
// lib/feature/helpers.ts
export function transformData(input: string): Result {
  // Transformation logic
  return result;
}

export function validateData(data: unknown): boolean {
  // Validation logic
  return true;
}
```

### Adding Types

**Scenario**: Define types for a new data structure.

**Steps**:

1. Create file: `types/feature.ts`
2. Export interfaces and types
3. Export from `types/index.ts`

**Example**:

```typescript
// types/feature.ts
export interface FeatureConfig {
  id: string;
  enabled: boolean;
  options: Record<string, unknown>;
}

export type FeatureStatus = 'idle' | 'loading' | 'success' | 'error';
```

### Adding Tests

**Scenario**: Test a new utility function.

**Steps**:

1. Create file: `lib/feature/helpers.test.ts`
2. Write test cases
3. Run: `pnpm test lib/feature/helpers.test.ts`

**Example**:

```typescript
// lib/feature/helpers.test.ts
import { transformData } from './helpers';

describe('transformData', () => {
  it('transforms input correctly', () => {
    const result = transformData('test');
    expect(result).toEqual({ value: 'test' });
  });
});
```

## Key Files and Their Roles

### Configuration Files

| File | Purpose |
|------|---------|
| `next.config.ts` | Next.js configuration (static export, images, aliases) |
| `tsconfig.json` | TypeScript configuration (paths, strict mode) |
| `tailwind.config.ts` | Tailwind CSS configuration (themes, plugins) |
| `jest.config.ts` | Jest testing configuration (coverage, mocks) |
| `playwright.config.ts` | Playwright E2E testing configuration |
| `components.json` | shadcn/ui component configuration |
| `src-tauri/tauri.conf.json` | Tauri desktop app configuration |

### Package Management

| File | Purpose |
|------|---------|
| `package.json` | Dependencies and scripts |
| `pnpm-lock.yaml` | pnpm lock file (commit this) |

### Documentation

| File | Purpose |
|------|---------|
| `README.md` | Project overview and quick start |
| `CLAUDE.md` | Claude AI development instructions |
| `CHANGELOG.md` | Version history and changes |
| `llmdoc/index.md` | Project documentation index |
| `docs/development/` | Development guides (this file) |

### Git and CI/CD

| File | Purpose |
|------|---------|
| `.gitignore` | Git ignore rules |
| `.eslintrc.json` | ESLint configuration |
| `commitlint.config.js` | Conventional commits enforcement |
| `.github/workflows/ci.yml` | CI/CD pipeline |

### Entry Points

| File | Purpose |
|------|---------|
| `app/page.tsx` | Landing page |
| `app/layout.tsx` | Root layout |
| `app/providers.tsx` | Client providers |
| `src-tauri/src/main.rs` | Rust entry point |

## Best Practices

### File Organization

1. **Feature-based**: Group by feature, not by file type
2. **Colocation**: Keep related files together
3. **Index files**: Use `index.ts` for clean imports
4. **Barrel exports**: Re-export from feature directories

### Import Organization

```typescript
// 1. External libraries
import React from 'react';
import { create } from 'zustand';

// 2. Internal types
import type { Message } from '@/types/message';

// 3. Internal stores
import { useSettingsStore } from '@/stores/settings-store';

// 4. Internal hooks
import { useMessages } from '@/hooks/use-messages';

// 5. Internal components
import { Button } from '@/components/ui/button';
import { ChatInput } from '@/components/chat/chat-input';

// 6. Utilities
import { cn } from '@/lib/utils';
```

### Naming Conventions

```typescript
// Components: PascalCase
export function ChatContainer() {}
export const ArtifactPanel = () => {};

// Hooks: camelCase with 'use' prefix
export function useMessages() {}
export const useAgent = () => {};

// Stores: camelCase with 'use' prefix
export const useSettingsStore = create<SettingsState>()(...);

// Types: PascalCase
export interface UserSettings {}
export type MessageRole = 'user' | 'assistant';

// Functions: camelCase
export function createSession() {}
export const getMessageById = (id: string) => {};

// Constants: UPPER_SNAKE_CASE
export const MAX_TOKENS = 4096;
export const DEFAULT_MODEL = 'gpt-4o';
```

---

**Last Updated**: January 3, 2026
