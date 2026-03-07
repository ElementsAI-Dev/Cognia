# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Changelog

### 2026-02-27

- **CLAUDE.md Quality Audit**
  - Fixed Tauri version (2.9 → 2.10), static export config (now opt-in via `COGNIA_STATIC_EXPORT`)
  - Updated module diagram with ~30 missing directories across all modules
  - Added `build:export` command to development commands
  - Trimmed low-value coverage stats section
  - Updated all 9 module-level CLAUDE.md files with missing directories
  - Fixed `components/workflow-editor/` → `workflow/` directory name
  - Fixed `src-tauri` testing claim (Rust tests do exist)
  - Added 4 missing files to `lib/scheduler/` architecture tree

### 2026-02-13

- **Module Updates**
  - Added A2UI Analysis Adapter for Academic mode (`components/a2ui/academic/`)
  - Added App Builder Tools for AI-driven mini-app creation (`lib/ai/tools/app-builder-tool.ts`)
  - Added Zotero integration slice for academic paper management (`stores/academic/slices/zotero-slice.ts`)
  - Enhanced Quick App Builder with template cards and flash app generation
  - Removed deprecated MCP favorites and recently-viewed hooks
  - Removed document-storage and word-export modules (functionality moved elsewhere)
  - Tool Registry now includes 40+ tools including app builder, memory, and artifact tools

### 2026-01-31

- **Documentation System Refresh**
  - Verified all module-level CLAUDE.md files are up-to-date
  - Regenerated `.claude/index.json` with current timestamp (2026-01-31)
  - Confirmed 100% coverage across all 8 major modules
  - All 3,850 files indexed and documented
  - Module structure diagram verified with clickable links

### 2025-01-29

- **AI Context Documentation System Generated**
  - Complete repository scan performed
  - Root CLAUDE.md updated with module structure diagram
  - Module index created (.claude/index.json)
  - 100% coverage achieved across 8 major modules
  - 3,850 files indexed

### 2025-01-26

- Added SpeedPass learning mode documentation
- Added input completion system documentation
- Added SkillSeekers feature documentation
- Updated canvas collaboration features
- Updated media processing capabilities
- Updated module counts and statistics

---

## Project Overview

Cognia is an AI-native chat and creation application with multi-provider support, built as a hybrid web/desktop application:

- **Frontend**: Next.js 16.1 with React 19.2, TypeScript 5.9, and Tailwind CSS v4
- **Desktop Framework**: Tauri 2.10 for cross-platform desktop apps
- **UI Components**: shadcn/ui with Radix UI primitives and Lucide icons
- **State Management**: Zustand v5 stores + Dexie v4 for IndexedDB persistence
- **AI Integration**: Vercel AI SDK v5 (`ai@^5.0`) with 14+ providers (OpenAI, Anthropic, Google, DeepSeek, Groq, Mistral, Ollama, xAI, Together AI, OpenRouter, Cohere, Fireworks, Cerebras, SambaNova)
- **Agent System**: Autonomous agent execution with tool calling, planning, sub-agent orchestration
- **MCP Support**: Full Model Context Protocol support for extended capabilities
- **Native Tools**: Desktop-only features (selection, awareness, context, screenshot) on Windows/macOS/Linux
- **i18n**: Multi-language support via `next-intl` (English, Chinese)
- **Learning**: SpeedPass interactive learning system with textbooks, quizzes, and tutorials

## Module Structure

