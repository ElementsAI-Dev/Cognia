'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useSandbox, useCodeExecution, useExecutionHistory, useSnippets } from '@/hooks/sandbox';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EmptyState } from '@/components/layout/empty-state';
import {
  Play,
  Square,
  Terminal,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Loader2,
  Code,
  History,
  BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SandboxPanelProps {
  className?: string;
  onExecutionComplete?: (result: { stdout: string; stderr: string; success: boolean }) => void;
}

export function SandboxPanel({
  className,
  onExecutionComplete,
}: SandboxPanelProps) {
  const t = useTranslations('sandboxPanel');
  const {
    isAvailable,
    isLoading: statusLoading,
    languages,
    runtimes,
    error: statusError,
    refreshStatus,
  } = useSandbox();

  const {
    result,
    executing,
    error: execError,
    quickExecute,
    reset,
  } = useCodeExecution();

  const { executions, loading: historyLoading } = useExecutionHistory({
    filter: { limit: 5 },
  });

  const { snippets, loading: snippetsLoading } = useSnippets({
    filter: { limit: 5 },
  });

  const [selectedLanguage, setSelectedLanguage] = useState<string>('python');
  const [code, setCode] = useState<string>('');

  const handleExecute = async () => {
    if (!code.trim() || !selectedLanguage) return;

    const execResult = await quickExecute(selectedLanguage, code);
    if (execResult && onExecutionComplete) {
      onExecutionComplete({
        stdout: execResult.stdout || '',
        stderr: execResult.stderr || '',
        success: execResult.status === 'completed' && execResult.exit_code === 0,
      });
    }
  };

  const handleLanguageChange = (lang: string) => {
    setSelectedLanguage(lang);
    reset();
    
    const templates: Record<string, string> = {
      python: '# Python code\nprint("Hello, World!")',
      javascript: '// JavaScript code\nconsole.log("Hello, World!");',
      typescript: '// TypeScript code\nconsole.log("Hello, World!");',
      rust: '// Rust code\nfn main() {\n    println!("Hello, World!");\n}',
      go: '// Go code\npackage main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, World!")\n}',
      java: '// Java code\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}',
      cpp: '// C++ code\n#include <iostream>\n\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    return 0;\n}',
      c: '// C code\n#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}',
    };
    
    if (!code.trim() && templates[lang]) {
      setCode(templates[lang]);
    }
  };

  const getLanguageDisplayName = (lang: string): string => {
    const names: Record<string, string> = {
      python: 'Python',
      javascript: 'JavaScript',
      typescript: 'TypeScript',
      rust: 'Rust',
      go: 'Go',
      java: 'Java',
      cpp: 'C++',
      c: 'C',
      ruby: 'Ruby',
      php: 'PHP',
      swift: 'Swift',
      kotlin: 'Kotlin',
      scala: 'Scala',
      haskell: 'Haskell',
      lua: 'Lua',
      perl: 'Perl',
      r: 'R',
      julia: 'Julia',
    };
    return names[lang] || lang.charAt(0).toUpperCase() + lang.slice(1);
  };

  const handleRerunExecution = async (language: string, codeToRun: string) => {
    setSelectedLanguage(language);
    setCode(codeToRun);
    await quickExecute(language, codeToRun);
  };

  const handleUseSnippet = async (language: string, snippetCode: string) => {
    setSelectedLanguage(language);
    setCode(snippetCode);
    await quickExecute(language, snippetCode);
  };

  if (!isAvailable && !statusLoading) {
    return (
      <div className={cn('flex flex-col h-full min-h-0 overflow-hidden', className)}>
        <div className="flex items-center justify-between p-2 sm:p-3 border-b shrink-0">
          <div className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            <span className="font-medium">{t('title')}</span>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => refreshStatus()}
          >
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
      <div className="flex items-center justify-between p-2 sm:p-3 border-b shrink-0">
        <div className="flex items-center gap-2">
          <Terminal className="h-5 w-5" />
          <span className="font-medium">{t('title')}</span>
        </div>
        <div className="flex items-center gap-2">
          {runtimes.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {runtimes[0]}
            </Badge>
          )}
          <Button
            variant="outline"
            size="icon"
            onClick={() => refreshStatus()}
            disabled={statusLoading}
          >
            <RefreshCw className={cn('h-4 w-4', statusLoading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      <div className="p-2 sm:p-3 border-b shrink-0 space-y-2">
        <div className="flex items-center gap-2">
          <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={t('language')} />
            </SelectTrigger>
            <SelectContent>
              {languages.length > 0 ? (
                languages.map((lang) => (
                  <SelectItem key={typeof lang === 'string' ? lang : lang.id} value={typeof lang === 'string' ? lang : lang.id}>
                    {typeof lang === 'string' ? getLanguageDisplayName(lang) : lang.name}
                  </SelectItem>
                ))
              ) : (
                <>
                  <SelectItem value="python">Python</SelectItem>
                  <SelectItem value="javascript">JavaScript</SelectItem>
                  <SelectItem value="typescript">TypeScript</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>

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
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-2 sm:p-3 space-y-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Code className="h-4 w-4" />
                {t('code')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={t('enterCode')}
                className="font-mono text-sm min-h-[150px] resize-none"
                disabled={executing}
              />
            </CardContent>
          </Card>

          {(result || execError) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  {result?.status === 'completed' && result?.exit_code === 0 ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  {t('output')}
                  {result && (
                    <Badge variant="secondary" className="text-xs ml-auto">
                      <Clock className="h-3 w-3 mr-1" />
                      {result.execution_time_ms}ms
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {execError && (
                  <div className="bg-destructive/10 text-destructive text-sm p-2 rounded font-mono">
                    {execError}
                  </div>
                )}
                
                {result?.stdout && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{t('stdout')}:</p>
                    <pre className="bg-muted p-2 rounded text-sm font-mono whitespace-pre-wrap overflow-x-auto">
                      {result.stdout}
                    </pre>
                  </div>
                )}

                {result?.stderr && (
                  <div className="space-y-1">
                    <p className="text-xs text-destructive">{t('stderr')}:</p>
                    <pre className="bg-destructive/10 text-destructive p-2 rounded text-sm font-mono whitespace-pre-wrap overflow-x-auto">
                      {result.stderr}
                    </pre>
                  </div>
                )}

                {result && !result.stdout && !result.stderr && (
                  <p className="text-sm text-muted-foreground italic">
                    {t('noOutput')}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Recent Runs
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {historyLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading recent runs...
                  </div>
                ) : executions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No executions yet.</p>
                ) : (
                  <div className="space-y-2">
                    {executions.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start gap-2 rounded border p-2"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <span>{getLanguageDisplayName(item.language)}</span>
                            <Badge variant="outline" className="text-[11px]">
                              {item.status}
                            </Badge>
                          </div>
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground font-mono whitespace-pre-wrap">
                            {item.code}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="shrink-0"
                          onClick={() => handleRerunExecution(item.language, item.code)}
                          disabled={executing}
                        >
                          <Play className="h-3.5 w-3.5 mr-1" />
                          Run again
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Snippets
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {snippetsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading snippets...
                  </div>
                ) : snippets.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No snippets saved.</p>
                ) : (
                  <div className="space-y-2">
                    {snippets.map((snippet) => (
                      <div
                        key={snippet.id}
                        className="flex items-start gap-2 rounded border p-2"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <span>{snippet.title}</span>
                            <Badge variant="outline" className="text-[11px]">
                              {getLanguageDisplayName(snippet.language)}
                            </Badge>
                          </div>
                          {snippet.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {snippet.description}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="shrink-0"
                          onClick={() => handleUseSnippet(snippet.language, snippet.code)}
                          disabled={executing}
                        >
                          <Play className="h-3.5 w-3.5 mr-1" />
                          Run
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </ScrollArea>

      {statusError && (
        <div className="p-2 border-t text-xs text-destructive text-center shrink-0">
          {statusError}
        </div>
      )}
    </div>
  );
}
