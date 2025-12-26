/**
 * Workflow Editor Type Definitions
 * Types for the React Flow-based visual workflow editor
 */

import type { Node, Edge, Viewport } from '@xyflow/react';
import type { WorkflowIOSchema, WorkflowType } from './workflow';

// =====================
// Node Types
// =====================

/**
 * Visual node types supported by the editor
 */
export type WorkflowNodeType =
  | 'start'
  | 'end'
  | 'ai'
  | 'tool'
  | 'conditional'
  | 'parallel'
  | 'human'
  | 'subworkflow'
  | 'loop'
  | 'delay'
  | 'webhook'
  | 'code'
  | 'transform'
  | 'merge';

/**
 * Node execution status for visualization
 */
export type NodeExecutionStatus =
  | 'idle'
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'waiting';

/**
 * Base node data structure
 */
export interface BaseNodeData {
  [key: string]: unknown;
  label: string;
  description?: string;
  nodeType: WorkflowNodeType;
  executionStatus: NodeExecutionStatus;
  isConfigured: boolean;
  hasError: boolean;
  errorMessage?: string;
  executionTime?: number;
  executionOutput?: unknown;
}

/**
 * Start node data
 */
export interface StartNodeData extends BaseNodeData {
  nodeType: 'start';
  workflowInputs: Record<string, WorkflowIOSchema>;
}

/**
 * End node data
 */
export interface EndNodeData extends BaseNodeData {
  nodeType: 'end';
  workflowOutputs: Record<string, WorkflowIOSchema>;
  outputMapping: Record<string, string>;
}

/**
 * AI node data
 */
export interface AINodeData extends BaseNodeData {
  nodeType: 'ai';
  aiPrompt: string;
  systemPrompt?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  inputs: Record<string, WorkflowIOSchema>;
  outputs: Record<string, WorkflowIOSchema>;
  responseFormat?: 'text' | 'json' | 'markdown';
  tools?: string[];
}

/**
 * Tool node data
 */
export interface ToolNodeData extends BaseNodeData {
  nodeType: 'tool';
  toolName: string;
  toolCategory?: string;
  inputs: Record<string, WorkflowIOSchema>;
  outputs: Record<string, WorkflowIOSchema>;
  parameterMapping: Record<string, string>;
}

/**
 * Conditional node data
 */
export interface ConditionalNodeData extends BaseNodeData {
  nodeType: 'conditional';
  condition: string;
  conditionType: 'expression' | 'ai' | 'comparison';
  comparisonOperator?: '==' | '!=' | '>' | '<' | '>=' | '<=' | 'contains' | 'startsWith' | 'endsWith';
  comparisonValue?: string;
  trueBranch?: string;
  falseBranch?: string;
  inputs: Record<string, WorkflowIOSchema>;
}

/**
 * Parallel node data
 */
export interface ParallelNodeData extends BaseNodeData {
  nodeType: 'parallel';
  branches: string[];
  waitForAll: boolean;
  maxConcurrency?: number;
  inputs: Record<string, WorkflowIOSchema>;
  outputs: Record<string, WorkflowIOSchema>;
}

/**
 * Human approval node data
 */
export interface HumanNodeData extends BaseNodeData {
  nodeType: 'human';
  approvalMessage: string;
  approvalOptions: string[];
  timeout?: number;
  defaultAction?: 'approve' | 'reject' | 'timeout';
  assignee?: string;
  inputs: Record<string, WorkflowIOSchema>;
  outputs: Record<string, WorkflowIOSchema>;
}

/**
 * Subworkflow node data
 */
export interface SubworkflowNodeData extends BaseNodeData {
  nodeType: 'subworkflow';
  workflowId: string;
  workflowName?: string;
  inputMapping: Record<string, string>;
  outputMapping: Record<string, string>;
  inputs: Record<string, WorkflowIOSchema>;
  outputs: Record<string, WorkflowIOSchema>;
}

/**
 * Loop node data
 */
export interface LoopNodeData extends BaseNodeData {
  nodeType: 'loop';
  loopType: 'forEach' | 'while' | 'times';
  iteratorVariable: string;
  collection?: string;
  condition?: string;
  maxIterations: number;
  inputs: Record<string, WorkflowIOSchema>;
  outputs: Record<string, WorkflowIOSchema>;
}

/**
 * Delay node data
 */
export interface DelayNodeData extends BaseNodeData {
  nodeType: 'delay';
  delayType: 'fixed' | 'until' | 'cron';
  delayMs?: number;
  untilTime?: string;
  cronExpression?: string;
}

