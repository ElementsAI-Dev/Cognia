# GEMINI.md

## Project Overview

Cognia is an AI chat application with multi-provider support, combining a Next.js/React frontend with a Tauri (Rust) backend.

**Key Technologies:**

- **Frontend:** Next.js 16, React 19.2, TypeScript
- **Styling:** Tailwind CSS v4, shadcn/ui components
- **State:** Zustand stores + Dexie (IndexedDB)
- **AI:** Vercel AI SDK (OpenAI, Anthropic, Google, etc.)
- **Desktop:** Tauri 2.9

## Project Structure

- `app/` — Next.js routes: `(chat)/`, `settings/`, `designer/`, `projects/`, `api/`
- `components/` — Feature modules: `chat/`, `sidebar/`, `settings/`, `artifacts/`, `canvas/`, `designer/`, `projects/`, `presets/`, `agent/`, `ai-elements/`, `ui/`
- `lib/` — Utilities: `ai/`, `db/`, `document/`, `export/`, `file/`, `i18n/`, `native/`, `search/`, `themes/`, `vector/`
- `hooks/` — Custom hooks (`use-agent.ts`, `use-messages.ts`, `use-rag.ts`, etc.)
- `stores/` — Zustand stores (`settings-store.ts`, `session-store.ts`, etc.)
- `types/` — TypeScript definitions
- `e2e/` — Playwright tests
- `src-tauri/` — Rust backend

## Commands

### Development

- `pnpm dev` — Start Next.js dev server
- `pnpm build` — Production build
- `pnpm start` — Serve production
- `pnpm lint` — ESLint (use `--fix` to auto-fix)

### Testing

- `pnpm test` — Jest unit tests
- `pnpm test:watch` — Jest watch mode
- `pnpm test:coverage` — Jest with coverage
- `pnpm test:e2e` — Playwright e2e tests
- `pnpm test:e2e:ui` — Playwright UI mode

### Desktop

- `pnpm tauri dev` — Tauri dev mode
- `pnpm tauri build` — Build desktop app

## Conventions

### Styling

- Tailwind CSS with `clsx` and `tailwind-merge`
- shadcn/ui components in `components/ui/`

### Linting

- ESLint via `eslint.config.mjs` (Next.js recommended config)

### Commits

- Conventional Commits enforced via commitlint + Husky

### TypeScript

- Strict mode with path aliases: `@/components`, `@/lib`, `@/hooks`, `@/stores`, `@/types`
