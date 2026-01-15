/**
 * Observability Integration Hook for AI Chat
 * 
 * Wraps useAIChat to add observability tracking via Langfuse and OpenTelemetry
 */

import { useEffect, useRef } from 'react';
import {
  createChatObservabilityManager,
  type ChatObservabilityConfig,
} from '@/lib/ai/observability/chat-observability';
import type { CoreMessage } from 'ai';

/**
 * Observability hook for AI chat
 * 
 * Use this hook to track chat sessions, generations, and streaming responses
 */
export function useChatObservability(config: ChatObservabilityConfig) {
  const managerRef = useRef<ReturnType<typeof createChatObservabilityManager> | null>(null);

  useEffect(() => {
    // Initialize observability manager
    managerRef.current = createChatObservabilityManager(config);
    managerRef.current.startChat();

    // Cleanup on unmount
    return () => {
      if (managerRef.current) {
        managerRef.current.endChat();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.sessionId, config.userId]);

  /**
   * Track a generation
   */
  const trackGeneration = async (
    model: string,
    provider: string,
    messages: CoreMessage[],
    fn: () => Promise<{
      text: string;
      usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
    }>,
    options?: {
      temperature?: number;
      maxTokens?: number;
      topP?: number;
    }
  ) => {
    if (!managerRef.current) {
      return fn();
    }

    return managerRef.current.trackGeneration(
      model,
      provider,
      messages,
      fn,
      options
    );
  };

  /**
   * Track a streaming generation
   */
  const trackStreamingGeneration = (
    model: string,
    provider: string,
    messages: CoreMessage[],
    options?: {
      temperature?: number;
      maxTokens?: number;
      topP?: number;
    }
  ) => {
    if (!managerRef.current) {
      return null;
    }

    return managerRef.current.trackStreamingGeneration(
      model,
      provider,
      messages,
      options
    );
  };

  /**
   * Get trace URL
   */
  const getTraceUrl = () => {
    return managerRef.current?.getTraceUrl() || null;
  };

  return {
    trackGeneration,
    trackStreamingGeneration,
    getTraceUrl,
  };
}