```mermaid
graph TD
    Root["(根) Cognia"] --> App["app/ - Next.js App Router"]
    Root --> Components["components/ - Feature Components"]
    Root --> Lib["lib/ - Domain Utilities"]
    Root --> Hooks["hooks/ - React Hooks"]
    Root --> Stores["stores/ - State Management"]
    Root --> Types["types/ - TypeScript Definitions"]
    Root --> SrcTauri["src-tauri/ - Rust Backend"]
    Root --> E2E["e2e/ - E2E Tests"]

    App --> AppMain["(main)/ - Main Routes"]
    App --> AppStandalone["Standalone Windows"]

    AppMain --> AppChat["(chat)/ - Chat Interface"]
    AppMain --> AppSettings["settings/ - Settings"]
    AppMain --> AppArena["arena/ - Model Arena"]
    AppMain --> AppImageStudio["image-studio/ - Image Studio"]
    AppMain --> AppLatex["latex/ - LaTeX Editor"]
    AppMain --> AppNotebook["notebook/ - Notebook"]
    AppMain --> AppPPT["ppt/ - PPT Generation"]
    AppMain --> AppVideoStudio["video-studio/ - Video Studio"]
    AppMain --> AppAcademic["academic/ - Academic Mode"]
    AppMain --> AppScheduler["scheduler/ - Task Scheduler"]
    AppMain --> AppSpeedpass["speedpass/ - SpeedPass Learning"]
    AppMain --> AppMore["+ designer, git, workflows, skills, plugins, sandbox, observability, ..."]

    Components --> CompUI["ui/ - shadcn Components"]
    Components --> CompChat["chat/ - Chat Components"]
    Components --> CompAgent["agent/ - Agent Components"]
    Components --> CompAI["ai-elements/ - AI Components"]
    Components --> CompA2UI["a2ui/ - A2UI Mini-Apps"]
    Components --> CompDesigner["designer/ - Visual Designer"]
    Components --> CompNative["native/ - Native Features"]
    Components --> CompWorkflow["workflow/ - Workflow Editor"]
    Components --> CompProviders["providers/ - Provider System"]
    Components --> CompLayout["layout/ - Layout Components"]
    Components --> CompVideoStudio["video-studio/ - Video Studio"]
    Components --> CompImageStudio["image-studio/ - Image Studio"]
    Components --> CompPPT["ppt/ - PPT Components"]
    Components --> CompPlugin["plugin/ - Plugin Components"]
    Components --> CompArena["arena/ - Arena Components"]
    Components --> CompGit["git/ - Git Components"]
    Components --> CompPrompt["prompt/ - Prompt Components"]
    Components --> CompMore["+ academic, artifacts, canvas, scheduler, screenshot, settings, sidebar, skills, speedpass, ..."]

    Lib --> LibAI["ai/ - AI Integration"]
    Lib --> LibDB["db/ - Database"]
    Lib --> LibExport["export/ - Export Utilities"]
    Lib --> LibNative["native/ - Native Bridges"]
    Lib --> LibDesigner["designer/ - Designer Logic"]
    Lib --> LibDocument["document/ - Document Processing"]
    Lib --> LibVector["vector/ - Vector Databases"]
    Lib --> LibCanvas["canvas/ - Canvas Utilities"]
    Lib --> LibMedia["media/ - Media Processing"]
    Lib --> LibLearning["learning/ - Learning System"]
    Lib --> LibA2UI["a2ui/ - A2UI App Generation"]
    Lib --> LibArena["arena/ - Arena Logic"]
    Lib --> LibLatex["latex/ - LaTeX Utilities"]
    Lib --> LibGit["git/ - Git Integration"]
    Lib --> LibScheduler["scheduler/ - Task Scheduler"]
    Lib --> LibMore["+ agent-trace, i18n, logger, plugin, search, storage, ..."]

    Hooks --> HooksAI["ai/ - AI Hooks"]
    Hooks --> HooksAgent["agent/ - Agent Hooks"]
    Hooks --> HooksChat["chat/ - Chat Hooks"]
    Hooks --> HooksNative["native/ - Native Hooks"]
    Hooks --> HooksUI["ui/ - UI Hooks"]
    Hooks --> HooksRAG["rag/ - RAG Hooks"]
    Hooks --> HooksDesigner["designer/ - Designer Hooks"]
    Hooks --> HooksVideoStudio["video-studio/ - Video Hooks"]
    Hooks --> HooksLearning["learning/ - Learning Hooks"]
    Hooks --> HooksA2UI["a2ui/ - A2UI Hooks"]
    Hooks --> HooksArena["arena/ - Arena Hooks"]
    Hooks --> HooksImageStudio["image-studio/ - Image Hooks"]
    Hooks --> HooksLatex["latex/ - LaTeX Hooks"]
    Hooks --> HooksMCP["mcp/ - MCP Hooks"]
    Hooks --> HooksPlugin["plugin/ - Plugin Hooks"]
    Hooks --> HooksMore["+ agent-trace, artifacts, canvas, context, db, export, git, map, presets, projects, sandbox, scheduler, search, settings, skills, storage, sync, ..."]

    Stores --> StoresAgent["agent/ - Agent State"]
    Stores --> StoresChat["chat/ - Chat State"]
    Stores --> StoresMCP["mcp/ - MCP State"]
    Stores --> StoresSettings["settings/ - Settings"]
    Stores --> StoresSystem["system/ - System State"]
    Stores --> StoresMedia["media/ - Media State"]
    Stores --> StoresProject["project/ - Projects"]
    Stores --> StoresLearning["learning/ - Learning State"]
    Stores --> StoresCanvas["canvas/ - Canvas State"]
    Stores --> StoresA2UI["a2ui/ - A2UI State"]
    Stores --> StoresAcademic["academic/ - Academic State"]
    Stores --> StoresArena["arena/ - Arena State"]
    Stores --> StoresLatex["latex/ - LaTeX State"]
    Stores --> StoresMore["+ agent-trace, artifact, context, designer, document, git, jupyter, plugin, prompt, sandbox, scheduler, screenshot, skills, sync, workflow, ..."]

    SrcTauri --> TauriCommands["commands/ - Tauri Commands"]
    SrcTauri --> TauriMCP["mcp/ - MCP Manager"]
    SrcTauri --> TauriSelection["selection/ - Selection System"]
    SrcTauri --> TauriScreenshot["screenshot/ - Screenshot System"]
    SrcTauri --> TauriAwareness["awareness/ - Awareness System"]
    SrcTauri --> TauriSandbox["sandbox/ - Code Execution"]
    SrcTauri --> TauriExternalAgent["external_agent/ - External Agents"]
    SrcTauri --> TauriWorkflowRuntime["workflow_runtime/ - Workflow Runtime"]
    SrcTauri --> TauriMore["+ chat_runtime, convex, jupyter, screen_recording, scheduler, skill, skill_seekers, input_completion, ..."]

    click App "D:\\Project\\Cognia\\app\\CLAUDE.md" "View app module docs"
    click Components "D:\\Project\\Cognia\\components\\CLAUDE.md" "View components module docs"
    click Lib "D:\\Project\\Cognia\\lib\\CLAUDE.md" "View lib module docs"
    click Hooks "D:\\Project\\Cognia\\hooks\\CLAUDE.md" "View hooks module docs"
    click Stores "D:\\Project\\Cognia\\stores\\CLAUDE.md" "View stores module docs"
    click Types "D:\\Project\\Cognia\\types\\CLAUDE.md" "View types module docs"
    click SrcTauri "D:\\Project\\Cognia\\src-tauri\\CLAUDE.md" "View src-tauri module docs"
```

