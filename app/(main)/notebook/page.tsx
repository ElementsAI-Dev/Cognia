'use client';

/**
 * Notebook Page - Jupyter Notebook Editor
 * 
 * Full-featured Jupyter notebook interface with:
 * - Kernel management (create, restart, interrupt)
 * - Code cell execution
 * - Variable inspection
 * - Environment selection
 */

import { useState, useCallback, useEffect, useRef, startTransition } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ArrowLeft,
  Square,
  RotateCcw,
  Loader2,
  AlertCircle,
  FileCode2,
  Variable,
  PanelRight,
  Plus,
  Trash2,
  FolderOpen,
  Save,
  Power,
  RefreshCw,
  List,
} from 'lucide-react';
import { InteractiveNotebook, KernelStatus, VariableInspector } from '@/components/jupyter';
import { useJupyterKernel } from '@/hooks/jupyter';
import { useExecutionState, useJupyterSessionForChat } from '@/stores/jupyter';
import { useVirtualEnv } from '@/hooks/sandbox';
import { isTauri } from '@/lib/utils';
import { loggers } from '@/lib/logger';
import { kernelService } from '@/lib/jupyter/kernel';
import { createEmptyNotebook, serializeNotebook } from '@/lib/jupyter';
import {
  isExecutionSuccessful,
  formatExecutionError,
  formatExecutionTime,
  DEFAULT_EXECUTION_OPTIONS,
} from '@/types/jupyter';

