'use client';

/**
 * SandboxEditor - Split-pane code editor + output panel
 * Used within the Sandbox page's editor tab
 */

import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Play,
  Terminal,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronDown,
  Copy,
  Save,
  FileInput,
  Trash2,
  Timer,
  MemoryStick,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LANGUAGE_INFO } from '@/types/system/sandbox';
import type {
  Language,
  CompilerSettings,
  SandboxExecutionResult,
} from '@/types/system/sandbox';

export interface SandboxEditorProps {
  code: string;
  setCode: (code: string) => void;
  selectedLanguage: string;
  languages: Language[];
  onLanguageChange: (lang: string) => void;
  onExecute: () => void;
  executing: boolean;
  result: SandboxExecutionResult | null;
  execError: string | null;
  onReset: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  stdin: string;
  setStdin: (v: string) => void;
  args: string;
  setArgs: (v: string) => void;
  showInput: boolean;
  setShowInput: (v: boolean) => void;
  showSettings: boolean;
  setShowSettings: (v: boolean) => void;
  hasLanguageSettings: boolean;
  compilerSettings: CompilerSettings;
  setCompilerSettings: (s: CompilerSettings) => void;
  onSaveSnippet: () => void;
  onCopyOutput: () => void;
  executionElapsed: number;
}

