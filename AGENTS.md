# Repository Guidelines

## Build, Test, and Development Commands

- `pnpm dev` — Run Next.js dev server (localhost:3000)
- `pnpm tauri dev` — Launch Tauri desktop app (requires Rust 1.77+)
- `pnpm build` — Create production build (static export to `out/`)
- `pnpm start` — Serve production build
- `pnpm lint` — Run ESLint. Use `--fix` to auto-fix
- `pnpm test` — Run Jest unit tests
- `pnpm test <file>` — Run single test: `pnpm test lib/utils.test.ts`
- `pnpm test:watch` — Run Jest in watch mode
- `pnpm test:coverage` — Jest coverage report (target: lines 70%, branches 60%)
- `pnpm test:e2e` — Run Playwright E2E tests
- `pnpm test:e2e:ui` — Playwright with UI mode
- `pnpm tauri build` — Build desktop binaries
- `pnpm dlx shadcn@latest add <component>` — Add shadcn UI components

## Project Structure & Module Organization

- `app/` — Next.js App Router: `(chat)/`, `settings/`, `projects/`, `api/`
- `components/ui/` — shadcn/Radix UI components (50+)
- `components/` — Feature components: `chat/`, `agent/`, `artifacts/`, `designer/`, etc.
- `hooks/` — Custom React hooks: `ai/`, `native/`, `ui/`, `rag/`, `sandbox/`
- `stores/` — Zustand stores by domain (all use localStorage persist middleware)
- `lib/` — Core utilities: `ai/`, `db/`, `export/`, `native/`, `vector/`
- `types/` — TypeScript type definitions
- `e2e/` — Playwright tests by feature
- `src-tauri/src/` — Rust backend: `mcp/`, `awareness/`, `context/`, `sandbox/`

## Coding Style & Naming Conventions

### Imports
- Always use `@/` path alias: `import { cn } from "@/lib/utils"`
- Group imports: React/external libs → internal components → hooks → types → utils
- Explicit extensions for non-TS files only

### Styling
- Tailwind CSS v4 with CSS variables in `app/globals.css`
- Use `cn()` utility from `lib/utils` to merge classes (handles conditionals + deduplication)
- Dark mode: class-based (`.dark` parent), not media query
- Co-locate minimal component-specific styles; avoid inline styles for static values

### Components
- Functional components + hooks only
- PascalCase names and exports
- Files in `components/ui/` mirror export names
- Use `asChild` prop for polymorphism: `<Button asChild><Link href="/path"/></Button>`
- Client components: `'use client'` directive at top of file

### State Management
- Zustand v5 with `persist` middleware (all stores auto-save to localStorage)
- Dexie for IndexedDB (messages, large datasets)
- Store keys follow `cognia-*` pattern: `cognia-settings`, `cognia-sessions`
- Barrel exports: `import { useSettingsStore } from "@/stores"`

### TypeScript
- Strict mode enabled in tsconfig
- Type definitions centralized in `types/`
- Never use `as any`, `@ts-ignore`, `@ts-expect-error`
- Use proper types from `@/types` instead of redefining

### Naming
- Variables/functions: camelCase
- Components/Types: PascalCase
- Hooks: `use*` prefix, live in `hooks/`
- Constants: UPPER_SNAKE_CASE or camelCase
- Test files: `*.test.ts` / `*.test.tsx` co-located next to source

### Error Handling
- Never use empty catch blocks: `catch(e) {}`
- Log errors with context: `console.error('Failed to load data:', error)`
- Provide user-friendly error messages in UI

## Testing Guidelines

### Unit Tests (Jest)
- Name tests `*.test.ts`/`*.test.tsx`; co-locate next to source
- Use Jest + React Testing Library
- Mock Tauri plugins in `__mocks__/`
- Coverage excludes: `lib/search/`, `lib/vector/`, `lib/native/` (external services)
- Run single test: `pnpm test path/to/file.test.ts`

### E2E Tests (Playwright)
- Tests live in `e2e/` organized by feature: `ai/`, `core/`, `features/`, `ui/`
- Use `test:e2e:ui` for interactive debugging

## Constraints & Configuration

- Package manager: pnpm only
- Commits: Conventional commits via commitlint + Husky pre-commit hooks
- Linter: `eslint.config.mjs` is the source of truth
- No Prettier — ESLint handles all formatting
- Monaco Editor: Dynamic import with SSR disabled
- API keys: Stored in localStorage (unencrypted), never commit `.env.local`
- MCP servers: Full system access — only install trusted servers

## Key Architectural Patterns

### Agent System (3-tier)
- Application: `hooks/ai/use-agent.ts` — React integration
- Orchestration: `lib/ai/agent/agent-loop.ts` — Multi-step execution
- Execution: `lib/ai/agent/agent-executor.ts` — Tool calling via AI SDK

### AI Integration
- 14+ providers via Vercel AI SDK v5
- Auto-router: Fast/Balanced/Powerful tiers in `lib/ai/auto-router.ts`
- MCP tools: `lib/ai/agent/mcp-tools.ts`

### Native Tools (Desktop only)
- Selection, awareness, context, screenshots
- Rust: `src-tauri/src/{awareness,context,screenshot,selection}/`
- Frontend: `lib/native/`, `hooks/native/`, `stores/system/native-store.ts`
