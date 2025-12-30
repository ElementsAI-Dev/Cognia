/**
 * Workflow Editor Store
 * Zustand store for managing workflow editor state
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge as rfAddEdge,
  type NodeChange,
  type EdgeChange,
  type Connection,
  type Viewport,
} from '@xyflow/react';
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
  ExecutionRecord,
  WorkflowStatistics,
} from '@/types/workflow-editor';
import {
  createEmptyVisualWorkflow,
  createDefaultNodeData,
  createNodeTemplate,
  createWorkflowVersion,
  createWorkflowExport,
  calculateWorkflowStatistics,
} from '@/types/workflow-editor';
import { nanoid } from 'nanoid';
import {
  executeVisualWorkflow,
  pauseVisualWorkflow,
  resumeVisualWorkflow,
  cancelVisualWorkflow,
  validateVisualWorkflow,
} from '@/lib/workflow-editor';
import { useSettingsStore } from './settings-store';
import type { ProviderName } from '@/types/provider';

interface WorkflowEditorState {
  // Current workflow
  currentWorkflow: VisualWorkflow | null;
  
  // Selection
  selectedNodes: string[];
  selectedEdges: string[];
  
  // Clipboard
  copiedNodes: WorkflowNode[];
  copiedEdges: WorkflowEdge[];
  
  // History for undo/redo
  history: VisualWorkflow[];
  historyIndex: number;
  maxHistorySize: number;
  
  // Dirty state
  isDirty: boolean;
  
  // Execution state
  isExecuting: boolean;
  executionState: WorkflowExecutionState | null;
  
  // UI state
  showNodePalette: boolean;
  showConfigPanel: boolean;
  showExecutionPanel: boolean;
  showMinimap: boolean;
  activeConfigTab: string;
  
  // Validation
  validationErrors: ValidationError[];
  
  // Search
  searchQuery: string;
  
  // Saved workflows
  savedWorkflows: VisualWorkflow[];
  
  // Node templates
  nodeTemplates: NodeTemplate[];
  
  // Version control
  workflowVersions: Record<string, WorkflowVersion[]>;
  currentVersionNumber: number;
  
  // Execution statistics
  executionRecords: ExecutionRecord[];
}

interface WorkflowEditorActions {
  // Workflow management
  createWorkflow: (name?: string) => void;
  loadWorkflow: (workflow: VisualWorkflow) => void;
  saveWorkflow: () => void;
  deleteWorkflow: (workflowId: string) => void;
  duplicateWorkflow: (workflowId: string) => void;
  updateWorkflowMeta: (updates: Partial<Pick<VisualWorkflow, 'name' | 'description' | 'category' | 'tags' | 'icon'>>) => void;
  updateWorkflowSettings: (settings: Partial<WorkflowSettings>) => void;
  updateWorkflowVariables: (variables: Record<string, unknown>) => void;
  setWorkflowVariable: (name: string, value: unknown) => void;
  deleteWorkflowVariable: (name: string) => void;
  
  // Node operations
  addNode: (type: WorkflowNodeType, position: { x: number; y: number }) => string;
  updateNode: (nodeId: string, data: Partial<WorkflowNodeData>) => void;
  deleteNode: (nodeId: string) => void;
  deleteNodes: (nodeIds: string[]) => void;
  duplicateNode: (nodeId: string) => string | null;
  onNodesChange: (changes: NodeChange<WorkflowNode>[]) => void;
  
  // Edge operations
  addEdge: (connection: Connection) => void;
  updateEdge: (edgeId: string, data: Partial<WorkflowEdgeData>) => void;
  deleteEdge: (edgeId: string) => void;
  deleteEdges: (edgeIds: string[]) => void;
  onEdgesChange: (changes: EdgeChange<WorkflowEdge>[]) => void;
  onConnect: (connection: Connection) => void;
  
  // Selection
  selectNodes: (nodeIds: string[]) => void;
  selectEdges: (edgeIds: string[]) => void;
  selectAll: () => void;
  clearSelection: () => void;
  
  // Clipboard
  copySelection: () => void;
  pasteSelection: (position?: { x: number; y: number }) => void;
  cutSelection: () => void;
  
  // History
  undo: () => void;
  redo: () => void;
  pushHistory: () => void;
  clearHistory: () => void;
  
  // Viewport
  setViewport: (viewport: Viewport) => void;
  fitView: () => void;
  
  // Layout
  autoLayout: () => void;
  alignNodes: (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
  distributeNodes: (direction: 'horizontal' | 'vertical') => void;
  
  // Validation
  validate: () => ValidationError[];
  clearValidationErrors: () => void;
  
  // Execution
  startExecution: (input: Record<string, unknown>) => void;
  pauseExecution: () => void;
  resumeExecution: () => void;
  cancelExecution: () => void;
  updateNodeExecutionState: (nodeId: string, state: Partial<NodeExecutionState>) => void;
  addExecutionLog: (log: ExecutionLog) => void;
  clearExecutionState: () => void;
  
  // UI state
  toggleNodePalette: () => void;
  toggleConfigPanel: () => void;
  toggleExecutionPanel: () => void;
  toggleMinimap: () => void;
  setActiveConfigTab: (tab: string) => void;
  setSearchQuery: (query: string) => void;
  
  // Node templates
  saveNodeAsTemplate: (nodeId: string, name: string, options?: { description?: string; category?: string; tags?: string[] }) => NodeTemplate | null;
  addNodeFromTemplate: (templateId: string, position: { x: number; y: number }) => string | null;
  deleteNodeTemplate: (templateId: string) => void;
  updateNodeTemplate: (templateId: string, updates: Partial<Pick<NodeTemplate, 'name' | 'description' | 'category' | 'tags'>>) => void;
  
  // Version control
  saveVersion: (name?: string, description?: string) => WorkflowVersion | null;
  getVersions: () => WorkflowVersion[];
  restoreVersion: (versionId: string) => void;
  deleteVersion: (versionId: string) => void;
  
  // Import/Export
  exportWorkflow: (options?: { includeTemplates?: boolean }) => WorkflowExport | null;
  importWorkflow: (data: WorkflowExport) => void;
  exportToFile: () => void;
  importFromFile: (file: File) => Promise<void>;
  
  // Execution statistics
  recordExecution: (record: Omit<ExecutionRecord, 'id'>) => void;
  getWorkflowStatistics: (workflowId?: string) => WorkflowStatistics | null;
  clearExecutionRecords: (workflowId?: string) => void;
  
  // Reset
  reset: () => void;
}

const initialState: WorkflowEditorState = {
  currentWorkflow: null,
  selectedNodes: [],
  selectedEdges: [],
  copiedNodes: [],
  copiedEdges: [],
  nodeTemplates: [],
  workflowVersions: {},
  currentVersionNumber: 0,
  executionRecords: [],
  history: [],
  historyIndex: -1,
  maxHistorySize: 50,
  isDirty: false,
  isExecuting: false,
  executionState: null,
  showNodePalette: true,
  showConfigPanel: true,
  showExecutionPanel: false,
  showMinimap: true,
  activeConfigTab: 'properties',
  validationErrors: [],
  searchQuery: '',
  savedWorkflows: [],
};

export const useWorkflowEditorStore = create<WorkflowEditorState & WorkflowEditorActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Workflow management
      createWorkflow: (name) => {
        const workflow = createEmptyVisualWorkflow(name);
        set({
          currentWorkflow: workflow,
          selectedNodes: [],
          selectedEdges: [],
          history: [workflow],
          historyIndex: 0,
          isDirty: false,
          validationErrors: [],
        });
      },

      loadWorkflow: (workflow) => {
        set({
          currentWorkflow: workflow,
          selectedNodes: [],
          selectedEdges: [],
          history: [workflow],
          historyIndex: 0,
          isDirty: false,
          validationErrors: [],
          executionState: null,
          isExecuting: false,
        });
      },

      saveWorkflow: () => {
        const { currentWorkflow, savedWorkflows } = get();
        if (!currentWorkflow) return;

        const updatedWorkflow = {
          ...currentWorkflow,
          updatedAt: new Date(),
        };

        const existingIndex = savedWorkflows.findIndex(w => w.id === currentWorkflow.id);
        const newSavedWorkflows = existingIndex >= 0
          ? savedWorkflows.map((w, i) => i === existingIndex ? updatedWorkflow : w)
          : [...savedWorkflows, updatedWorkflow];

        set({
          currentWorkflow: updatedWorkflow,
          savedWorkflows: newSavedWorkflows,
          isDirty: false,
        });
      },

      deleteWorkflow: (workflowId) => {
        const { savedWorkflows, currentWorkflow } = get();
        set({
          savedWorkflows: savedWorkflows.filter(w => w.id !== workflowId),
          currentWorkflow: currentWorkflow?.id === workflowId ? null : currentWorkflow,
        });
      },

      duplicateWorkflow: (workflowId) => {
        const { savedWorkflows } = get();
        const workflow = savedWorkflows.find(w => w.id === workflowId);
        if (!workflow) return;

        const duplicated: VisualWorkflow = {
          ...workflow,
          id: `workflow-${Date.now()}`,
          name: `${workflow.name} (Copy)`,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        set({
          savedWorkflows: [...savedWorkflows, duplicated],
        });
      },

      updateWorkflowMeta: (updates) => {
        const { currentWorkflow } = get();
        if (!currentWorkflow) return;

        const updated = {
          ...currentWorkflow,
          ...updates,
          updatedAt: new Date(),
        };

        set({ currentWorkflow: updated, isDirty: true });
        get().pushHistory();
      },

      updateWorkflowSettings: (settings) => {
        const { currentWorkflow } = get();
        if (!currentWorkflow) return;

        const updated = {
          ...currentWorkflow,
          settings: { ...currentWorkflow.settings, ...settings },
          updatedAt: new Date(),
        };

        set({ currentWorkflow: updated, isDirty: true });
      },

      updateWorkflowVariables: (variables) => {
        const { currentWorkflow } = get();
        if (!currentWorkflow) return;

        const updated = {
          ...currentWorkflow,
          variables,
          updatedAt: new Date(),
        };

        set({ currentWorkflow: updated, isDirty: true });
        get().pushHistory();
      },

      setWorkflowVariable: (name, value) => {
        const { currentWorkflow } = get();
        if (!currentWorkflow) return;

        const updated = {
          ...currentWorkflow,
          variables: {
            ...currentWorkflow.variables,
            [name]: value,
          },
          updatedAt: new Date(),
        };

        set({ currentWorkflow: updated, isDirty: true });
        get().pushHistory();
      },

      deleteWorkflowVariable: (name) => {
        const { currentWorkflow } = get();
        if (!currentWorkflow) return;

        const { [name]: _deleted, ...rest } = currentWorkflow.variables;
        const updated = {
          ...currentWorkflow,
          variables: rest,
          updatedAt: new Date(),
        };

        set({ currentWorkflow: updated, isDirty: true });
        get().pushHistory();
      },

      // Node operations
      addNode: (type, position) => {
        const { currentWorkflow } = get();
        if (!currentWorkflow) return '';

        const nodeId = `${type}-${nanoid(8)}`;
        const newNode: WorkflowNode = {
          id: nodeId,
          type,
          position,
          data: createDefaultNodeData(type),
        };

        const updated = {
          ...currentWorkflow,
          nodes: [...currentWorkflow.nodes, newNode],
          updatedAt: new Date(),
        };

        set({ currentWorkflow: updated, isDirty: true, selectedNodes: [nodeId] });
        get().pushHistory();
        return nodeId;
      },

      updateNode: (nodeId, data) => {
        const { currentWorkflow } = get();
        if (!currentWorkflow) return;

        const updated = {
          ...currentWorkflow,
          nodes: currentWorkflow.nodes.map(node =>
            node.id === nodeId
              ? { ...node, data: { ...node.data, ...data } as WorkflowNodeData }
              : node
          ),
          updatedAt: new Date(),
        };

        set({ currentWorkflow: updated, isDirty: true });
        get().pushHistory();
      },

      deleteNode: (nodeId) => {
        const { currentWorkflow } = get();
        if (!currentWorkflow) return;

        const updated = {
          ...currentWorkflow,
          nodes: currentWorkflow.nodes.filter(n => n.id !== nodeId),
          edges: currentWorkflow.edges.filter(e => e.source !== nodeId && e.target !== nodeId),
          updatedAt: new Date(),
        };

        set({
          currentWorkflow: updated,
          isDirty: true,
          selectedNodes: get().selectedNodes.filter(id => id !== nodeId),
        });
        get().pushHistory();
      },

      deleteNodes: (nodeIds) => {
        const { currentWorkflow } = get();
        if (!currentWorkflow) return;

        const nodeIdSet = new Set(nodeIds);
        const updated = {
          ...currentWorkflow,
          nodes: currentWorkflow.nodes.filter(n => !nodeIdSet.has(n.id)),
          edges: currentWorkflow.edges.filter(e => !nodeIdSet.has(e.source) && !nodeIdSet.has(e.target)),
          updatedAt: new Date(),
        };

        set({
          currentWorkflow: updated,
          isDirty: true,
          selectedNodes: get().selectedNodes.filter(id => !nodeIdSet.has(id)),
        });
        get().pushHistory();
      },

      duplicateNode: (nodeId) => {
        const { currentWorkflow } = get();
        if (!currentWorkflow) return null;

        const node = currentWorkflow.nodes.find(n => n.id === nodeId);
        if (!node) return null;

        const newNodeId = `${node.type}-${nanoid(8)}`;
        const newNode: WorkflowNode = {
          ...node,
          id: newNodeId,
          position: {
            x: node.position.x + 50,
            y: node.position.y + 50,
          },
          data: { ...node.data },
        };

        const updated = {
          ...currentWorkflow,
          nodes: [...currentWorkflow.nodes, newNode],
          updatedAt: new Date(),
        };

        set({ currentWorkflow: updated, isDirty: true, selectedNodes: [newNodeId] });
        get().pushHistory();
        return newNodeId;
      },

      onNodesChange: (changes) => {
        const { currentWorkflow } = get();
        if (!currentWorkflow) return;

        const updated = {
          ...currentWorkflow,
          nodes: applyNodeChanges(changes, currentWorkflow.nodes),
          updatedAt: new Date(),
        };

        set({ currentWorkflow: updated, isDirty: true });
      },

      // Edge operations
      addEdge: (connection) => {
        const { currentWorkflow } = get();
        if (!currentWorkflow) return;

        const newEdge: WorkflowEdge = {
          id: `edge-${nanoid(8)}`,
          source: connection.source!,
          target: connection.target!,
          sourceHandle: connection.sourceHandle,
          targetHandle: connection.targetHandle,
          type: 'default',
          data: {},
        };

        const updated = {
          ...currentWorkflow,
          edges: [...currentWorkflow.edges, newEdge],
          updatedAt: new Date(),
        };

        set({ currentWorkflow: updated, isDirty: true });
        get().pushHistory();
      },

      updateEdge: (edgeId, data) => {
        const { currentWorkflow } = get();
        if (!currentWorkflow) return;

        const updated = {
          ...currentWorkflow,
          edges: currentWorkflow.edges.map(edge =>
            edge.id === edgeId
              ? { ...edge, data: { ...edge.data, ...data } }
              : edge
          ),
          updatedAt: new Date(),
        };

        set({ currentWorkflow: updated, isDirty: true });
        get().pushHistory();
      },

      deleteEdge: (edgeId) => {
        const { currentWorkflow } = get();
        if (!currentWorkflow) return;

        const updated = {
          ...currentWorkflow,
          edges: currentWorkflow.edges.filter(e => e.id !== edgeId),
          updatedAt: new Date(),
        };

        set({
          currentWorkflow: updated,
          isDirty: true,
          selectedEdges: get().selectedEdges.filter(id => id !== edgeId),
        });
        get().pushHistory();
      },

      deleteEdges: (edgeIds) => {
        const { currentWorkflow } = get();
        if (!currentWorkflow) return;

        const edgeIdSet = new Set(edgeIds);
        const updated = {
          ...currentWorkflow,
          edges: currentWorkflow.edges.filter(e => !edgeIdSet.has(e.id)),
          updatedAt: new Date(),
        };

        set({
          currentWorkflow: updated,
          isDirty: true,
          selectedEdges: get().selectedEdges.filter(id => !edgeIdSet.has(id)),
        });
        get().pushHistory();
      },

      onEdgesChange: (changes) => {
        const { currentWorkflow } = get();
        if (!currentWorkflow) return;

        const updated = {
          ...currentWorkflow,
          edges: applyEdgeChanges(changes, currentWorkflow.edges),
          updatedAt: new Date(),
        };

        set({ currentWorkflow: updated, isDirty: true });
      },

      onConnect: (connection) => {
        const { currentWorkflow } = get();
        if (!currentWorkflow) return;

        const updated = {
          ...currentWorkflow,
          edges: rfAddEdge(
            {
              ...connection,
              id: `edge-${nanoid(8)}`,
              type: 'default',
              data: {},
            },
            currentWorkflow.edges as never[]
          ) as WorkflowEdge[],
          updatedAt: new Date(),
        };

        set({ currentWorkflow: updated, isDirty: true });
        get().pushHistory();
      },

      // Selection
      selectNodes: (nodeIds) => {
        set({ selectedNodes: nodeIds });
      },

      selectEdges: (edgeIds) => {
        set({ selectedEdges: edgeIds });
      },

      selectAll: () => {
        const { currentWorkflow } = get();
        if (!currentWorkflow) return;

        set({
          selectedNodes: currentWorkflow.nodes.map(n => n.id),
          selectedEdges: currentWorkflow.edges.map(e => e.id),
        });
      },

      clearSelection: () => {
        set({ selectedNodes: [], selectedEdges: [] });
      },

      // Clipboard
      copySelection: () => {
        const { currentWorkflow, selectedNodes, selectedEdges } = get();
        if (!currentWorkflow) return;

        const nodeIdSet = new Set(selectedNodes);
        const copiedNodes = currentWorkflow.nodes.filter(n => nodeIdSet.has(n.id));
        const copiedEdges = currentWorkflow.edges.filter(
          e => nodeIdSet.has(e.source) && nodeIdSet.has(e.target) && selectedEdges.includes(e.id)
        );

        set({ copiedNodes, copiedEdges });
      },

      pasteSelection: (position) => {
        const { currentWorkflow, copiedNodes, copiedEdges } = get();
        if (!currentWorkflow || copiedNodes.length === 0) return;

        const idMap = new Map<string, string>();
        const offset = position || { x: 50, y: 50 };

        const newNodes = copiedNodes.map(node => {
          const newId = `${node.type}-${nanoid(8)}`;
          idMap.set(node.id, newId);
          return {
            ...node,
            id: newId,
            position: {
              x: node.position.x + offset.x,
              y: node.position.y + offset.y,
            },
            data: { ...node.data },
          };
        });

        const newEdges = copiedEdges.map(edge => ({
          ...edge,
          id: `edge-${nanoid(8)}`,
          source: idMap.get(edge.source) || edge.source,
          target: idMap.get(edge.target) || edge.target,
          data: { ...edge.data },
        }));

        const updated = {
          ...currentWorkflow,
          nodes: [...currentWorkflow.nodes, ...newNodes],
          edges: [...currentWorkflow.edges, ...newEdges],
          updatedAt: new Date(),
        };

        set({
          currentWorkflow: updated,
          isDirty: true,
          selectedNodes: newNodes.map(n => n.id),
          selectedEdges: newEdges.map(e => e.id),
        });
        get().pushHistory();
      },

      cutSelection: () => {
        const { selectedNodes, selectedEdges } = get();
        get().copySelection();
        get().deleteNodes(selectedNodes);
        get().deleteEdges(selectedEdges);
      },

      // History
      undo: () => {
        const { history, historyIndex } = get();
        if (historyIndex <= 0) return;

        const newIndex = historyIndex - 1;
        set({
          currentWorkflow: history[newIndex],
          historyIndex: newIndex,
          isDirty: true,
        });
      },

      redo: () => {
        const { history, historyIndex } = get();
        if (historyIndex >= history.length - 1) return;

        const newIndex = historyIndex + 1;
        set({
          currentWorkflow: history[newIndex],
          historyIndex: newIndex,
          isDirty: true,
        });
      },

      pushHistory: () => {
        const { currentWorkflow, history, historyIndex, maxHistorySize } = get();
        if (!currentWorkflow) return;

        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push({ ...currentWorkflow });

        if (newHistory.length > maxHistorySize) {
          newHistory.shift();
        }

        set({
          history: newHistory,
          historyIndex: newHistory.length - 1,
        });
      },

      clearHistory: () => {
        const { currentWorkflow } = get();
        set({
          history: currentWorkflow ? [currentWorkflow] : [],
          historyIndex: currentWorkflow ? 0 : -1,
        });
      },

      // Viewport
      setViewport: (viewport) => {
        const { currentWorkflow } = get();
        if (!currentWorkflow) return;

        set({
          currentWorkflow: {
            ...currentWorkflow,
            viewport,
          },
        });
      },

      fitView: () => {
        // This will be handled by the React Flow component
      },

      // Layout
      autoLayout: () => {
        const { currentWorkflow } = get();
        if (!currentWorkflow) return;

        // Simple top-to-bottom layout
        const nodes = [...currentWorkflow.nodes];
        const edges = currentWorkflow.edges;

        // Build adjacency list
        const adjacency = new Map<string, string[]>();
        const inDegree = new Map<string, number>();

        nodes.forEach(n => {
          adjacency.set(n.id, []);
          inDegree.set(n.id, 0);
        });

        edges.forEach(e => {
          adjacency.get(e.source)?.push(e.target);
          inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
        });

        // Topological sort with levels
        const levels: string[][] = [];
        const queue = nodes.filter(n => inDegree.get(n.id) === 0).map(n => n.id);
        const visited = new Set<string>();

        while (queue.length > 0) {
          const levelNodes: string[] = [];
          const levelSize = queue.length;

          for (let i = 0; i < levelSize; i++) {
            const nodeId = queue.shift()!;
            if (visited.has(nodeId)) continue;
            visited.add(nodeId);
            levelNodes.push(nodeId);

            adjacency.get(nodeId)?.forEach(targetId => {
              const newDegree = (inDegree.get(targetId) || 0) - 1;
              inDegree.set(targetId, newDegree);
              if (newDegree === 0 && !visited.has(targetId)) {
                queue.push(targetId);
              }
            });
          }

          if (levelNodes.length > 0) {
            levels.push(levelNodes);
          }
        }

        // Position nodes
        const nodeWidth = 200;
        const nodeHeight = 80;
        const horizontalGap = 50;
        const verticalGap = 100;

        const updatedNodes = nodes.map(node => {
          const levelIndex = levels.findIndex(level => level.includes(node.id));
          const nodeIndex = levels[levelIndex]?.indexOf(node.id) || 0;
          const levelWidth = (levels[levelIndex]?.length || 1) * (nodeWidth + horizontalGap);
          const startX = (800 - levelWidth) / 2;

          return {
            ...node,
            position: {
              x: startX + nodeIndex * (nodeWidth + horizontalGap),
              y: levelIndex * (nodeHeight + verticalGap) + 50,
            },
          };
        });

        const updated = {
          ...currentWorkflow,
          nodes: updatedNodes,
          updatedAt: new Date(),
        };

        set({ currentWorkflow: updated, isDirty: true });
        get().pushHistory();
      },

      alignNodes: (alignment) => {
        const { currentWorkflow, selectedNodes } = get();
        if (!currentWorkflow || selectedNodes.length < 2) return;

        const selected = currentWorkflow.nodes.filter(n => selectedNodes.includes(n.id));
        if (selected.length < 2) return;

        let targetValue: number;

        switch (alignment) {
          case 'left':
            targetValue = Math.min(...selected.map(n => n.position.x));
            break;
          case 'center':
            targetValue = selected.reduce((sum, n) => sum + n.position.x, 0) / selected.length;
            break;
          case 'right':
            targetValue = Math.max(...selected.map(n => n.position.x));
            break;
          case 'top':
            targetValue = Math.min(...selected.map(n => n.position.y));
            break;
          case 'middle':
            targetValue = selected.reduce((sum, n) => sum + n.position.y, 0) / selected.length;
            break;
          case 'bottom':
            targetValue = Math.max(...selected.map(n => n.position.y));
            break;
        }

        const updatedNodes = currentWorkflow.nodes.map(node => {
          if (!selectedNodes.includes(node.id)) return node;

          const position = { ...node.position };
          if (['left', 'center', 'right'].includes(alignment)) {
            position.x = targetValue;
          } else {
            position.y = targetValue;
          }

          return { ...node, position };
        });

        const updated = {
          ...currentWorkflow,
          nodes: updatedNodes,
          updatedAt: new Date(),
        };

        set({ currentWorkflow: updated, isDirty: true });
        get().pushHistory();
      },

      distributeNodes: (direction) => {
        const { currentWorkflow, selectedNodes } = get();
        if (!currentWorkflow || selectedNodes.length < 3) return;

        const selected = currentWorkflow.nodes
          .filter(n => selectedNodes.includes(n.id))
          .sort((a, b) =>
            direction === 'horizontal'
              ? a.position.x - b.position.x
              : a.position.y - b.position.y
          );

        if (selected.length < 3) return;

        const first = selected[0];
        const last = selected[selected.length - 1];
        const totalDistance = direction === 'horizontal'
          ? last.position.x - first.position.x
          : last.position.y - first.position.y;
        const gap = totalDistance / (selected.length - 1);

        const updatedNodes = currentWorkflow.nodes.map(node => {
          const index = selected.findIndex(n => n.id === node.id);
          if (index === -1) return node;

          const position = { ...node.position };
          if (direction === 'horizontal') {
            position.x = first.position.x + index * gap;
          } else {
            position.y = first.position.y + index * gap;
          }

          return { ...node, position };
        });

        const updated = {
          ...currentWorkflow,
          nodes: updatedNodes,
          updatedAt: new Date(),
        };

        set({ currentWorkflow: updated, isDirty: true });
        get().pushHistory();
      },

      // Validation
      validate: () => {
        const { currentWorkflow } = get();
        if (!currentWorkflow) return [];

        const errors: ValidationError[] = [];

        // Check for start node
        const startNodes = currentWorkflow.nodes.filter(n => n.type === 'start');
        if (startNodes.length === 0) {
          errors.push({
            message: 'Workflow must have a start node',
            severity: 'error',
          });
        } else if (startNodes.length > 1) {
          errors.push({
            message: 'Workflow can only have one start node',
            severity: 'error',
          });
        }

        // Check for end node
        const endNodes = currentWorkflow.nodes.filter(n => n.type === 'end');
        if (endNodes.length === 0) {
          errors.push({
            message: 'Workflow must have an end node',
            severity: 'error',
          });
        }

        // Check for disconnected nodes
        const connectedNodes = new Set<string>();
        currentWorkflow.edges.forEach(e => {
          connectedNodes.add(e.source);
          connectedNodes.add(e.target);
        });

        currentWorkflow.nodes.forEach(node => {
          if (!connectedNodes.has(node.id) && node.type !== 'start' && node.type !== 'end') {
            errors.push({
              nodeId: node.id,
              message: `Node "${node.data.label}" is not connected`,
              severity: 'warning',
            });
          }
        });

        // Check for unconfigured nodes
        currentWorkflow.nodes.forEach(node => {
          if (!node.data.isConfigured && node.type !== 'start' && node.type !== 'end') {
            errors.push({
              nodeId: node.id,
              message: `Node "${node.data.label}" is not configured`,
              severity: 'warning',
            });
          }
        });

        // Check for circular dependencies
        const visited = new Set<string>();
        const recursionStack = new Set<string>();

        const hasCycle = (nodeId: string): boolean => {
          visited.add(nodeId);
          recursionStack.add(nodeId);

          const outgoingEdges = currentWorkflow.edges.filter(e => e.source === nodeId);
          for (const edge of outgoingEdges) {
            if (!visited.has(edge.target)) {
              if (hasCycle(edge.target)) return true;
            } else if (recursionStack.has(edge.target)) {
              return true;
            }
          }

          recursionStack.delete(nodeId);
          return false;
        };

        for (const node of currentWorkflow.nodes) {
          if (!visited.has(node.id)) {
            if (hasCycle(node.id)) {
              errors.push({
                message: 'Workflow contains circular dependencies',
                severity: 'error',
              });
              break;
            }
          }
        }

        set({ validationErrors: errors });
        return errors;
      },

      clearValidationErrors: () => {
        set({ validationErrors: [] });
      },

      // Execution
      startExecution: async (input) => {
        const { currentWorkflow } = get();
        if (!currentWorkflow) return;

        // Validate workflow before execution
        const validation = validateVisualWorkflow(currentWorkflow);
        if (!validation.isValid) {
          const errors = validation.errors
            .filter(e => e.severity === 'error')
            .map(e => e.message)
            .join(', ');
          console.error('Workflow validation failed:', errors);
          set({
            executionState: {
              executionId: `exec-${nanoid(8)}`,
              workflowId: currentWorkflow.id,
              status: 'failed',
              progress: 0,
              nodeStates: {},
              startedAt: new Date(),
              input,
              error: `Validation failed: ${errors}`,
              logs: [{
                timestamp: new Date(),
                level: 'error',
                message: `Workflow validation failed: ${errors}`,
              }],
            },
          });
          return;
        }

        // Initialize execution state
        const executionState: WorkflowExecutionState = {
          executionId: `exec-${nanoid(8)}`,
          workflowId: currentWorkflow.id,
          status: 'running',
          progress: 0,
          nodeStates: {},
          startedAt: new Date(),
          input,
          logs: [{
            timestamp: new Date(),
            level: 'info',
            message: 'Starting workflow execution...',
          }],
        };

        // Initialize node states
        currentWorkflow.nodes.forEach(node => {
          executionState.nodeStates[node.id] = {
            nodeId: node.id,
            status: 'pending',
            logs: [],
            retryCount: 0,
          };
        });

        set({
          isExecuting: true,
          executionState,
          showExecutionPanel: true,
        });

        // Get provider settings from store
        const settings = useSettingsStore.getState();
        const providerSettings = settings.providerSettings[settings.defaultProvider];
        if (!providerSettings) {
          const error = 'No provider configured for workflow execution';
          get().updateNodeExecutionState(currentWorkflow.nodes[0].id, {
            status: 'failed',
            error,
          });
          get().addExecutionLog({
            timestamp: new Date(),
            level: 'error',
            message: error,
          });
          set({
            isExecuting: false,
            executionState: {
              ...get().executionState!,
              status: 'failed',
              error,
              completedAt: new Date(),
            },
          });
          return;
        }

        // Execute the workflow
        try {
          const result = await executeVisualWorkflow(
            currentWorkflow,
            input,
            {
              provider: settings.defaultProvider as ProviderName,
              model: providerSettings.defaultModel || 'gpt-4o',
              apiKey: providerSettings.apiKey || '',
              baseURL: providerSettings.baseURL,
              temperature: 0.7,
              maxRetries: currentWorkflow.settings.maxRetries || 3,
              stepTimeout: currentWorkflow.settings.maxExecutionTime || 300000,
            },
            {
              onProgress: (execution, progress) => {
                const currentState = get().executionState;
                if (currentState) {
                  set({
                    executionState: {
                      ...currentState,
                      progress: Math.round(progress * 100),
                      currentNodeId: execution.steps.find(s => s.status === 'running')?.stepId,
                    },
                  });
                }
              },
              onStepStart: (execution, stepId) => {
                get().updateNodeExecutionState(stepId, {
                  status: 'running',
                  startedAt: new Date(),
                });
                get().addExecutionLog({
                  timestamp: new Date(),
                  level: 'info',
                  message: `Executing step: ${stepId}`,
                });
              },
              onStepComplete: (execution, stepId, output) => {
                get().updateNodeExecutionState(stepId, {
                  status: 'completed',
                  completedAt: new Date(),
                  output: output as Record<string, unknown>,
                });
                get().addExecutionLog({
                  timestamp: new Date(),
                  level: 'info',
                  message: `Step completed: ${stepId}`,
                });
              },
              onStepError: (execution, stepId, error) => {
                get().updateNodeExecutionState(stepId, {
                  status: 'failed',
                  error,
                  completedAt: new Date(),
                });
                get().addExecutionLog({
                  timestamp: new Date(),
                  level: 'error',
                  message: `Step failed: ${stepId} - ${error}`,
                });
              },
              onComplete: (execution) => {
                const currentState = get().executionState;
                set({
                  isExecuting: false,
                  executionState: {
                    ...currentState!,
                    status: 'completed',
                    progress: 100,
                    output: execution.output as Record<string, unknown>,
                    completedAt: new Date(),
                    logs: [
                      ...currentState!.logs,
                      {
                        timestamp: new Date(),
                        level: 'info',
                        message: 'Workflow execution completed successfully',
                      },
                    ],
                  },
                });
              },
              onError: (execution, error) => {
                const currentState = get().executionState;
                set({
                  isExecuting: false,
                  executionState: {
                    ...currentState!,
                    status: 'failed',
                    error,
                    completedAt: new Date(),
                    logs: [
                      ...currentState!.logs,
                      {
                        timestamp: new Date(),
                        level: 'error',
                        message: `Workflow execution failed: ${error}`,
                      },
                    ],
                  },
                });
              },
            }
          );

          // Update final state
          if (result.success) {
            const currentState = get().executionState;
            set({
              isExecuting: false,
              executionState: {
                ...currentState!,
                status: 'completed',
                progress: 100,
                output: result.output as Record<string, unknown>,
                completedAt: new Date(),
              },
            });
          } else {
            throw new Error(result.error || 'Workflow execution failed');
          }
        } catch (error) {
          const currentState = get().executionState;
          set({
            isExecuting: false,
            executionState: {
              ...currentState!,
              status: 'failed',
              error: error instanceof Error ? error.message : String(error),
              completedAt: new Date(),
            },
          });
        }
      },

      pauseExecution: () => {
        const { executionState } = get();
        if (!executionState || executionState.status !== 'running') return;

        // Call the actual pause function
        pauseVisualWorkflow(executionState.executionId);

        set({
          executionState: {
            ...executionState,
            status: 'paused',
          },
        });
      },

      resumeExecution: () => {
        const { executionState } = get();
        if (!executionState || executionState.status !== 'paused') return;

        // Call the actual resume function
        resumeVisualWorkflow(executionState.executionId);

        set({
          executionState: {
            ...executionState,
            status: 'running',
          },
        });
      },

      cancelExecution: () => {
        const { executionState } = get();
        if (!executionState) return;

        // Call the actual cancel function
        cancelVisualWorkflow(executionState.executionId);

        set({
          isExecuting: false,
          executionState: {
            ...executionState,
            status: 'cancelled',
            completedAt: new Date(),
          },
        });
      },

      updateNodeExecutionState: (nodeId, state) => {
        const { executionState } = get();
        if (!executionState) return;

        const nodeState = executionState.nodeStates[nodeId] || {
          nodeId,
          status: 'pending',
          logs: [],
          retryCount: 0,
        };

        set({
          executionState: {
            ...executionState,
            nodeStates: {
              ...executionState.nodeStates,
              [nodeId]: { ...nodeState, ...state },
            },
            currentNodeId: state.status === 'running' ? nodeId : executionState.currentNodeId,
          },
        });
      },

      addExecutionLog: (log) => {
        const { executionState } = get();
        if (!executionState) return;

        set({
          executionState: {
            ...executionState,
            logs: [...executionState.logs, log],
          },
        });
      },

      clearExecutionState: () => {
        const { executionState, currentWorkflow, recordExecution } = get();
        
        // Record execution statistics before clearing
        if (executionState && currentWorkflow && 
            (executionState.status === 'completed' || 
             executionState.status === 'failed' || 
             executionState.status === 'cancelled')) {
          const nodeStates = Object.values(executionState.nodeStates);
          const startTime = executionState.startedAt ? new Date(executionState.startedAt).getTime() : Date.now();
          const endTime = executionState.completedAt ? new Date(executionState.completedAt).getTime() : Date.now();
          
          recordExecution({
            workflowId: currentWorkflow.id,
            status: executionState.status as 'completed' | 'failed' | 'cancelled',
            startedAt: new Date(startTime),
            completedAt: new Date(endTime),
            duration: endTime - startTime,
            nodesExecuted: nodeStates.filter(s => s.status === 'completed').length,
            nodesFailed: nodeStates.filter(s => s.status === 'failed').length,
            nodesSkipped: nodeStates.filter(s => s.status === 'skipped').length,
            errorMessage: executionState.error,
          });
        }
        
        set({
          isExecuting: false,
          executionState: null,
        });
      },

      // UI state
      toggleNodePalette: () => {
        set(state => ({ showNodePalette: !state.showNodePalette }));
      },

      toggleConfigPanel: () => {
        set(state => ({ showConfigPanel: !state.showConfigPanel }));
      },

      toggleExecutionPanel: () => {
        set(state => ({ showExecutionPanel: !state.showExecutionPanel }));
      },

      toggleMinimap: () => {
        set(state => ({ showMinimap: !state.showMinimap }));
      },

      setActiveConfigTab: (tab) => {
        set({ activeConfigTab: tab });
      },

      setSearchQuery: (query) => {
        set({ searchQuery: query });
      },

      // Node templates
      saveNodeAsTemplate: (nodeId, name, options) => {
        const { currentWorkflow, nodeTemplates } = get();
        if (!currentWorkflow) return null;

        const node = currentWorkflow.nodes.find((n) => n.id === nodeId);
        if (!node) return null;

        const template = createNodeTemplate(name, node.type as WorkflowNodeType, node.data, {
          description: options?.description,
          category: options?.category,
          tags: options?.tags,
        });

        set({ nodeTemplates: [...nodeTemplates, template] });
        return template;
      },

      addNodeFromTemplate: (templateId, position) => {
        const { currentWorkflow, nodeTemplates } = get();
        if (!currentWorkflow) return null;

        const template = nodeTemplates.find((t) => t.id === templateId);
        if (!template) return null;

        const nodeId = `node-${nanoid()}`;
        const newNode: WorkflowNode = {
          id: nodeId,
          type: template.nodeType,
          position,
          data: {
            ...template.data,
            label: template.name,
          },
        };

        get().pushHistory();
        set({
          currentWorkflow: {
            ...currentWorkflow,
            nodes: [...currentWorkflow.nodes, newNode],
            updatedAt: new Date(),
          },
          isDirty: true,
        });

        return nodeId;
      },

      deleteNodeTemplate: (templateId) => {
        const { nodeTemplates } = get();
        set({
          nodeTemplates: nodeTemplates.filter((t) => t.id !== templateId),
        });
      },

      updateNodeTemplate: (templateId, updates) => {
        const { nodeTemplates } = get();
        set({
          nodeTemplates: nodeTemplates.map((t) =>
            t.id === templateId
              ? { ...t, ...updates, updatedAt: new Date() }
              : t
          ),
        });
      },

      // Version control
      saveVersion: (name, description) => {
        const { currentWorkflow, workflowVersions, currentVersionNumber } = get();
        if (!currentWorkflow) return null;

        const newVersionNumber = currentVersionNumber + 1;
        const version = createWorkflowVersion(currentWorkflow, newVersionNumber, {
          name: name || `Version ${newVersionNumber}`,
          description,
        });

        const workflowId = currentWorkflow.id;
        const existingVersions = workflowVersions[workflowId] || [];

        set({
          workflowVersions: {
            ...workflowVersions,
            [workflowId]: [...existingVersions, version],
          },
          currentVersionNumber: newVersionNumber,
        });

        return version;
      },

      getVersions: () => {
        const { currentWorkflow, workflowVersions } = get();
        if (!currentWorkflow) return [];
        return workflowVersions[currentWorkflow.id] || [];
      },

      restoreVersion: (versionId) => {
        const { currentWorkflow, workflowVersions } = get();
        if (!currentWorkflow) return;

        const versions = workflowVersions[currentWorkflow.id] || [];
        const version = versions.find((v) => v.id === versionId);
        if (!version) return;

        get().pushHistory();
        set({
          currentWorkflow: {
            ...version.snapshot,
            id: currentWorkflow.id,
            updatedAt: new Date(),
          },
          isDirty: true,
        });
      },

      deleteVersion: (versionId) => {
        const { currentWorkflow, workflowVersions } = get();
        if (!currentWorkflow) return;

        const workflowId = currentWorkflow.id;
        const versions = workflowVersions[workflowId] || [];

        set({
          workflowVersions: {
            ...workflowVersions,
            [workflowId]: versions.filter((v) => v.id !== versionId),
          },
        });
      },

      // Import/Export
      exportWorkflow: (options) => {
        const { currentWorkflow, nodeTemplates } = get();
        if (!currentWorkflow) return null;

        return createWorkflowExport(currentWorkflow, {
          includeTemplates: options?.includeTemplates ? nodeTemplates : undefined,
        });
      },

      importWorkflow: (data) => {
        const workflow = data.workflow;
        workflow.id = `workflow-${nanoid()}`;
        workflow.createdAt = new Date();
        workflow.updatedAt = new Date();

        set({
          currentWorkflow: workflow,
          isDirty: false,
          selectedNodes: [],
          selectedEdges: [],
        });

        if (data.templates && data.templates.length > 0) {
          const { nodeTemplates } = get();
          set({
            nodeTemplates: [...nodeTemplates, ...data.templates],
          });
        }
      },

      exportToFile: () => {
        const exportData = get().exportWorkflow({ includeTemplates: true });
        if (!exportData) return;

        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
          type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${exportData.workflow.name || 'workflow'}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      },

      importFromFile: async (file) => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            try {
              const data = JSON.parse(e.target?.result as string) as WorkflowExport;
              get().importWorkflow(data);
              resolve();
            } catch (error) {
              reject(error);
            }
          };
          reader.onerror = () => reject(reader.error);
          reader.readAsText(file);
        });
      },

      // Execution statistics
      recordExecution: (record) => {
        const { executionRecords } = get();
        const newRecord: ExecutionRecord = {
          ...record,
          id: `exec-${nanoid()}`,
        };
        set({
          executionRecords: [newRecord, ...executionRecords].slice(0, 500),
        });
      },

      getWorkflowStatistics: (workflowId) => {
        const { currentWorkflow, executionRecords } = get();
        const targetId = workflowId || currentWorkflow?.id;
        if (!targetId) return null;
        return calculateWorkflowStatistics(targetId, executionRecords);
      },

      clearExecutionRecords: (workflowId) => {
        const { executionRecords } = get();
        if (workflowId) {
          set({
            executionRecords: executionRecords.filter((r) => r.workflowId !== workflowId),
          });
        } else {
          set({ executionRecords: [] });
        }
      },

      // Reset
      reset: () => {
        set(initialState);
      },
    }),
    {
      name: 'cognia-workflow-editor',
      partialize: (state) => ({
        savedWorkflows: state.savedWorkflows,
        nodeTemplates: state.nodeTemplates,
        workflowVersions: state.workflowVersions,
        executionRecords: state.executionRecords,
        showNodePalette: state.showNodePalette,
        showConfigPanel: state.showConfigPanel,
        showMinimap: state.showMinimap,
      }),
    }
  )
);

export default useWorkflowEditorStore;
