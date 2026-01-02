# Copilot Instructions for Cognia

## Project Architecture

This is a **Next.js 16 (App Router) + Tauri v2.9 hybrid desktop application** combining:
- **Frontend**: React 19.2 + TypeScript + Tailwind CSS v4 + shadcn/ui components
- **Desktop wrapper**: Tauri 2.9 (Rust-based) for native desktop capabilities
- **State management**: Zustand stores with localStorage persistence + Dexie for IndexedDB
- **AI Integration**: Vercel AI SDK v5 with 14+ providers

### Dual Runtime Model

1. **Web mode** (`pnpm dev`): Next.js dev server at http://localhost:3000
2. **Desktop mode** (`pnpm tauri dev`): Tauri wraps the Next.js app in a native window

**Critical**: Production builds use `output: "export"` for static site generation. No server-side API routes in deployed desktop apps—Tauri loads static files from `out/`.

## Key File Locations & Conventions

### Routing & Layouts
- `app/layout.tsx`: Root layout, configures Geist fonts, imports `globals.css`
- `app/page.tsx`: Home route
- `app/(chat)/page.tsx`: Main chat interface
- `app/settings/page.tsx`: Settings page
- `app/designer/page.tsx`: Visual designer
- `app/workflows/page.tsx`: Workflow editor
- `app/video-editor/page.tsx`: Video editor
- Path alias: `@/*` maps to repo root (e.g., `@/lib/utils`)

### Styling System
- **Tailwind v4** via PostCSS plugin (`@tailwindcss/postcss`)
- `app/globals.css`: CSS variables for theme colors (oklch color space), `@theme inline` directive
- Color system: All colors defined as CSS variables (light + `.dark` overrides)
- Custom dark mode variant: `@custom-variant dark (&:is(.dark *))`

### Component Patterns
- **shadcn/ui components** in `components/ui/`
- Uses `@radix-ui/react-slot` for `asChild` polymorphism
- Uses `class-variance-authority` for variant management
- Uses `cn()` utility from `@/lib/utils` (clsx + tailwind-merge)
- Config: `components.json` defines shadcn settings

### Modular Hooks Structure (`hooks/`)
```
hooks/
├── ai/          # use-agent, use-background-agent, use-skills, use-sub-agent
├── chat/        # use-summary
├── context/     # use-clipboard-context, use-project-context
├── designer/    # use-designer-drag-drop, use-workflow-editor, use-workflow-execution
├── media/       # use-speech
├── native/      # use-native, use-notification, use-window
├── network/     # use-proxy
├── rag/         # RAG-related hooks
├── sandbox/     # use-environment, use-jupyter-kernel, use-session-env, use-virtual-env
├── ui/          # use-global-shortcuts, use-learning-mode, use-mention, use-selection-toolbar
└── utils/       # use-element-resize
```

### Modular Stores Structure (`stores/`)
```
stores/
├── agent/       # Agent execution tracking
├── artifact/    # Artifacts, canvas, versions
├── chat/        # Chat sessions, widget state
├── context/     # Clipboard context, quote state
├── data/        # Recent files, templates, vectors
├── designer/    # Designer state, history
├── document/    # Document management
├── learning/    # Learning mode state
├── mcp/         # MCP servers, marketplace
├── media/       # Media, screen recording
├── project/     # Projects, activities
├── settings/    # User settings, presets, custom themes
├── system/      # Native state, proxy, usage, window
├── tools/       # Skills
└── workflow/    # Workflow definitions and execution
```

### Tauri Integration
- `src-tauri/src/lib.rs`: Main Tauri setup
- `src-tauri/tauri.conf.json`: Configuration
  - `devUrl`: Points to Next.js dev server
  - `frontendDist`: Expects `../out` (static export)
- Native modules: `awareness/`, `context/`, `screenshot/`, `selection/`, `mcp/`, `sandbox/`

## Developer Workflows

### Package Management
**Always use pnpm** (lockfile present). Commands:
- `pnpm install` - Install dependencies
- `pnpm dev` - Next.js dev server (web-only)
- `pnpm tauri dev` - Desktop app with hot reload
- `pnpm build` - Next.js production build (static export)
- `pnpm tauri build` - Create desktop installer

### Code Quality
- **Type checking**: `pnpm exec tsc --noEmit` (strict mode enabled)
- **Linting**: `pnpm lint` (ESLint flat config with `eslint-config-next`)
  - Auto-fix: `pnpm lint --fix`

### Testing
- **Unit tests**: `pnpm test` (Jest)
  - Watch mode: `pnpm test:watch`
  - Coverage: `pnpm test:coverage` (70% lines, 60% branches required)
  - Single file: `pnpm test -- path/to/file.test.ts`
- **E2E tests**: `pnpm test:e2e` (Playwright)
  - UI mode: `pnpm test:e2e:ui`
  - Headed: `pnpm test:e2e:headed`

### Adding shadcn/ui Components
Use the shadcn CLI: `pnpm dlx shadcn@latest add <component-name>`
- Components install to `components/ui/`
- Automatically uses configured aliases and style

## Project-Specific Patterns

### Import Paths
Always use `@/` alias for internal imports:
```typescript
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useAgent } from "@/hooks/ai/use-agent"
import { useSettingsStore } from "@/stores/settings/settings-store"
```

### Component Composition
Prefer composition patterns with `asChild` for buttons/links:
```tsx
<Button asChild>
  <Link href="/path">Click me</Link>
</Button>
```

### Dark Mode
- Class-based dark mode (not media query)
- Apply `.dark` class to parent element
- All color utilities automatically support dark variants via custom variant

### Styling Utilities
- Use `cn()` from `@/lib/utils` to merge Tailwind classes safely
- Example: `cn("base-classes", conditionalClass && "conditional-classes", className)`

### State Management
- Use Zustand stores for global state
- Stores use `persist` middleware for localStorage persistence
- Import stores from modular directories: `@/stores/<domain>/<store-name>`

### AI Integration
- 14+ providers via Vercel AI SDK
- Auto-router for intelligent model selection
- Agent system with tool calling, planning, sub-agent orchestration
- MCP (Model Context Protocol) support for extended capabilities

## Key Systems

### Agent System
- Three-tier architecture: Application, Orchestration, Execution
- Hooks: `hooks/ai/use-agent.ts`, `hooks/ai/use-background-agent.ts`
- Tools: Built-in, MCP, Skills, RAG

### Workflow Editor
- React Flow-based visual editor
- Components: `components/workflow-editor/`
- Hooks: `hooks/designer/use-workflow-*.ts`

### Designer System
- V0-style visual web page designer
- Components: `components/designer/`
- Stores: `stores/designer/`

### Native Tools (Desktop Only)
- Selection system, awareness, context, screenshots
- Rust modules: `src-tauri/src/awareness/`, `context/`, `screenshot/`, `selection/`
- Frontend: `lib/native/`, `hooks/native/`

## Known Configuration Notes

- **ESLint**: Flat config format with Next.js core-web-vitals + TypeScript rules
- **TypeScript**: Strict mode, bundler module resolution, JSX set to `react-jsx`
- **Rust toolchain**: Requires v1.77.2+ for Tauri builds
- **Conventional commits**: Enforced via commitlint + Husky
- **Monaco Editor**: Dynamically imported with SSR disabled
