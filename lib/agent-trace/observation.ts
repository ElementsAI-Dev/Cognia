import type { DBAgentTrace } from '@/lib/db';
import type { AgentTraceRecord } from '@/types/agent-trace';
import type {
  AgentTraceObservationCorrelation,
  AgentTraceObservationFilters,
  AgentTraceObservationOutcome,
  AgentTraceObservationRow,
  AgentTraceObservationTokenUsage,
} from '@/types/agent-trace';

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

export function parseAgentTraceRecordSafe(rawRecord: string): {
  record: AgentTraceRecord | null;
  error: string | null;
} {
  try {
    return {
      record: JSON.parse(rawRecord) as AgentTraceRecord,
      error: null,
    };
  } catch (error) {
    return {
      record: null,
      error: error instanceof Error ? error.message : 'Failed to parse trace record',
    };
  }
}

function deriveObservationOutcome(
  eventType: AgentTraceObservationRow['eventType'],
  metadata?: Record<string, unknown>
): AgentTraceObservationOutcome {
  if (eventType === 'parse_error' || eventType === 'error') {
    return 'error';
  }

  if (typeof metadata?.success === 'boolean') {
    return metadata.success ? 'success' : 'error';
  }

  if (metadata?.isError === true || typeof metadata?.error === 'string') {
    return 'error';
  }

  if (
    eventType === 'session_start' ||
    eventType === 'permission_request' ||
    eventType === 'permission_response' ||
    eventType === 'step_start' ||
    eventType === 'planning'
  ) {
    return 'unknown';
  }

  return 'success';
}

function deriveObservationTokenUsage(
  metadata?: Record<string, unknown>
): AgentTraceObservationTokenUsage | undefined {
  const usage = asRecord(metadata?.tokenUsage ?? metadata?.usage);
  if (!usage) {
    return undefined;
  }

  const promptTokens = asNumber(usage.promptTokens ?? usage.prompt_tokens) ?? 0;
  const completionTokens = asNumber(usage.completionTokens ?? usage.completion_tokens) ?? 0;
  const totalTokens =
    asNumber(usage.totalTokens ?? usage.total_tokens) ?? (promptTokens + completionTokens);

  if (promptTokens === 0 && completionTokens === 0 && totalTokens === 0) {
    return undefined;
  }

  return {
    promptTokens,
    completionTokens,
    totalTokens,
  };
}

function deriveCorrelation(
  record: AgentTraceRecord | null,
  row: DBAgentTrace,
  metadata?: Record<string, unknown>
): AgentTraceObservationCorrelation {
  return {
    traceId: record?.traceId,
    spanId: record?.spanId,
    turnId: record?.turnId,
    agentId: asString(metadata?.agentId),
    agentName: asString(metadata?.agentName),
    externalSessionId: asString(metadata?.acpSessionId),
    protocol: asString(metadata?.protocol),
    transport: asString(metadata?.transport),
    ...(row.sessionId ? {} : {}),
  };
}

function deriveSummary(
  eventType: AgentTraceObservationRow['eventType'],
  metadata?: Record<string, unknown>,
  parseError?: string | null
): string {
  if (parseError) {
    return parseError;
  }

  const error = asString(metadata?.error);
  if (error) {
    return error;
  }

  const responsePreview = asString(metadata?.responsePreview);
  if (responsePreview) {
    return responsePreview;
  }

  const toolName = asString(metadata?.toolName);
  if (toolName) {
    return toolName;
  }

  return eventType.replace(/_/g, ' ');
}

export function deriveObservationFromDbTrace(row: DBAgentTrace): AgentTraceObservationRow {
  const { record, error } = parseAgentTraceRecordSafe(row.record);
  const metadata = record?.metadata && typeof record.metadata === 'object'
    ? (record.metadata as Record<string, unknown>)
    : undefined;
  const eventType: AgentTraceObservationRow['eventType'] =
    record?.eventType ?? (error ? 'parse_error' : 'unknown');
  const filePaths =
    row.filePaths && row.filePaths.length > 0
      ? row.filePaths
      : (record?.files ?? []).map((file) => file.path).filter(Boolean);

  return {
    id: row.id,
    sessionId: row.sessionId ?? asString(metadata?.sessionId),
    timestamp:
      record?.timestamp ??
      (row.timestamp instanceof Date ? row.timestamp.toISOString() : new Date(row.timestamp).toISOString()),
    vcsRevision: row.vcsRevision ?? asString(record?.vcs?.revision),
    eventType,
    outcome: deriveObservationOutcome(eventType, metadata),
    parseStatus: error ? 'degraded' : 'ok',
    summary: deriveSummary(eventType, metadata, error),
    toolName: asString(metadata?.toolName),
    error: asString(metadata?.error),
    responsePreview: asString(metadata?.responsePreview),
    duration: record?.duration ?? asNumber(metadata?.latencyMs),
    tokenUsage: deriveObservationTokenUsage(metadata),
    costEstimate: record?.costEstimate,
    filePaths,
    tags: record?.tags ?? [],
    correlation: deriveCorrelation(record, row, metadata),
    metadata,
    rawRecord: row.record,
  };
}

function matchesStringIncludes(actual: string | undefined, expected: string | undefined): boolean {
  if (!expected) {
    return true;
  }
  if (!actual) {
    return false;
  }
  return actual.toLowerCase().includes(expected.toLowerCase());
}

export function matchesObservationFilters(
  row: AgentTraceObservationRow,
  filters: AgentTraceObservationFilters
): boolean {
  if (filters.sessionId && row.sessionId !== filters.sessionId) {
    return false;
  }

  if (filters.vcsRevision && row.vcsRevision !== filters.vcsRevision) {
    return false;
  }

  if (
    filters.filePath &&
    !row.filePaths.some((filePath) => filePath.toLowerCase().includes(filters.filePath!.toLowerCase()))
  ) {
    return false;
  }

  if (filters.eventType && row.eventType !== filters.eventType) {
    return false;
  }

  if (filters.outcome && row.outcome !== filters.outcome) {
    return false;
  }

  if (!matchesStringIncludes(row.toolName, filters.toolName)) {
    return false;
  }

  if (filters.traceId && row.correlation.traceId !== filters.traceId) {
    return false;
  }

  if (filters.turnId && row.correlation.turnId !== filters.turnId) {
    return false;
  }

  return true;
}