/**
 * Webhook node data
 */
export interface WebhookNodeData extends BaseNodeData {
  nodeType: 'webhook';
  webhookUrl?: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers: Record<string, string>;
  body?: string;
  inputs: Record<string, WorkflowIOSchema>;
  outputs: Record<string, WorkflowIOSchema>;
}

/**
 * Code node data
 */
export interface CodeNodeData extends BaseNodeData {
  nodeType: 'code';
  language: 'javascript' | 'typescript' | 'python';
  code: string;
  inputs: Record<string, WorkflowIOSchema>;
  outputs: Record<string, WorkflowIOSchema>;
}

/**
 * Transform node data
 */
export interface TransformNodeData extends BaseNodeData {
  nodeType: 'transform';
  transformType: 'map' | 'filter' | 'reduce' | 'sort' | 'custom';
  expression: string;
  inputs: Record<string, WorkflowIOSchema>;
  outputs: Record<string, WorkflowIOSchema>;
}

/**
 * Merge node data
 */
export interface MergeNodeData extends BaseNodeData {
  nodeType: 'merge';
  mergeStrategy: 'concat' | 'merge' | 'first' | 'last' | 'custom';
  inputs: Record<string, WorkflowIOSchema>;
  outputs: Record<string, WorkflowIOSchema>;
}

/**
 * Union type for all node data types
 */
export type WorkflowNodeData =
  | StartNodeData
  | EndNodeData
  | AINodeData
  | ToolNodeData
  | ConditionalNodeData
  | ParallelNodeData
  | HumanNodeData
  | SubworkflowNodeData
  | LoopNodeData
  | DelayNodeData
  | WebhookNodeData
  | CodeNodeData
  | TransformNodeData
  | MergeNodeData;

/**
 * Workflow node (React Flow node with workflow data)
 */
export type WorkflowNode = Node<WorkflowNodeData, WorkflowNodeType>;

// =====================
// Edge Types
// =====================

/**
 * Edge types
 */
export type WorkflowEdgeType = 'default' | 'conditional' | 'parallel' | 'loop';

/**
 * Edge data
 */
export interface WorkflowEdgeData {
  [key: string]: unknown;
  label?: string;
  condition?: string;
  conditionValue?: boolean | string;
  animated?: boolean;
  priority?: number;
}

/**
 * Workflow edge (React Flow edge with workflow data)
 */
export type WorkflowEdge = Edge<WorkflowEdgeData>;

// =====================
// Editor State
// =====================

/**
 * Visual workflow definition
 */
export interface VisualWorkflow {
  id: string;
  name: string;
  description: string;
  type: WorkflowType;
  version: string;
  icon: string;
  category: string;
  tags: string[];
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  viewport: Viewport;
  inputs: Record<string, WorkflowIOSchema>;
  outputs: Record<string, WorkflowIOSchema>;
  variables: Record<string, unknown>;
  settings: WorkflowSettings;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  isTemplate?: boolean;
  templateId?: string;
}

/**
 * Workflow settings
 */
export interface WorkflowSettings {
  autoSave: boolean;
  autoLayout: boolean;
  showMinimap: boolean;
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number;
  defaultModel?: string;
  defaultTemperature?: number;
  maxExecutionTime?: number;
  retryOnFailure: boolean;
  maxRetries: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Editor state
 */
export interface WorkflowEditorState {
  currentWorkflow: VisualWorkflow | null;
  selectedNodes: string[];
  selectedEdges: string[];
  copiedNodes: WorkflowNode[];
  copiedEdges: WorkflowEdge[];
  isDirty: boolean;
  isExecuting: boolean;
  executionId: string | null;
  history: VisualWorkflow[];
  historyIndex: number;
  zoom: number;
  panPosition: { x: number; y: number };
  showNodePalette: boolean;
  showConfigPanel: boolean;
  showExecutionPanel: boolean;
  activeConfigTab: string;
  validationErrors: ValidationError[];
  searchQuery: string;
}

/**
 * Validation error
 */
export interface ValidationError {
  nodeId?: string;
  edgeId?: string;
  field?: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

// =====================
// Node Palette
// =====================

/**
 * Node category for palette
 */
export interface NodeCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
  nodes: NodePaletteItem[];
}

/**
 * Node palette item
 */
export interface NodePaletteItem {
  type: WorkflowNodeType;
  name: string;
  description: string;
  icon: string;
  color: string;
  defaultData: Partial<WorkflowNodeData>;
}

// =====================
// Execution
// =====================

/**
 * Node execution state
 */
export interface NodeExecutionState {
  nodeId: string;
  status: NodeExecutionStatus;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  logs: ExecutionLog[];
  retryCount: number;
}

/**
 * Execution log entry
 */
export interface ExecutionLog {
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: unknown;
}

/**
 * Workflow execution state
 */
export interface WorkflowExecutionState {
  executionId: string;
  workflowId: string;
  status: 'idle' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  currentNodeId?: string;
  nodeStates: Record<string, NodeExecutionState>;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  logs: ExecutionLog[];
}

// =====================
// Templates
// =====================

/**
 * Workflow template
 */
export interface WorkflowEditorTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  tags: string[];
  workflow: VisualWorkflow;
  previewImage?: string;
  popularity?: number;
  createdAt: Date;
  updatedAt: Date;
  author?: string;
}

