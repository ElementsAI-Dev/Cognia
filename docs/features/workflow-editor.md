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

## Editor Lifecycle and Gating

The editor now tracks an explicit lifecycle state in store:

- `clean`
- `dirty`
- `saving`
- `saveFailed`
- `publishBlocked`
- `readyToPublish`

Lifecycle is derived from mutation activity, save state, and blocking validation issues.
Run/publish actions are gated by blocking validation outcomes instead of ad-hoc UI booleans.

## Mutation Entry Point Audit (2026-03-10)

### Canonical mutation pipeline

All workflow graph mutations are centralized in:

- `stores/workflow/workflow-editor-store/utils/mutation.ts` (`applyWorkflowMutation`)

This applies atomic workflow updates plus shared side effects:

- dirty/lifecycle transitions
- server-validation clearing on local edits
- optional history push
- optional validation scheduling
- mutation metadata recording (`lastMutation`)

### Main mutation entry points

- Node mutations: `stores/workflow/workflow-editor-store/slices/node-slice.ts`
  - `addNode`, `updateNode`, `deleteNode`, `deleteNodes`, `duplicateNode`, `duplicateNodes`, `batchUpdateNodes`, `onNodesChange`
- Edge mutations: `stores/workflow/workflow-editor-store/slices/edge-slice.ts`
  - `addEdge`, `updateEdge`, `deleteEdge`, `deleteEdges`, `reconnectEdge`, `onEdgesChange`, `onConnect`
- Parameter/metadata mutations: `stores/workflow/workflow-editor-store/slices/workflow-slice.ts`
  - `updateWorkflowMeta`, `updateWorkflowSettings`, `updateWorkflowVariables`, `setWorkflowVariable`, `deleteWorkflowVariable`
- Canvas/derived mutations also routed through the same utility:
  - `selection-slice.ts` (`pasteSelection`)
  - `template-slice.ts`, `version-slice.ts`, `viewport-slice.ts`

## Validation and Error Surfacing

Validation now uses layered sources:

- Client-side structural and field validation (`validation-slice.ts`)
- Server-side normalized validation mapping (`lib/workflow-editor/server-validation.ts`)

Normalized errors include:

- `field`
- `nodeId`
- `edgeId`
- `severity`
- `message`
- `blocking`

Error surfaces:

- Inline node config validation
- Toolbar issue list and focus navigation
- Page/header lifecycle badges and blocking indicators
- Save failure toast summary with retry action

## Rollout and Rollback

Enhanced editor behavior is guarded by feature flag:

- Flag: `workflow.editor.v2`
- Env override: `NEXT_PUBLIC_WORKFLOW_EDITOR_V2=true|false`
- Local override key: `cognia-workflow-editor-feature-flags-v1`

Rollback path: disable `workflow.editor.v2` to use legacy interaction behavior.

## Spec Scenario to Test Mapping

Primary automated coverage for this change:

- Deterministic node update across entry points
  - `stores/workflow/workflow-editor-store.test.ts`
- Lifecycle transitions and publish blocking
  - `stores/workflow/workflow-editor-store/utils/lifecycle.test.ts`
  - `stores/workflow/workflow-editor-store/slices/workflow-slice.test.ts`
- Client + server validation mapping and blocking semantics
  - `stores/workflow/workflow-editor-store/slices/validation-slice.test.ts`
  - `lib/workflow-editor/server-validation.test.ts`
- Toolbar-level validation UX and action gating
  - `hooks/workflow/use-toolbar-actions.test.ts`
  - `components/workflow/editor/core/workflow-toolbar.test.tsx`
- Selection highlighting and issue focus navigation on canvas
  - `components/workflow/editor/core/workflow-editor-panel.test.tsx`
- Runtime behavior compatibility (web + tauri adapter paths)
  - `lib/workflow-editor/runtime-adapter.test.ts`
- End-to-end blocked-run and recovery workflow
  - `e2e/features/workflow-editor.spec.ts`
