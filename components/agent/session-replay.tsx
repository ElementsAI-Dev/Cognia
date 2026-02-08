'use client';

/**
 * Session Replay — Step-by-step playback of agent execution sessions.
 * Allows users to review what the agent did, in chronological order,
 * with controls for stepping through events.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Rewind,
  FastForward,
  Clock,
  Zap,
  Coins,
  Wrench,
  MessageSquare,
  Brain,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCost } from '@/lib/agent-trace/cost-estimator';
import type { DBAgentTrace } from '@/lib/db';
import type { AgentTraceRecord, AgentTraceEventType } from '@/types/agent-trace';

interface ReplayEvent {
  id: string;
  timestamp: number;
  eventType: AgentTraceEventType;
  stepId?: string;
  toolName?: string;
  success?: boolean;
  duration?: number;
  tokenUsage?: { promptTokens: number; completionTokens: number; totalTokens: number };
  cost?: number;
  error?: string;
  responsePreview?: string;
  files: string[];
}

function parseReplayEvent(row: DBAgentTrace): ReplayEvent | null {
  try {
    const record = JSON.parse(row.record) as AgentTraceRecord;
    const meta = record.metadata as Record<string, unknown> | undefined;
    const tu = meta?.tokenUsage as ReplayEvent['tokenUsage'] | undefined;

    return {
      id: record.id,
      timestamp: new Date(record.timestamp).getTime(),
      eventType: record.eventType ?? 'response',
      stepId: record.stepId,
      toolName: meta?.toolName as string | undefined,
      success: meta?.success as boolean | undefined,
      duration: record.duration ?? (meta?.latencyMs as number | undefined),
      tokenUsage: tu,
      cost: record.costEstimate?.totalCost,
      error: meta?.error as string | undefined,
      responsePreview: meta?.responsePreview as string | undefined,
      files: record.files.map((f) => f.path).filter(Boolean),
    };
  } catch {
    return null;
  }
}

const EVENT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  step_start: Play,
  step_finish: CheckCircle2,
  tool_call_request: Wrench,
  tool_call_result: Wrench,
  planning: Brain,
  response: MessageSquare,
  error: AlertCircle,
};

interface SessionReplayProps {
  traces: DBAgentTrace[];
  className?: string;
}

export function SessionReplay({ traces, className }: SessionReplayProps) {
  const t = useTranslations('settings');

  const events = useMemo(() => {
    return traces
      .map(parseReplayEvent)
      .filter((e): e is ReplayEvent => e !== null)
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [traces]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  // Cumulative stats up to current index
  const cumulativeStats = useMemo(() => {
    let tokens = 0;
    let cost = 0;
    let toolCalls = 0;
    let failures = 0;

    for (let i = 0; i <= currentIndex && i < events.length; i++) {
      const ev = events[i];
      if (ev.tokenUsage) tokens += ev.tokenUsage.totalTokens;
      if (ev.cost) cost += ev.cost;
      if (ev.eventType === 'tool_call_result') {
        toolCalls++;
        if (ev.success === false) failures++;
      }
    }

    return { tokens, cost, toolCalls, failures };
  }, [events, currentIndex]);

  // Auto-play
  useEffect(() => {
    if (!isPlaying || events.length === 0) return;
    if (currentIndex >= events.length - 1) return;

    const nextEvent = events[currentIndex + 1];
    const currentEvt = events[currentIndex];
    const delay = Math.max(100, (nextEvent.timestamp - currentEvt.timestamp) / playbackSpeed);
    const capped = Math.min(delay, 2000 / playbackSpeed);

    const timer = setTimeout(() => {
      setCurrentIndex((prev) => {
        const next = Math.min(prev + 1, events.length - 1);
        if (next >= events.length - 1) {
          setIsPlaying(false);
        }
        return next;
      });
    }, capped);

    return () => clearTimeout(timer);
  }, [isPlaying, currentIndex, events, playbackSpeed]);

  const goToStart = useCallback(() => {
    setCurrentIndex(0);
    setIsPlaying(false);
  }, []);

  const goToEnd = useCallback(() => {
    setCurrentIndex(Math.max(0, events.length - 1));
    setIsPlaying(false);
  }, [events.length]);

  const stepBack = useCallback(() => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const stepForward = useCallback(() => {
    setCurrentIndex((prev) => Math.min(events.length - 1, prev + 1));
  }, [events.length]);

  const togglePlay = useCallback(() => {
    if (currentIndex >= events.length - 1) {
      setCurrentIndex(0);
    }
    setIsPlaying((prev) => !prev);
  }, [currentIndex, events.length]);

  const currentEvent = events[currentIndex] ?? null;

  if (events.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center p-8 text-sm text-muted-foreground">
          {t('agentTrace.replay.empty') || 'No events to replay'}
        </CardContent>
      </Card>
    );
  }

  const elapsed = currentEvent
    ? currentEvent.timestamp - events[0].timestamp
    : 0;

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Play className="h-4 w-4 text-primary" />
            {t('agentTrace.replay.title') || 'Session Replay'}
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            {currentIndex + 1} / {events.length}
          </span>
        </div>

        {/* Cumulative stats */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatElapsed(elapsed)}
          </span>
          <span className="flex items-center gap-1">
            <Zap className="h-3 w-3" />
            {formatTokens(cumulativeStats.tokens)}
          </span>
          {cumulativeStats.cost > 0 && (
            <span className="flex items-center gap-1">
              <Coins className="h-3 w-3" />
              {formatCost(cumulativeStats.cost)}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Wrench className="h-3 w-3" />
            {cumulativeStats.toolCalls}
            {cumulativeStats.failures > 0 && (
              <span className="text-red-500">({cumulativeStats.failures})</span>
            )}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Progress slider */}
        <Slider
          value={[currentIndex]}
          min={0}
          max={Math.max(0, events.length - 1)}
          step={1}
          onValueChange={([v]) => {
            setCurrentIndex(v);
            setIsPlaying(false);
          }}
          className="w-full"
        />

        {/* Playback controls */}
        <div className="flex items-center justify-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goToStart}>
                <Rewind className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Start</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={stepBack}>
                <SkipBack className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Previous</TooltipContent>
          </Tooltip>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={togglePlay}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={stepForward}>
                <SkipForward className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Next</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goToEnd}>
                <FastForward className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>End</TooltipContent>
          </Tooltip>

          {/* Speed control */}
          <Badge
            variant="outline"
            className="text-[10px] ml-2 cursor-pointer select-none"
            onClick={() =>
              setPlaybackSpeed((prev) => {
                const speeds = [0.5, 1, 2, 4, 8];
                const idx = speeds.indexOf(prev);
                return speeds[(idx + 1) % speeds.length];
              })
            }
          >
            {playbackSpeed}x
          </Badge>
        </div>

        {/* Current event detail */}
        {currentEvent && (
          <div className="border rounded-md p-3 space-y-2">
            <EventDetail event={currentEvent} />
          </div>
        )}

        {/* Mini timeline - shows recent events around current */}
        <ScrollArea className="max-h-[180px]">
          <div className="space-y-0.5">
            {events.slice(Math.max(0, currentIndex - 3), currentIndex + 8).map((ev, i) => {
              const actualIndex = Math.max(0, currentIndex - 3) + i;
              const Icon = EVENT_ICONS[ev.eventType] ?? Play;
              return (
                <div
                  key={ev.id}
                  className={cn(
                    'flex items-center gap-2 px-2 py-0.5 rounded text-xs cursor-pointer transition-colors',
                    actualIndex === currentIndex
                      ? 'bg-primary/10 font-medium'
                      : 'hover:bg-muted/50'
                  )}
                  onClick={() => {
                    setCurrentIndex(actualIndex);
                    setIsPlaying(false);
                  }}
                >
                  <Icon className="h-3 w-3 shrink-0 text-muted-foreground" />
                  <span className="capitalize truncate">
                    {ev.eventType.replace(/_/g, ' ')}
                  </span>
                  {ev.toolName && (
                    <span className="text-muted-foreground truncate">{ev.toolName}</span>
                  )}
                  {ev.success === false && (
                    <AlertCircle className="h-3 w-3 text-red-500 shrink-0" />
                  )}
                  <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                    {new Date(ev.timestamp).toLocaleTimeString(undefined, {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function EventDetail({ event }: { event: ReplayEvent }) {
  const Icon = EVENT_ICONS[event.eventType] ?? Play;

  return (
    <div className="space-y-1.5 text-xs">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <span className="font-medium capitalize">
          {event.eventType.replace(/_/g, ' ')}
        </span>
        {event.stepId && (
          <Badge variant="secondary" className="text-[10px]">
            {event.stepId}
          </Badge>
        )}
        {event.success === false && (
          <Badge variant="destructive" className="text-[10px]">
            Failed
          </Badge>
        )}
      </div>

      {event.toolName && (
        <div className="text-muted-foreground">
          Tool: <span className="font-mono">{event.toolName}</span>
        </div>
      )}

      {event.duration !== undefined && (
        <div className="text-muted-foreground">
          Duration: {formatElapsed(event.duration)}
        </div>
      )}

      {event.tokenUsage && event.tokenUsage.totalTokens > 0 && (
        <div className="text-muted-foreground">
          Tokens: {event.tokenUsage.totalTokens.toLocaleString()} (in: {event.tokenUsage.promptTokens.toLocaleString()}, out: {event.tokenUsage.completionTokens.toLocaleString()})
        </div>
      )}

      {event.cost !== undefined && event.cost > 0 && (
        <div className="text-muted-foreground">
          Cost: {formatCost(event.cost)}
        </div>
      )}

      {event.files.length > 0 && (
        <div className="text-muted-foreground truncate">
          Files: {event.files.join(', ')}
        </div>
      )}

      {event.error && (
        <div className="text-red-500 text-[11px]">{event.error}</div>
      )}

      {event.responsePreview && (
        <div className="text-muted-foreground text-[11px] line-clamp-3 bg-muted/30 rounded p-1.5">
          {event.responsePreview}
        </div>
      )}
    </div>
  );
}

function formatElapsed(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const mins = Math.floor(ms / 60000);
  const secs = ((ms % 60000) / 1000).toFixed(0);
  return `${mins}m ${secs}s`;
}

function formatTokens(count: number): string {
  if (count < 1000) return `${count}`;
  if (count < 1_000_000) return `${(count / 1000).toFixed(1)}k`;
  return `${(count / 1_000_000).toFixed(2)}M`;
}

export default SessionReplay;
