# Cognia Documentation

Welcome to the official documentation for Cognia — an AI-native chat and creation application with multi-provider support, available as both a web app and a Tauri desktop app.

## Quick Navigation

### Features

#### Core

- [AI Integration](features/ai-integration.md) — Provider setup and model selection (14+ providers)
- [Chat](features/chat-features.md) — Chat modes, branching, and advanced features
- [Agent System](features/agent-guide.md) — Autonomous AI agents with tool calling and planning
- [Agent Integration](features/agent-integration.md) — Agent, RAG, Skills, and MCP tool integration
- [Artifacts](features/artifacts-system.md) — AI-generated standalone content
- [Projects](features/projects-management.md) — Organize conversations with knowledge bases
- [MCP Guide](features/mcp-guide.md) — Model Context Protocol usage
- [Configuration](features/configuration.md) — Settings and customization
- [Advanced Features](features/advanced-features.md) — Learning mode, Socratic method

#### Creative Tools

- [Arena](features/arena.md) — Model comparison with ELO rankings
- [Academic Mode](features/academic-mode.md) — Paper search, library, and AI analysis
- [LaTeX Editor](features/latex-editor.md) — LaTeX editing with AI assistance
- [Canvas Editor](features/canvas-editor.md) — Monaco code editor with AI suggestions
- [Workflow Editor](features/workflow-editor.md) — Visual workflow builder (React Flow)
- [Designer](features/designer.md) — V0-style visual web page designer
- [Sandbox](features/sandbox.md) — Multi-language code execution
- [Notebook](features/notebook.md) — Jupyter notebook integration
- [Video Studio](features/video-studio.md) — Screen recording and AI video generation
- [PPT Editor](features/ppt-editor.md) — AI-powered presentation creation
- [SpeedPass](features/speedpass.md) — Interactive learning system
- [A2UI](features/a2ui-system.md) — AI-to-UI app generation

#### Media & Export

- [Screenshot Editor](features/screenshot-editor.md) — Annotation with 9 tools
- [Screen Recording](features/screen-recording.md) — Desktop screen capture
- [Image Studio](features/image-studio-components.md) — Image editing tools
- [Export System](features/export-system.md) — Multi-format export and import

#### Platform & Infrastructure

- [Scheduler](features/scheduler.md) — Task scheduling with cron, interval, and events
- [Git Integration](features/git-integration.md) — Repository management
- [Observability](features/observability.md) — System monitoring dashboard
- [Provider Infrastructure](features/provider-infrastructure.md) — Circuit breaker, load balancer
- [Plugin Development](features/plugin-development.md) — Plugin SDK guide
- [Scheduler Plugins](features/scheduler-plugin-integration.md) — Plugin task scheduling
- [Intent Detection](features/intent-detection.md) — Intelligent mode switching

#### Native Tools (Desktop Only)

- [Overview](features/native-tools.md) — Introduction to native tools
- [Selection](features/native-selection.md) — Smart text selection and clipboard
- [Awareness](features/native-awareness.md) — System monitoring and productivity
- [Context & Screenshot](features/native-context-screenshot.md) — Context detection
- [Selection Toolbar](features/selection-toolbar-enhancements.md) — Enhanced toolbar
- [Input Completion](features/input-completion.md) — AI-powered Tab completion

### For Developers

- [Getting Started](development/getting-started.md) — Installation and setup
- [Architecture Overview](architecture/overview.md) — System design and patterns
- [Tech Stack](architecture/tech-stack.md) — Technology choices
- [Data Flow](architecture/data-flow.md) — State management flow
- [MCP Architecture](architecture/mcp-architecture.md) — MCP system design
- [Project Structure](development/project-structure.md) — Directory organization
- [Coding Standards](development/coding-standards.md) — Development guidelines
- [Testing](development/testing.md) — Testing strategy
- [Building](development/building.md) — Build and deployment
- [Contributing](development/contributing.md) — Contribution workflow

### API Reference

- [Overview](api/overview.md) — API introduction and conventions
- [Routes](api/routes.md) — API routes reference
- [Hooks](api/hooks.md) — Custom React hooks
- [Stores](api/stores.md) — Zustand stores
- [Components](api/components.md) — Component API
- [Utilities](api/utilities.md) — Utility functions

### Reference

- [AI API Comparison](reference/ai-api-comparison.md) — Provider API comparison guide

## Architecture at a Glance

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16, React 19.2, Tailwind CSS v4 |
| **Desktop** | Tauri 2.9, Rust backend |
| **State** | Zustand v5 with localStorage persistence |
| **Database** | Dexie (IndexedDB) for messages and large data |
| **AI** | Vercel AI SDK v5, 14+ providers |
| **Build** | Static export (`output: "export"`) |

## Getting Started

```bash
# Clone and install
git clone https://github.com/ElementsAI-Dev/Cognia.git
cd cognia && pnpm install

# Web development
pnpm dev              # http://localhost:3000

# Desktop development (requires Rust 1.77+)
pnpm tauri dev        # Launch Tauri app
pnpm tauri build      # Build desktop binary
```

## Additional Resources

- [Main README](../README.md) — Project overview
- [CLAUDE.md](../CLAUDE.md) — Guidelines for AI assistants
- [AGENTS.md](../AGENTS.md) — Repository guidelines and coding standards

---

**Last Updated**: February 9, 2026
