'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useSandbox, useCodeExecution, useSnippets, useSessions } from '@/hooks/sandbox';
import { useSandboxStore } from '@/stores/sandbox';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { EmptyState } from '@/components/layout/empty-state';
import { ExecutionHistory } from '@/components/sandbox/execution-history';
import { SnippetManager } from '@/components/sandbox/snippet-manager';
import { SandboxStatistics } from '@/components/sandbox/sandbox-statistics';
import {
  Play,
  Square,
  Terminal,
  CheckCircle,
  XCircle,
  RefreshCw,
  Loader2,
  Code,
  History,
  BookOpen,
  Keyboard,
  Settings,
  ChevronDown,
  AlertTriangle,
  Cpu,
  Timer,
  Copy,
  Trash2,
  Save,
  FileInput,
  BarChart3,
  Layers,
  Plus,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { LANGUAGE_INFO, LANGUAGE_TEMPLATES } from '@/types/system/sandbox';
import type {
  CompilerSettings,
  CppStandard,
  OptimizationLevel,
  RustEdition,
} from '@/types/system/sandbox';

export interface SandboxPanelProps {
  className?: string;
  onExecutionComplete?: (result: { stdout: string; stderr: string; success: boolean }) => void;
}

export function SandboxPanel({ className, onExecutionComplete }: SandboxPanelProps) {
  const t = useTranslations('sandboxPanel');
  const {
    isAvailable,
    isLoading: statusLoading,
    languages,
    runtimes,
    error: statusError,
    refreshStatus,
  } = useSandbox();

  const { result, executing, error: execError, execute, reset } = useCodeExecution();

  // Connect to Zustand store for persistent code/language state
  const storeLanguage = useSandboxStore((s) => s.selectedLanguage);
  const storeCode = useSandboxStore((s) => s.editorCode);
  const setStoreLanguage = useSandboxStore((s) => s.setSelectedLanguage);
  const setStoreCode = useSandboxStore((s) => s.setEditorCode);

  const [selectedLanguage, setSelectedLanguageLocal] = useState<string>(storeLanguage || 'python');
  const [code, setCodeLocal] = useState<string>(storeCode || '');

  // Sync local state to store (debounced)
  const setSelectedLanguage = useCallback((lang: string) => {
    setSelectedLanguageLocal(lang);
    setStoreLanguage(lang);
  }, [setStoreLanguage]);

  const setCode = useCallback((newCode: string) => {
    setCodeLocal(newCode);
    // Debounced store update handled by the persistence effect below
  }, []);

  // Snippet management hooks
  const { snippets, createSnippet } = useSnippets();
  const {
    sessions,
    currentSessionId,
    startSession,
    endSession,
  } = useSessions();
  const [saveSnippetOpen, setSaveSnippetOpen] = useState(false);
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [snippetTitle, setSnippetTitle] = useState('');
  const [snippetDescription, setSnippetDescription] = useState('');
  const [snippetTags, setSnippetTags] = useState('');
  const [snippetCategory, setSnippetCategory] = useState('');
  const [stdin, setStdin] = useState<string>('');
  const [args, setArgs] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('editor');
  const [showSettings, setShowSettings] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [compilerSettings, setCompilerSettings] = useState<CompilerSettings>({
    cppStandard: 'c++20',
    optimization: '-O2',
    cppCompiler: 'g++',
    cCompiler: 'gcc',
    enableWarnings: true,
    rustEdition: '2021',
    rustRelease: false,
    pythonUnbuffered: true,
    pythonOptimize: false,
  });

  // Sync code to store (debounced)
  useEffect(() => {
    if (!code.trim()) return;
    const timer = setTimeout(() => {
      setStoreCode(code);
    }, 500);
    return () => clearTimeout(timer);
  }, [code, setStoreCode]);

  // Check if current language is a compiled language
  const isCompiledLanguage = useMemo(() => {
    return [
      'c',
      'cpp',
      'rust',
      'java',
      'go',
      'typescript',
      'swift',
      'kotlin',
      'haskell',
      'csharp',
    ].includes(selectedLanguage);
  }, [selectedLanguage]);

  // Check if current language has configurable settings
  const hasLanguageSettings = useMemo(() => {
    return ['c', 'cpp', 'rust', 'python'].includes(selectedLanguage);
  }, [selectedLanguage]);

  // Build environment variables based on compiler settings
  const buildEnvVars = useCallback((): Record<string, string> => {
    const env: Record<string, string> = {};

    if (selectedLanguage === 'python') {
      if (compilerSettings.pythonUnbuffered) {
        env['PYTHONUNBUFFERED'] = '1';
      }
      if (compilerSettings.pythonOptimize) {
        env['PYTHONOPTIMIZE'] = '1';
      }
    }

    return env;
  }, [selectedLanguage, compilerSettings]);

  // Build custom args based on compiler settings
  const buildCustomArgs = useCallback((): string[] => {
    const customArgs: string[] = [];

    // Parse user-provided args
    if (args.trim()) {
      customArgs.push(...args.trim().split(/\s+/));
    }

    return customArgs;
  }, [args]);

  const handleExecute = useCallback(async () => {
    if (!code.trim() || !selectedLanguage) return;

    // Build execution request with settings
    const envVars = buildEnvVars();
    const customArgs = buildCustomArgs();

    // Use execute with full ExecutionRequest for stdin/args/env support
    const execResult = await execute({
      language: selectedLanguage,
      code: code,
      stdin: stdin.trim() || undefined,
      args: customArgs.length > 0 ? customArgs : undefined,
      env: Object.keys(envVars).length > 0 ? envVars : undefined,
    });

    if (execResult && onExecutionComplete) {
      onExecutionComplete({
        stdout: execResult.stdout || '',
        stderr: execResult.stderr || '',
        success: execResult.status === 'completed' && execResult.exit_code === 0,
      });
    }
  }, [code, selectedLanguage, stdin, buildEnvVars, buildCustomArgs, execute, onExecutionComplete]);

  // Keyboard shortcut handler
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleExecute();
      }
    },
    [handleExecute]
  );

  const handleLanguageChange = (lang: string) => {
    setSelectedLanguage(lang);
    reset();

    if (!code.trim() && LANGUAGE_TEMPLATES[lang]) {
      setCode(LANGUAGE_TEMPLATES[lang]);
    }
  };

  const getLanguageDisplayName = (lang: string): string => {
    const info = LANGUAGE_INFO[lang];
    return info ? info.name : lang.charAt(0).toUpperCase() + lang.slice(1);
  };

  // Callback when user selects execution from history
  const handleSelectFromHistory = useCallback((selectedCode: string, language: string) => {
    setCode(selectedCode);
    setSelectedLanguage(language);
    setActiveTab('editor');
  }, [setCode, setSelectedLanguage]);

  // Callback when user selects a snippet
  const handleSelectSnippet = useCallback((snippetCode: string, language: string) => {
    setCode(snippetCode);
    setSelectedLanguage(language);
    setActiveTab('editor');
  }, [setCode, setSelectedLanguage]);

  // Session management handlers
  const handleStartSession = useCallback(async () => {
    if (!newSessionName.trim()) return;
    await startSession(newSessionName.trim());
    setNewSessionName('');
    setSessionDialogOpen(false);
  }, [newSessionName, startSession]);

  const handleEndSession = useCallback(async () => {
    await endSession();
  }, [endSession]);

  // Callback when user wants to execute a snippet directly
  const handleExecuteSnippet = useCallback(async (snippetId: string) => {
    const snippet = snippets.find((s) => s.id === snippetId);
    if (snippet) {
      setCode(snippet.code);
      setSelectedLanguage(snippet.language);
      setActiveTab('editor');
      // Auto-execute after a short delay to allow state to settle
      setTimeout(async () => {
        await execute({
          language: snippet.language,
          code: snippet.code,
        });
      }, 100);
    }
  }, [snippets, setCode, setSelectedLanguage, execute]);

  // Save current code as a snippet
  const handleSaveAsSnippet = useCallback(async () => {
    if (!snippetTitle.trim() || !code.trim()) return;
    const tags = snippetTags.split(',').map((t) => t.trim()).filter(Boolean);
    await createSnippet({
      title: snippetTitle,
      description: snippetDescription || undefined,
      language: selectedLanguage,
      code,
      tags,
      category: snippetCategory || undefined,
      is_template: false,
    });
    setSaveSnippetOpen(false);
    setSnippetTitle('');
    setSnippetDescription('');
    setSnippetTags('');
    setSnippetCategory('');
  }, [snippetTitle, snippetDescription, snippetTags, snippetCategory, code, selectedLanguage, createSnippet]);

  if (!isAvailable && !statusLoading) {
    return (
      <div className={cn('flex flex-col h-full min-h-0 overflow-hidden', className)}>
        <div className="flex items-center justify-between p-2 sm:p-3 border-b shrink-0">
          <div className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            <span className="font-medium">{t('title')}</span>
          </div>
          <Button variant="outline" size="icon" onClick={() => refreshStatus()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <EmptyState
            icon={Terminal}
            title={t('unavailable')}
            description={statusError || t('noContainerRuntime')}
            compact
          />
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full min-h-0 overflow-hidden', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-2 sm:p-3 border-b shrink-0">
        <div className="flex items-center gap-2">
          <Terminal className="h-5 w-5" />
          <span className="font-medium">{t('title')}</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Session indicator */}
          {currentSessionId ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className="text-xs cursor-pointer gap-1"
                  onClick={handleEndSession}
                >
                  <Layers className="h-3 w-3" />
                  {sessions.find((s) => s.id === currentSessionId)?.name || 'Session'}
                  <X className="h-3 w-3 ml-0.5 hover:text-destructive" />
                </Badge>
              </TooltipTrigger>
              <TooltipContent>End session</TooltipContent>
            </Tooltip>
          ) : (
            <Dialog open={sessionDialogOpen} onOpenChange={setSessionDialogOpen}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => setSessionDialogOpen(true)}
                  >
                    <Plus className="h-3 w-3" />
                    Session
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Start a new session to group executions</TooltipContent>
              </Tooltip>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>Start Session</DialogTitle>
                  <DialogDescription>
                    Group your code executions into a named session.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-2">
                  <Label htmlFor="session-name">Session Name</Label>
                  <Input
                    id="session-name"
                    value={newSessionName}
                    onChange={(e) => setNewSessionName(e.target.value)}
                    placeholder="e.g. Algorithm Practice"
                    onKeyDown={(e) => e.key === 'Enter' && handleStartSession()}
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setSessionDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleStartSession} disabled={!newSessionName.trim()}>Start</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {runtimes.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {runtimes[0]}
            </Badge>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={() => refreshStatus()}
                disabled={statusLoading}
              >
                <RefreshCw className={cn('h-4 w-4', statusLoading && 'animate-spin')} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refresh status</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <div className="px-2 sm:px-3 pt-2 shrink-0">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="editor" className="flex items-center gap-1.5">
              <Code className="h-4 w-4" />
              <span className="hidden sm:inline">Editor</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-1.5">
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">History</span>
            </TabsTrigger>
            <TabsTrigger value="snippets" className="flex items-center gap-1.5">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Snippets</span>
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center gap-1.5">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Stats</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Editor Tab */}
        <TabsContent value="editor" className="flex-1 flex flex-col min-h-0 m-0 p-0">
          <div className="p-2 sm:p-3 border-b shrink-0 space-y-2">
            <div className="flex items-center gap-2">
              <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
                <SelectTrigger className="w-35">
                  <SelectValue placeholder={t('language')} />
                </SelectTrigger>
                <SelectContent>
                  {languages.length > 0 ? (
                    languages.map((lang) => (
                      <SelectItem
                        key={typeof lang === 'string' ? lang : lang.id}
                        value={typeof lang === 'string' ? lang : lang.id}
                      >
                        {typeof lang === 'string' ? getLanguageDisplayName(lang) : lang.name}
                      </SelectItem>
                    ))
                  ) : (
                    <>
                      <SelectItem value="python">Python</SelectItem>
                      <SelectItem value="javascript">JavaScript</SelectItem>
                      <SelectItem value="typescript">TypeScript</SelectItem>
                      <SelectItem value="cpp">C++</SelectItem>
                      <SelectItem value="rust">Rust</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>

              {hasLanguageSettings && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSettings(!showSettings)}
                  className="gap-1"
                >
                  <Settings className="h-4 w-4" />
                  <ChevronDown
                    className={cn('h-3 w-3 transition-transform', showSettings && 'rotate-180')}
                  />
                </Button>
              )}

              <Button
                onClick={handleExecute}
                disabled={executing || !code.trim()}
                className="flex-1"
              >
                {executing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('running')}
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    {t('run')}
                  </>
                )}
              </Button>

              {result && (
                <Button variant="outline" size="icon" onClick={reset}>
                  <Square className="h-4 w-4" />
                </Button>
              )}

              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Keyboard className="h-3 w-3" />
                    <span className="hidden sm:inline">Ctrl+Enter</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Run code (Ctrl+Enter)</TooltipContent>
              </Tooltip>
            </div>

            {/* Compiler Settings Panel */}
            <Collapsible open={showSettings && hasLanguageSettings}>
              <CollapsibleContent className="space-y-3">
                <div className="p-3 rounded-lg border bg-muted/30 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Settings className="h-4 w-4" />
                    {t('compilerSettings')}
                  </div>

                  {/* C/C++ Settings */}
                  {(selectedLanguage === 'c' || selectedLanguage === 'cpp') && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">{t('compiler')}</Label>
                        <Select
                          value={
                            selectedLanguage === 'cpp'
                              ? compilerSettings.cppCompiler
                              : compilerSettings.cCompiler
                          }
                          onValueChange={(v) =>
                            setCompilerSettings((prev) => ({
                              ...prev,
                              [selectedLanguage === 'cpp' ? 'cppCompiler' : 'cCompiler']: v,
                            }))
                          }
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {selectedLanguage === 'cpp' ? (
                              <>
                                <SelectItem value="g++">g++</SelectItem>
                                <SelectItem value="clang++">clang++</SelectItem>
                              </>
                            ) : (
                              <>
                                <SelectItem value="gcc">gcc</SelectItem>
                                <SelectItem value="clang">clang</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      {selectedLanguage === 'cpp' && (
                        <div className="space-y-1.5">
                          <Label className="text-xs">{t('cppStandard')}</Label>
                          <Select
                            value={compilerSettings.cppStandard}
                            onValueChange={(v) =>
                              setCompilerSettings((prev) => ({
                                ...prev,
                                cppStandard: v as CppStandard,
                              }))
                            }
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="c++11">C++11</SelectItem>
                              <SelectItem value="c++14">C++14</SelectItem>
                              <SelectItem value="c++17">C++17</SelectItem>
                              <SelectItem value="c++20">C++20</SelectItem>
                              <SelectItem value="c++23">C++23</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <Label className="text-xs">{t('optimization')}</Label>
                        <Select
                          value={compilerSettings.optimization}
                          onValueChange={(v) =>
                            setCompilerSettings((prev) => ({
                              ...prev,
                              optimization: v as OptimizationLevel,
                            }))
                          }
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="-O0">-O0 (None)</SelectItem>
                            <SelectItem value="-O1">-O1 (Basic)</SelectItem>
                            <SelectItem value="-O2">-O2 (Standard)</SelectItem>
                            <SelectItem value="-O3">-O3 (Aggressive)</SelectItem>
                            <SelectItem value="-Os">-Os (Size)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center gap-2 col-span-full">
                        <Switch
                          id="warnings"
                          checked={compilerSettings.enableWarnings}
                          onCheckedChange={(checked) =>
                            setCompilerSettings((prev) => ({ ...prev, enableWarnings: checked }))
                          }
                        />
                        <Label htmlFor="warnings" className="text-xs">
                          {t('enableWarnings')}
                        </Label>
                      </div>
                    </div>
                  )}

                  {/* Rust Settings */}
                  {selectedLanguage === 'rust' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">{t('rustEdition')}</Label>
                        <Select
                          value={compilerSettings.rustEdition}
                          onValueChange={(v) =>
                            setCompilerSettings((prev) => ({
                              ...prev,
                              rustEdition: v as RustEdition,
                            }))
                          }
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="2018">2018</SelectItem>
                            <SelectItem value="2021">2021</SelectItem>
                            <SelectItem value="2024">2024</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center gap-2">
                        <Switch
                          id="release"
                          checked={compilerSettings.rustRelease}
                          onCheckedChange={(checked) =>
                            setCompilerSettings((prev) => ({ ...prev, rustRelease: checked }))
                          }
                        />
                        <Label htmlFor="release" className="text-xs">
                          {t('releaseMode')}
                        </Label>
                      </div>
                    </div>
                  )}

                  {/* Python Settings */}
                  {selectedLanguage === 'python' && (
                    <div className="flex flex-wrap gap-4">
                      <div className="flex items-center gap-2">
                        <Switch
                          id="unbuffered"
                          checked={compilerSettings.pythonUnbuffered}
                          onCheckedChange={(checked) =>
                            setCompilerSettings((prev) => ({ ...prev, pythonUnbuffered: checked }))
                          }
                        />
                        <Label htmlFor="unbuffered" className="text-xs">
                          {t('unbufferedOutput')}
                        </Label>
                      </div>

                      <div className="flex items-center gap-2">
                        <Switch
                          id="optimize"
                          checked={compilerSettings.pythonOptimize}
                          onCheckedChange={(checked) =>
                            setCompilerSettings((prev) => ({ ...prev, pythonOptimize: checked }))
                          }
                        />
                        <Label htmlFor="optimize" className="text-xs">
                          {t('optimizeBytecode')}
                        </Label>
                      </div>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          <ScrollArea className="flex-1 min-h-0">
            <div className="p-2 sm:p-3 space-y-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Code className="h-4 w-4" />
                      {t('code')}
                    </div>
                    <div className="flex items-center gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => setShowInput(!showInput)}
                          >
                            <FileInput className={cn('h-3.5 w-3.5', showInput && 'text-primary')} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {showInput ? t('hideInput') : t('showInput')}
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => setSaveSnippetOpen(true)}
                            disabled={!code.trim()}
                          >
                            <Save className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{t('saveAsSnippet')}</TooltipContent>
                      </Tooltip>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Textarea
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={t('enterCode')}
                    className="font-mono text-sm min-h-37.5 resize-none"
                    disabled={executing}
                  />

                  {/* Stdin and Args input section */}
                  <Collapsible open={showInput}>
                    <CollapsibleContent className="space-y-3">
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">{t('stdin')}</Label>
                        <Textarea
                          value={stdin}
                          onChange={(e) => setStdin(e.target.value)}
                          placeholder={t('stdinPlaceholder')}
                          className="font-mono text-sm min-h-15 resize-none"
                          disabled={executing}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">{t('args')}</Label>
                        <Input
                          value={args}
                          onChange={(e) => setArgs(e.target.value)}
                          placeholder={t('argsPlaceholder')}
                          className="font-mono text-sm"
                          disabled={executing}
                        />
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </CardContent>
              </Card>

              {/* Enhanced Output Display */}
              {(result || execError) && (
                <Card className="overflow-hidden">
                  <CardHeader className="pb-2 bg-muted/30">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Terminal className="h-4 w-4" />
                      {t('output')}
                      <div className="flex items-center gap-2 ml-auto">
                        {/* Output toolbar */}
                        <div className="flex items-center gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => {
                                  const outputText = [result?.stdout, result?.stderr, execError]
                                    .filter(Boolean)
                                    .join('\n');
                                  navigator.clipboard.writeText(outputText);
                                }}
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t('copyOutput')}</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={reset}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t('clearOutput')}</TooltipContent>
                          </Tooltip>
                        </div>
                        {result && (
                          <>
                            <Badge
                              variant={
                                result.status === 'completed' && result.exit_code === 0
                                  ? 'default'
                                  : 'destructive'
                              }
                              className="text-xs"
                            >
                              {result.status === 'completed' && result.exit_code === 0 ? (
                                <CheckCircle className="h-3 w-3 mr-1" />
                              ) : result.status === 'timeout' ? (
                                <AlertTriangle className="h-3 w-3 mr-1" />
                              ) : (
                                <XCircle className="h-3 w-3 mr-1" />
                              )}
                              {result.status === 'timeout'
                                ? t('timeout')
                                : `${t('exitCode')}: ${result.exit_code}`}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              <Timer className="h-3 w-3 mr-1" />
                              {result.execution_time_ms}ms
                            </Badge>
                            {result.memory_used_bytes && result.memory_used_bytes > 0 && (
                              <Badge variant="outline" className="text-xs">
                                <Cpu className="h-3 w-3 mr-1" />
                                {(result.memory_used_bytes / 1024 / 1024).toFixed(1)} MB
                              </Badge>
                            )}
                          </>
                        )}
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {/* Terminal-style output area */}
                    <div className="bg-zinc-950 dark:bg-zinc-900 text-zinc-100 font-mono text-sm">
                      {execError && (
                        <div className="p-3 border-b border-zinc-800">
                          <div className="flex items-center gap-2 text-red-400 text-xs mb-1">
                            <XCircle className="h-3 w-3" />
                            {t('runtimeError')}
                          </div>
                          <pre className="text-red-400 whitespace-pre-wrap">{execError}</pre>
                        </div>
                      )}

                      {/* Compilation output for compiled languages */}
                      {isCompiledLanguage && result?.stderr && result.exit_code !== 0 && (
                        <div className="p-3 border-b border-zinc-800">
                          <div className="flex items-center gap-2 text-yellow-400 text-xs mb-2">
                            <AlertTriangle className="h-3 w-3" />
                            {t('compilationOutput')}
                          </div>
                          <pre className="text-yellow-300 whitespace-pre-wrap overflow-x-auto leading-relaxed">
                            {result.stderr}
                          </pre>
                        </div>
                      )}

                      {/* Standard output */}
                      {result?.stdout && (
                        <div className="p-3 border-b border-zinc-800 last:border-b-0">
                          <div className="flex items-center gap-2 text-green-400 text-xs mb-2">
                            <CheckCircle className="h-3 w-3" />
                            {t('stdout')}
                          </div>
                          <pre className="text-zinc-100 whitespace-pre-wrap overflow-x-auto leading-relaxed">
                            {result.stdout}
                          </pre>
                        </div>
                      )}

                      {/* Standard error (when not a compilation error) */}
                      {result?.stderr && (result.exit_code === 0 || !isCompiledLanguage) && (
                        <div className="p-3 border-b border-zinc-800 last:border-b-0">
                          <div className="flex items-center gap-2 text-red-400 text-xs mb-2">
                            <AlertTriangle className="h-3 w-3" />
                            {t('stderr')}
                          </div>
                          <pre className="text-red-300 whitespace-pre-wrap overflow-x-auto leading-relaxed">
                            {result.stderr}
                          </pre>
                        </div>
                      )}

                      {/* No output message */}
                      {result && !result.stdout && !result.stderr && !execError && (
                        <div className="p-4 text-center text-zinc-500 italic">{t('noOutput')}</div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="flex-1 min-h-0 m-0 p-2 sm:p-3">
          <ExecutionHistory
            className="h-full"
            onSelectExecution={handleSelectFromHistory}
            limit={50}
          />
        </TabsContent>

        {/* Snippets Tab */}
        <TabsContent value="snippets" className="flex-1 min-h-0 m-0 p-2 sm:p-3">
          <SnippetManager
            className="h-full"
            onSelectSnippet={handleSelectSnippet}
            onExecuteSnippet={handleExecuteSnippet}
          />
        </TabsContent>

        {/* Statistics Tab */}
        <TabsContent value="stats" className="flex-1 min-h-0 m-0 p-2 sm:p-3">
          <SandboxStatistics className="h-full" />
        </TabsContent>
      </Tabs>

      {/* Save as Snippet Dialog */}
      <Dialog open={saveSnippetOpen} onOpenChange={setSaveSnippetOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('saveAsSnippet')}</DialogTitle>
            <DialogDescription>
              {getLanguageDisplayName(selectedLanguage)} · {code.split('\n').length} lines
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="snippet-title">Title</Label>
              <Input
                id="snippet-title"
                value={snippetTitle}
                onChange={(e) => setSnippetTitle(e.target.value)}
                placeholder="Enter snippet title..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="snippet-desc">Description</Label>
              <Input
                id="snippet-desc"
                value={snippetDescription}
                onChange={(e) => setSnippetDescription(e.target.value)}
                placeholder="Optional description..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="snippet-category">Category</Label>
                <Input
                  id="snippet-category"
                  value={snippetCategory}
                  onChange={(e) => setSnippetCategory(e.target.value)}
                  placeholder="e.g. algorithms"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="snippet-tags">Tags</Label>
                <Input
                  id="snippet-tags"
                  value={snippetTags}
                  onChange={(e) => setSnippetTags(e.target.value)}
                  placeholder="tag1, tag2"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveSnippetOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveAsSnippet} disabled={!snippetTitle.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {statusError && (
        <div className="p-2 border-t text-xs text-destructive text-center shrink-0">
          {statusError}
        </div>
      )}
    </div>
  );
}
