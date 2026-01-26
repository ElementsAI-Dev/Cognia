# Workflow Editor Optimization Plan

**Date**: January 26, 2026
**Author**: Claude Code
**Status**: Planning
**Priority**: High

---

## Executive Summary

This document outlines a comprehensive optimization plan for Cognia's workflow editor system. The current implementation has ~15,000 lines of code across 109+ files, providing 17 node types with complete execution engine, version control, and extensive testing. However, several areas require optimization for better maintainability, performance, and user experience.

**Key Metrics**:
- 17 node types with 34 test files
- 85 component files, 24 library files, 2 main stores
- 3 large files requiring refactoring (1849 LOC, 1672 LOC, 830 LOC)
- 9 panel components with missing test coverage

**Optimization Goals**:
1. Improve code maintainability by splitting large files
2. Enhance performance through memoization and virtualization
3. Complete incomplete features (debug UI, template loading)
4. Strengthen type safety
5. Improve user experience with better error handling

---

## Current State Analysis

### Architecture Overview

The workflow editor follows a three-layer architecture:

```
┌─────────────────────────────────────────────────────────┐
│                    Presentation Layer                   │
│  ┌──────────────────────────────────────────────────┐  │
│  │  React Components (85 files)                     │  │
│  │  - Core: Editor Panel, Toolbar, Node Palette    │  │
│  │  - Nodes: 17 node types with base component     │  │
│  │  - Panels: 9 configuration and execution panels │  │
│  │  - Edges: Custom edge rendering                 │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                           ↕
┌─────────────────────────────────────────────────────────┐
│                     State Management Layer               │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Zustand Stores (2 stores)                       │  │
│  │  - workflow-editor-store: Visual editing state  │  │
│  │  - workflow-store: Runtime execution state      │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                           ↕
┌─────────────────────────────────────────────────────────┐
│                      Execution Layer                     │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Executor Engine (lib/ai/workflows)             │  │
│  │  - Step orchestration                           │  │
│  │  - Dependency resolution                        │  │
│  │  - Parallel execution                           │  │
│  │  - Retry logic                                  │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Critical Issues

| Issue | Impact | Priority |
|-------|--------|----------|
| 1849 LOC store file | Maintainability | Critical |
| 1672 LOC config panel | Rendering performance | Critical |
| 830 LOC executor file | Maintainability | High |
| Missing panel tests | Code quality | Medium |
| Incomplete debug UI | Feature completeness | High |
| Console.error statements | User experience | Medium |

---

## Optimization Roadmap

### Phase 1: Code Structure Refactoring (Weeks 1-3)

**Objective**: Improve maintainability by splitting large files into domain-specific modules.

#### 1.1 Store Refactoring

**Target**: `stores/workflow/workflow-editor-store.ts` (1849 LOC)

**Current Structure**:
```typescript
// Single file with 234 action methods covering:
// - Workflow management (create, load, save, delete)
// - Node operations (add, update, delete, duplicate)
// - Edge operations (add, update, delete)
// - Selection (select, clear, copy, paste)
// - History (undo, redo, push)
// - Viewport (set, fit view)
// - Layout (auto layout, align, distribute)
// - Validation (validate, clear errors)
// - Execution (start, pause, resume, cancel)
// - Debug mode (toggle, breakpoints, step)
// - UI state (panels, tabs, search)
// - Node templates (save, load, delete)
// - Version control (save, restore, delete)
// - Import/export (to file, from file)
// - Statistics (calculate, get)
```

**Proposed Structure**:
```
stores/workflow/
├── workflow-editor-store/
│   ├── index.ts                    # Main store composition
│   ├── workflow-slice.ts           # Workflow CRUD operations
│   ├── node-slice.ts               # Node operations
│   ├── edge-slice.ts               # Edge operations
│   ├── selection-slice.ts          # Selection & clipboard
│   ├── history-slice.ts            # Undo/redo history
│   ├── viewport-slice.ts           # Viewport & layout
│   ├── validation-slice.ts         # Validation & errors
│   ├── execution-slice.ts          # Execution state
│   ├── debug-slice.ts              # Debug mode & breakpoints
│   ├── ui-slice.ts                 # Panel visibility & tabs
│   ├── template-slice.ts           # Node templates
│   ├── version-slice.ts            # Version control
│   ├── import-export-slice.ts      # Import/export
│   └── statistics-slice.ts         # Statistics & metrics
```

**Benefits**:
- Easier to locate and modify specific functionality
- Reduced merge conflicts
- Better testability per slice
- Clearer separation of concerns

**Implementation Tasks**:
1. Create slice interfaces with proper TypeScript types
2. Migrate existing actions to appropriate slices
3. Use Zustand's `combine` or `redux-middleware` for composition
4. Update all imports across codebase
5. Add tests for each slice
6. Update documentation

**Estimated Effort**: 5 days

#### 1.2 Config Panel Refactoring

**Target**: `components/workflow/editor/panels/node-config-panel.tsx` (1672 LOC)

**Current Structure**:
```typescript
// Single file handling configuration for all 17 node types:
// - AI Node (prompt, system prompt, model, temperature, max tokens)
// - Tool Node (tool selection, parameter mapping)
// - Code Node (code editor, language selection)
// - Conditional Node (conditions, branches)
// - Parallel Node (branches, max concurrency)
// - Loop Node (iterator, max iterations)
// - Transform Node (expression, transform type)
// - Merge Node (merge strategy)
// - Delay Node (delay type, duration)
// - Webhook Node (URL, method, headers)
// - Human Node (assignee, approval message)
// - Subworkflow Node (workflow selection, mapping)
// - Start/End Node (input/output schema)
// - Group/Annotation Nodes (visual properties)
```

**Proposed Structure**:
```
components/workflow/editor/panels/node-config/
├── index.ts                       # Main config panel
├── base-node-config.tsx           # Base config component
├── flow-control/                  # Flow control node configs
│   ├── start-config.tsx
│   ├── end-config.tsx
│   ├── conditional-config.tsx
│   ├── parallel-config.tsx
│   ├── loop-config.tsx
│   └── merge-config.tsx
├── ai-processing/                 # AI & processing configs
│   ├── ai-config.tsx
│   ├── code-config.tsx
│   └── transform-config.tsx
├── integration/                   # Integration configs
│   ├── tool-config.tsx
│   ├── webhook-config.tsx
│   └── subworkflow-config.tsx
├── utility/                       # Utility configs
│   ├── human-config.tsx
│   └── delay-config.tsx
└── organization/                  # Organization configs
    ├── group-config.tsx
    └── annotation-config.tsx
