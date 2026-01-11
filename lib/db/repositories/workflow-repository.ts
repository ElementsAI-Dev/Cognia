/**
 * Workflow Repository - data access layer for workflows
 */

import { db, type DBWorkflow, type DBWorkflowExecution } from '../schema';
import type { VisualWorkflow, WorkflowNode, WorkflowEdge, WorkflowSettings, WorkflowExecutionState, ExecutionLog } from '@/types/workflow/workflow-editor';
import type { Viewport } from '@xyflow/react';
import { nanoid } from 'nanoid';

// Default workflow settings
const DEFAULT_WORKFLOW_SETTINGS: WorkflowSettings = {
  autoSave: true,
  autoLayout: false,
  showMinimap: true,
  showGrid: true,
  snapToGrid: true,
  gridSize: 20,
  retryOnFailure: false,
  maxRetries: 3,
  logLevel: 'info',
};

// Default viewport
const DEFAULT_VIEWPORT: Viewport = { x: 0, y: 0, zoom: 1 };

// Convert DBWorkflow to VisualWorkflow
function toVisualWorkflow(dbWorkflow: DBWorkflow): VisualWorkflow {
  return {
    id: dbWorkflow.id,
    name: dbWorkflow.name,
    description: dbWorkflow.description || '',
    type: 'custom',
    category: dbWorkflow.category || 'custom',
    icon: dbWorkflow.icon || '🔄',
    tags: dbWorkflow.tags ? JSON.parse(dbWorkflow.tags) : [],
    nodes: JSON.parse(dbWorkflow.nodes) as WorkflowNode[],
    edges: JSON.parse(dbWorkflow.edges) as WorkflowEdge[],
    settings: dbWorkflow.settings ? JSON.parse(dbWorkflow.settings) : DEFAULT_WORKFLOW_SETTINGS,
    viewport: dbWorkflow.viewport ? JSON.parse(dbWorkflow.viewport) : DEFAULT_VIEWPORT,
    version: String(dbWorkflow.version),
    inputs: {},
    outputs: {},
    variables: {},
    createdAt: dbWorkflow.createdAt,
    updatedAt: dbWorkflow.updatedAt,
    isTemplate: dbWorkflow.isTemplate,
  };
}

// Convert VisualWorkflow to DBWorkflow
function toDBWorkflow(workflow: VisualWorkflow, isTemplate = false): DBWorkflow {
  return {
    id: workflow.id,
    name: workflow.name,
    description: workflow.description,
    category: workflow.category,
    icon: workflow.icon,
    tags: workflow.tags ? JSON.stringify(workflow.tags) : undefined,
    nodes: JSON.stringify(workflow.nodes),
    edges: JSON.stringify(workflow.edges),
    settings: workflow.settings ? JSON.stringify(workflow.settings) : undefined,
    viewport: workflow.viewport ? JSON.stringify(workflow.viewport) : undefined,
    version: parseInt(workflow.version, 10) || 1,
    isTemplate,
    createdAt: workflow.createdAt,
    updatedAt: workflow.updatedAt,
  };
}

// Workflow execution state interface for DB
interface WorkflowWorkflowExecutionRecord {
  id: string;
  workflowId: string;
  status: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  nodeStates?: WorkflowExecutionState['nodeStates'];
  logs?: ExecutionLog[];
  error?: string;
  startedAt: Date;
  completedAt?: Date;
}

// Convert DBWorkflowExecution to WorkflowWorkflowExecutionRecord
function toWorkflowExecution(dbExecution: DBWorkflowExecution): WorkflowWorkflowExecutionRecord {
  return {
    id: dbExecution.id,
    workflowId: dbExecution.workflowId,
    status: dbExecution.status,
    input: dbExecution.input ? JSON.parse(dbExecution.input) : undefined,
    output: dbExecution.output ? JSON.parse(dbExecution.output) : undefined,
    nodeStates: dbExecution.nodeStates ? JSON.parse(dbExecution.nodeStates) : undefined,
    logs: dbExecution.logs ? JSON.parse(dbExecution.logs) : undefined,
    error: dbExecution.error,
    startedAt: dbExecution.startedAt,
    completedAt: dbExecution.completedAt,
  };
}