// =====================
// Actions
// =====================

/**
 * Editor action types
 */
export type EditorAction =
  | { type: 'ADD_NODE'; payload: { node: WorkflowNode; position?: { x: number; y: number } } }
  | { type: 'UPDATE_NODE'; payload: { nodeId: string; data: Partial<WorkflowNodeData> } }
  | { type: 'DELETE_NODE'; payload: { nodeId: string } }
  | { type: 'ADD_EDGE'; payload: { edge: WorkflowEdge } }
  | { type: 'UPDATE_EDGE'; payload: { edgeId: string; data: Partial<WorkflowEdgeData> } }
  | { type: 'DELETE_EDGE'; payload: { edgeId: string } }
  | { type: 'SELECT_NODES'; payload: { nodeIds: string[] } }
  | { type: 'SELECT_EDGES'; payload: { edgeIds: string[] } }
  | { type: 'COPY_SELECTION'; payload: null }
  | { type: 'PASTE_SELECTION'; payload: { position: { x: number; y: number } } }
  | { type: 'UNDO'; payload: null }
  | { type: 'REDO'; payload: null }
  | { type: 'SET_VIEWPORT'; payload: { viewport: Viewport } }
  | { type: 'AUTO_LAYOUT'; payload: null }
  | { type: 'VALIDATE'; payload: null }
  | { type: 'SAVE'; payload: null }
  | { type: 'LOAD'; payload: { workflow: VisualWorkflow } }
  | { type: 'CLEAR'; payload: null }
  | { type: 'START_EXECUTION'; payload: { input: Record<string, unknown> } }
  | { type: 'PAUSE_EXECUTION'; payload: null }
  | { type: 'RESUME_EXECUTION'; payload: null }
  | { type: 'CANCEL_EXECUTION'; payload: null }
  | { type: 'UPDATE_EXECUTION_STATE'; payload: { state: Partial<WorkflowExecutionState> } };

// =====================
// Default Values
// =====================

/**
 * Default workflow settings
 */
export const DEFAULT_WORKFLOW_SETTINGS: WorkflowSettings = {
  autoSave: true,
  autoLayout: false,
  showMinimap: true,
  showGrid: true,
  snapToGrid: true,
  gridSize: 20,
  retryOnFailure: true,
  maxRetries: 3,
  logLevel: 'info',
};

/**
 * Default viewport
 */
export const DEFAULT_VIEWPORT: Viewport = {
  x: 0,
  y: 0,
  zoom: 1,
};

/**
 * Node type colors
 */
export const NODE_TYPE_COLORS: Record<WorkflowNodeType, string> = {
  start: '#22c55e',
  end: '#ef4444',
  ai: '#8b5cf6',
  tool: '#3b82f6',
  conditional: '#f59e0b',
  parallel: '#06b6d4',
  human: '#ec4899',
  subworkflow: '#6366f1',
  loop: '#14b8a6',
  delay: '#64748b',
  webhook: '#f97316',
  code: '#84cc16',
  transform: '#a855f7',
  merge: '#0ea5e9',
};

/**
 * Node type icons (Lucide icon names)
 */
export const NODE_TYPE_ICONS: Record<WorkflowNodeType, string> = {
  start: 'Play',
  end: 'Square',
  ai: 'Sparkles',
  tool: 'Wrench',
  conditional: 'GitBranch',
  parallel: 'GitFork',
  human: 'User',
  subworkflow: 'Workflow',
  loop: 'Repeat',
  delay: 'Clock',
  webhook: 'Globe',
  code: 'Code',
  transform: 'Shuffle',
  merge: 'GitMerge',
};

