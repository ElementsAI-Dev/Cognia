/**
 * useCompression - React hook for managing conversation compression with undo support
 *
 * Provides:
 * - Trigger compression with any strategy
 * - Undo last compression (restore original messages)
 * - Context state monitoring
 * - Auto-compression trigger based on settings
 */

import { useState, useCallback, useMemo } from 'react';
import type { UIMessage } from '@/types/core/message';
import type {
  CompressionSettings,
  CompressionStrategy,
  CompressionResult,
  ContextState,
  CompressionAIConfig,
} from '@/types/system/compression';
import {
  compressMessages,
  calculateContextState,
  shouldTriggerCompression,
  createCompressionHistoryEntry,
} from '@/lib/ai/embedding/compression';
import { useCompressionHistoryStore } from '@/stores/chat/compression-history-store';

export interface UseCompressionOptions {
  sessionId: string;
  messages: UIMessage[];
  settings: CompressionSettings;
  maxTokens?: number;
  provider?: string;
  model?: string;
  aiConfig?: CompressionAIConfig;
  /** Callback when messages are updated after compression/undo */
  onMessagesUpdate?: (messages: UIMessage[]) => void;
}

export interface UseCompressionReturn {
  /** Trigger compression with optional strategy override */
  compress: (strategy?: CompressionStrategy) => Promise<CompressionResult | null>;
  /** Undo the last compression for this session */
  undo: () => void;
  /** Whether undo is available */
  canUndo: boolean;
  /** Current compression history for this session */
  compressionHistory: ReturnType<typeof useCompressionHistoryStore.getState>['entries'];
  /** Current context state (tokens, utilization, recommendation) */
  contextState: ContextState;
  /** Whether compression is currently in progress */
  isCompressing: boolean;
  /** Whether auto-compression is recommended */
  shouldCompress: boolean;
  /** Last compression result */
  lastResult: CompressionResult | null;
}

export function useCompression(options: UseCompressionOptions): UseCompressionReturn {
  const {
    sessionId,
    messages,
    settings,
    maxTokens = 100000,
    provider,
    model,
    aiConfig,
    onMessagesUpdate,
  } = options;

  const [isCompressing, setIsCompressing] = useState(false);
  const [lastResult, setLastResult] = useState<CompressionResult | null>(null);

  const {
    addEntry,
    getEntriesForSession,
    getLatestEntry,
    removeEntry,
    canUndo: canUndoCheck,
  } = useCompressionHistoryStore();

  // Calculate context state
  const contextState = useMemo(
    () => calculateContextState(messages, maxTokens, provider, model),
    [messages, maxTokens, provider, model]
  );

  // Check if compression is recommended
  const shouldCompress = useMemo(
    () => shouldTriggerCompression(settings, contextState),
    [settings, contextState]
  );

  // Get compression history for this session
  const compressionHistory = useMemo(
    () => getEntriesForSession(sessionId),
    [getEntriesForSession, sessionId]
  );

  const canUndo = useMemo(
    () => canUndoCheck(sessionId),
    [canUndoCheck, sessionId]
  );

  // Compress messages
  const compress = useCallback(async (
    strategyOverride?: CompressionStrategy
  ): Promise<CompressionResult | null> => {
    if (isCompressing) return null;

    setIsCompressing(true);
    try {
      const effectiveSettings = strategyOverride
        ? { ...settings, strategy: strategyOverride }
        : settings;

      const result = await compressMessages(
        messages,
        effectiveSettings,
        undefined,
        aiConfig
      );

      if (result.success && result.messagesCompressed > 0) {
        // Create history entry for undo
        const compressedMsgs = messages.filter(m =>
          result.compressedMessageIds.includes(m.id)
        );

        if (compressedMsgs.length > 0 && settings.enableUndo) {
          const entry = createCompressionHistoryEntry(
            sessionId,
            effectiveSettings.strategy,
            compressedMsgs,
            `summary-${Date.now()}`,
            result.tokensBefore,
            result.tokensAfter
          );
          addEntry(entry);
        }

        // Build new message list
        const compressedIds = new Set(result.compressedMessageIds);
        const remainingMessages = messages.filter(m => !compressedIds.has(m.id));

        // If summary was generated, prepend it
        if (result.summaryText) {
          const summaryMessage: UIMessage = {
            id: `compression-summary-${Date.now()}`,
            role: 'system',
            content: result.summaryText,
            createdAt: new Date(),
            compressionState: {
              isSummary: true,
              summarizedMessageIds: result.compressedMessageIds,
              originalMessageCount: result.messagesCompressed,
              compressedAt: new Date(),
              strategyUsed: effectiveSettings.strategy,
            },
          };

          const systemMsgs = remainingMessages.filter(m => m.role === 'system');
          const nonSystemMsgs = remainingMessages.filter(m => m.role !== 'system');
          onMessagesUpdate?.([...systemMsgs, summaryMessage, ...nonSystemMsgs]);
        } else {
          onMessagesUpdate?.(remainingMessages);
        }
      }

      setLastResult(result);
      return result;
    } catch (error) {
      const errorResult: CompressionResult = {
        success: false,
        messagesCompressed: 0,
        tokensBefore: contextState.totalTokens,
        tokensAfter: contextState.totalTokens,
        compressionRatio: 1,
        compressedMessageIds: [],
        error: error instanceof Error ? error.message : 'Compression failed',
      };
      setLastResult(errorResult);
      return errorResult;
    } finally {
      setIsCompressing(false);
    }
  }, [isCompressing, messages, settings, aiConfig, sessionId, addEntry, onMessagesUpdate, contextState.totalTokens]);

  // Undo last compression
  const undo = useCallback(() => {
    const latestEntry = getLatestEntry(sessionId);
    if (!latestEntry) return;

    // Restore the compressed messages
    const restoredMessages = latestEntry.compressedMessages.map(cm => ({
      id: cm.id,
      role: cm.role as UIMessage['role'],
      content: cm.content,
      createdAt: cm.createdAt instanceof Date ? cm.createdAt : new Date(cm.createdAt),
    }));

    // Remove the summary message and add back original messages
    const currentWithoutSummary = messages.filter(
      m => !m.compressionState?.isSummary
    );

    // Merge restored messages back in chronological order
    const allMessages = [...restoredMessages, ...currentWithoutSummary];
    allMessages.sort((a, b) => {
      const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
      const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
      return aTime - bTime;
    });

    onMessagesUpdate?.(allMessages);

    // Remove the history entry
    removeEntry(latestEntry.id);
    setLastResult(null);
  }, [sessionId, messages, getLatestEntry, removeEntry, onMessagesUpdate]);

  return {
    compress,
    undo,
    canUndo,
    compressionHistory,
    contextState,
    isCompressing,
    shouldCompress,
    lastResult,
  };
}
