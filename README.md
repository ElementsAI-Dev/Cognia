# Cognia

Cognia is a modern AI-native chat and creation platform with comprehensive multi-provider support. Built with Next.js 16 and React 19.2, Tauri 2.9 enables cross-platform desktop apps from a single codebase.

**Tech Stack**: Tailwind CSS v4, shadcn/ui, Zustand, Dexie, Vercel AI SDK v5 with **14 AI providers** (OpenAI, Anthropic, Google, Mistral, Groq, DeepSeek, Ollama, xAI, Together AI, OpenRouter, Cohere, Fireworks, Cerebras, SambaNova).

[中文文档](./README_zh.md)

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Documentation](#documentation)
- [Development Workflow](#development-workflow)
- [Project Structure](#project-structure)
- [Core Systems](#core-systems)
  - [AI Model Integration](#ai-model-integration)
  - [Agent System](#agent-system)
  - [MCP Support](#mcp-support)
  - [Native Tools](#native-tools)
  - [Designer System](#designer-system)
  - [Workflow Editor](#workflow-editor)
  - [Skills System](#skills-system)
  - [Learning Mode](#learning-mode)
  - [Artifacts & Canvas](#artifacts--canvas)
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

Cognia is a comprehensive AI-native chat and creation platform supporting **14 AI providers** with advanced capabilities:

- **Hybrid Architecture**: Runs as Next.js web app or Tauri desktop application
- **Agent System**: Autonomous AI agents with tool calling, planning, and sub-agent orchestration
- **Native Tools**: Desktop-exclusive features (selection, awareness, context, screenshot)
- **Visual Editors**: V0-style designer, workflow editor, canvas with AI suggestions
- **Learning Mode**: Interactive educational features with flashcards and quizzes
- **Full MCP Support**: Model Context Protocol for extended AI capabilities

## Key Features

### AI Capabilities

- **14 AI Providers**: OpenAI, Anthropic, Google, Mistral, Groq, DeepSeek, Ollama, xAI, Together AI, OpenRouter, Cohere, Fireworks, Cerebras, SambaNova
- **Intelligent Auto-Router**: Three-tier routing (Fast/Balanced/Powerful) with rule-based and LLM-based modes
- **Streaming Responses**: Real-time display of AI-generated content
- **Multimodal Support**: Vision models for image analysis
- **Image Generation**: DALL-E text-to-image integration
- **Tool Calling**: Function Calling and MCP tool support

### Agent System

- **Autonomous Agents**: Multi-step task execution with planning and tool calling
- **Sub-Agent Orchestration**: Coordinate multiple agents for complex tasks
- **Background Agents**: Queue and execute tasks asynchronously
- **Built-in Tools**: File operations, search, web access
- **Skills Integration**: Custom skill execution framework

### Chat Experience

- **Multiple Chat Modes**: Chat mode, Agent mode, Research mode, Learning mode
- **Conversation Branching**: Create branches from any message to explore different paths
- **Message Management**: Edit messages, retry responses, delete conversations
- **Voice Input**: Web Speech API integration for voice-to-text
- **File Upload**: Drag-and-drop support and clipboard paste for images
- **Session Search**: Full-text search across conversation history
- **Memory System**: Cross-session AI memory persistence
- **Custom Instructions**: Global and per-session custom instructions

### Content Creation

- **Artifacts System**: AI generates code, documents, charts, math formulas
- **Canvas Editor**: Monaco editor with AI suggestions and code transformations
- **Designer**: V0-style visual web page designer with 40+ components
- **Workflow Editor**: Visual workflow automation with React Flow
- **Version History**: Auto-save and version restore for documents

### Desktop Capabilities (Tauri)

- **Native Tools**: Selection, awareness, context, screenshot with OCR
- **MCP Integration**: Full Model Context Protocol support
- **Sandbox**: Docker/Podman code execution environment
- **File System Access**: Native file operations and dialogs

### Data & Export

- **Project Organization**: Organize conversations with knowledge bases
- **Multi-format Export**: PDF, Markdown, JSON, HTML, Word, Excel, PowerPoint
- **Preset Management**: Save and load chat configuration presets
- **Usage Tracking**: Token counting and cost estimation

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
│   ├── (chat)/                   # Main chat interface
│   ├── settings/                 # Settings page (7 tabs)
│   ├── projects/                 # Project management
│   ├── designer/                 # Visual designer
│   ├── native-tools/             # Native tools UI
│   ├── image-studio/             # Image editing
│   ├── video-editor/             # Video editing
│   ├── workflows/                # Workflow management
│   ├── api/                      # API routes (dev only)
│   └── globals.css               # Tailwind v4 theme
│
├── components/                   # React components (35+ directories)
│   ├── ui/                       # shadcn/Radix (50+ components)
│   ├── chat/                     # Chat interface
│   ├── ai-elements/              # AI components (30+)
│   ├── agent/                    # Agent mode
│   ├── artifacts/                # Artifact system
│   ├── canvas/                   # Canvas editor
│   ├── designer/                 # Visual designer
│   ├── workflow-editor/          # Workflow editor
│   ├── native/                   # Native features UI
│   ├── learning/                 # Learning mode
│   ├── skills/                   # Skills system
│   ├── mcp/                      # MCP management
│   ├── ppt/                      # PPT generation
│   ├── image-studio/             # Image editing
│   ├── video-studio/             # Video editing
│   ├── settings/                 # Settings panels
│   ├── projects/                 # Project management
│   ├── presets/                  # Preset system
│   ├── export/                   # Export dialogs
│   └── sidebar/                  # Navigation
│
├── hooks/                        # Modular React hooks
│   ├── ai/                       # use-agent, use-background-agent, use-skills
│   ├── chat/                     # use-summary, chat utilities
│   ├── context/                  # use-clipboard-context, use-project-context
│   ├── designer/                 # use-workflow-editor, use-workflow-execution
│   ├── media/                    # use-speech
│   ├── native/                   # use-native, use-notification, use-window
│   ├── rag/                      # RAG-related hooks
│   ├── sandbox/                  # use-environment, use-jupyter-kernel
│   └── ui/                       # use-learning-mode, use-global-shortcuts
│
├── stores/                       # Modular Zustand stores
│   ├── agent/                    # Agent execution
│   ├── artifact/                 # Artifacts, canvas, versions
│   ├── chat/                     # Chat sessions
│   ├── context/                  # Clipboard, quotes
│   ├── designer/                 # Designer state
│   ├── learning/                 # Learning mode
│   ├── mcp/                      # MCP servers
│   ├── media/                    # Media, recordings
│   ├── project/                  # Projects, knowledge bases
│   ├── settings/                 # Preferences, presets, themes
│   ├── system/                   # Native, proxy, usage
│   ├── tools/                    # Skills
│   └── workflow/                 # Workflow definitions
│
├── lib/                          # Core utilities
│   ├── ai/                       # AI integration
│   │   ├── agent/                # Agent executor, loop, orchestrator
│   │   ├── generation/           # Content generation
│   │   ├── memory/               # Memory providers
│   │   ├── tools/                # Tool definitions
│   │   └── workflows/            # Workflow definitions
│   ├── db/                       # Dexie database
│   ├── export/                   # PDF, Markdown, HTML, Word, Excel, PPT
│   ├── designer/                 # Designer utilities
│   ├── native/                   # Tauri native calls
│   ├── skills/                   # Skill framework
│   ├── learning/                 # Learning utilities
│   ├── i18n/                     # Internationalization (en, zh-CN)
│   └── vector/                   # Vector database
│
├── types/                        # TypeScript definitions
│   ├── provider.ts, message.ts, artifact.ts, session.ts
│   ├── agent-mode.ts, workflow.ts, learning.ts, skill.ts
│   └── mcp.ts, memory.ts, project.ts, preset.ts, usage.ts
│
├── src-tauri/                    # Tauri Rust backend
│   ├── src/
│   │   ├── mcp/                  # MCP implementation
│   │   ├── awareness/            # System monitoring
│   │   ├── context/              # Context detection
│   │   ├── screenshot/           # Screenshot capture
│   │   ├── selection/            # Text selection
│   │   ├── sandbox/              # Code execution
│   │   └── commands/             # Tauri commands
│   ├── tauri.conf.json           # Tauri configuration
│   └── capabilities/             # Permissions
│
├── e2e/                          # Playwright tests
├── docs/                         # Documentation
├── __mocks__/                    # Jest mocks
└── [config files]                # next, tailwind, jest, playwright, etc.
```

## Core Systems

### AI Model Integration

#### Supported Providers (14 total)

| Provider | Model Examples | Features |
| -------- | -------------- | -------- |
| OpenAI | GPT-4o, GPT-4o-mini, o1, o1-mini | Vision, tool calling, streaming |
| Anthropic | Claude 4 Sonnet/Opus, Claude 3.5 Haiku | Long context, vision |
| Google | Gemini 2.0 Flash, Gemini 1.5 Pro/Flash | Vision, long context |
| Mistral | Mistral Large, Mistral Small | High performance |
| DeepSeek | deepseek-chat, deepseek-coder | Code optimization |
| Groq | Llama 3.3, Mixtral | Low latency |
| xAI | Grok | OpenAI-compatible |
| Together AI | Various | OpenAI-compatible |
| OpenRouter | Multi-provider | Routing |
| Cohere | Command | Enterprise |
| Fireworks | Various | Fast inference |
| Cerebras | Various | Hardware-optimized |
| SambaNova | Various | Enterprise |
| Ollama | Local models | Offline, privacy |

#### Intelligent Auto-Routing

`lib/ai/auto-router.ts` supports two routing modes:

- **Rule-based**: Fast pattern matching for simple/complex detection
- **LLM-based**: Uses small models for accurate classification

Three-tier routing:

- **Fast tier**: Groq Llama 3.3, Gemini Flash, GPT-4o Mini, Claude Haiku
- **Balanced tier**: Gemini 1.5 Pro, GPT-4o, Claude Sonnet
- **Powerful tier**: Claude Opus, OpenAI o1, DeepSeek Reasoner

### Agent System

Three-tier architecture for autonomous AI agents:

1. **Application Layer**: React hooks (`useAgent`, `useBackgroundAgent`), UI panels
2. **Orchestration Layer**: Agent loop, planning, sub-agent coordination
3. **Execution Layer**: AgentExecutor with AI SDK `generateText`, unified tool system

#### Tool Integration

- **Built-in Tools**: File operations, search, web access
- **MCP Tools**: Full Model Context Protocol integration
- **Skills**: Custom skill execution framework
- **RAG**: Retrieval-augmented generation from knowledge bases

#### Key Files

- `lib/ai/agent/agent-executor.ts` — Core execution with tool calling
- `lib/ai/agent/agent-loop.ts` — Multi-step execution loop
- `lib/ai/agent/agent-orchestrator.ts` — Sub-agent coordination
- `hooks/ai/use-agent.ts` — React hook for agent mode

### MCP Support

Complete Model Context Protocol implementation for extending AI capabilities.

#### Architecture

```text
Cognia Frontend (React)
    ↓ Tauri IPC
Cognia Backend (Rust)
    ↓ stdio / SSE
MCP Servers (Node.js, Python, etc.)
```

#### Rust Backend (`src-tauri/src/mcp/`)

- `manager.rs` — Server lifecycle management
- `client.rs` — JSON-RPC 2.0 protocol
- `transport/stdio.rs` — stdio transport
- `transport/sse.rs` — SSE transport

#### Built-in Server Templates

Filesystem, GitHub, PostgreSQL, SQLite, Brave Search, Memory, Puppeteer, Slack

### Native Tools

Desktop-only features available in Tauri builds:

| Feature | Description | Platform Support |
| ------- | ----------- | ---------------- |
| **Selection System** | 12 expansion modes, AI actions, clipboard history | Windows, macOS, Linux |
| **Awareness System** | CPU, memory, disk, battery, network monitoring | Windows (full), others (partial) |
| **Context System** | Window/app/file/browser detection | Windows (full), others (partial) |
| **Screenshot System** | Multi-mode capture with OCR | Windows, macOS, Linux |

#### Key Files

- Rust: `src-tauri/src/awareness/`, `context/`, `screenshot/`, `selection/`
- Frontend: `lib/native/`, `hooks/native/`, `components/native/`

### Designer System

V0-style visual web page designer with AI-powered editing:

- **40+ Components**: 14 categories with drag-drop insertion
- **Live Preview**: Real-time preview with CDN fallback
- **AI Integration**: AI-powered content generation via `lib/designer/ai.ts`
- **Export**: Export to HTML, React components

#### Key Files

- `components/designer/core/designer-panel.tsx` — Main designer
- `components/designer/panels/element-tree.tsx` — Component hierarchy
- `components/designer/panels/style-panel.tsx` — Visual style editor
- `stores/designer/designer-store.ts` — State management

### Workflow Editor

Visual workflow automation with React Flow:

- **Visual Editor**: Node graph editor with drag-drop
- **Node Types**: Annotation, group, custom operation nodes
- **Execution Engine**: Step-by-step with debug support
- **Variable Management**: Global and local scope

#### Key Files

- `components/workflow-editor/workflow-editor-panel.tsx` — Main editor
- `components/workflow-editor/node-palette.tsx` — Node types
- `stores/workflow/` — Workflow state management

### Skills System

Custom skill framework for extending AI:

- **Skill Definition**: Custom skills with parameters and execution logic
- **Skill Suggestions**: AI-powered recommendations based on context
- **Skill Analytics**: Usage tracking and metrics
- **Skill Wizard**: Guided creation interface

#### Key Files

- `components/skills/skill-panel.tsx` — Management UI
- `stores/tools/skill-store.ts` — State management
- `hooks/ai/use-skills.ts` — React hook

### Learning Mode

Interactive learning system for educational content:

- **Phases**: Question analysis, guided learning, summary
- **Flashcards**: Spaced repetition learning
- **Quizzes**: Interactive knowledge testing
- **Progress Tracking**: Achievements and history

#### Key Files

- `components/learning/learning-mode-panel.tsx` — Main interface
- `stores/learning/learning-store.ts` — State management
- `hooks/ui/use-learning-mode.ts` — React hook

### Artifacts & Canvas

#### Artifact Types

- **code**: Code snippets (17+ languages)
- **document**: Text documents
- **svg/html/react**: Visual content
- **mermaid/chart**: Diagrams (Mermaid, Recharts)
- **math**: Math formulas (KaTeX)

#### Canvas Editor

Monaco-based editor with:

- Syntax highlighting (Shiki, 30+ languages)
- AI suggestions and code transformations
- Version history with diff comparison

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

1. **Provider Settings** - Configure AI providers in Settings > Providers
2. **Appearance** - Customize theme and fonts in Settings > Appearance
3. **Keyboard Shortcuts** - Customize shortcuts in Settings > Keyboard
4. **Data Management** - Import/export data in Settings > Data

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

**Last Updated**: January 12, 2026

**Maintainers**: Cognia Development Team
