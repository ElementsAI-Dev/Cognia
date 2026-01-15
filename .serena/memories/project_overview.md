# Cognia Project Overview

## Purpose

Cognia is an AI-native chat and creation application with multi-provider support, built as a hybrid web/desktop application. It provides:

- Multi-provider AI chat (14+ providers: OpenAI, Anthropic, Google, Mistral, DeepSeek, Groq, xAI, Together AI, OpenRouter, Cohere, Fireworks, Cerebras, SambaNova, Ollama)
- Autonomous agent system with tool calling and sub-agent orchestration
- Full Model Context Protocol (MCP) support
- Native desktop features (selection, awareness, context, screenshot) via Tauri
- Visual workflow editor and designer system
- Multi-language support (English, Chinese)

## Architecture

- **Frontend**: Next.js 16 with React 19.2, TypeScript, Tailwind CSS v4
- **Desktop**: Tauri 2.9 for cross-platform desktop apps
- **UI**: shadcn/ui with Radix UI primitives and Lucide icons
- **State**: Zustand stores + Dexie for IndexedDB persistence
- **AI**: Vercel AI SDK with intelligent auto-router
- **Testing**: Jest for unit tests, Playwright for E2E

## Key Constraints

- Production builds use `output: "export"` for static site generation
- Tauri loads static files from `out/` directory
- No server-side API routes in production
- Tauri plugins are aliased to stubs for browser builds

## Codebase Structure

```
app/              - Next.js App Router (routes, layouts)
components/       - Feature-based React components (50+ directories)
lib/              - Domain utilities and business logic
hooks/            - Custom React hooks organized by domain
stores/           - Zustand state management with persistence
types/            - TypeScript type definitions
src-tauri/        - Rust backend for native capabilities
```