## Module Index

| Module | Path | Type | Description | Files | Tests | Coverage |
|--------|------|------|-------------|-------|-------|----------|
| **app** | `app/` | Frontend | Next.js App Router with standalone windows | 60 | Yes | Good |
| **components** | `components/` | Frontend | Feature-based React components (50+ directories) | 350 | Yes | Good |
| **lib** | `lib/` | Frontend | Domain utilities and business logic | 250 | Yes | Good |
| **hooks** | `hooks/` | Frontend | Custom React hooks organized by domain | 120 | Yes | Good |
| **stores** | `stores/` | Frontend | Zustand state management with persistence | 120 | Yes | Good |
| **types** | `types/` | Frontend | TypeScript type definitions | 120 | Yes | Complete |
| **src-tauri** | `src-tauri/` | Backend | Tauri Rust backend for native capabilities | 150 | No | Partial |
| **e2e** | `e2e/` | Testing | Playwright E2E test specifications | 100 | N/A | Good |

## Development Commands

```bash
# Frontend
pnpm dev              # Start Next.js dev server (localhost:3000)
pnpm build            # Production build
pnpm build:export     # Static export build for Tauri (generates out/)
pnpm start            # Serve production build
pnpm lint             # Run ESLint
pnpm lint --fix       # Auto-fix ESLint issues

# Testing - Unit
pnpm test             # Run Jest unit tests (180+ test files)
pnpm test:watch       # Jest watch mode
pnpm test:coverage    # Jest with coverage (55%+ lines, 50%+ branches)
pnpm test -- path/to/file.test.ts           # Run single test file
pnpm test -- --testNamePattern="test name"  # Run tests matching pattern

# Testing - E2E
pnpm test:e2e         # Run Playwright e2e tests (100 test files)
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

# i18n commands
pnpm i18n             # Process all i18n operations
pnpm i18n:extract     # Extract translatable strings
pnpm i18n:generate    # generate type-safe translations
pnpm i18n:validate    # Validate translation files
```

