# Copilot Instructions for Cognia

## Architecture Overview

**Next.js 16 + Tauri 2.9 hybrid desktop application** with React 19.2, TypeScript, Tailwind CSS v4, and Vercel AI SDK v5.

### Dual Runtime Model
- **Web**: `pnpm dev` → Next.js at localhost:3000
- **Desktop**: `pnpm tauri dev` → Tauri wraps Next.js in native window

**Critical constraint**: Production uses `output: "export"` for static generation. No server API routes in desktop builds—Tauri loads from `out/`.

## Essential Commands

```bash
# Development
pnpm dev                    # Web dev server
pnpm tauri dev              # Desktop with hot reload

# Quality
pnpm lint --fix             # ESLint with auto-fix
pnpm exec tsc --noEmit      # Type check (strict mode)

# Testing
pnpm test                   # Jest unit tests
pnpm test -- path/to/file.test.ts  # Single file
pnpm test:coverage          # Coverage (70% lines, 60% branches required)
pnpm test:e2e               # Playwright E2E

# Build
pnpm build                  # Static export to out/
pnpm tauri build            # Desktop installer

# Components
pnpm dlx shadcn@latest add <component>  # Add shadcn/ui components
```

## Code Patterns

### Imports — Always use `@/` alias
```typescript
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useAgent } from "@/hooks/ai/use-agent"
import { useSettingsStore } from "@/stores"  // barrel export
```

### Styling — Tailwind v4 with `cn()` utility
```tsx
// cn() merges classes safely (clsx + tailwind-merge)
<div className={cn("base-class", isActive && "active-class", className)} />
```
- Dark mode: class-based (`.dark` parent), not media query
- Colors: CSS variables in `app/globals.css` using oklch

### Zustand Stores — All use localStorage persistence
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useExampleStore = create<State>()(
  persist(
    (set) => ({ /* state + actions */ }),
    { name: 'cognia-example' }  // localStorage key prefix
  )
);
```

### Component Composition — Use `asChild` for polymorphism
```tsx
<Button asChild>
  <Link href="/path">Click me</Link>
</Button>
```

## Directory Structure

| Path | Purpose |
|------|---------|
| `app/(chat)/` | Main chat interface route |
| `components/ui/` | shadcn/ui base components |
| `components/chat/`, `agent/`, `ai-elements/` | Feature components |
| `hooks/ai/` | `use-agent`, `use-background-agent`, `use-skills` |
| `hooks/native/` | Desktop-only hooks (`use-native`, `use-window`) |
| `stores/` | Zustand stores by domain (settings, chat, agent, mcp, etc.) |
| `lib/ai/agent/` | Agent executor, loop, orchestrator, tools |
| `lib/ai/` | AI client, auto-router, chat utilities |
| `src-tauri/src/` | Rust backend: mcp/, sandbox/, awareness/, selection/ |
| `types/` | TypeScript definitions for all domains |

## Key Systems

### Agent System (3-tier)
1. **Application**: `hooks/ai/use-agent.ts` — React integration
2. **Orchestration**: `lib/ai/agent/agent-loop.ts` — Multi-step execution
3. **Execution**: `lib/ai/agent/agent-executor.ts` — Tool calling via AI SDK

### AI Integration
- 14+ providers via Vercel AI SDK (`lib/ai/client.ts`)
- Auto-router: `lib/ai/auto-router.ts` (Fast/Balanced/Powerful tiers)
- MCP tools: `lib/ai/agent/mcp-tools.ts`

### Native Tools (Desktop only)
- Selection, awareness, context, screenshots
- Rust: `src-tauri/src/{awareness,context,screenshot,selection}/`
- Frontend: `lib/native/`, `hooks/native/`, `stores/system/native-store.ts`

## Testing Notes

- Co-locate tests: `file.test.ts` next to `file.ts`
- Mock Tauri plugins in `__mocks__/@tauri-apps/`
- Coverage excludes: `lib/search/`, `lib/vector/`, `lib/native/` (external services)

## Constraints

- **Package manager**: pnpm only
- **Commits**: Conventional commits via commitlint + Husky
- **Monaco Editor**: Dynamic import with SSR disabled
- **Rust**: v1.77.2+ required for Tauri
- **API keys**: Stored in localStorage (unencrypted)
- **MCP servers**: Run with full system access—only install trusted servers
