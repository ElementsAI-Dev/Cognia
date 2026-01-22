/**
 * Observability Integration Hook for Agents
 *
 * Wraps agent execution to add observability tracking via Langfuse and OpenTelemetry
 */

import { useEffect, useRef } from 'react';
import {
  createAgentObservabilityManager,
  type AgentObservabilityConfig,
} from '@/lib/ai/observability/agent-observability';
import type { ToolCall } from '@/lib/ai/agent/agent-executor';

/**
 * Observability hook for agents
 *
 * Use this hook to track agent executions, tool calls, and planning phases
 */
export function useAgentObservability(config: AgentObservabilityConfig) {
  const managerRef = useRef<ReturnType<typeof createAgentObservabilityManager> | null>(null);

  useEffect(() => {
    // Initialize observability manager
    managerRef.current = createAgentObservabilityManager(config);
    managerRef.current.startAgentExecution();

    // Cleanup on unmount
    return () => {
      // Agent observability cleanup is handled in endAgentExecution
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.sessionId, config.agentName, config.task]);

  /**
   * Track agent execution
   */
  const trackAgentExecution = async <T>(fn: () => Promise<T>) => {
    if (!managerRef.current) {
      return fn();
    }

    return managerRef.current.trackAgentExecution(fn);
  };

  /**
   * Track a tool call
   */
  const trackToolCall = async <T>(
    toolName: string,
    args: Record<string, unknown>,
    fn: () => Promise<T>
  ) => {
    if (!managerRef.current) {
      return fn();
    }

    return managerRef.current.trackToolCall(toolName, args, fn);
  };

  /**
   * Track multiple tool calls
   */
  const trackToolCalls = async (
    toolCalls: ToolCall[],
    executeTool: (toolCall: ToolCall) => Promise<unknown>
  ) => {
    if (!managerRef.current) {
      for (const toolCall of toolCalls) {
        await executeTool(toolCall);
      }
      return;
    }

    return managerRef.current.trackToolCalls(toolCalls, executeTool);
  };

  /**
   * Track planning phase
   */
  const trackPlanning = async <T>(fn: () => Promise<T>) => {
    if (!managerRef.current) {
      return fn();
    }

    return managerRef.current.trackPlanning(fn);
  };

  /**
   * End agent execution
   */
  const endAgentExecution = (result: string, toolCalls: ToolCall[]) => {
    if (managerRef.current) {
      managerRef.current.endAgentExecution(result, toolCalls);
    }
  };

  /**
   * Get trace URL
   */
  const getTraceUrl = () => {
    return managerRef.current?.getTraceUrl() || null;
  };

  return {
    trackAgentExecution,
    trackToolCall,
    trackToolCalls,
    trackPlanning,
    endAgentExecution,
    getTraceUrl,
  };
}
