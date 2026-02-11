'use client';

/**
 * Live Trace Panel — Real-time agent execution monitoring.
 * Shows live events, token usage, cost, and tool call progress
 * for an active agent session.
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Activity,
  Zap,
  Clock,
  Coins,
  Wrench,
  CheckCircle2,
  XCircle,
  Play,
  Pause,
  AlertTriangle,
  MessageSquare,
  Brain,
  ArrowRight,
} from 'lucide-react';
import { useAgentTraceStore, type AgentTraceEvent } from '@/stores/agent-trace';
import { formatCost } from '@/lib/agent-trace/cost-estimator';
import { cn } from '@/lib/utils';

interface LiveTracePanelProps {
  sessionId: string;
  className?: string;
  maxEvents?: number;
  compact?: boolean;
}

const EVENT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  step_start: Play,
  step_finish: Pause,
  tool_call_request: ArrowRight,
  tool_call_result: Wrench,
  planning: Brain,
  response: MessageSquare,
  error: AlertTriangle,
  checkpoint_create: CheckCircle2,
  checkpoint_restore: XCircle,
};

const EVENT_COLORS: Record<string, string> = {
  step_start: 'text-blue-500',
  step_finish: 'text-blue-400',
  tool_call_request: 'text-amber-500',
  tool_call_result: 'text-green-500',
  planning: 'text-purple-500',
  response: 'text-teal-500',
  error: 'text-red-500',
  checkpoint_create: 'text-sky-500',
  checkpoint_restore: 'text-orange-500',
};

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function formatTokens(count: number): string {
  if (count < 1000) return `${count}`;
  if (count < 1_000_000) return `${(count / 1000).toFixed(1)}k`;
  return `${(count / 1_000_000).toFixed(2)}M`;
}

export function LiveTracePanel({
  sessionId,
  className,
  maxEvents = 50,
  compact = false,
}: LiveTracePanelProps) {
  const session = useAgentTraceStore((s) => s.activeSessions[sessionId]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new events
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [session?.events.length]);

  const recentEvents = useMemo(
    () => (session?.events ?? []).slice(-maxEvents),
    [session?.events, maxEvents]
  );

  const sessionStartedAt = session?.startedAt;
  const sessionStatus = session?.status;
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!sessionStartedAt || sessionStatus !== 'running') return;
    const timer = setInterval(() => {
      setElapsed(Date.now() - sessionStartedAt);
    }, 1000);
    return () => clearInterval(timer);
  }, [sessionStartedAt, sessionStatus]);

  if (!session) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center p-6 text-sm text-muted-foreground">
          No active session
        </CardContent>
      </Card>
    );
  }

  const statusColor =
    session.status === 'running'
      ? 'text-green-500'
      : session.status === 'error'
        ? 'text-red-500'
        : 'text-muted-foreground';

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className={cn('h-4 w-4', statusColor)} />
            Live Trace
            <Badge
              variant={session.status === 'running' ? 'default' : 'secondary'}
              className="text-[10px] h-4"
            >
              {session.status}
            </Badge>
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            Step {session.currentStep}
          </span>
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDuration(elapsed)}
              </span>
            </TooltipTrigger>
            <TooltipContent>Elapsed time</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <span className="flex items-center gap-1">
                <Zap className="h-3 w-3" />
                {formatTokens(session.tokenUsage.totalTokens)}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              Prompt: {formatTokens(session.tokenUsage.promptTokens)} |
              Completion: {formatTokens(session.tokenUsage.completionTokens)}
            </TooltipContent>
          </Tooltip>

          {session.totalCost > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex items-center gap-1">
                  <Coins className="h-3 w-3" />
                  {formatCost(session.totalCost)}
                </span>
              </TooltipTrigger>
              <TooltipContent>Estimated cost</TooltipContent>
            </Tooltip>
          )}

          <span className="flex items-center gap-1">
            <Wrench className="h-3 w-3" />
            {session.toolCalls}
            {session.toolFailures > 0 && (
              <span className="text-red-500">({session.toolFailures} failed)</span>
            )}
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className={compact ? 'max-h-[200px]' : 'max-h-[400px]'}>
          <div ref={scrollRef} className="divide-y">
            {recentEvents.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                Waiting for events...
              </div>
            ) : (
              recentEvents.map((event) => (
                <EventRow key={event.id} event={event} compact={compact} />
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

interface EventRowProps {
  event: AgentTraceEvent;
  compact?: boolean;
}

function EventRow({ event, compact }: EventRowProps) {
  const Icon = EVENT_ICONS[event.eventType] ?? Activity;
  const color = EVENT_COLORS[event.eventType] ?? 'text-muted-foreground';
  const time = new Date(event.timestamp).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <div className={cn('flex items-start gap-2 px-3', compact ? 'py-1' : 'py-1.5')}>
      <Icon className={cn('h-3.5 w-3.5 mt-0.5 shrink-0', color)} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-xs">
          <span className="font-medium capitalize">
            {event.eventType.replace(/_/g, ' ')}
          </span>
          {event.toolName && (
            <Badge variant="outline" className="text-[10px] h-4 px-1">
              {event.toolName}
            </Badge>
          )}
          {event.success === false && (
            <Badge variant="destructive" className="text-[10px] h-4 px-1">
              Failed
            </Badge>
          )}
          {event.duration !== undefined && (
            <span className="text-muted-foreground">{formatDuration(event.duration)}</span>
          )}
          <span className="text-muted-foreground ml-auto shrink-0">{time}</span>
        </div>

        {!compact && event.error && (
          <p className="text-[10px] text-red-500 truncate mt-0.5">{event.error}</p>
        )}
        {!compact && event.responsePreview && (
          <p className="text-[10px] text-muted-foreground truncate mt-0.5">
            {event.responsePreview.slice(0, 120)}
          </p>
        )}
      </div>
    </div>
  );
}

