# Changelog

All notable changes to this project will be documented in this file.

## Unreleased

- feat: Add AI Safety Mode with configurable security checks
  - Three safety modes: off, warn, block
  - Input safety checks for user messages and system prompts
  - Tool call safety checks to block dangerous commands
  - Custom blocked/allowed pattern management
  - Safety rule management with severity levels
  - External review API integration with timeout and fallback
  - Safety settings UI in settings panel
  - Comprehensive unit tests for safety functions

- Docs: Expanded README and README_zh with:
  - Multi-provider setup (OpenAI/Anthropic/Google/DeepSeek/Groq/etc.)
  - Pinecone/Qdrant environment examples and vector/RAG integration notes (vector-store, lib/document, lib/vector)
  - MCP/native desktop capabilities (filesystem, shell/process, clipboard, dialogs, updater) and minimal-capability guidance in `src-tauri/capabilities`
  - Testing/workflow guidance, data/storage notes, security & secrets, and support section
  - Enriched project structure listings (components modules, hooks, lib domains, stores, e2e, src-tauri)

## 2026-01-14 — b98e193

- feat: flow chat canvas, route groups, and build fixes

## 2026-01-13 — f0e7737

- feat: major refactor with tokenizer system, prompt optimization, and plugin SDK enhancements

## 2026-01-11 — 90c9fe0

- refactor: integrate LoadingSpinner in agent-summary-dialog
- refactor: integrate InlineLoading component in plugin-card
- refactor: integrate unused UI components from loading-states and sidebar
- fix: correct CopyButton import paths and ExtensionPoint type
- fix: update test mocks for reorganized type paths

## 2026-01-10 — 2e96104

- feat: add video studio, enhanced plugin system, and cross-session context
- feat: add missing academic_generate_knowledge_map command
- refactor: remove all dead code and fix all Rust warnings
- fix: resolve build errors across frontend and rust components
- fix: resolve TypeScript error in hot-reload.ts

## 2026-01-08 — 44806ad

- feat: complete plugin system with Python support and fix lint issues

## 2026-01-07 — 0bcaa2c

- feat: add search verification, vector DB clients, and desktop features

## 2026-01-05 — 07fa337

- feat: restructure A2UI components and fix module imports

## 2026-01-03 — 6605c17

- feat: add A2UI system, chat widget, image studio, git integration, and stronghold security
- fix: resolve TypeScript errors in test files and update type definitions

## 2026-01-02 — e0570c0

- feat: add Google AI search provider, web scraper, TTS services, and refactor designer components
- refactor: reorganize hooks into modular structure with feature-based directories
- fix: resolve build and lint errors for Next.js Turbopack compatibility

## 2025-12-17 — 7604bd8

- feat: implement complete AI chat assistant infrastructure.

## 2025-11-29 — 19675b8

- Initial commit.
