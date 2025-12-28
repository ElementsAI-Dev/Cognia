'use client';

/**
 * CodeExecutor - Execute code in a sandboxed environment
 * Supports both frontend JS execution and backend sandbox (Docker/Podman/Native)
 */

import { useState, useCallback, useEffect } from 'react';
import { Play, Square, Copy, Check, Terminal, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { sandboxService } from '@/lib/native/sandbox';
import { getLanguageInfo } from '@/types/sandbox';
import type { ExecutionResult as BackendExecutionResult } from '@/types/sandbox';

interface CodeExecutorProps {
  code: string;
  language: string;
  className?: string;
  stdin?: string;
  useBackend?: boolean;
}

interface ExecutionResult {
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
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [backendAvailable, setBackendAvailable] = useState(false);
  const [executionMode, setExecutionMode] = useState<'frontend' | 'backend'>('frontend');

  const langLower = language.toLowerCase();
  const isFrontendSupported = FRONTEND_LANGUAGES.includes(langLower);
  const isBackendSupported = ALL_BACKEND_LANGUAGES.includes(langLower);
  const isSupported = isFrontendSupported || (backendAvailable && isBackendSupported);
  const _langInfo = getLanguageInfo(langLower);

  // Check backend availability on mount
  useEffect(() => {
    if (useBackend) {
      sandboxService.isAvailable().then(setBackendAvailable).catch(() => setBackendAvailable(false));
    }
  }, [useBackend]);

  // Determine execution mode
  useEffect(() => {
    if (backendAvailable && isBackendSupported && useBackend) {
      setExecutionMode('backend');
    } else if (isFrontendSupported) {
      setExecutionMode('frontend');
    }
  }, [backendAvailable, isBackendSupported, isFrontendSupported, useBackend]);

  // Execute code via backend sandbox
  const executeBackend = useCallback(async () => {
    const startTime = performance.now();
    try {
      const backendResult: BackendExecutionResult = stdin
        ? await sandboxService.executeWithStdin(langLower, code, stdin)
        : await sandboxService.quickExecute(langLower, code);

      const output = backendResult.stdout || '';
      const error = backendResult.stderr || backendResult.error || '';
      const success = backendResult.status === 'completed' && backendResult.exit_code === 0;

      setResult({
        success,
        output: output || (success ? '(No output)' : ''),
        error: error || undefined,
        executionTime: backendResult.execution_time_ms || (performance.now() - startTime),
        runtime: backendResult.runtime,
      });
    } catch (err) {
      setResult({
        success: false,
        output: '',
        error: err instanceof Error ? err.message : String(err),
        executionTime: performance.now() - startTime,
      });
    }
  }, [langLower, code, stdin]);

  // Execute code via frontend eval (JS/TS only)
  const executeFrontend = useCallback(async () => {
    const startTime = performance.now();
    try {
      const logs: string[] = [];
      const errors: string[] = [];

      const sandboxConsole = {
        log: (...args: unknown[]) => logs.push(args.map(formatValue).join(' ')),
        error: (...args: unknown[]) => errors.push(args.map(formatValue).join(' ')),
        warn: (...args: unknown[]) => logs.push(`[WARN] ${args.map(formatValue).join(' ')}`),
        info: (...args: unknown[]) => logs.push(`[INFO] ${args.map(formatValue).join(' ')}`),
      };

      const wrappedCode = `
        (function(console) {
          "use strict";
          ${code}
        })
      `;

      const fn = eval(wrappedCode);
      const returnValue = fn(sandboxConsole);

      if (returnValue instanceof Promise) {
        await returnValue;
      }

      const executionTime = performance.now() - startTime;

      setResult({
        success: errors.length === 0,
        output: logs.join('\n') || '(No output)',
        error: errors.length > 0 ? errors.join('\n') : undefined,
        executionTime,
        runtime: 'browser',
      });
    } catch (error) {
      setResult({
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error),
        executionTime: performance.now() - startTime,
        runtime: 'browser',
      });
    }
  }, [code]);

  const executeCode = useCallback(async () => {
    if (!isSupported) return;

    setIsRunning(true);
    setResult(null);

    try {
      if (executionMode === 'backend' && backendAvailable) {
        await executeBackend();
      } else if (isFrontendSupported) {
        await executeFrontend();
      }
    } finally {
      setIsRunning(false);
    }
  }, [isSupported, executionMode, backendAvailable, executeBackend, isFrontendSupported, executeFrontend]);

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
              Run not supported
            </Badge>
          )}
          {isSupported && backendAvailable && executionMode === 'backend' && (
            <Badge variant="outline" className="text-xs text-blue-500 border-blue-500/50">
              Backend
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
            <span className="text-xs font-medium">Output</span>
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

/**
 * Format a value for console output
 */
function formatValue(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'function') return `[Function: ${value.name || 'anonymous'}]`;
  if (Array.isArray(value)) {
    return `[${value.map(formatValue).join(', ')}]`;
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return '[Object]';
    }
  }
  return String(value);
}

export default CodeExecutor;
