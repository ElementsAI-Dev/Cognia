/**
 * Node Config Panel Types
 * Shared types for all node config components
 */

import type {
  WorkflowNodeData,
  AINodeData,
  ToolNodeData,
  ConditionalNodeData,
  CodeNodeData,
  LoopNodeData,
  HumanNodeData,
  StartNodeData,
  EndNodeData,
  ParallelNodeData,
  DelayNodeData,
  SubworkflowNodeData,
  WebhookNodeData,
  TransformNodeData,
  MergeNodeData,
  GroupNodeData,
  AnnotationNodeData,
  KnowledgeRetrievalNodeData,
  ParameterExtractorNodeData,
  VariableAggregatorNodeData,
  QuestionClassifierNodeData,
  TemplateTransformNodeData,
} from '@/types/workflow/workflow-editor';
import { WORKFLOW_TOOL_CATALOG } from '../../tool-catalog';

// Re-export for convenience
export type {
  WorkflowNodeData,
  AINodeData,
  ToolNodeData,
  ConditionalNodeData,
  CodeNodeData,
  LoopNodeData,
  HumanNodeData,
  StartNodeData,
  EndNodeData,
  ParallelNodeData,
  DelayNodeData,
  SubworkflowNodeData,
  WebhookNodeData,
  TransformNodeData,
  MergeNodeData,
  GroupNodeData,
  AnnotationNodeData,
  KnowledgeRetrievalNodeData,
  ParameterExtractorNodeData,
  VariableAggregatorNodeData,
  QuestionClassifierNodeData,
  TemplateTransformNodeData,
};

// Base config props interface
export interface NodeConfigProps<T extends WorkflowNodeData> {
  data: T;
  onUpdate: (updates: Partial<T>) => void;
}

// IO Schema types
export type IOSchemaType = 'string' | 'number' | 'boolean' | 'object' | 'array';

export interface IOSchemaValue {
  type: IOSchemaType;
  description: string;
  required?: boolean;
}

export interface IOSchemaEditorProps {
  schema: Record<string, IOSchemaValue>;
  onChange: (schema: Record<string, IOSchemaValue>) => void;
  type: 'input' | 'output';
}

// Available tools from registry - grouped by category
export const AVAILABLE_TOOLS = WORKFLOW_TOOL_CATALOG;

// Color palettes
export const GROUP_COLORS = [
  { name: 'Gray', value: '#6b7280' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Yellow', value: '#eab308' },
];

export const ANNOTATION_COLORS = [
  { name: 'Yellow', value: '#fef08a' },
  { name: 'Blue', value: '#bfdbfe' },
  { name: 'Green', value: '#bbf7d0' },
  { name: 'Pink', value: '#fbcfe8' },
  { name: 'Purple', value: '#ddd6fe' },
  { name: 'Orange', value: '#fed7aa' },
  { name: 'Gray', value: '#e5e7eb' },
  { name: 'White', value: '#ffffff' },
];
