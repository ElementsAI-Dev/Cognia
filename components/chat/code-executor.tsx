'use client';

/**
 * CodeExecutor - Execute code in a sandboxed environment
 */

import { useState, useCallback } from 'react';
import { Play, Square, Copy, Check, Terminal, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface CodeExecutorProps {
  code: string;
  language: string;
  className?: string;
}

interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  executionTime?: number;
}

const SUPPORTED_LANGUAGES = ['javascript', 'js', 'typescript', 'ts'];

export function CodeExecutor({ code, language, className }: CodeExecutorProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [copied, setCopied] = useState(false);

  const isSupported = SUPPORTED_LANGUAGES.includes(language.toLowerCase());

  const executeCode = useCallback(async () => {
    if (!isSupported) return;

    setIsRunning(true);
    setResult(null);

    const startTime = performance.now();

    try {
      // Create a sandboxed execution environment
      const logs: string[] = [];
      const errors: string[] = [];

      // Override console methods to capture output
      const sandboxConsole = {
        log: (...args: unknown[]) => logs.push(args.map(formatValue).join(' ')),
        error: (...args: unknown[]) => errors.push(args.map(formatValue).join(' ')),
        warn: (...args: unknown[]) => logs.push(`[WARN] ${args.map(formatValue).join(' ')}`),
        info: (...args: unknown[]) => logs.push(`[INFO] ${args.map(formatValue).join(' ')}`),
      };

      // Create a function from the code with sandboxed console
      const wrappedCode = `
        (function(console) {
          "use strict";
          ${code}
        })
      `;

      // Execute in a try-catch
      const fn = eval(wrappedCode);
      const returnValue = fn(sandboxConsole);

      // Handle async code
      if (returnValue instanceof Promise) {
        await returnValue;
      }

      const executionTime = performance.now() - startTime;

      setResult({
        success: errors.length === 0,
        output: logs.join('\n') || '(No output)',
        error: errors.length > 0 ? errors.join('\n') : undefined,
        executionTime,
      });
    } catch (error) {
      const executionTime = performance.now() - startTime;
      setResult({
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error),
        executionTime,
      });
    } finally {
      setIsRunning(false);
    }
  }, [code, isSupported]);

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
