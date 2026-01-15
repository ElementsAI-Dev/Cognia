# Cognia Code Style & Conventions

## TypeScript Configuration

- **Strict Mode**: Enabled
- **Target**: ES2017
- **Module System**: ESNext with bundler resolution
- **Path Aliases**: `@/*` → root directory
- **JSX**: react-jsx (new JSX transform)

## ESLint Rules

- Based on `eslint-config-next` (core-web-vitals + TypeScript)
- Custom rules:
  - Unused variables starting with `_` are allowed
  - Inline styles for dynamic values are allowed (CSS-in-JS)
  - `<li>` without parent context check disabled (react-markdown)

## Naming Conventions

- **Components**: PascalCase (e.g., `ChatContainer.tsx`)
- **Hooks**: camelCase with `use-` prefix (e.g., `use-chat-observability.ts`)
- **Utilities**: camelCase (e.g., `agent-executor.ts`)
- **Types**: PascalCase (e.g., `Session`, `Message`)
- **Constants**: UPPER_SNAKE_CASE or camelCase depending on scope

## File Organization

- **Colocation**: Tests next to source files (e.g., `chat-container.tsx` + `chat-container.test.tsx`)
- **Barrel Exports**: `index.ts` files for clean imports
- **Type Definitions**: Co-located or in `types/` directory

## Commit Convention

- **Format**: Conventional Commits via commitlint
- **Types**: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert
- **Enforced**: Husky git hooks

## Testing Conventions

- **Unit Tests**: Jest with `*.test.ts` or `*.test.tsx` suffix
- **Coverage**: 55%+ lines, 50%+ branches (enforced in CI)
- **Exclusions**: External services (search, vector DBs, native runtime)
- **Test Environment**: jsdom with fake timers and mock resets

## Import Order

1. React/Next.js imports
2. Third-party libraries
3. Internal imports (prefixed with `@/`)
4. Relative imports
5. Type-only imports

## Code Patterns

- **State Management**: Zustand stores with `persist` middleware
- **Data Fetching**: React hooks with async/await
- **Error Handling**: Try-catch with proper error logging
- **Type Safety**: Strict TypeScript, no `any` without justification
