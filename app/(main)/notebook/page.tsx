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

import { useState, useCallback, useEffect, startTransition } from 'react';
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
} from 'lucide-react';
import { InteractiveNotebook } from '@/components/jupyter';
import { useJupyterKernel } from '@/hooks/jupyter';
import { useVirtualEnv } from '@/hooks/sandbox';
import { isTauri } from '@/lib/utils';
import { kernelService } from '@/lib/jupyter/kernel';

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

  // Jupyter kernel hook
  const {
    activeSession,
    activeKernel,
    isExecuting,
    isCreatingSession,
    error,
    createSession,
    deleteSession,
    restartKernel,
    interruptKernel,
    clearError,
  } = useJupyterKernel();

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
            setNotebookContent(createEmptyNotebook());
          });
        }
      }
    } else if (!notebookContent) {
      startTransition(() => {
        setNotebookContent(createEmptyNotebook());
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
      await createSession({
        name: `Notebook-${Date.now()}`,
        envPath: selectedEnvPath,
        autoInstallKernel: true,
      });
    } catch (err) {
      console.error('Failed to create session:', err);
    }
  }, [selectedEnvPath, createSession]);

  const handleRestartKernel = useCallback(async () => {
    if (!activeSession) return;
    try {
      await restartKernel(activeSession.id);
    } catch (err) {
      console.error('Failed to restart kernel:', err);
    }
  }, [activeSession, restartKernel]);

  const handleInterruptKernel = useCallback(async () => {
    if (!activeSession) return;
    try {
      await interruptKernel(activeSession.id);
    } catch (err) {
      console.error('Failed to interrupt kernel:', err);
    }
  }, [activeSession, interruptKernel]);

  const handleDeleteSession = useCallback(async () => {
    if (!activeSession) return;
    try {
      await deleteSession(activeSession.id);
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  }, [activeSession, deleteSession]);

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
        const content = await kernelService.openNotebook(selected);
        startTransition(() => {
          setNotebookContent(content);
          setFilePath(selected);
          setIsDirty(false);
        });
      }
    } catch (err) {
      console.error('Failed to open notebook:', err);
    }
  }, [t]);

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
        console.error('Failed to save notebook:', err);
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
          {activeKernel && (
            <Badge
              variant={
                activeKernel.status === 'idle'
                  ? 'default'
                  : activeKernel.status === 'busy'
                    ? 'secondary'
                    : 'destructive'
              }
              className="ml-2"
            >
              {activeKernel.status}
            </Badge>
          )}

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

          {/* Variables Panel */}
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
                      <div className="p-3">
                        {/* Variable inspector will be shown in InteractiveNotebook */}
                        <p className="text-sm text-muted-foreground">
                          {t('variablesHint')}
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-32 text-center p-4">
                        <Variable className="h-8 w-8 text-muted-foreground/30 mb-2" />
                        <p className="text-sm text-muted-foreground">
                          {t('startKernelHint')}
                        </p>
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

/** Create an empty Jupyter notebook structure */
function createEmptyNotebook(): string {
  const notebook = {
    nbformat: 4,
    nbformat_minor: 5,
    metadata: {
      kernelspec: {
        display_name: 'Python 3',
        language: 'python',
        name: 'python3',
      },
      language_info: {
        name: 'python',
        version: '3.x',
      },
    },
    cells: [
      {
        cell_type: 'code',
        execution_count: null,
        metadata: {},
        outputs: [],
        source: ['# Welcome to Jupyter Notebook\n', 'print("Hello, World!")'],
      },
    ],
  };
  return JSON.stringify(notebook, null, 2);
}
