'use client';

/**
 * MCPToolCallCard - Enhanced MCP tool call card with server info, parameters, and results
 * Provides expandable detail view with syntax-highlighted JSON
 */

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  Wrench,
  ChevronDown,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { CodeBlock } from '@/components/ai-elements/code-block';
import { CopyButton } from '@/components/chat/copy-button';
import { ContentItemDisplay } from '@/components/chat/utils/tool-result-display';
import { MCPServerBadge } from './mcp-server-badge';
import { MCPProgressIndicator } from './mcp-progress-indicator';
import type { McpServerStatus, ToolCallResult } from '@/types/mcp';
import type { ToolState } from '@/types/core/message';

export interface MCPToolCallCardProps {
  /** Unique call ID */
  callId: string;
  /** Server ID */
  serverId: string;
  /** Server display name */
  serverName?: string;
  /** Server status */
  serverStatus?: McpServerStatus;
  /** Tool name */
  toolName: string;
  /** Tool description */
  toolDescription?: string;
  /** Tool arguments */
  args: Record<string, unknown>;
  /** Tool state */
  state: ToolState;
  /** Result (if completed) */
  result?: ToolCallResult | unknown;
  /** Error message (if failed) */
  errorText?: string;
  /** Start time */
  startedAt?: Date;
  /** End time */
  completedAt?: Date;
  /** Progress (0-100) */
  progress?: number;
  /** Progress message */
  progressMessage?: string;
  /** Risk level for approval */
  riskLevel?: 'low' | 'medium' | 'high';
  /** Whether initially expanded */
  defaultOpen?: boolean;
  /** Retry callback */
  onRetry?: () => void;
  /** Approve callback */
  onApprove?: () => void;
  /** Deny callback */
  onDeny?: () => void;
  className?: string;
}