export function SandboxEditor({
  code,
  setCode,
  selectedLanguage,
  languages,
  onLanguageChange,
  onExecute,
  executing,
  result,
  execError,
  onReset,
  onKeyDown,
  stdin,
  setStdin,
  args,
  setArgs,
  showInput,
  setShowInput,
  showSettings,
  setShowSettings,
  hasLanguageSettings,
  compilerSettings,
  setCompilerSettings,
  onSaveSnippet,
  onCopyOutput,
  executionElapsed,
}: SandboxEditorProps) {
  const t = useTranslations('sandboxPage');
  const tPanel = useTranslations('sandboxPanel');

  const langInfo = LANGUAGE_INFO[selectedLanguage];

  const formatBytes = (bytes: number | null) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getStatusBadge = useCallback(() => {
    if (!result) return null;
    if (result.status === 'completed') {
      return <Badge variant="outline" className="text-xs text-green-600 border-green-600/30 gap-1"><CheckCircle className="h-3 w-3" />{t('success')}</Badge>;
    }
    if (result.status === 'failed') {
      return <Badge variant="outline" className="text-xs text-red-600 border-red-600/30 gap-1"><XCircle className="h-3 w-3" />{t('error')}</Badge>;
    }
    if (result.status === 'timeout') {
      return <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-600/30 gap-1"><AlertTriangle className="h-3 w-3" />{t('timeout')}</Badge>;
    }
    return null;
  }, [result, t]);

  return (
    <div className="flex flex-col lg:flex-row h-full">
      {/* Left Panel: Code Editor */}
      <div className="flex-1 flex flex-col min-h-0 lg:min-w-0 border-b lg:border-b-0 lg:border-r">
        {/* Editor Toolbar */}
        <div className="flex items-center justify-between gap-2 px-4 py-2 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            {/* Language Selector */}
            <Select value={selectedLanguage} onValueChange={onLanguageChange}>
              <SelectTrigger className="w-[160px] h-8 text-xs">
                <SelectValue>
                  <span className="flex items-center gap-1.5">
                    {langInfo && <span>{langInfo.icon}</span>}
                    {langInfo?.name || selectedLanguage}
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {languages.map((lang) => {
                  const info = LANGUAGE_INFO[lang.id];
                  return (
                    <SelectItem key={lang.id} value={lang.id}>
                      <span className="flex items-center gap-2">
                        <span>{info?.icon || '📄'}</span>
                        <span>{info?.name || lang.name}</span>
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setShowInput(!showInput)}>
                  <FileInput className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{showInput ? tPanel('hideInput') : tPanel('showInput')}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>stdin &amp; args</TooltipContent>
            </Tooltip>

            {hasLanguageSettings && (
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setShowSettings(!showSettings)}>
                <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', showSettings && 'rotate-180')} />
                <span className="hidden sm:inline">{showSettings ? tPanel('hideSettings') : tPanel('showSettings')}</span>
              </Button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onSaveSnippet} disabled={!code.trim()}>
                  <Save className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{tPanel('saveAsSnippet')}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setCode(''); onReset(); }}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('clearCode')}</TooltipContent>
            </Tooltip>

            <Button
              size="sm"
              className="h-8 gap-1.5 px-4"
              onClick={onExecute}
              disabled={executing || !code.trim()}
            >
              {executing ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" />{tPanel('running')}</>
              ) : (
                <><Play className="h-3.5 w-3.5" />{tPanel('run')} <kbd className="ml-1 text-[10px] opacity-60">⌘↵</kbd></>
              )}
            </Button>
          </div>
        </div>

        {/* Compiler Settings (Collapsible) */}
        {showSettings && hasLanguageSettings && (
          <div className="px-4 py-2 border-b bg-muted/20 text-xs space-y-2">
            {(selectedLanguage === 'c' || selectedLanguage === 'cpp') && (
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <Label className="text-xs">{tPanel('cppStandard')}</Label>
                  <Select value={compilerSettings.cppStandard} onValueChange={(v) => setCompilerSettings({ ...compilerSettings, cppStandard: v as CompilerSettings['cppStandard'] })}>
                    <SelectTrigger className="h-7 w-24 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['c++11', 'c++14', 'c++17', 'c++20', 'c++23'].map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-1.5">
                  <Label className="text-xs">{tPanel('optimization')}</Label>
                  <Select value={compilerSettings.optimization} onValueChange={(v) => setCompilerSettings({ ...compilerSettings, optimization: v as CompilerSettings['optimization'] })}>
                    <SelectTrigger className="h-7 w-20 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['-O0', '-O1', '-O2', '-O3', '-Os'].map((o) => (
                        <SelectItem key={o} value={o}>{o}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-1.5">
                  <Switch id="warnings" checked={compilerSettings.enableWarnings} onCheckedChange={(v) => setCompilerSettings({ ...compilerSettings, enableWarnings: v })} />
                  <Label htmlFor="warnings" className="text-xs">{tPanel('enableWarnings')}</Label>
                </div>
              </div>
            )}
            {selectedLanguage === 'rust' && (
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <Label className="text-xs">{tPanel('rustEdition')}</Label>
                  <Select value={compilerSettings.rustEdition} onValueChange={(v) => setCompilerSettings({ ...compilerSettings, rustEdition: v as CompilerSettings['rustEdition'] })}>
                    <SelectTrigger className="h-7 w-24 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['2015', '2018', '2021'].map((e) => (
                        <SelectItem key={e} value={e}>{e}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-1.5">
                  <Switch id="release" checked={compilerSettings.rustRelease} onCheckedChange={(v) => setCompilerSettings({ ...compilerSettings, rustRelease: v })} />
                  <Label htmlFor="release" className="text-xs">{tPanel('releaseMode')}</Label>
                </div>
              </div>
            )}
            {selectedLanguage === 'python' && (
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <Switch id="unbuffered" checked={compilerSettings.pythonUnbuffered} onCheckedChange={(v) => setCompilerSettings({ ...compilerSettings, pythonUnbuffered: v })} />
                  <Label htmlFor="unbuffered" className="text-xs">{tPanel('unbufferedOutput')}</Label>
                </div>
                <div className="flex items-center gap-1.5">
                  <Switch id="optimize" checked={compilerSettings.pythonOptimize} onCheckedChange={(v) => setCompilerSettings({ ...compilerSettings, pythonOptimize: v })} />
                  <Label htmlFor="optimize" className="text-xs">{tPanel('optimizeBytecode')}</Label>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Stdin / Args (Collapsible) */}
        {showInput && (
          <div className="px-4 py-2 border-b bg-muted/20 space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">{tPanel('stdin')}</Label>
                <Textarea
                  value={stdin}
                  onChange={(e) => setStdin(e.target.value)}
                  placeholder={tPanel('stdinPlaceholder')}
                  className="font-mono text-xs min-h-[60px] resize-none"
                  rows={3}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">{tPanel('args')}</Label>
                <Input
                  value={args}
                  onChange={(e) => setArgs(e.target.value)}
                  placeholder={tPanel('argsPlaceholder')}
                  className="font-mono text-xs h-8"
                />
              </div>
            </div>
          </div>
        )}

        {/* Code Editor Area */}
        <div className="flex-1 min-h-0">
          <Textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={tPanel('enterCode')}
            className="h-full w-full resize-none border-0 rounded-none font-mono text-sm focus-visible:ring-0 bg-background"
            spellCheck={false}
          />
        </div>
      </div>

      {/* Right Panel: Output */}
      <div className="flex-1 flex flex-col min-h-0 lg:min-w-0 lg:max-w-[50%]">
        {/* Output Header */}
        <div className="flex items-center justify-between gap-2 px-4 py-2 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium">{tPanel('output')}</span>
            {getStatusBadge()}
            {result && (
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-0.5"><Timer className="h-3 w-3" />{result.execution_time_ms}ms</span>
                {result.memory_used_bytes != null && (
                  <span className="flex items-center gap-0.5"><MemoryStick className="h-3 w-3" />{formatBytes(result.memory_used_bytes)}</span>
                )}
                {result.exit_code != null && (
                  <span>{tPanel('exitCode')}: {result.exit_code}</span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onCopyOutput} disabled={!result && !execError}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{tPanel('copyOutput')}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onReset} disabled={!result && !execError}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{tPanel('clearOutput')}</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Output Content */}
        <ScrollArea className="flex-1">
          <div className="p-4 font-mono text-sm">
            {executing && (
              <div className="flex items-center gap-2 text-muted-foreground animate-pulse">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{tPanel('running')} ({executionElapsed}s)</span>
              </div>
            )}

            {!executing && !result && !execError && (
              <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-muted-foreground">
                <Terminal className="h-8 w-8 mb-3 opacity-30" />
                <p className="text-sm">{tPanel('noOutput')}</p>
                <p className="text-xs mt-1 opacity-60">Ctrl+Enter {t('toRun')}</p>
              </div>
            )}

            {execError && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-red-500">
                  <XCircle className="h-4 w-4 shrink-0" />
                  <span className="font-medium">{t('error')}</span>
                </div>
                <pre className="text-red-400 whitespace-pre-wrap break-all text-xs">{execError}</pre>
              </div>
            )}

            {result && (
              <div className="space-y-3">
                {/* Stdout */}
                {result.stdout && (
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground font-medium">{tPanel('stdout')}</div>
                    <pre className="whitespace-pre-wrap break-all text-xs">{result.stdout}</pre>
                  </div>
                )}

                {/* Stderr */}
                {result.stderr && (
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground font-medium">{tPanel('stderr')}</div>
                    <pre className="whitespace-pre-wrap break-all text-xs text-red-400">{result.stderr}</pre>
                  </div>
                )}

                {/* No output */}
                {!result.stdout && !result.stderr && !result.error && (
                  <p className="text-muted-foreground text-xs italic">{tPanel('noOutput')}</p>
                )}

                {/* Error message */}
                {result.error && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-red-500 text-xs font-medium">
                      <XCircle className="h-3 w-3" />
                      {result.status === 'timeout' ? tPanel('timeout') : tPanel('runtimeError')}
                    </div>
                    <pre className="whitespace-pre-wrap break-all text-xs text-red-400 bg-muted/50 rounded p-2">{result.error}</pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