```

**Benefits**:
- Lazy load config components for better performance
- Easier to add new node types
- Better code organization
- Reduced bundle size through code splitting

**Implementation Tasks**:
1. Extract node-specific config logic into separate components
2. Create base config component with shared functionality
3. Implement lazy loading with React.lazy()
4. Add loading states for config panels
5. Update tests for each config component
6. Add documentation for node-specific configurations

**Estimated Effort**: 4 days

#### 1.3 Executor Refactoring

**Target**: `lib/ai/workflows/executor.ts` (830 LOC)

**Current Structure**:
```typescript
// Single file with step execution functions:
// - executeAIStep()
// - executeCodeStep()
// - executeToolStep()
// - executeConditionalStep()
// - executeLoopStep()
// - executeParallelStep()
// - executeMergeStep()
// - executeDelayStep()
// - executeWebhookStep()
// - executeSubworkflowStep()
// - executeHumanStep()
```

**Proposed Structure**:
```
lib/ai/workflows/executors/
├── index.ts                       # Executor registry
├── base-executor.ts               # Base executor interface
├── ai-executor.ts                 # AI step executor
├── code-executor.ts               # Code step executor
├── tool-executor.ts               # Tool step executor
├── conditional-executor.ts        # Conditional step executor
├── loop-executor.ts               # Loop step executor
├── parallel-executor.ts           # Parallel step executor
├── merge-executor.ts              # Merge step executor
├── delay-executor.ts              # Delay step executor
├── webhook-executor.ts            # Webhook step executor
├── subworkflow-executor.ts        # Subworkflow step executor
└── human-executor.ts              # Human step executor
```

**Benefits**:
- Easier to add new step types
- Better testability per executor
- Clearer separation of concerns
- Potential for plugin architecture

**Implementation Tasks**:
1. Define base executor interface
2. Extract step execution functions into separate modules
3. Create executor registry for dynamic lookup
4. Update main executor to use registry
5. Add tests for each executor
6. Document executor interface for custom executors

**Estimated Effort**: 3 days

#### 1.4 Type Definition Refactoring

**Target**: `types/workflow/workflow-editor.ts` (1270 LOC)

**Current Structure**:
```typescript
// Single file with all types:
// - Node types (WorkflowNodeType, WorkflowNode, etc.)
// - Node data types (17 node-specific data interfaces)
// - Execution types (WorkflowExecutionState, NodeExecutionState)
// - Version control types (WorkflowVersion, VersionDiff)
// - Import/export types (WorkflowExport)
// - Statistics types (WorkflowStatistics)
// - Validation types (ValidationError)
```

**Proposed Structure**:
```
types/workflow/
├── index.ts                       # Main exports
├── base.ts                        # Base workflow types
├── nodes/                         # Node-related types
│   ├── index.ts
│   ├── node-types.ts              # WorkflowNodeType union
│   ├── base-node.ts               # BaseNodeData interface
│   ├── flow-control-nodes.ts      # Start, End, Conditional, etc.
│   ├── ai-nodes.ts                # AI, Code, Transform
│   ├── integration-nodes.ts       # Tool, Webhook, Subworkflow
│   └── organization-nodes.ts      # Group, Annotation
├── execution/                     # Execution-related types
│   ├── index.ts
│   ├── execution-state.ts         # WorkflowExecutionState
│   ├── node-execution.ts          # NodeExecutionState
│   └── execution-logs.ts          # ExecutionLog types
├── version/                       # Version control types
│   ├── index.ts
│   ├── workflow-version.ts
│   └── version-diff.ts
├── import-export/                 # Import/export types
│   ├── index.ts
│   └── workflow-export.ts
├── statistics/                    # Statistics types
│   ├── index.ts
│   └── workflow-statistics.ts
└── validation/                    # Validation types
    ├── index.ts
    └── validation-error.ts
