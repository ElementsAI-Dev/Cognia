# Workflow Editor

A visual workflow editor built with React Flow for creating automation workflows with drag-and-drop node composition.

## Overview

| Feature | Description |
|---------|-------------|
| **Visual Editor** | Drag-and-drop node-based workflow builder |
| **Template Library** | Pre-built workflow templates |
| **Template Marketplace** | Browse and share community workflows |
| **Node Types** | 50+ node types covering AI, logic, data, and integration |
| **Execution** | Run workflows with real-time progress visualization |
| **Persistence** | Save workflows to IndexedDB via Dexie |

## Getting Started

1. Navigate to **Workflows** from the sidebar
2. Click **New Workflow** or select a template
3. Drag nodes from the palette onto the canvas
4. Connect nodes by dragging between ports
5. Configure node parameters in the properties panel
6. Click **Run** to execute the workflow

## Node Categories

- **AI**: LLM calls, embeddings, classification, summarization
- **Logic**: Conditions, loops, switches, parallel execution
- **Data**: Transform, filter, merge, split data
- **Integration**: HTTP requests, file I/O, database queries
- **Triggers**: Manual, scheduled, event-based, webhook

## Architecture

```text
app/(main)/workflows/page.tsx          → Workflow management page
components/workflow/                    → 130+ workflow components
  ├── editor/                          → WorkflowEditorPanel (React Flow)
  ├── marketplace/                     → Template browser
  ├── nodes/                           → Custom node components
  └── panels/                          → Properties, palette, debug panels
lib/workflow-editor/                   → Workflow logic and templates
stores/workflow/                       → Workflow state (26 files)
  ├── workflow-store.ts                → Workflow definitions
  └── workflow-editor-store.ts         → Editor canvas state
types/workflow/                        → TypeScript definitions
```

## Workflow Persistence

Workflows are stored in IndexedDB via the `workflowRepository`:

- Full workflow definitions with node positions and connections
- Execution history and logs
- Template metadata

## Template System

Built-in templates include:

- **Data Processing**: ETL pipelines, CSV transformation
- **AI Pipelines**: Multi-step LLM chains, RAG workflows
- **Automation**: Scheduled tasks, event handlers
- **Custom**: User-created templates
