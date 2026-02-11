'use client';

/**
 * SubAgentNode - Reusable component for displaying a single sub-agent
 * Extracted from AgentFlowVisualizer for independent use
 */

import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Play, StopCircle, Trash2 } from 'lucide-react';
import { cn, formatDurationShort } from '@/lib/utils';
import { SUB_AGENT_STATUS_CONFIG } from '@/lib/agent';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { SubAgent } from '@/types/agent/sub-agent';

export interface SubAgentNodeProps {
  subAgent: SubAgent;
  onExecute?: (subAgent: SubAgent) => void;
  onCancel?: (subAgent: SubAgent) => void;
  onDelete?: (subAgent: SubAgent) => void;
  onClick?: (subAgent: SubAgent) => void;
  isLast?: boolean;
  showConnector?: boolean;
  showActions?: boolean;
  className?: string;
}

// Use shared status config from lib/agent/constants.ts

export function SubAgentNode({
  subAgent,
  onExecute,
  onCancel,
  onDelete,
  onClick,
  isLast = false,
  showConnector = true,
  showActions = true,
  className,
}: SubAgentNodeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const config = SUB_AGENT_STATUS_CONFIG[subAgent.status];
  const Icon = config.icon;

  const duration = useMemo(() => {
    if (subAgent.startedAt && subAgent.completedAt) {
      return subAgent.completedAt.getTime() - subAgent.startedAt.getTime();
    }
    return null;
  }, [subAgent.startedAt, subAgent.completedAt]);

  const canExecute = subAgent.status === 'pending' || subAgent.status === 'failed';
  const canCancel = subAgent.status === 'running' || subAgent.status === 'queued';
  const canDelete = subAgent.status !== 'running';

  return (
    <div className={cn('relative', className)}>
      {/* Connector line */}
      {showConnector && !isLast && (
        <div className="absolute left-4 top-10 bottom-0 w-0.5 bg-border" />
      )}

      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div
          className={cn(
            'flex items-start gap-3 p-3 rounded-lg border transition-all',
            onClick && 'cursor-pointer hover:border-primary/50 hover:shadow-sm',
            config.bgColor
          )}
          onClick={() => onClick?.(subAgent)}
        >
          {/* Status icon */}
          <div
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2',
              config.bgColor,
              subAgent.status === 'running' && 'border-primary'
            )}
          >
            <Icon className={cn('h-4 w-4', config.color, config.animate && 'animate-spin')} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-medium text-sm truncate">{subAgent.name}</span>
                <Badge variant="outline" className="text-[10px] shrink-0">
                  {subAgent.status}
                </Badge>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {/* Action buttons */}
                {showActions && (
                  <>
                    {canExecute && onExecute && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              onExecute(subAgent);
                            }}
                          >
                            <Play className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Execute</TooltipContent>
                      </Tooltip>
                    )}

                    {canCancel && onCancel && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              onCancel(subAgent);
                            }}
                          >
                            <StopCircle className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Cancel</TooltipContent>
                      </Tooltip>
                    )}

                    {canDelete && onDelete && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete(subAgent);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Delete</TooltipContent>
                      </Tooltip>
                    )}
                  </>
                )}

                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
              </div>
            </div>

            {/* Progress bar */}
            {subAgent.status === 'running' && (
              <Progress value={subAgent.progress} className="h-1 mt-2" />
            )}

            {/* Duration */}
            {duration && (
              <span className="text-xs text-muted-foreground mt-1 block">
                {formatDurationShort(duration)}
              </span>
            )}
          </div>
        </div>

        <CollapsibleContent className="ml-11 mt-2 space-y-2">
          {/* Task description */}
          {subAgent.description && (
            <p className="text-xs text-muted-foreground">{subAgent.description}</p>
          )}

          {/* Task */}
          <div className="text-xs bg-muted/50 rounded p-2">
            <span className="font-medium">Task:</span> {subAgent.task}
          </div>

          {/* Result */}
          {subAgent.result && (
            <div className="text-xs bg-muted/50 rounded p-2">
              <span className="font-medium">Result:</span>
              <p className="mt-1 whitespace-pre-wrap line-clamp-3">
                {subAgent.result.finalResponse}
              </p>
              {subAgent.result.tokenUsage && (
                <div className="mt-2 text-muted-foreground">
                  Tokens: {subAgent.result.tokenUsage.totalTokens}
                  (prompt: {subAgent.result.tokenUsage.promptTokens}, completion:{' '}
                  {subAgent.result.tokenUsage.completionTokens})
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {subAgent.error && (
            <div className="text-xs bg-destructive/10 text-destructive rounded p-2">
              <span className="font-medium">Error:</span> {subAgent.error}
            </div>
          )}

          {/* Logs */}
          {subAgent.logs.length > 0 && (
            <div className="text-xs space-y-1">
              <span className="font-medium">Recent Logs:</span>
              {subAgent.logs.slice(-3).map((log, i) => (
                <div
                  key={i}
                  className={cn(
                    'text-[10px] px-2 py-1 rounded',
                    log.level === 'error' && 'bg-destructive/10 text-destructive',
                    log.level === 'warn' && 'bg-yellow-50 dark:bg-yellow-950 text-yellow-600',
                    log.level === 'info' && 'bg-muted'
                  )}
                >
                  {log.message}
                </div>
              ))}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