/**
 * Create default node data by type
 */
export function createDefaultNodeData(type: WorkflowNodeType, label?: string): WorkflowNodeData {
  const base: BaseNodeData = {
    label: label || getDefaultNodeLabel(type),
    nodeType: type,
    executionStatus: 'idle',
    isConfigured: false,
    hasError: false,
  };

  switch (type) {
    case 'start':
      return { ...base, nodeType: 'start', workflowInputs: {} } as StartNodeData;
    case 'end':
      return { ...base, nodeType: 'end', workflowOutputs: {}, outputMapping: {} } as EndNodeData;
    case 'ai':
      return {
        ...base,
        nodeType: 'ai',
        aiPrompt: '',
        inputs: {},
        outputs: {
          result: { type: 'string', description: 'AI response' },
        },
        temperature: 0.7,
        responseFormat: 'text',
      } as AINodeData;
    case 'tool':
      return {
        ...base,
        nodeType: 'tool',
        toolName: '',
        inputs: {},
        outputs: {},
        parameterMapping: {},
      } as ToolNodeData;
    case 'conditional':
      return {
        ...base,
        nodeType: 'conditional',
        condition: '',
        conditionType: 'expression',
        inputs: {},
      } as ConditionalNodeData;
    case 'parallel':
      return {
        ...base,
        nodeType: 'parallel',
        branches: [],
        waitForAll: true,
        inputs: {},
        outputs: {},
      } as ParallelNodeData;
    case 'human':
      return {
        ...base,
        nodeType: 'human',
        approvalMessage: 'Please review and approve',
        approvalOptions: ['Approve', 'Reject'],
        inputs: {},
        outputs: {},
      } as HumanNodeData;
    case 'subworkflow':
      return {
        ...base,
        nodeType: 'subworkflow',
        workflowId: '',
        inputMapping: {},
        outputMapping: {},
        inputs: {},
        outputs: {},
      } as SubworkflowNodeData;
    case 'loop':
      return {
        ...base,
        nodeType: 'loop',
        loopType: 'forEach',
        iteratorVariable: 'item',
        maxIterations: 100,
        inputs: {},
        outputs: {},
      } as LoopNodeData;
    case 'delay':
      return {
        ...base,
        nodeType: 'delay',
        delayType: 'fixed',
        delayMs: 1000,
      } as DelayNodeData;
    case 'webhook':
      return {
        ...base,
        nodeType: 'webhook',
        method: 'POST',
        headers: {},
        inputs: {},
        outputs: {},
      } as WebhookNodeData;
    case 'code':
      return {
        ...base,
        nodeType: 'code',
        language: 'javascript',
        code: '// Your code here\nreturn input;',
        inputs: {},
        outputs: {},
      } as CodeNodeData;
    case 'transform':
      return {
        ...base,
        nodeType: 'transform',
        transformType: 'map',
        expression: '',
        inputs: {},
        outputs: {},
      } as TransformNodeData;
    case 'merge':
      return {
        ...base,
        nodeType: 'merge',
        mergeStrategy: 'merge',
        inputs: {},
        outputs: {},
      } as MergeNodeData;
    default:
      return base as WorkflowNodeData;
  }
}

/**
 * Get default node label by type
 */
export function getDefaultNodeLabel(type: WorkflowNodeType): string {
  const labels: Record<WorkflowNodeType, string> = {
    start: 'Start',
    end: 'End',
    ai: 'AI Step',
    tool: 'Tool',
    conditional: 'Condition',
    parallel: 'Parallel',
    human: 'Human Approval',
    subworkflow: 'Subworkflow',
    loop: 'Loop',
    delay: 'Delay',
    webhook: 'Webhook',
    code: 'Code',
    transform: 'Transform',
    merge: 'Merge',
  };
  return labels[type] || 'Node';
}

/**
 * Create empty visual workflow
 */
