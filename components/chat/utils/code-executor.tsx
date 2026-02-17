'use client';

/**
 * CodeExecutor - Execute code in a sandboxed environment
 * Supports both frontend JS execution and backend sandbox (Docker/Podman/Native)
 */

import { useState, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Play, Square, Copy, Check, Terminal, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { sandboxService } from '@/lib/native/sandbox';
import { executeCodeWithSandboxPriority } from '@/lib/native/code-execution-strategy';
import { getLanguageInfo } from '@/types/system/sandbox';

interface CodeExecutorProps {
  code: string;
  language: string;
  className?: string;
  stdin?: string;
  useBackend?: boolean;
}

interface SandboxExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  executionTime?: number;
  runtime?: string;
}

const FRONTEND_LANGUAGES = ['javascript', 'js', 'typescript', 'ts'];

const ALL_BACKEND_LANGUAGES = [
  'python', 'py', 'javascript', 'js', 'typescript', 'ts', 'go', 'golang',
  'rust', 'rs', 'java', 'c', 'cpp', 'c++', 'ruby', 'rb', 'php', 'bash', 'sh',
  'powershell', 'ps1', 'r', 'julia', 'jl', 'lua', 'perl', 'pl', 'swift',
  'kotlin', 'kt', 'scala', 'haskell', 'hs', 'elixir', 'ex', 'clojure', 'clj',
  'fsharp', 'fs', 'csharp', 'cs', 'zig',
];

export function CodeExecutor({ code, language, className, stdin, useBackend = true }: CodeExecutorProps) {
  const t = useTranslations('codeExecutor');
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<SandboxExecutionResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [backendAvailable, setBackendAvailable] = useState(false);

  const langLower = language.toLowerCase();
  const isFrontendSupported = FRONTEND_LANGUAGES.includes(langLower);
  const isBackendSupported = ALL_BACKEND_LANGUAGES.includes(langLower);
  const useDesktopSandbox = backendAvailable && isBackendSupported && useBackend;
  const isSupported = isFrontendSupported || useDesktopSandbox;
  const _langInfo = getLanguageInfo(langLower);

  // Check backend availability on mount
  useEffect(() => {
    if (useBackend) {
      sandboxService.isAvailable().then(setBackendAvailable).catch(() => setBackendAvailable(false));
    }
  }, [useBackend]);

  const executeCode = useCallback(async () => {
    if (!isSupported) return;

    setIsRunning(true);
    setResult(null);

    try {
      const executionResult = await executeCodeWithSandboxPriority({
        code,
        language: langLower,
        stdin,
        isDesktop: useDesktopSandbox,
      });

      setResult({
        success: executionResult.success,
        output: executionResult.stdout || (executionResult.success ? '(No output)' : ''),
        error: executionResult.stderr || undefined,
        executionTime: executionResult.executionTime,
        runtime: executionResult.runtime,
      });
    } finally {
      setIsRunning(false);
    }
  }, [isSupported, code, langLower, stdin, useDesktopSandbox]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  const handleStop = useCallback(() => {
    setIsRunning(false);
  }, []);

  return (
    <div className={cn('rounded-lg border overflow-hidden', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-muted-foreground" />
          <Badge variant="outline" className="text-xs">
            {language}
          </Badge>
          {!isSupported && (
            <Badge variant="secondary" className="text-xs">
              {t('notSupported')}
            </Badge>
          )}
          {isSupported && useDesktopSandbox && (
            <Badge variant="outline" className="text-xs text-blue-500 border-blue-500/50">
              {t('backend')}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleCopy}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>
          {isSupported && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={isRunning ? handleStop : executeCode}
              disabled={!code.trim()}
            >
              {isRunning ? (
                <Square className="h-3.5 w-3.5 text-red-500" />
              ) : (
                <Play className="h-3.5 w-3.5 text-green-500" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Code Display */}
      <ScrollArea className="max-h-[300px]">
        <pre className="p-3 text-sm font-mono overflow-x-auto">
          <code>{code}</code>
        </pre>
      </ScrollArea>

      {/* Execution Result */}
      {result && (
        <div className="border-t">
          <div className="flex items-center gap-2 px-3 py-2 bg-muted/30">
            <span className="text-xs font-medium">{t('output')}</span>
            {result.executionTime !== undefined && (
              <span className="text-xs text-muted-foreground">
                ({result.executionTime.toFixed(2)}ms)
              </span>
            )}
            {result.runtime && (
              <Badge variant="outline" className="text-xs h-5">
                {result.runtime}
              </Badge>
            )}
            {!result.success && (
              <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
            )}
          </div>
          <ScrollArea className="max-h-[200px]">
            <pre
              className={cn(
                'p-3 text-sm font-mono whitespace-pre-wrap',
                result.error ? 'text-destructive' : 'text-foreground'
              )}
            >
              {result.error || result.output}
            </pre>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}

export default CodeExecutor;
