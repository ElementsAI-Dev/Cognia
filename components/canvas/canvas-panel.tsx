'use client';

/**
 * CanvasPanel - OpenAI-style canvas editing panel with Monaco Editor
 * Includes version history support
 */

import { useCallback, useEffect, useState, useRef, useMemo } from 'react';
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
  Settings2,
  WrapText,
  Map,
  Hash,
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useArtifactStore, useSettingsStore, useSessionStore } from '@/stores';
import { cn } from '@/lib/utils';
import { VersionHistoryPanel } from './version-history-panel';
import { CodeExecutionPanel } from './code-execution-panel';
import { CanvasDocumentTabs } from './canvas-document-tabs';
import { SuggestionItem } from './suggestion-item';
import { CollaborationPanel } from './collaboration-panel';
import { CommentPanel } from './comment-panel';
import { KeybindingSettings } from './keybinding-settings';
import type { CanvasSuggestion } from '@/types';
import { useCanvasCodeExecution, useCanvasDocuments, useCanvasSuggestions, useChunkLoader } from '@/hooks/canvas';
import { useKeybindingStore } from '@/stores/canvas/keybinding-store';
import { useChunkedDocumentStore } from '@/stores/canvas/chunked-document-store';
import { isLargeDocument } from '@/lib/canvas/utils';
import { themeRegistry } from '@/lib/canvas/themes/theme-registry';
import { CanvasErrorBoundary } from './canvas-error-boundary';
import {
  executeCanvasAction,
  applyCanvasActionResult,
  type CanvasActionType,
} from '@/lib/ai/generation/canvas-actions';
import type { ProviderName } from '@/lib/ai/core/client';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

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

const canvasActions: Array<{ type: CanvasActionType; labelKey: string; icon: string; shortcut?: string }> = [
  { type: 'review', labelKey: 'actionReview', icon: 'eye', shortcut: '⌘R' },
  { type: 'fix', labelKey: 'actionFix', icon: 'bug', shortcut: '⌘F' },
  { type: 'improve', labelKey: 'actionImprove', icon: 'sparkles', shortcut: '⌘I' },
  { type: 'explain', labelKey: 'actionExplain', icon: 'help', shortcut: '⌘E' },
  { type: 'simplify', labelKey: 'actionSimplify', icon: 'minimize', shortcut: '⌘S' },
  { type: 'expand', labelKey: 'actionExpand', icon: 'maximize', shortcut: '⌘X' },
  { type: 'translate', labelKey: 'actionTranslate', icon: 'languages' },
  { type: 'format', labelKey: 'actionFormat', icon: 'format' },
];

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

