# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Changelog

### 2026-01-22
- Complete AI context documentation system refresh
- Full file system scan completed - 3,681 source files indexed
- Language breakdown: TypeScript (2,356), TSX (1,020), Rust (147), JSON (100), Other (58)
- Updated module counts: app (62 files), components (300 files, 43 dirs), lib (200 files, 20 dirs), hooks (100 files, 19 dirs), stores (100 files, 23 dirs), types (105 files, 20 dirs), src-tauri (147 files, 15 dirs)
- Test files: 169 unit tests, 100 E2E tests
- Enhanced module structure diagram with new features (observability, workflow-marketplace, skills)
- All 7 module CLAUDE.md files verified present and up-to-date
- Updated `.claude/index.json` with comprehensive project metadata

### 2026-01-16
- AI context documentation system verification scan
- Total source files: 3,681 (TypeScript: 2,356, Rust: 147)
- New modules identified: observability, workflow-marketplace, skills (hooks/stores)
- All 7 module CLAUDE.md files verified present and up-to-date
- Module counts: components (38 dirs), hooks (22 dirs), lib (30 dirs), stores (24 dirs), types (17 dirs)

### 2026-01-15
- Complete AI context documentation system refresh
- Full file system scan completed - 850 files indexed
- Updated module structure diagram with new routes
- Enhanced module documentation with detailed subdirectories
- Comprehensive dependency and configuration documentation
- All module CLAUDE.md files present and up-to-date

### 2025-01-14
- Initial AI context documentation system created
- Added module structure diagram with clickable navigation
- Indexed 7 main modules with coverage analysis
- Documented 500+ source files across frontend and backend

---

## Project Overview

Cognia is an AI-native chat and creation application with multi-provider support, built as a hybrid web/desktop application:

- **Frontend**: Next.js 16.1 with React 19.2, TypeScript 5.9, and Tailwind CSS v4
- **Desktop Framework**: Tauri 2.9 for cross-platform desktop apps
- **UI Components**: shadcn/ui with Radix UI primitives and Lucide icons
- **State Management**: Zustand v5 stores + Dexie v4 for IndexedDB persistence
- **AI Integration**: Vercel AI SDK v5 with 14+ providers (OpenAI, Anthropic, Google, DeepSeek, Groq, Mistral, Ollama, xAI, Together AI, OpenRouter, Cohere, Fireworks, Cerebras, SambaNova)
- **Agent System**: Autonomous agent execution with tool calling, planning, sub-agent orchestration
- **MCP Support**: Full Model Context Protocol support for extended capabilities
- **Native Tools**: Desktop-only features (selection, awareness, context, screenshot) on Windows/macOS/Linux
- **i18n**: Multi-language support via `next-intl` (English, Chinese)

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
    App --> AppSettings["settings/ - Settings Pages"]
    App --> AppStandalone["Standalone Windows"]
    App --> AppAPI["api/ - API Routes"]

    Components --> CompUI["ui/ - shadcn Components"]
    Components --> CompChat["chat/ - Chat Components"]
    Components --> CompAgent["agent/ - Agent Components"]
    Components --> CompAI["ai-elements/ - AI Components"]
    Components --> CompDesigner["designer/ - Visual Designer"]
    Components --> CompNative["native/ - Native Features"]
    Components --> CompWorkflow["workflow-editor/ - Workflow Editor"]
    Components --> CompProviders["providers/ - Provider System"]
    Components --> CompLayout["layout/ - Layout Components"]
    Components --> CompVideoStudio["video-studio/ - Video Studio"]
    Components --> CompObservability["observability/ - Observability"]

    Lib --> LibAI["ai/ - AI Integration"]
    Lib --> LibDB["db/ - Database"]
    Lib --> LibExport["export/ - Export Utilities"]
    Lib --> LibNative["native/ - Native Bridges"]
    Lib --> LibDesigner["designer/ - Designer Logic"]
    Lib --> LibDocument["document/ - Document Processing"]
    Lib --> LibVector["vector/ - Vector Databases"]
    Lib --> LibObservability["observability/ - Observability"]

    Hooks --> HooksAI["ai/ - AI Hooks"]
    Hooks --> HooksAgent["agent/ - Agent Hooks"]
    Hooks --> HooksChat["chat/ - Chat Hooks"]
    Hooks --> HooksNative["native/ - Native Hooks"]
    Hooks --> HooksUI["ui/ - UI Hooks"]
    Hooks --> HooksRAG["rag/ - RAG Hooks"]
    Hooks --> HooksDesigner["designer/ - Designer Hooks"]
    Hooks --> HooksVideoStudio["video-studio/ - Video Studio Hooks"]

    Stores --> StoresAgent["agent/ - Agent State"]
    Stores --> StoresChat["chat/ - Chat State"]
    Stores --> StoresMCP["mcp/ - MCP State"]
    Stores --> StoresSettings["settings/ - Settings"]
    Stores --> StoresSystem["system/ - System State"]
    Stores --> StoresMedia["media/ - Media State"]
    Stores --> StoresProject["project/ - Projects"]
    Stores --> StoresSkills["skills/ - Skills State"]

    SrcTauri --> TauriCommands["commands/ - Tauri Commands"]
    SrcTauri --> TauriMCP["mcp/ - MCP Manager"]
    SrcTauri --> TauriSelection["selection/ - Selection System"]
    SrcTauri --> TauriScreenshot["screenshot/ - Screenshot System"]
    SrcTauri --> TauriAwareness["awareness/ - Awareness System"]
    SrcTauri --> TauriSandbox["sandbox/ - Code Execution"]
    SrcTauri --> TauriJupyter["jupyter/ - Jupyter Integration"]
    SrcTauri --> TauriScreenRecording["screen_recording/ - Screen Recording"]

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
| **app** | `app/` | Frontend | Next.js App Router with standalone windows | 62 | Yes | Good |
| **components** | `components/` | Frontend | Feature-based React components (43 directories) | 300 | Yes | Good |
| **lib** | `lib/` | Frontend | Domain utilities and business logic | 200 | Yes | Good |
| **hooks** | `hooks/` | Frontend | Custom React hooks organized by domain | 100 | Yes | Good |
| **stores** | `stores/` | Frontend | Zustand state management with persistence | 100 | Yes | Good |
| **types** | `types/` | Frontend | TypeScript type definitions | 105 | Yes | Complete |
| **src-tauri** | `src-tauri/` | Backend | Tauri Rust backend for native capabilities | 147 | No | Partial |
| **e2e** | `e2e/` | Testing | Playwright E2E test specifications | 100 | N/A | Good |

