# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Cognia is a Next.js 16 + Tauri 2.9 hybrid desktop AI chat application with:
- **Frontend**: React 19.2 + TypeScript + Tailwind CSS v4 + shadcn/ui
- **Desktop**: Tauri 2.9 (Rust backend) for native capabilities
- **AI**: Vercel AI SDK v5 with 14+ providers
- **State**: Zustand stores + Dexie (IndexedDB)

### Key Entrypoints
- `app/layout.tsx` - Root layout with Geist fonts
- `app/page.tsx` - Home page
- `app/(chat)/page.tsx` - Main chat interface
- `app/globals.css` - Global styles and Tailwind v4 theme

### Config Files
- `next.config.ts` - Next.js config (static export)
- `tsconfig.json` - TypeScript strict mode, `@/*` path alias
- `eslint.config.mjs` - ESLint flat config
- `postcss.config.mjs` - Tailwind v4 plugin
- `jest.config.ts` - Jest testing config
- `playwright.config.ts` - E2E testing config

## Package Manager

**Use pnpm** (lockfile present). Examples below use pnpm.

## Common Commands

### Development
```bash
pnpm install           # Install dependencies
pnpm dev               # Next.js dev server (http://localhost:3000)
pnpm tauri dev         # Desktop app with hot reload
```

### Building
```bash
pnpm build             # Static export to out/
pnpm start             # Serve production build
pnpm tauri build       # Build desktop installer
```

### Code Quality
```bash
pnpm lint              # ESLint check
pnpm lint --fix        # Auto-fix ESLint issues
pnpm exec tsc --noEmit # TypeScript type check
```

### Testing
```bash
pnpm test                           # Run Jest unit tests
pnpm test:watch                     # Jest watch mode
pnpm test:coverage                  # Jest with coverage report
pnpm test -- path/to/file.test.ts   # Run single test file
pnpm test -- --testNamePattern="test name"  # Run specific tests

pnpm test:e2e                       # Run Playwright E2E tests
pnpm test:e2e:ui                    # Playwright UI mode
pnpm test:e2e:headed                # Playwright headed browser
```

### i18n Scripts
```bash
pnpm i18n:extract      # Extract translation keys
pnpm i18n:validate     # Validate translations
pnpm i18n:stats        # Translation statistics
```

### Adding UI Components
```bash
pnpm dlx shadcn@latest add <component>   # Add shadcn component
```

## Architecture

### Routing
App Router under `app/`:
- `app/(chat)/` - Chat interface
- `app/settings/` - Settings page
- `app/designer/` - Visual designer
- `app/workflows/` - Workflow editor
- `app/video-editor/` - Video editor
- `app/projects/` - Project management

### Styling
Tailwind CSS v4 via PostCSS:
- `app/globals.css` - Theme variables (oklch), `@theme inline`
- Class-based dark mode (`.dark` class)
- `cn()` utility from `@/lib/utils` for class merging

### TypeScript
- Strict mode enabled
- Bundler module resolution
- Path alias: `@/*` → repo root

### State Management
Zustand stores in modular directories:
```
stores/
├── agent/       # Agent execution
├── artifact/    # Artifacts, canvas
├── chat/        # Chat sessions
├── context/     # Clipboard, quotes
├── data/        # Files, templates
├── designer/    # Designer state
├── learning/    # Learning mode
├── mcp/         # MCP servers
├── media/       # Media, recording
├── project/     # Projects
├── settings/    # User settings
├── system/      # Native, proxy
├── tools/       # Skills
└── workflow/    # Workflows
```

### Hooks
Modular hook directories:
```
hooks/
├── ai/          # use-agent, use-skills
├── chat/        # use-summary
├── context/     # use-clipboard-context
├── designer/    # use-workflow-editor
├── media/       # use-speech
├── native/      # use-native, use-window
├── network/     # use-proxy
├── sandbox/     # use-environment
├── ui/          # use-global-shortcuts
└── utils/       # use-element-resize
```

### Tauri (Desktop)
- `src-tauri/tauri.conf.json` - Tauri config
- `src-tauri/src/` - Rust backend modules:
  - `awareness/` - System monitoring
  - `context/` - Context detection
  - `screenshot/` - Screenshot capture
  - `selection/` - Text selection
  - `mcp/` - Model Context Protocol
  - `sandbox/` - Code execution

## Coverage Requirements

- Lines: 70%
- Branches: 60%
- Functions: 60%

## Notes

- Production uses static export (`output: "export"`)
- No server-side API routes in desktop builds
- Rust toolchain v1.77.2+ required for Tauri
- Conventional commits enforced via commitlint + Husky
- Monaco Editor dynamically imported (SSR disabled)