```

**Benefits**:
- Better organization and discoverability
- Smaller import statements
- Clearer module boundaries
- Easier to maintain

**Implementation Tasks**:
1. Create new directory structure
2. Split types into appropriate files
3. Create index.ts files for clean imports
4. Update all imports across codebase
5. Update TypeScript path mappings if needed
6. Update documentation

**Estimated Effort**: 2 days

**Phase 1 Total Effort**: 14 days (2 weeks)

---

### Phase 2: Performance Optimization (Weeks 4-5)

**Objective**: Improve rendering and state management performance.

#### 2.1 State Management Optimization

**Current Issues**:
- 234 action methods all trigger store updates
- 50-entry history with full snapshots creates memory overhead
- No selector memoization in some components

**Optimization Strategy**:

1. **Granular Subscriptions**:
```typescript
// Before (subscribes to entire store)
const state = useWorkflowEditorStore();

// After (subscribes to specific slices)
const selectedNodes = useWorkflowEditorStore(
  state => state.selectedNodes,
  shallow
);
```

2. **History Compression**:
```typescript
// Instead of full snapshots
history: VisualWorkflow[]

// Use incremental patches
history: {
  version: number;
  patch: WorkflowPatch; // JSON Patch format
}[]
```

3. **Selector Memoization**:
```typescript
// Create memoized selectors
export const selectWorkflowNodes = createSelector(
  [(state: WorkflowEditorState) => state.currentWorkflow],
  (workflow) => workflow?.nodes ?? []
);
```

**Implementation Tasks**:
1. Audit all store usages for unnecessary subscriptions
2. Implement `useShallow` selector across components
3. Implement incremental history with JSON Patch
4. Add history compression for old entries
5. Create memoized selectors for derived data
6. Add performance monitoring

**Estimated Effort**: 3 days

#### 2.2 Rendering Optimization

**Current Issues**:
- Node config panel re-renders on every selection
- No virtualization for workflows with 100+ nodes
- Execution panel updates cause excessive re-renders

**Optimization Strategy**:

1. **Component Memoization**:
```typescript
// Wrap node components in React.memo
export const AINode = memo(({ data, selected }) => {
  // ...
}, (prevProps, nextProps) => {
  return prevProps.data === nextProps.data &&
         prevProps.selected === nextProps.selected;
});
```

2. **Lazy Loading Config Panels**:
```typescript
// Lazy load node config components
const AIPanelConfig = lazy(() => import('./node-config/ai-processing/ai-config'));
const ToolPanelConfig = lazy(() => import('./node-config/integration/tool-config'));
// etc.
```

3. **Execution Update Throttling**:
```typescript
// Throttle execution progress updates
const throttledUpdateProgress = useCallback(
  throttle((progress: number) => {
    updateExecutionProgress(progress);
  }, 100), // Update every 100ms max
  []
);
```

**Implementation Tasks**:
1. Add React.memo to all node components with custom comparison
2. Implement lazy loading for config panels
3. Add throttling to execution progress updates
4. Implement virtual scrolling for node palette
5. Add loading skeletons for async components
6. Profile and optimize hot paths

**Estimated Effort**: 3 days

#### 2.3 Execution Optimization

**Current Issues**:
- Execution runs on main thread
- No caching for identical inputs
- No request deduplication

**Optimization Strategy**:

1. **Web Worker Execution**:
```typescript
// Move workflow execution to Web Worker
const worker = new Worker('/workers/workflow-executor.worker.js');
worker.postMessage({ workflowId, input });
```

2. **Execution Caching**:
```typescript
// Cache execution results by input hash
const executionCache = new LRUCache<string, ExecutionResult>({
  max: 100,
  ttl: 1000 * 60 * 5, // 5 minutes
});
```

3. **Request Deduplication**:
```typescript
// Deduplicate concurrent execution requests
const pendingExecutions = new Map<string, Promise<ExecutionResult>>();
```

**Implementation Tasks**:
1. Create Web Worker for workflow execution
2. Implement execution result caching
3. Add request deduplication
4. Implement execution queue with priority levels
5. Add execution timeout handling
6. Update tests for Web Worker execution

**Estimated Effort**: 4 days

**Phase 2 Total Effort**: 10 days (2 weeks)

---

### Phase 3: Feature Completion (Weeks 6-7)

**Objective**: Complete incomplete features and add missing functionality.

#### 3.1 Debug UI Implementation

**Current State**:
- Debug mode infrastructure exists (`isDebugMode`, `breakpoints`)
- Store methods defined (`stepInto`, `stepOver`, `continue`)
- No UI controls found

**Implementation Plan**:

1. **Debug Panel Component**:
```
components/workflow/editor/debug/
├── debug-panel.tsx                # Main debug panel
├── debug-controls.tsx             # Step, continue, pause buttons
├── breakpoint-manager.tsx         # Breakpoint list
├── variable-inspector.tsx         # Variable values display
├── call-stack-view.tsx            # Call stack visualization
└── execution-trace.tsx            # Execution trace log
```

2. **Debug Controls**:
- Step Into (F11): Step into function calls
- Step Over (F10): Step over current node
- Continue (F5): Run to next breakpoint
- Pause: Pause execution at current node
- Stop: Stop debugging session

3. **Breakpoint Management**:
- Toggle breakpoints on nodes (Cmd+B)
- Conditional breakpoints (right-click → "Edit Breakpoint")
- Disable/enable breakpoints
- Breakpoint list with navigate-to feature

4. **Variable Inspector**:
- Show current variable values
- Inspect nested objects
- Watch expressions
- Variable history during debug session

**Implementation Tasks**:
1. Create debug panel components
2. Implement debug controls in toolbar
3. Add breakpoint UI to nodes
4. Implement variable inspector
5. Add call stack visualization
6. Add execution trace viewer
7. Update keyboard shortcuts
8. Add tests for debug functionality

**Estimated Effort**: 4 days

#### 3.2 Template Loading Completion

**Current State**:
- Template marketplace exists
- TODO comment in `template-browser.tsx`: "TODO: Load template into workflow editor"
- Template browser and preview components implemented

**Implementation Plan**:

1. **Template Loading Flow**:
```typescript
// Load template into editor
const loadTemplate = async (template: WorkflowTemplate) => {
  // 1. Validate template structure
  await validateTemplate(template);

  // 2. Import template nodes and edges
  const workflow = importTemplate(template);

  // 3. Create new workflow from template
  createWorkflow({
    ...workflow,
    templateId: template.id,
    name: `${template.name} (Copy)`,
  });

  // 4. Track template usage
  trackTemplateUsage(template.id);
};
```

2. **Template Validation**:
- Validate workflow structure
- Validate node configurations
- Validate edge connections
- Validate required variables

3. **Template Versioning**:
- Track template version in workflow
- Notify of template updates
- Support template migration

**Implementation Tasks**:
1. Remove TODO comment and implement template loading
2. Add template validation logic
3. Implement template import function
4. Add template usage tracking
5. Add template update notifications
6. Implement template migration
7. Update tests for template loading

**Estimated Effort**: 2 days

#### 3.3 Node Configuration Validation

**Current State**:
- Missing validation for conditional node expressions (uses unsafe `new Function()`)
- No syntax highlighting for code node
- Missing configuration UI for some advanced properties

**Implementation Plan**:

1. **Expression Validation**:
```typescript
// Replace unsafe new Function() with safe validation
import { parseExpression, validateExpression } from '@/lib/workflow-editor/expression-validator';

