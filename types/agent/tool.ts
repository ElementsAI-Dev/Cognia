/**
 * Tool type definitions for Agent functionality
 */

import type { z } from 'zod';
import type { ToolState } from '../core/message';

export type AgentToolStatus = 'pending' | 'running' | 'completed' | 'error';

// Note: ToolStatus alias removed to avoid conflict with system/environment.ts
// Use AgentToolStatus instead

export interface ToolDefinition<TInput = unknown, TOutput = unknown> {
  name: string;
  description: string;
  inputSchema: z.ZodType<TInput>;
  outputSchema?: z.ZodType<TOutput>;
  execute: (input: TInput) => Promise<TOutput>;
}

export interface ToolExecution {
  id: string;
  toolName: string;
  status: AgentToolStatus;
  state: ToolState;
  input: Record<string, unknown>;
  output?: unknown;
  error?: string;
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
}

// Built-in tool names
export type BuiltInToolName =
  | 'web_search'
  | 'web_browser'
  | 'code_executor'
  | 'calculator'
  | 'rag_search'
  // File tools
  | 'file_read'
  | 'file_write'
  | 'file_list'
  | 'file_exists'
  | 'file_delete'
  | 'file_copy'
  | 'file_rename'
  | 'file_info'
  | 'file_search'
  | 'file_append'
  | 'directory_create'
  // Document tools
  | 'document_summarize'
  | 'document_chunk'
  | 'document_analyze';

// MCP Tool extension
export interface MCPTool extends Omit<ToolDefinition, 'execute'> {
  serverId: string;
  serverName: string;
}

export interface MCPServer {
  id: string;
  name: string;
  url: string;
  tools: MCPTool[];
  connected: boolean;
}
