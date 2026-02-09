# Canvas Editor

The Canvas Editor provides a Monaco-based code editing environment with AI suggestions, version history, and collaboration features.

## Overview

| Feature | Description |
|---------|-------------|
| **Monaco Editor** | VS Code-quality editing with 30+ language support |
| **AI Suggestions** | Inline code suggestions from AI |
| **Version History** | Track and compare document versions |
| **Diff View** | Side-by-side version comparison |
| **Keybindings** | Configurable keyboard shortcuts |
| **Comments** | Document commenting system |
| **Chunked Documents** | Large document support via chunking |
| **Multi-cursor** | Multiple cursor editing |

## Usage

The canvas editor is embedded in the artifacts panel and opens when viewing code artifacts. It provides:

1. Full syntax highlighting for generated code
2. AI-powered inline edits and suggestions
3. Version history for tracking AI iterations
4. Diff view to compare versions

## Architecture

```text
components/canvas/                  → 25 canvas components
  ├── canvas-panel.tsx              → Main editor wrapper
  ├── version-history-panel.tsx     → Version browser
  ├── diff-viewer.tsx               → Side-by-side diff
  └── canvas-toolbar.tsx            → Editor toolbar
hooks/canvas/                       → Canvas hooks
  ├── use-canvas-editor.ts          → Editor state hook
  └── use-canvas-history.ts         → Version tracking
stores/canvas/                      → Canvas state
  ├── comment-store.ts              → Comment persistence
  ├── keybinding-store.ts           → Keyboard shortcut config
  └── chunked-document-store.ts     → Large document management
lib/canvas/                         → Canvas utilities
  └── 24 utility files              → Formatting, themes, plugins
lib/monaco/                         → Monaco Editor integration
  └── 16 files                      → Language configs, themes
```

## Configuration

Keybindings can be customized via the keybinding store. The editor supports all standard Monaco shortcuts plus custom bindings for AI features.