## Architecture Overview

### High-Level Architecture

Cognia is a hybrid web/desktop application that:

1. Runs as a Next.js app during development (`pnpm dev`)
2. Builds to static HTML for Tauri desktop distribution (`pnpm build`)
3. Uses Tauri's Rust backend for native capabilities (MCP process management, file system access, clipboard, screenshots, system monitoring)

**Key constraint**: Static export is opt-in via `COGNIA_STATIC_EXPORT=true` (`pnpm build:export`). When enabled, `next.config.ts` sets `output: "export"` for static site generation. No server-side API routes can be used in deployed desktop apps—Tauri loads static files from `out/`.

### Path Aliases

- `@/components`, `@/lib`, `@/hooks`, `@/stores`, `@/types`, `@/ui` (→ `components/ui`)

### Tauri Windows

The application defines 5 windows:

1. **main** — Main application window (1200x800)
2. **splashscreen** — Splash screen (400x300)
3. **selection-toolbar** — Selection toolbar (560x400, transparent, always on top)
4. **chat-widget** — Chat widget (420x600, always on top)
5. **region-selector** — Region selector (1920x1080, transparent, always on top)

## Key Technical Features

### AI Integration (14+ Providers)

- **Providers**: OpenAI, Anthropic, Google, Mistral, DeepSeek, Groq, xAI, Together AI, OpenRouter, Cohere, Fireworks, Cerebras, SambaNova, Ollama
- **Auto-Router**: Three-tier intelligent routing (Fast/Balanced/Powerful)
- **Agent System**: Three-tier architecture with tool calling, planning, sub-agent coordination

### Tool System (40+ Tools)

The tool registry includes tools across multiple categories:

| Category | Tools |
|----------|-------|
| **Search** | `rag_search`, `web_search`, `web_scraper`, `bulk_web_scraper`, `search_and_scrape` |
| **File** | `file_read`, `file_write`, `file_list`, `file_delete`, `file_search`, `content_search`, etc. |
| **Document** | `document_summarize`, `document_chunk`, `document_analyze`, `document_extract_tables`, `document_read_file` |
| **Video** | `video_generate`, `video_status`, `video_subtitles`, `video_analyze`, `subtitle_parse` |
| **Image** | `image_generate`, `image_edit`, `image_variation` |
| **PPT** | `ppt_outline`, `ppt_slide_content`, `ppt_finalize`, `ppt_export`, `ppt_generate_image` |
| **Academic** | `academic_search`, `academic_analysis`, `paper_comparison` |
| **Learning** | `display_flashcard`, `display_quiz`, `display_review_session`, `display_progress_summary` |
| **App** | `app_generate`, `app_create_from_template`, `app_list_templates`, `app_delete` |
| **System** | `calculator`, `shell_execute` |
| **Memory** | Memory tools for persistent context |
| **Artifact** | Artifact creation and management tools |

### MCP (Model Context Protocol)

- **Rust Backend**: Full JSON-RPC 2.0 protocol implementation
- **Frontend**: Zustand store for MCP state, marketplace, and management UI
- **Server Templates**: Filesystem, GitHub, PostgreSQL, SQLite, Brave Search, Memory, Puppeteer, Slack

### Native Tools (Desktop Only)

