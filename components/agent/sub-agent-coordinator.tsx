'use client';

/**
 * SubAgentCoordinator - Displays and manages sub-agent coordination
 * Shows hierarchy, execution flow, and real-time status of sub-agents
 */

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  ChevronDown,
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
  XCircle,
  CheckCircle,
  Clock,
  AlertTriangle,
  Loader2,
  ArrowRight,
  GitBranch,
  LayoutGrid,
  List,
  Maximize2,
  Minimize2,
  Eye,
  EyeOff,
  BarChart3,
  Settings2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import type {
  SubAgent,
  SubAgentStatus,
} from '@/types/sub-agent';

interface SubAgentCoordinatorProps {
  subAgents: SubAgent[];
  onStartSubAgent?: (id: string) => void;
  onPauseSubAgent?: (id: string) => void;
  onCancelSubAgent?: (id: string) => void;
  onRetrySubAgent?: (id: string) => void;
  onViewDetails?: (id: string) => void;
  className?: string;
}

// Status icon component
function StatusIcon({ status, className }: { status: SubAgentStatus; className?: string }) {
  const iconClass = cn('h-4 w-4', className);
  
  switch (status) {
    case 'running':
      return <Loader2 className={cn(iconClass, 'text-primary animate-spin')} />;
    case 'completed':
      return <CheckCircle className={cn(iconClass, 'text-green-500')} />;
    case 'failed':
      return <XCircle className={cn(iconClass, 'text-destructive')} />;
    case 'waiting':
      return <Pause className={cn(iconClass, 'text-yellow-500')} />;
    case 'queued':
      return <Clock className={cn(iconClass, 'text-blue-500')} />;
    case 'cancelled':
      return <XCircle className={cn(iconClass, 'text-orange-500')} />;
    case 'timeout':
      return <AlertTriangle className={cn(iconClass, 'text-red-500')} />;
    default:
      return <Clock className={cn(iconClass, 'text-muted-foreground')} />;
  }
}

// Format duration helper
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

