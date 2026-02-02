/**
 * Workflow Editor Store Types
 * Shared type definitions for all slices
 */

import type { Viewport } from '@xyflow/react';
import type {
  VisualWorkflow,
  WorkflowNode,
  WorkflowEdge,
  WorkflowNodeData,
  WorkflowEdgeData,
  WorkflowSettings,
  ValidationError,
  WorkflowExecutionState,
  NodeExecutionState,
  WorkflowNodeType,
  ExecutionLog,
  NodeTemplate,
  WorkflowVersion,
  WorkflowExport,
  WorkflowExecutionRecord,
  WorkflowStatistics,
} from '@/types/workflow/workflow-editor';
import type { ProviderName } from '@/types/provider';

// Re-export types for convenience
export type {
  VisualWorkflow,
  WorkflowNode,
  WorkflowEdge,
  WorkflowNodeData,
  WorkflowEdgeData,
  WorkflowSettings,
  ValidationError,
  WorkflowExecutionState,
  NodeExecutionState,
  WorkflowNodeType,
  ExecutionLog,
  NodeTemplate,
  WorkflowVersion,
  WorkflowExport,
  WorkflowExecutionRecord,
  WorkflowStatistics,
  Viewport,
  ProviderName,
};

// ============================================================================
// State Types
// ============================================================================

export interface WorkflowSliceState {
  currentWorkflow: VisualWorkflow | null;
  savedWorkflows: VisualWorkflow[];
  isDirty: boolean;
}

// NodeSliceState - Node state is stored in currentWorkflow.nodes
// EdgeSliceState - Edge state is stored in currentWorkflow.edges

export interface SelectionSliceState {
  selectedNodes: string[];
  selectedEdges: string[];
  copiedNodes: WorkflowNode[];
  copiedEdges: WorkflowEdge[];
}

export interface HistorySliceState {
  history: VisualWorkflow[];
  historyIndex: number;
  maxHistorySize: number;
}

// ViewportSliceState - Viewport is stored in currentWorkflow.viewport

export interface ValidationSliceState {
  validationErrors: ValidationError[];
}

export interface ExecutionSliceState {
  isExecuting: boolean;
  executionState: WorkflowExecutionState | null;
}

export interface DebugSliceState {
  isDebugMode: boolean;
  breakpoints: Set<string>;
  debugStepIndex: number;
  isPausedAtBreakpoint: boolean;
}

export interface UISliceState {
  showNodePalette: boolean;
  showConfigPanel: boolean;
  showExecutionPanel: boolean;
  showMinimap: boolean;
  activeConfigTab: string;
  searchQuery: string;
}

export interface TemplateSliceState {
  nodeTemplates: NodeTemplate[];
}

export interface VersionSliceState {
  workflowVersions: Record<string, WorkflowVersion[]>;
  currentVersionNumber: number;
}

export interface StatisticsSliceState {
  WorkflowExecutionRecords: WorkflowExecutionRecord[];
}

// Combined state type
export interface WorkflowEditorState
  extends WorkflowSliceState,
    SelectionSliceState,
    HistorySliceState,
    ValidationSliceState,
    ExecutionSliceState,
    DebugSliceState,
    UISliceState,
    TemplateSliceState,
    VersionSliceState,
    StatisticsSliceState {}

// ============================================================================
// Action Types
// ============================================================================

export interface WorkflowSliceActions {
  createWorkflow: (name?: string) => void;
  loadWorkflow: (workflow: VisualWorkflow) => void;
  loadFromTemplate: (workflow: VisualWorkflow) => void;
  saveWorkflow: () => Promise<void>;
  deleteWorkflow: (workflowId: string) => void;
  duplicateWorkflow: (workflowId: string) => void;
  updateWorkflowMeta: (
    updates: Partial<Pick<VisualWorkflow, 'name' | 'description' | 'category' | 'tags' | 'icon'>>
  ) => void;
  updateWorkflowSettings: (settings: Partial<WorkflowSettings>) => void;
  updateWorkflowVariables: (variables: Record<string, unknown>) => void;
  setWorkflowVariable: (name: string, value: unknown) => void;
  deleteWorkflowVariable: (name: string) => void;
}

export interface NodeSliceActions {
  addNode: (type: WorkflowNodeType, position: { x: number; y: number }) => string;
  updateNode: (nodeId: string, data: Partial<WorkflowNodeData>) => void;
  deleteNode: (nodeId: string) => void;
  deleteNodes: (nodeIds: string[]) => void;
  duplicateNode: (nodeId: string) => string | null;
  onNodesChange: (changes: import('@xyflow/react').NodeChange<WorkflowNode>[]) => void;
}

export interface EdgeSliceActions {
  addEdge: (connection: import('@xyflow/react').Connection) => void;
  updateEdge: (edgeId: string, data: Partial<WorkflowEdgeData>) => void;
  deleteEdge: (edgeId: string) => void;
  deleteEdges: (edgeIds: string[]) => void;
  onEdgesChange: (changes: import('@xyflow/react').EdgeChange<WorkflowEdge>[]) => void;
  onConnect: (connection: import('@xyflow/react').Connection) => void;
}

