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
} from '@/types/workflow/workflow-editor';

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
export const AVAILABLE_TOOLS = [
  // Search tools
  { name: 'web_search', label: 'Web Search', category: 'search', description: 'Search the web for information' },
  { name: 'rag_search', label: 'RAG Search', category: 'search', description: 'Search knowledge base' },
  // System tools
  { name: 'calculator', label: 'Calculator', category: 'system', description: 'Perform calculations' },
  // Document tools
  { name: 'document_summarize', label: 'Document Summarize', category: 'file', description: 'Summarize documents' },
  { name: 'document_chunk', label: 'Document Chunk', category: 'file', description: 'Split documents into chunks' },
  { name: 'document_analyze', label: 'Document Analyze', category: 'file', description: 'Analyze document structure' },
  // File tools
  { name: 'file_read', label: 'File Read', category: 'file', description: 'Read file contents' },
  { name: 'file_write', label: 'File Write', category: 'file', description: 'Write to file' },
  { name: 'file_list', label: 'File List', category: 'file', description: 'List directory contents' },
  { name: 'file_exists', label: 'File Exists', category: 'file', description: 'Check if file exists' },
  { name: 'file_delete', label: 'File Delete', category: 'file', description: 'Delete file' },
  { name: 'file_copy', label: 'File Copy', category: 'file', description: 'Copy file' },
  { name: 'file_rename', label: 'File Rename', category: 'file', description: 'Rename/move file' },
  { name: 'file_info', label: 'File Info', category: 'file', description: 'Get file information' },
  { name: 'file_search', label: 'File Search', category: 'file', description: 'Search for files' },
  { name: 'file_append', label: 'File Append', category: 'file', description: 'Append to file' },
  { name: 'directory_create', label: 'Directory Create', category: 'file', description: 'Create directory' },
];

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