// Validate conditional expressions
const validateCondition = (condition: string) => {
  const result = validateExpression(condition);
  return result;
};
```

2. **Syntax Highlighting**:
```typescript
// Add Monaco editor for code node
import MonacoEditor from '@monaco-editor/react';

<MonacoEditor
  height="200px"
  language="javascript"
  theme="vs-dark"
  value={code}
  onChange={handleCodeChange}
  options={{
    minimap: { enabled: false },
    fontSize: 14,
  }}
/>
```

3. **Advanced Properties UI**:
- Parallel node: maxConcurrency configuration
- Merge node: custom merge function
- Loop node: iterator variable naming
- Transform node: expression builder

**Implementation Tasks**:
1. Create expression validation library
2. Replace unsafe new Function() with safe validation
3. Add Monaco editor to code node config
4. Add configuration UI for advanced properties
5. Add validation error indicators
6. Update tests for validation

**Estimated Effort**: 3 days

#### 3.4 Execution History Export

**Current State**:
- Execution statistics panel exists
- No export to CSV/JSON
- No visualization of execution patterns

**Implementation Plan**:

1. **Export Formats**:
```typescript
// Export execution history to CSV
export const exportToCSV = (history: WorkflowExecutionRecord[]) => {
  const csv = convertToCSV(history);
  downloadFile(csv, 'execution-history.csv', 'text/csv');
};

