# Cognia Project Structure

This document provides a comprehensive overview of the Cognia project structure, including directory organization, file naming conventions, and where to place new code.

## Table of Contents

- [Directory Tree](#directory-tree)
- [Directory Purposes](#directory-purposes)
- [File Naming Conventions](#file-naming-conventions)
- [Import Path Aliases](#import-path-aliases)
- [Where to Put New Code](#where-to-put-new-code)
- [Key Files and Their Roles](#key-files-and-their-roles)

## Directory Tree

```
d:\Project\Cognia/
├── app/                                    # Next.js App Router
│   ├── (chat)/                             # Chat route group (shared layout)
│   │   ├── layout.tsx                      # Chat layout
│   │   └── page.tsx                        # Main chat interface
│   ├── settings/                           # Settings pages
│   │   └── page.tsx                        # Settings with tabs
│   ├── projects/                           # Project management
│   │   └── page.tsx                        # Projects list and details
│   ├── designer/                           # Designer/Canvas pages
│   ├── skills/                             # Skills system routes
│   ├── api/                                # API routes (dev-time only)
│   ├── page.tsx                            # Landing page
│   ├── layout.tsx                          # Root layout
│   ├── providers.tsx                       # Client providers wrapper
│   └── globals.css                         # Global styles & Tailwind config
│
├── components/                             # React components (feature-based)
│   ├── ai-elements/                        # AI-specific component library (30+)
│   ├── artifacts/                          # Artifacts system components
│   ├── agent/                              # Agent mode components
│   ├── canvas/                             # Canvas editor components
│   ├── chat/                               # Chat interface components
│   ├── presets/                            # Preset system components
│   ├── projects/                           # Project management components
│   ├── settings/                           # Settings page components
│   ├── export/                             # Export functionality components
│   ├── layout/                             # Layout components (header, sidebar)
│   ├── learning/                           # Learning mode components
│   ├── skills/                             # Skills system components
│   ├── providers/                          # Provider components
│   ├── ui/                                 # shadcn/ui base components (50+)
│   └── [feature]/                          # Other feature components
│
├── hooks/                                  # Custom React hooks
│   ├── use-agent.ts                        # Agent mode hook
│   ├── use-messages.ts                     # Message persistence
│   ├── use-session-search.ts               # Session search
│   ├── use-keyboard-shortcuts.ts           # Global shortcuts
│   ├── use-rag.ts                          # RAG retrieval
│   ├── use-vector-db.ts                    # Vector database
│   ├── use-speech.ts                       # Voice input
│   ├── use-learning-mode.ts                # Learning mode
│   ├── use-workflow.ts                     # Workflow execution
│   ├── use-skills.ts                       # Skills system
│   ├── use-structured-output.ts            # Structured output
│   ├── use-translate.ts                    # Translation
│   └── index.ts                            # Hook exports
│
├── lib/                                    # Utility libraries
│   ├── ai/                                 # AI integration
│   │   ├── client.ts                       # Provider client creation
│   │   ├── use-ai-chat.ts                  # Chat hook with usage tracking
│   │   ├── auto-router.ts                  # Intelligent model routing
│   │   ├── image-utils.ts                  # Vision support
│   │   ├── image-generation.ts             # DALL-E integration
│   │   ├── speech-api.ts                   # Speech recognition
│   │   ├── agent-tools.ts                  # Agent tools
│   │   ├── tools/                          # Tool definitions
│   │   └── workflows/                      # Workflow definitions
│   ├── db/                                 # Database (Dexie)
│   │   ├── index.ts                        # Dexie setup
│   │   ├── schema.ts                       # Database schema
│   │   └── repositories/                   # Data access layer
│   ├── document/                           # Document processing
│   │   ├── parsers/                        # File format parsers
│   │   ├── document-processor.ts           # Processing logic
│   │   └── table-extractor.ts              # Table extraction
│   ├── export/                             # Export utilities
│   │   ├── pdf-export.ts
│   │   ├── markdown-export.ts
│   │   ├── json-export.ts
│   │   ├── html-export.ts
│   │   ├── word-export.ts
│   │   ├── excel-export.ts
│   │   └── google-sheets-export.ts
│   ├── file/                               # File utilities
│   ├── i18n/                               # Internationalization
│   ├── learning/                           # Learning mode utilities
│   ├── native/                             # Tauri native function wrappers
│   ├── search/                             # Search utilities
│   ├── skills/                             # Skills system utilities
│   ├── themes/                             # Theme configuration
│   ├── vector/                             # Vector database integration
│   ├── chat/                               # Chat utilities
│   └── utils.ts                            # Common utilities (cn, etc.)
│
├── stores/                                 # Zustand state management
│   ├── artifact-store.ts                   # Artifacts, canvas, versions
│   ├── settings-store.ts                   # User settings, providers
│   ├── session-store.ts                    # Sessions, branches
│   ├── agent-store.ts                      # Agent execution tracking
│   ├── memory-store.ts                     # Cross-session memory
│   ├── project-store.ts                    # Project management
│   ├── preset-store.ts                     # Preset management
│   ├── usage-store.ts                      # Token and cost tracking
│   ├── mcp-store.ts                        # MCP server management
│   ├── workflow-store.ts                   # Workflow management
│   ├── learning-store.ts                   # Learning mode state
│   ├── skill-store.ts                      # Skills state
│   └── index.ts                            # Store exports
│
├── types/                                  # TypeScript type definitions
│   ├── artifact.ts                         # Artifact types
│   ├── session.ts                          # Session and branch types
│   ├── message.ts                          # Message types
│   ├── provider.ts                         # Provider configuration
│   ├── memory.ts                           # Memory types
│   ├── project.ts                          # Project types
│   ├── preset.ts                           # Preset types
│   ├── usage.ts                            # Usage tracking types
│   ├── mcp.ts                              # MCP types
│   ├── agent-mode.ts                       # Agent mode types
│   ├── learning.ts                         # Learning mode types
│   ├── skill.ts                            # Skill types
│   ├── speech.ts                           # Speech types
│   ├── workflow.ts                         # Workflow types
│   └── index.ts                            # Type exports
│
├── e2e/                                    # Playwright end-to-end tests
│   ├── ai/                                 # AI feature tests
│   ├── core/                               # Core feature tests
│   ├── features/                           # Feature-specific tests
│   └── ui/                                 # UI component tests
│
├── src-tauri/                              # Tauri desktop backend
│   ├── src/
│   │   ├── main.rs                         # Rust entry point
│   │   ├── lib.rs                          # Library code
│   │   ├── commands/                       # Tauri commands
│   │   │   ├── mod.rs
│   │   │   └── vector.rs                   # Vector DB commands
│   │   └── mcp/                            # MCP implementation
│   │       ├── mod.rs
│   │       ├── manager.rs                  # Server lifecycle
│   │       ├── client.rs                   # MCP client
│   │       ├── config.rs                   # Configuration
│   │       ├── transport/                  # Transport layer
│   │       └── protocol/                   # Protocol implementation
│   ├── tauri.conf.json                     # Tauri configuration
│   ├── Cargo.toml                          # Rust dependencies
│   └── capabilities/                       # Permissions config
│
├── llmdoc/                                 # Project documentation
│   ├── index.md                            # Documentation index
│   └── feature/                            # Feature documentation
│
├── public/                                 # Static assets
│   └── icons/                              # Application icons
│
├── __mocks__/                              # Jest mocks
│   ├── fileMock.js                         # File imports mock
│   ├── styleMock.js                        # CSS imports mock
│   ├── taur-plugin-fs.js                   # Tauri plugin mocks
│   └── ...                                 # Other mocks
│
├── docs/                                   # Additional documentation
│   └── development/                        # Development guides
│
├── .github/                                # GitHub configuration
│   └── workflows/                          # CI/CD pipelines
│
├── components.json                         # shadcn/ui configuration
├── next.config.ts                          # Next.js configuration
├── tailwind.config.ts                      # Tailwind configuration
├── tsconfig.json                           # TypeScript configuration
├── jest.config.ts                          # Jest configuration
├── playwright.config.ts                    # Playwright configuration
├── package.json                            # Dependencies and scripts
├── pnpm-lock.yaml                          # pnpm lock file
├── CLAUDE.md                               # Claude AI instructions
└── README.md                               # Project README
```

## Directory Purposes

### `/app` - Next.js App Router

Contains all application pages and routing logic using Next.js 16 App Router.

**Key Files**:
- `page.tsx` - Landing page
- `layout.tsx` - Root layout with providers
- `providers.tsx` - Client-side provider wrapper
- `globals.css` - Global styles and Tailwind v4 configuration

**Route Groups**:
- `(chat)/` - Chat interface with shared layout
- `settings/` - Settings pages (7 tabs)
- `projects/` - Project management
- `designer/` - Designer/Canvas workspace
- `skills/` - Skills system pages

**Convention**:
- Use route groups `(name)` for shared layouts without URL segments
- One `page.tsx` per route
- Keep pages thin, delegate to components

### `/components` - React Components

Feature-based component organization. Each subdirectory represents a major feature area.

**Key Directories**:

#### `/components/ui`
Base UI components from shadcn/ui (50+ components). These are generic, reusable components.

**Examples**: `button.tsx`, `dialog.tsx`, `dropdown-menu.tsx`, `input.tsx`

#### `/components/chat`
Chat interface components.

**Files**:
- `chat-container.tsx` - Main orchestrator
- `chat-input.tsx` - Message input with voice and file upload
- `chat-header.tsx` - Mode/model/preset selector
- `welcome-state.tsx` - Welcome screen

#### `/components/ai-elements`
AI-specific component library with 30+ specialized components for AI-powered applications.

**Examples**: `message.tsx`, `code-block.tsx`, `reasoning.tsx`, `artifact.tsx`, `plan.tsx`

#### `/components/artifacts`
Artifacts system components.

**Files**:
- `artifact-panel.tsx` - Main panel
- `artifact-preview.tsx` - Preview cards
- `artifact-renderers.tsx` - Type-specific renderers

#### `/components/canvas`
Monaco-based canvas editor.

**Files**:
- `canvas-panel.tsx` - Editor with Monaco
- `version-history-panel.tsx` - Version management

#### `/components/settings`
Settings page components (7 settings tabs).

**Files**:
- `provider-settings.tsx` - API key configuration
- `appearance-settings.tsx` - Theme customization
- `mcp-settings.tsx` - MCP server management

**Convention**:
- Group components by feature, not by type
- Each feature directory has an `index.ts` for exports
- Use kebab-case for file names: `chat-input.tsx`, `preset-manager.tsx`

### `/hooks` - Custom React Hooks

Reusable React hooks for encapsulating stateful logic.

**Examples**:
- `use-messages.ts` - Message persistence with IndexedDB
- `use-session-search.ts` - Search functionality
- `use-keyboard-shortcuts.ts` - Global keyboard shortcuts
- `use-rag.ts` - RAG (Retrieval-Augmented Generation)

**Convention**:
- Prefix with `use-`: `use-agent.ts`, `use-speech.ts`
- One hook per file
- Export from `index.ts`

### `/lib` - Utilities and Libraries

Business logic, utility functions, and integrations.

**Key Directories**:

#### `/lib/ai`
AI integration layer using Vercel AI SDK v5.

**Files**:
- `client.ts` - Provider client creation
- `use-ai-chat.ts` - Custom chat hook with usage tracking
- `auto-router.ts` - Intelligent model selection

#### `/lib/db`
Dexie-based IndexedDB layer.

**Files**:
- `index.ts` - Dexie database setup
- `schema.ts` - Database schema definition
- `repositories/` - Data access layer

#### `/lib/export`
Multi-format export functionality.

**Formats**: PDF, Markdown, JSON, HTML, Word, Excel, Google Sheets

#### `/lib/document`
Document processing and parsing.

**Files**:
- `parsers/` - Format-specific parsers (CSV, PDF, HTML, Office)
- `document-processor.ts` - Processing pipeline

**Convention**:
- Pure functions when possible
- One module per concern
- Export from `index.ts` in each directory

### `/stores` - Zustand State Management

Global state with localStorage persistence using Zustand v5.

**Store Pattern**:
```typescript
// stores/example-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ExampleState {
  data: string;
  setData: (data: string) => void;
}

export const useExampleStore = create<ExampleState>()(
  persist(
    (set) => ({
      data: '',
      setData: (data) => set({ data }),
    }),
    { name: 'cognia-example' } // localStorage key
  )
);
```

**Storage Keys**:
- `cognia-settings` - Settings store
- `cognia-sessions` - Sessions store
- `cognia-artifacts` - Artifacts store
- `cognia-projects` - Projects store
- `cognia-presets` - Presets store
- `cognia-usage` - Usage tracking
- `cognia-mcp` - MCP servers

**Convention**:
- One store per domain
- Use `persist` middleware for localStorage
- Export selectors for memoized access

### `/types` - TypeScript Definitions

Centralized type definitions for type safety across the application.

**Files**:
- `artifact.ts` - Artifact types (8 types, 17+ languages)
- `session.ts` - Session and branch types
- `message.ts` - Message types with branch support
- `provider.ts` - Provider configuration types
- `mcp.ts` - MCP server types
- `agent-mode.ts` - Agent mode types
- `learning.ts` - Learning mode types
- `workflow.ts` - Workflow types

**Convention**:
- One file per domain
- Export all types from `index.ts`
- Use strict types (no `any`)

### `/e2e` - End-to-End Tests

Playwright E2E tests organized by feature.

**Structure**:
- `ai/` - AI feature tests
- `core/` - Core functionality tests
- `features/` - Feature-specific tests
- `ui/` - UI component tests

**Naming**: `*.spec.ts` (e.g., `settings-ollama.spec.ts`)

### `/src-tauri` - Rust Backend

Tauri desktop application backend code.

**Key Directories**:
- `src/commands/` - Tauri commands exposed to frontend
- `src/mcp/` - MCP (Model Context Protocol) implementation
- `capabilities/` - Permission configuration

**Files**:
- `src/main.rs` - Application entry point
- `src/lib.rs` - Library code
- `Cargo.toml` - Rust dependencies
- `tauri.conf.json` - Tauri configuration

## File Naming Conventions

### General Rules

1. **Use kebab-case for files**: `chat-input.tsx`, `preset-manager.tsx`
2. **Use PascalCase for types**: `UserProviderSettings`, `ArtifactType`
3. **Use camelCase for variables/functions**: `createSession`, `getMessageById`
4. **Use UPPER_SNAKE_CASE for constants**: `MAX_TOKENS`, `DEFAULT_MODEL`

### Component Files

**Format**: `[name].tsx` or `[name].test.tsx`

**Examples**:
- `chat-container.tsx`
- `artifact-panel.tsx`
- `settings-provider.tsx`
- `use-messages.test.tsx`

### Hook Files

**Format**: `use-[name].ts`

**Examples**:
- `use-agent.ts`
- `use-session-search.ts`
- `use-keyboard-shortcuts.ts`

### Store Files

**Format**: `[domain]-store.ts`

**Examples**:
- `settings-store.ts`
- `session-store.ts`
- `artifact-store.ts`

### Type Files

**Format**: `[domain].ts`

**Examples**:
- `provider.ts`
- `message.ts`
- `workflow.ts`

### Test Files

**Format**: `[filename].test.ts` (unit tests) or `[feature].spec.ts` (E2E)

**Examples**:
- `utils.test.ts`
- `settings-store.test.ts`
- `projects-knowledge-base.spec.ts`

## Import Path Aliases

Configure in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"],
      "@/components/*": ["./components/*"],
      "@/lib/*": ["./lib/*"],
      "@/hooks/*": ["./hooks/*"],
      "@/stores/*": ["./stores/*"],
      "@/types/*": ["./types/*"],
      "@/ui/*": ["./components/ui/*"]
    }
  }
}
```

### Usage Examples

```typescript
// Import components
import { Button } from '@/components/ui/button';
import { ChatInput } from '@/components/chat/chat-input';

// Import hooks
import { useMessages } from '@/hooks/use-messages';
import { useAgent } from '@/hooks/use-agent';

// Import stores
import { useSettingsStore } from '@/stores/settings-store';
import { useSessionStore } from '@/stores/session-store';

// Import types
import type { Artifact } from '@/types/artifact';
import type { Message } from '@/types/message';

// Import utilities
import { cn } from '@/lib/utils';
import { createOpenAI } from '@ai-sdk/openai';
```

### Benefits

1. **Absolute imports**: No relative path hell (`../../../components/`)
2. **Refactoring**: Move files without breaking imports
3. **IDE Support**: Better autocomplete and navigation
4. **Readability**: Clear module boundaries

## Where to Put New Code

### Adding a New UI Component

**Scenario**: Add a new settings component for theme customization.

**Steps**:
1. Create file: `components/settings/theme-settings.tsx`
2. Update exports: `components/settings/index.ts`
3. Use in page: `app/settings/page.tsx`

**Example**:
```typescript
// components/settings/theme-settings.tsx
export function ThemeSettings() {
  return <div>Theme settings</div>;
}

// components/settings/index.ts
export { ThemeSettings } from './theme-settings';
```

### Adding a New Store

**Scenario**: Track user preferences for a new feature.

**Steps**:
1. Create file: `stores/feature-store.ts`
2. Define state interface
3. Create store with persist
4. Export from `stores/index.ts`

**Example**:
```typescript
// stores/feature-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FeatureState {
  enabled: boolean;
  toggle: () => void;
}

export const useFeatureStore = create<FeatureState>()(
  persist(
    (set) => ({
      enabled: false,
      toggle: () => set((state) => ({ enabled: !state.enabled })),
    }),
    { name: 'cognia-feature' }
  )
);
```

### Adding a New Hook

**Scenario**: Encapsulate logic for a new API integration.

**Steps**:
1. Create file: `hooks/use-feature.ts`
2. Implement hook with error handling
3. Export from `hooks/index.ts`

**Example**:
```typescript
// hooks/use-feature.ts
import { useState, useEffect } from 'react';

export function useFeature() {
  const [data, setData] = useState(null);

  useEffect(() => {
    // Fetch data
  }, []);

  return { data };
}
```

### Adding Utility Functions

**Scenario**: Add helper functions for data transformation.

**Steps**:
1. Create file: `lib/feature/helpers.ts`
2. Export pure functions
3. Export from `lib/feature/index.ts`

**Example**:
```typescript
// lib/feature/helpers.ts
export function transformData(input: string): Result {
  // Transformation logic
  return result;
}

export function validateData(data: unknown): boolean {
  // Validation logic
  return true;
}
```

### Adding Types

**Scenario**: Define types for a new data structure.

**Steps**:
1. Create file: `types/feature.ts`
2. Export interfaces and types
3. Export from `types/index.ts`

**Example**:
```typescript
// types/feature.ts
export interface FeatureConfig {
  id: string;
  enabled: boolean;
  options: Record<string, unknown>;
}

export type FeatureStatus = 'idle' | 'loading' | 'success' | 'error';
```

### Adding Tests

**Scenario**: Test a new utility function.

**Steps**:
1. Create file: `lib/feature/helpers.test.ts`
2. Write test cases
3. Run: `pnpm test lib/feature/helpers.test.ts`

**Example**:
```typescript
// lib/feature/helpers.test.ts
import { transformData } from './helpers';

describe('transformData', () => {
  it('transforms input correctly', () => {
    const result = transformData('test');
    expect(result).toEqual({ value: 'test' });
  });
});
```

## Key Files and Their Roles

### Configuration Files

| File | Purpose |
|------|---------|
| `next.config.ts` | Next.js configuration (static export, images, aliases) |
| `tsconfig.json` | TypeScript configuration (paths, strict mode) |
| `tailwind.config.ts` | Tailwind CSS configuration (themes, plugins) |
| `jest.config.ts` | Jest testing configuration (coverage, mocks) |
| `playwright.config.ts` | Playwright E2E testing configuration |
| `components.json` | shadcn/ui component configuration |
| `src-tauri/tauri.conf.json` | Tauri desktop app configuration |

### Package Management

| File | Purpose |
|------|---------|
| `package.json` | Dependencies and scripts |
| `pnpm-lock.yaml` | pnpm lock file (commit this) |

### Documentation

| File | Purpose |
|------|---------|
| `README.md` | Project overview and quick start |
| `CLAUDE.md` | Claude AI development instructions |
| `CHANGELOG.md` | Version history and changes |
| `llmdoc/index.md` | Project documentation index |
| `docs/development/` | Development guides (this file) |

### Git and CI/CD

| File | Purpose |
|------|---------|
| `.gitignore` | Git ignore rules |
| `.eslintrc.json` | ESLint configuration |
| `commitlint.config.js` | Conventional commits enforcement |
| `.github/workflows/ci.yml` | CI/CD pipeline |

### Entry Points

| File | Purpose |
|------|---------|
| `app/page.tsx` | Landing page |
| `app/layout.tsx` | Root layout |
| `app/providers.tsx` | Client providers |
| `src-tauri/src/main.rs` | Rust entry point |

## Best Practices

### File Organization

1. **Feature-based**: Group by feature, not by file type
2. **Colocation**: Keep related files together
3. **Index files**: Use `index.ts` for clean imports
4. **Barrel exports**: Re-export from feature directories

### Import Organization

```typescript
// 1. External libraries
import React from 'react';
import { create } from 'zustand';

// 2. Internal types
import type { Message } from '@/types/message';

// 3. Internal stores
import { useSettingsStore } from '@/stores/settings-store';

// 4. Internal hooks
import { useMessages } from '@/hooks/use-messages';

// 5. Internal components
import { Button } from '@/components/ui/button';
import { ChatInput } from '@/components/chat/chat-input';

// 6. Utilities
import { cn } from '@/lib/utils';
```

### Naming Conventions

```typescript
// Components: PascalCase
export function ChatContainer() {}
export const ArtifactPanel = () => {};

// Hooks: camelCase with 'use' prefix
export function useMessages() {}
export const useAgent = () => {};

// Stores: camelCase with 'use' prefix
export const useSettingsStore = create<SettingsState>()(...);

// Types: PascalCase
export interface UserSettings {}
export type MessageRole = 'user' | 'assistant';

// Functions: camelCase
export function createSession() {}
export const getMessageById = (id: string) => {};

// Constants: UPPER_SNAKE_CASE
export const MAX_TOKENS = 4096;
export const DEFAULT_MODEL = 'gpt-4o';
```

---

**Last Updated**: December 25, 2025
