# Repository Guidelines

## Project Structure & Module Organization

- `app/` — Next.js App Router with routes: `(chat)/`, `settings/`, `designer/`, `projects/`, `api/`.
- `components/` — Feature-based organization:
  - `ui/` — Reusable shadcn/Radix UI components (button, dialog, etc.).
  - `chat/`, `sidebar/`, `settings/`, `artifacts/`, `canvas/`, `designer/`, `projects/`, `presets/`, `agent/`, `ai-elements/`, `export/`, `layout/`, `providers/`.
- `lib/` — Core utilities organized by domain: `ai/`, `db/`, `document/`, `export/`, `file/`, `i18n/`, `native/`, `search/`, `themes/`, `vector/`.
- `hooks/` — Custom React hooks (e.g., `use-agent.ts`, `use-messages.ts`, `use-rag.ts`, `use-vector-db.ts`).
- `stores/` — Zustand state stores (e.g., `settings-store.ts`, `session-store.ts`, `project-store.ts`).
- `types/` — TypeScript type definitions (e.g., `provider.ts`, `message.ts`, `artifact.ts`).
- `e2e/` — Playwright end-to-end tests organized by feature: `ai/`, `core/`, `features/`, `ui/`.
- `__mocks__/` — Jest mocks for external dependencies.
- `public/` — Static assets (SVGs, icons).
- `src-tauri/` — Tauri desktop wrapper (Rust code, config, icons).
- Root configs: `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`, `components.json`, `jest.config.ts`, `playwright.config.ts`.

## Build, Test, and Development Commands

- `pnpm dev` — Run Next.js in development.
- `pnpm build` — Create a production build.
- `pnpm start` — Serve the production build.
- `pnpm lint` — Run ESLint. Use `--fix` to auto-fix.
- `pnpm test` — Run Jest unit tests.
- `pnpm test:watch` — Run Jest in watch mode.
- `pnpm test:coverage` — Run Jest with coverage report.
- `pnpm test:e2e` — Run Playwright e2e tests.
- `pnpm test:e2e:ui` — Run Playwright with UI mode.
- `pnpm test:e2e:headed` — Run Playwright in headed browser.
- `pnpm tauri dev` — Launch desktop app (requires Rust toolchain).
- `pnpm tauri build` — Build desktop binaries.

## Coding Style & Naming Conventions

- Language: TypeScript with React 19.2 and Next.js 16.
- State: Zustand stores in `stores/`; Dexie for IndexedDB persistence.
- Linting: `eslint.config.mjs` is the source of truth; keep code warning-free.
- Styling: Tailwind CSS v4 (utility-first). Co-locate minimal component-specific styles.
- Components: PascalCase names/exports; files in `components/ui/` mirror export names.
- Routes: Next app files are lowercase (`page.tsx`, `layout.tsx`).
- Code: camelCase variables/functions; hooks start with `use*` and live in `hooks/`.
- Types: Centralized in `types/`; import from `@/types`.

## Testing Guidelines

- **Unit tests**: Jest + React Testing Library. Name tests `*.test.ts`/`*.test.tsx`; co-locate next to source.
- **E2E tests**: Playwright. Tests live in `e2e/` organized by feature.
- **Mocks**: Place in `__mocks__/` for external dependencies (Tauri plugins, etc.).
- Coverage: Prioritize `lib/` utilities, stores, and complex UI logic.

## Commit & Pull Request Guidelines

- Conventional Commits enforced via commitlint: `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`, `ci:`.
- Husky pre-commit hooks run lint-staged.
- Link issues in the footer: `Closes #123`.
- PRs should include: brief scope/intent, screenshots for UI changes, validation steps, and pass `pnpm lint`.
- Keep changes focused; avoid unrelated refactors.

## Security & Configuration Tips

- Use `.env.local` for secrets; do not commit `.env*` files.
- Only expose safe client values via `NEXT_PUBLIC_*`.
- Tauri: minimize capabilities in `src-tauri/tauri.conf.json`; avoid broad filesystem access.
