/**
 * useAIConversation - React hook for managing AI conversation state
 * Provides interface for multi-turn conversational AI editing
 */

import { useCallback, useState, useRef } from 'react';
import {
  createConversation,
  continueConversation,
  streamConversation,
  clearConversationHistory,
  getConversationSummary,
  type AIConversation,
  type AIConversationMessage,
} from '@/lib/designer/ai-conversation';
import { getDesignerAIConfig, type DesignerAIConfig } from '@/lib/designer/ai';
import { useSettingsStore } from '@/stores';

export interface UseAIConversationOptions {
  designerId?: string;
  initialCode?: string;
  onCodeChange?: (code: string) => void;
  onError?: (error: string) => void;
}

export interface UseAIConversationReturn {
  conversation: AIConversation | null;
  messages: AIConversationMessage[];
  isProcessing: boolean;
  isStreaming: boolean;
  streamingContent: string;
  error: string | null;
  sendMessage: (message: string) => Promise<void>;
  sendMessageStreaming: (message: string) => Promise<void>;
  clearHistory: () => void;
  resetConversation: () => void;
  getSummary: () => ReturnType<typeof getConversationSummary> | null;
}

export function useAIConversation(
  options: UseAIConversationOptions = {}
): UseAIConversationReturn {
  const { designerId = 'default', initialCode = '', onCodeChange, onError } = options;

  const [conversation, setConversation] = useState<AIConversation | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const providerSettings = useSettingsStore((state) => state.providerSettings);
  const defaultProvider = useSettingsStore((state) => state.defaultProvider);

  const getConfig = useCallback((): DesignerAIConfig => {
    return getDesignerAIConfig(defaultProvider, providerSettings);
  }, [defaultProvider, providerSettings]);

  const initConversation = useCallback(
    (code: string) => {
      const config = getConfig();
      const newConversation = createConversation(designerId, code, config);
      setConversation(newConversation);
      return newConversation;
    },
    [designerId, getConfig]
  );

  const sendMessage = useCallback(
    async (message: string) => {
      setIsProcessing(true);
      setError(null);

      try {
        const config = getConfig();
        let currentConversation = conversation;

        if (!currentConversation) {
          currentConversation = initConversation(initialCode);
        }

        const result = await continueConversation(
          currentConversation,
          message,
          config
        );

        if (result.success && result.conversation) {
          setConversation(result.conversation);

          if (result.code) {
            onCodeChange?.(result.code);
          }
        } else {
          const errorMsg = result.error || 'Failed to get response';
          setError(errorMsg);
          onError?.(errorMsg);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'An error occurred';
        setError(errorMsg);
        onError?.(errorMsg);
      } finally {
        setIsProcessing(false);
      }
    },
    [conversation, initialCode, getConfig, initConversation, onCodeChange, onError]
  );

  const sendMessageStreaming = useCallback(
    async (message: string) => {
      setIsStreaming(true);
      setStreamingContent('');
      setError(null);

      abortControllerRef.current = new AbortController();

      try {
        const config = getConfig();
        let currentConversation = conversation;

        if (!currentConversation) {
          currentConversation = initConversation(initialCode);
        }

        const stream = streamConversation(currentConversation, message, config);
        let fullContent = '';
        let finalCode: string | undefined;

        for await (const update of stream) {
          if (abortControllerRef.current?.signal.aborted) {
            break;
          }

          switch (update.type) {
            case 'text':
              fullContent += update.content;
              setStreamingContent(fullContent);
              break;
            case 'code':
              finalCode = update.content;
              break;
            case 'complete':
              if (finalCode) {
                onCodeChange?.(finalCode);
              }
              setConversation((prev) => {
                if (!prev) return prev;
                return {
                  ...prev,
                  messages: [
                    ...prev.messages,
                    {
                      id: `user-${Date.now()}`,
                      role: 'user' as const,
                      content: message,
                      timestamp: new Date(),
                    },
                    {
                      id: `assistant-${Date.now()}`,
                      role: 'assistant' as const,
                      content: fullContent.replace(/```[\s\S]*?```/g, '[Code updated]').trim(),
                      timestamp: new Date(),
                      codeSnapshot: finalCode,
                    },
                  ],
                  currentCode: finalCode || prev.currentCode,
                  updatedAt: new Date(),
                };
              });
              break;
            case 'error':
              setError(update.content);
              onError?.(update.content);
              break;
          }
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Streaming failed';
        setError(errorMsg);
        onError?.(errorMsg);
      } finally {
        setIsStreaming(false);
        setStreamingContent('');
        abortControllerRef.current = null;
      }
    },
    [conversation, initialCode, getConfig, initConversation, onCodeChange, onError]
  );

  const clearHistory = useCallback(() => {
    if (conversation) {
      setConversation(clearConversationHistory(conversation));
    }
    setError(null);
  }, [conversation]);

  const resetConversation = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setConversation(null);
    setIsProcessing(false);
    setIsStreaming(false);
    setStreamingContent('');
    setError(null);
  }, []);

  const getSummary = useCallback(() => {
    if (!conversation) return null;
    return getConversationSummary(conversation);
  }, [conversation]);

  return {
    conversation,
    messages: conversation?.messages || [],
    isProcessing,
    isStreaming,
    streamingContent,
    error,
    sendMessage,
    sendMessageStreaming,
    clearHistory,
    resetConversation,
    getSummary,
  };
}

export default useAIConversation;
