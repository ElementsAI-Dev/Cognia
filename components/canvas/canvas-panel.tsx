'use client';

/**
 * CanvasPanel - OpenAI-style canvas editing panel with Monaco Editor
 * Includes version history support
 */

import React, { useCallback, useEffect, useRef, useState, useMemo, useDeferredValue } from 'react';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import {
  X,
  Wand2,
  Bug,
  Languages,
  Sparkles,
  ArrowDownToLine,
  ArrowUpFromLine,
  Play,
  FileCode,
  FileText,
  Loader2,
  History,
  Save,
  Palette,
  ExternalLink,
  Eye,
  HelpCircle,
  Code,
  Copy,
  Check,
  Download,
  WrapText,
  Map,
  Hash,
  ChevronRight,
  ListTree,
} from 'lucide-react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useArtifactStore, useChatStore, useSessionStore, useSettingsStore } from '@/stores';
import type {
  ArtifactLanguage,
  CanvasAIWorkbenchState,
  CanvasActionAttachment,
  CanvasEditorContext,
  CanvasSuggestion,
} from '@/types';
import { cn } from '@/lib/utils';
import { loggers } from '@/lib/logger';
import { TRANSLATE_LANGUAGES, CANVAS_ACTIONS, FORMAT_ACTION_MAP } from '@/lib/canvas/constants';
import { VersionHistoryPanel } from './version-history-panel';
import { CodeExecutionPanel } from './code-execution-panel';
import { CanvasDocumentTabs } from './canvas-document-tabs';
import { SuggestionsPanel } from './suggestions-panel';
import { CollaborationPanel } from './collaboration-panel';
import { CommentPanel } from './comment-panel';
import { KeybindingSettings } from './keybinding-settings';
import {
  useCanvasCodeExecution,
  useCanvasDocuments,
  useCanvasSuggestions,
  useChunkLoader,
  useCanvasMonacoSetup,
  useCanvasActions,
  useCanvasAutoSave,
  useCanvasKeyboardShortcuts,
  type CodeSandboxExecutionResult,
  type CanvasCreateDocumentOptions,
  type CanvasSuggestionContext,
  type CanvasGenerateSuggestionsOptions,
  type UseCanvasAutoSaveOptions,
  type UseCanvasKeyboardShortcutsOptions,
} from '@/hooks/canvas';
import { useChunkedDocumentStore } from '@/stores/canvas/chunked-document-store';
import { useCanvasSettingsStore } from '@/stores/canvas/canvas-settings-store';
import {
  getCanvasPerformanceProfile,
  getMonacoLanguage,
  calculateDocumentStats,
  isDesignerCompatible,
  exportCanvasDocument,
} from '@/lib/canvas/utils';
import { symbolParser } from '@/lib/canvas/symbols/symbol-parser';
import { themeRegistry } from '@/lib/canvas/themes/theme-registry';
import { createEditorOptions } from '@/lib/monaco';
import { CanvasErrorBoundary } from './canvas-error-boundary';
import { CanvasDocumentList } from './canvas-document-list';
import { DocumentFormatToolbar, type FormatAction } from '@/components/document/document-format-toolbar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { V0Designer } from '@/components/designer';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Toggle } from '@/components/ui/toggle';
import {
  bindMonacoEditorContext,
  type MonacoContextBinding,
} from '@/lib/editor-workbench/monaco-context-binding';
import { isEditorFeatureFlagEnabled } from '@/lib/editor-workbench/feature-flags';
import { isCanvasFeatureFlagEnabled } from '@/lib/canvas/feature-flags';

// Dynamically import Monaco to avoid SSR issues
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col h-full p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-24" />
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-4 w-1/2" />
      <div className="flex-1" />
      <div className="flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    </div>
  ),
});

const actionIcons: Record<string, React.ReactNode> = {
  review: <Eye className="h-4 w-4" />,
  fix: <Bug className="h-4 w-4" />,
  improve: <Sparkles className="h-4 w-4" />,
  explain: <HelpCircle className="h-4 w-4" />,
  translate: <Languages className="h-4 w-4" />,
  simplify: <ArrowDownToLine className="h-4 w-4" />,
  expand: <ArrowUpFromLine className="h-4 w-4" />,
  format: <Code className="h-4 w-4" />,
  run: <Play className="h-4 w-4" />,
};

const EMPTY_CANVAS_AI_WORKBENCH: CanvasAIWorkbenchState = {
  promptDraft: '',
  selectedPresetAction: null,
  attachments: [],
  pendingReview: null,
  actionHistory: [],
  isInlineCommandOpen: false,
};

function createAttachmentSnapshot(content: string, maxLength = 320) {
  if (content.length <= maxLength) {
    return {
      snapshot: content,
      isTruncated: false,
    };
  }

  return {
    snapshot: `${content.slice(0, maxLength)}...`,
    isTruncated: true,
  };
}

