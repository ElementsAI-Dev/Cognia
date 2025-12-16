/**
 * Tool type definitions for Agent functionality
 */

import type { z } from 'zod';
import type { ToolState } from './message';

export type ToolStatus = 'pending' | 'running' | 'completed' | 'error';

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
  status: ToolStatus;
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
  | 'file_read'
  | 'file_write';

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