// Export execution history to JSON
export const exportToJSON = (history: WorkflowExecutionRecord[]) => {
  const json = JSON.stringify(history, null, 2);
  downloadFile(json, 'execution-history.json', 'application/json');
};
```

2. **Execution Visualization**:
- Execution timeline chart
- Success/failure rate over time
- Average duration trends
- Node execution frequency

**Implementation Tasks**:
1. Implement CSV export functionality
2. Implement JSON export functionality
3. Add export buttons to statistics panel
4. Create execution visualization components
5. Add date range filtering
6. Update tests for export functionality

**Estimated Effort**: 3 days

**Phase 3 Total Effort**: 12 days (2.5 weeks)

---

### Phase 4: Type System Strengthening (Week 8)

**Objective**: Improve type safety and reduce usage of `unknown` types.

#### 4.1 Stricter Types

**Current Issues**:
- Extensive use of `Record<string, unknown>`
- Generic types for step inputs/outputs
- No branded types for IDs

**Proposed Changes**:

1. **Specific Input/Output Types**:
```typescript
// Before
inputs: Record<string, unknown>;
outputs: Record<string, unknown>;

// After
interface WorkflowIOSchema {
  properties: Record<string, PropertySchema>;
  required: string[];
}

interface AIStepInputs {
  prompt: string;
  systemPrompt?: string;
  context?: Record<string, unknown>;
}

interface AIStepOutputs {
  text: string;
  usage?: { promptTokens: number; completionTokens: number };
}
```

2. **Branded ID Types**:
```typescript
// Create branded types for IDs
type NodeId = string & { readonly __brand: unique symbol };
type EdgeId = string & { readonly __brand: unique symbol };
type WorkflowId = string & { readonly __brand: unique symbol };

// Factory functions
const createNodeId = (id: string): NodeId => id as NodeId;
```

3. **Type Guards**:
```typescript
// Add type guards for runtime type checking
export const isAINodeData = (data: WorkflowNodeData): data is AINodeData => {
  return data.nodeType === 'ai';
};

export const isToolNodeData = (data: WorkflowNodeData): data is ToolNodeData => {
  return data.nodeType === 'tool';
};
```

**Implementation Tasks**:
1. Define specific types for each node's inputs/outputs
2. Create branded types for IDs
3. Add type guards for node data types
4. Add type guards for execution status
5. Replace `Record<string, unknown>` with specific types
6. Update all usages across codebase
7. Add strict null checks
8. Update tests

**Estimated Effort**: 5 days

#### 4.2 Type Migration Guide

Create a comprehensive guide for migrating to the new type system:

```markdown
# Type Migration Guide

## Node Inputs/Outputs

### Before
```typescript
const executeStep = async (inputs: Record<string, unknown>) => {
  const value = inputs.value as string; // Unsafe cast
};
```

### After
```typescript
const executeStep = async (inputs: AIStepInputs) => {
  const value = inputs.prompt; // Type-safe access
};
```

## Type Guards

### Usage
```typescript
if (isAINodeData(nodeData)) {
  // TypeScript knows nodeData is AINodeData here
  const prompt = nodeData.aiPrompt;
}
```
```

**Implementation Tasks**:
1. Create type migration guide
2. Document all new types
3. Provide code examples
4. Add migration checklist
5. Update CLAUDE.md

**Estimated Effort**: 1 day

**Phase 4 Total Effort**: 6 days (1 week)

---

### Phase 5: User Experience Improvements (Weeks 9-10)

**Objective**: Enhance user experience with better error handling, loading states, and accessibility.

#### 5.1 Error Handling Improvement

**Current Issues**:
- Console.error statements instead of user-facing notifications
- No error recovery suggestions
- No retry logic for failed operations

**Proposed Solution**:

1. **Toast Notifications**:
```typescript
// Replace console.error with toast notifications
import { toast } from 'sonner';

// Before
console.error('Failed to save workflow:', error);

