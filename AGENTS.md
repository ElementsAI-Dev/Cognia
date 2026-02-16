# Repository Guidelines

## Project Structure & Module Organization

- `app/`: Next.js App Router pages, layouts, and API routes (`app/api/**`).
- `components/`: Feature UI; shared primitives live in `components/ui/` (shadcn/Radix style).
- `hooks/`, `stores/`, `lib/`, `types/`: React hooks, Zustand state, core logic/utilities, and shared types.
- `src-tauri/src/`: Rust backend for desktop-only capabilities.
- `e2e/`: Playwright end-to-end suites. Unit tests are co-located with source as `*.test.ts(x)`.
- `docs/` and `scripts/`: internal documentation and automation scripts.

## Build, Test, and Development Commands

- `pnpm dev`: start Next.js dev server (`localhost:3000`).
- `pnpm tauri dev`: run desktop app in Tauri (Rust toolchain required).
- `pnpm build` / `pnpm start`: production build and serve.
- `pnpm lint`: run ESLint (source of truth: `eslint.config.mjs`).
- `pnpm test`, `pnpm test:watch`, `pnpm test:coverage`: Jest unit testing modes.
- `pnpm test:e2e`, `pnpm test:e2e:ui`: Playwright headless/UI mode.
- `pnpm exec tsc --noEmit`: strict TypeScript check before PR.

## Coding Style & Naming Conventions

- TypeScript-first, strict typing; avoid `any` and suppressions.
- Use `@/` imports (example: `import { cn } from "@/lib/utils"`).
- Functional React components and hooks only; client components must include `'use client'`.
- Naming: components/types in `PascalCase`, variables/functions in `camelCase`, hooks as `use*`.
- Styling: Tailwind CSS v4 + `cn()` utility; prefer CSS variables and avoid unnecessary inline styles.
- Formatting is enforced by ESLint; no Prettier in this repo.

## Testing Guidelines

- Unit: Jest + React Testing Library, co-located `*.test.ts` / `*.test.tsx`.
- E2E: Playwright tests under `e2e/` by feature area.
- Coverage (`pnpm test:coverage`) enforces global minimums in Jest config (lines/statements 55%, branches 50%, functions 40%).
- Prefer behavior-focused tests and mock Tauri/external services via `__mocks__/`.

## Commit & Pull Request Guidelines

- Follow Conventional Commits (e.g., `feat(chat): add branch switcher`).
- Allowed commit types include: `feat`, `fix`, `docs`, `refactor`, `test`, `build`, `ci`, `chore`, `revert`.
- Open focused PRs; complete `.github/PULL_REQUEST_TEMPLATE.md` sections:
  description, linked issue (`Closes #123`), test evidence, and screenshots/recordings for UI changes.
- Before requesting review, run: `pnpm lint && pnpm test && pnpm exec tsc --noEmit`.

## Security & Configuration Tips

- Use `pnpm` only; do not commit secrets or `.env.local`.
- Treat MCP server/tool access as high-trust; install only verified sources.