export function createEmptyVisualWorkflow(name: string = 'New Workflow'): VisualWorkflow {
  const now = new Date();
  const startNode: WorkflowNode = {
    id: 'start-1',
    type: 'start',
    position: { x: 250, y: 50 },
    data: createDefaultNodeData('start') as StartNodeData,
  };

  const endNode: WorkflowNode = {
    id: 'end-1',
    type: 'end',
    position: { x: 250, y: 400 },
    data: createDefaultNodeData('end') as EndNodeData,
  };

  return {
    id: `workflow-${Date.now()}`,
    name,
    description: '',
    type: 'custom',
    version: '1.0.0',
    icon: 'Workflow',
    category: 'custom',
    tags: [],
    nodes: [startNode, endNode],
    edges: [],
    viewport: DEFAULT_VIEWPORT,
    inputs: {},
    outputs: {},
    variables: {},
    settings: DEFAULT_WORKFLOW_SETTINGS,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Node categories for palette
 */
export const NODE_CATEGORIES: NodeCategory[] = [
  {
    id: 'flow',
    name: 'Flow Control',
    icon: 'GitBranch',
    description: 'Control the flow of your workflow',
    nodes: [
      {
        type: 'start',
        name: 'Start',
        description: 'Workflow entry point',
        icon: 'Play',
        color: NODE_TYPE_COLORS.start,
        defaultData: createDefaultNodeData('start'),
      },
      {
        type: 'end',
        name: 'End',
        description: 'Workflow exit point',
        icon: 'Square',
        color: NODE_TYPE_COLORS.end,
        defaultData: createDefaultNodeData('end'),
      },
      {
        type: 'conditional',
        name: 'Condition',
        description: 'Branch based on condition',
        icon: 'GitBranch',
        color: NODE_TYPE_COLORS.conditional,
        defaultData: createDefaultNodeData('conditional'),
      },
      {
        type: 'parallel',
        name: 'Parallel',
        description: 'Execute branches in parallel',
        icon: 'GitFork',
        color: NODE_TYPE_COLORS.parallel,
        defaultData: createDefaultNodeData('parallel'),
      },
      {
        type: 'merge',
        name: 'Merge',
        description: 'Merge multiple branches',
        icon: 'GitMerge',
        color: NODE_TYPE_COLORS.merge,
        defaultData: createDefaultNodeData('merge'),
      },
      {
        type: 'loop',
        name: 'Loop',
        description: 'Iterate over items',
        icon: 'Repeat',
        color: NODE_TYPE_COLORS.loop,
        defaultData: createDefaultNodeData('loop'),
      },
    ],
  },
  {
    id: 'ai',
    name: 'AI & Processing',
    icon: 'Sparkles',
    description: 'AI-powered nodes',
    nodes: [
      {
        type: 'ai',
        name: 'AI Step',
        description: 'Execute AI prompt',
        icon: 'Sparkles',
        color: NODE_TYPE_COLORS.ai,
        defaultData: createDefaultNodeData('ai'),
      },
      {
        type: 'code',
        name: 'Code',
        description: 'Execute custom code',
        icon: 'Code',
        color: NODE_TYPE_COLORS.code,
        defaultData: createDefaultNodeData('code'),
      },
      {
        type: 'transform',
        name: 'Transform',
        description: 'Transform data',
        icon: 'Shuffle',
        color: NODE_TYPE_COLORS.transform,
        defaultData: createDefaultNodeData('transform'),
      },
    ],
  },
  {
    id: 'integration',
    name: 'Integration',
    icon: 'Plug',
    description: 'External integrations',
    nodes: [
      {
        type: 'tool',
        name: 'Tool',
        description: 'Execute a tool',
        icon: 'Wrench',
        color: NODE_TYPE_COLORS.tool,
        defaultData: createDefaultNodeData('tool'),
      },
      {
        type: 'webhook',
        name: 'Webhook',
        description: 'HTTP request',
        icon: 'Globe',
        color: NODE_TYPE_COLORS.webhook,
        defaultData: createDefaultNodeData('webhook'),
      },
      {
        type: 'subworkflow',
        name: 'Subworkflow',
        description: 'Execute another workflow',
        icon: 'Workflow',
        color: NODE_TYPE_COLORS.subworkflow,
        defaultData: createDefaultNodeData('subworkflow'),
      },
    ],
  },
  {
    id: 'utility',
    name: 'Utility',
    icon: 'Settings',
    description: 'Utility nodes',
    nodes: [
      {
        type: 'human',
        name: 'Human Approval',
        description: 'Wait for human approval',
        icon: 'User',
        color: NODE_TYPE_COLORS.human,
        defaultData: createDefaultNodeData('human'),
      },
      {
        type: 'delay',
        name: 'Delay',
        description: 'Wait for a duration',
        icon: 'Clock',
        color: NODE_TYPE_COLORS.delay,
        defaultData: createDefaultNodeData('delay'),
      },
    ],
  },
];