// Individual sub-agent card
function SubAgentCard({
  subAgent,
  onStart,
  onPause,
  onCancel,
  onRetry,
  onViewDetails,
  isExpanded,
  onToggleExpand,
}: {
  subAgent: SubAgent;
  onStart?: () => void;
  onPause?: () => void;
  onCancel?: () => void;
  onRetry?: () => void;
  onViewDetails?: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}) {
  const t = useTranslations('subAgent');
  const isRunning = subAgent.status === 'running';
  const isCompleted = subAgent.status === 'completed';
  const isFailed = subAgent.status === 'failed' || subAgent.status === 'timeout';
  const isPending = subAgent.status === 'pending' || subAgent.status === 'queued';
  
  // Calculate duration - use result duration if available, otherwise estimate
  const duration = subAgent.result?.duration 
    ?? (subAgent.completedAt && subAgent.startedAt
      ? subAgent.completedAt.getTime() - subAgent.startedAt.getTime()
      : 0);

  return (
    <div className={cn(
      'rounded-lg border bg-card/50 transition-all duration-200',
      isRunning && 'border-primary/50 shadow-sm',
      isFailed && 'border-destructive/30',
      isCompleted && 'border-green-500/30'
    )}>
      <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
        <div className="flex items-center gap-2 p-3">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          
          <StatusIcon status={subAgent.status} />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm truncate">{subAgent.name}</span>
              {subAgent.config.priority && subAgent.config.priority !== 'normal' && (
                <Badge variant="outline" className="text-[10px] h-4">
                  {subAgent.config.priority}
                </Badge>
              )}
            </div>
            {subAgent.description && (
              <p className="text-xs text-muted-foreground truncate">
                {subAgent.description}
              </p>
            )}
          </div>
          
          {/* Progress and duration */}
          <div className="flex items-center gap-2 shrink-0">
            {isRunning && (
              <div className="w-20">
                <Progress value={subAgent.progress} className="h-1" />
                <span className="text-[10px] text-muted-foreground">
                  {subAgent.progress}%
                </span>
              </div>
            )}
            {duration > 0 && (
              <Badge variant="secondary" className="text-[10px]">
                {formatDuration(duration)}
              </Badge>
            )}
          </div>
          
          {/* Action buttons */}
          <div className="flex items-center gap-1">
            {isPending && onStart && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={onStart}
                  >
                    <Play className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('start')}</TooltipContent>
              </Tooltip>
            )}
            {isRunning && onPause && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={onPause}
                  >
                    <Pause className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('pause')}</TooltipContent>
              </Tooltip>
            )}
            {isRunning && onCancel && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive"
                    onClick={onCancel}
                  >
                    <XCircle className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('cancel')}</TooltipContent>
              </Tooltip>
            )}
            {isFailed && onRetry && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={onRetry}
                  >
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('retry')}</TooltipContent>
              </Tooltip>
            )}
            {onViewDetails && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={onViewDetails}
                  >
                    <Eye className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('viewDetails')}</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
        
        <CollapsibleContent>
          <div className="px-3 pb-3 pt-0 space-y-2 border-t border-border/50 mt-2">
            {/* Task description */}
            <div className="text-xs">
              <span className="text-muted-foreground">{t('task')}:</span>
              <p className="mt-1 text-foreground">{subAgent.task}</p>
            </div>
            
            {/* Dependencies */}
            {subAgent.config.dependencies && subAgent.config.dependencies.length > 0 && (
              <div className="text-xs">
                <span className="text-muted-foreground">{t('dependencies')}:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {subAgent.config.dependencies.map((depId) => (
                    <Badge key={depId} variant="outline" className="text-[10px]">
                      {depId}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {/* Error message */}
            {subAgent.error && (
              <div className="text-xs bg-destructive/10 text-destructive p-2 rounded">
                {subAgent.error}
              </div>
            )}
            
            {/* Result preview */}
            {subAgent.result?.finalResponse && (
              <div className="text-xs">
                <span className="text-muted-foreground">{t('result')}:</span>
                <p className="mt-1 text-foreground line-clamp-3">
                  {subAgent.result.finalResponse}
                </p>
              </div>
            )}
            
            {/* Logs preview */}
            {subAgent.logs.length > 0 && (
              <div className="text-xs">
                <span className="text-muted-foreground">{t('recentLogs')}:</span>
                <div className="mt-1 space-y-0.5 max-h-20 overflow-y-auto">
                  {subAgent.logs.slice(-3).map((log, index) => (
                    <div 
                      key={index}
                      className={cn(
                        'text-[10px] font-mono',
                        log.level === 'error' && 'text-destructive',
                        log.level === 'warn' && 'text-yellow-600'
                      )}
                    >
                      [{log.level}] {log.message}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

export function SubAgentCoordinator({
  subAgents,
  onStartSubAgent,
  onPauseSubAgent,
  onCancelSubAgent,
  onRetrySubAgent,
  onViewDetails,
  className,
}: SubAgentCoordinatorProps) {
  const t = useTranslations('subAgent');
  const [viewMode, setViewMode] = useState<'list' | 'flow'>('list');
  const [showCompleted, setShowCompleted] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  
  // Calculate statistics
  const stats = useMemo(() => {
    const total = subAgents.length;
    const completed = subAgents.filter(s => s.status === 'completed').length;
    const running = subAgents.filter(s => s.status === 'running').length;
    const failed = subAgents.filter(s => s.status === 'failed' || s.status === 'timeout').length;
    const pending = subAgents.filter(s => s.status === 'pending' || s.status === 'queued').length;
    
    const totalProgress = total > 0
      ? Math.round(subAgents.reduce((sum, s) => sum + s.progress, 0) / total)
      : 0;
    
    return { total, completed, running, failed, pending, totalProgress };
  }, [subAgents]);
  
  // Filter sub-agents based on view settings
  const filteredSubAgents = useMemo(() => {
    return showCompleted 
      ? subAgents 
      : subAgents.filter(s => s.status !== 'completed');
  }, [subAgents, showCompleted]);
  
  // Toggle expanded state
  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };
  
  // Expand/collapse all
  const toggleAll = (expand: boolean) => {
    if (expand) {
      setExpandedIds(new Set(subAgents.map(s => s.id)));
    } else {
      setExpandedIds(new Set());
    }
  };
  
  if (subAgents.length === 0) {
    return null;
  }

  return (
    <div className={cn(
      'rounded-xl border border-border/50 bg-card/95 backdrop-blur-md shadow-lg',
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2 p-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">{t('subAgents')}</span>
          <Badge variant="secondary" className="text-[10px]">
            {stats.total}
          </Badge>
        </div>
        
        {/* Statistics bar */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {stats.running > 0 && (
            <span className="flex items-center gap-1 text-primary">
              <Loader2 className="h-3 w-3 animate-spin" />
              {stats.running}
            </span>
          )}
          {stats.completed > 0 && (
            <span className="flex items-center gap-1 text-green-500">
              <CheckCircle className="h-3 w-3" />
              {stats.completed}
            </span>
          )}
          {stats.failed > 0 && (
            <span className="flex items-center gap-1 text-destructive">
              <XCircle className="h-3 w-3" />
              {stats.failed}
            </span>
          )}
          {stats.pending > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {stats.pending}
            </span>
          )}
        </div>
        
        {/* Controls */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setShowCompleted(!showCompleted)}
              >
                {showCompleted ? (
                  <EyeOff className="h-3.5 w-3.5" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {showCompleted ? t('hideCompleted') : t('showCompleted')}
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => toggleAll(expandedIds.size < subAgents.length)}
              >
                {expandedIds.size < subAgents.length ? (
                  <Maximize2 className="h-3.5 w-3.5" />
                ) : (
                  <Minimize2 className="h-3.5 w-3.5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {expandedIds.size < subAgents.length ? t('expandAll') : t('collapseAll')}
            </TooltipContent>
          </Tooltip>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <Settings2 className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setViewMode('list')}>
                <List className="h-4 w-4 mr-2" />
                {t('listView')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setViewMode('flow')}>
                <LayoutGrid className="h-4 w-4 mr-2" />
                {t('flowView')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <BarChart3 className="h-4 w-4 mr-2" />
                {t('statistics')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* Overall progress */}
      {stats.running > 0 && (
        <div className="px-3 py-2 border-b border-border/30">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-muted-foreground">{t('overallProgress')}</span>
            <span className="font-medium">{stats.totalProgress}%</span>
          </div>
          <Progress value={stats.totalProgress} className="h-1" />
        </div>
      )}
      
      {/* Sub-agent list */}
      <div className="p-3 space-y-2 max-h-96 overflow-y-auto">
        {viewMode === 'list' ? (
          // List view
          filteredSubAgents.map((subAgent) => (
            <SubAgentCard
              key={subAgent.id}
              subAgent={subAgent}
              onStart={onStartSubAgent ? () => onStartSubAgent(subAgent.id) : undefined}
              onPause={onPauseSubAgent ? () => onPauseSubAgent(subAgent.id) : undefined}
              onCancel={onCancelSubAgent ? () => onCancelSubAgent(subAgent.id) : undefined}
              onRetry={onRetrySubAgent ? () => onRetrySubAgent(subAgent.id) : undefined}
              onViewDetails={onViewDetails ? () => onViewDetails(subAgent.id) : undefined}
              isExpanded={expandedIds.has(subAgent.id)}
              onToggleExpand={() => toggleExpanded(subAgent.id)}
            />
          ))
        ) : (
          // Flow view - showing execution order
          <div className="space-y-2">
            {filteredSubAgents.map((subAgent, index) => (
              <div key={subAgent.id} className="flex items-center gap-2">
                {index > 0 && (
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                <div className="flex-1">
                  <SubAgentCard
                    subAgent={subAgent}
                    onStart={onStartSubAgent ? () => onStartSubAgent(subAgent.id) : undefined}
                    onPause={onPauseSubAgent ? () => onPauseSubAgent(subAgent.id) : undefined}
                    onCancel={onCancelSubAgent ? () => onCancelSubAgent(subAgent.id) : undefined}
                    onRetry={onRetrySubAgent ? () => onRetrySubAgent(subAgent.id) : undefined}
                    onViewDetails={onViewDetails ? () => onViewDetails(subAgent.id) : undefined}
                    isExpanded={expandedIds.has(subAgent.id)}
                    onToggleExpand={() => toggleExpanded(subAgent.id)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default SubAgentCoordinator;