export interface SelectionSliceActions {
  selectNodes: (nodeIds: string[]) => void;
  selectEdges: (edgeIds: string[]) => void;
  selectAll: () => void;
  clearSelection: () => void;
  copySelection: () => void;
  pasteSelection: (position?: { x: number; y: number }) => void;
  cutSelection: () => void;
}

export interface HistorySliceActions {
  undo: () => void;
  redo: () => void;
  pushHistory: () => void;
  clearHistory: () => void;
}

export interface ViewportSliceActions {
  setViewport: (viewport: Viewport) => void;
  fitView: () => void;
  autoLayout: () => void;
  alignNodes: (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
  distributeNodes: (direction: 'horizontal' | 'vertical') => void;
}

export interface ValidationSliceActions {
  validate: () => ValidationError[];
  clearValidationErrors: () => void;
}

export interface ExecutionSliceActions {
  startExecution: (input: Record<string, unknown>) => void;
  pauseExecution: () => void;
  resumeExecution: () => void;
  cancelExecution: () => void;
  updateNodeExecutionState: (nodeId: string, state: Partial<NodeExecutionState>) => void;
  addExecutionLog: (log: ExecutionLog) => void;
  clearExecutionState: () => void;
}

export interface DebugSliceActions {
  toggleDebugMode: () => void;
  setBreakpoint: (nodeId: string) => void;
  removeBreakpoint: (nodeId: string) => void;
  clearBreakpoints: () => void;
  stepOver: () => void;
  stepInto: () => void;
  continueExecution: () => void;
}

export interface UISliceActions {
  toggleNodePalette: () => void;
  toggleConfigPanel: () => void;
  toggleExecutionPanel: () => void;
  toggleMinimap: () => void;
  setActiveConfigTab: (tab: string) => void;
  setSearchQuery: (query: string) => void;
}

export interface TemplateSliceActions {
  saveNodeAsTemplate: (
    nodeId: string,
    name: string,
    options?: { description?: string; category?: string; tags?: string[] }
  ) => NodeTemplate | null;
  addNodeFromTemplate: (templateId: string, position: { x: number; y: number }) => string | null;
  deleteNodeTemplate: (templateId: string) => void;
  updateNodeTemplate: (
    templateId: string,
    updates: Partial<Pick<NodeTemplate, 'name' | 'description' | 'category' | 'tags'>>
  ) => void;
}

export interface VersionComparisonResult {
  nodesAdded: Array<{ id: string; type: string; label?: string }>;
  nodesRemoved: Array<{ id: string; type: string; label?: string }>;
  nodesModified: Array<{ id: string; type: string; label?: string; changes: string[] }>;
  edgesAdded: Array<{ id: string; source: string; target: string }>;
  edgesRemoved: Array<{ id: string; source: string; target: string }>;
  summary: string;
}

export interface VersionSliceActions {
  saveVersion: (name?: string, description?: string) => WorkflowVersion | null;
  getVersions: () => WorkflowVersion[];
  restoreVersion: (versionId: string) => void;
  deleteVersion: (versionId: string) => void;
  compareVersions: (versionId1: string, versionId2: string) => VersionComparisonResult | null;
}

export interface ImportExportSliceActions {
  exportWorkflow: (options?: { includeTemplates?: boolean }) => WorkflowExport | null;
  importWorkflow: (data: WorkflowExport) => void;
  exportToFile: () => void;
  importFromFile: (file: File) => Promise<void>;
}

export interface StatisticsSliceActions {
  recordExecution: (record: Omit<WorkflowExecutionRecord, 'id'>) => void;
  getWorkflowStatistics: (workflowId?: string) => WorkflowStatistics | null;
  clearWorkflowExecutionRecords: (workflowId?: string) => void;
}

export interface ResetActions {
  reset: () => void;
}

// Combined actions type
export interface WorkflowEditorActions
  extends WorkflowSliceActions,
    NodeSliceActions,
    EdgeSliceActions,
    SelectionSliceActions,
    HistorySliceActions,
    ViewportSliceActions,
    ValidationSliceActions,
    ExecutionSliceActions,
    DebugSliceActions,
    UISliceActions,
    TemplateSliceActions,
    VersionSliceActions,
    ImportExportSliceActions,
    StatisticsSliceActions,
    ResetActions {}

// Store type
export type WorkflowEditorStore = WorkflowEditorState & WorkflowEditorActions;

// Slice creator type
export type SliceCreator<T> = (
  set: (
    partial: Partial<WorkflowEditorStore> | ((state: WorkflowEditorStore) => Partial<WorkflowEditorStore>)
  ) => void,
  get: () => WorkflowEditorStore
) => T;