function CanvasPanelContent() {
  const t = useTranslations('canvas');
  const panelOpen = useArtifactStore((state) => state.panelOpen);
  const panelView = useArtifactStore((state) => state.panelView);
  const closePanel = useArtifactStore((state) => state.closePanel);
  const activeCanvasId = useArtifactStore((state) => state.activeCanvasId);
  const canvasDocuments = useArtifactStore((state) => state.canvasDocuments);
  const artifacts = useArtifactStore((state) => state.artifacts);
  const updateCanvasDocument = useArtifactStore((state) => state.updateCanvasDocument);
  const saveCanvasVersion = useArtifactStore((state) => state.saveCanvasVersion);
  const theme = useSettingsStore((state) => state.theme);
  const globalEditorSettings = useSettingsStore((state) => state.editorSettings);
  const activeChatSession = useSessionStore((state) => state.getActiveSession());
  const chatMessages = useChatStore((state) => state.messages);
  const isCanvasAIWorkbenchEnabled = isCanvasFeatureFlagEnabled('canvas.aiWorkbench.v1');

  const activeDocument = activeCanvasId ? canvasDocuments[activeCanvasId] : null;
  const activeWorkbench = activeDocument?.aiWorkbench || EMPTY_CANVAS_AI_WORKBENCH;
  const [selection, setSelection] = useState<string>('');
  const [designerOpen, setDesignerOpen] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [showTranslateDialog, setShowTranslateDialog] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState('english');
  const [copied, setCopied] = useState(false);
  const [showExecutionPanel, setShowExecutionPanel] = useState(false);
  const workbenchBindingRef = useRef<MonacoContextBinding | null>(null);

  // Code execution hook
  const {
    isExecuting: isCodeExecuting,
    result: SandboxExecutionResult,
    execute: executeCode,
    cancel: cancelExecution,
    clear: clearExecution,
  } = useCanvasCodeExecution() as { isExecuting: boolean; result: CodeSandboxExecutionResult | null; execute: (code: string, language: string) => Promise<CodeSandboxExecutionResult>; cancel: () => void; clear: () => void };

  // Document management hook
  const {
    documents: allDocuments,
    openDocument,
    closeDocument,
    renameDocument,
    duplicateDocument,
    deleteDocument,
    createDocument,
  } = useCanvasDocuments();

  // AI suggestions hook
  const {
    suggestions: aiSuggestions,
    isGenerating: isGeneratingSuggestions,
    generateSuggestions,
  } = useCanvasSuggestions();

  // Auto-save hook
  const savedBaselineContent = useMemo(() => {
    if (!activeDocument) return '';

    const currentVersion = activeDocument.versions?.find(
      (version) => version.id === activeDocument.currentVersionId
    );
    const latestSavedVersion = activeDocument.versions?.[activeDocument.versions.length - 1];
    return currentVersion?.content ?? latestSavedVersion?.content ?? '';
  }, [activeDocument]);

  const autoSaveOptions: UseCanvasAutoSaveOptions = {
    documentId: activeCanvasId,
    content: activeDocument?.content || '',
    savedContent: savedBaselineContent,
    onSave: saveCanvasVersion,
    onContentUpdate: (id, content) => updateCanvasDocument(id, { content }),
  };
  const {
    localContent,
    setLocalContent,
    hasUnsavedChanges,
    handleEditorChange,
    handleManualSave,
    discardChanges,
  } = useCanvasAutoSave(autoSaveOptions);

  useEffect(() => {
    return () => {
      workbenchBindingRef.current?.dispose();
      workbenchBindingRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!activeDocument) {
      workbenchBindingRef.current?.dispose();
      workbenchBindingRef.current = null;
      return;
    }
    workbenchBindingRef.current?.update({
      languageId: getMonacoLanguage(activeDocument.language),
    });
  }, [activeCanvasId, activeDocument?.language]);

  // AI actions hook - handles streaming, diff preview, action execution
  const handleActionContentChange = useCallback(
    (newContent: string) => {
      setLocalContent(newContent);
      if (activeCanvasId) {
        updateCanvasDocument(activeCanvasId, { content: newContent });
      }
    },
    [activeCanvasId, updateCanvasDocument, setLocalContent]
  );

  const updateActiveWorkbench = useCallback(
    (updates: Partial<CanvasAIWorkbenchState>) => {
      if (!activeCanvasId) {
        return;
      }

      const baselineWorkbench: CanvasAIWorkbenchState = activeWorkbench || {
        promptDraft: '',
        selectedPresetAction: null,
        attachments: [],
        pendingReview: null,
        actionHistory: [],
        isInlineCommandOpen: false,
      };

      updateCanvasDocument(activeCanvasId, {
        aiWorkbench: {
          ...baselineWorkbench,
          ...updates,
          attachments: updates.attachments ?? baselineWorkbench.attachments,
          pendingReview:
            updates.pendingReview === undefined
              ? baselineWorkbench.pendingReview
              : updates.pendingReview,
          actionHistory: updates.actionHistory ?? baselineWorkbench.actionHistory,
          isInlineCommandOpen:
            updates.isInlineCommandOpen ?? baselineWorkbench.isInlineCommandOpen,
        },
      });
    },
    [activeCanvasId, activeWorkbench, updateCanvasDocument]
  );

  const {
    isProcessing,
    isStreaming,
    streamingContent,
    actionScope,
    actionError,
    actionResult,
    diffPreview,
    pendingReview,
    handleAction,
    submitActionRequest,
    acceptDiffChanges,
    rejectDiffChanges,
    acceptReviewItem,
    rejectReviewItem,
    applyAcceptedReviewItems,
    retryAction,
    setActionResult,
  } = useCanvasActions({
    content: localContent,
    language: (activeDocument?.language || 'markdown') as ArtifactLanguage,
    selection,
    activeCanvasId,
    onContentChange: handleActionContentChange,
    onGenerateSuggestions: generateSuggestions,
    workbenchState: activeWorkbench,
    onWorkbenchChange: updateActiveWorkbench,
  });

  // Canvas Monaco setup - integrates snippets, symbols, themes, plugins
  const performanceProfile = useMemo(
    () => getCanvasPerformanceProfile(localContent),
    [localContent]
  );

  const handleEditorContextChange = useCallback(
    (context: Record<string, unknown>) => {
      if (!activeCanvasId) return;

      updateCanvasDocument(activeCanvasId, {
        editorContext: {
          ...(context as Partial<CanvasEditorContext>),
          performanceMode: performanceProfile.mode,
        },
      });
    },
    [activeCanvasId, performanceProfile.mode, updateCanvasDocument]
  );

  const {
    symbols: documentSymbols,
    breadcrumb: symbolBreadcrumb,
    breadcrumbSymbols,
    activeLocation,
    availableThemes,
    activeThemeId: canvasThemeId,
    setActiveTheme: setCanvasTheme,
    handleEditorMount: onCanvasEditorMount,
    goToSymbol,
    goToBreadcrumb,
    editorRef: canvasEditorRef,
  } = useCanvasMonacoSetup({
    documentId: activeCanvasId,
    language: activeDocument?.language || 'plaintext',
    content: localContent,
    initialEditorContext: activeDocument?.editorContext || null,
    performanceProfile,
    onSelectionChange: setSelection,
    onEditorContextChange: handleEditorContextChange,
  });

  // Show/hide symbol outline
  const [showSymbolOutline, setShowSymbolOutline] = useState(false);

  // Large file optimization
  const {
    addChunkedDocument,
    removeChunkedDocument,
    updateDocument: updateChunkedDocument,
    chunkedDocuments,
  } = useChunkedDocumentStore();
  useChunkLoader(performanceProfile.enableChunking ? activeCanvasId : null);

  // Initialize chunked document for large files
  useEffect(() => {
    if (activeCanvasId && activeDocument && performanceProfile.enableChunking) {
      if (chunkedDocuments[activeCanvasId]) {
        updateChunkedDocument(activeCanvasId, localContent);
      } else {
        addChunkedDocument(activeCanvasId, localContent);
      }
    }
    if (
      activeCanvasId &&
      !performanceProfile.enableChunking &&
      chunkedDocuments[activeCanvasId]
    ) {
      removeChunkedDocument(activeCanvasId);
    }
  }, [
    activeCanvasId,
    activeDocument,
    addChunkedDocument,
    chunkedDocuments,
    localContent,
    performanceProfile.enableChunking,
    removeChunkedDocument,
    updateChunkedDocument,
  ]);

  useEffect(() => {
    return () => {
      if (activeCanvasId) {
        removeChunkedDocument(activeCanvasId);
      }
    };
  }, [activeCanvasId, removeChunkedDocument]);

  // Editor settings from persistent store
  const editorSettings = useCanvasSettingsStore((s) => s.settings.editor);
  const updateEditorSettings = useCanvasSettingsStore((s) => s.updateEditorSettings);

  // Check if current document can be opened in Designer
  const canOpenInDesigner = activeDocument && isDesignerCompatible(activeDocument.language);

  // Calculate document statistics
  const deferredLocalContent = useDeferredValue(localContent);
  const documentStats = useMemo(
    () =>
      calculateDocumentStats(
        performanceProfile.mode === 'very-large' ? deferredLocalContent : localContent
      ),
    [deferredLocalContent, localContent, performanceProfile.mode]
  );

  const sessionAttachmentCandidate = useMemo(() => {
    if (!activeChatSession || chatMessages.length === 0) {
      return null;
    }

    const recentConversation = chatMessages
      .slice(-3)
      .map((message) => `${message.role}: ${message.content}`)
      .join('\n\n');
    const snapshot = createAttachmentSnapshot(recentConversation);

    return {
      id: `session-${activeChatSession.id}`,
      sourceType: 'session-message' as const,
      sourceId: activeChatSession.id,
      label: activeChatSession.title || t('currentSessionContext'),
      snapshot: snapshot.snapshot,
      isTruncated: snapshot.isTruncated,
    };
  }, [activeChatSession, chatMessages, t]);

  const relatedCanvasAttachments = useMemo(() => {
    return allDocuments
      .filter((document) => document.id !== activeDocument?.id)
      .slice(0, 5)
      .map((document) => {
        const snapshot = createAttachmentSnapshot(document.content);
        return {
          id: `canvas-${document.id}`,
          sourceType: 'canvas-document' as const,
          sourceId: document.id,
          label: document.title,
          snapshot: snapshot.snapshot,
          isTruncated: snapshot.isTruncated,
        };
      });
  }, [activeDocument?.id, allDocuments]);

  const relatedArtifactAttachments = useMemo(() => {
    if (!activeDocument) {
      return [];
    }

    return Object.values(artifacts)
      .filter((artifact) => artifact.sessionId === activeDocument.sessionId)
      .slice(0, 5)
      .map((artifact) => {
        const snapshot = createAttachmentSnapshot(artifact.content);
        return {
          id: `artifact-${artifact.id}`,
          sourceType: 'artifact' as const,
          sourceId: artifact.id,
          label: artifact.title,
          snapshot: snapshot.snapshot,
          isTruncated: snapshot.isTruncated,
        };
      });
  }, [activeDocument, artifacts]);

  const reviewQueue = pendingReview || activeWorkbench.pendingReview;
  const reviewItems = reviewQueue?.items || [];
  const canApplyAcceptedChanges = reviewItems.some((item) => item.status === 'accepted');

  const toggleInlineCommand = useCallback(
    (open: boolean) => {
      updateActiveWorkbench({
        isInlineCommandOpen: open,
      });
    },
    [updateActiveWorkbench]
  );

  const updatePromptDraft = useCallback(
    (promptDraft: string) => {
      updateActiveWorkbench({
        promptDraft,
      });
    },
    [updateActiveWorkbench]
  );

  const addAttachment = useCallback(
    (attachment: CanvasActionAttachment) => {
      if (activeWorkbench.attachments.some((current) => current.id === attachment.id)) {
        return;
      }

      updateActiveWorkbench({
        attachments: [...activeWorkbench.attachments, attachment],
      });
    },
    [activeWorkbench.attachments, updateActiveWorkbench]
  );

  const removeAttachment = useCallback(
    (attachmentId: string) => {
      updateActiveWorkbench({
        attachments: activeWorkbench.attachments.filter(
          (attachment) => attachment.id !== attachmentId
        ),
      });
    },
    [activeWorkbench.attachments, updateActiveWorkbench]
  );

  const handleInlineCommandSubmit = useCallback(async () => {
    await submitActionRequest({
      actionType: activeWorkbench.selectedPresetAction || 'custom',
      prompt: activeWorkbench.promptDraft,
      entryPoint: 'inline',
      scope: selection && selection.trim() ? 'selection' : 'document',
      attachments: activeWorkbench.attachments,
    });
  }, [
    activeWorkbench.attachments,
    activeWorkbench.promptDraft,
    activeWorkbench.selectedPresetAction,
    selection,
    submitActionRequest,
  ]);

  const effectiveLocation = activeLocation || activeDocument?.editorContext?.location || null;
  const structureLocation = effectiveLocation?.path?.length
    ? effectiveLocation.path.join(' / ')
    : symbolBreadcrumb.length > 0
      ? symbolBreadcrumb.join(' / ')
      : null;
  const displayPerformanceMode = activeDocument?.editorContext?.performanceMode || performanceProfile.mode;
  const saveStateLabel = hasUnsavedChanges
    ? t('unsaved')
    : activeDocument?.editorContext?.saveState === 'autosaved'
      ? t('autosaved')
      : t('saved');
  const performanceModeLabel =
    displayPerformanceMode === 'very-large'
      ? t('veryLargeDocumentMode')
      : displayPerformanceMode === 'large'
        ? t('largeDocumentMode')
        : null;

  useEffect(() => {
    if (!activeCanvasId) return;
    if (activeDocument?.editorContext?.performanceMode === performanceProfile.mode) return;

    updateCanvasDocument(activeCanvasId, {
      editorContext: {
        performanceMode: performanceProfile.mode,
      },
    });
  }, [
    activeCanvasId,
    activeDocument?.editorContext?.performanceMode,
    performanceProfile.mode,
    updateCanvasDocument,
  ]);

  // Handle Designer code changes
  const handleDesignerCodeChange = useCallback(
    (newCode: string) => {
      handleEditorChange(newCode);
    },
    [handleEditorChange]
  );

  // Open in full Designer page
  const handleOpenInFullDesigner = useCallback(() => {
    if (activeDocument) {
      const key = `designer-canvas-${Date.now()}`;
      sessionStorage.setItem(key, localContent);
      window.open(`/designer?key=${key}`, '_blank');
    }
  }, [activeDocument, localContent]);

  // Handle close with unsaved changes confirmation
  const handleClose = useCallback(() => {
    if (hasUnsavedChanges) {
      setShowCloseConfirm(true);
    } else {
      closePanel();
    }
  }, [hasUnsavedChanges, closePanel]);

  const handleDiscardAndClose = useCallback(() => {
    discardChanges();
    closePanel();
  }, [discardChanges, closePanel]);

  // Copy action result to clipboard
  const handleCopyResult = useCallback(async () => {
    if (actionResult) {
      try {
        await navigator.clipboard.writeText(actionResult);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        loggers.ui.error('Failed to copy:', err);
      }
    }
  }, [actionResult]);

  // Export canvas document
  const handleExport = useCallback(() => {
    if (!activeDocument) return;
    exportCanvasDocument(activeDocument.title, localContent, activeDocument.language);
  }, [activeDocument, localContent]);

  // Handle translate action with language selection (defined after handleAction)
  const handleTranslateRef = React.useRef<() => Promise<void>>(() => Promise.resolve());

  // Keyboard shortcuts hook
  const keyboardShortcutOptions: UseCanvasKeyboardShortcutsOptions = {
    isActive: panelOpen && panelView === 'canvas',
    isProcessing,
    hasActiveDocument: !!activeDocument,
  };
  useCanvasKeyboardShortcuts(keyboardShortcutOptions);

  useEffect(() => {
    const handleInlineCommandEvent = () => {
      if (!isCanvasAIWorkbenchEnabled) {
        return;
      }
      toggleInlineCommand(true);
    };

    window.addEventListener('canvas-inline-command', handleInlineCommandEvent);
    return () => window.removeEventListener('canvas-inline-command', handleInlineCommandEvent);
  }, [isCanvasAIWorkbenchEnabled, toggleInlineCommand]);

  // Get Monaco theme from theme registry
  const monacoTheme = useMemo(() => {
    const editorTheme =
      theme === 'dark' ? themeRegistry.getTheme('vs-dark') : themeRegistry.getTheme('vs');
    return editorTheme ? editorTheme.id : theme === 'dark' ? 'vs-dark' : 'light';
  }, [theme]);

  // Update handleTranslate ref after handleAction is defined
  useEffect(() => {
    handleTranslateRef.current = async () => {
      if (!activeDocument) return;
      setShowTranslateDialog(false);
      await handleAction({ type: 'translate', labelKey: 'actionTranslate' }, targetLanguage);
    };
  }, [activeDocument, targetLanguage, handleAction]);

  const getLanguage = () => {
    if (!activeDocument) return 'plaintext';
    return getMonacoLanguage(activeDocument.language);
  };

  return (
    <Sheet
      open={panelOpen && panelView === 'canvas'}
      onOpenChange={(open) => {
        if (!open) {
          handleClose();
        }
      }}
    >
      <SheetContent
        key={activeCanvasId ?? 'canvas-list'}
        side="right"
        data-testid="canvas-panel"
        className="w-full sm:w-[600px] lg:w-[700px] p-0 flex flex-col"
        showCloseButton={false}
      >
        <SheetTitle className="sr-only">Canvas Panel</SheetTitle>
        {activeDocument ? (
          <>
            {/* Document Tabs - shown when multiple documents exist */}
            <CanvasDocumentTabs
              documents={allDocuments}
              activeDocumentId={activeCanvasId}
              onSelectDocument={openDocument}
              onCloseDocument={closeDocument}
              onCreateDocument={() =>
                createDocument({
                  title: 'Untitled',
                  content: '',
                  language: 'javascript',
                  type: 'code',
                })
              }
              onRenameDocument={renameDocument}
              onDuplicateDocument={duplicateDocument}
              onDeleteDocument={deleteDocument}
            />

            {/* Header */}
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="flex items-center gap-2">
                {activeDocument.type === 'code' ? (
                  <FileCode className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <FileText className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="font-medium">{activeDocument.title}</span>
                <Badge variant="secondary" className="text-xs">
                  {activeDocument.language}
                </Badge>
                {hasUnsavedChanges && (
                  <Badge variant="outline" className="text-xs">
                    {t('unsaved')}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {/* Manual Save Button */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      data-testid="canvas-save-version-button"
                      onClick={handleManualSave}
                      disabled={!hasUnsavedChanges}
                    >
                      <Save className={cn('h-4 w-4', hasUnsavedChanges && 'text-primary')} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('saveVersion')}</TooltipContent>
                </Tooltip>

                {/* Version History Button */}
                <VersionHistoryPanel
                  documentId={activeDocument.id}
                  trigger={
                    <Button variant="ghost" size="icon" data-testid="canvas-version-history-trigger">
                      <History className="h-4 w-4" />
                    </Button>
                  }
                />

                {/* Collaboration Panel */}
                <CollaborationPanel documentId={activeDocument.id} documentContent={localContent} />

                {/* Comment Panel */}
                <CommentPanel documentId={activeDocument.id} />

                {/* Keybinding Settings */}
                <KeybindingSettings />

                {/* Designer Buttons - More prominent for web code */}
                {canOpenInDesigner && (
                  <div className="flex items-center border rounded-md ml-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 rounded-r-none gap-1.5 px-2.5"
                          onClick={() => setDesignerOpen(true)}
                        >
                          <Palette className="h-4 w-4" />
                          <span className="text-xs">{t('preview')}</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{t('openInDesigner')}</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-l-none border-l"
                          onClick={handleOpenInFullDesigner}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{t('openInFullDesigner')}</TooltipContent>
                    </Tooltip>
                  </div>
                )}

                {/* Export Button */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      data-testid="canvas-export-button"
                      onClick={handleExport}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('export')}</TooltipContent>
                </Tooltip>

                <Button variant="ghost" size="icon" data-testid="canvas-close-button" onClick={handleClose}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-1 border-b px-4 py-2 overflow-x-auto">
              <TooltipProvider>
                {CANVAS_ACTIONS.slice(0, 5).map((action) => (
                  <Tooltip key={action.type}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2"
                        data-testid={`canvas-action-${action.type}`}
                        onClick={() => {
                          if (isCanvasAIWorkbenchEnabled) {
                            updateActiveWorkbench({
                              selectedPresetAction: action.type,
                            });
                          }
                          void handleAction(action);
                        }}
                        disabled={isProcessing}
                      >
                        {actionIcons[action.type]}
                        <span className="hidden sm:inline">{t(action.labelKey)}</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {t(action.labelKey)}
                        {action.shortcut && (
                          <span className="ml-2 text-muted-foreground">{action.shortcut}</span>
                        )}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                ))}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      {t('more')}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {CANVAS_ACTIONS.slice(5).map((action) => (
                      <DropdownMenuItem
                        key={action.type}
                        onClick={() => {
                          if (isCanvasAIWorkbenchEnabled) {
                            updateActiveWorkbench({
                              selectedPresetAction: action.type,
                            });
                          }
                          void handleAction(action);
                        }}
                        disabled={isProcessing}
                      >
                        {actionIcons[action.type] || <Wand2 className="h-4 w-4" />}
                        <span className="ml-2">{t(action.labelKey)}</span>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setShowTranslateDialog(true)}
                      disabled={isProcessing}
                    >
                      <Languages className="h-4 w-4" />
                      <span className="ml-2">{t('actionTranslate')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                        setShowExecutionPanel(true);
                        executeCode(localContent, activeDocument.language);
                      }}
                      disabled={isProcessing || isCodeExecuting}
                    >
                      <Play className="h-4 w-4" />
                      <span className="ml-2">{t('runCode')}</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {isProcessing && (
                  <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{t('processing')}</span>
                  </div>
                )}
              </TooltipProvider>
            </div>

            {isCanvasAIWorkbenchEnabled && (
              <div className="border-b px-4 py-3 bg-muted/10">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    data-testid="canvas-inline-command-trigger"
                    onClick={() => toggleInlineCommand(!activeWorkbench.isInlineCommandOpen)}
                  >
                    <Wand2 className="h-4 w-4 mr-2" />
                    {t('inlineCommand')}
                  </Button>
                  {activeWorkbench.selectedPresetAction && (
                    <Badge variant="secondary" className="text-[10px]">
                      {activeWorkbench.selectedPresetAction}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {selection && selection.trim() ? t('scopeSelection') : t('scopeDocument')}
                  </span>
                </div>

                {activeWorkbench.isInlineCommandOpen && (
                  <div
                    data-testid="canvas-inline-command-panel"
                    className="mt-3 space-y-3"
                  >
                    <textarea
                      data-testid="canvas-inline-command-input"
                      value={activeWorkbench.promptDraft}
                      onChange={(event) => updatePromptDraft(event.target.value)}
                      placeholder={t('inlineCommandPlaceholder')}
                      className="min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm"
                    />

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">
                          {t('selectedContext')}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {t('attachContext')}
                        </span>
                      </div>
                      <div
                        data-testid="canvas-inline-attachment-summary"
                        className="flex flex-wrap gap-2"
                      >
                        {activeWorkbench.attachments.length === 0 && (
                          <span className="text-xs text-muted-foreground">
                            {t('attachContext')}
                          </span>
                        )}
                        {activeWorkbench.attachments.map((attachment) => (
                          <Badge
                            key={attachment.id}
                            variant="outline"
                            className="gap-1 text-[10px]"
                          >
                            {attachment.label}
                            <button
                              type="button"
                              data-testid={`canvas-inline-attachment-remove-${attachment.id}`}
                              onClick={() => removeAttachment(attachment.id)}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {relatedCanvasAttachments.map((attachment) => (
                          <Button
                            key={attachment.id}
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            data-testid={`canvas-inline-attach-canvas-${attachment.sourceId}`}
                            onClick={() => addAttachment(attachment)}
                          >
                            {attachment.label}
                          </Button>
                        ))}
                        {relatedArtifactAttachments.map((attachment) => (
                          <Button
                            key={attachment.id}
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            data-testid={`canvas-inline-attach-artifact-${attachment.sourceId}`}
                            onClick={() => addAttachment(attachment)}
                          >
                            {attachment.label}
                          </Button>
                        ))}
                        {sessionAttachmentCandidate && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            data-testid="canvas-inline-attach-session"
                            onClick={() => addAttachment(sessionAttachmentCandidate)}
                          >
                            {sessionAttachmentCandidate.label}
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleInlineCommand(false)}
                      >
                        {t('cancel')}
                      </Button>
                      <Button
                        size="sm"
                        data-testid="canvas-inline-command-submit"
                        disabled={
                          isProcessing ||
                          (!activeWorkbench.promptDraft.trim() &&
                            !activeWorkbench.selectedPresetAction)
                        }
                        onClick={() => {
                          void handleInlineCommandSubmit();
                        }}
                      >
                        {t('runInlineCommand')}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="border-b px-4 py-2 bg-muted/20">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline" data-testid="canvas-save-state" className="text-[10px]">
                  {saveStateLabel}
                </Badge>
                {structureLocation && (
                  <span data-testid="canvas-structure-location" className="font-medium text-foreground/80">
                    {structureLocation}
                  </span>
                )}
                {effectiveLocation && (
                  <span data-testid="canvas-position-indicator">
                    {t('editorPosition', {
                      line: effectiveLocation.lineNumber,
                      column: effectiveLocation.column,
                    })}
                  </span>
                )}
                {performanceModeLabel && (
                  <Badge
                    variant="secondary"
                    data-testid="canvas-performance-mode"
                    className="text-[10px]"
                  >
                    {performanceModeLabel}
                  </Badge>
                )}
              </div>
              {activeDocument?.editorContext?.lastRestoredAt && (
                <div
                  data-testid="canvas-resume-notice"
                  className="mt-1 text-xs text-muted-foreground"
                >
                  {t('resumedEditing')}
                </div>
              )}
            </div>

            {displayPerformanceMode !== 'standard' && (
              <div className="px-4 py-2 border-b">
                <Alert data-testid="canvas-performance-alert">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{t('performanceModeNotice')}</AlertDescription>
                </Alert>
              </div>
            )}

            {actionScope && (
              <div
                className="flex items-center gap-2 px-4 py-1.5 bg-muted/30 border-b"
                data-testid="canvas-action-scope"
              >
                <Badge variant="outline" className="text-[10px]">
                  {t('aiScope')}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {actionScope === 'selection' ? t('scopeSelection') : t('scopeDocument')}
                </span>
              </div>
            )}

            {/* Document Format Toolbar - shown for non-code documents */}
            {activeDocument && activeDocument.type !== 'code' && (
              <DocumentFormatToolbar
                onFormatAction={(action: FormatAction) => {
                  const format = FORMAT_ACTION_MAP[action];
                  if (!format) return;

                  const editor = canvasEditorRef.current;
                  if (editor) {
                    const sel = editor.getSelection();
                    const model = editor.getModel();
                    if (sel && model) {
                      const selectedText = model.getValueInRange(sel);
                      const replacement = `${format.prefix}${selectedText}${format.suffix}`;
                      editor.executeEdits('format-toolbar', [{
                        range: sel,
                        text: replacement,
                      }]);
                      handleEditorChange(model.getValue());
                    } else {
                      // No selection: insert at cursor position
                      const pos = editor.getPosition();
                      const mdl = editor.getModel();
                      if (pos) {
                        const text = `${format.prefix}${format.suffix}`;
                        editor.executeEdits('format-toolbar', [{
                          range: {
                            startLineNumber: pos.lineNumber,
                            startColumn: pos.column,
                            endLineNumber: pos.lineNumber,
                            endColumn: pos.column,
                          },
                          text,
                        }]);
                        if (mdl) handleEditorChange(mdl.getValue());
                      }
                    }
                  }
                }}
                disabled={isProcessing}
                compact
                className="border-b"
              />
            )}

            {/* Quick actions for selected text */}
            {selection && selection.length > 0 && !isProcessing && (
              <div className="flex items-center gap-1 px-4 py-1.5 bg-primary/5 border-b">
                <span className="text-xs text-muted-foreground mr-2">{t('selectedText')}:</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => {
                    if (isCanvasAIWorkbenchEnabled) {
                      updateActiveWorkbench({
                        selectedPresetAction: 'explain',
                      });
                    }
                    void handleAction({ type: 'explain', labelKey: 'actionExplain' });
                  }}
                >
                  <HelpCircle className="h-3 w-3 mr-1" />
                  {t('actionExplain')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => {
                    if (isCanvasAIWorkbenchEnabled) {
                      updateActiveWorkbench({
                        selectedPresetAction: 'fix',
                      });
                    }
                    void handleAction({ type: 'fix', labelKey: 'actionFix' });
                  }}
                >
                  <Bug className="h-3 w-3 mr-1" />
                  {t('actionFix')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => {
                    if (isCanvasAIWorkbenchEnabled) {
                      updateActiveWorkbench({
                        selectedPresetAction: 'improve',
                      });
                    }
                    void handleAction({ type: 'improve', labelKey: 'actionImprove' });
                  }}
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  {t('actionImprove')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => setShowTranslateDialog(true)}
                >
                  <Languages className="h-3 w-3 mr-1" />
                  {t('actionTranslate')}
                </Button>
              </div>
            )}

            {/* Error display */}
            {actionError && (
              <Alert variant="destructive" className="mx-4 mt-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{actionError}</AlertDescription>
              </Alert>
            )}

            {/* Streaming indicator */}
            {isStreaming && (
              <div className="flex items-center gap-2 px-4 py-2 bg-primary/5 border-b">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-sm text-primary">{t('streaming')}</span>
                {streamingContent && (
                  <span className="text-xs text-muted-foreground ml-auto">
                    {streamingContent.length} chars
                  </span>
                )}
              </div>
            )}

            {/* Review queue / diff preview panel */}
            {diffPreview && diffPreview.length > 0 && (
              <div
                className="border-b max-h-72 overflow-auto bg-muted/10"
                data-testid={reviewQueue ? 'canvas-review-queue' : undefined}
              >
                <div className="flex items-center justify-between px-4 py-1.5 bg-muted/30 border-b">
                  <span className="text-xs font-medium">{t('diffPreview')}</span>
                  <div className="flex items-center gap-1">
                    {reviewQueue && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        data-testid="canvas-review-apply-selected"
                        disabled={!canApplyAcceptedChanges}
                        onClick={applyAcceptedReviewItems}
                      >
                        {t('applyAcceptedChanges')}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-green-600 hover:text-green-700"
                      data-testid="canvas-diff-accept"
                      onClick={acceptDiffChanges}
                    >
                      <Check className="h-3 w-3 mr-1" />
                      {t('acceptChanges')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-red-600 hover:text-red-700"
                      data-testid="canvas-diff-reject"
                      onClick={rejectDiffChanges}
                    >
                      <X className="h-3 w-3 mr-1" />
                      {t('rejectChanges')}
                    </Button>
                  </div>
                </div>

                {reviewQueue && reviewItems.length > 0 ? (
                  <div className="space-y-3 px-4 py-2">
                    {reviewItems.map((item, index) => (
                      <div
                        key={item.id}
                        data-testid={`canvas-review-item-${index}`}
                        className="rounded-md border bg-background/80"
                      >
                        <div className="flex items-center justify-between border-b px-3 py-2">
                          <div className="text-xs text-muted-foreground">
                            {item.changeType} · {item.range.startLine}
                            {item.range.endLine >= item.range.startLine
                              ? `-${item.range.endLine}`
                              : ''}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              data-testid={`canvas-review-item-accept-${index}`}
                              onClick={() => acceptReviewItem(item.id)}
                            >
                              {t('acceptItem')}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              data-testid={`canvas-review-item-reject-${index}`}
                              onClick={() => rejectReviewItem(item.id)}
                            >
                              {t('rejectItem')}
                            </Button>
                          </div>
                        </div>
                        <pre className="text-xs font-mono px-3 py-2">
                          {item.diffLines.map((line, lineIndex) => (
                            <div
                              key={`${item.id}-${lineIndex}`}
                              className={cn(
                                'px-2 py-0.5',
                                line.type === 'added' &&
                                  'bg-green-500/10 text-green-700 dark:text-green-400',
                                line.type === 'removed' &&
                                  'bg-red-500/10 text-red-700 dark:text-red-400 line-through',
                                line.type === 'unchanged' && 'text-muted-foreground'
                              )}
                            >
                              <span className="select-none mr-2 opacity-50">
                                {line.type === 'added'
                                  ? '+'
                                  : line.type === 'removed'
                                    ? '-'
                                    : ' '}
                              </span>
                              {line.content}
                            </div>
                          ))}
                        </pre>
                      </div>
                    ))}
                  </div>
                ) : (
                  <pre className="text-xs font-mono px-4 py-2">
                    {diffPreview.map((line, i) => (
                      <div
                        key={i}
                        className={cn(
                          'px-2 py-0.5',
                          line.type === 'added' &&
                            'bg-green-500/10 text-green-700 dark:text-green-400',
                          line.type === 'removed' &&
                            'bg-red-500/10 text-red-700 dark:text-red-400 line-through',
                          line.type === 'unchanged' && 'text-muted-foreground'
                        )}
                      >
                        <span className="select-none mr-2 opacity-50">
                          {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
                        </span>
                        {line.content}
                      </div>
                    ))}
                  </pre>
                )}
              </div>
            )}

            {/* Symbol breadcrumb */}
            {symbolBreadcrumb.length > 0 && (
              <div className="flex items-center gap-1 px-4 py-1 bg-muted/30 border-b text-xs text-muted-foreground overflow-x-auto">
                {symbolBreadcrumb.map((name, i) => (
                  <span key={`${name}-${i}`} className="flex items-center gap-1 shrink-0">
                    {i > 0 && <ChevronRight className="h-3 w-3" />}
                    <button
                      type="button"
                      data-testid={`canvas-breadcrumb-item-${i}`}
                      className="text-foreground/70 hover:text-foreground"
                      onClick={() => {
                        if (breadcrumbSymbols[i]) {
                          goToBreadcrumb(i);
                        }
                      }}
                    >
                      {name}
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Editor + Symbol Outline */}
            <div className="flex-1 overflow-hidden flex">
              {/* Symbol Outline Sidebar */}
              {showSymbolOutline && documentSymbols.length > 0 && (
                <div className="w-48 border-r overflow-auto bg-muted/20">
                  <div className="p-2 text-xs font-medium text-muted-foreground flex items-center gap-1 border-b">
                    <ListTree className="h-3.5 w-3.5" />
                    {t('symbolOutline')}
                  </div>
                  <div className="p-1">
                    {documentSymbols.map((sym) => (
                      <button
                        key={`${sym.name}-${sym.range.startLine}`}
                        data-testid={`canvas-symbol-${sym.name}`}
                        className="w-full text-left px-2 py-1 text-xs rounded hover:bg-muted/50 truncate flex items-center gap-1"
                        onClick={() => goToSymbol(sym)}
                      >
                        <span className="shrink-0">{symbolParser.getSymbolIcon(sym.kind)}</span>
                        <span className="truncate">{sym.name}</span>
                        <span className="text-muted-foreground ml-auto shrink-0">:{sym.range.startLine}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex-1 overflow-hidden">
              <MonacoEditor
                height="100%"
                language={getLanguage()}
                theme={monacoTheme}
                value={localContent}
                onChange={handleEditorChange}
                options={createEditorOptions('code', {
                  fontSize: editorSettings.fontSize,
                  fontFamily: editorSettings.fontFamily,
                  lineHeight: editorSettings.lineHeight,
                  tabSize: editorSettings.tabSize,
                  insertSpaces: editorSettings.insertSpaces,
                  lineNumbers: editorSettings.lineNumbers,
                  wordWrap: editorSettings.wordWrap ? 'on' : 'off',
                  renderWhitespace: editorSettings.renderWhitespace,
                  scrollBeyondLastLine: editorSettings.scrollBeyondLastLine,
                  cursorBlinking: editorSettings.cursorBlinking,
                  cursorStyle: editorSettings.cursorStyle,
                  smoothScrolling: editorSettings.smoothScrolling,
                  mouseWheelZoom: editorSettings.mouseWheelZoom,
                  bracketPairColorization: { enabled: editorSettings.bracketPairColorization },
                  guides: editorSettings.guides,
                  inlineSuggest: { enabled: true },
                  minimap: {
                    enabled:
                      performanceProfile.mode === 'very-large' ? false : editorSettings.minimap,
                    scale: 1,
                  },
                  stickyScroll: {
                    enabled: performanceProfile.showStickyScroll,
                    maxLineCount: 5,
                  },
                }, {
                  editorSettings: globalEditorSettings,
                })}
                onMount={(editor, monaco) => {
                  // Initialize canvas infrastructure (snippets, symbols, themes, plugins)
                  onCanvasEditorMount(editor, monaco);
                  if (isEditorFeatureFlagEnabled('editor.workbench.v2')) {
                    workbenchBindingRef.current?.dispose();
                    workbenchBindingRef.current = bindMonacoEditorContext({
                      contextId: 'canvas',
                      label: 'Canvas Editor',
                      languageId: activeDocument ? getMonacoLanguage(activeDocument.language) : 'plaintext',
                      editor,
                      fallbackReason: 'Using Monaco + canvas local providers',
                    });
                  }

                }}
              />
            </div>
            </div>

            {/* Code Execution Panel */}
            {showExecutionPanel && activeDocument?.type === 'code' && (
              <CodeExecutionPanel
                result={SandboxExecutionResult}
                isExecuting={isCodeExecuting}
                language={activeDocument.language}
                onExecute={() => executeCode(localContent, activeDocument.language)}
                onCancel={cancelExecution}
                onClear={() => {
                  clearExecution();
                  setShowExecutionPanel(false);
                }}
              />
            )}

            {/* Footer with stats and settings */}
            <div className="flex items-center justify-between border-t px-4 py-1.5 text-xs text-muted-foreground bg-muted/30">
              <div className="flex items-center gap-4">
                <span>
                  {documentStats.lines} {t('lines')}
                </span>
                <span>
                  {documentStats.words} {t('words')}
                </span>
                <span>
                  {documentStats.chars} {t('characters')}
                </span>
                {selection && (
                  <span className="text-primary">
                    {t('selectedChars', { count: selection.length })}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {/* Symbol outline toggle */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Toggle
                      size="sm"
                      data-testid="canvas-symbol-outline-toggle"
                      pressed={showSymbolOutline}
                      onPressedChange={setShowSymbolOutline}
                      aria-label={t('symbolOutline')}
                      className="h-6 w-6 p-0"
                    >
                      <ListTree className="h-3.5 w-3.5" />
                    </Toggle>
                  </TooltipTrigger>
                  <TooltipContent>{t('symbolOutline')}</TooltipContent>
                </Tooltip>

                {/* Theme picker */}
                <DropdownMenu>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <Palette className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent>{t('editorTheme')}</TooltipContent>
                  </Tooltip>
                  <DropdownMenuContent align="end">
                    {availableThemes.map((editorTheme) => (
                      <DropdownMenuItem
                        key={editorTheme.id}
                        onClick={() => setCanvasTheme(editorTheme.id)}
                        className={cn(canvasThemeId === editorTheme.id && 'bg-accent')}
                      >
                        <span
                          className="w-3 h-3 rounded-full mr-2 border"
                          style={{ backgroundColor: editorTheme.colors?.background || '#1e1e1e' }}
                        />
                        {editorTheme.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Toggle
                      size="sm"
                      pressed={editorSettings.wordWrap}
                      onPressedChange={(pressed) =>
                        updateEditorSettings({ wordWrap: pressed })
                      }
                      aria-label={t('wordWrap')}
                      className="h-6 w-6 p-0"
                    >
                      <WrapText className="h-3.5 w-3.5" />
                    </Toggle>
                  </TooltipTrigger>
                  <TooltipContent>{t('wordWrap')}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Toggle
                      size="sm"
                      pressed={editorSettings.minimap}
                      onPressedChange={(pressed) =>
                        updateEditorSettings({ minimap: pressed })
                      }
                      aria-label={t('minimap')}
                      className="h-6 w-6 p-0"
                    >
                      <Map className="h-3.5 w-3.5" />
                    </Toggle>
                  </TooltipTrigger>
                  <TooltipContent>{t('minimap')}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Toggle
                      size="sm"
                      pressed={editorSettings.lineNumbers === 'on'}
                      onPressedChange={(pressed) =>
                        updateEditorSettings({ lineNumbers: pressed ? 'on' : 'off' })
                      }
                      aria-label={t('lineNumbers')}
                      className="h-6 w-6 p-0"
                    >
                      <Hash className="h-3.5 w-3.5" />
                    </Toggle>
                  </TooltipTrigger>
                  <TooltipContent>{t('lineNumbers')}</TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Action result panel (for review/explain/run) */}
            {actionResult && (
              <div className="border-t max-h-[200px] overflow-auto">
                <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/50">
                  <span className="text-sm font-medium">{t('aiResponse')}</span>
                  <div className="flex items-center gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={handleCopyResult}
                        >
                          {copied ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{copied ? t('copied') : t('copy')}</TooltipContent>
                    </Tooltip>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => setActionResult(null)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <ScrollArea className="p-4">
                  <pre className="text-sm whitespace-pre-wrap">{actionResult}</pre>
                </ScrollArea>
              </div>
            )}

            {isCanvasAIWorkbenchEnabled && activeWorkbench.actionHistory.length > 0 && (
              <div className="border-t px-4 py-3" data-testid="canvas-ai-history">
                <div className="mb-2 text-xs font-medium text-muted-foreground">
                  {t('recentAiActions')}
                </div>
                <div className="space-y-2">
                  {activeWorkbench.actionHistory
                    .slice(-3)
                    .reverse()
                    .map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between rounded-md border px-3 py-2"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm">
                            {entry.prompt || entry.actionType}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {entry.entryPoint} · {entry.scope}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          data-testid={`canvas-ai-history-retry-${entry.id}`}
                          onClick={() => {
                            void retryAction(entry.id);
                          }}
                        >
                          {t('retryAction')}
                        </Button>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Suggestions panel - shows both store suggestions and hook-generated ones */}
            {((activeDocument.aiSuggestions && activeDocument.aiSuggestions.length > 0) ||
              aiSuggestions.length > 0 ||
              isGeneratingSuggestions) && (
              <SuggestionsPanel
                documentId={activeDocument.id}
                suggestions={[
                  ...(activeDocument.aiSuggestions || []),
                  ...aiSuggestions.filter((s: CanvasSuggestion) => s.status === 'pending'),
                ]}
                isGenerating={isGeneratingSuggestions}
              />
            )}

            {/* Unsaved changes confirmation dialog */}
            {showCloseConfirm && (
              <AlertDialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('unsavedChanges')}</AlertDialogTitle>
                    <AlertDialogDescription>{t('unsavedChangesDescription')}</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel data-testid="canvas-close-confirm-cancel">
                      {t('cancel')}
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        handleManualSave();
                        closePanel();
                      }}
                      className="bg-primary"
                      data-testid="canvas-close-confirm-save"
                    >
                      {t('saveAndClose')}
                    </AlertDialogAction>
                    <AlertDialogAction
                      onClick={handleDiscardAndClose}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      data-testid="canvas-close-confirm-discard"
                    >
                      {t('discardAndClose')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {/* Translate language selection dialog */}
            {showTranslateDialog && (
              <Dialog open={showTranslateDialog} onOpenChange={setShowTranslateDialog}>
                <DialogContent className="w-[95vw] sm:max-w-[400px]">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Languages className="h-5 w-5" />
                      {t('selectTargetLanguage')}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('selectLanguage')} />
                      </SelectTrigger>
                      <SelectContent>
                        {TRANSLATE_LANGUAGES.map((lang) => (
                          <SelectItem key={lang.value} value={lang.value}>
                            {lang.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowTranslateDialog(false)}>
                        {t('cancel')}
                      </Button>
                      <Button onClick={() => handleTranslateRef.current()} disabled={isProcessing}>
                        {isProcessing ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Languages className="h-4 w-4 mr-2" />
                        )}
                        {t('translate')}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </>
        ) : (
          <CanvasDocumentList
            documents={allDocuments}
            activeDocumentId={activeCanvasId}
            onSelectDocument={openDocument}
            onCreateDocument={(options: CanvasCreateDocumentOptions) => {
              const id = createDocument(options);
              openDocument(id);
            }}
            onRenameDocument={renameDocument}
            onDuplicateDocument={duplicateDocument}
            onDeleteDocument={deleteDocument}
          />
        )}

        {/* V0 Designer Panel */}
        {activeDocument && canOpenInDesigner && designerOpen && (
          <V0Designer
            open={designerOpen}
            onOpenChange={setDesignerOpen}
            initialCode={localContent}
            onCodeChange={handleDesignerCodeChange}
            onSave={(code) => {
              handleDesignerCodeChange(code);
              setDesignerOpen(false);
            }}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

export function CanvasPanel() {
  return (
    <CanvasErrorBoundary
      onError={(error, errorInfo) => {
        loggers.ui.error('Canvas error caught:', error, { errorInfo });
      }}
    >
      <CanvasPanelContent />
    </CanvasErrorBoundary>
  );
}