// After
toast.error('Failed to save workflow', {
  description: error.message,
  action: {
    label: 'Retry',
    onClick: () => saveWorkflow(),
  },
});
```

2. **Error Recovery Suggestions**:
```typescript
// Provide actionable error messages
const getErrorRecovery = (error: WorkflowError) => {
  switch (error.code) {
    case 'NODE_NOT_CONFIGURED':
      return {
        message: 'Node is not configured',
        suggestion: 'Please configure the node before executing the workflow',
        action: 'Configure Node',
      };
    // ... more cases
  }
};
```

3. **Retry Logic**:
```typescript
// Implement exponential backoff retry
const retryWithBackoff = async (
  fn: () => Promise<void>,
  maxRetries = 3
) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await delay(Math.pow(2, i) * 1000);
    }
  }
};
```

**Implementation Tasks**:
1. Replace all console.error with toast notifications
2. Create error recovery suggestion system
3. Implement retry logic with exponential backoff
4. Add error boundaries around critical components
5. Create error reporting component
6. Update tests for error handling

**Estimated Effort**: 3 days

#### 5.2 Loading States

**Current State**:
- No skeleton screens for workflow loading
- No progress indicators for import/export
- No loading states for template operations

**Implementation Plan**:

1. **Skeleton Screens**:
```typescript
// Add skeleton loading states
<WorkflowEditorSkeleton />
<NodeConfigSkeleton />
<ExecutionPanelSkeleton />
```

2. **Progress Indicators**:
```typescript
// Show progress for long-running operations
const [progress, setProgress] = useState(0);

const importWorkflow = async (file: File) => {
  setProgress(0);
  // Update progress during import
  setProgress(25);
  // ...
  setProgress(100);
};
```

3. **Optimistic UI Updates**:
```typescript
// Update UI immediately, rollback on error
const deleteNode = async (nodeId: NodeId) => {
  const previousState = store.getState();
  store.getState().deleteNode(nodeId);

  try {
    await api.deleteNode(nodeId);
  } catch (error) {
    store.setState(previousState); // Rollback
    toast.error('Failed to delete node');
  }
};
```

**Implementation Tasks**:
1. Create skeleton components for all major views
2. Add progress indicators for long operations
3. Implement optimistic UI updates
4. Add loading spinners for async actions
5. Create loading state management
6. Update tests for loading states

**Estimated Effort**: 3 days

#### 5.3 Accessibility Improvements

**Current State**:
- Missing ARIA labels
- Limited keyboard navigation
- No screen reader announcements

**Implementation Plan**:

1. **ARIA Labels**:
```typescript
// Add ARIA labels to interactive elements
<button
  aria-label="Delete node"
  aria-describedby="delete-node-description"
>
  <TrashIcon />
</button>
<span id="delete-node-description" className="sr-only">
  Permanently remove this node from the workflow
</span>
```

2. **Keyboard Navigation**:
```typescript
// Implement keyboard navigation for node palette
const handleKeyDown = (e: KeyboardEvent) => {
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      selectNextNode();
      break;
    case 'ArrowUp':
      e.preventDefault();
      selectPreviousNode();
      break;
    case 'Enter':
      e.preventDefault();
      addSelectedNode();
      break;
  }
};
```

3. **Screen Reader Announcements**:
```typescript
// Announce execution status changes
useEffect(() => {
  if (executionState?.status === 'completed') {
    announce('Workflow execution completed successfully');
  } else if (executionState?.status === 'failed') {
    announce(`Workflow execution failed: ${executionState.error}`);
  }
}, [executionState?.status]);
```

4. **Color Contrast**:
- Ensure all text meets WCAG AA standards (4.5:1 for normal text)
- Ensure UI elements meet WCAG AA standards (3:1 for large text)

**Implementation Tasks**:
1. Audit all interactive elements for ARIA labels
2. Implement keyboard navigation for node palette
3. Add screen reader announcements for status changes
4. Verify color contrast ratios
5. Add focus indicators for keyboard navigation
6. Test with screen reader (NVDA/JAWS)
7. Update accessibility documentation

**Estimated Effort**: 4 days

**Phase 5 Total Effort**: 10 days (2 weeks)

---

### Phase 6: Advanced Features (Weeks 11-12)

**Objective**: Add advanced features for power users and enterprise customers.

#### 6.1 AI-Powered Workflow Generation

**Current State**:
- AI nodes exist for individual steps
- No AI-powered workflow generation
- No natural language to workflow conversion

**Implementation Plan**:

1. **Natural Language to Workflow**:
```typescript
// Generate workflow from natural language description
const generateWorkflow = async (description: string) => {
  const prompt = `
    Generate a workflow definition for: ${description}

    Return a JSON with:
    - nodes: array of workflow nodes
    - edges: array of connections
    - variables: required variables
  `;

  const result = await generateObject({
    schema: workflowGenerationSchema,
    prompt,
  });

  return result;
};
```

2. **Workflow Optimization Suggestions**:
```typescript
// AI analyzes workflow and suggests optimizations
const analyzeWorkflow = async (workflow: VisualWorkflow) => {
  const suggestions = await generateObject({
    schema: workflowSuggestionsSchema,
    prompt: `Analyze this workflow and suggest optimizations:
      ${JSON.stringify(workflow)}
    `,
  });

  return suggestions;
};
```

3. **AI-Assisted Debugging**:
```typescript
// AI helps debug failed workflows
const debugWorkflow = async (
  workflow: VisualWorkflow,
  error: WorkflowError
) => {
  const explanation = await generateText({
    prompt: `Explain why this workflow failed and how to fix it:
      Workflow: ${JSON.stringify(workflow)}
      Error: ${error.message}
    `,
  });

  return explanation;
};
```

**Implementation Tasks**:
1. Define Zod schemas for workflow generation
2. Implement workflow generation API
3. Create workflow generation UI
4. Implement workflow analysis
5. Create suggestions display
6. Implement AI debugging assistant
7. Add tests for AI features

**Estimated Effort**: 5 days

#### 6.2 Real-Time Collaboration

**Current State**:
- No real-time collaboration
- No conflict resolution
- No access control

**Implementation Plan**:

1. **Collaboration Backend**:
```typescript
// Use Yjs for CRDT-based collaboration
import * as Y from 'yjs';

