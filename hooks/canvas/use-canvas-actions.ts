'use client';

/**
 * useCanvasActions - Encapsulates AI action logic for Canvas
 * Handles streaming, diff preview, action execution, and error state
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSettingsStore, useSessionStore } from '@/stores';
import {
  executeCanvasAction,
  executeCanvasActionStreaming,
  applyCanvasActionResult,
  generateDiffPreview,
  type CanvasActionType,
  type DiffLine,
} from '@/lib/ai/generation/canvas-actions';
import type { ProviderName } from '@/lib/ai/core/client';

export interface CanvasActionConfig {
  type: CanvasActionType;
  labelKey?: string;
  label?: string;
  icon?: string;
  shortcut?: string;
}

export interface UseCanvasActionsOptions {
  content: string;
  language: string;
  selection: string;
  activeCanvasId: string | null;
  onContentChange: (content: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onGenerateSuggestions: (...args: any[]) => any;
}

export interface UseCanvasActionsReturn {
  isProcessing: boolean;
  isStreaming: boolean;
  streamingContent: string;
  actionError: string | null;
  actionResult: string | null;
  diffPreview: DiffLine[] | null;
  pendingContent: string | null;
  handleAction: (action: CanvasActionConfig, translateTargetLang?: string) => Promise<void>;
  acceptDiffChanges: () => void;
  rejectDiffChanges: () => void;
  setActionError: (error: string | null) => void;
  setActionResult: (result: string | null) => void;
}

export function useCanvasActions(options: UseCanvasActionsOptions): UseCanvasActionsReturn {
  const {
    content,
    language,
    selection,
    activeCanvasId,
    onContentChange,
    onGenerateSuggestions,
  } = options;

  const [isProcessing, setIsProcessing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [diffPreview, setDiffPreview] = useState<DiffLine[] | null>(null);
  const [pendingContent, setPendingContent] = useState<string | null>(null);

  const providerSettings = useSettingsStore((state) => state.providerSettings);
  const defaultProvider = useSettingsStore((state) => state.defaultProvider);
  const getActiveSession = useSessionStore((state) => state.getActiveSession);

  // Keep content ref up to date for callbacks
  const contentRef = useRef(content);
  contentRef.current = content;

  const handleAction = useCallback(
    async (action: CanvasActionConfig, translateTargetLang?: string) => {
      if (!activeCanvasId) return;

      setIsProcessing(true);
      setActionError(null);
      setActionResult(null);

      const session = getActiveSession();
      const provider = (session?.provider || defaultProvider || 'openai') as ProviderName;
      const model = session?.model || providerSettings[provider]?.defaultModel || 'gpt-4o-mini';
      const settings = providerSettings[provider];

      if (!settings?.apiKey && provider !== 'ollama') {
        setActionError(
          `No API key configured for ${provider}. Please add your API key in Settings.`
        );
        setIsProcessing(false);
        return;
      }

      const contentActions = ['fix', 'improve', 'simplify', 'expand', 'translate', 'format'];
      const isContentAction = contentActions.includes(action.type);
      const actionConfig = {
        provider,
        model,
        apiKey: settings?.apiKey || '',
        baseURL: settings?.baseURL,
      };
      const actionOptions = {
        language,
        selection: selection || undefined,
        targetLanguage: translateTargetLang,
      };

      try {
        if (isContentAction) {
          setIsStreaming(true);
          setStreamingContent('');

          await executeCanvasActionStreaming(
            action.type as CanvasActionType,
            contentRef.current,
            actionConfig,
            {
              onToken: (token) => {
                setStreamingContent((prev) => prev + token);
              },
              onComplete: (fullText) => {
                setIsStreaming(false);
                const newContent = applyCanvasActionResult(
                  contentRef.current,
                  fullText,
                  selection || undefined
                );
                const diff = generateDiffPreview(contentRef.current, newContent);
                setDiffPreview(diff);
                setPendingContent(newContent);
                setStreamingContent('');
              },
              onError: (error) => {
                setIsStreaming(false);
                setStreamingContent('');
                setActionError(error);
              },
            },
            actionOptions
          );
        } else {
          const result = await executeCanvasAction(
            action.type as CanvasActionType,
            contentRef.current,
            actionConfig,
            actionOptions
          );

          if (result.success && result.result) {
            if (action.type === 'review') {
              onGenerateSuggestions(
                {
                  content: contentRef.current,
                  language,
                  selection: selection || undefined,
                },
                { focusArea: 'all' }
              );
              setActionResult(result.result);
            } else {
              setActionResult(result.result);
            }
          } else if (!result.success) {
            setActionError(result.error || 'Action failed');
          }
        }
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'An error occurred');
        setIsStreaming(false);
        setStreamingContent('');
      } finally {
        setIsProcessing(false);
      }
    },
    [
      activeCanvasId,
      getActiveSession,
      defaultProvider,
      providerSettings,
      language,
      selection,
      onGenerateSuggestions,
    ]
  );

  const acceptDiffChanges = useCallback(() => {
    if (pendingContent !== null) {
      onContentChange(pendingContent);
      setDiffPreview(null);
      setPendingContent(null);
    }
  }, [pendingContent, onContentChange]);

  const rejectDiffChanges = useCallback(() => {
    setDiffPreview(null);
    setPendingContent(null);
  }, []);

  // Listen for canvas-action custom events
  useEffect(() => {
    const handleCanvasAction = (e: Event) => {
      const action = (e as CustomEvent).detail;
      if (action && !isProcessing) {
        handleAction(action);
      }
    };

    window.addEventListener('canvas-action', handleCanvasAction);
    return () => window.removeEventListener('canvas-action', handleCanvasAction);
  }, [isProcessing, handleAction]);

  return {
    isProcessing,
    isStreaming,
    streamingContent,
    actionError,
    actionResult,
    diffPreview,
    pendingContent,
    handleAction,
    acceptDiffChanges,
    rejectDiffChanges,
    setActionError,
    setActionResult,
  };
}

export default useCanvasActions;
