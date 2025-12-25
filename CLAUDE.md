# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Cognia is an AI chat application with multi-provider support, built with:

- **Frontend**: Next.js 16 with React 19.2, TypeScript, and Tailwind CSS v4
- **Desktop Framework**: Tauri 2.9 for cross-platform desktop app capabilities
- **UI Components**: shadcn/ui with Radix UI primitives and Lucide icons
- **State Management**: Zustand stores + Dexie for IndexedDB persistence
- **AI Integration**: Vercel AI SDK with multiple providers (OpenAI, Anthropic, Google, DeepSeek, Groq, Mistral, Ollama)

## Development Commands

```bash
# Frontend
pnpm dev              # Start Next.js dev server
pnpm build            # Production build (static export to out/)
pnpm start            # Serve production build
pnpm lint             # Run ESLint (use --fix to auto-fix)

# Testing
pnpm test             # Run Jest unit tests
pnpm test:watch       # Jest watch mode
pnpm test:coverage    # Jest with coverage
pnpm test:e2e         # Run Playwright e2e tests
pnpm test:e2e:ui      # Playwright UI mode
pnpm test:e2e:headed  # Playwright headed browser

# Desktop
pnpm tauri dev        # Run Tauri dev mode
pnpm tauri build      # Build desktop binaries

# Adding shadcn components
pnpm dlx shadcn@latest add <component>
```

## Architecture

### High-Level Architecture

Cognia is a hybrid web/desktop application that:
1. Runs as a Next.js app during development (`pnpm dev`)
2. Builds to static HTML for Tauri desktop distribution (`pnpm build`)
3. Uses Tauri's Rust backend for native capabilities (MCP process management, file system access)

**Key constraint**: Production builds use `output: "export"` for static site generation, which means no server-side API routes can be used in deployed desktop apps.

### Project Structure

- `app/` — Next.js App Router: `(chat)/`, `settings/`, `designer/`, `projects/`, `api/`
- `components/` — Feature-based:
  - `ui/` — shadcn/Radix components
  - `chat/`, `sidebar/`, `settings/`, `artifacts/`, `canvas/`, `designer/`, `projects/`, `presets/`, `agent/`, `ai-elements/`, `export/`, `layout/`, `providers/`
- `lib/` — Domain utilities: `ai/`, `db/`, `document/`, `export/`, `file/`, `i18n/`, `native/`, `search/`, `themes/`, `vector/`
- `hooks/` — Custom hooks: `use-agent.ts`, `use-messages.ts`, `use-rag.ts`, `use-vector-db.ts`, etc.
- `stores/` — Zustand stores: `settings-store.ts`, `session-store.ts`, `project-store.ts`, `artifact-store.ts`, `memory-store.ts`, `usage-store.ts`, `preset-store.ts`, `mcp-store.ts`
- `types/` — TypeScript definitions: `provider.ts`, `message.ts`, `artifact.ts`, `session.ts`, `memory.ts`, `project.ts`, `preset.ts`, `usage.ts`, `mcp.ts`
- `e2e/` — Playwright tests: `ai/`, `core/`, `features/`, `ui/`
- `__mocks__/` — Jest mocks for external dependencies
- `src-tauri/` — Rust backend for desktop

### Key Technologies

- **Next.js 16** with App Router for React 19.2
- **Tailwind CSS v4** with PostCSS
- **AI SDK** (`ai`, `@ai-sdk/*`) for LLM integration
- **Zustand** for state + **Dexie** for IndexedDB
- **Tauri 2.9** for desktop apps
- **Jest** + **Playwright** for testing

### Path Aliases

- `@/components`, `@/lib`, `@/hooks`, `@/stores`, `@/types`

## Store Architecture

All Zustand stores use localStorage persistence with the `persist` middleware:

| Store | Key | Purpose |
|-------|-----|---------|
| `artifact-store.ts` | `cognia-artifacts` | Artifacts, canvas documents, version history |
| `settings-store.ts` | `cognia-settings` | Provider config, theme, custom instructions |
| `session-store.ts` | `cognia-sessions` | Chat sessions with branching support |
| `agent-store.ts` | `cognia-agents` | Agent execution tracking, tool invocations |
| `memory-store.ts` | `cognia-memory` | Cross-session AI memory |
| `project-store.ts` | `cognia-projects` | Project organization with knowledge bases |
| `usage-store.ts` | `cognia-usage` | Token and cost tracking |
| `preset-store.ts` | `cognia-presets` | Chat configuration presets |
| `mcp-store.ts` | `cognia-mcp` | MCP server management (state only, config in Rust) |

## AI Integration

### Supported Providers

- OpenAI (`@ai-sdk/openai`): GPT-4o, GPT-4o Mini, o1, o1 Mini
- Anthropic (`@ai-sdk/anthropic`): Claude 4 Sonnet/Opus, Claude 3.5 Haiku
- Google (`@ai-sdk/google`): Gemini 2.0 Flash, Gemini 1.5 Pro/Flash
- Mistral (`@ai-sdk/mistral`): Mistral Large, Mistral Small
- DeepSeek: OpenAI-compatible API
- Groq: OpenAI-compatible API (Llama 3.3, Mixtral)
- Ollama: Self-hosted models at `http://localhost:11434`

### Auto-Router

The auto-router (`lib/ai/auto-router.ts`) automatically selects models based on task complexity:
- **Fast tier**: Simple queries (Groq Llama 3.3, Gemini Flash, GPT-4o Mini, Haiku)
- **Balanced tier**: General tasks (Gemini 1.5 Pro, GPT-4o, Claude Sonnet)
- **Powerful tier**: Complex reasoning (Claude Opus, o1, DeepSeek Reasoner)

### Key Files

- `lib/ai/client.ts` — Provider client creation
- `lib/ai/use-ai-chat.ts` — Custom chat hook with streaming
- `lib/ai/auto-router.ts` — Intelligent model selection
- `lib/ai/image-utils.ts` — Vision support utilities
- `lib/ai/image-generation.ts` — DALL-E integration

## MCP (Model Context Protocol)

Cognia has comprehensive MCP support split between Rust backend and React frontend:

### Rust Backend (`src-tauri/src/mcp/`)
- `manager.rs` — Server lifecycle management
- `client.rs` — JSON-RPC 2.0 protocol implementation
- `transport/stdio.rs` — stdio transport
- `transport/sse.rs` — SSE transport
- `protocol/` — Tools, resources, prompts protocols

### Frontend
- `stores/mcp-store.ts` — Zustand store for MCP state
- `components/settings/mcp-settings.tsx` — MCP management UI
- `components/settings/mcp-server-dialog.tsx` — Add/edit server dialog
- `components/settings/mcp-install-wizard.tsx` — Quick install wizard

## Component Patterns

### Adding UI Components

```bash
# Use shadcn CLI for Radix UI base components
pnpm dlx shadcn@latest add <component>
```

### Creating New Stores

1. Create in `/stores/` directory
2. Use Zustand with persist middleware
3. Export store as default or named export
4. Use `useStore()` hook in components

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

### Testing Coverage

Excluded from coverage (require external services/runtime):
- `lib/search/` — External search APIs
- `lib/vector/` — Vector DB clients
- `lib/native/` — Tauri runtime
- `lib/project/import-export.ts` — File system operations

## Development Notes

- Uses pnpm as package manager
- Tauri builds to `out/` directory
- Supports both web and desktop deployment
- Conventional Commits enforced via commitlint + Husky
- Monaco Editor dynamically imported with SSR disabled
