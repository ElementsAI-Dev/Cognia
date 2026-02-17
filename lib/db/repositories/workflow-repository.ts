/**
 * Workflow Repository - data access layer for workflows
 */

import { db, type DBWorkflow, type DBWorkflowExecution } from '../schema';
import { createWorkflowExport } from '@/types/workflow/workflow-editor';
import type { VisualWorkflow, WorkflowNode, WorkflowEdge, WorkflowSettings, WorkflowExport, WorkflowExecutionHistoryRecord, EditorExecutionStatus } from '@/types/workflow/workflow-editor';
import type { Viewport } from '@xyflow/react';
import { nanoid } from 'nanoid';
import { migrateWorkflowSchema } from '@/lib/workflow-editor/migration';

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

function isWorkflowExport(data: unknown): data is WorkflowExport {
  if (!data || typeof data !== 'object') return false;
  if (!('workflow' in data)) return false;
  const workflow = (data as { workflow?: unknown }).workflow;
  return Boolean(workflow && typeof workflow === 'object');
}

interface HydratedWorkflowResult {
  workflow: VisualWorkflow;
  needsWriteBack: boolean;
  raw: DBWorkflow;
}

function hydrateWorkflow(dbWorkflow: DBWorkflow): HydratedWorkflowResult {
  const legacyWorkflow: VisualWorkflow = {
    id: dbWorkflow.id,
    schemaVersion: '1.0',
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

  const migrated = migrateWorkflowSchema(legacyWorkflow);
  const migratedWorkflow = migrated.workflow;

  const needsWriteBack =
    migrated.warnings.length > 0 ||
    JSON.stringify(legacyWorkflow.nodes) !== JSON.stringify(migratedWorkflow.nodes) ||
    JSON.stringify(legacyWorkflow.settings) !== JSON.stringify(migratedWorkflow.settings) ||
    JSON.stringify(legacyWorkflow.viewport) !== JSON.stringify(migratedWorkflow.viewport);

  return {
    workflow: migratedWorkflow,
    needsWriteBack,
    raw: dbWorkflow,
  };
}

// Convert DBWorkflow to VisualWorkflow
function toVisualWorkflow(dbWorkflow: DBWorkflow): VisualWorkflow {
  return hydrateWorkflow(dbWorkflow).workflow;
}

async function persistMigratedWorkflow(result: HydratedWorkflowResult): Promise<void> {
  if (!result.needsWriteBack) return;

  await db.workflows.put({
    ...result.raw,
    nodes: JSON.stringify(result.workflow.nodes),
    edges: JSON.stringify(result.workflow.edges),
    settings: result.workflow.settings ? JSON.stringify(result.workflow.settings) : undefined,
    viewport: result.workflow.viewport ? JSON.stringify(result.workflow.viewport) : undefined,
  });
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

// Convert DBWorkflowExecution to WorkflowExecutionHistoryRecord
function toWorkflowExecution(dbExecution: DBWorkflowExecution): WorkflowExecutionHistoryRecord {
  return {
    id: dbExecution.id,
    workflowId: dbExecution.workflowId,
    status: dbExecution.status as EditorExecutionStatus,
    input: dbExecution.input ? JSON.parse(dbExecution.input) : undefined,
    output: dbExecution.output ? JSON.parse(dbExecution.output) : undefined,
    nodeStates: dbExecution.nodeStates ? JSON.parse(dbExecution.nodeStates) : undefined,
    logs: dbExecution.logs ? JSON.parse(dbExecution.logs) : undefined,
    error: dbExecution.error,
    startedAt: dbExecution.startedAt,
    completedAt: dbExecution.completedAt,
  };
}

// Convert WorkflowExecutionHistoryRecord to DBWorkflowExecution
function toDBWorkflowExecution(execution: WorkflowExecutionHistoryRecord): DBWorkflowExecution {
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

export interface CreateWorkflowExecutionInput {
  executionId?: string;
  status?: WorkflowExecutionHistoryRecord['status'];
  startedAt?: Date;
  completedAt?: Date;
  output?: Record<string, unknown>;
  nodeStates?: Record<string, import('@/types/workflow/workflow-editor').NodeExecutionState>;
  logs?: import('@/types/workflow/workflow-editor').ExecutionLog[];
  error?: string;
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

    const hydrated = workflows.map((workflow) => hydrateWorkflow(workflow));
    await Promise.all(hydrated.map((result) => persistMigratedWorkflow(result)));
    return hydrated.map((result) => result.workflow);
  },

  /**
   * Get all workflow templates
   */
  async getTemplates(): Promise<VisualWorkflow[]> {
    const templates = await db.workflows
      .filter(w => w.isTemplate === true)
      .reverse()
      .sortBy('updatedAt');

    const hydrated = templates.map((workflow) => hydrateWorkflow(workflow));
    await Promise.all(hydrated.map((result) => persistMigratedWorkflow(result)));
    return hydrated.map((result) => result.workflow);
  },

  /**
   * Get workflows by category
   */
  async getByCategory(category: string): Promise<VisualWorkflow[]> {
    const workflows = await db.workflows
      .filter(w => w.category === category && !w.isTemplate)
      .reverse()
      .sortBy('updatedAt');

    const hydrated = workflows.map((workflow) => hydrateWorkflow(workflow));
    await Promise.all(hydrated.map((result) => persistMigratedWorkflow(result)));
    return hydrated.map((result) => result.workflow);
  },

  /**
   * Get a single workflow by ID
   */
  async getById(id: string): Promise<VisualWorkflow | undefined> {
    const workflow = await db.workflows.get(id);
    if (!workflow) return undefined;

    const hydrated = hydrateWorkflow(workflow);
    await persistMigratedWorkflow(hydrated);
    return hydrated.workflow;
  },

  /**
   * Create a new workflow
   */
  async create(input: CreateWorkflowInput): Promise<VisualWorkflow> {
    const now = new Date();
    const workflow: VisualWorkflow = {
      id: `workflow-${nanoid()}`,
      schemaVersion: '2.0',
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
   * Save (upsert) a workflow using its existing ID
   */
  async save(workflow: VisualWorkflow, options?: { isTemplate?: boolean }): Promise<VisualWorkflow> {
    const existing = await db.workflows.get(workflow.id);
    const isTemplate = options?.isTemplate ?? workflow.isTemplate ?? false;
    const now = new Date();

    if (existing) {
      const updated = await workflowRepository.update(workflow.id, {
        name: workflow.name,
        description: workflow.description,
        category: workflow.category,
        icon: workflow.icon,
        tags: workflow.tags,
        nodes: workflow.nodes,
        edges: workflow.edges,
        settings: workflow.settings,
        viewport: workflow.viewport,
      });

      return updated ?? { ...workflow, updatedAt: now };
    }

    const toInsert: VisualWorkflow = {
      ...workflow,
      updatedAt: now,
      isTemplate,
    };

    await db.workflows.add(toDBWorkflow(toInsert, isTemplate));
    return toInsert;
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

    const hydrated = workflows.map((workflow) => hydrateWorkflow(workflow));
    await Promise.all(hydrated.map((result) => persistMigratedWorkflow(result)));
    return hydrated.map((result) => result.workflow);
  },

  /**
   * Import a workflow from JSON
   */
  async import(workflowJson: string, asTemplate = false): Promise<VisualWorkflow> {
    const parsed = JSON.parse(workflowJson) as unknown;
    const imported = isWorkflowExport(parsed)
      ? (parsed as WorkflowExport).workflow
      : (parsed as VisualWorkflow);
    const now = new Date();

    const workflow: VisualWorkflow = {
      ...imported,
      id: `workflow-${nanoid()}`,
      schemaVersion: imported.schemaVersion || '2.0',
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

    const visual = toVisualWorkflow(workflow);
    return JSON.stringify(createWorkflowExport(visual), null, 2);
  },

  // Execution methods

  /**
   * Create a new workflow execution record
   */
  async createExecution(
    workflowId: string,
    input: Record<string, unknown> = {},
    options: CreateWorkflowExecutionInput = {}
  ): Promise<WorkflowExecutionHistoryRecord> {
    const now = options.startedAt || new Date();
    const execution: WorkflowExecutionHistoryRecord = {
      id: options.executionId || `exec-${nanoid()}`,
      workflowId,
      status: options.status || 'pending',
      input,
      output: options.output,
      nodeStates: options.nodeStates,
      logs: options.logs,
      error: options.error,
      startedAt: now,
      completedAt: options.completedAt,
    };

    await db.workflowExecutions.add(toDBWorkflowExecution(execution));
    return execution;
  },

  /**
   * Update a workflow execution
   */
  async updateExecution(
    id: string,
    updates: Partial<Omit<WorkflowExecutionHistoryRecord, 'id' | 'workflowId' | 'startedAt'>>
  ): Promise<WorkflowExecutionHistoryRecord | undefined> {
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
  async getExecutions(workflowId: string, limit = 50): Promise<WorkflowExecutionHistoryRecord[]> {
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
  async getExecution(id: string): Promise<WorkflowExecutionHistoryRecord | undefined> {
    const execution = await db.workflowExecutions.get(id);
    return execution ? toWorkflowExecution(execution) : undefined;
  },

  /**
   * Delete a single execution by ID
   */
  async deleteExecution(id: string): Promise<boolean> {
    const existing = await db.workflowExecutions.get(id);
    if (!existing) return false;
    await db.workflowExecutions.delete(id);
    return true;
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
