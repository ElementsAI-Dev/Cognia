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
- `components/` — Feature components: `chat/`, `agent/`, `artifacts/`, `designer/`, `input-completion/`, `screenshot/`, `skills/skill-generator/`
- `hooks/` — Custom React hooks: `ai/`, `native/`, `ui/`, `rag/`, `sandbox/`, `input-completion/`, `skill-seekers/`
- `stores/` — Zustand stores by domain (all use localStorage persist middleware): `input-completion/`, `skill-seekers/`, `screenshot/`
- `lib/` — Core utilities: `ai/`, `db/`, `export/`, `native/`, `vector/`, `input-completion.ts`, `skill-seekers.ts`
- `types/` — TypeScript type definitions: `input-completion/`, `screenshot/`, `skill-seekers/`
- `e2e/` — Playwright tests by feature
- `src-tauri/src/` — Rust backend: `mcp/`, `awareness/`, `context/`, `sandbox/`, `input_completion/`, `skill_seekers/`

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
- Selection, awareness, context, screenshots, input completion, skill seekers
- Rust: `src-tauri/src/{awareness,context,screenshot,selection,input_completion,skill_seekers}/`
- Frontend: `lib/native/`, `hooks/native/`, `stores/system/native-store.ts`

### Input Completion System (Desktop only)
- GitHub Copilot-style AI-powered Tab completion with IME detection
- Rust: `src-tauri/src/input_completion/` — CompletionService, ImeMonitor, KeyboardMonitor
- Frontend: `components/input-completion/`, `hooks/input-completion/`, `stores/input-completion/`
- Providers: Ollama (qwen2.5-coder:0.5b), OpenAI, Groq
- Events: `input-completion://suggestion`, `input-completion://accept`, `input-completion://dismiss`

### Skill Seekers Integration (Desktop only)
- AI skill generation from websites, GitHub repos, PDFs
- Rust: `src-tauri/src/skill_seekers/` — Python CLI wrapper, job management
- Frontend: `components/skills/skill-generator/`, `hooks/skill-seekers/`, `stores/skill-seekers/`
- Commands: scrapeWebsite, scrapeGitHub, scrapePdf, enhanceSkills, packageSkills
- Events: `skill-seekers://progress`, `skill-seekers://log`, `skill-seekers://complete`

### Screenshot Editor (Enhanced)
- Full annotation system with 9 tools: rectangle, ellipse, arrow, freehand, text, blur, highlight, marker
- 8-point resize handles with magnifier loupe (toggle: G key)
- Undo/redo with 50 history depth
- Keyboard shortcuts: R/E/A/F/T/B/H/M for tools, Ctrl+Z/Y for undo/redo
- Components: `components/screenshot/`, `stores/screenshot/editor-store.ts`

## Event-Driven Architecture Pattern

### Tauri Events (Backend → Frontend)
- Use for real-time updates from long-running Rust operations
- Event naming: `<feature-name>://<event-type>` (e.g., `input-completion://suggestion`)
- Event listeners in hooks with cleanup (UnlistenFn)
- Progress events with `{ current, total, status }` payload
- Log streaming with MAX_LOGS = 500 limit

### Store Events (Frontend State)
- Zustand stores use pub/sub pattern via listeners
- Selector pattern for optimized subscriptions (e.g., `selectActiveJob`)
- History management with undo/redo stacks (50 item limit)

## Configuration Pattern

### Default Configuration Constants
- Define as `DEFAULT_*` constants: `DEFAULT_COMPLETION_CONFIG`, `DEFAULT_STYLE`
- Configuration interfaces with nested objects (model, trigger, ui)
- Partial update support with spread operator: `{ ...config, model: newModel }`
- Persistent configuration in localStorage via Zustand persist middleware

### Tauri Commands Pattern
- Guard with `isTauri()` before invoking
- Error handling with try-catch and logging
- TypeScript types defined in `types/` and re-exported from `types/index.ts`
- Native API in `lib/native/<feature>.ts` with complete type safety

## Desktop-Only Features

### Features Requiring Tauri Environment
- **Input Completion**: IME state detection, global keyboard monitoring, overlay window
- **Skill Seekers**: Python CLI integration with virtual environment management
- **Native Tools**: Selection, awareness, context, screenshots with system-level access

### Tauri Guard Pattern
```typescript
import { isTauri } from '@/lib/utils'

if (isTauri()) {
  // Desktop-only code
}
```

## CJK Language Support

### Input Method Editor (IME) Detection
- **Purpose**: Detect active IME state for Chinese, Japanese, Korean languages
- **Implementation**: `src-tauri/src/input_completion/ime_state.rs` — ImeMonitor
- **Usage**: Disable input completion suggestions while IME composition is active
- **State Management**: `ImeState { isActive: boolean, language?: string }`
- **Event**: `input-completion://ime-state-change` emitted on state changes

### Chinese Localization
- Region selector instructions with proper Chinese translations
- Component messages and UI labels support `zh-CN` locale

## Keyboard Shortcuts Reference

### Screenshot Editor
- **Tools**: V/S (Select), R (Rectangle), O (Ellipse), A (Arrow), P (Freehand), T (Text), B (Blur), H (Highlight), N (Marker)
- **Actions**: Ctrl+Z (Undo), Ctrl+Y (Redo), Delete (Remove selected), G (Toggle magnifier), Ctrl+C (Copy), Ctrl+S (Save), Ctrl+Enter (Confirm), Escape (Cancel)
- **Colors**: 1-0 for preset colors (Red=1, Orange=2, Yellow=3, Green=4, Cyan=5, Blue=6, Purple=7, Pink=8, White=9, Black=0)

### Region Selector
- **Movement**: Arrow keys (1px), Shift+Arrow (10px)
- **Resize**: Ctrl+Arrow keys
- **Magnifier**: M key to toggle

### Input Completion
- **Accept Suggestion**: Tab key
- **Dismiss Suggestion**: Escape key

### Global Shortcuts
- Ctrl+Shift+Space — Toggle chat widget
- Alt+Space — Trigger selection toolbar
- Ctrl+Shift+T — Quick translate
- Ctrl+Shift+E — Quick explain
- Alt+B — Toggle bubble visibility
- Alt+M — Toggle bubble minimize
