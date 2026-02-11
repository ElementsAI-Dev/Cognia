/**
 * Trace Converter - Converts DB agent traces to UI TraceData format
 */

import type { TraceData, SpanData } from '@/types/observability';
import type { AgentTraceRecord } from '@/types/agent-trace';
import type { DBAgentTrace } from '@/lib/db';

/**
 * Convert a DBAgentTrace record to TraceData for the trace viewer
 */
export function dbTraceToTraceData(dbTrace: DBAgentTrace): TraceData | null {
  try {
    const record: AgentTraceRecord = JSON.parse(dbTrace.record);
    const meta = record.metadata as Record<string, unknown> | undefined;

    const toolName = meta?.toolName as string | undefined;
    const name = toolName
      ? `Tool: ${toolName}`
      : record.eventType
        ? record.eventType.replace(/_/g, ' ')
        : 'Trace';

    const success = meta?.success;
    const status: TraceData['status'] = success === false ? 'error' : 'success';

    const tokenUsage = meta?.tokenUsage as
      | { promptTokens?: number; completionTokens?: number; totalTokens?: number }
      | undefined;
    const usage = meta?.usage as
      | { promptTokens?: number; completionTokens?: number; totalTokens?: number }
      | undefined;
    const tu = tokenUsage || usage;

    const latencyMs = meta?.latencyMs as number | undefined;
    const modelId = meta?.modelId as string | undefined;

    const spans: SpanData[] = record.files.map((file, index) => ({
      id: `${record.id}-file-${index}`,
      name: file.path,
      startTime: new Date(record.timestamp),
      status: 'success' as const,
      type: 'span' as const,
      metadata: { conversations: file.conversations.length },
    }));

    if (toolName) {
      spans.unshift({
        id: `${record.id}-tool`,
        name: toolName,
        startTime: new Date(record.timestamp),
        duration: latencyMs,
        status: success === false ? 'error' : 'success',
        type: 'tool' as const,
        input: meta?.toolArgs,
        output: meta?.result,
        metadata: { toolName },
      });
    }

    return {
      id: record.id,
      name,
      sessionId: dbTrace.sessionId || (meta?.sessionId as string | undefined),
      startTime: new Date(record.timestamp),
      duration: latencyMs,
      status,
      model: modelId,
      tokenUsage: tu
        ? {
            prompt: tu.promptTokens || 0,
            completion: tu.completionTokens || 0,
            total: tu.totalTokens || 0,
          }
        : undefined,
      spans,
      metadata: meta,
    };
  } catch {
    return null;
  }
}