const TRANSLATE_LANGUAGES = [
  { value: 'english', label: 'English' },
  { value: 'chinese', label: '中文 (Chinese)' },
  { value: 'japanese', label: '日本語 (Japanese)' },
  { value: 'korean', label: '한국어 (Korean)' },
  { value: 'spanish', label: 'Español (Spanish)' },
  { value: 'french', label: 'Français (French)' },
  { value: 'german', label: 'Deutsch (German)' },
  { value: 'russian', label: 'Русский (Russian)' },
  { value: 'portuguese', label: 'Português (Portuguese)' },
  { value: 'arabic', label: 'العربية (Arabic)' },
];

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

  const providerSettings = useSettingsStore((state) => state.providerSettings);
  const defaultProvider = useSettingsStore((state) => state.defaultProvider);
  const getActiveSession = useSessionStore((state) => state.getActiveSession);

  const activeDocument = activeCanvasId ? canvasDocuments[activeCanvasId] : null;
  const [localContent, setLocalContent] = useState('');
  const [selection, setSelection] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<string | null>(null);
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

  // Large file optimization
  const { addChunkedDocument, removeChunkedDocument } = useChunkedDocumentStore();
  const { isLargeDocument: isLargeDoc, state: chunkState } = useChunkLoader(activeCanvasId);
  const isLargeFile = activeDocument ? isLargeDocument(activeDocument.content || '') : false;
  
  // Use chunk loader state for large documents
  const _chunkLoaderInfo = isLargeDoc ? { totalLines: chunkState.totalLines, isLoading: chunkState.isLoading } : null;

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

  // Editor settings state
  const [editorSettings, setEditorSettings] = useState({
    wordWrap: false,
    minimap: true,
    lineNumbers: true,
  });
  const [showEditorSettings, setShowEditorSettings] = useState(false);

  // Check if current document can be opened in Designer
  const canOpenInDesigner = activeDocument && 
    ['jsx', 'tsx', 'html', 'javascript', 'typescript'].includes(activeDocument.language);

  // Calculate document statistics
  const documentStats = useMemo(() => {
    if (!localContent) return { lines: 0, words: 0, chars: 0 };
    const lines = localContent.split('\n').length;
    const words = localContent.trim() ? localContent.trim().split(/\s+/).length : 0;
    const chars = localContent.length;
    return { lines, words, chars };
  }, [localContent]);

  // Handle Designer code changes
  const handleDesignerCodeChange = useCallback((newCode: string) => {
    setLocalContent(newCode);
    if (activeCanvasId) {
      updateCanvasDocument(activeCanvasId, { content: newCode });
    }
    setHasUnsavedChanges(newCode !== lastSavedContentRef.current);
  }, [activeCanvasId, updateCanvasDocument]);

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
        console.error('Failed to copy:', err);
      }
    }
  }, [actionResult]);

  // Export canvas document
  const handleExport = useCallback(() => {
    if (!activeDocument) return;

    const extensionMap: Record<string, string> = {
      javascript: 'js',
      typescript: 'ts',
      python: 'py',
      html: 'html',
      css: 'css',
      json: 'json',
      markdown: 'md',
      jsx: 'jsx',
      tsx: 'tsx',
      sql: 'sql',
      bash: 'sh',
      yaml: 'yaml',
      xml: 'xml',
    };

    const ext = extensionMap[activeDocument.language] || 'txt';
    const filename = `${activeDocument.title.replace(/[^a-zA-Z0-9]/g, '_')}.${ext}`;
    const blob = new Blob([localContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [activeDocument, localContent]);

  // Handle translate action with language selection (defined after handleAction)
  const handleTranslateRef = useRef<() => Promise<void>>(() => Promise.resolve());

  // Auto-save timer ref
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedContentRef = useRef<string>('');

  useEffect(() => {
    if (activeDocument) {
      // Use microtask to avoid synchronous setState in effect
      queueMicrotask(() => {
        setLocalContent(activeDocument.content);
        lastSavedContentRef.current = activeDocument.content;
        setHasUnsavedChanges(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDocument?.id]);

  // Cleanup auto-save timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  // Keybinding store integration
  const getActionByKeybinding = useKeybindingStore((state) => state.getActionByKeybinding);

  // Get Monaco theme from theme registry
  const monacoTheme = useMemo(() => {
    const editorTheme = theme === 'dark' ? themeRegistry.getTheme('vs-dark') : themeRegistry.getTheme('vs');
    return editorTheme ? editorTheme.id : (theme === 'dark' ? 'vs-dark' : 'light');
  }, [theme]);

  // Keyboard shortcuts handler - uses keybinding store
  useEffect(() => {
    if (!panelOpen || panelView !== 'canvas' || !activeDocument) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd/Ctrl key
      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod || isProcessing) return;

      // Build key combo string
      const parts: string[] = [];
      if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
      if (e.altKey) parts.push('Alt');
      if (e.shiftKey) parts.push('Shift');
      const key = e.key.length === 1 ? e.key.toUpperCase() : e.key;
      if (!['Control', 'Alt', 'Shift', 'Meta'].includes(key)) {
        parts.push(key);
      }
      const keyCombo = parts.join('+');

      // Check keybinding store first
      const boundAction = getActionByKeybinding(keyCombo);
      if (boundAction && boundAction.startsWith('action.')) {
        const actionType = boundAction.replace('action.', '');
        const action = canvasActions.find(a => a.type === actionType);
        if (action) {
          e.preventDefault();
          const event = new CustomEvent('canvas-action', { detail: action });
          window.dispatchEvent(event);
          return;
        }
      }

      // Fallback to default key mapping
      const keyActionMap: Record<string, string> = {
        'r': 'review',
        'f': 'fix',
        'i': 'improve',
        'e': 'explain',
        's': 'simplify',
        'x': 'expand',
      };

      const actionType = keyActionMap[e.key.toLowerCase()];
      if (actionType) {
        const action = canvasActions.find(a => a.type === actionType);
        if (action) {
          e.preventDefault();
          const event = new CustomEvent('canvas-action', { detail: action });
          window.dispatchEvent(event);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [panelOpen, panelView, isProcessing, activeDocument, getActionByKeybinding]);

  const handleEditorChange = useCallback(
    (value: string | undefined) => {
      const newValue = value || '';
      setLocalContent(newValue);
      if (activeCanvasId) {
        updateCanvasDocument(activeCanvasId, { content: newValue });
      }

      setHasUnsavedChanges(newValue !== lastSavedContentRef.current);

      // Auto-save after 30 seconds of inactivity if there are changes
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }

      if (newValue !== lastSavedContentRef.current && activeCanvasId) {
        autoSaveTimerRef.current = setTimeout(() => {
          saveCanvasVersion(activeCanvasId, undefined, true);
          lastSavedContentRef.current = newValue;
          setHasUnsavedChanges(false);
        }, 30000); // Auto-save after 30 seconds
      }
    },
    [activeCanvasId, updateCanvasDocument, saveCanvasVersion]
  );

  const handleManualSave = useCallback(() => {
    if (activeCanvasId && hasUnsavedChanges) {
      saveCanvasVersion(activeCanvasId, undefined, false);
      lastSavedContentRef.current = localContent;
      setHasUnsavedChanges(false);
    }
  }, [activeCanvasId, hasUnsavedChanges, saveCanvasVersion, localContent]);

  const handleAction = useCallback(async (action: { type: CanvasActionType; labelKey?: string; label?: string; icon?: string; shortcut?: string }, translateTargetLang?: string) => {
    if (!activeDocument) return;

    setIsProcessing(true);
    setActionError(null);
    setActionResult(null);

    // Get provider and model from session or defaults
    const session = getActiveSession();
    const provider = (session?.provider || defaultProvider || 'openai') as ProviderName;
    const model = session?.model || providerSettings[provider]?.defaultModel || 'gpt-4o-mini';
    const settings = providerSettings[provider];

    if (!settings?.apiKey && provider !== 'ollama') {
      setActionError(`No API key configured for ${provider}. Please add your API key in Settings.`);
      setIsProcessing(false);
      return;
    }

    try {
      const result = await executeCanvasAction(
        action.type as CanvasActionType,
        localContent,
        {
          provider,
          model,
          apiKey: settings?.apiKey || '',
          baseURL: settings?.baseURL,
        },
        {
          language: activeDocument.language,
          selection: selection || undefined,
          targetLanguage: translateTargetLang,
        }
      );

      if (result.success && result.result) {
        // For content-modifying actions, apply the result
        const contentActions = ['fix', 'improve', 'simplify', 'expand', 'translate', 'format'];
        if (contentActions.includes(action.type)) {
          const newContent = applyCanvasActionResult(localContent, result.result, selection || undefined);
          setLocalContent(newContent);
          if (activeCanvasId) {
            updateCanvasDocument(activeCanvasId, { content: newContent });
            setHasUnsavedChanges(true);
          }
        } else if (action.type === 'review') {
          // For review action, also generate inline suggestions
          generateSuggestions({
            content: localContent,
            language: activeDocument.language,
            selection: selection || undefined,
          }, { focusArea: 'all' });
          // Still show the review result
          setActionResult(result.result);
        } else {
          // For explain actions, show the result
          setActionResult(result.result);
        }
      } else if (!result.success) {
        setActionError(result.error || 'Action failed');
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsProcessing(false);
    }
  }, [activeDocument, getActiveSession, defaultProvider, providerSettings, localContent, selection, activeCanvasId, updateCanvasDocument, generateSuggestions]);

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

  // Update handleTranslate ref after handleAction is defined
  useEffect(() => {
    handleTranslateRef.current = async () => {
      if (!activeDocument) return;
      setShowTranslateDialog(false);
      await handleAction({ type: 'translate', labelKey: 'actionTranslate' }, targetLanguage);
    };
  }, [activeDocument, targetLanguage, handleAction]);

  const getEditorTheme = () => {
    // Use theme registry for editor theming
    return monacoTheme;
  };

  const getLanguage = () => {
    if (!activeDocument) return 'plaintext';

    const languageMap: Record<string, string> = {
      javascript: 'javascript',
      typescript: 'typescript',
      python: 'python',
      html: 'html',
      css: 'css',
      json: 'json',
      markdown: 'markdown',
      jsx: 'javascript',
      tsx: 'typescript',
      sql: 'sql',
      bash: 'shell',
      yaml: 'yaml',
      xml: 'xml',
    };

    return languageMap[activeDocument.language] || 'plaintext';
  };

  return (
    <Sheet open={panelOpen && panelView === 'canvas'} onOpenChange={(open) => !open && closePanel()}>
      <SheetContent side="right" className="w-full sm:w-[600px] lg:w-[700px] p-0 flex flex-col" showCloseButton={false}>
        <SheetTitle className="sr-only">Canvas Panel</SheetTitle>
        {activeDocument ? (
          <>
            {/* Document Tabs - shown when multiple documents exist */}
            <CanvasDocumentTabs
              documents={allDocuments}
              activeDocumentId={activeCanvasId}
              onSelectDocument={openDocument}
              onCloseDocument={closeDocument}
              onCreateDocument={() => createDocument({
                title: 'Untitled',
                content: '',
                language: 'javascript',
                type: 'code',
              })}
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
                      <Save className={cn(
                        "h-4 w-4",
                        hasUnsavedChanges && "text-primary"
                      )} />
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
                <CollaborationPanel
                  documentId={activeDocument.id}
                  documentContent={localContent}
                />

                {/* Comment Panel */}
                <CommentPanel
                  documentId={activeDocument.id}
                />

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
                {canvasActions.slice(0, 5).map((action) => (
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
                          <span className="ml-2 text-muted-foreground">
                            {action.shortcut}
                          </span>
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
                    {canvasActions.slice(5).map((action) => (
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

            {/* Quick actions for selected text */}
            {selection && selection.length > 0 && !isProcessing && (
              <div className="flex items-center gap-1 px-4 py-1.5 bg-primary/5 border-b">
                <span className="text-xs text-muted-foreground mr-2">
                  {t('selectedText')}:
                </span>
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

            {/* Editor */}
            <div className="flex-1 overflow-hidden">
              <MonacoEditor
                height="100%"
                language={getLanguage()}
                theme={getEditorTheme()}
                value={localContent}
                onChange={handleEditorChange}
                options={{
                  minimap: { enabled: editorSettings.minimap, scale: 1 },
                  fontSize: 14,
                  lineNumbers: editorSettings.lineNumbers ? 'on' : 'off',
                  scrollBeyondLastLine: false,
                  wordWrap: editorSettings.wordWrap ? 'on' : 'off',
                  automaticLayout: true,
                  tabSize: 2,
                  padding: { top: 16, bottom: 16 },
                }}
                onMount={(editor) => {
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
                <span>{documentStats.lines} {t('lines')}</span>
                <span>{documentStats.words} {t('words')}</span>
                <span>{documentStats.chars} {t('characters')}</span>
                {selection && (
                  <span className="text-primary">
                    {t('selectedChars', { count: selection.length })}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <DropdownMenu open={showEditorSettings} onOpenChange={setShowEditorSettings}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 px-2">
                      <Settings2 className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem
                      onClick={() => setEditorSettings(s => ({ ...s, wordWrap: !s.wordWrap }))}
                    >
                      <WrapText className="h-4 w-4 mr-2" />
                      <span className="flex-1">{t('wordWrap')}</span>
                      {editorSettings.wordWrap && <Check className="h-4 w-4 ml-2" />}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setEditorSettings(s => ({ ...s, minimap: !s.minimap }))}
                    >
                      <Map className="h-4 w-4 mr-2" />
                      <span className="flex-1">{t('minimap')}</span>
                      {editorSettings.minimap && <Check className="h-4 w-4 ml-2" />}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setEditorSettings(s => ({ ...s, lineNumbers: !s.lineNumbers }))}
                    >
                      <Hash className="h-4 w-4 mr-2" />
                      <span className="flex-1">{t('lineNumbers')}</span>
                      {editorSettings.lineNumbers && <Check className="h-4 w-4 ml-2" />}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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
              aiSuggestions.length > 0 || isGeneratingSuggestions) && (
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
                  <AlertDialogDescription>
                    {t('unsavedChangesDescription')}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      saveCanvasVersion(activeCanvasId!, undefined, false);
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
        console.error('Canvas error caught:', error, errorInfo);
      }}
    >
      <CanvasPanelContent />
    </CanvasErrorBoundary>
  );
}

function SuggestionsPanel({
  documentId,
  suggestions,
  isGenerating = false,
}: {
  documentId: string;
  suggestions: CanvasSuggestion[];
  isGenerating?: boolean;
}) {
  const t = useTranslations('canvas');
  const applySuggestion = useArtifactStore((state) => state.applySuggestion);
  const updateSuggestionStatus = useArtifactStore(
    (state) => state.updateSuggestionStatus
  );

  const pendingSuggestions = suggestions.filter((s) => s.status === 'pending');

  if (pendingSuggestions.length === 0 && !isGenerating) return null;

  return (
    <div className="border-t">
      <div className="px-4 py-2 text-sm font-medium flex items-center gap-2">
        {isGenerating ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {t('generatingSuggestions')}
          </>
        ) : (
          <>
            {t('aiSuggestions')} ({pendingSuggestions.length})
          </>
        )}
      </div>
      <ScrollArea className="max-h-[200px]">
        <div className="space-y-2 px-4 pb-4">
          {pendingSuggestions.map((suggestion) => (
            <SuggestionItem
              key={suggestion.id}
              suggestion={suggestion}
              onApply={(id) => applySuggestion(documentId, id)}
              onReject={(id) => updateSuggestionStatus(documentId, id, 'rejected')}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

export default CanvasPanel;
