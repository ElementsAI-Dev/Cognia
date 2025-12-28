'use client';

/**
 * PendingMessagesQueue - Displays pending messages waiting to be processed
 */

import { useState, useMemo } from 'react';
import {
  Clock,
  Loader2,
  X,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Trash2,
  Play,
  Pause,
  RotateCcw,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { AnimatePresence, motion } from 'framer-motion';

// Pending message interface
export interface PendingMessage {
  id: string;
  content: string;
  status: 'queued' | 'processing' | 'retrying' | 'failed';
  priority: 'low' | 'normal' | 'high';
  createdAt: Date;
  retryCount?: number;
  error?: string;
  estimatedWaitTime?: number;
}

// Status configuration
const statusConfig: Record<PendingMessage['status'], {
  icon: React.ElementType;
  color: string;
  bgColor: string;
  label: string;
}> = {
  queued: { 
    icon: Clock, 
    color: 'text-muted-foreground', 
    bgColor: 'bg-muted', 
    label: 'Queued' 
  },
  processing: { 
    icon: Loader2, 
    color: 'text-primary', 
    bgColor: 'bg-primary/10', 
    label: 'Processing' 
  },
  retrying: { 
    icon: RotateCcw, 
    color: 'text-orange-500', 
    bgColor: 'bg-orange-500/10', 
    label: 'Retrying' 
  },
  failed: { 
    icon: AlertCircle, 
    color: 'text-destructive', 
    bgColor: 'bg-destructive/10', 
    label: 'Failed' 
  },
};

// Priority configuration
const priorityConfig: Record<PendingMessage['priority'], {
  color: string;
  label: string;
}> = {
  low: { color: 'text-muted-foreground', label: 'Low' },
  normal: { color: 'text-blue-500', label: 'Normal' },
  high: { color: 'text-orange-500', label: 'High' },
};

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatWaitTime(seconds: number): string {
  if (seconds < 60) return `~${seconds}s`;
  return `~${Math.floor(seconds / 60)}m`;
}

interface PendingMessageItemProps {
  message: PendingMessage;
  onCancel: () => void;
  onRetry: () => void;
  position: number;
}

function PendingMessageItem({ 
  message, 
  onCancel, 
  onRetry, 
  position 
}: PendingMessageItemProps) {
  const config = statusConfig[message.status];
  const StatusIcon = config.icon;
  const priorityCfg = priorityConfig[message.priority];

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20, height: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg border transition-all',
        message.status === 'processing' && 'border-primary/50 bg-primary/5',
        message.status === 'failed' && 'border-destructive/50 bg-destructive/5',
        message.status === 'queued' && 'border-border/50 bg-card',
        message.status === 'retrying' && 'border-orange-500/50 bg-orange-500/5'
      )}
    >
      {/* Position indicator */}
      <div className="flex flex-col items-center gap-1">
        <div className={cn(
          'flex h-8 w-8 items-center justify-center rounded-lg',
          config.bgColor
        )}>
          <StatusIcon className={cn(
            'h-4 w-4',
            config.color,
            message.status === 'processing' && 'animate-spin'
          )} />
        </div>
        <span className="text-[10px] text-muted-foreground">#{position}</span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={cn('text-[10px] h-4', priorityCfg.color)}>
            {priorityCfg.label}
          </Badge>
          <Badge variant="secondary" className="text-[10px] h-4">
            {config.label}
          </Badge>
          {message.retryCount && message.retryCount > 0 && (
            <Badge variant="outline" className="text-[10px] h-4 text-orange-500">
              Retry {message.retryCount}
            </Badge>
          )}
        </div>

        <p className="text-sm truncate">{message.content}</p>

        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatTime(message.createdAt)}
          </span>
          {message.estimatedWaitTime && message.status === 'queued' && (
            <span>Wait: {formatWaitTime(message.estimatedWaitTime)}</span>
          )}
        </div>

        {message.error && (
          <p className="text-xs text-destructive mt-1 truncate">
            {message.error}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        {message.status === 'failed' && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={onRetry}
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Retry</TooltipContent>
          </Tooltip>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
              onClick={onCancel}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Cancel</TooltipContent>
        </Tooltip>
      </div>
    </motion.div>
  );
}

interface PendingMessagesQueueProps {
  messages: PendingMessage[];
  onCancelMessage: (id: string) => void;
  onRetryMessage: (id: string) => void;
  onClearAll?: () => void;
  onPauseQueue?: () => void;
  onResumeQueue?: () => void;
  isPaused?: boolean;
  maxVisible?: number;
  className?: string;
}

export function PendingMessagesQueue({
  messages,
  onCancelMessage,
  onRetryMessage,
  onClearAll,
  onPauseQueue,
  onResumeQueue,
  isPaused = false,
  maxVisible = 5,
  className,
}: PendingMessagesQueueProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Statistics
  const stats = useMemo(() => {
    const queued = messages.filter((m) => m.status === 'queued').length;
    const processing = messages.filter((m) => m.status === 'processing').length;
    const failed = messages.filter((m) => m.status === 'failed').length;
    return { queued, processing, failed, total: messages.length };
  }, [messages]);

  // Sort messages: processing first, then by priority, then by time
  const sortedMessages = useMemo(() => {
    return [...messages].sort((a, b) => {
      // Processing first
      if (a.status === 'processing' && b.status !== 'processing') return -1;
      if (b.status === 'processing' && a.status !== 'processing') return 1;
      // Then by priority
      const priorityOrder = { high: 0, normal: 1, low: 2 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      // Then by time
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
  }, [messages]);

  const visibleMessages = sortedMessages.slice(0, maxVisible);
  const hiddenCount = Math.max(0, sortedMessages.length - maxVisible);

  if (messages.length === 0) {
    return null;
  }

  return (
    <div className={cn(
      'rounded-xl border border-border/50 bg-card/95 backdrop-blur-sm overflow-hidden',
      'animate-in fade-in-0 slide-in-from-bottom-2 duration-300',
      className
    )}>
      {/* Header */}
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <button className="flex items-center justify-between w-full p-3 hover:bg-accent/50 transition-colors">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <MessageSquare className="h-4 w-4 text-primary" />
              </div>
              <div className="text-left">
                <h4 className="font-medium text-sm">Message Queue</h4>
                <p className="text-xs text-muted-foreground">
                  {stats.processing > 0 && `${stats.processing} processing, `}
                  {stats.queued} waiting
                  {stats.failed > 0 && `, ${stats.failed} failed`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isPaused && (
                <Badge variant="outline" className="text-orange-500 border-orange-500/50">
                  Paused
                </Badge>
              )}
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          {/* Progress indicator */}
          {stats.processing > 0 && (
            <div className="px-3 pb-2">
              <Progress value={undefined} className="h-1 animate-pulse" />
            </div>
          )}

          {/* Messages list */}
          <ScrollArea className="max-h-[300px]">
            <div className="p-3 pt-0 space-y-2">
              <AnimatePresence>
                {visibleMessages.map((message, index) => (
                  <PendingMessageItem
                    key={message.id}
                    message={message}
                    position={index + 1}
                    onCancel={() => onCancelMessage(message.id)}
                    onRetry={() => onRetryMessage(message.id)}
                  />
                ))}
              </AnimatePresence>

              {hiddenCount > 0 && (
                <div className="text-center py-2">
                  <span className="text-xs text-muted-foreground">
                    +{hiddenCount} more messages
                  </span>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Footer actions */}
          <div className="flex items-center justify-between p-3 border-t bg-muted/30">
            <div className="flex items-center gap-2">
              {onPauseQueue && onResumeQueue && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={isPaused ? onResumeQueue : onPauseQueue}
                >
                  {isPaused ? (
                    <>
                      <Play className="h-3 w-3 mr-1" />
                      Resume
                    </>
                  ) : (
                    <>
                      <Pause className="h-3 w-3 mr-1" />
                      Pause
                    </>
                  )}
                </Button>
              )}
            </div>
            {onClearAll && stats.total > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-destructive hover:text-destructive"
                onClick={onClearAll}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Clear All
              </Button>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

export default PendingMessagesQueue;
