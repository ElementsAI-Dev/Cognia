/**
 * Agent Trace → StructuredLogEntry Adapter
 *
 * Converts agent trace events (live) and persisted DB records
 * into StructuredLogEntry format for unified display in LogPanel.
 */

import type { StructuredLogEntry, LogLevel } from '@/lib/logger';
import type { AgentTraceEvent } from '@/stores/agent-trace/agent-trace-store';
import type { DBAgentTrace } from '@/lib/db';
import type { AgentTraceRecord, AgentTraceEventType, TraceCostEstimate } from '@/types/agent-trace';

/** ID prefix to avoid collisions with regular log entries */
const AGENT_TRACE_ID_PREFIX = 'at-';

/** Module name for agent trace log entries */
export const AGENT_TRACE_MODULE = 'agent-trace';

/** Structured data stored in StructuredLogEntry.data for agent trace entries */
export interface AgentTraceLogData {
  eventType: AgentTraceEventType;
  toolName?: string;
  toolArgs?: string;
  success?: boolean;
  error?: string;
  duration?: number;
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  costEstimate?: TraceCostEstimate;
  responsePreview?: string;
  modelId?: string;
  stepNumber?: number;
  files?: string[];
}

/**
 * Derive log level from agent trace event properties.
 */
function deriveLevel(
  eventType: string,
  success?: boolean,
  error?: string
): LogLevel {
  if (eventType === 'error' || success === false || error) return 'error';
  if (eventType === 'permission_request') return 'warn';
  return 'info';
}

/**
 * Build a human-readable message from event type and tool name.
 */
function buildMessage(eventType: string, toolName?: string): string {
  const label = eventType.replace(/_/g, ' ');
  if (toolName) return `[${label}] ${toolName}`;
  return `[${label}]`;
}

/**
 * Convert a live AgentTraceEvent to StructuredLogEntry.
 */
export function agentTraceEventToLogEntry(
  event: AgentTraceEvent
): StructuredLogEntry {
  const data: AgentTraceLogData = {
    eventType: event.eventType,
    toolName: event.toolName,
    toolArgs: event.toolArgs,
    success: event.success,
    error: event.error,
    duration: event.duration,
    tokenUsage: event.tokenUsage,
    costEstimate: event.costEstimate,
    responsePreview: event.responsePreview,
    modelId: event.modelId,
    stepNumber: event.stepNumber,
  };

  return {
    id: `${AGENT_TRACE_ID_PREFIX}${event.id}`,
    timestamp: new Date(event.timestamp).toISOString(),
    level: deriveLevel(event.eventType, event.success, event.error),
    message: buildMessage(event.eventType, event.toolName),
    module: AGENT_TRACE_MODULE,
    sessionId: event.sessionId,
    stepId: event.stepNumber !== undefined ? `step-${event.stepNumber}` : undefined,
    eventId: event.eventType,
    tags: [event.eventType, event.toolName].filter(Boolean) as string[],
    data: data as unknown as Record<string, unknown>,
  };
}

/**
 * Convert a persisted DBAgentTrace record to StructuredLogEntry.
 * Returns null if the record JSON is malformed.
 */
export function dbAgentTraceToLogEntry(
  row: DBAgentTrace
): StructuredLogEntry | null {
  let record: AgentTraceRecord;
  try {
    record = JSON.parse(row.record) as AgentTraceRecord;
  } catch {
    return null;
  }

  const meta = (record.metadata ?? {}) as Record<string, unknown>;

  const eventType = record.eventType ?? 'response';
  const toolName = typeof meta.toolName === 'string' ? meta.toolName : undefined;
  const toolArgs = typeof meta.toolArgs === 'string'
    ? meta.toolArgs
    : meta.toolArgs !== undefined
      ? JSON.stringify(meta.toolArgs)
      : undefined;
  const success = typeof meta.success === 'boolean' ? meta.success : undefined;
  const error = typeof meta.error === 'string' ? meta.error : undefined;
  const duration = record.duration ?? (typeof meta.latencyMs === 'number' ? meta.latencyMs : undefined);
  const responsePreview = typeof meta.responsePreview === 'string' ? meta.responsePreview : undefined;
  const modelId = typeof meta.modelId === 'string' ? meta.modelId : undefined;

  // Extract token usage
  const rawUsage = (meta.tokenUsage ?? meta.usage) as Record<string, unknown> | undefined;
  const tokenUsage = rawUsage
    ? {
      promptTokens: Number(rawUsage.promptTokens ?? rawUsage.prompt_tokens ?? 0),
      completionTokens: Number(rawUsage.completionTokens ?? rawUsage.completion_tokens ?? 0),
      totalTokens: Number(rawUsage.totalTokens ?? rawUsage.total_tokens ?? 0),
    }
    : undefined;

  // Derive step number
  const stepNumber = typeof meta.stepNumber === 'number'
    ? meta.stepNumber
    : record.stepId
      ? Number(record.stepId.match(/(\d+)/)?.[1])
      : undefined;

  const data: AgentTraceLogData = {
    eventType,
    toolName,
    toolArgs,
    success,
    error,
    duration,
    tokenUsage,
    costEstimate: record.costEstimate,
    responsePreview,
    modelId,
    stepNumber: Number.isFinite(stepNumber) ? stepNumber : undefined,
    files: record.files?.map((f) => f.path).filter(Boolean),
  };

  return {
    id: `${AGENT_TRACE_ID_PREFIX}${record.id ?? row.id}`,
    timestamp: record.timestamp ?? row.timestamp.toISOString(),
    level: deriveLevel(eventType, success, error),
    message: buildMessage(eventType, toolName),
    module: AGENT_TRACE_MODULE,
    sessionId: row.sessionId,
    traceId: record.traceId,
    stepId: record.stepId,
    eventId: eventType,
    tags: [eventType, toolName, ...(record.tags ?? [])].filter(Boolean) as string[],
    data: data as unknown as Record<string, unknown>,
  };
}

/**
 * Check if a StructuredLogEntry originates from agent trace adapter.
 */
export function isAgentTraceLogEntry(entry: StructuredLogEntry): boolean {
  return entry.module === AGENT_TRACE_MODULE;
}

/**
 * Extract AgentTraceLogData from a StructuredLogEntry.
 * Returns null if the entry is not an agent trace entry.
 */
export function getAgentTraceLogData(
  entry: StructuredLogEntry
): AgentTraceLogData | null {
  if (!isAgentTraceLogEntry(entry) || !entry.data) return null;
  return entry.data as unknown as AgentTraceLogData;
}