- **Selection System**: 12 expansion modes, AI-powered actions, selection history, clipboard history
- **Awareness System**: Real-time system monitoring, activity tracking, focus tracking
- **Context System**: Window/app/file/browser/editor detection
- **Screenshot System**: Multi-mode capture with OCR and searchable history
- **Screen Recording**: Fullscreen, window, and region recording with history

### A2UI Mini-Apps System

- **Quick App Builder**: AI-driven interface for creating interactive mini-apps
- **Templates**: Pre-built templates for calculators, timers, todo lists, forms, etc.
- **Flash Generation**: Generate apps from natural language descriptions
- **App Generator**: `lib/a2ui/app-generator.ts` for programmatic app creation
- **Academic Integration**: `A2UIAnalysisAdapter` bridges A2UI with academic analysis panels

### Academic Mode

- **Paper Search**: Integration with arXiv, Semantic Scholar, OpenAlex, HuggingFace Papers
- **Zotero Integration**: Import, export, and sync papers with Zotero library
- **Paper Analysis**: Summaries, key insights, methodology analysis, comparisons

### New Features (2025-01-26)

- **SpeedPass Learning Mode**: Interactive learning system with textbooks, quizzes, and tutorials
- **Input Completion System**: Unified @mentions, ghost text, slash commands, emoji picker
- **SkillSeekers**: AI-powered skill discovery and execution
- **Enhanced Canvas**: Collaboration (CRDT), themes, snippets, symbols, plugins
- **Enhanced Media Processing**: WebGL acceleration, worker pools, progressive loading
- **Screenshot Editor**: Annotation, magnifier, color picker, OCR
- **Observability**: System monitoring and metrics

### Other Systems

- **Designer System**: V0-style visual web page designer with AI-powered editing
- **Workflow Editor**: Visual workflow editor with React Flow
- **Workflow Marketplace**: Discover and share workflows
- **Skills System**: Custom skill framework for extending AI capabilities
- **Learning Mode**: Interactive learning system for educational content
- **Sandbox System**: Secure code execution with Docker/Podman/Native support
- **Jupyter Integration**: Full Jupyter kernel and session management
- **Git Integration**: Git operations support
- **Video Studio**: Video editing and generation with timeline, effects, and recording

## Store Architecture

All Zustand stores use localStorage persistence with the `persist` middleware:

| Directory | Stores | Purpose |
|-----------|--------|---------|
| `stores/agent/` | `agent-store`, `background-agent-store`, `sub-agent-store`, `custom-mode-store` | Agent execution tracking |
| `stores/artifact/` | `artifact-store` | Artifacts, canvas, versions |
| `stores/chat/` | `chat-store`, `chat-widget-store`, `session-store`, `quote-store`, `summary-store` | Chat sessions, widget state |
| `stores/context/` | `clipboard-context-store`, `selection-store` | Clipboard context, quote state |
| `stores/data/` | `recent-files-store`, `template-store`, `vector-store`, `memory-store` | Recent files, templates, vectors |
| `stores/designer/` | `designer-store`, `designer-history-store` | Designer state, history |
| `stores/document/` | `document-store` | Document management |
| `stores/learning/` | `learning-store`, `speedpass-store` | Learning mode state |
| `stores/mcp/` | `mcp-store`, `mcp-marketplace-store` | MCP servers, marketplace |
| `stores/media/` | `media-store`, `image-studio-store`, `screen-recording-store`, `screenshot-store` | Video/image, screen recording, screenshot |
| `stores/project/` | `project-store`, `project-activity-store`, `project-activity-subscriber` | Projects, activities |
| `stores/settings/` | `settings-store`, `preset-store`, `custom-theme-store`, `settings-profiles-store`, `completion-settings-store` | User preferences, presets |
| `stores/system/` | `native-store`, `proxy-store`, `usage-store`, `window-store`, `environment-store`, `virtual-env-store`, `ui-store` | Native state, proxy, usage |
| `stores/tools/` | `skill-store`, `template-store`, `ppt-editor-store`, `jupyter-store` | Skills, tools |
| `stores/workflow/` | `workflow-store`, `workflow-editor-store` | Workflow definitions and execution |
| `stores/git/` | `git-store` | Git state |
| `stores/a2ui/` | `a2ui-store` | A2UI mini-apps state |
| `stores/academic/` | `academic-store`, `knowledge-map-store`, `zotero-slice` | Academic mode state |
| `stores/plugin/` | `plugin-store` | Plugin state |
| `stores/prompt/` | `prompt-template-store`, `prompt-marketplace-store` | Prompt management |
| `stores/tool-history/` | `tool-history-store` | Tool usage history |
| `stores/sandbox/` | `sandbox-store` | Sandbox state |
| `stores/skills/` | `skill-store` | Skills state |
| `stores/skill-seekers/` | `skill-seekers-store` | SkillSeekers state |
| `stores/input-completion/` | `input-completion-store` | Input completion state |
| `stores/canvas/` | `comment-store`, `keybinding-store`, `chunked-document-store` | Canvas state |
| `stores/screenshot/` | `editor-store` | Screenshot editor state |

