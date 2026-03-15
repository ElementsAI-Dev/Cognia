/**
 * Trace Converter - Converts DB agent traces to UI TraceData format
 */

import type { TraceData, SpanData } from '@/types/observability';
import type { DBAgentTrace } from '@/lib/db';
import { deriveObservationFromDbTrace, parseAgentTraceRecordSafe } from '@/lib/agent-trace/observation';

/**
 * Convert a DBAgentTrace record to TraceData for the trace viewer
 */
export function dbTraceToTraceData(dbTrace: DBAgentTrace): TraceData | null {
  const observation = deriveObservationFromDbTrace(dbTrace);
  const { record } = parseAgentTraceRecordSafe(dbTrace.record);
  if (!record) {
    return null;
  }

  const meta = record.metadata as Record<string, unknown> | undefined;
  const spans: SpanData[] = record.files.map((file, index) => ({
    id: `${record.id}-file-${index}`,
    name: file.path,
    startTime: new Date(record.timestamp),
    status: observation.outcome === 'error' ? 'error' : 'success',
    type: 'span' as const,
    metadata: { conversations: file.conversations.length },
  }));

  if (observation.toolName) {
    spans.unshift({
      id: `${record.id}-tool`,
      name: observation.toolName,
      startTime: new Date(record.timestamp),
      duration: observation.duration,
      status: observation.outcome === 'error' ? 'error' : 'success',
      type: 'tool' as const,
      input: meta?.toolArgs,
      output: meta?.result,
      metadata: { toolName: observation.toolName },
    });
  }

  return {
    id: record.id,
    name: observation.toolName
      ? `Tool: ${observation.toolName}`
      : observation.eventType.replace(/_/g, ' '),
    sessionId: observation.sessionId,
    startTime: new Date(record.timestamp),
    duration: observation.duration,
    status: observation.outcome === 'error' ? 'error' : 'success',
    model: typeof meta?.modelId === 'string' ? meta.modelId : undefined,
    tokenUsage: observation.tokenUsage
      ? {
          prompt: observation.tokenUsage.promptTokens,
          completion: observation.tokenUsage.completionTokens,
          total: observation.tokenUsage.totalTokens,
        }
      : undefined,
    cost: observation.costEstimate?.totalCost,
    spans,
    metadata: meta,
  };
}