const ydoc = new Y.Doc();
const yWorkflow = ydoc.getArray('workflow');

// Sync changes via WebSocket
const wsProvider = new WebsocketProvider(
  'ws://localhost:1234',
  workflowId,
  ydoc
);
```

2. **Presence Awareness**:
```typescript
// Show other users' cursors and selections
const presence = ydoc.getMap('presence');

presence.set(userId, {
  cursor: { x, y },
  selectedNodes: [nodeId1, nodeId2],
  color: userColor,
});
```

3. **Conflict Resolution**:
```typescript
// Implement operational transformation for conflicts
yWorkflow.observe((event) => {
  event.changes.added.forEach((item) => {
    // Handle added nodes
  });
  event.changes.deleted.forEach((item) => {
    // Handle deleted nodes
  });
});
```

**Implementation Tasks**:
1. Integrate Yjs for CRDT collaboration
2. Implement WebSocket sync backend
3. Add presence indicators (cursors, selections)
4. Implement conflict resolution
5. Add collaboration UI (user list, cursors)
6. Implement access control
7. Add tests for collaboration

**Estimated Effort**: 5 days

**Phase 6 Total Effort**: 10 days (2 weeks)

---

## Testing Strategy

### Test Coverage Goals

| Module | Current Coverage | Target Coverage |
|--------|-----------------|-----------------|
| Nodes | 100% (34 files) | Maintain 100% |
| Panels | 0% (9 files) | 80%+ |
| Store | Partial | 90%+ |
| Executor | Partial | 90%+ |
| Utils | Good | Maintain 90%+ |

### Test Implementation Plan

#### Phase 1: Panel Tests (Week 6)

**Missing Tests**:
1. `node-config-panel.tsx` - 1672 LOC
2. `execution-panel.tsx`
3. `execution-statistics-panel.tsx`
4. `workflow-settings-panel.tsx`
5. `workflow-trigger-panel.tsx`
6. `variable-manager-panel.tsx`
7. `version-history-panel.tsx`
8. `keyboard-shortcuts-panel.tsx`
9. `workflow-input-test-panel.tsx`

**Test Structure**:
```typescript
describe('NodeConfigPanel', () => {
  it('should render configuration for AI node', () => {});
  it('should render configuration for Tool node', () => {});
  it('should handle configuration changes', () => {});
  it('should validate node configuration', () => {});
  it('should show errors for invalid configuration', () => {});
  // ... more tests
});
```

#### Phase 2: Store Tests (Week 7)

**Focus Areas**:
- Refactored store slices (14 slices)
- Integration tests for store composition
- Performance tests for history management

#### Phase 3: Executor Tests (Week 8)

**Focus Areas**:
- Individual executor tests (11 executors)
- Integration tests for execution flow
- Error handling tests
- Retry logic tests

**Estimated Total Effort**: 15 days (3 weeks) - Can be parallel with other phases

---

## Documentation Plan

### Documentation Updates

1. **Architecture Documentation**:
   - Update `llmdoc/architecture/visual-tools-architecture.md`
   - Document new store slice architecture
   - Document executor plugin architecture

2. **API Documentation**:
   - Document all public APIs
   - Add JSDoc comments to all functions
   - Create API reference documentation

3. **User Documentation**:
   - Update user guide with new features
   - Add debugging guide
   - Add collaboration guide
   - Add AI workflow generation guide

4. **Developer Documentation**:
   - Create contributor guide
   - Document testing strategy
   - Document code review checklist
   - Update CLAUDE.md

**Estimated Effort**: 5 days (spread across all phases)

---

## Migration Strategy

### Rollout Plan

1. **Phase 1 (Code Structure)**:
   - Create feature branch for each slice
   - Implement one slice at a time
   - Maintain backward compatibility
   - Run full test suite after each slice

2. **Phase 2 (Performance)**:
   - A/B test performance improvements
   - Monitor metrics before and after
   - Roll back if issues detected

3. **Phase 3-6 (Features)**:
   - Feature flags for new functionality
   - Beta testing with select users
   - Gradual rollout

### Backward Compatibility

- Maintain old store interface during migration
- Provide migration utilities
- Support old workflow format during transition
- Document breaking changes

### Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking changes | High | Maintain backward compatibility layer |
| Performance regression | Medium | A/B testing, monitoring |
| Data loss | Critical | Comprehensive testing, backups |
| User confusion | Medium | Beta testing, documentation |

---

## Success Metrics

### Code Quality Metrics

| Metric | Current | Target | Deadline |
|--------|---------|--------|----------|
| Max file LOC | 1849 | <500 | Week 2 |
| Test coverage | 75% | 85%+ | Week 8 |
| Type coverage | 90% | 98%+ | Week 8 |
| Console.error | 6 | 0 | Week 9 |

### Performance Metrics

| Metric | Current | Target | Deadline |
|--------|---------|--------|----------|
| Initial render | ~2s | <500ms | Week 4 |
| Store update | ~50ms | <10ms | Week 4 |
| Execution start | ~1s | <200ms | Week 5 |
| Memory usage | ~150MB | <100MB | Week 5 |

### User Experience Metrics

| Metric | Current | Target | Deadline |
|--------|---------|--------|----------|
| Time to first workflow | N/A | <2min | Week 11 |
| Debug workflow time | N/A | <5min | Week 6 |
| Template load time | N/A | <1s | Week 6 |
| Error recovery rate | N/A | >80% | Week 9 |

---

## Resource Requirements

### Team Composition

- **Backend Developer**: 1 FTE (executor, collaboration backend)
- **Frontend Developer**: 1 FTE (UI components, panels)
- **Full-Stack Developer**: 1 FTE (store refactoring, integration)
- **QA Engineer**: 0.5 FTE (testing, test coverage)
- **Technical Writer**: 0.25 FTE (documentation)

### Time Estimates

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Code Structure | 2 weeks | None |
| Phase 2: Performance | 2 weeks | Phase 1 |
| Phase 3: Feature Completion | 2.5 weeks | Phase 1 |
| Phase 4: Type System | 1 week | Phase 1 |
| Phase 5: UX Improvements | 2 weeks | Phase 1, 3 |
| Phase 6: Advanced Features | 2 weeks | Phase 1, 2 |
| Testing | 3 weeks | Parallel with phases |
| Documentation | 1 week | Spread across phases |
| **Total** | **12 weeks** | **-** |

### Budget Estimate

| Role | Hours | Rate | Total |
|------|-------|------|-------|
| Backend Developer | 480 | $X/hr | $48X |
| Frontend Developer | 480 | $X/hr | $48X |
| Full-Stack Developer | 480 | $X/hr | $48X |
| QA Engineer | 240 | $X/hr | $24X |
| Technical Writer | 120 | $X/hr | $12X |
| **Total** | **1800 hours** | | **$180X** |

---

## Open Questions

1. **Web Worker Support**: Do we need to support Web Workers in all environments, or can we make it desktop-only?

2. **Collaboration Priority**: Is real-time collaboration a priority for v1, or can it be deferred to v2?

3. **Backward Compatibility**: How long should we maintain backward compatibility with old workflow format?

4. **AI Integration**: Should we use the existing AI SDK for workflow generation, or create a separate service?

5. **Testing Resources**: Do we have sufficient QA resources to achieve 85%+ test coverage?

---

## Next Steps

1. **Review and Approval**: Review this plan with stakeholders and get approval

2. **Sprint Planning**: Break down Phase 1 into sprint-sized tasks

3. **Environment Setup**: Set up development branches, CI/CD pipelines

4. **Kickoff**: Schedule kickoff meeting with development team

5. **Begin Implementation**: Start with Phase 1 - Code Structure Refactoring

---

## Appendix

### A. File Inventory

Complete list of workflow-related files can be found in:
- `llmdoc/agent/workflow-editor-analysis.md`

### B. Architecture Diagrams

See:
- `llmdoc/architecture/visual-tools-architecture.md`

### C. Type Definitions

See:
- `types/workflow/workflow-editor.ts`
- `types/workflow/workflow.ts`

### D. Component Documentation

See:
- `llmdoc/guides/visual-tools-guide.md`

---

**Document Version**: 1.0
**Last Updated**: January 26, 2026
**Next Review**: Weekly during implementation
**Maintainer**: Development Team
