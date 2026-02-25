'use client';

/**
 * Sandbox Page - Full-featured code execution playground
 * Split-pane layout: code editor + output panel
 * Integrates all existing sandbox hooks, stores, and components
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

import { useSandbox, useCodeExecution, useSnippets, useSessions } from '@/hooks/sandbox';
import { useSandboxStore } from '@/stores/sandbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ExecutionHistory } from '@/components/sandbox/execution-history';
import { SnippetManager } from '@/components/sandbox/snippet-manager';
import { SandboxStatistics } from '@/components/sandbox/sandbox-statistics';
import {
  Terminal, RefreshCw, Code, History, BookOpen, Settings,
  BarChart3, Layers, Plus, X, ArrowLeft, Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { LANGUAGE_TEMPLATES } from '@/types/system/sandbox';
import type { CompilerSettings } from '@/types/system/sandbox';

import { SandboxEditor } from './sandbox-editor';

export default function SandboxPage() {
  const t = useTranslations('sandboxPage');

  const { isAvailable, isLoading: statusLoading, languages, runtimes, error: statusError, refreshStatus } = useSandbox();
  const { result, executing, error: execError, execute, reset, cancel } = useCodeExecution();

  // Zustand store for persistent state
  const storeLanguage = useSandboxStore((s) => s.selectedLanguage);
  const storeCode = useSandboxStore((s) => s.editorCode);
  const setStoreLanguage = useSandboxStore((s) => s.setSelectedLanguage);
  const setStoreCode = useSandboxStore((s) => s.setEditorCode);

  const [selectedLanguage, setSelectedLanguageLocal] = useState<string>(storeLanguage || 'python');
  const [code, setCodeLocal] = useState<string>(storeCode || '');
  const [activeTab, setActiveTab] = useState<string>('editor');
  const [stdin, setStdin] = useState('');
  const [args, setArgs] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [saveSnippetOpen, setSaveSnippetOpen] = useState(false);
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [snippetTitle, setSnippetTitle] = useState('');
  const [snippetDescription, setSnippetDescription] = useState('');
  const [snippetTags, setSnippetTags] = useState('');
  const [snippetCategory, setSnippetCategory] = useState('');
  const [executionElapsed, setExecutionElapsed] = useState(0);
  const [compilerSettings, setCompilerSettingsState] = useState<CompilerSettings>({
    cppStandard: 'c++20', optimization: '-O2', cppCompiler: 'g++', cCompiler: 'gcc',
    enableWarnings: true, rustEdition: '2021', rustRelease: false, pythonUnbuffered: true, pythonOptimize: false,
  });

  const { snippets, createSnippet } = useSnippets();
  const { sessions, currentSessionId, startSession, endSession } = useSessions();

  const setSelectedLanguage = useCallback((lang: string) => {
    setSelectedLanguageLocal(lang);
    setStoreLanguage(lang);
  }, [setStoreLanguage]);

  const setCode = useCallback((newCode: string) => { setCodeLocal(newCode); }, []);

  // Debounced store sync
  useEffect(() => {
    if (!code.trim()) return;
    const timer = setTimeout(() => setStoreCode(code), 500);
    return () => clearTimeout(timer);
  }, [code, setStoreCode]);

  // Execution timer
  useEffect(() => {
    if (!executing) return;
    const start = Date.now();
    const iv = setInterval(() => setExecutionElapsed(Math.round((Date.now() - start) / 100) / 10), 100);
    return () => { clearInterval(iv); setExecutionElapsed(0); };
  }, [executing]);

  const hasLanguageSettings = useMemo(() => ['c', 'cpp', 'rust', 'python'].includes(selectedLanguage), [selectedLanguage]);

  const handleExecute = useCallback(async () => {
    if (!code.trim() || !selectedLanguage) return;
    const customArgs = args.trim() ? args.trim().split(/\s+/) : undefined;
    await execute({
      language: selectedLanguage, code,
      stdin: stdin.trim() || undefined,
      args: customArgs,
      compiler_settings: {
        cpp_standard: compilerSettings.cppStandard,
        optimization: compilerSettings.optimization,
        c_compiler: compilerSettings.cCompiler,
        cpp_compiler: compilerSettings.cppCompiler,
        enable_warnings: compilerSettings.enableWarnings,
        rust_edition: compilerSettings.rustEdition,
        rust_release: compilerSettings.rustRelease,
        python_unbuffered: compilerSettings.pythonUnbuffered,
        python_optimize: compilerSettings.pythonOptimize,
      },
    });
  }, [code, selectedLanguage, stdin, args, compilerSettings, execute]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); handleExecute(); }
  }, [handleExecute]);

  const handleLanguageChange = (lang: string) => {
    setSelectedLanguage(lang);
    reset();
    if (!code.trim() && LANGUAGE_TEMPLATES[lang]) setCode(LANGUAGE_TEMPLATES[lang]);
  };

  const handleSelectFromHistory = useCallback((selectedCode: string, language: string) => {
    setCode(selectedCode); setSelectedLanguage(language); setActiveTab('editor');
  }, [setCode, setSelectedLanguage]);

  const handleSelectSnippet = useCallback((snippetCode: string, language: string) => {
    setCode(snippetCode); setSelectedLanguage(language); setActiveTab('editor');
  }, [setCode, setSelectedLanguage]);

  const handleExecuteSnippet = useCallback(async (snippetId: string) => {
    const snippet = snippets.find((s) => s.id === snippetId);
    if (snippet) {
      setCode(snippet.code); setSelectedLanguage(snippet.language); setActiveTab('editor');
      setTimeout(() => execute({ language: snippet.language, code: snippet.code }), 100);
    }
  }, [snippets, setCode, setSelectedLanguage, execute]);

  const handleStartSession = useCallback(async () => {
    if (!newSessionName.trim()) return;
    await startSession(newSessionName.trim());
    setNewSessionName(''); setSessionDialogOpen(false);
  }, [newSessionName, startSession]);

  const handleSaveAsSnippet = useCallback(async () => {
    if (!snippetTitle.trim() || !code.trim()) return;
    const tags = snippetTags.split(',').map((t) => t.trim()).filter(Boolean);
    await createSnippet({
      title: snippetTitle, description: snippetDescription || undefined,
      language: selectedLanguage, code, tags, category: snippetCategory || undefined, is_template: false,
    });
    setSaveSnippetOpen(false); setSnippetTitle(''); setSnippetDescription(''); setSnippetTags(''); setSnippetCategory('');
  }, [snippetTitle, snippetDescription, snippetTags, snippetCategory, code, selectedLanguage, createSnippet]);

  const handleCopyOutput = useCallback(() => {
    const text = [result?.stdout, result?.stderr, execError].filter(Boolean).join('\n');
    if (text) navigator.clipboard.writeText(text);
  }, [result, execError]);

  // Unavailable state
  if (!isAvailable && !statusLoading) {
    return (
      <div className="flex h-svh flex-col items-center justify-center bg-background p-4">
        <div className="text-center space-y-6 max-w-md animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
          <div className="mx-auto h-20 w-20 rounded-2xl bg-muted/50 flex items-center justify-center">
            <Terminal className="h-10 w-10 text-muted-foreground/50" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">{statusError || t('unavailableDesc')}</p>
          </div>
          <div className="flex gap-3 justify-center">
            <Link href="/"><Button variant="outline" size="lg" className="gap-2"><ArrowLeft className="h-4 w-4" />{t('backToChat')}</Button></Link>
            <Button variant="default" size="lg" onClick={() => refreshStatus()} className="gap-2"><RefreshCw className="h-4 w-4" />{t('retry')}</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-svh flex-col bg-background">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b px-4 bg-background/95 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href="/"><Button variant="ghost" size="icon" className="h-9 w-9"><ArrowLeft className="h-4 w-4" /></Button></Link>
            </TooltipTrigger>
            <TooltipContent side="right">{t('backToChat')}</TooltipContent>
          </Tooltip>
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10">
              <Terminal className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-none">{t('title')}</h1>
              <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">{t('subtitle')}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Session indicator */}
          {currentSessionId ? (
            <Badge variant="outline" className="text-xs cursor-pointer gap-1" onClick={() => endSession()}>
              <Layers className="h-3 w-3" />
              {sessions.find((s) => s.id === currentSessionId)?.name || 'Session'}
              <X className="h-3 w-3 ml-0.5 hover:text-destructive" />
            </Badge>
          ) : (
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setSessionDialogOpen(true)}>
              <Plus className="h-3 w-3" />{t('newSession')}
            </Button>
          )}
          {runtimes.length > 0 && <Badge variant="secondary" className="text-xs">{runtimes[0]}</Badge>}
          {executing && (
            <Badge variant="outline" className="text-xs gap-1 text-orange-500 border-orange-500/30">
              <Clock className="h-3 w-3 animate-spin" />{executionElapsed}s
            </Badge>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => refreshStatus()} disabled={statusLoading}>
                <RefreshCw className={cn('h-4 w-4', statusLoading && 'animate-spin')} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('refreshStatus')}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href="/sandbox/sessions">
                <Button variant="ghost" size="icon" className="h-9 w-9"><Layers className="h-4 w-4" /></Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent>{t('viewSessions')}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href="/settings">
                <Button variant="ghost" size="icon" className="h-9 w-9"><Settings className="h-4 w-4" /></Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent>{t('settings')}</TooltipContent>
          </Tooltip>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
          <div className="px-4 pt-2 shrink-0">
            <TabsList className="w-auto">
              <TabsTrigger value="editor" className="gap-1.5"><Code className="h-4 w-4" /><span className="hidden sm:inline">{t('tabEditor')}</span></TabsTrigger>
              <TabsTrigger value="history" className="gap-1.5"><History className="h-4 w-4" /><span className="hidden sm:inline">{t('tabHistory')}</span></TabsTrigger>
              <TabsTrigger value="snippets" className="gap-1.5"><BookOpen className="h-4 w-4" /><span className="hidden sm:inline">{t('tabSnippets')}</span></TabsTrigger>
              <TabsTrigger value="stats" className="gap-1.5"><BarChart3 className="h-4 w-4" /><span className="hidden sm:inline">{t('tabStats')}</span></TabsTrigger>
            </TabsList>
          </div>

          {/* Editor Tab - Split pane */}
          <TabsContent value="editor" className="flex-1 m-0 p-0 overflow-hidden">
            <SandboxEditor
              code={code}
              setCode={setCode}
              selectedLanguage={selectedLanguage}
              languages={languages}
              onLanguageChange={handleLanguageChange}
              onExecute={handleExecute}
              executing={executing}
              result={result}
              execError={execError}
              onReset={reset}
              onKeyDown={handleKeyDown}
              stdin={stdin}
              setStdin={setStdin}
              args={args}
              setArgs={setArgs}
              showInput={showInput}
              setShowInput={setShowInput}
              showSettings={showSettings}
              setShowSettings={setShowSettings}
              hasLanguageSettings={hasLanguageSettings}
              compilerSettings={compilerSettings}
              setCompilerSettings={setCompilerSettingsState}
              onSaveSnippet={() => setSaveSnippetOpen(true)}
              onCopyOutput={handleCopyOutput}
              executionElapsed={executionElapsed}
              onCancel={cancel}
            />
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="flex-1 m-0 overflow-hidden">
            <div className="h-full p-4">
              <ExecutionHistory className="h-full" onSelectExecution={handleSelectFromHistory} limit={30} />
            </div>
          </TabsContent>

          {/* Snippets Tab */}
          <TabsContent value="snippets" className="flex-1 m-0 overflow-hidden">
            <div className="h-full p-4">
              <SnippetManager className="h-full" onSelectSnippet={handleSelectSnippet} onExecuteSnippet={handleExecuteSnippet} />
            </div>
          </TabsContent>

          {/* Stats Tab */}
          <TabsContent value="stats" className="flex-1 m-0 overflow-hidden">
            <div className="h-full p-4">
              <SandboxStatistics className="h-full" />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Session Dialog */}
      <Dialog open={sessionDialogOpen} onOpenChange={setSessionDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('startSessionTitle')}</DialogTitle>
            <DialogDescription>{t('startSessionDesc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="session-name">{t('sessionName')}</Label>
            <Input id="session-name" value={newSessionName} onChange={(e) => setNewSessionName(e.target.value)} placeholder={t('sessionNamePlaceholder')} onKeyDown={(e) => e.key === 'Enter' && handleStartSession()} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSessionDialogOpen(false)}>{t('cancel')}</Button>
            <Button onClick={handleStartSession} disabled={!newSessionName.trim()}>{t('start')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save Snippet Dialog */}
      <Dialog open={saveSnippetOpen} onOpenChange={setSaveSnippetOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('saveSnippetTitle')}</DialogTitle>
            <DialogDescription>{t('saveSnippetDesc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>{t('snippetTitleLabel')}</Label>
              <Input value={snippetTitle} onChange={(e) => setSnippetTitle(e.target.value)} placeholder={t('snippetTitlePlaceholder')} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('snippetDescLabel')}</Label>
              <Input value={snippetDescription} onChange={(e) => setSnippetDescription(e.target.value)} placeholder={t('snippetDescPlaceholder')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t('snippetTagsLabel')}</Label>
                <Input value={snippetTags} onChange={(e) => setSnippetTags(e.target.value)} placeholder={t('snippetTagsPlaceholder')} />
              </div>
              <div className="space-y-1.5">
                <Label>{t('snippetCategoryLabel')}</Label>
                <Input value={snippetCategory} onChange={(e) => setSnippetCategory(e.target.value)} placeholder={t('snippetCategoryPlaceholder')} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveSnippetOpen(false)}>{t('cancel')}</Button>
            <Button onClick={handleSaveAsSnippet} disabled={!snippetTitle.trim() || !code.trim()}>{t('save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
