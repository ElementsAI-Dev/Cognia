# Sandbox - Code Execution

The Sandbox provides a secure code execution environment supporting multiple programming languages with Docker, Podman, and native runtime backends.

## Overview

| Feature | Description |
|---------|-------------|
| **Multi-language** | Python, JavaScript, TypeScript, Rust, Go, C, C++, Java, and more |
| **Multiple Runtimes** | Docker, Podman, and native execution |
| **Code Editor** | Monaco-based editor with syntax highlighting |
| **Execution History** | Persistent history of all code executions |
| **Snippet Manager** | Save and reuse code snippets |
| **Statistics** | Execution analytics and performance metrics |
| **Session Management** | Isolated execution sessions with state |
| **Resource Limits** | Configurable timeout and memory constraints |

## Getting Started

1. Navigate to **Sandbox** from the sidebar
2. Select a programming language from the dropdown
3. Write or paste code in the editor
4. Click **Run** to execute
5. View output, errors, and execution time in the output panel

## Tabs

- **Editor**: Split-pane code editor with output panel
- **History**: Browse past executions with filtering
- **Snippets**: Save and manage reusable code templates
- **Statistics**: Execution analytics dashboard

## Architecture

```text
app/(main)/sandbox/                → Sandbox page with editor
components/sandbox/                → UI components
  ├── execution-history.tsx        → Execution history list
  ├── snippet-manager.tsx          → Snippet CRUD
  └── sandbox-statistics.tsx       → Analytics dashboard
hooks/sandbox/                     → Hooks
  ├── use-sandbox.ts               → Runtime status and language detection
  ├── use-code-execution.ts        → Execute code and manage results
  ├── use-snippets.ts              → Snippet CRUD operations
  └── use-sessions.ts              → Session management
stores/sandbox/                    → Persistent state
lib/native/sandbox.ts              → Tauri command bindings
src-tauri/src/sandbox/             → Rust backend
  ├── runtime.rs                   → SandboxManager, runtime trait
  ├── native.rs                    → Native runtime (detect languages)
  ├── docker.rs                    → Docker runtime
  ├── podman.rs                    → Podman runtime
  ├── languages.rs                 → Language definitions
  └── db.rs                        → Session and snippet persistence
```

## Runtime Detection

The sandbox automatically detects available language runtimes on the system:

- Checks for Python, Node.js, Rust, Go, GCC, etc.
- Falls back to Docker/Podman containers when native runtimes are unavailable
- Reports available languages in the UI

## Resource Limits

Execution can be constrained with:

- **Timeout**: Maximum execution time (default: 30s)
- **Memory**: Maximum memory usage
- **Stdin**: Provide standard input to programs

## Desktop Only

The sandbox backend requires Tauri for process management. In browser-only mode, the sandbox page is accessible but execution is disabled.
