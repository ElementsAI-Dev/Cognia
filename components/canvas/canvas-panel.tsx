'use client';

/**
 * CanvasPanel - OpenAI-style canvas editing panel with Monaco Editor
 * Includes version history support
 */

import React, { useCallback, useEffect, useState, useMemo } from 'react';
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
import { useArtifactStore, useSettingsStore } from '@/stores';
import type { CanvasSuggestion } from '@/types';
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
} from '@/hooks/canvas';
import { useChunkedDocumentStore } from '@/stores/canvas/chunked-document-store';
import { useCanvasSettingsStore } from '@/stores/canvas/canvas-settings-store';
import { isLargeDocument, getMonacoLanguage, calculateDocumentStats, isDesignerCompatible, exportCanvasDocument } from '@/lib/canvas/utils';
import { symbolParser } from '@/lib/canvas/symbols/symbol-parser';
import { themeRegistry } from '@/lib/canvas/themes/theme-registry';
import { createEditorOptions } from '@/lib/monaco';
import { CanvasErrorBoundary } from './canvas-error-boundary';
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

function CanvasPanelContent() {
  const t = useTranslations('canvas');
  const panelOpen = useArtifactStore((state) => state.panelOpen);
  const panelView = useArtifactStore((state) => state.panelView);
  const closePanel = useArtifactStore((state) => state.closePanel);
  const activeCanvasId = useArtifactStore((state) => state.activeCanvasId);
  const canvasDocuments = useArtifactStore((state) => state.canvasDocuments);
  const updateCanvasDocument = useArtifactStore((state) => state.updateCanvasDocument);
  const saveCanvasVersion = useArtifactStore((state) => state.saveCanvasVersion);
  const theme = useSettingsStore((state) => state.theme);

  const activeDocument = activeCanvasId ? canvasDocuments[activeCanvasId] : null;
  const [selection, setSelection] = useState<string>('');
  const [designerOpen, setDesignerOpen] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [showTranslateDialog, setShowTranslateDialog] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState('english');
  const [copied, setCopied] = useState(false);
  const [showExecutionPanel, setShowExecutionPanel] = useState(false);

  // Code execution hook
  const {
    isExecuting: isCodeExecuting,
    result: SandboxExecutionResult,
    execute: executeCode,
    cancel: cancelExecution,
    clear: clearExecution,
  } = useCanvasCodeExecution();

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
  const {
    localContent,
    setLocalContent,
    hasUnsavedChanges,
    handleEditorChange,
    handleManualSave,
  } = useCanvasAutoSave({
    documentId: activeCanvasId,
    content: activeDocument?.content || '',
    onSave: saveCanvasVersion,
    onContentUpdate: (id, content) => updateCanvasDocument(id, { content }),
  });

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

  const {
    isProcessing,
    isStreaming,
    streamingContent,
    actionError,
    actionResult,
    diffPreview,
    handleAction,
    acceptDiffChanges,
    rejectDiffChanges,
    setActionResult,
  } = useCanvasActions({
    content: localContent,
    language: activeDocument?.language || 'plaintext',
    selection,
    activeCanvasId,
    onContentChange: handleActionContentChange,
    onGenerateSuggestions: generateSuggestions,
  });

  // Canvas Monaco setup - integrates snippets, symbols, themes, plugins
  const {
    symbols: documentSymbols,
    breadcrumb: symbolBreadcrumb,
    availableThemes,
    activeThemeId: canvasThemeId,
    setActiveTheme: setCanvasTheme,
    handleEditorMount: onCanvasEditorMount,
    goToSymbol,
    editorRef: canvasEditorRef,
  } = useCanvasMonacoSetup({
    documentId: activeCanvasId,
    language: activeDocument?.language || 'plaintext',
    content: localContent,
  });

  // Show/hide symbol outline
  const [showSymbolOutline, setShowSymbolOutline] = useState(false);

  // Large file optimization
  const { addChunkedDocument, removeChunkedDocument } = useChunkedDocumentStore();
  useChunkLoader(activeCanvasId);
  const isLargeFile = activeDocument ? isLargeDocument(activeDocument.content || '') : false;

  // Initialize chunked document for large files
  useEffect(() => {
    if (activeCanvasId && activeDocument && isLargeFile) {
      addChunkedDocument(activeCanvasId, activeDocument.content || '');
    }
    return () => {
      if (activeCanvasId) {
        removeChunkedDocument(activeCanvasId);
      }
    };
  }, [activeCanvasId, activeDocument, isLargeFile, addChunkedDocument, removeChunkedDocument]);

  // Editor settings from persistent store
  const editorSettings = useCanvasSettingsStore((s) => s.settings.editor);
  const updateEditorSettings = useCanvasSettingsStore((s) => s.updateEditorSettings);

  // Check if current document can be opened in Designer
  const canOpenInDesigner = activeDocument && isDesignerCompatible(activeDocument.language);

  // Calculate document statistics
  const documentStats = useMemo(() => calculateDocumentStats(localContent), [localContent]);

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
  useCanvasKeyboardShortcuts({
    isActive: panelOpen && panelView === 'canvas',
    isProcessing,
    hasActiveDocument: !!activeDocument,
  });

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
      onOpenChange={(open) => !open && closePanel()}
    >
      <SheetContent
        side="right"
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
                    <Button variant="ghost" size="icon">
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
                    <Button variant="ghost" size="icon" onClick={handleExport}>
                      <Download className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('export')}</TooltipContent>
                </Tooltip>

                <Button variant="ghost" size="icon" onClick={handleClose}>
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
                        onClick={() => handleAction(action)}
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
                        onClick={() => handleAction(action)}
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
                  onClick={() => handleAction({ type: 'explain', labelKey: 'actionExplain' })}
                >
                  <HelpCircle className="h-3 w-3 mr-1" />
                  {t('actionExplain')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => handleAction({ type: 'fix', labelKey: 'actionFix' })}
                >
                  <Bug className="h-3 w-3 mr-1" />
                  {t('actionFix')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => handleAction({ type: 'improve', labelKey: 'actionImprove' })}
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

            {/* Diff preview panel */}
            {diffPreview && diffPreview.length > 0 && (
              <div className="border-b max-h-48 overflow-auto bg-muted/10">
                <div className="flex items-center justify-between px-4 py-1.5 bg-muted/30 border-b">
                  <span className="text-xs font-medium">{t('diffPreview')}</span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-green-600 hover:text-green-700"
                      onClick={acceptDiffChanges}
                    >
                      <Check className="h-3 w-3 mr-1" />
                      {t('acceptChanges')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-red-600 hover:text-red-700"
                      onClick={rejectDiffChanges}
                    >
                      <X className="h-3 w-3 mr-1" />
                      {t('rejectChanges')}
                    </Button>
                  </div>
                </div>
                <pre className="text-xs font-mono px-4 py-2">
                  {diffPreview.map((line, i) => (
                    <div
                      key={i}
                      className={cn(
                        'px-2 py-0.5',
                        line.type === 'added' && 'bg-green-500/10 text-green-700 dark:text-green-400',
                        line.type === 'removed' && 'bg-red-500/10 text-red-700 dark:text-red-400 line-through',
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
              </div>
            )}

            {/* Symbol breadcrumb */}
            {symbolBreadcrumb.length > 0 && (
              <div className="flex items-center gap-1 px-4 py-1 bg-muted/30 border-b text-xs text-muted-foreground overflow-x-auto">
                {symbolBreadcrumb.map((name, i) => (
                  <span key={`${name}-${i}`} className="flex items-center gap-1 shrink-0">
                    {i > 0 && <ChevronRight className="h-3 w-3" />}
                    <span className="text-foreground/70">{name}</span>
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
                  minimap: { enabled: editorSettings.minimap, scale: 1 },
                  lineNumbers: editorSettings.lineNumbers,
                  wordWrap: editorSettings.wordWrap ? 'on' : 'off',
                  renderWhitespace: editorSettings.renderWhitespace,
                  scrollBeyondLastLine: editorSettings.scrollBeyondLastLine,
                  cursorBlinking: editorSettings.cursorBlinking,
                  cursorStyle: editorSettings.cursorStyle,
                  smoothScrolling: editorSettings.smoothScrolling,
                  mouseWheelZoom: editorSettings.mouseWheelZoom,
                  stickyScroll: { enabled: true, maxLineCount: 5 },
                  bracketPairColorization: { enabled: editorSettings.bracketPairColorization },
                  guides: editorSettings.guides,
                  inlineSuggest: { enabled: true },
                })}
                onMount={(editor, monaco) => {
                  // Initialize canvas infrastructure (snippets, symbols, themes, plugins)
                  onCanvasEditorMount(editor, monaco);

                  // Track selection changes
                  editor.onDidChangeCursorSelection((e) => {
                    const model = editor.getModel();
                    if (model) {
                      const selectedText = model.getValueInRange(e.selection);
                      setSelection(selectedText);
                    }
                  });
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
            <AlertDialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('unsavedChanges')}</AlertDialogTitle>
                  <AlertDialogDescription>{t('unsavedChangesDescription')}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      if (activeCanvasId) {
                        saveCanvasVersion(activeCanvasId, undefined, false);
                      }
                      closePanel();
                    }}
                    className="bg-primary"
                  >
                    {t('saveAndClose')}
                  </AlertDialogAction>
                  <AlertDialogAction
                    onClick={() => closePanel()}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {t('discardAndClose')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Translate language selection dialog */}
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
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <p>{t('noDocument')}</p>
          </div>
        )}

        {/* V0 Designer Panel */}
        {activeDocument && canOpenInDesigner && (
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


