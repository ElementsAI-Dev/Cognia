'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  Play,
  CheckCircle2,
  AlertCircle,
  Wrench,
  Brain,
  MessageSquare,
  ChevronRight,
  Undo2,
  Save,
  Coins,
  Tag,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { DBAgentTrace } from '@/lib/db';
import type { AgentTraceRecord, AgentTraceEventType, TraceCostEstimate, AgentTraceSeverity } from '@/types/agent-trace';
import { formatCost } from '@/lib/agent-trace/cost-estimator';

interface TimelineEntry {
  id: string;
  timestamp: Date;
  eventType: AgentTraceEventType | 'unknown';
  stepId?: string;
  turnId?: string;
  toolName?: string;
  toolCallId?: string;
  success?: boolean;
  latencyMs?: number;
  duration?: number;
  tokenUsage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number };
  costEstimate?: TraceCostEstimate;
  severity?: AgentTraceSeverity;
  tags?: string[];
  files: string[];
  responsePreview?: string;
  error?: string;
  finishReason?: string;
}

function parseTimelineEntry(row: DBAgentTrace): TimelineEntry | null {
  try {
    const record = JSON.parse(row.record) as AgentTraceRecord;
    const meta = record.metadata as Record<string, unknown> | undefined;

    return {
      id: record.id,
      timestamp: new Date(record.timestamp),
      eventType: (record.eventType || 'unknown') as AgentTraceEventType | 'unknown',
      stepId: record.stepId,
      turnId: record.turnId,
      toolName: meta?.toolName as string | undefined,
      toolCallId: meta?.toolCallId as string | undefined,
      success: meta?.success as boolean | undefined,
      latencyMs: meta?.latencyMs as number | undefined,
      duration: record.duration,
      tokenUsage: meta?.tokenUsage as TimelineEntry['tokenUsage'] ?? (meta?.usage as TimelineEntry['tokenUsage']),
      costEstimate: record.costEstimate,
      severity: record.severity,
      tags: record.tags,
      files: record.files.map((f) => f.path).filter(Boolean),
      responsePreview: meta?.responsePreview as string | undefined,
      error: meta?.error as string | undefined,
      finishReason: meta?.finishReason as string | undefined,
    };
  } catch {
    return null;
  }
}

const EVENT_CONFIG: Record<string, { icon: typeof Play; color: string; label: string }> = {
  session_start: { icon: Play, color: 'text-blue-500', label: 'Session Start' },
  session_end: { icon: CheckCircle2, color: 'text-green-500', label: 'Session End' },
  permission_request: { icon: AlertCircle, color: 'text-amber-500', label: 'Permission Request' },
  permission_response: { icon: CheckCircle2, color: 'text-emerald-500', label: 'Permission Response' },
  step_start: { icon: Play, color: 'text-blue-500', label: 'Step Start' },
  step_finish: { icon: CheckCircle2, color: 'text-green-500', label: 'Step Finish' },
  tool_call_request: { icon: Wrench, color: 'text-orange-500', label: 'Tool Request' },
  tool_call_result: { icon: Wrench, color: 'text-purple-500', label: 'Tool Result' },
  planning: { icon: Brain, color: 'text-cyan-500', label: 'Planning' },
  response: { icon: MessageSquare, color: 'text-emerald-500', label: 'Response' },
  checkpoint_create: { icon: Save, color: 'text-sky-500', label: 'Checkpoint' },
  checkpoint_restore: { icon: Undo2, color: 'text-amber-500', label: 'Restore' },
  error: { icon: AlertCircle, color: 'text-red-500', label: 'Error' },
  unknown: { icon: ChevronRight, color: 'text-muted-foreground', label: 'Unknown' },
};

function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatTokenCount(count: number): string {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return String(count);
}

interface AgentTraceTimelineProps {
  traces: DBAgentTrace[];
  maxEntries?: number;
}

