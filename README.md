# Cognia

Cognia is a modern AI-native chat and creation application supporting multiple AI model providers. Built with Next.js 16 and React 19.2 on the frontend, Tauri 2.9 enables cross-platform desktop apps from a single codebase for both web and native deployment.

The tech stack includes: Tailwind CSS v4, shadcn/ui, Zustand state management, Dexie persistence, and Vercel AI SDK v5 integration with OpenAI, Anthropic, Google, Mistral, Groq, DeepSeek, Ollama, and more.

[中文文档](./README_zh.md)

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Documentation](#documentation)
- [Development Workflow](#development-workflow)
- [Project Structure](#project-structure)
- [Core Features](#core-features)
  - [AI Model Integration](#ai-model-integration)
  - [Artifacts System](#artifacts-system)
  - [Canvas Editor](#canvas-editor)
  - [MCP Support](#mcp-support)
  - [Data Persistence](#data-persistence)
  - [Project Management](#project-management)
- [Configuration](#configuration)
- [Production Build](#production-build)
- [Deployment Guide](#deployment-guide)
- [Testing Strategy](#testing-strategy)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)
- [Resources](#resources)

## Overview

Cognia is a modern AI-native chat and creation application supporting multiple AI model providers. Built with Next.js 16 and React 19.2 on the frontend, Tauri 2.9 enables cross-platform desktop apps from a single codebase for both web and native deployment.

Cognia provides an intelligent chat interface with advanced features like artifacts generation, canvas editing, conversation branching, MCP integration, and comprehensive data management.

## Key Features

### AI Capabilities

- **Multi-Model Support**: Integration with 7 major AI providers (OpenAI, Anthropic, Google, Mistral, Groq, DeepSeek, Ollama)
- **Intelligent Routing**: Automatic model selection based on task complexity (Fast/Balanced/Powerful tiers)
- **Streaming Responses**: Real-time display of AI-generated content
- **Multimodal Support**: Vision models support image analysis
- **Image Generation**: DALL-E text-to-image integration
- **Tool Calling**: Function Calling and MCP tool support

### Chat Experience

- **Multiple Chat Modes**: Chat mode, Agent mode, Research mode
- **Conversation Branching**: Create branches from any message to explore different paths
- **Message Management**: Edit messages, retry responses, delete conversations
- **Voice Input**: Web Speech API integration for voice-to-text
- **File Upload**: Drag-and-drop support and clipboard paste for images
- **Session Search**: Full-text search across conversation history
- **Memory System**: Cross-session AI memory persistence
- **Custom Instructions**: Global and per-session custom instructions

### Content Creation

- **Artifacts System**: AI can generate independent content pieces (code, documents, charts, math formulas)
- **Canvas Editor**: Monaco editor with AI suggestions and code transformations
- **Version History**: Auto-save and version restore for canvas documents
- **Multi-format Preview**: Support for HTML, React, SVG, Mermaid, charts, and more

### Data Management

- **Project Organization**: Organize conversations into projects with knowledge bases
- **Export Functionality**: Export to PDF, Markdown, JSON, HTML formats
- **Preset Management**: Save and load chat configuration presets
- **Usage Tracking**: Token counting and cost estimation

### Desktop Capabilities

- **MCP Integration**: Full Model Context Protocol support for extended AI capabilities
- **Native Features**: File system access, system dialogs, clipboard, and more
- **Offline Operation**: Static export supports offline usage

## Tech Stack

| Category | Technology | Purpose |
|----------|-----------|---------|
| **Frontend Framework** | Next.js 16 (App Router) | React framework with SSR/SSG |
| | React 19.2 | UI library |
| | TypeScript 5 | Type safety |
| **UI Components** | Tailwind CSS v4 | Utility-first CSS |
| | shadcn/ui + Radix UI | Component library |
| | Lucide Icons | Icon set |
| | Monaco Editor | Code editor |
| | Shiki | Syntax highlighting |
| **State Management** | Zustand v5 | Client state |
| | Dexie | IndexedDB wrapper |
| | localStorage | Persistence |
| **AI Integration** | Vercel AI SDK v5 | LLM integration |
| | 7 Providers | Multi-model support |
| **Desktop** | Tauri 2.9 | Cross-platform apps |
| | Rust | Native backend |
| **Visualization** | Recharts | Data charts |
| | Xyflow | Flow diagrams |
| | KaTeX | Math formulas |
| | Mermaid | Diagrams |
| **Testing** | Jest | Unit testing |
| | Playwright | E2E testing |

## Documentation

Comprehensive documentation is available in the `docs/` directory:

### API Documentation

- **[Component API Reference](docs/api/components.md)** - Complete component catalog with props, usage examples, and features
  - Chat components (ChatContainer, ChatInput, ChatHeader, WelcomeState)
  - AI elements (Message, CodeBlock, Reasoning, Artifact)
  - Artifacts components (ArtifactPanel, CanvasPanel, VersionHistoryPanel)
  - Settings components (ProviderSettings, McpSettings)
  - Project components (ProjectList, KnowledgeBase)
  - UI components (shadcn/radix base components)

- **[Utilities Reference](docs/api/utilities.md)** - Utility functions and helper libraries
  - AI integration (client creation, chat hook, auto-router)
  - Export functions (Markdown, PDF, JSON, HTML, Word, Excel)
  - Common utilities (cn(), file handling, search, themes)

### Feature Documentation

- **[Configuration Guide](docs/features/configuration.md)** - Complete configuration reference
  - Environment variables
  - Provider settings
  - Appearance customization
  - Keyboard shortcuts
  - Speech settings
  - Data management
  - Tauri configuration

- **[AI Integration](docs/features/ai-integration.md)** - AI SDK integration details
- **[Artifacts System](docs/features/artifacts-system.md)** - Artifact generation and management
- **[Chat Features](docs/features/chat-features.md)** - Chat modes, branching, search
- **[Projects Management](docs/features/projects-management.md)** - Project organization
- **[MCP Guide](docs/features/mcp-guide.md)** - Model Context Protocol support
- **[Advanced Features](docs/features/advanced-features.md)** - Memory, presets, usage tracking

### Architecture Documentation

- **[Overview](docs/architecture/overview.md)** - System architecture overview
- **[Tech Stack](docs/architecture/tech-stack.md)** - Detailed technology breakdown
- **[Data Flow](docs/architecture/data-flow.md)** - Data flow diagrams
- **[MCP Architecture](docs/architecture/mcp-architecture.md)** - MCP system architecture

### Development Documentation

- **[Getting Started](docs/development/getting-started.md)** - Development setup guide
- **[Project Structure](docs/development/project-structure.md)** - Directory structure explanation
- **[Coding Standards](docs/development/coding-standards.md)** - Code style and conventions
- **[Testing](docs/development/testing.md)** - Testing strategies and guidelines
- **[Building](docs/development/building.md)** - Build and deployment procedures
- **[Contributing](docs/development/contributing.md)** - Contribution guidelines

### Legacy Documentation

The `llmdoc/` directory contains additional feature documentation:
- **[Documentation Index](llmdoc/index.md)** - Master documentation index
- Feature docs for all major systems

## Development Workflow

### Typical Development Flow

1. Start development server

   ```bash
   pnpm dev        # Web development
   pnpm tauri dev  # Desktop development
   ```

2. Develop in `app/`, `components/`, `lib/`, `stores/`, `hooks/`

3. Add UI components (if needed)

   ```bash
   pnpm dlx shadcn@latest add <component>
   ```

4. Code checks

   ```bash
   pnpm lint
   pnpm lint:fix
   ```

5. Run tests

   ```bash
   pnpm test
   pnpm test:e2e
   ```

6. Build verification

   ```bash
   pnpm build
   pnpm tauri build
   ```

### Code Standards

- **TypeScript**: Use strict mode
- **Components**: Functional components + Hooks
- **Styling**: Tailwind CSS + cn() utility
- **State**: Zustand stores + persist
- **Types**: Use type definitions from `/types/`
- **Imports**: Use path aliases (@/components, @/lib, etc.)

## Prerequisites

### Web Development

- **Node.js** 20.x or later
- **pnpm** 8.x or later (recommended)

```bash
# Install pnpm
npm install -g pnpm
```

### Desktop Development (Additional Requirements)

- **Rust** 1.70 or later

```bash
# Verify installation
rustc --version
cargo --version
```

- **System Dependencies**
  - Windows: Microsoft Visual Studio C++ Build Tools
  - macOS: Xcode Command Line Tools (`xcode-select --install`)
  - Linux: See [Tauri Prerequisites](https://tauri.app/v1/guides/getting-started/prerequisites)

## Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/your-username/cognia.git
cd cognia
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Configure Environment Variables

Create a `.env.local` file and add necessary API keys:

```env
# OpenAI (optional)
OPENAI_API_KEY=sk-your-openai-key

# Anthropic (optional)
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key

# Google Gemini (optional)
GOOGLE_API_KEY=your-google-api-key

# DeepSeek (optional)
DEEPSEEK_API_KEY=sk-your-deepseek-key

# Groq (optional)
GROQ_API_KEY=gsk-your-groq-key
```

### 4. Start Development Server

#### Web Application

```bash
pnpm dev
```

Visit: <http://localhost:3000>

#### Desktop Application Development

```bash
pnpm tauri dev
```

### 5. Verify Installation

- Check Next.js: Visit development server
- Check Tauri: Run `pnpm tauri info`
- Run tests: `pnpm test`

## Development Guide

### Available Scripts

```bash
# Development
pnpm dev              # Start Next.js dev server (localhost:3000)
pnpm tauri dev        # Start Tauri desktop dev mode

# Build
pnpm build            # Build production version (static export to out/)
pnpm start            # Start production server (after pnpm build)
pnpm tauri build      # Build desktop application installer

# Code Quality
pnpm lint             # Run ESLint checks
pnpm lint:fix         # Auto-fix ESLint issues

# Testing
pnpm test             # Run Jest unit tests
pnpm test:watch       # Jest watch mode
pnpm test:coverage    # Jest test coverage
pnpm test:e2e         # Run Playwright end-to-end tests
pnpm test:e2e:ui      # Playwright UI mode
pnpm test:e2e:headed  # Playwright headed browser mode
```

### Adding UI Components

Use shadcn CLI to add Radix UI components:

```bash
pnpm dlx shadcn@latest add <component-name>
```

Examples:

```bash
pnpm dlx shadcn@latest add button
pnpm dlx shadcn@latest add dialog
pnpm dlx shadcn@latest add dropdown-menu
```

### Creating New Store

Zustand stores are located in `/stores/` directory:

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
    {
      name: 'cognia-example', // localStorage key
    }
  )
);
```

### Adding New Feature Modules

1. Create feature components in `/components/`
2. Add type definitions in `/types/`
3. Create state management in `/stores/`
4. Create custom hooks in `/hooks/` (if needed)
5. Add utility functions in `/lib/` (if needed)

## Project Structure

```text
cognia/
├── app/                          # Next.js App Router
│   ├── (chat)/                   # Chat interface route group
│   │   └── page.tsx              # Main chat interface
│   ├── settings/                 # Settings page
│   │   └── page.tsx              # Settings main page (7 tabs)
│   ├── projects/                 # Project management page
│   │   └── page.tsx              # Project list and details
│   ├── designer/                 # Designer page
│   ├── api/                      # API routes (dev time use)
│   ├── skills/                   # Skills routes
│   ├── page.tsx                  # Application home page
│   ├── layout.tsx                # Root layout and global config
│   ├── providers.tsx             # Client provider wrapper
│   └── globals.css               # Global styles and Tailwind config
│
├── components/                   # React components
│   ├── ai-elements/              # AI-specific component library (30+ components)
│   │   ├── message.tsx           # Message rendering
│   │   ├── code-block.tsx        # Code block display
│   │   ├── reasoning.tsx         # Reasoning visualization
│   │   ├── artifact.tsx          # Artifact card
│   │   ├── plan.tsx              # Plan display
│   │   └── ...                   # More AI components
│   ├── artifacts/                # Artifacts system
│   │   ├── artifact-panel.tsx    # Artifact panel
│   │   ├── artifact-preview.tsx  # Artifact preview
│   │   └── artifact-renderers.tsx # Artifact type renderers
│   ├── canvas/                   # Canvas editor
│   │   ├── canvas-panel.tsx      # Monaco editor panel
│   │   ├── version-history-panel.tsx # Version history panel
│   │   └── index.ts
│   ├── agent/                    # Agent mode components
│   │   ├── agent-mode-selector.tsx
│   │   ├── agent-plan-editor.tsx
│   │   ├── agent-steps.tsx       # Execution steps visualization
│   │   └── workflow-selector.tsx
│   ├── chat/                     # Chat interface components
│   │   ├── chat-container.tsx    # Main container and orchestrator
│   │   ├── chat-input.tsx        # Input box (voice+file)
│   │   ├── chat-header.tsx       # Mode/model/preset selector
│   │   ├── welcome-state.tsx     # Mode-specific welcome page
│   │   ├── branch-selector.tsx   # Conversation branch selector
│   │   ├── export-dialog.tsx     # Export dialog
│   │   ├── image-generation-dialog.tsx # Image generation dialog
│   │   ├── context-settings-dialog.tsx  # Context settings
│   │   ├── preset-manager-dialog.tsx    # Preset management
│   │   ├── model-picker-dialog.tsx      # Model picker
│   │   ├── mention-popover.tsx   # Mention feature
│   │   ├── markdown-renderer.tsx # Markdown renderer
│   │   └── renderers/            # Specialized renderers
│   │       ├── code-block.tsx
│   │       ├── math-block.tsx
│   │       ├── mermaid-block.tsx
│   │       ├── vegalite-block.tsx
│   │       └── enhanced-table.tsx
│   ├── projects/                 # Project management components
│   │   ├── project-list.tsx      # Project list
│   │   ├── project-card.tsx      # Project card
│   │   ├── create-project-dialog.tsx
│   │   ├── knowledge-base.tsx    # Knowledge base management
│   │   ├── project-templates.tsx # Project templates
│   │   └── import-export-dialog.tsx
│   ├── presets/                  # Preset system
│   │   ├── preset-selector.tsx   # Quick preset selector
│   │   ├── preset-card.tsx       # Preset card
│   │   ├── create-preset-dialog.tsx
│   │   └── presets-manager.tsx
│   ├── settings/                 # Settings page components
│   │   ├── provider-settings.tsx # Provider configuration
│   │   ├── custom-instructions-settings.tsx # Custom instructions
│   │   ├── memory-settings.tsx   # Memory management
│   │   ├── usage-settings.tsx    # Usage statistics
│   │   ├── keyboard-settings.tsx # Keyboard shortcuts
│   │   ├── speech-settings.tsx   # Speech settings
│   │   ├── data-settings.tsx     # Data management
│   │   ├── mcp-settings.tsx      # MCP server management
│   │   ├── mcp-server-dialog.tsx # MCP server dialog
│   │   ├── mcp-install-wizard.tsx # MCP quick install wizard
│   │   └── setup-wizard.tsx      # First-time setup wizard
│   ├── export/                   # Export functionality
│   │   ├── document-export-dialog.tsx
│   │   └── index.ts
│   ├── layout/                   # Layout components
│   │   ├── command-palette.tsx   # Command palette
│   │   ├── keyboard-shortcuts-dialog.tsx
│   │   └── mobile-nav.tsx
│   ├── sidebar/                  # Sidebar components
│   │   └── app-sidebar.tsx
│   ├── learning/                 # Learning mode components
│   ├── skills/                   # Skills components
│   ├── providers/                # Provider components
│   │   ├── skill-provider.tsx
│   │   └── index.ts
│   └── ui/                       # shadcn/ui base components (50+)
│       ├── button.tsx
│       ├── dialog.tsx
│       ├── dropdown-menu.tsx
│       └── ...
│
├── hooks/                        # Custom React Hooks
│   ├── use-agent.ts              # Agent mode hook
│   ├── use-messages.ts           # Message persistence
│   ├── use-session-search.ts     # Session search
│   ├── use-keyboard-shortcuts.ts # Global shortcuts
│   ├── use-rag.ts                # RAG retrieval
│   ├── use-vector-db.ts          # Vector database
│   ├── use-speech.ts             # Voice input
│   ├── use-learning-mode.ts      # Learning mode
│   ├── use-workflow.ts           # Workflow
│   ├── use-skills.ts             # Skills system
│   ├── use-structured-output.ts  # Structured output
│   ├── use-translate.ts          # Translation
│   ├── use-global-shortcuts.test.ts
│   └── index.ts
│
├── lib/                          # Utility libraries
│   ├── ai/                       # AI integration
│   │   ├── client.ts             # Provider client creation
│   │   ├── use-ai-chat.ts        # Chat hook (with usage tracking)
│   │   ├── auto-router.ts        # Intelligent model routing
│   │   ├── image-utils.ts        # Vision support utilities
│   │   ├── image-generation.ts   # DALL-E integration
│   │   ├── speech-api.ts         # Speech API
│   │   ├── agent-tools.ts        # Agent tools
│   │   ├── tools/                # Tool definitions
│   │   ├── workflows/            # Workflow definitions
│   │   └── index.ts
│   ├── db/                       # Database
│   │   ├── index.ts              # Dexie setup
│   │   └── message-repository.ts # Message persistence
│   ├── document/                 # Document processing
│   │   └── table-extractor.ts    # Table extraction
│   ├── export/                   # Export functionality
│   │   ├── pdf-export.ts         # PDF export
│   │   ├── markdown-export.ts    # Markdown export
│   │   ├── json-export.ts        # JSON export
│   │   ├── html-export.ts        # HTML export
│   │   ├── word-export.ts        # Word export
│   │   ├── excel-export.ts       # Excel export
│   │   └── google-sheets-export.ts # Google Sheets export
│   ├── file/                     # File utilities
│   ├── i18n/                     # Internationalization
│   │   └── messages/
│   │       ├── en.json
│   │       └── zh-CN.json
│   ├── learning/                 # Learning mode
│   ├── native/                   # Tauri native calls
│   ├── search/                   # Search utilities
│   ├── skills/                   # Skills system
│   ├── themes/                   # Theme configuration
│   ├── vector/                   # Vector database integration
│   │   ├── store.ts
│   │   └── index.ts
│   └── utils.ts                  # Common utilities (cn, etc.)
│
├── stores/                       # Zustand state management
│   ├── artifact-store.ts         # Artifacts, canvas, version history
│   ├── settings-store.ts         # User settings and provider config
│   ├── session-store.ts          # Sessions and branches
│   ├── agent-store.ts            # Agent execution tracking
│   ├── memory-store.ts           # Cross-session memory
│   ├── project-store.ts          # Project management
│   ├── preset-store.ts           # Preset management
│   ├── usage-store.ts            # Token and cost tracking
│   ├── mcp-store.ts              # MCP server management
│   ├── workflow-store.ts         # Workflow management
│   ├── learning-store.ts         # Learning mode state
│   └── index.ts                  # Store exports
│
├── types/                        # TypeScript type definitions
│   ├── artifact.ts               # Artifact types (8 types, 17+ languages)
│   ├── session.ts                # Session and branch types
│   ├── message.ts                # Message types (with branch support)
│   ├── provider.ts               # Provider configuration
│   ├── memory.ts                 # Memory types
│   ├── project.ts                # Project types
│   ├── preset.ts                 # Preset types
│   ├── usage.ts                  # Usage tracking types
│   ├── mcp.ts                    # MCP types
│   ├── agent-mode.ts             # Agent mode types
│   ├── learning.ts               # Learning mode types
│   ├── skill.ts                  # Skill types
│   ├── speech.ts                 # Speech types
│   ├── workflow.ts               # Workflow types
│   └── index.ts
│
├── e2e/                          # Playwright end-to-end tests
│   ├── ai/                       # AI feature tests
│   ├── core/                     # Core feature tests
│   ├── features/                 # Feature tests
│   │   ├── math-renderer.spec.ts
│   │   ├── settings-ollama.spec.ts
│   │   ├── projects-knowledge-base.spec.ts
│   │   ├── learning-mode.spec.ts
│   │   ├── ppt-enhanced.spec.ts
│   │   ├── ppt.spec.ts
│   │   └── skills-enhanced.spec.ts
│   └── ui/                       # UI tests
│
├── src-tauri/                    # Tauri Rust backend
│   ├── src/
│   │   ├── main.rs               # Rust entry point
│   │   ├── lib.rs                # Library code
│   │   ├── commands/             # Tauri commands
│   │   │   ├── mod.rs
│   │   │   └── vector.rs         # Vector database commands
│   │   └── mcp/                  # MCP implementation
│   │       ├── mod.rs
│   │       ├── manager.rs        # Server lifecycle management
│   │       ├── client.rs         # MCP client
│   │       ├── config.rs         # Configuration management
│   │       ├── transport/        # Transport layer
│   │       └── protocol/         # Protocol implementation
│   ├── tauri.conf.json           # Tauri configuration
│   ├── Cargo.toml                # Rust dependencies
│   └── capabilities/             # Permissions config
│
├── llmdoc/                       # Project documentation
│   ├── index.md                  # Documentation index
│   └── feature/                  # Feature documentation
│       ├── phase-2-overview.md
│       ├── enhanced-features.md
│       ├── mcp-system.md
│       └── ...
│
├── public/                       # Static assets
├── __mocks__/                    # Jest mocks
├── .github/                      # GitHub configuration
├── components.json               # shadcn/ui configuration
├── next.config.ts                # Next.js configuration
├── tailwind.config.ts            # Tailwind configuration
├── tsconfig.json                 # TypeScript configuration
├── jest.config.ts                # Jest configuration
├── playwright.config.ts          # Playwright configuration
├── package.json                  # Dependencies and scripts
├── pnpm-lock.yaml                # pnpm lock file
├── CLAUDE.md                     # Claude AI instructions
├── CHANGELOG.md                  # Changelog
└── README_zh.md                  # Chinese documentation
```

## Core Features

### AI Model Integration

#### Supported Providers

Cognia integrates the following providers via Vercel AI SDK v5:

| Provider | Model Examples | Features |
| -------- | -------------- | -------- |
| OpenAI | GPT-4o, GPT-4o-mini, o1, o1-mini | Vision, tool calling, streaming |
| Anthropic | Claude 4 Sonnet/Opus, Claude 3.5 Haiku | Long context, vision |
| Google | Gemini 2.0 Flash, Gemini 1.5 Pro/Flash | Vision, long context |
| Mistral | Mistral Large, Mistral Small | High performance |
| DeepSeek | deepseek-chat, deepseek-coder | Code optimization |
| Groq | Llama 3.3, Mixtral | Low latency |
| Ollama | Local models | Offline, privacy |

#### Intelligent Auto-Routing

`lib/ai/auto-router.ts` implements three-tier intelligent routing:

```typescript
// Fast tier: Simple queries
- Groq Llama 3.3 (70 tokens/M)
- Gemini Flash
- GPT-4o Mini
- Claude Haiku

// Balanced tier: General tasks
- Gemini 1.5 Pro
- GPT-4o
- Claude Sonnet

// Powerful tier: Complex reasoning
- Claude Opus
- OpenAI o1
- DeepSeek Reasoner
```

#### Streaming Responses

All providers support streaming responses with real-time AI content display:

```typescript
const { messages, handleSubmit, isLoading } = useAIChat({
  api: '/api/chat',
  stream: true,
  onFinish: (message) => {
    // Record usage statistics
    addUsageRecord({ ... });
  }
});
```

### Artifacts System

The artifacts system allows AI to generate independent, previewable content pieces.

#### Supported Artifact Types

```typescript
type ArtifactType =
  | 'code'        // Code snippets (17+ languages)
  | 'document'    // Text documents
  | 'svg'         // SVG vector graphics
  | 'html'        // HTML pages
  | 'react'       // React components
  | 'mermaid'     // Mermaid diagrams
  | 'chart'       // Data charts (Recharts)
  | 'math';       // Math formulas (KaTeX)
```

#### Artifact Storage

Artifacts persist to localStorage (key: `cognia-artifacts`):

```typescript
interface Artifact {
  id: string;
  sessionId: string;
  messageId: string;
  type: ArtifactType;
  title: string;
  content: string;
  language?: string;
  createdAt: Date;
}
```

#### Usage Example

```typescript
import { useArtifactStore } from '@/stores/artifact-store';

// Create artifact
const { createArtifact } = useArtifactStore();
createArtifact({
  sessionId: 'session-123',
  messageId: 'msg-456',
  type: 'code',
  title: 'Quick Sort Algorithm',
  content: 'function quickSort(arr) { ... }',
  language: 'typescript'
});

// Artifact panel opens automatically and displays artifact
```

### Canvas Editor

Code editor based on Monaco editor with AI suggestions and version history.

#### Key Capabilities

- **Monaco Editor**: VS Code's editor
- **Syntax Highlighting**: Shiki supports 30+ languages
- **AI Suggestions**: AI can add improvement suggestions
- **Code Transformations**: Refactoring, optimization, explanation, etc.
- **Version History**: Auto-save and manual version points
- **Diff Comparison**: Version-to-version comparison

#### Canvas Operations

```typescript
// Add AI suggestion
useArtifactStore().addSuggestion(documentId, {
  type: 'fix', // fix | improve | refactor | explain
  range: { startLine: 10, endLine: 15 },
  originalText: 'const x = 1;',
  suggestedText: 'const x: number = 1;',
  explanation: 'Add type annotation',
  status: 'pending'
});

// Save version
saveCanvasVersion(documentId, 'Performance optimization', false);

// Restore version
restoreCanvasVersion(documentId, versionId);
```

### MCP Support

Complete Model Context Protocol implementation to extend AI capabilities.

#### MCP Architecture

```text
Frontend (React)
  ↓ Tauri IPC
Rust Backend (Tauri)
  ↓ stdio/SSE
MCP Servers (External)
```

#### Rust Backend

Location: `src-tauri/src/mcp/`

- `manager.rs` - Server lifecycle management
- `client.rs` - JSON-RPC 2.0 protocol implementation
- `transport/stdio.rs` - stdio transport
- `transport/sse.rs` - SSE transport
- `protocol/tools.rs` - Tools protocol
- `protocol/resources.rs` - Resources protocol
- `protocol/prompts.rs` - Prompts protocol

#### Frontend Store

Location: `stores/mcp-store.ts`

```typescript
interface McpState {
  servers: McpServerState[];
  initialize: () => Promise<void>;
  addServer: (id: string, config: McpServerConfig) => Promise<void>;
  connectServer: (id: string) => Promise<void>;
  callTool: (serverId: string, toolName: string, args: Record<string, unknown>) => Promise<ToolCallResult>;
  // ...
}
```

#### Supported Server Templates

Built-in quick installation templates:

1. **Filesystem** - Local file operations
2. **GitHub** - GitHub API access
3. **PostgreSQL** - Database queries
4. **SQLite** - Database queries
5. **Brave Search** - Web search
6. **Memory** - Persistent memory
7. **Puppeteer** - Browser automation
8. **Slack** - Slack integration

#### Configuration File

Location: `{app_data}/mcp_servers.json`

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/dir"],
      "env": {},
      "connectionType": "stdio"
    }
  }
}
```

### Data Persistence

#### IndexedDB (Dexie)

Messages and attachments persist to IndexedDB:

```typescript
// lib/db/message-repository.ts
export const messageRepository = {
  async create(sessionId: string, message: CreateMessageInput): Promise<UIMessage>;
  async update(id: string, updates: Partial<UIMessage>): Promise<void>;
  async delete(id: string): Promise<void>;
  async findBySession(sessionId: string): Promise<UIMessage[]>;
};
```

#### Zustand + localStorage

All stores use persist middleware to automatically save to localStorage:

```typescript
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({ ... }),
    { name: 'cognia-settings' }
  )
);
```

#### Storage Keys

| Store | localStorage Key |
| ----- | ---------------- |
| settings | `cognia-settings` |
| sessions | `cognia-sessions` |
| artifacts | `cognia-artifacts` |
| memory | `cognia-memory` |
| projects | `cognia-projects` |
| usage | `cognia-usage` |
| presets | `cognia-presets` |
| mcp | `cognia-mcp` |

### Project Management

#### Project Data Structure

```typescript
interface Project {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  customInstructions?: string;
  defaultProvider?: string;
  defaultModel?: string;
  knowledgeBase: KnowledgeFile[];
  sessionIds: string[];
  createdAt: Date;
  updatedAt: Date;
}
```

#### Knowledge Base

Each project can have associated knowledge base files:

```typescript
interface KnowledgeFile {
  id: string;
  name: string;
  type: 'text' | 'file' | 'url';
  content: string;
  size?: number;
  addedAt: Date;
}
```

#### Project Operations Example

```typescript
import { useProjectStore } from '@/stores/project-store';

// Create project
createProject({ name: 'New Project', description: '...' });

// Add knowledge base file
addKnowledgeFile(projectId, { name: 'doc.txt', content: '...' });

// Add session to project
addSessionToProject(projectId, sessionId);
```

## Configuration

For comprehensive configuration details, see the **[Configuration Guide](docs/features/configuration.md)**.

### Quick Setup

1. **Environment Variables** - Create a `.env.local` file with API keys:

```env
# AI provider keys (optional - can also be set in UI)
OPENAI_API_KEY=sk-your-key
ANTHROPIC_API_KEY=sk-ant-your-key
GOOGLE_API_KEY=your-key
```

2. **Provider Settings** - Configure AI providers in Settings > Providers
3. **Appearance** - Customize theme and fonts in Settings > Appearance
4. **Keyboard Shortcuts** - Customize shortcuts in Settings > Keyboard
5. **Data Management** - Import/export data in Settings > Data

For complete configuration options, including:
- Provider setup and testing
- Theme customization
- Keyboard shortcuts
- Speech settings
- MCP configuration
- Tauri desktop settings

See the **[Configuration Guide](docs/features/configuration.md)**.

**Security Notes**:

- Never commit `.env.local` to version control
- Only add provider keys you use
- Keys stored in browser localStorage, unencrypted

### Tauri Configuration

Edit `src-tauri/tauri.conf.json`:

```json
{
  "productName": "Cognia",
  "version": "1.0.0",
  "identifier": "com.cognia.app",
  "build": {
    "frontendDist": "../out",
    "devUrl": "http://localhost:3000"
  },
  "app": {
    "windows": [{
      "title": "Cognia",
      "width": 1280,
      "height": 800,
      "resizable": true,
      "fullscreen": false
    }]
  }
}
```

### Path Aliases

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

### Tailwind CSS

Using Tailwind v4 with CSS variable theming:

```css
/* app/globals.css */
@theme inline {
  --color-primary: *;
  --color-secondary: *;
  --radius: 0.5rem;
}

.dark {
  --color-background: oklch(0.1 0 0);
  --color-foreground: oklch(0.95 0 0);
}
```

## Production Build

### Web Application Build

```bash
# Build static export
pnpm build

# Output directory: out/
# Optimized content: HTML, CSS, JS, fonts, images

# Preview production build
pnpm start
```

### Desktop Application Build

```bash
# Build for current platform
pnpm tauri build

# Output locations:
# - Windows: src-tauri/target/release/bundle/msi/
# - macOS: src-tauri/target/release/bundle/dmg/
# - Linux: src-tauri/target/release/bundle/appimage/

# Build options
pnpm tauri build --target x86_64-pc-windows-msvc  # Specific target
pnpm tauri build --debug                           # Debug symbols
pnpm tauri build --bundles none                    # No bundling
```

## Deployment Guide

### Web Deployment

The `out/` directory can be deployed to any static hosting service:

#### Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

#### Netlify

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod --dir=out
```

#### Static CDN

Upload `out/` directory directly to:

- AWS S3 + CloudFront
- Azure Static Web Apps
- GitHub Pages
- Cloudflare Pages

### Desktop Application Distribution

Build output locations:

- Windows: `.msi` / `.exe`
- macOS: `.dmg` / `.app`
- Linux: `.AppImage` / `.deb`

Distribution channels:

- GitHub Releases
- Official website download
- App stores (Windows Store, Mac App Store)

## Testing Strategy

### Unit Testing (Jest)

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage report
pnpm test:coverage
```

Coverage requirements:

- Statement coverage: 70%
- Branch coverage: 60%
- Function coverage: 60%

### End-to-End Testing (Playwright)

```bash
# Run all E2E tests
pnpm test:e2e

# UI mode
pnpm test:e2e:ui

# Headed browser
pnpm test:e2e:headed
```

Test organization:

- `e2e/ai/` - AI feature tests
- `e2e/core/` - Core feature tests
- `e2e/features/` - Feature tests
- `e2e/ui/` - UI tests

### Lint Checks

```bash
# Run ESLint
pnpm lint

# Auto-fix
pnpm lint:fix
```

## Troubleshooting

### Port Already in Use

#### Windows

```bash
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

#### macOS/Linux

```bash
lsof -ti:3000 | xargs kill -9
```

### Tauri Build Fails

```bash
# Check environment
pnpm tauri info

# Update Rust
rustup update

# Clean build cache
cd src-tauri
cargo clean
```

### Module Not Found

```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Ollama Connection Fails

1. Ensure Ollama service is running: `ollama serve`
2. Verify port: `curl http://localhost:11434`
3. Check firewall settings
4. Confirm models are downloaded: `ollama list`

### MCP Server Fails to Start

1. Check command path: `which <command>`
2. Verify environment variable configuration
3. View server logs
4. Test command manually: `npx @modelcontextprotocol/server-filesystem --help`

## Resources

### Official Documentation

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Tauri Documentation](https://tauri.app/)
- [Vercel AI SDK](https://sdk.vercel.ai)
- [Zustand Documentation](https://zustand-demo.pmnd.rs/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com/)

### Related Technologies

- [Radix UI](https://www.radix-ui.com/)
- [Lucide Icons](https://lucide.dev/)
- [Monaco Editor](https://microsoft.github.io/monaco-editor/)
- [Dexie.js](https://dexie.org/)
- [Playwright](https://playwright.dev/)
- [Jest](https://jestjs.io/)

### Project Documentation

- **[Documentation Index](docs/README.md)** - Main documentation portal
- **[llmdoc/index.md](llmdoc/index.md)** - Legacy documentation index
- **[CLAUDE.md](CLAUDE.md)** - Claude AI instructions
- **[CHANGELOG.md](CHANGELOG.md)** - Changelog

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Commit your changes (using conventional commits)
4. Push to the branch
5. Create a Pull Request

For detailed guidelines, see **[Contributing Guide](docs/development/contributing.md)**.

### Conventional Commit Specification

```text
feat: New feature
fix: Bug fix
docs: Documentation update
style: Code formatting (no functional change)
refactor: Refactoring
test: Testing related
chore: Build/tooling related
```

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) file for details.

---

**Last Updated**: December 25, 2025

**Maintainers**: Cognia Development Team
