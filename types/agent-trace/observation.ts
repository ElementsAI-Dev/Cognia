import type { AgentTraceEventType, TraceCostEstimate } from './trace-record';

export type AgentTraceObservationOutcome = 'success' | 'error' | 'unknown';

export interface AgentTraceObservationCorrelation {
  traceId?: string;
  spanId?: string;
  turnId?: string;
  agentId?: string;
  agentName?: string;
  externalSessionId?: string;
  protocol?: string;
  transport?: string;
}

export interface AgentTraceObservationTokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface AgentTraceObservationRow {
  id: string;
  sessionId?: string;
  timestamp: string;
  vcsRevision?: string;
  eventType: AgentTraceEventType | 'parse_error' | 'unknown';
  outcome: AgentTraceObservationOutcome;
  parseStatus: 'ok' | 'degraded';
  summary: string;
  toolName?: string;
  error?: string;
  responsePreview?: string;
  duration?: number;
  tokenUsage?: AgentTraceObservationTokenUsage;
  costEstimate?: TraceCostEstimate;
  filePaths: string[];
  tags: string[];
  correlation: AgentTraceObservationCorrelation;
  metadata?: Record<string, unknown>;
  rawRecord: string;
}

export interface AgentTraceObservationFilters {
  sessionId?: string;
  filePath?: string;
  vcsRevision?: string;
  eventType?: AgentTraceEventType;
  outcome?: AgentTraceObservationOutcome;
  toolName?: string;
  traceId?: string;
  turnId?: string;
  limit?: number;
  offset?: number;
}