export function AgentTraceTimeline({ traces, maxEntries = 100 }: AgentTraceTimelineProps) {
  const t = useTranslations('settings.agentTrace.timeline');

  const entries = useMemo(() => {
    const parsed = traces
      .map(parseTimelineEntry)
      .filter((e): e is TimelineEntry => e !== null)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      .slice(0, maxEntries);

    return parsed;
  }, [traces, maxEntries]);

  // Group entries by step
  const stepGroups = useMemo(() => {
    const groups = new Map<string, TimelineEntry[]>();
    for (const entry of entries) {
      const key = entry.stepId || 'ungrouped';
      const group = groups.get(key) || [];
      group.push(entry);
      groups.set(key, group);
    }
    return groups;
  }, [entries]);

  if (entries.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-8">
        {t('empty')}
      </div>
    );
  }

  // Calculate time span for proportional bar widths
  const firstTs = entries[0].timestamp.getTime();
  const lastTs = entries[entries.length - 1].timestamp.getTime();
  const totalSpan = Math.max(lastTs - firstTs, 1);

  return (
    <TooltipProvider>
      <ScrollArea className="h-[400px] pr-2">
        <div className="space-y-1">
          {Array.from(stepGroups.entries()).map(([stepKey, stepEntries]) => (
            <div key={stepKey} className="space-y-0.5">
              {stepKey !== 'ungrouped' && (
                <div className="text-[10px] font-medium text-muted-foreground px-1 pt-1">
                  {stepKey}
                </div>
              )}
              {stepEntries.map((entry) => {
                const config = EVENT_CONFIG[entry.eventType] || EVENT_CONFIG.unknown;
                const Icon = config.icon;
                const offsetPercent = ((entry.timestamp.getTime() - firstTs) / totalSpan) * 100;

                return (
                  <Tooltip key={entry.id}>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-2 px-1 py-0.5 rounded hover:bg-muted/50 transition-colors cursor-default group">
                        {/* Timeline dot + line */}
                        <div className="relative flex items-center justify-center w-5 h-5 shrink-0">
                          <Icon className={cn('h-3.5 w-3.5', config.color)} />
                        </div>

                        {/* Time */}
                        <span className="text-[10px] text-muted-foreground w-16 shrink-0 tabular-nums">
                          {entry.timestamp.toLocaleTimeString(undefined, {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </span>

                        {/* Event type badge */}
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] px-1.5 py-0 h-4 shrink-0',
                            entry.success === false && 'border-red-500/50 text-red-500'
                          )}
                        >
                          {config.label}
                        </Badge>

                        {/* Tool name */}
                        {entry.toolName && (
                          <span className="text-xs font-mono text-muted-foreground truncate max-w-[120px]">
                            {entry.toolName}
                          </span>
                        )}

                        {/* File path */}
                        {entry.files.length > 0 && !entry.toolName && (
                          <span className="text-xs text-muted-foreground truncate max-w-[160px]">
                            {entry.files[0]}
                          </span>
                        )}

                        {/* Duration or Latency */}
                        {(entry.duration ?? entry.latencyMs) !== undefined && (
                          <span className="text-[10px] text-muted-foreground tabular-nums ml-auto shrink-0">
                            {formatMs(entry.duration ?? entry.latencyMs!)}
                          </span>
                        )}

                        {/* Token usage */}
                        {entry.tokenUsage?.totalTokens && (
                          <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                            {formatTokenCount(entry.tokenUsage.totalTokens)} tok
                          </span>
                        )}

                        {/* Cost estimate */}
                        {entry.costEstimate && entry.costEstimate.totalCost > 0 && (
                          <span className="text-[10px] text-muted-foreground tabular-nums shrink-0 flex items-center gap-0.5">
                            <Coins className="h-2.5 w-2.5" />
                            {formatCost(entry.costEstimate.totalCost)}
                          </span>
                        )}

                        {/* Tags */}
                        {entry.tags && entry.tags.length > 0 && (
                          <Tag className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                        )}

                        {/* Success/failure indicator */}
                        {entry.success === false && (
                          <AlertCircle className="h-3 w-3 text-red-500 shrink-0" />
                        )}

                        {/* Waterfall bar */}
                        <div className="flex-1 h-2 bg-muted/30 rounded-full overflow-hidden min-w-[60px] ml-1">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all',
                              entry.success === false ? 'bg-red-500/40' : 'bg-primary/30'
                            )}
                            style={{
                              marginLeft: `${Math.min(offsetPercent, 95)}%`,
                              width: `${Math.max(5, entry.latencyMs ? (entry.latencyMs / totalSpan) * 100 : 5)}%`,
                            }}
                          />
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-sm">
                      <div className="space-y-1 text-xs">
                        <div className="font-medium">{config.label}</div>
                        {entry.toolName && <div>{t('tool')}: {entry.toolName}</div>}
                        {entry.files.length > 0 && (
                          <div className="truncate">{t('files')}: {entry.files.join(', ')}</div>
                        )}
                        {entry.duration !== undefined && <div>Duration: {formatMs(entry.duration)}</div>}
                        {entry.latencyMs !== undefined && <div>{t('latency')}: {formatMs(entry.latencyMs)}</div>}
                        {entry.tokenUsage?.totalTokens && (
                          <div>{t('tokens')}: {entry.tokenUsage.totalTokens.toLocaleString()}</div>
                        )}
                        {entry.costEstimate && entry.costEstimate.totalCost > 0 && (
                          <div>Cost: {formatCost(entry.costEstimate.totalCost)} (in: {formatCost(entry.costEstimate.inputCost)}, out: {formatCost(entry.costEstimate.outputCost)})</div>
                        )}
                        {entry.tags && entry.tags.length > 0 && (
                          <div>Tags: {entry.tags.join(', ')}</div>
                        )}
                        {entry.error && (
                          <div className="text-red-500">{t('error')}: {entry.error}</div>
                        )}
                        {entry.responsePreview && (
                          <div className="line-clamp-2 text-muted-foreground">{entry.responsePreview}</div>
                        )}
                        {entry.finishReason && <div>{t('finishReason')}: {entry.finishReason}</div>}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          ))}
        </div>
      </ScrollArea>
    </TooltipProvider>
  );
}