function formatToolName(name: string): string {
  return name
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

const stateConfig: Record<ToolState, { icon: React.ElementType; color: string; bgColor: string }> = {
  'input-streaming': { icon: Loader2, color: 'text-blue-600', bgColor: 'border-blue-300 bg-blue-50 dark:bg-blue-950/30' },
  'input-available': { icon: Loader2, color: 'text-blue-600', bgColor: 'border-blue-300 bg-blue-50 dark:bg-blue-950/30' },
  'approval-requested': { icon: AlertTriangle, color: 'text-yellow-600', bgColor: 'border-yellow-300 bg-yellow-50 dark:bg-yellow-950/30' },
  'approval-responded': { icon: Clock, color: 'text-blue-600', bgColor: 'border-blue-300 bg-blue-50 dark:bg-blue-950/30' },
  'output-available': { icon: CheckCircle, color: 'text-green-600', bgColor: 'border-green-300 bg-green-50 dark:bg-green-950/30' },
  'output-error': { icon: XCircle, color: 'text-red-600', bgColor: 'border-red-300 bg-red-50 dark:bg-red-950/30' },
  'output-denied': { icon: XCircle, color: 'text-orange-600', bgColor: 'border-orange-300 bg-orange-50 dark:bg-orange-950/30' },
};

const riskColors = {
  low: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export function MCPToolCallCard({
  callId,
  serverId,
  serverName,
  serverStatus,
  toolName,
  toolDescription,
  args,
  state,
  result,
  errorText,
  startedAt,
  completedAt,
  progress,
  progressMessage,
  riskLevel,
  defaultOpen = true,
  onRetry,
  onApprove,
  onDeny,
  className,
}: MCPToolCallCardProps) {
  const t = useTranslations('mcp');
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [activeTab, setActiveTab] = useState<string>('params');

  const config = stateConfig[state];
  const Icon = config.icon;
  const isRunning = state === 'input-streaming' || state === 'input-available';
  const isApprovalRequired = state === 'approval-requested';
  const isCompleted = state === 'output-available';
  const isError = state === 'output-error' || state === 'output-denied';

  // Calculate duration
  const duration = useMemo(() => {
    if (completedAt && startedAt) {
      return completedAt.getTime() - startedAt.getTime();
    }
    return null;
  }, [startedAt, completedAt]);

  // Format result for display
  const formattedResult = useMemo(() => {
    if (!result) return null;
    
    // Check if it's a ToolCallResult with content array
    if (typeof result === 'object' && 'content' in result && Array.isArray((result as ToolCallResult).content)) {
      return result as ToolCallResult;
    }
    
    // Otherwise, treat as raw result
    return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }], isError: false };
  }, [result]);

  // Prepare copy content
  const copyContent = JSON.stringify({ callId, serverId, toolName, args, result }, null, 2);

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className={cn(
        'rounded-xl border-2 overflow-hidden transition-all duration-300',
        'bg-card/95 backdrop-blur-md shadow-sm hover:shadow-md',
        config.bgColor,
        isRunning && 'animate-pulse',
        className
      )}
    >
      {/* Header */}
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center justify-between gap-3 p-3 hover:bg-accent/30 transition-colors">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Icon */}
            <div className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
              'bg-background/80 border shadow-sm'
            )}>
              <Wrench className="h-4 w-4" />
            </div>

            {/* Tool info */}
            <div className="flex flex-col items-start min-w-0 gap-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm truncate">
                  {formatToolName(toolName)}
                </span>
                <MCPServerBadge
                  serverId={serverId}
                  serverName={serverName}
                  status={serverStatus}
                  size="sm"
                  showStatus={false}
                />
              </div>
              {toolDescription && (
                <span className="text-xs text-muted-foreground truncate max-w-[300px]">
                  {toolDescription}
                </span>
              )}
            </div>
          </div>

          {/* Status and actions */}
          <div className="flex items-center gap-2 shrink-0">
            {riskLevel && (
              <Badge variant="outline" className={cn('text-[10px]', riskColors[riskLevel])}>
                {riskLevel}
              </Badge>
            )}
            {duration !== null && (
              <Badge variant="secondary" className="text-[10px] font-mono">
                {formatDuration(duration)}
              </Badge>
            )}
            <div className={cn('flex items-center gap-1', config.color)}>
              <Icon className={cn('h-4 w-4', isRunning && 'animate-spin')} />
            </div>
            <ChevronDown className={cn(
              'h-4 w-4 text-muted-foreground transition-transform',
              isOpen && 'rotate-180'
            )} />
          </div>
        </div>
      </CollapsibleTrigger>

      {/* Content */}
      <CollapsibleContent>
        <div className="border-t border-border/50">
          {/* Progress indicator for running state */}
          {isRunning && (
            <div className="px-4 py-3 border-b border-border/30 bg-background/50">
              <MCPProgressIndicator
                state="running"
                progress={progress}
                message={progressMessage}
                startedAt={startedAt}
                showElapsedTime
              />
            </div>
          )}

          {/* Approval request */}
          {isApprovalRequired && (
            <div className="px-4 py-3 border-b border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-950/20">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                  {t('approvalRequired')}
                </span>
              </div>
              {(onApprove || onDeny) && (
                <div className="flex gap-2 mt-2">
                  {onApprove && (
                    <Button size="sm" onClick={onApprove} className="gap-1">
                      <CheckCircle className="h-3 w-3" />
                      {t('approve')}
                    </Button>
                  )}
                  {onDeny && (
                    <Button size="sm" variant="outline" onClick={onDeny} className="gap-1">
                      <XCircle className="h-3 w-3" />
                      {t('deny')}
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Tabs for params/result */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex items-center justify-between px-4 py-2 border-b border-border/30 bg-muted/20">
              <TabsList className="h-8">
                <TabsTrigger value="params" className="text-xs px-3 py-1">
                  {t('parameters')}
                </TabsTrigger>
                <TabsTrigger 
                  value="result" 
                  className="text-xs px-3 py-1"
                  disabled={!isCompleted && !isError}
                >
                  {t('result')}
                </TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-1">
                <CopyButton
                  content={copyContent}
                  iconOnly
                  tooltip={t('copyAll')}
                  className="h-7 w-7"
                />
                {isError && onRetry && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRetry}>
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('retry')}</TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>

            <TabsContent value="params" className="mt-0 p-4">
              <CodeBlock code={JSON.stringify(args, null, 2)} language="json" />
            </TabsContent>

            <TabsContent value="result" className="mt-0 p-4">
              {errorText && (
                <div className="mb-3 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                  <div className="flex items-start gap-2">
                    <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-destructive">{t('error')}</p>
                      <p className="text-xs text-destructive/80 mt-1 whitespace-pre-wrap">
                        {errorText}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {formattedResult && (
                <div className="space-y-2">
                  {formattedResult.content.map((item, index) => (
                    <ContentItemDisplay key={index} item={item} />
                  ))}
                </div>
              )}
              {!formattedResult && !errorText && (
                <p className="text-sm text-muted-foreground italic">{t('noResult')}</p>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
