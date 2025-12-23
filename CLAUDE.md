# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Cognia is an AI chat application with multi-provider support, built with:

- **Frontend**: Next.js 16 with React 19.2, TypeScript, and Tailwind CSS v4
- **Desktop Framework**: Tauri 2.9 for cross-platform desktop app capabilities
- **UI Components**: shadcn/ui with Radix UI primitives and Lucide icons
- **State Management**: Zustand stores + Dexie for IndexedDB persistence
- **AI Integration**: Vercel AI SDK with multiple providers (OpenAI, Anthropic, Google, etc.)

## Development Commands

```bash
# Frontend
pnpm dev              # Start Next.js dev server
pnpm build            # Production build
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
```

## Architecture

### Project Structure

- `app/` — Next.js App Router: `(chat)/`, `settings/`, `designer/`, `projects/`, `api/`
- `components/` — Feature-based:
  - `ui/` — shadcn/Radix components
  - `chat/`, `sidebar/`, `settings/`, `artifacts/`, `canvas/`, `designer/`, `projects/`, `presets/`, `agent/`, `ai-elements/`, `export/`, `layout/`, `providers/`
- `lib/` — Domain utilities: `ai/`, `db/`, `document/`, `export/`, `file/`, `i18n/`, `native/`, `search/`, `themes/`, `vector/`
- `hooks/` — Custom hooks: `use-agent.ts`, `use-messages.ts`, `use-rag.ts`, `use-vector-db.ts`, etc.
- `stores/` — Zustand stores: `settings-store.ts`, `session-store.ts`, `project-store.ts`, etc.
- `types/` — TypeScript definitions: `provider.ts`, `message.ts`, `artifact.ts`, etc.
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

## Development Notes

- Uses pnpm as package manager
- Tauri builds to `out/` directory
- Supports both web and desktop deployment
- Conventional Commits enforced via commitlint + Husky
