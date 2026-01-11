'use client';

/**
 * CodeExecutionPanel - Displays code execution results in Canvas
 */

import { memo } from 'react';
import { useTranslations } from 'next-intl';
import {
  Play,
  Square,
  CheckCircle2,
  XCircle,
  Clock,
  Terminal,
  AlertTriangle,
  Copy,
  X,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useCopy } from '@/hooks/ui';
import type { CodeSandboxExecutionResult } from '@/hooks/canvas/use-code-execution';

interface CodeExecutionPanelProps {
  result: CodeSandboxExecutionResult | null;
  isExecuting: boolean;
  language: string;
  onExecute: () => void;
  onCancel: () => void;
  onClear: () => void;
  className?: string;
}

export const CodeExecutionPanel = memo(function CodeExecutionPanel({
  result,
  isExecuting,
  language,
  onExecute,
  onCancel,
  onClear,
  className,
}: CodeExecutionPanelProps) {
  const t = useTranslations('canvas');
  const { copy, isCopying } = useCopy();

  const handleCopyOutput = async () => {
    if (result) {
      const output = result.stdout || result.stderr;
      await copy(output);
    }
  };

  const getStatusIcon = () => {
    if (isExecuting) {
      return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
    }
    if (!result) {
      return <Terminal className="h-4 w-4 text-muted-foreground" />;
    }
    if (result.success) {
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    }
    return <XCircle className="h-4 w-4 text-red-500" />;
  };

  const getStatusText = () => {
    if (isExecuting) return t('executing');
    if (!result) return t('readyToRun');
    if (result.success) return t('executionSuccess');
    return t('executionFailed');
  };

  return (
    <div className={cn('border-t flex flex-col', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="text-sm font-medium">{t('codeExecution')}</span>
          <Badge variant="outline" className="text-xs">
            {language}
          </Badge>
          {result?.isSimulated && (
            <Badge variant="secondary" className="text-xs">
              {t('simulated')}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          {result && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={handleCopyOutput}
                    disabled={isCopying}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('copyOutput')}</TooltipContent>
              </Tooltip>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={onClear}
              >
                <X className="h-3 w-3" />
              </Button>
            </>
          )}
          {isExecuting ? (
            <Button
              variant="destructive"
              size="sm"
              className="h-7 px-2"
              onClick={onCancel}
            >
              <Square className="h-3 w-3 mr-1" />
              {t('stop')}
            </Button>
          ) : (
            <Button
              variant="default"
              size="sm"
              className="h-7 px-2"
              onClick={onExecute}
            >
              <Play className="h-3 w-3 mr-1" />
              {t('run')}
            </Button>
          )}
        </div>
      </div>

      {/* Output */}
      {(result || isExecuting) && (
        <ScrollArea className="flex-1 max-h-[200px]">
          <div className="p-3 space-y-2">
            {isExecuting && !result && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{t('executingCode')}</span>
              </div>
            )}

            {result && (
              <>
                {/* Execution stats */}
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {result.executionTime}ms
                  </span>
                  {result.exitCode !== null && (
                    <span className={cn(
                      'flex items-center gap-1',
                      result.exitCode === 0 ? 'text-green-600' : 'text-red-600'
                    )}>
                      {t('exitCode')}: {result.exitCode}
                    </span>
                  )}
                  <span>{getStatusText()}</span>
                </div>

                {/* stdout */}
                {result.stdout && (
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-muted-foreground">
                      {t('output')}:
                    </div>
                    <pre className="p-2 rounded bg-muted text-xs font-mono whitespace-pre-wrap overflow-x-auto">
                      {result.stdout}
                    </pre>
                  </div>
                )}

                {/* stderr */}
                {result.stderr && (
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-red-600 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {t('errors')}:
                    </div>
                    <pre className="p-2 rounded bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 text-xs font-mono whitespace-pre-wrap overflow-x-auto">
                      {result.stderr}
                    </pre>
                  </div>
                )}

                {/* No output message */}
                {!result.stdout && !result.stderr && result.success && (
                  <div className="text-sm text-muted-foreground italic">
                    {t('noOutput')}
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
});

export default CodeExecutionPanel;
