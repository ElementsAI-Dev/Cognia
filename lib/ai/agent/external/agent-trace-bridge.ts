import {
  recordAgentTraceEvent,
  recordAgentTraceFromToolCall,
  type TokenUsage,
} from '@/lib/agent-trace/recorder';
import type {
  ExternalAgentEvent,
  ExternalAgentResult,
  ExternalAgentTokenUsage,
} from '@/types/agent/external-agent';
import type { AgentTraceSeverity } from '@/types/agent-trace';

interface ExternalAgentTraceBridgeContext {
  sessionId: string;
  turnId?: string;
  modelId?: string;
  agentId: string;
  agentName: string;
  protocol: string;
  transport: string;
  acpSessionId: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

interface ExternalAgentTraceBridge {
  onStart: (prompt: string) => Promise<void>;
  onEvent: (event: ExternalAgentEvent) => Promise<void>;
  onComplete: (result: Pick<ExternalAgentResult, 'success' | 'finalResponse' | 'duration' | 'tokenUsage' | 'error'>) => Promise<void>;
  onError: (error: unknown) => Promise<void>;
}

interface ExternalToolCallState {
  toolUseId: string;
  toolName?: string;
  kind?: string;
  rawInput?: Record<string, unknown>;
  rawOutput?: Record<string, unknown>;
  status?: string;
  locations?: unknown[];
  startedAt: number;
}

const RESPONSE_PREVIEW_LIMIT = 1000;
const THINKING_PREVIEW_LIMIT = 1000;

function appendPreview(current: string, delta: string, maxLength: number): string {
  if (!delta || current.length >= maxLength) return current;
  const remaining = maxLength - current.length;
  return current + delta.slice(0, remaining);
}

function safeJsonStringify(value: unknown, fallback = '{}'): string {
  try {
    return JSON.stringify(value ?? {}, null, 0);
  } catch {
    return fallback;
  }
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

function extractTokenUsage(value: unknown): TokenUsage | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const usage = value as Record<string, unknown>;
  const promptTokens = Number(usage.promptTokens ?? usage.prompt_tokens ?? 0);
  const completionTokens = Number(usage.completionTokens ?? usage.completion_tokens ?? 0);
  const totalTokens = Number(usage.totalTokens ?? usage.total_tokens ?? (promptTokens + completionTokens));

  if (!Number.isFinite(promptTokens) || !Number.isFinite(completionTokens) || !Number.isFinite(totalTokens)) {
    return undefined;
  }

  if (promptTokens === 0 && completionTokens === 0 && totalTokens === 0) {
    return undefined;
  }

  return {
    promptTokens,
    completionTokens,
    totalTokens,
  };
}

function tokenUsageFromExternal(value?: ExternalAgentTokenUsage): TokenUsage | undefined {
  if (!value) return undefined;
  return extractTokenUsage(value);
}

export function createExternalAgentTraceBridge(
  context: ExternalAgentTraceBridgeContext
): ExternalAgentTraceBridge {
  const startedAt = Date.now();
  const toolStates = new Map<string, ExternalToolCallState>();
  const tags = Array.from(new Set(['external-agent', ...(context.tags ?? [])]));
  const baseMetadata: Record<string, unknown> = {
    ...context.metadata,
    agentId: context.agentId,
    agentName: context.agentName,
    protocol: context.protocol,
    transport: context.transport,
    acpSessionId: context.acpSessionId,
  };

  let responsePreview = '';
  let thinkingPreview = '';
  let doneSuccess: boolean | undefined;
  let doneStopReason: string | undefined;
  let latestError: string | undefined;
  let aggregatedTokenUsage: TokenUsage | undefined;
  let sessionStartRecorded = false;
  let completed = false;
  let writeChain: Promise<void> = Promise.resolve();

  const queueWrite = (writer: () => Promise<void>): Promise<void> => {
    writeChain = writeChain
      .then(writer)
      .catch((error) => {
        console.error('[ExternalAgentTraceBridge] Failed to write trace event:', error);
      });
    return writeChain;
  };

  const writeEvent = (
    eventType: Parameters<typeof recordAgentTraceEvent>[0]['eventType'],
    metadata: Record<string, unknown>,
    options?: { duration?: number; severity?: AgentTraceSeverity }
  ): Promise<void> => {
    return queueWrite(async () => {
      await recordAgentTraceEvent({
        sessionId: context.sessionId,
        contributorType: 'ai',
        modelId: context.modelId,
        eventType,
        turnId: context.turnId ?? context.sessionId,
        duration: options?.duration,
        severity: options?.severity,
        tags,
        metadata: {
          ...baseMetadata,
          ...metadata,
        },
      });
    });
  };

  const writeToolResult = (
    event: Extract<ExternalAgentEvent, { type: 'tool_result' }>
  ): Promise<void> => {
    const now = Date.now();
    const existing = toolStates.get(event.toolUseId);
    const rawInput = event.rawInput ?? existing?.rawInput ?? {};
    const rawOutput = event.rawOutput ?? asRecord(event.result) ?? existing?.rawOutput;
    const toolName = event.toolName ?? existing?.toolName ?? 'unknown_tool';
    const kind = event.kind ?? existing?.kind;
    const status = event.status ?? existing?.status ?? (event.isError ? 'error' : 'completed');
    const locations = event.locations ?? existing?.locations;
    const latencyMs = existing ? Math.max(0, now - existing.startedAt) : undefined;

    toolStates.delete(event.toolUseId);

    const success = !event.isError && status !== 'error' && status !== 'failed';
    const resultPreview =
      typeof event.result === 'string'
        ? event.result.slice(0, RESPONSE_PREVIEW_LIMIT)
        : safeJsonStringify(event.result, '{}').slice(0, RESPONSE_PREVIEW_LIMIT);

    return queueWrite(async () => {
      await recordAgentTraceEvent({
        sessionId: context.sessionId,
        contributorType: 'ai',
        modelId: context.modelId,
        eventType: 'tool_call_result',
        turnId: context.turnId ?? context.sessionId,
        duration: latencyMs,
        tags,
        severity: success ? 'info' : 'error',
        metadata: {
          ...baseMetadata,
          toolCallId: event.toolUseId,
          toolName,
          toolArgs: safeJsonStringify(rawInput, '{}'),
          kind,
          status,
          success,
          isError: event.isError ?? !success,
          rawInput,
          rawOutput,
          locations,
          latencyMs,
          resultPreview,
        },
      });

      await recordAgentTraceFromToolCall({
        sessionId: context.sessionId,
        agentName: context.agentName,
        toolCallId: event.toolUseId,
        toolName,
        toolArgs: rawInput,
        toolResult: success
          ? { success: true, output: rawOutput ?? event.result }
          : {
              success: false,
              error: resultPreview || 'Tool call failed',
              output: rawOutput ?? event.result,
            },
        tokenUsage: aggregatedTokenUsage,
        latencyMs,
      });
    });
  };

  return {
    onStart: async (prompt: string) => {
      await writeEvent('session_start', {
        promptLength: prompt.length,
        promptPreview: prompt.slice(0, RESPONSE_PREVIEW_LIMIT),
      });
      sessionStartRecorded = true;
    },

    onEvent: async (event: ExternalAgentEvent) => {
      switch (event.type) {
        case 'session_start':
          if (sessionStartRecorded) {
            return;
          }
          await writeEvent('session_start', {
            capabilities: event.capabilities,
            tools: event.tools,
            toolCount: event.tools?.length ?? 0,
          });
          sessionStartRecorded = true;
          return;

        case 'session_end':
          await writeEvent('session_end', {
            reason: event.reason,
            error: event.error,
          });
          return;

        case 'permission_request':
          await writeEvent('permission_request', {
            requestId: event.request.requestId ?? event.request.id,
            toolCallId: event.request.toolCallId,
            toolName: event.request.toolInfo?.name ?? event.request.title,
            kind: event.request.kind,
            options: event.request.options,
            rawInput: event.request.rawInput,
            locations: event.request.locations,
            riskLevel: event.request.riskLevel,
          });
          return;

        case 'permission_response':
          await writeEvent('permission_response', {
            requestId: event.response.requestId,
            granted: event.response.granted,
            optionId: event.response.optionId,
          });
          return;

        case 'plan_update':
          await writeEvent('planning', {
            progress: event.progress,
            step: event.step,
            totalSteps: event.totalSteps,
            entries: event.entries,
          });
          return;

        case 'tool_use_start':
          toolStates.set(event.toolUseId, {
            toolUseId: event.toolUseId,
            toolName: event.toolName,
            kind: event.kind,
            rawInput: event.rawInput,
            locations: event.locations,
            startedAt: Date.now(),
          });
          await writeEvent('tool_call_request', {
            toolCallId: event.toolUseId,
            toolName: event.toolName,
            kind: event.kind,
            toolArgs: safeJsonStringify(event.rawInput, '{}'),
            rawInput: event.rawInput,
            locations: event.locations,
          });
          return;

        case 'tool_use_end': {
          const existing = toolStates.get(event.toolUseId);
          if (existing) {
            existing.rawInput = event.input ?? existing.rawInput;
          } else {
            toolStates.set(event.toolUseId, {
              toolUseId: event.toolUseId,
              rawInput: event.input,
              startedAt: Date.now(),
            });
          }
          return;
        }

        case 'tool_call_update': {
          const existing = toolStates.get(event.toolCallId);
          if (existing) {
            existing.toolName = event.title ?? existing.toolName;
            existing.kind = event.kind ?? existing.kind;
            existing.rawInput = event.rawInput ?? existing.rawInput;
            existing.rawOutput = event.rawOutput ?? existing.rawOutput;
            existing.locations = event.locations ?? existing.locations;
            existing.status = event.status ?? existing.status;
          } else {
            toolStates.set(event.toolCallId, {
              toolUseId: event.toolCallId,
              toolName: event.title,
              kind: event.kind,
              rawInput: event.rawInput,
              rawOutput: event.rawOutput,
              locations: event.locations,
              status: event.status,
              startedAt: Date.now(),
            });
          }
          return;
        }

        case 'tool_result':
          await writeToolResult(event);
          return;

        case 'message_delta':
          if (event.delta.type === 'text') {
            responsePreview = appendPreview(responsePreview, event.delta.text, RESPONSE_PREVIEW_LIMIT);
          } else {
            thinkingPreview = appendPreview(thinkingPreview, event.delta.text, THINKING_PREVIEW_LIMIT);
          }
          return;

        case 'thinking':
          thinkingPreview = appendPreview(thinkingPreview, event.thinking, THINKING_PREVIEW_LIMIT);
          return;

        case 'message_end': {
          const usage = extractTokenUsage(event.tokenUsage);
          if (usage) {
            aggregatedTokenUsage = usage;
          }
          return;
        }

        case 'done': {
          doneSuccess = event.success;
          doneStopReason = event.stopReason;
          const usage = tokenUsageFromExternal(event.tokenUsage);
          if (usage) {
            aggregatedTokenUsage = usage;
          }
          return;
        }

        case 'error':
          latestError = event.error;
          await writeEvent(
            'error',
            {
              error: event.error,
              code: event.code,
              recoverable: event.recoverable,
            },
            { severity: 'error' }
          );
          return;

        default:
          return;
      }
    },

    onComplete: async (result) => {
      if (completed) return;
      completed = true;

      const success = doneSuccess ?? result.success;
      const resolvedTokenUsage = tokenUsageFromExternal(result.tokenUsage) ?? aggregatedTokenUsage;
      const resolvedResponse = result.finalResponse || responsePreview;
      const duration = result.duration ?? Math.max(0, Date.now() - startedAt);

      await writeEvent(
        'response',
        {
          success,
          responseLength: resolvedResponse.length,
          responsePreview: resolvedResponse.slice(0, RESPONSE_PREVIEW_LIMIT),
          thinkingPreview: thinkingPreview || undefined,
          stopReason: doneStopReason,
          tokenUsage: resolvedTokenUsage,
        },
        { duration, severity: success ? 'info' : 'error' }
      );

      if (!success) {
        const completionError =
          result.error ??
          latestError ??
          (doneStopReason ? `External agent finished with stop reason: ${doneStopReason}` : 'External agent execution failed');

        if (latestError !== completionError) {
        await writeEvent(
          'error',
          {
            error: completionError,
          },
          { severity: 'error' }
        );
        }
      }
    },

    onError: async (error) => {
      if (completed) return;
      completed = true;
      const message = error instanceof Error ? error.message : String(error);

      if (latestError !== message) {
        await writeEvent(
          'error',
          {
            error: message,
          },
          { severity: 'error' }
        );
      }
    },
  };
}
