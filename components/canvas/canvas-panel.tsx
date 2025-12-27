'use client';

/**
 * CanvasPanel - OpenAI-style canvas editing panel with Monaco Editor
 * Includes version history support
 */

import { useCallback, useEffect, useState, useRef } from 'react';
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
} from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
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
import type { CanvasAction, CanvasSuggestion } from '@/types';
import {
  executeCanvasAction,
  applyCanvasActionResult,
  type CanvasActionType,
} from '@/lib/ai/canvas-actions';
import type { ProviderName } from '@/lib/ai/client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { V0Designer } from '@/components/designer';

// Dynamically import Monaco to avoid SSR issues
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  ),
});

const canvasActions: CanvasAction[] = [
  { type: 'review', label: 'Review', icon: 'eye', shortcut: '⌘R' },
  { type: 'fix', label: 'Fix Issues', icon: 'bug', shortcut: '⌘F' },
  { type: 'improve', label: 'Improve', icon: 'sparkles', shortcut: '⌘I' },
  { type: 'explain', label: 'Explain', icon: 'help', shortcut: '⌘E' },
  { type: 'simplify', label: 'Simplify', icon: 'minimize', shortcut: '⌘S' },
  { type: 'expand', label: 'Expand', icon: 'maximize', shortcut: '⌘X' },
  { type: 'translate', label: 'Translate', icon: 'languages' },
  { type: 'format', label: 'Format', icon: 'format' },
];

const actionIcons: Record<string, React.ReactNode> = {
  review: <Wand2 className="h-4 w-4" />,
  fix: <Bug className="h-4 w-4" />,
  improve: <Sparkles className="h-4 w-4" />,
  translate: <Languages className="h-4 w-4" />,
  simplify: <ArrowDownToLine className="h-4 w-4" />,
  expand: <ArrowUpFromLine className="h-4 w-4" />,
  run: <Play className="h-4 w-4" />,
};

export function CanvasPanel() {
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

  // Check if current document can be opened in Designer
  const canOpenInDesigner = activeDocument && 
    ['jsx', 'tsx', 'html', 'javascript', 'typescript'].includes(activeDocument.language);

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

  // Keyboard shortcuts handler
  useEffect(() => {
    if (!panelOpen || panelView !== 'canvas' || !activeDocument) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd/Ctrl key
      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod || isProcessing) return;

      // Map keys to action types
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
          // Trigger the action via a custom event to avoid circular deps
          const event = new CustomEvent('canvas-action', { detail: action });
          window.dispatchEvent(event);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [panelOpen, panelView, isProcessing, activeDocument]);

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

  const handleAction = useCallback(async (action: CanvasAction) => {
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
        } else {
          // For review/explain/run actions, show the result
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
  }, [activeDocument, getActiveSession, defaultProvider, providerSettings, localContent, selection, activeCanvasId, updateCanvasDocument]);

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

  const getEditorTheme = () => {
    if (theme === 'dark') return 'vs-dark';
    if (theme === 'light') return 'light';
    // System theme
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'vs-dark'
        : 'light';
    }
    return 'light';
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
      <SheetContent side="right" className="w-full sm:w-[700px] sm:max-w-[700px] p-0 flex flex-col">
        {activeDocument ? (
          <>
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
                    Unsaved
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
                  <TooltipContent>Save version</TooltipContent>
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
                          <span className="text-xs">Preview</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Open in Designer with live preview</TooltipContent>
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
                      <TooltipContent>Open in Full Designer (new window)</TooltipContent>
                    </Tooltip>
                  </div>
                )}

                <Button variant="ghost" size="icon" onClick={closePanel}>
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
                        <span className="hidden sm:inline">{action.label}</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {action.label}
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
                      More...
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
                        <span className="ml-2">{action.label}</span>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleAction({ type: 'run', label: 'Run', icon: 'play' })}
                      disabled={isProcessing || activeDocument.language !== 'python'}
                    >
                      <Play className="h-4 w-4" />
                      <span className="ml-2">Run Code</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {isProcessing && (
                  <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Processing...</span>
                  </div>
                )}
              </TooltipProvider>
            </div>

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
                  minimap: { enabled: true, scale: 1 },
                  fontSize: 14,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  wordWrap: activeDocument.type === 'text' ? 'on' : 'off',
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

            {/* Action result panel (for review/explain/run) */}
            {actionResult && (
              <div className="border-t max-h-[200px] overflow-auto">
                <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/50">
                  <span className="text-sm font-medium">AI Response</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setActionResult(null)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <ScrollArea className="p-4">
                  <pre className="text-sm whitespace-pre-wrap">{actionResult}</pre>
                </ScrollArea>
              </div>
            )}

            {/* Suggestions panel */}
            {activeDocument.aiSuggestions && activeDocument.aiSuggestions.length > 0 && (
              <SuggestionsPanel
                documentId={activeDocument.id}
                suggestions={activeDocument.aiSuggestions}
              />
            )}
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <p>No document open</p>
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

function SuggestionsPanel({
  documentId,
  suggestions,
}: {
  documentId: string;
  suggestions: CanvasSuggestion[];
}) {
  const applySuggestion = useArtifactStore((state) => state.applySuggestion);
  const updateSuggestionStatus = useArtifactStore(
    (state) => state.updateSuggestionStatus
  );

  const pendingSuggestions = suggestions.filter((s) => s.status === 'pending');

  if (pendingSuggestions.length === 0) return null;

  return (
    <div className="border-t">
      <div className="px-4 py-2 text-sm font-medium">
        AI Suggestions ({pendingSuggestions.length})
      </div>
      <ScrollArea className="max-h-[200px]">
        <div className="space-y-2 px-4 pb-4">
          {pendingSuggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              className="rounded-lg border bg-muted/50 p-3 space-y-2"
            >
              <p className="text-sm">{suggestion.explanation}</p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => applySuggestion(documentId, suggestion.id)}
                >
                  Apply
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    updateSuggestionStatus(documentId, suggestion.id, 'rejected')
                  }
                >
                  Dismiss
                </Button>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

export default CanvasPanel;