## Provider System Architecture

The application uses an 11-layer provider architecture:

1. **ErrorBoundaryProvider** — Catches React errors
2. **LoggerProvider** — Centralized logging
3. **CacheProvider** — Performance optimization
4. **AudioProvider** — Voice/audio features
5. **ProviderProvider** — Unified AI provider state
6. **I18nProvider** — Internationalization
7. **ThemeProvider** — Theme management
8. **TooltipProvider** — UI tooltips
9. **SkillProvider** — Built-in skills
10. **NativeProvider** — Desktop functionality
11. **OnboardingProvider** — Setup wizard

## Important Constraints

### Static Export Compatibility

- Static export is opt-in: `COGNIA_STATIC_EXPORT=true pnpm build` (or `pnpm build:export`)
- When enabled, Tauri loads static files from `out/` — no server-side API routes
- Tauri plugins and Node.js-only packages are aliased to stubs in `next.config.ts` (both Turbopack and webpack)
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
- `lib/i18n/provider.tsx` — React context provider
- `lib/document/parsers/html-parser.ts` — Uses cheerio ESM

## Development Notes

- Package manager: pnpm (required)
- Static export: `out/` directory for Tauri builds
- Conventional commits: Enforced via commitlint + Husky
- Monaco Editor: Dynamically imported with SSR disabled
- Rust toolchain: v1.77.2+ required for Tauri builds
- TypeScript: Strict mode enabled, isolated modules

## AI Usage Guidelines

When working with this codebase:

1. **Use the module diagram** above to navigate between different parts of the codebase
2. **Read module-specific CLAUDE.md files** for detailed documentation
3. **Follow the existing patterns** for stores, hooks, and components
4. **Maintain type safety** - all modules have strict TypeScript definitions
5. **Test your changes** - run `pnpm test:coverage` before committing
6. **Check static export compatibility** - ensure no server-side only features are added

## Documentation System

- **Root**: `CLAUDE.md` (this file)
- **Module-level**: `app/`, `components/`, `hooks/`, `lib/`, `stores/`, `types/`, `src-tauri/` each have their own `CLAUDE.md`
- **Deep modules**: `lib/scheduler/`, `lib/logger/`, `lib/ai/agent/external/`, `plugins/ai-tools/` have dedicated `CLAUDE.md` files
- **Feature docs**: `docs/` directory with architecture and feature documentation

## Global Shortcuts

- `Ctrl+Shift+Space` — Toggle chat widget
- `Alt+Space` — Trigger selection toolbar
- `Ctrl+Shift+T` — Quick translate
- `Ctrl+Shift+E` — Quick explain
- `Alt+B` — Toggle bubble visibility
- `Alt+M` — Toggle bubble minimize

## Platform Support

### Windows

- Full support for all features
- Windows OCR for screenshots
- Battery monitoring
- Browser/editor context detection

### macOS

- Partial support
- Basic OCR
- Limited battery monitoring
- No browser/editor context

### Linux

- Partial support
- Basic OCR
- No battery monitoring
- No browser/editor context

See `.claude/index.json` for detailed coverage information and module documentation.