## Development Commands

```bash
# Frontend
pnpm dev              # Start Next.js dev server (localhost:3000)
pnpm build            # Production build (static export to out/)
pnpm start            # Serve production build
pnpm lint             # Run ESLint
pnpm lint --fix       # Auto-fix ESLint issues

# Testing - Unit
pnpm test             # Run Jest unit tests (169 test files)
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

**Key constraint**: Production builds use `output: "export"` for static site generation (`next.config.ts`). No server-side API routes can be used in deployed desktop apps—Tauri loads static files from `out/`.

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

### Other Systems

- **Designer System**: V0-style visual web page designer with AI-powered editing
- **Workflow Editor**: Visual workflow editor with React Flow
- **Workflow Marketplace**: Discover and share workflows
- **Skills System**: Custom skill framework for extending AI capabilities
- **Learning Mode**: Interactive learning system for educational content
- **Sandbox System**: Secure code execution with Docker/Podman/Native support
- **Jupyter Integration**: Full Jupyter kernel and session management
- **Git Integration**: Git operations support
- **Academic Mode**: Research paper search and management
- **Video Studio**: Video editing and generation with timeline, effects, and recording
- **Observability**: System observability and monitoring

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
| `stores/learning/` | `learning-store` | Learning mode state |
| `stores/mcp/` | `mcp-store`, `mcp-marketplace-store` | MCP servers, marketplace |
| `stores/media/` | `media-store`, `image-studio-store`, `screen-recording-store` | Video/image, screen recording |
| `stores/project/` | `project-store`, `project-activity-store`, `project-activity-subscriber` | Projects, activities |
| `stores/settings/` | `settings-store`, `preset-store`, `custom-theme-store`, `settings-profiles-store` | User preferences, presets |
| `stores/system/` | `native-store`, `proxy-store`, `usage-store`, `window-store`, `environment-store`, `virtual-env-store`, `ui-store` | Native state, proxy, usage |
| `stores/tools/` | `skill-store`, `template-store`, `ppt-editor-store`, `jupyter-store` | Skills, tools |
| `stores/workflow/` | `workflow-store`, `workflow-editor-store` | Workflow definitions and execution |
| `stores/git/` | `git-store` | Git state |
| `stores/a2ui/` | `a2ui-store` | A2UI state |
| `stores/academic/` | `academic-store`, `knowledge-map-store` | Academic mode state |
| `stores/plugin/` | `plugin-store` | Plugin state |
| `stores/prompt/` | `prompt-template-store`, `prompt-marketplace-store` | Prompt management |
| `stores/tool-history/` | `tool-history-store` | Tool usage history |
| `stores/sandbox/` | `sandbox-store` | Sandbox state |
| `stores/skills/` | `skill-store` | Skills state |

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

## Coverage Report

- **Total Files**: 3,681
- **Scanned Files**: 3,681
- **Coverage**: 100%
- **Status**: Complete - all major modules and files indexed

### Language Breakdown

| Language | Files | Percentage |
|----------|-------|------------|
| TypeScript | 2,356 | 64% |
| TSX | 1,020 | 28% |
| Rust | 147 | 4% |
| JSON | 100 | 3% |
| Other | 58 | 1% |

### Module Coverage Summary

| Module | Files | Dirs | Coverage | Notes |
|--------|-------|------|----------|-------|
| app | 62 | 9 | Good | All routes, API routes, and layouts documented |
| components | 300 | 43 | Good | 43 component directories indexed |
| lib | 200 | 20 | Good | All subdirectories documented |
| hooks | 100 | 19 | Good | 19 hook categories indexed |
| stores | 100 | 23 | Good | 23 store directories documented |
| types | 105 | 20 | Complete | All type definitions indexed |
| src-tauri | 147 | 15 | Partial | Rust modules documented |
| e2e | 100 | 4 | Good | Playwright test files |

## Documentation System

This project has a comprehensive documentation system:

- **Root Documentation**: `CLAUDE.md` (this file)
- **Module Documentation**: `*/CLAUDE.md` in each major module directory
- **Feature Documentation**: `llmdoc/index.md` with detailed feature docs
- **Index**: `.claude/index.json` with complete file inventory

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