// Convert WorkflowWorkflowExecutionRecord to DBWorkflowExecution
function toDBWorkflowExecution(execution: WorkflowWorkflowExecutionRecord): DBWorkflowExecution {
  return {
    id: execution.id,
    workflowId: execution.workflowId,
    status: execution.status,
    input: execution.input ? JSON.stringify(execution.input) : undefined,
    output: execution.output ? JSON.stringify(execution.output) : undefined,
    nodeStates: execution.nodeStates ? JSON.stringify(execution.nodeStates) : undefined,
    logs: execution.logs ? JSON.stringify(execution.logs) : undefined,
    error: execution.error,
    startedAt: execution.startedAt,
    completedAt: execution.completedAt,
  };
}

export interface CreateWorkflowInput {
  name: string;
  description?: string;
  category?: string;
  icon?: string;
  tags?: string[];
  nodes?: WorkflowNode[];
  edges?: WorkflowEdge[];
  settings?: WorkflowSettings;
  viewport?: Viewport;
  isTemplate?: boolean;
}

export interface UpdateWorkflowInput {
  name?: string;
  description?: string;
  category?: string;
  icon?: string;
  tags?: string[];
  nodes?: WorkflowNode[];
  edges?: WorkflowEdge[];
  settings?: WorkflowSettings;
  viewport?: Viewport;
}