export default function NotebookPage() {
  const t = useTranslations('notebook');
  const tCommon = useTranslations('common');
  const searchParams = useSearchParams();
  const [notebookContent, setNotebookContent] = useState<string>('');
  const [selectedEnvPath, setSelectedEnvPath] = useState<string | null>(null);
  const [showVariables, setShowVariables] = useState(true);
  const [isDesktop, setIsDesktop] = useState(false);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [quickRunCode, setQuickRunCode] = useState('');
  const [quickRunResult, setQuickRunResult] = useState<string | null>(null);

  // Jupyter kernel hook
  const {
    sessions,
    kernels,
    activeSession,
    activeKernel,
    isExecuting,
    executingCellIndex,
    lastResult,
    variables,
    variablesLoading,
    isCreatingSession,
    isLoadingSessions,
    error,
    createSession,
    deleteSession,
    setActiveSession,
    refreshSessions,
    restartKernel,
    interruptKernel,
    execute,
    quickExecute,
    refreshVariables,
    inspectVariable,
    checkKernelAvailable,
    ensureKernel,
    shutdownAll,
    cleanup,
    clearError,
    updateSession,
    clearVariables,
    clearExecutionHistory,
    getNotebookInfo,
    unmapChatSession,
  } = useJupyterKernel();

  // Store selectors for execution state and chat integration
  const executionState = useExecutionState();
  const chatSessionId = searchParams.get('chatSessionId');
  const chatLinkedSession = useJupyterSessionForChat(chatSessionId || '');

  // Virtual environment hook
  const { environments, refreshEnvironments } = useVirtualEnv();

  // Check if running in Tauri on mount
  const desktopCheck = isTauri();
  useEffect(() => {
    if (desktopCheck !== isDesktop) {
      startTransition(() => {
        setIsDesktop(desktopCheck);
      });
    }
  }, [desktopCheck, isDesktop]);

  // Load notebook from query params or create empty
  const contentParam = searchParams.get('content');
  useEffect(() => {
    if (contentParam) {
      try {
        const decoded = decodeURIComponent(contentParam);
        if (decoded !== notebookContent) {
          startTransition(() => {
            setNotebookContent(decoded);
          });
        }
      } catch {
        // Create empty notebook on decode error
        if (!notebookContent) {
          startTransition(() => {
            setNotebookContent(serializeNotebook(createEmptyNotebook()));
          });
        }
      }
    } else if (!notebookContent) {
      startTransition(() => {
        setNotebookContent(serializeNotebook(createEmptyNotebook()));
      });
    }
  }, [contentParam, notebookContent]);

  // Refresh environments on mount
  useEffect(() => {
    if (isDesktop) {
      refreshEnvironments();
    }
  }, [isDesktop, refreshEnvironments]);

  // Auto-select first environment
  const firstEnvPath = environments.length > 0 ? environments[0].path : null;
  useEffect(() => {
    if (!selectedEnvPath && firstEnvPath) {
      startTransition(() => {
        setSelectedEnvPath(firstEnvPath);
      });
    }
  }, [firstEnvPath, selectedEnvPath]);

  const handleCreateSession = useCallback(async () => {
    if (!selectedEnvPath) return;

    try {
      const available = await checkKernelAvailable(selectedEnvPath);
      if (!available) {
        const installed = await ensureKernel(selectedEnvPath);
        if (!installed) return;
      }
      await createSession({
        name: `Notebook-${Date.now()}`,
        envPath: selectedEnvPath,
        autoInstallKernel: true,
      });
    } catch (err) {
      loggers.jupyter.error('Failed to create session:', err);
    }
  }, [selectedEnvPath, createSession, checkKernelAvailable, ensureKernel]);

  const handleRestartKernel = useCallback(async () => {
    if (!activeSession) return;
    try {
      await restartKernel(activeSession.id);
    } catch (err) {
      loggers.jupyter.error('Failed to restart kernel:', err);
    }
  }, [activeSession, restartKernel]);

  const handleInterruptKernel = useCallback(async () => {
    if (!activeSession) return;
    try {
      await interruptKernel(activeSession.id);
    } catch (err) {
      loggers.jupyter.error('Failed to interrupt kernel:', err);
    }
  }, [activeSession, interruptKernel]);

  const handleDeleteSession = useCallback(async () => {
    if (!activeSession) return;
    try {
      await deleteSession(activeSession.id);
    } catch (err) {
      loggers.jupyter.error('Failed to delete session:', err);
    }
  }, [activeSession, deleteSession]);

  const handleShutdownAll = useCallback(async () => {
    try {
      await shutdownAll();
      clearVariables();
      clearExecutionHistory();
    } catch (err) {
      loggers.jupyter.error('Failed to shutdown all kernels:', err);
    }
  }, [shutdownAll, clearVariables, clearExecutionHistory]);

  const handleCleanup = useCallback(async () => {
    try {
      await cleanup();
      clearVariables();
      clearExecutionHistory();
    } catch (err) {
      loggers.jupyter.error('Failed to cleanup:', err);
    }
  }, [cleanup, clearVariables, clearExecutionHistory]);

  const handleRefreshSessions = useCallback(async () => {
    await refreshSessions();
  }, [refreshSessions]);

  const handleSwitchSession = useCallback(
    (sessionId: string) => {
      setActiveSession(sessionId);
    },
    [setActiveSession]
  );

  const handleUnmapChat = useCallback(() => {
    if (chatSessionId) {
      unmapChatSession(chatSessionId);
    }
  }, [chatSessionId, unmapChatSession]);

  const handleRenameSession = useCallback(
    (newName: string) => {
      if (activeSession) {
        updateSession(activeSession.id, { name: newName });
      }
    },
    [activeSession, updateSession]
  );

  const handleQuickRun = useCallback(async () => {
    if (!quickRunCode.trim()) return;
    setQuickRunResult(null);
    const result = activeSession
      ? await execute(quickRunCode)
      : selectedEnvPath
        ? await quickExecute(selectedEnvPath, quickRunCode)
        : null;
    if (result) {
      setQuickRunResult(
        result.success
          ? result.stdout || t('executionSuccess')
          : formatExecutionError(result.error!)
      );
    }
  }, [quickRunCode, activeSession, execute, selectedEnvPath, quickExecute, t]);

  // Track content changes for dirty state
  const handleContentChange = useCallback(
    (content: string) => {
      setNotebookContent(content);
      setIsDirty(true);
    },
    []
  );

  // Open notebook file
  const handleOpenNotebook = useCallback(async () => {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const selected = await open({
        multiple: false,
        filters: [
          {
            name: t('notebookFilter'),
            extensions: ['ipynb'],
          },
        ],
      });

      if (selected && typeof selected === 'string') {
        const [content, info] = await Promise.all([
          kernelService.openNotebook(selected),
          getNotebookInfo(selected).catch(() => null),
        ]);
        if (info) {
          console.info(`Opened notebook: ${info.fileName} (${info.codeCells} code cells, ${info.markdownCells} markdown cells)`);
        }
        startTransition(() => {
          setNotebookContent(content);
          setFilePath(selected);
          setIsDirty(false);
        });
      }
    } catch (err) {
      loggers.jupyter.error('Failed to open notebook:', err);
    }
  }, [t, getNotebookInfo]);

  // Save notebook file
  const handleSaveNotebook = useCallback(
    async (saveAs = false) => {
      if (!notebookContent) return;

      try {
        let targetPath = filePath;

        if (!targetPath || saveAs) {
          const { save } = await import('@tauri-apps/plugin-dialog');
          const selected = await save({
            defaultPath: filePath || 'notebook.ipynb',
            filters: [
              {
                name: t('notebookFilter'),
                extensions: ['ipynb'],
              },
            ],
          });

          if (!selected) return;
          targetPath = selected;
        }

        setIsSaving(true);
        await kernelService.saveNotebook(targetPath, notebookContent);
        startTransition(() => {
          setFilePath(targetPath);
          setIsDirty(false);
        });
      } catch (err) {
        loggers.jupyter.error('Failed to save notebook:', err);
      } finally {
        setIsSaving(false);
      }
    },
    [notebookContent, filePath, t]
  );

  // Keyboard shortcut: Ctrl+S to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSaveNotebook(false);
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 's') {
        e.preventDefault();
        handleSaveNotebook(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        e.preventDefault();
        handleOpenNotebook();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSaveNotebook, handleOpenNotebook]);

  // Auto-save: save 30s after last edit when file path exists
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    if (!isDirty || !filePath || isSaving) return;
    autoSaveTimerRef.current = setTimeout(() => {
      handleSaveNotebook(false);
    }, 30_000);
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [isDirty, filePath, isSaving, notebookContent, handleSaveNotebook]);

  // Not available in browser
  if (!isDesktop) {
    return (
      <div className="h-[calc(100vh-var(--titlebar-height,0px))] flex flex-col items-center justify-center bg-background p-8">
        <FileCode2 className="h-16 w-16 text-muted-foreground/30 mb-4" />
        <h1 className="text-2xl font-semibold mb-2">{t('title')}</h1>
        <p className="text-muted-foreground text-center max-w-md mb-6">
          {t('desktopRequired')}
        </p>
        <Link href="/">
          <Button>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('backToChat')}
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-var(--titlebar-height,0px))] flex flex-col bg-background" data-page="notebook">
      {/* Header */}
      <header className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {tCommon('back')}
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-orange-500 flex items-center justify-center">
              <FileCode2 className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-medium text-sm truncate max-w-[200px]">
              {filePath
                ? filePath.split(/[\\/]/).pop() || t('untitled')
                : t('untitled')}
            </span>
            {isDirty && (
              <Badge variant="outline" className="text-xs">
                {t('unsavedChanges')}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleOpenNotebook}
                >
                  <FolderOpen className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('openNotebook')}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleSaveNotebook(false)}
                  disabled={isSaving || !notebookContent}
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('saveNotebook')}</TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Environment Selector */}
          <Select
            value={selectedEnvPath || ''}
            onValueChange={setSelectedEnvPath}
            disabled={isCreatingSession}
          >
            <SelectTrigger className="w-[200px] h-8">
              <SelectValue placeholder={t('selectEnvironment')} />
            </SelectTrigger>
            <SelectContent>
              {environments.map((env) => (
                <SelectItem key={env.path} value={env.path}>
                  <div className="flex items-center gap-2">
                    <span className="truncate">{env.name}</span>
                    {env.pythonVersion && (
                      <Badge variant="secondary" className="text-xs">
                        {env.pythonVersion}
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
              {environments.length === 0 && (
                <SelectItem value="" disabled>
                  {t('noEnvironments')}
                </SelectItem>
              )}
            </SelectContent>
          </Select>

          <Separator orientation="vertical" className="h-6" />

          {/* Kernel Controls */}
          <TooltipProvider>
            <div className="flex items-center gap-1">
              {!activeSession ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCreateSession}
                      disabled={!selectedEnvPath || isCreatingSession}
                    >
                      {isCreatingSession ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Plus className="h-4 w-4 mr-2" />
                      )}
                      {t('startKernel')}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('createKernelTooltip')}</TooltipContent>
                </Tooltip>
              ) : (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={handleInterruptKernel}
                        disabled={!isExecuting}
                      >
                        <Square className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('interruptTooltip')}</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={handleRestartKernel}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('restartTooltip')}</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={handleDeleteSession}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('stopKernelTooltip')}</TooltipContent>
                  </Tooltip>
                </>
              )}
            </div>
          </TooltipProvider>

          {/* Kernel Status */}
          <KernelStatus
            kernel={activeKernel}
            isConnecting={isCreatingSession}
            onRestart={activeSession ? handleRestartKernel : undefined}
            onInterrupt={isExecuting ? handleInterruptKernel : undefined}
            onConnect={!activeSession && selectedEnvPath ? handleCreateSession : undefined}
            className="ml-2"
          />

          {/* Execution Info */}
          {executingCellIndex !== null && (
            <Badge variant="secondary" className="text-xs">
              Cell [{executingCellIndex}]
            </Badge>
          )}
          {lastResult && !isExecuting && (
            <Badge variant={isExecutionSuccessful(lastResult) ? 'default' : 'destructive'} className="text-xs">
              {formatExecutionTime(lastResult.executionTimeMs)}
            </Badge>
          )}

          <Separator orientation="vertical" className="h-6" />

          {/* Session Management */}
          <TooltipProvider>
            <div className="flex items-center gap-1">
              {sessions.length > 1 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={handleRefreshSessions}
                      disabled={isLoadingSessions}
                    >
                      {isLoadingSessions ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('refreshSessions')}</TooltipContent>
                </Tooltip>
              )}
              {sessions.length > 0 && (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={handleCleanup}
                      >
                        <Power className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('cleanupKernels')}</TooltipContent>
                  </Tooltip>
                  {sessions.length > 1 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={handleShutdownAll}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{t('shutdownAll')}</TooltipContent>
                    </Tooltip>
                  )}
                </>
              )}
            </div>
          </TooltipProvider>

          <Separator orientation="vertical" className="h-6" />

          {/* Panel Toggle */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={showVariables ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setShowVariables(!showVariables)}
                >
                  <Variable className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('toggleVariables')}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </header>

      {/* Quick Run Bar */}
      {isDesktop && (
        <div className="border-b px-4 py-1.5 flex items-center gap-2">
          <input
            type="text"
            className="flex-1 h-7 px-2 text-xs font-mono bg-muted/30 rounded border border-input focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder={`>>> ${t('quickRun')} (timeout: ${DEFAULT_EXECUTION_OPTIONS.timeout / 1000}s)`}
            value={quickRunCode}
            onChange={(e) => setQuickRunCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleQuickRun();
              }
            }}
          />
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={handleQuickRun}
            disabled={isExecuting || !quickRunCode.trim()}
          >
            {t('run')}
          </Button>
          {quickRunResult && (
            <span className="text-xs font-mono text-muted-foreground truncate max-w-[300px]">
              {quickRunResult}
            </span>
          )}
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="border-b px-4 py-2">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <Button variant="ghost" size="sm" onClick={clearError}>
                {tCommon('dismiss')}
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Notebook Panel */}
          <ResizablePanel defaultSize={showVariables ? 75 : 100}>
            <ScrollArea className="h-full">
              <div className="p-4">
                <InteractiveNotebook
                  content={notebookContent}
                  onContentChange={handleContentChange}
                  autoConnect={false}
                  showVariables={false}
                  className="max-w-4xl mx-auto"
                />
              </div>
            </ScrollArea>
          </ResizablePanel>

          {/* Variables & Sessions Panel */}
          {showVariables && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
                <div className="flex flex-col h-full border-l bg-muted/30">
                  <div className="border-b px-3 py-2 flex items-center justify-between bg-background">
                    <h3 className="text-sm font-medium flex items-center gap-2">
                      <Variable className="h-4 w-4" />
                      {t('variables')}
                    </h3>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => setShowVariables(false)}
                    >
                      <PanelRight className="h-3 w-3" />
                    </Button>
                  </div>
                  <ScrollArea className="flex-1">
                    {activeSession ? (
                      <VariableInspector
                        variables={variables}
                        isLoading={variablesLoading}
                        onRefresh={() => refreshVariables()}
                        onInspect={(name) => inspectVariable(name)}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-32 text-center p-4">
                        <Variable className="h-8 w-8 text-muted-foreground/30 mb-2" />
                        <p className="text-sm text-muted-foreground">
                          {t('startKernelHint')}
                        </p>
                      </div>
                    )}

                    {/* Session List */}
                    {sessions.length > 1 && (
                      <div className="border-t">
                        <div className="px-3 py-2 flex items-center gap-2">
                          <List className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{t('sessions')}</span>
                          <Badge variant="secondary" className="text-xs">
                            {sessions.length}
                          </Badge>
                        </div>
                        <div className="divide-y">
                          {sessions.map((session) => (
                            <div
                              key={session.id}
                              className={`px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors ${
                                session.id === activeSession?.id ? 'bg-muted/50' : ''
                              }`}
                              onClick={() => handleSwitchSession(session.id)}
                            >
                              <div className="flex items-center justify-between">
                                                <span
                                  className="text-xs font-medium truncate"
                                  onDoubleClick={(e) => {
                                    const el = e.currentTarget;
                                    el.contentEditable = 'true';
                                    el.focus();
                                    const handleBlur = () => {
                                      el.contentEditable = 'false';
                                      if (el.textContent && el.textContent !== session.name) {
                                        handleRenameSession(el.textContent);
                                      }
                                      el.removeEventListener('blur', handleBlur);
                                    };
                                    el.addEventListener('blur', handleBlur);
                                  }}
                                >{session.name}</span>
                                {kernels.find((k) => k.id === session.kernelId) && (
                                  <Badge variant="outline" className="text-[10px]">
                                    {kernels.find((k) => k.id === session.kernelId)?.status}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Chat link info */}
                    {chatLinkedSession && (
                      <div className="border-t px-3 py-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {t('linkedToChat')}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs"
                            onClick={handleUnmapChat}
                          >
                            {t('unlink')}
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Execution Info */}
                    {executionState.lastResult && (
                      <div className="border-t px-3 py-2">
                        <div className="text-xs text-muted-foreground">
                          {t('lastExecution')}: {formatExecutionTime(executionState.lastResult.executionTimeMs)}
                          {executionState.lastResult.error && (
                            <div className="mt-1 text-destructive text-[10px] font-mono truncate">
                              {formatExecutionError(executionState.lastResult.error)}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
