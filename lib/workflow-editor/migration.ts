/**
 * Workflow schema migration utilities.
 * Keeps persisted workflows backward-compatible while moving to schema v2.
 */

import {
  createDefaultNodeData,
  DEFAULT_WORKFLOW_SETTINGS,
  type NodeErrorConfig,
  type TriggerConfig,
  type TriggerType,
  type VisualWorkflow,
  type WorkflowNode,
  type WorkflowNodeType,
} from '@/types/workflow/workflow-editor';

export const CURRENT_WORKFLOW_SCHEMA_VERSION = '2.0';

const LEGACY_NODE_TYPE_MAP: Record<string, WorkflowNodeType> = {
  knowledge_retrieval: 'knowledgeRetrieval',
  parameter_extractor: 'parameterExtractor',
  variable_aggregator: 'variableAggregator',
  question_classifier: 'questionClassifier',
  template_transform: 'templateTransform',
};

export interface WorkflowSchemaMigrationResult {
  workflow: VisualWorkflow;
  migrated: boolean;
  fromVersion: string;
  toVersion: string;
  warnings: string[];
}

function toDate(value: unknown): Date {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  return new Date();
}

function normalizeTriggerConfig(type: TriggerType, config: TriggerConfig): TriggerConfig {
  const defaultBackend = type === 'schedule' || type === 'event' ? 'app' : 'none';
  const inferredSyncStatus = config.bindingTaskId ? 'synced' : 'idle';

  const normalized: TriggerConfig = {
    ...config,
    backend: config.backend || defaultBackend,
    bindingTaskId: config.bindingTaskId || undefined,
    syncStatus: config.syncStatus || inferredSyncStatus,
    lastSyncedAt: config.lastSyncedAt ? toDate(config.lastSyncedAt) : undefined,
    lastSyncError: config.lastSyncError || undefined,
    runtimeSource: config.runtimeSource || undefined,
  };

  if (type === 'schedule') {
    normalized.timezone = normalized.timezone || 'UTC';
    normalized.cronExpression = normalized.cronExpression || '0 9 * * *';
  }

  if (type === 'event') {
    normalized.eventType = normalized.eventType || 'workflow.event';
  }

  if (type === 'webhook') {
    normalized.webhookMethod = normalized.webhookMethod || 'POST';
    normalized.webhookPath = normalized.webhookPath || undefined;
  }

  return normalized;
}

function normalizeNode(node: WorkflowNode, warnings: string[]): WorkflowNode {
  const resolvedType =
    LEGACY_NODE_TYPE_MAP[node.type] || LEGACY_NODE_TYPE_MAP[(node.data?.nodeType as string) || ''] || node.type;

  const defaultData = createDefaultNodeData(resolvedType);
  const currentErrorConfig = (node.data?.errorConfig || {}) as Partial<NodeErrorConfig>;

  const mergedData = {
    ...defaultData,
    ...(node.data || {}),
    nodeType: resolvedType,
    executionStatus: (node.data?.executionStatus as string) || 'idle',
    isConfigured: typeof node.data?.isConfigured === 'boolean' ? node.data.isConfigured : false,
    hasError: typeof node.data?.hasError === 'boolean' ? node.data.hasError : false,
    errorConfig: {
      ...(defaultData.errorConfig || {}),
      ...currentErrorConfig,
    },
  };

  if (resolvedType !== node.type) {
    warnings.push(`Node ${node.id} type migrated from ${node.type} to ${resolvedType}`);
  }

  return {
    ...node,
    type: resolvedType,
    data: mergedData,
  } as WorkflowNode;
}

export function migrateWorkflowSchema(input: VisualWorkflow): WorkflowSchemaMigrationResult {
  const sourceVersion = input.schemaVersion || '1.0';
  const warnings: string[] = [];

  const migratedNodes = input.nodes.map((node) => normalizeNode(node, warnings));

  const mergedSettings = {
    ...DEFAULT_WORKFLOW_SETTINGS,
    ...(input.settings || {}),
    triggers: (input.settings?.triggers || []).map((trigger) => ({
      ...trigger,
      config: normalizeTriggerConfig(trigger.type, trigger.config || {}),
    })),
  };

  const migratedWorkflow: VisualWorkflow = {
    ...input,
    schemaVersion: CURRENT_WORKFLOW_SCHEMA_VERSION,
    settings: mergedSettings,
    nodes: migratedNodes,
    createdAt: toDate(input.createdAt),
    updatedAt: toDate(input.updatedAt),
  };

  return {
    workflow: migratedWorkflow,
    migrated: sourceVersion !== CURRENT_WORKFLOW_SCHEMA_VERSION || warnings.length > 0,
    fromVersion: sourceVersion,
    toVersion: CURRENT_WORKFLOW_SCHEMA_VERSION,
    warnings,
  };
}

export default migrateWorkflowSchema;
