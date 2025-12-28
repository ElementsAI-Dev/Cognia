'use client';

/**
 * AgentSubAgentPanel - Panel for managing sub-agents within an agent execution
 */

import { useState, useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Bot,
  Play,
  Pause,
  StopCircle,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  GitBranch,
  ArrowUpDown,
  Filter,
  MoreHorizontal,
  Eye,
  Trash2,
  Plus,
  Settings2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import { AnimatePresence, motion } from 'framer-motion';
import type { SubAgent, SubAgentStatus, SubAgentExecutionMode } from '@/types/sub-agent';

// Status configuration
const statusConfig: Record<SubAgentStatus, {
  icon: React.ElementType;
  color: string;
  bgColor: string;
  label: string;
}> = {
  idle: { icon: Clock, color: 'text-muted-foreground', bgColor: 'bg-muted', label: 'Idle' },
  queued: { icon: Clock, color: 'text-blue-500', bgColor: 'bg-blue-50 dark:bg-blue-950', label: 'Queued' },
  initializing: { icon: Loader2, color: 'text-blue-500', bgColor: 'bg-blue-50 dark:bg-blue-950', label: 'Initializing' },
  running: { icon: Loader2, color: 'text-primary', bgColor: 'bg-primary/10', label: 'Running' },
  waiting: { icon: Clock, color: 'text-orange-500', bgColor: 'bg-orange-50 dark:bg-orange-950', label: 'Waiting' },
  paused: { icon: Pause, color: 'text-yellow-500', bgColor: 'bg-yellow-50 dark:bg-yellow-950', label: 'Paused' },
  completed: { icon: CheckCircle, color: 'text-green-500', bgColor: 'bg-green-50 dark:bg-green-950', label: 'Completed' },
  failed: { icon: XCircle, color: 'text-destructive', bgColor: 'bg-destructive/10', label: 'Failed' },
  cancelled: { icon: XCircle, color: 'text-orange-500', bgColor: 'bg-orange-50 dark:bg-orange-950', label: 'Cancelled' },
  timeout: { icon: XCircle, color: 'text-red-500', bgColor: 'bg-red-50 dark:bg-red-950', label: 'Timeout' },
};

// Execution mode labels
const executionModeLabels: Record<SubAgentExecutionMode, string> = {
  sequential: 'Sequential',
  parallel: 'Parallel',
  conditional: 'Conditional',
  loop: 'Loop',
};

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

interface SubAgentCardProps {
  subAgent: SubAgent;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onRetry: () => void;
  onDelete: () => void;
  onViewDetails: () => void;
  depth?: number;
}

function SubAgentCard({
  subAgent,
  isExpanded,
  onToggleExpand,
  onStart,
  onPause,
  onResume,
  onCancel,
  onRetry,
  onDelete,
  onViewDetails,
  depth = 0,
}: SubAgentCardProps) {
  const config = statusConfig[subAgent.status];
  const StatusIcon = config.icon;
  const isRunning = subAgent.status === 'running';
  const isPaused = subAgent.status === 'paused';
  const isIdle = subAgent.status === 'idle' || subAgent.status === 'queued';
  const isCompleted = ['completed', 'failed', 'cancelled', 'timeout'].includes(subAgent.status);
  const hasChildren = subAgent.childAgentIds && subAgent.childAgentIds.length > 0;

  const duration = useMemo(() => {
    if (subAgent.completedAt && subAgent.startedAt) {
      return subAgent.completedAt.getTime() - subAgent.startedAt.getTime();
    }
    return 0;
  }, [subAgent.startedAt, subAgent.completedAt]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      className={cn(
        'border rounded-lg overflow-hidden transition-all',
        isRunning && 'border-primary/50 shadow-sm',
        subAgent.status === 'failed' && 'border-destructive/50'
      )}
      style={{ marginLeft: depth * 16 }}
    >
      <div className={cn('p-3', config.bgColor)}>
        <div className="flex items-start gap-3">
          {/* Expand toggle for children */}
          {hasChildren ? (
            <button
              onClick={onToggleExpand}
              className="mt-0.5 p-0.5 rounded hover:bg-background/50"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          ) : (
            <div className="w-5" />
          )}

          {/* Status icon */}
          <div className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background/80'
          )}>
            <StatusIcon className={cn(
              'h-4 w-4',
              config.color,
              isRunning && 'animate-spin'
            )} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <h4 className="font-medium text-sm truncate">{subAgent.name}</h4>
                <Badge variant="outline" className="text-[10px] shrink-0">
                  {config.label}
                </Badge>
                {subAgent.executionMode && (
                  <Badge variant="secondary" className="text-[10px] shrink-0">
                    <GitBranch className="h-2.5 w-2.5 mr-1" />
                    {executionModeLabels[subAgent.executionMode]}
                  </Badge>
                )}
              </div>

              {/* Actions dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onViewDetails}>
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {isIdle && (
                    <DropdownMenuItem onClick={onStart}>
                      <Play className="h-4 w-4 mr-2" />
                      Start
                    </DropdownMenuItem>
                  )}
                  {isRunning && (
                    <DropdownMenuItem onClick={onPause}>
                      <Pause className="h-4 w-4 mr-2" />
                      Pause
                    </DropdownMenuItem>
                  )}
                  {isPaused && (
                    <DropdownMenuItem onClick={onResume}>
                      <Play className="h-4 w-4 mr-2" />
                      Resume
                    </DropdownMenuItem>
                  )}
                  {(isRunning || isPaused) && (
                    <DropdownMenuItem onClick={onCancel} className="text-destructive">
                      <StopCircle className="h-4 w-4 mr-2" />
                      Cancel
                    </DropdownMenuItem>
                  )}
                  {subAgent.status === 'failed' && (
                    <DropdownMenuItem onClick={onRetry}>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Retry
                    </DropdownMenuItem>
                  )}
                  {isCompleted && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={onDelete} className="text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Task description */}
            {subAgent.task && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {subAgent.task}
              </p>
            )}

            {/* Progress bar */}
            {(isRunning || isPaused) && (
              <div className="mt-2">
                <Progress value={subAgent.progress} className="h-1" />
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-muted-foreground">
                    {subAgent.progress}%
                  </span>
                  {subAgent.currentStep && (
                    <span className="text-[10px] text-muted-foreground truncate max-w-[150px]">
                      {subAgent.currentStep}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Duration and stats */}
            <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
              {duration > 0 && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDuration(duration)}
                </span>
              )}
              {subAgent.stepsCompleted !== undefined && subAgent.totalSteps !== undefined && (
                <span className="flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  {subAgent.stepsCompleted}/{subAgent.totalSteps} steps
                </span>
              )}
              {hasChildren && (
                <span className="flex items-center gap-1">
                  <GitBranch className="h-3 w-3" />
                  {subAgent.childAgentIds?.length} children
                </span>
              )}
            </div>

            {/* Error message */}
            {subAgent.status === 'failed' && subAgent.error && (
              <Alert variant="destructive" className="mt-2 py-2">
                <AlertDescription className="text-xs truncate">{subAgent.error}</AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

interface AgentSubAgentPanelProps {
  subAgents: SubAgent[];
  parentAgentId?: string;
  onStartSubAgent: (id: string) => void;
  onPauseSubAgent: (id: string) => void;
  onResumeSubAgent: (id: string) => void;
  onCancelSubAgent: (id: string) => void;
  onRetrySubAgent: (id: string) => void;
  onDeleteSubAgent: (id: string) => void;
  onViewSubAgentDetails: (id: string) => void;
  onCreateSubAgent?: () => void;
  onStartAll?: () => void;
  onCancelAll?: () => void;
  className?: string;
}

export function AgentSubAgentPanel({
  subAgents,
  parentAgentId: _parentAgentId,
  onStartSubAgent,
  onPauseSubAgent,
  onResumeSubAgent,
  onCancelSubAgent,
  onRetrySubAgent,
  onDeleteSubAgent,
  onViewSubAgentDetails,
  onCreateSubAgent,
  onStartAll,
  onCancelAll,
  className,
}: AgentSubAgentPanelProps) {
  const _t = useTranslations('agent');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'status' | 'name' | 'created'>('status');
  const [filterStatus, setFilterStatus] = useState<SubAgentStatus | 'all'>('all');

  // Toggle expansion
  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Filter and sort sub-agents
  const filteredAndSortedAgents = useMemo(() => {
    let result = [...subAgents];

    // Filter by status
    if (filterStatus !== 'all') {
      result = result.filter((a) => a.status === filterStatus);
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'status') {
        const statusOrder: SubAgentStatus[] = ['running', 'queued', 'paused', 'idle', 'completed', 'failed', 'cancelled', 'timeout', 'initializing', 'waiting'];
        return statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
      }
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      // created
      return (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0);
    });

    return result;
  }, [subAgents, filterStatus, sortBy]);

  // Statistics
  const stats = useMemo(() => {
    const running = subAgents.filter((a) => a.status === 'running').length;
    const completed = subAgents.filter((a) => a.status === 'completed').length;
    const failed = subAgents.filter((a) => a.status === 'failed').length;
    const pending = subAgents.filter((a) => ['idle', 'queued'].includes(a.status)).length;
    return { running, completed, failed, pending, total: subAgents.length };
  }, [subAgents]);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4" />
          <span className="font-medium text-sm">Sub-Agents</span>
          <Badge variant="outline" className="text-[10px]">
            {stats.total}
          </Badge>
        </div>

        <div className="flex items-center gap-1">
          {/* Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 text-xs">
                <Filter className="h-3.5 w-3.5 mr-1" />
                {filterStatus === 'all' ? 'All' : statusConfig[filterStatus]?.label}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setFilterStatus('all')}>
                All
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {Object.entries(statusConfig).map(([status, cfg]) => (
                <DropdownMenuItem
                  key={status}
                  onClick={() => setFilterStatus(status as SubAgentStatus)}
                >
                  <cfg.icon className={cn('h-4 w-4 mr-2', cfg.color)} />
                  {cfg.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Sort */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 text-xs">
                <ArrowUpDown className="h-3.5 w-3.5 mr-1" />
                Sort
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSortBy('status')}>
                By Status
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('name')}>
                By Name
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('created')}>
                By Created
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Settings */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                <Settings2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Settings</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-4 px-3 py-2 border-b bg-muted/30 text-xs">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <span className="text-muted-foreground">Running:</span>
          <span className="font-medium">{stats.running}</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          <span className="text-muted-foreground">Completed:</span>
          <span className="font-medium">{stats.completed}</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-destructive" />
          <span className="text-muted-foreground">Failed:</span>
          <span className="font-medium">{stats.failed}</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-muted-foreground" />
          <span className="text-muted-foreground">Pending:</span>
          <span className="font-medium">{stats.pending}</span>
        </span>
      </div>

      {/* Sub-agent list */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          <AnimatePresence>
            {filteredAndSortedAgents.length === 0 ? (
              <EmptyState
                icon={Bot}
                title="No sub-agents"
                compact
                actions={onCreateSubAgent ? [{
                  label: 'Create Sub-Agent',
                  onClick: onCreateSubAgent,
                  variant: 'outline',
                  icon: Plus,
                }] : undefined}
              />
            ) : (
              filteredAndSortedAgents.map((subAgent) => (
                <SubAgentCard
                  key={subAgent.id}
                  subAgent={subAgent}
                  isExpanded={expandedIds.has(subAgent.id)}
                  onToggleExpand={() => toggleExpand(subAgent.id)}
                  onStart={() => onStartSubAgent(subAgent.id)}
                  onPause={() => onPauseSubAgent(subAgent.id)}
                  onResume={() => onResumeSubAgent(subAgent.id)}
                  onCancel={() => onCancelSubAgent(subAgent.id)}
                  onRetry={() => onRetrySubAgent(subAgent.id)}
                  onDelete={() => onDeleteSubAgent(subAgent.id)}
                  onViewDetails={() => onViewSubAgentDetails(subAgent.id)}
                />
              ))
            )}
          </AnimatePresence>
        </div>
      </ScrollArea>

      {/* Footer actions */}
      {subAgents.length > 0 && (
        <div className="flex items-center justify-between p-2 border-t">
          <div className="flex items-center gap-2">
            {onCreateSubAgent && (
              <Button variant="outline" size="sm" onClick={onCreateSubAgent}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {onStartAll && stats.pending > 0 && (
              <Button variant="default" size="sm" onClick={onStartAll}>
                <Play className="h-3.5 w-3.5 mr-1" />
                Start All
              </Button>
            )}
            {onCancelAll && stats.running > 0 && (
              <Button variant="destructive" size="sm" onClick={onCancelAll}>
                <StopCircle className="h-3.5 w-3.5 mr-1" />
                Cancel All
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AgentSubAgentPanel;
