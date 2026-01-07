'use client';

/**
 * WorkflowResultCard - Display workflow execution results in chat
 * Shows status, progress, outputs, and allows re-running
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Workflow,
  CheckCircle,
  XCircle,
  Loader2,
  Clock,
  ChevronDown,
  ChevronRight,
  Play,
  ExternalLink,
  Copy,
  Timer,
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
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export type WorkflowExecutionStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'paused'
  | 'cancelled';

export interface WorkflowResultData {
  workflowId: string;
  workflowName: string;
  workflowIcon?: string;
  executionId: string;
  status: WorkflowExecutionStatus;
  progress: number;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  startedAt: Date;
  completedAt?: Date;
  nodeCount?: number;
  logs?: Array<{ timestamp: Date; level: string; message: string }>;
}

interface WorkflowResultCardProps {
  data: WorkflowResultData;
  onRerun?: (input: Record<string, unknown>) => void;
  className?: string;
}

export function WorkflowResultCard({
  data,
  onRerun,
  className,
}: WorkflowResultCardProps) {
  const _t = useTranslations('workflowEditor');
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  // Format duration
  const formatDuration = (start: Date, end?: Date) => {
    const endTime = end ? new Date(end).getTime() : new Date().getTime();
    const ms = endTime - new Date(start).getTime();
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${((ms % 60000) / 1000).toFixed(0)}s`;
  };

  // Get status icon
  const getStatusIcon = () => {
    switch (data.status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'running':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'paused':
        return <Clock className="h-5 w-5 text-orange-500" />;
      case 'cancelled':
        return <XCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  // Get status color
  const getStatusColor = () => {
    switch (data.status) {
      case 'completed':
        return 'border-green-500/30 bg-green-500/5';
      case 'failed':
        return 'border-red-500/30 bg-red-500/5';
      case 'running':
        return 'border-blue-500/30 bg-blue-500/5';
      case 'pending':
        return 'border-yellow-500/30 bg-yellow-500/5';
      default:
        return 'border-muted';
    }
  };

  // Copy output to clipboard
  const handleCopyOutput = async () => {
    if (data.output) {
      await navigator.clipboard.writeText(JSON.stringify(data.output, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Handle re-run
  const handleRerun = () => {
    if (onRerun && data.input) {
      onRerun(data.input);
    }
  };

  return (
    <div
      className={cn(
        'rounded-lg border-2 transition-all',
        getStatusColor(),
        className
      )}
    >
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="shrink-0 mt-0.5">{getStatusIcon()}</div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-lg">{data.workflowIcon || '🔄'}</span>
              <h4 className="font-medium">{data.workflowName}</h4>
              <Badge
                variant={
                  data.status === 'completed'
                    ? 'default'
                    : data.status === 'failed'
                    ? 'destructive'
                    : 'secondary'
                }
                className="text-xs"
              >
                {data.status}
              </Badge>
            </div>

            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Timer className="h-3.5 w-3.5" />
                {formatDuration(data.startedAt, data.completedAt)}
              </span>
              {data.nodeCount && (
                <span className="flex items-center gap-1">
                  <Workflow className="h-3.5 w-3.5" />
                  {data.nodeCount} nodes
                </span>
              )}
            </div>

            {/* Progress bar for running workflows */}
            {data.status === 'running' && (
              <div className="mt-2">
                <Progress value={data.progress} className="h-1.5" />
                <p className="text-xs text-muted-foreground mt-1">
                  {data.progress}% complete
                </p>
              </div>
            )}

            {/* Error message */}
            {data.error && (
              <div className="mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-xs text-destructive">{data.error}</p>
              </div>
            )}

            {/* Quick output preview for completed workflows */}
            {data.status === 'completed' && data.output && (
              <div className="mt-2 p-2 bg-muted rounded-md">
                <p className="text-xs text-muted-foreground mb-1">Output:</p>
                <p className="text-sm line-clamp-2">
                  {typeof data.output === 'object'
                    ? JSON.stringify(data.output).slice(0, 150) + '...'
                    : String(data.output)}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expandable details */}
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <button className="w-full px-4 py-2 border-t flex items-center justify-center gap-1 text-xs text-muted-foreground hover:bg-accent/50 transition-colors">
            {isExpanded ? (
              <>
                <ChevronDown className="h-4 w-4" />
                Hide details
              </>
            ) : (
              <>
                <ChevronRight className="h-4 w-4" />
                Show details
              </>
            )}
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-3">
            {/* Input */}
            {data.input && Object.keys(data.input).length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Input
                </p>
                <pre className="text-xs bg-muted p-2 rounded-md overflow-x-auto max-h-24 overflow-y-auto">
                  {JSON.stringify(data.input, null, 2)}
                </pre>
              </div>
            )}

            {/* Full output */}
            {data.output && Object.keys(data.output).length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    Output
                  </p>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={handleCopyOutput}
                        >
                          <Copy
                            className={cn(
                              'h-3 w-3',
                              copied && 'text-green-500'
                            )}
                          />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {copied ? 'Copied!' : 'Copy output'}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <pre className="text-xs bg-muted p-2 rounded-md overflow-x-auto max-h-40 overflow-y-auto">
                  {JSON.stringify(data.output, null, 2)}
                </pre>
              </div>
            )}

            {/* Logs */}
            {data.logs && data.logs.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Logs ({data.logs.length})
                </p>
                <div className="bg-muted rounded-md p-2 max-h-32 overflow-y-auto space-y-1">
                  {data.logs.slice(-5).map((log, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <span className="text-muted-foreground shrink-0">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      <Badge
                        variant={
                          log.level === 'error'
                            ? 'destructive'
                            : log.level === 'warning'
                            ? 'secondary'
                            : 'outline'
                        }
                        className="text-[10px] px-1 py-0"
                      >
                        {log.level}
                      </Badge>
                      <span className="break-all">{log.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              {onRerun && data.input && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleRerun}
                >
                  <Play className="h-3 w-3 mr-1" />
                  Re-run
                </Button>
              )}
              <Link href={`/workflows?id=${data.workflowId}`}>
                <Button variant="outline" size="sm" className="h-7 text-xs">
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Open in Editor
                </Button>
              </Link>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

export default WorkflowResultCard;
