'use client';

/**
 * useCanvasActions - Encapsulates AI action logic for Canvas
 * Handles streaming, diff preview, action execution, review state, and history metadata
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { nanoid } from 'nanoid';
import { useSettingsStore, useSessionStore } from '@/stores';
import {
  executeCanvasAction,
  executeCanvasActionStreaming,
  applyCanvasActionResult,
  applyAcceptedCanvasReviewItems,
  buildCanvasReview,
  type CanvasActionType,
  type DiffLine,
} from '@/lib/ai/generation/canvas-actions';
import type { ProviderName } from '@/lib/ai/core/client';
import type {
  ArtifactLanguage,
  CanvasAIWorkbenchState,
  CanvasActionAttachment,
  CanvasActionEntryPoint,
  CanvasActionHistoryEntry,
  CanvasActionScope,
  CanvasPendingReview,
} from '@/types/artifact/artifact';
import type {
  SuggestionContext as CanvasSuggestionContext,
  GenerateSuggestionsOptions as CanvasGenerateSuggestionsOptions,
} from './use-canvas-suggestions';

interface CanvasActionMockRequest {
  actionType: CanvasActionType;
  content: string;
  language: string;
  selection?: string;
  targetLanguage?: string;
  prompt?: string;
}

interface CanvasActionMockResponse {
  result: string;
}

function getCanvasActionMockResult(
  request: CanvasActionMockRequest
): CanvasActionMockResponse | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const mockBridge = (
    window as Window & {
      __COGNIA_CANVAS_ACTION_TEST__?: {
        getResult?: (req: CanvasActionMockRequest) => CanvasActionMockResponse | null;
      };
    }
  ).__COGNIA_CANVAS_ACTION_TEST__;

  try {
    return mockBridge?.getResult?.(request) || null;
  } catch {
    return null;
  }
}

export interface CanvasActionConfig {
  type: Exclude<CanvasActionType, 'custom'>;
  labelKey?: string;
  label?: string;
  icon?: string;
  shortcut?: string;
}

export interface CanvasActionRequestInput {
  actionType: CanvasActionType;
  prompt?: string;
  entryPoint?: CanvasActionEntryPoint;
  scope?: CanvasActionScope;
  attachments?: CanvasActionAttachment[];
  targetLanguage?: string;
  lineageId?: string;
}

export interface UseCanvasActionsOptions {
  content: string;
  language: ArtifactLanguage | string;
  selection: string;
  activeCanvasId: string | null;
  onContentChange: (content: string) => void;
  onGenerateSuggestions: (
    context: CanvasSuggestionContext,
    options?: CanvasGenerateSuggestionsOptions
  ) => Promise<unknown>;
  workbenchState?: CanvasAIWorkbenchState;
  onWorkbenchChange?: (updates: Partial<CanvasAIWorkbenchState>) => void;
}

export interface UseCanvasActionsReturn {
  isProcessing: boolean;
  isStreaming: boolean;
  streamingContent: string;
  actionScope: CanvasActionScope | null;
  actionError: string | null;
  actionResult: string | null;
  diffPreview: DiffLine[] | null;
  pendingContent: string | null;
  pendingReview: CanvasPendingReview | null;
  handleAction: (action: CanvasActionConfig, translateTargetLang?: string) => Promise<void>;
  submitActionRequest: (request: CanvasActionRequestInput) => Promise<void>;
  acceptDiffChanges: () => void;
  rejectDiffChanges: () => void;
  acceptReviewItem: (itemId: string) => void;
  rejectReviewItem: (itemId: string) => void;
  applyAcceptedReviewItems: () => void;
  retryAction: (historyEntryId: string) => Promise<void>;
  setActionError: (error: string | null) => void;
  setActionResult: (result: string | null) => void;
}

function buildActionHistoryEntry(
  requestId: string,
  request: CanvasActionRequestInput,
  attachments: CanvasActionAttachment[]
): CanvasActionHistoryEntry {
  return {
    id: nanoid(),
    requestId,
    actionType: request.actionType,
    prompt: request.prompt || '',
    scope: request.scope || 'document',
    entryPoint: request.entryPoint || 'toolbar',
    createdAt: new Date(),
    status: 'pending-review',
    attachmentSummary: attachments.map((attachment) => attachment.label),
    attachments,
    lineageId: request.lineageId,
  };
}

function updateHistoryEntryStatus(
  actionHistory: CanvasActionHistoryEntry[],
  requestId: string,
  status: CanvasActionHistoryEntry['status'],
  extras?: Partial<CanvasActionHistoryEntry>
): CanvasActionHistoryEntry[] {
  return actionHistory.map((entry) =>
    entry.requestId === requestId
      ? {
          ...entry,
          ...extras,
          status,
        }
      : entry
  );
}

export function useCanvasActions(options: UseCanvasActionsOptions): UseCanvasActionsReturn {
  const {
    content,
    language,
    selection,
    activeCanvasId,
    onContentChange,
    onGenerateSuggestions,
    workbenchState,
    onWorkbenchChange,
  } = options;

  const [isProcessing, setIsProcessing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [actionScope, setActionScope] = useState<CanvasActionScope | null>(null);
  const [diffPreview, setDiffPreview] = useState<DiffLine[] | null>(null);
  const [pendingContent, setPendingContent] = useState<string | null>(null);
  const [pendingReview, setPendingReview] = useState<CanvasPendingReview | null>(
    workbenchState?.pendingReview || null
  );

  const providerSettings = useSettingsStore((state) => state.providerSettings);
  const defaultProvider = useSettingsStore((state) => state.defaultProvider);
  const getActiveSession = useSessionStore((state) => state.getActiveSession);

  const contentRef = useRef(content);
  contentRef.current = content;

  const workbenchRef = useRef(workbenchState);
  workbenchRef.current = workbenchState;

  useEffect(() => {
    setPendingReview(workbenchState?.pendingReview || null);
  }, [activeCanvasId, workbenchState?.pendingReview]);

  const syncWorkbench = useCallback(
    (updates: Partial<CanvasAIWorkbenchState>) => {
      onWorkbenchChange?.(updates);
    },
    [onWorkbenchChange]
  );

  const markPendingReviewInvalidated = useCallback(
    (reason: string) => {
      setActionError(reason);
      setPendingReview((currentReview) => {
        if (!currentReview) {
          return currentReview;
        }

        const invalidatedReview: CanvasPendingReview = {
          ...currentReview,
          status: 'invalidated',
          isStale: true,
          items: currentReview.items.map((item) => ({
            ...item,
            status: item.status === 'accepted' ? item.status : 'invalidated',
          })),
        };
        syncWorkbench({
          pendingReview: invalidatedReview,
          actionHistory: updateHistoryEntryStatus(
            workbenchRef.current?.actionHistory || [],
            currentReview.requestId,
            'invalidated'
          ),
        });
        return invalidatedReview;
      });
    },
    [syncWorkbench]
  );

  const finalizeReview = useCallback(
    (nextContent: string | null, status: CanvasActionHistoryEntry['status']) => {
      setPendingReview((currentReview) => {
        if (!currentReview) {
          return currentReview;
        }

        if (currentReview.originalContent !== contentRef.current) {
          markPendingReviewInvalidated(
            'Canvas content changed after AI generation. Retry the action to review fresh changes.'
          );
          return currentReview;
        }

        if (nextContent !== null) {
          onContentChange(nextContent);
        }

        syncWorkbench({
          pendingReview: null,
          actionHistory: updateHistoryEntryStatus(
            workbenchRef.current?.actionHistory || [],
            currentReview.requestId,
            status
          ),
        });
        return null;
      });
      setDiffPreview(null);
      setPendingContent(null);
      setActionScope(null);
    },
    [markPendingReviewInvalidated, onContentChange, syncWorkbench]
  );

  const acceptReviewItem = useCallback(
    (itemId: string) => {
      setPendingReview((currentReview) => {
        if (!currentReview) {
          return currentReview;
        }
        const nextReview: CanvasPendingReview = {
          ...currentReview,
          status: 'partial',
          items: currentReview.items.map((item) =>
            item.id === itemId ? { ...item, status: 'accepted' } : item
          ),
        };
        syncWorkbench({ pendingReview: nextReview });
        return nextReview;
      });
    },
    [syncWorkbench]
  );

  const rejectReviewItem = useCallback(
    (itemId: string) => {
      setPendingReview((currentReview) => {
        if (!currentReview) {
          return currentReview;
        }
        const nextReview: CanvasPendingReview = {
          ...currentReview,
          status: 'partial',
          items: currentReview.items.map((item) =>
            item.id === itemId ? { ...item, status: 'rejected' } : item
          ),
        };
        syncWorkbench({ pendingReview: nextReview });
        return nextReview;
      });
    },
    [syncWorkbench]
  );

  const applyAcceptedReviewItems = useCallback(() => {
    if (!pendingReview) {
      return;
    }

    const nextContent = applyAcceptedCanvasReviewItems(
      pendingReview.originalContent,
      pendingReview.items
    );
    finalizeReview(nextContent, 'completed');
  }, [finalizeReview, pendingReview]);

  const acceptDiffChanges = useCallback(() => {
    if (!pendingReview) {
      return;
    }

    const hasExplicitDecisions = pendingReview.items.some(
      (item) => item.status !== 'pending'
    );

    if (hasExplicitDecisions) {
      applyAcceptedReviewItems();
      return;
    }

    finalizeReview(pendingReview.proposedContent, 'completed');
  }, [applyAcceptedReviewItems, finalizeReview, pendingReview]);

  const rejectDiffChanges = useCallback(() => {
    finalizeReview(null, 'rejected');
  }, [finalizeReview]);

  const submitActionRequest = useCallback(
    async (request: CanvasActionRequestInput) => {
      if (!activeCanvasId) return;

      setIsProcessing(true);
      setActionError(null);
      setActionResult(null);

      const session = getActiveSession();
      const provider = (session?.provider || defaultProvider || 'openai') as ProviderName;
      const model = session?.model || providerSettings[provider]?.defaultModel || 'gpt-4o-mini';
      const settings = providerSettings[provider];
      const normalizedScope =
        request.scope || (selection && selection.trim() ? 'selection' : 'document');
      const attachments =
        request.attachments || workbenchRef.current?.attachments || [];
      const requestId = nanoid();
      const actionHistoryEntry = buildActionHistoryEntry(requestId, {
        ...request,
        scope: normalizedScope,
      }, attachments);

      setActionScope(normalizedScope);

      if (!settings?.apiKey && provider !== 'ollama') {
        const error = `No API key configured for ${provider}. Please add your API key in Settings.`;
        setActionError(error);
        syncWorkbench({
          actionHistory: [
            ...(workbenchRef.current?.actionHistory || []),
            {
              ...actionHistoryEntry,
              status: 'failed',
              error,
            },
          ],
        });
        setActionScope(null);
        setIsProcessing(false);
        return;
      }

      const actionConfig = {
        provider,
        model,
        apiKey: settings?.apiKey || '',
        baseURL: settings?.baseURL,
      };
      const actionOptions = {
        language,
        selection: normalizedScope === 'selection' ? selection || undefined : undefined,
        targetLanguage: request.targetLanguage,
        prompt: request.prompt || workbenchRef.current?.promptDraft || undefined,
        attachments,
      };

      try {
        if (['review', 'explain', 'run'].includes(request.actionType)) {
          const result = await executeCanvasAction(
            request.actionType,
            contentRef.current,
            actionConfig,
            actionOptions
          );

          if (result.success && result.result) {
            if (request.actionType === 'review') {
              onGenerateSuggestions(
                {
                  content: contentRef.current,
                  language: language as ArtifactLanguage,
                  selection: actionOptions.selection,
                },
                { focusArea: 'all' }
              );
            }

            setActionResult(result.result);
            syncWorkbench({
              actionHistory: [
                ...(workbenchRef.current?.actionHistory || []),
                {
                  ...actionHistoryEntry,
                  status: 'completed',
                },
              ],
            });
          } else {
            const error = result.error || 'Action failed';
            setActionError(error);
            syncWorkbench({
              actionHistory: [
                ...(workbenchRef.current?.actionHistory || []),
                {
                  ...actionHistoryEntry,
                  status: 'failed',
                  error,
                },
              ],
            });
          }
          return;
        }

        const mockResult = getCanvasActionMockResult({
          actionType: request.actionType,
          content: contentRef.current,
          language,
          selection: actionOptions.selection,
          targetLanguage: actionOptions.targetLanguage,
          prompt: actionOptions.prompt,
        });

        const handleCompletedContentAction = (resultText: string) => {
          const newContent = applyCanvasActionResult(
            contentRef.current,
            resultText,
            actionOptions.selection
          );
          const review = buildCanvasReview({
            requestId,
            actionType: request.actionType,
            originalContent: contentRef.current,
            proposedContent: newContent,
          });
          const preview = review.items.flatMap((item) => item.diffLines);
          setPendingReview(review);
          setPendingContent(newContent);
          setDiffPreview(preview);
          syncWorkbench({
            pendingReview: review,
            actionHistory: [
              ...(workbenchRef.current?.actionHistory || []),
              {
                ...actionHistoryEntry,
                reviewId: review.id,
              },
            ],
          });
        };

        if (mockResult) {
          handleCompletedContentAction(mockResult.result);
          return;
        }

        setIsStreaming(true);
        setStreamingContent('');

        await executeCanvasActionStreaming(
          request.actionType,
          contentRef.current,
          actionConfig,
          {
            onToken: (token) => {
              setStreamingContent((previous) => previous + token);
            },
            onComplete: (fullText) => {
              setIsStreaming(false);
              setStreamingContent('');
              handleCompletedContentAction(fullText);
            },
            onError: (error) => {
              setIsStreaming(false);
              setStreamingContent('');
              setActionError(error);
              setActionScope(null);
              syncWorkbench({
                actionHistory: [
                  ...(workbenchRef.current?.actionHistory || []),
                  {
                    ...actionHistoryEntry,
                    status: 'failed',
                    error,
                  },
                ],
              });
            },
          },
          actionOptions
        );
      } catch (err) {
        const error = err instanceof Error ? err.message : 'An error occurred';
        setActionError(error);
        setIsStreaming(false);
        setStreamingContent('');
        setActionScope(null);
        syncWorkbench({
          actionHistory: [
            ...(workbenchRef.current?.actionHistory || []),
            {
              ...actionHistoryEntry,
              status: 'failed',
              error,
            },
          ],
        });
      } finally {
        setIsProcessing(false);
      }
    },
    [
      activeCanvasId,
      defaultProvider,
      getActiveSession,
      language,
      onGenerateSuggestions,
      providerSettings,
      selection,
      syncWorkbench,
    ]
  );

  const handleAction = useCallback(
    async (action: CanvasActionConfig, translateTargetLang?: string) => {
      await submitActionRequest({
        actionType: action.type,
        prompt: workbenchRef.current?.promptDraft || '',
        entryPoint: 'toolbar',
        scope: selection && selection.trim() ? 'selection' : 'document',
        attachments: workbenchRef.current?.attachments || [],
        targetLanguage: translateTargetLang,
      });
    },
    [selection, submitActionRequest]
  );

  const retryAction = useCallback(
    async (historyEntryId: string) => {
      const entry = (workbenchRef.current?.actionHistory || []).find(
        (historyEntry) => historyEntry.id === historyEntryId
      );
      if (!entry) {
        return;
      }

      syncWorkbench({
        promptDraft: entry.prompt,
        attachments: entry.attachments || [],
        selectedPresetAction: entry.actionType === 'custom' ? null : entry.actionType,
        isInlineCommandOpen: true,
      });

      await submitActionRequest({
        actionType: entry.actionType,
        prompt: entry.prompt,
        entryPoint: 'retry',
        scope: entry.scope,
        attachments: entry.attachments || [],
        lineageId: entry.requestId,
      });
    },
    [submitActionRequest, syncWorkbench]
  );

  useEffect(() => {
    const handleCanvasAction = (event: Event) => {
      const action = (event as CustomEvent<CanvasActionConfig>).detail;
      if (action && !isProcessing) {
        void handleAction(action);
      }
    };

    window.addEventListener('canvas-action', handleCanvasAction);
    return () => window.removeEventListener('canvas-action', handleCanvasAction);
  }, [handleAction, isProcessing]);

  return {
    isProcessing,
    isStreaming,
    streamingContent,
    actionScope,
    actionError,
    actionResult,
    diffPreview,
    pendingContent,
    pendingReview,
    handleAction,
    submitActionRequest,
    acceptDiffChanges,
    rejectDiffChanges,
    acceptReviewItem,
    rejectReviewItem,
    applyAcceptedReviewItems,
    retryAction,
    setActionError,
    setActionResult,
  };
}

export default useCanvasActions;
