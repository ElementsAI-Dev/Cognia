# Notebook - Jupyter Integration

The Notebook feature provides a full Jupyter notebook interface with kernel management, code execution, variable inspection, and environment selection.

## Overview

| Feature | Description |
|---------|-------------|
| **Code Cells** | Execute code cells with output display |
| **Kernel Management** | Create, restart, and interrupt kernels |
| **Variable Inspector** | Browse active variables and their values |
| **Environment Selection** | Choose Python environment or kernel |
| **Multiple Kernels** | Support for Python, R, Julia, and more |
| **Output Rendering** | Rich output (HTML, images, charts, tables) |

## Getting Started

1. Navigate to **Notebook** from the sidebar
2. Select a kernel/environment from the dropdown
3. Add code cells and write your code
4. Press Shift+Enter to execute a cell
5. View output inline below each cell
6. Use the variable inspector to explore state

## Architecture

```text
app/(main)/notebook/page.tsx        → Notebook page
components/jupyter/                  → 7 Jupyter components
  ├── notebook-cell.tsx             → Code cell with execution
  ├── notebook-toolbar.tsx          → Kernel controls
  ├── variable-inspector.tsx        → Variable browser
  └── output-renderer.tsx           → Rich output display
hooks/jupyter/                      → Jupyter hooks
stores/tools/jupyter-store.ts       → Kernel and session state
lib/jupyter/                        → Jupyter utilities
src-tauri/src/jupyter/              → Rust backend
  ├── kernel.rs                    → Kernel lifecycle management
  ├── session.rs                   → Session management
  └── execution.rs                 → Code execution
```

## Desktop Only

Jupyter kernel management requires the Tauri desktop app for process spawning. The notebook UI can display pre-computed outputs in browser mode.