export const workflowRepository = {
  /**
   * Get all workflows, sorted by updatedAt descending
   */
  async getAll(): Promise<VisualWorkflow[]> {
    const workflows = await db.workflows
      .filter(w => !w.isTemplate)
      .reverse()
      .sortBy('updatedAt');

    return workflows.map(toVisualWorkflow);
  },

  /**
   * Get all workflow templates
   */
  async getTemplates(): Promise<VisualWorkflow[]> {
    const templates = await db.workflows
      .filter(w => w.isTemplate === true)
      .reverse()
      .sortBy('updatedAt');

    return templates.map(toVisualWorkflow);
  },

  /**
   * Get workflows by category
   */
  async getByCategory(category: string): Promise<VisualWorkflow[]> {
    const workflows = await db.workflows
      .filter(w => w.category === category && !w.isTemplate)
      .reverse()
      .sortBy('updatedAt');

    return workflows.map(toVisualWorkflow);
  },

  /**
   * Get a single workflow by ID
   */
  async getById(id: string): Promise<VisualWorkflow | undefined> {
    const workflow = await db.workflows.get(id);
    return workflow ? toVisualWorkflow(workflow) : undefined;
  },

  /**
   * Create a new workflow
   */
  async create(input: CreateWorkflowInput): Promise<VisualWorkflow> {
    const now = new Date();
    const workflow: VisualWorkflow = {
      id: `workflow-${nanoid()}`,
      name: input.name,
      description: input.description || '',
      type: 'custom',
      category: input.category || 'custom',
      icon: input.icon || '🔄',
      tags: input.tags || [],
      nodes: input.nodes || [],
      edges: input.edges || [],
      settings: input.settings || DEFAULT_WORKFLOW_SETTINGS,
      viewport: input.viewport || DEFAULT_VIEWPORT,
      version: '1',
      inputs: {},
      outputs: {},
      variables: {},
      createdAt: now,
      updatedAt: now,
    };

    await db.workflows.add(toDBWorkflow(workflow, input.isTemplate));
    return workflow;
  },

  /**
   * Update an existing workflow
   */
  async update(id: string, input: UpdateWorkflowInput): Promise<VisualWorkflow | undefined> {
    const existing = await db.workflows.get(id);
    if (!existing) return undefined;

    const now = new Date();
    const updated: DBWorkflow = {
      ...existing,
      name: input.name ?? existing.name,
      description: input.description ?? existing.description,
      category: input.category ?? existing.category,
      icon: input.icon ?? existing.icon,
      tags: input.tags ? JSON.stringify(input.tags) : existing.tags,
      nodes: input.nodes ? JSON.stringify(input.nodes) : existing.nodes,
      edges: input.edges ? JSON.stringify(input.edges) : existing.edges,
      settings: input.settings ? JSON.stringify(input.settings) : existing.settings,
      viewport: input.viewport ? JSON.stringify(input.viewport) : existing.viewport,
      version: existing.version + 1,
      updatedAt: now,
    };

    await db.workflows.put(updated);
    return toVisualWorkflow(updated);
  },

  /**
   * Delete a workflow
   */
  async delete(id: string): Promise<boolean> {
    const existing = await db.workflows.get(id);
    if (!existing) return false;

    await db.workflows.delete(id);
    // Also delete related executions
    await db.workflowExecutions.where('workflowId').equals(id).delete();
    return true;
  },

  /**
   * Duplicate a workflow
   */
  async duplicate(id: string): Promise<VisualWorkflow | undefined> {
    const existing = await db.workflows.get(id);
    if (!existing) return undefined;

    const now = new Date();
    const duplicated: VisualWorkflow = {
      ...toVisualWorkflow(existing),
      id: `workflow-${nanoid()}`,
      name: `${existing.name} (Copy)`,
      version: '1',
      createdAt: now,
      updatedAt: now,
    };

    await db.workflows.add(toDBWorkflow(duplicated, existing.isTemplate));
    return duplicated;
  },

  /**
   * Search workflows by name or description
   */
  async search(query: string): Promise<VisualWorkflow[]> {
    const lowerQuery = query.toLowerCase();
    const workflows = await db.workflows
      .filter(w => 
        !w.isTemplate && (
          w.name.toLowerCase().includes(lowerQuery) ||
          (w.description?.toLowerCase().includes(lowerQuery) ?? false)
        )
      )
      .toArray();

    return workflows.map(toVisualWorkflow);
  },

  /**
   * Import a workflow from JSON
   */
  async import(workflowJson: string, asTemplate = false): Promise<VisualWorkflow> {
    const imported = JSON.parse(workflowJson) as VisualWorkflow;
    const now = new Date();

    const workflow: VisualWorkflow = {
      ...imported,
      id: `workflow-${nanoid()}`,
      version: '1',
      createdAt: now,
      updatedAt: now,
    };

    await db.workflows.add(toDBWorkflow(workflow, asTemplate));
    return workflow;
  },

  /**
   * Export a workflow to JSON
   */
  async export(id: string): Promise<string | undefined> {
    const workflow = await db.workflows.get(id);
    if (!workflow) return undefined;

    return JSON.stringify(toVisualWorkflow(workflow), null, 2);
  },

  // Execution methods

  /**
   * Create a new workflow execution record
   */
  async createExecution(
    workflowId: string,
    input: Record<string, unknown> = {}
  ): Promise<WorkflowWorkflowExecutionRecord> {
    const now = new Date();
    const execution: WorkflowWorkflowExecutionRecord = {
      id: `exec-${nanoid()}`,
      workflowId,
      status: 'pending',
      input,
      startedAt: now,
    };

    await db.workflowExecutions.add(toDBWorkflowExecution(execution));
    return execution;
  },

  /**
   * Update a workflow execution
   */
  async updateExecution(
    id: string,
    updates: Partial<Omit<WorkflowWorkflowExecutionRecord, 'id' | 'workflowId' | 'startedAt'>>
  ): Promise<WorkflowWorkflowExecutionRecord | undefined> {
    const existing = await db.workflowExecutions.get(id);
    if (!existing) return undefined;

    const updated: DBWorkflowExecution = {
      ...existing,
      status: updates.status ?? existing.status,
      output: updates.output ? JSON.stringify(updates.output) : existing.output,
      nodeStates: updates.nodeStates ? JSON.stringify(updates.nodeStates) : existing.nodeStates,
      logs: updates.logs ? JSON.stringify(updates.logs) : existing.logs,
      error: updates.error ?? existing.error,
      completedAt: updates.completedAt ?? existing.completedAt,
    };

    await db.workflowExecutions.put(updated);
    return toWorkflowExecution(updated);
  },

  /**
   * Get execution history for a workflow
   */
  async getExecutions(workflowId: string, limit = 50): Promise<WorkflowWorkflowExecutionRecord[]> {
    const executions = await db.workflowExecutions
      .where('workflowId')
      .equals(workflowId)
      .reverse()
      .sortBy('startedAt');

    return executions.slice(0, limit).map(toWorkflowExecution);
  },

  /**
   * Get a single execution by ID
   */
  async getExecution(id: string): Promise<WorkflowWorkflowExecutionRecord | undefined> {
    const execution = await db.workflowExecutions.get(id);
    return execution ? toWorkflowExecution(execution) : undefined;
  },

  /**
   * Delete old executions (keep last N)
   */
  async cleanupExecutions(workflowId: string, keepCount = 100): Promise<number> {
    const executions = await db.workflowExecutions
      .where('workflowId')
      .equals(workflowId)
      .reverse()
      .sortBy('startedAt');

    if (executions.length <= keepCount) return 0;

    const toDelete = executions.slice(keepCount);
    await db.workflowExecutions.bulkDelete(toDelete.map(e => e.id));
    return toDelete.length;
  },
};

export default workflowRepository;
