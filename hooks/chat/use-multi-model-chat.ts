'use client';

/**
 * useMultiModelChat - Hook for parallel multi-model chat execution
 * Executes the same prompt across multiple AI models simultaneously
 */

import { useCallback, useRef, useState } from 'react';
import { streamText } from 'ai';
import { nanoid } from 'nanoid';
import { getProviderModel } from '@/lib/ai/core/client';
import { useSettingsStore } from '@/stores';
import type {
  ArenaModelConfig,
  ColumnMessageState,
  ColumnMetrics,
  MultiModelMessage,
} from '@/types/chat/multi-model';

interface UseMultiModelChatOptions {
  models: ArenaModelConfig[];
  systemPrompt?: string;
  onMessageComplete?: (message: MultiModelMessage) => void;
  onColumnStream?: (modelId: string, chunk: string) => void;
  onColumnComplete?: (modelId: string, state: ColumnMessageState) => void;
  onColumnError?: (modelId: string, error: Error) => void;
}

interface UseMultiModelChatReturn {
  isExecuting: boolean;
  columnStates: Record<string, ColumnMessageState>;
  sendToAllModels: (userMessage: string) => Promise<MultiModelMessage>;
  cancelAll: () => void;
  resetStates: () => void;
}

export function useMultiModelChat({
  models,
  systemPrompt,
  onMessageComplete,
  onColumnStream,
  onColumnComplete,
  onColumnError,
}: UseMultiModelChatOptions): UseMultiModelChatReturn {
  const [isExecuting, setIsExecuting] = useState(false);
  const [columnStates, setColumnStates] = useState<Record<string, ColumnMessageState>>({});
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());

  const providerSettings = useSettingsStore((state) => state.providerSettings);

  // Update state for a specific column
  const updateColumnState = useCallback(
    (modelId: string, updates: Partial<ColumnMessageState>) => {
      setColumnStates((prev) => ({
        ...prev,
        [modelId]: { ...prev[modelId], ...updates },
      }));
    },
    []
  );

  // Execute a single model
  const executeModel = useCallback(
    async (
      model: ArenaModelConfig,
      userMessage: string
    ): Promise<ColumnMessageState> => {
      const abortController = new AbortController();
      abortControllersRef.current.set(model.id, abortController);

      const startTime = Date.now();
      let content = '';

      try {
        const settings = providerSettings[model.provider];
        if (!settings?.apiKey && model.provider !== 'ollama') {
          throw new Error(`No API key configured for ${model.provider}`);
        }

        // Update status to streaming
        updateColumnState(model.id, { status: 'streaming', content: '' });

        const providerModel = getProviderModel(
          model.provider,
          model.model,
          settings?.apiKey || '',
          settings?.baseURL
        );

        const result = await streamText({
          model: providerModel,
          messages: [{ role: 'user', content: userMessage }],
          system: systemPrompt,
          abortSignal: abortController.signal,
        });

        // Stream the response
        for await (const chunk of result.textStream) {
          if (abortController.signal.aborted) {
            break;
          }
          content += chunk;
          updateColumnState(model.id, { content });
          onColumnStream?.(model.id, chunk);
        }

        // Get usage info
        const usage = await result.usage;
        const latencyMs = Date.now() - startTime;

        // Build metrics - handle different AI SDK response formats with type guards
        const getTokenCount = (
          data: unknown,
          primaryKey: string,
          fallbackKey: string
        ): number => {
          if (data && typeof data === 'object') {
            const obj = data as Record<string, unknown>;
            const primary = obj[primaryKey];
            const fallback = obj[fallbackKey];
            if (typeof primary === 'number') return primary;
            if (typeof fallback === 'number') return fallback;
          }
          return 0;
        };

        const inputTokens = getTokenCount(usage, 'promptTokens', 'inputTokens');
        const outputTokens = getTokenCount(usage, 'completionTokens', 'outputTokens');

        const metrics: ColumnMetrics = {
          latencyMs,
          tokenCount: {
            input: inputTokens,
            output: outputTokens,
            total: inputTokens + outputTokens,
          },
        };

        const state: ColumnMessageState = {
          modelId: model.id,
          status: 'completed',
          content,
          metrics,
        };

        updateColumnState(model.id, state);
        onColumnComplete?.(model.id, state);
        return state;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const isAborted = abortController.signal.aborted;

        const state: ColumnMessageState = {
          modelId: model.id,
          status: isAborted ? 'pending' : 'error',
          content: isAborted ? '' : content,
          error: isAborted ? undefined : errorMessage,
          metrics: {
            latencyMs: Date.now() - startTime,
            tokenCount: { input: 0, output: 0, total: 0 },
          },
        };

        updateColumnState(model.id, state);
        if (!isAborted) {
          onColumnError?.(model.id, error as Error);
        }
        return state;
      } finally {
        abortControllersRef.current.delete(model.id);
      }
    },
    [providerSettings, systemPrompt, updateColumnState, onColumnStream, onColumnComplete, onColumnError]
  );

  // Send message to all models in parallel
  const sendToAllModels = useCallback(
    async (userMessage: string): Promise<MultiModelMessage> => {
      if (models.length < 2) {
        throw new Error('At least 2 models required for multi-model chat');
      }

      setIsExecuting(true);
      const messageId = nanoid();

      // Initialize column states
      const initialStates: Record<string, ColumnMessageState> = {};
      models.forEach((m) => {
        initialStates[m.id] = {
          modelId: m.id,
          status: 'pending',
          content: '',
        };
      });
      setColumnStates(initialStates);

      try {
        // Execute all models in parallel
        const results = await Promise.allSettled(
          models.map((model) => executeModel(model, userMessage))
        );

        // Collect results
        const columns: ColumnMessageState[] = results.map((result, index) => {
          if (result.status === 'fulfilled') {
            return result.value;
          }
          return {
            modelId: models[index].id,
            status: 'error' as const,
            content: '',
            error: result.reason?.message || 'Unknown error',
          };
        });

        const message: MultiModelMessage = {
          id: messageId,
          userContent: userMessage,
          columns,
          createdAt: new Date(),
        };

        onMessageComplete?.(message);
        return message;
      } finally {
        setIsExecuting(false);
      }
    },
    [models, executeModel, onMessageComplete]
  );

  // Cancel all ongoing executions
  const cancelAll = useCallback(() => {
    abortControllersRef.current.forEach((controller) => {
      controller.abort();
    });
    abortControllersRef.current.clear();
    setIsExecuting(false);
  }, []);

  // Reset all states
  const resetStates = useCallback(() => {
    setColumnStates({});
    setIsExecuting(false);
  }, []);

  return {
    isExecuting,
    columnStates,
    sendToAllModels,
    cancelAll,
    resetStates,
  };
}

export default useMultiModelChat;
