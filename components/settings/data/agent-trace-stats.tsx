'use client';

import { useTranslations } from 'next-intl';
import {
  Activity,
  Database,
  Clock,
  Layers,
  Coins,
  DollarSign,
  CheckCircle2,
  XCircle,
  BarChart3,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import type { SessionTraceSummary, TraceStats } from '@/lib/db/repositories/agent-trace-repository';
import { formatCost } from '@/lib/agent-trace/cost-estimator';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subValue?: string;
  className?: string;
}

function StatCard({ icon, label, value, subValue, className }: StatCardProps) {
  return (
    <div className={cn('flex items-center gap-3 rounded-lg border px-3 py-2', className)}>
      <div className="shrink-0 text-muted-foreground">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-sm font-semibold tabular-nums">{value}</div>
        {subValue && <div className="text-[10px] text-muted-foreground">{subValue}</div>}
      </div>
    </div>
  );
}

function formatTokens(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return String(count);
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ${Math.floor((ms % 60_000) / 1000)}s`;
  return `${Math.floor(ms / 3_600_000)}h ${Math.floor((ms % 3_600_000) / 60_000)}m`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatPercent(rate: number): string {
  return `${(rate * 100).toFixed(0)}%`;
}

interface AgentTraceStatsProps {
  stats: TraceStats | null;
  className?: string;
}

export function AgentTraceStatsOverview({ stats, className }: AgentTraceStatsProps) {
  const t = useTranslations('settings.agentTrace.stats');

  if (!stats) return null;

  return (
    <div className={cn('grid grid-cols-2 gap-2 sm:grid-cols-4', className)}>
      <StatCard
        icon={<Activity className="h-4 w-4" />}
        label={t('totalTraces')}
        value={stats.totalTraces.toLocaleString()}
      />
      <StatCard
        icon={<Layers className="h-4 w-4" />}
        label={t('sessions')}
        value={stats.sessionCount.toLocaleString()}
      />
      <StatCard
        icon={<Coins className="h-4 w-4" />}
        label={t('totalTokens')}
        value={formatTokens(stats.totalTokens)}
        subValue={stats.totalTokens > 0 ? `${stats.totalTokens.toLocaleString()} exact` : undefined}
      />
      <StatCard
        icon={<Database className="h-4 w-4" />}
        label={t('storage')}
        value={formatBytes(stats.storageEstimateBytes)}
      />
      {stats.totalCost > 0 && (
        <StatCard
          icon={<DollarSign className="h-4 w-4" />}
          label={t('totalCost') || 'Total Cost'}
          value={formatCost(stats.totalCost)}
        />
      )}
    </div>
  );
}

interface AgentTraceSessionSummaryProps {
  summary: SessionTraceSummary;
  className?: string;
}

export function AgentTraceSessionSummary({ summary, className }: AgentTraceSessionSummaryProps) {
  const t = useTranslations('settings.agentTrace.stats');

  return (
    <div className={cn('space-y-3', className)}>
      {/* Top-level metrics */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatCard
          icon={<Layers className="h-4 w-4" />}
          label={t('steps')}
          value={summary.totalSteps}
        />
        <StatCard
          icon={<Clock className="h-4 w-4" />}
          label={t('duration')}
          value={formatDuration(summary.durationMs)}
        />
        <StatCard
          icon={<Coins className="h-4 w-4" />}
          label={t('totalTokens')}
          value={formatTokens(summary.tokenUsage.totalTokens)}
          subValue={
            summary.tokenUsage.totalTokens > 0
              ? `${formatTokens(summary.tokenUsage.promptTokens)} in / ${formatTokens(summary.tokenUsage.completionTokens)} out`
              : undefined
          }
        />
        <StatCard
          icon={<BarChart3 className="h-4 w-4" />}
          label={t('avgLatency')}
          value={summary.avgLatencyMs > 0 ? formatDuration(summary.avgLatencyMs) : '-'}
        />
        {summary.totalCost > 0 && (
          <StatCard
            icon={<DollarSign className="h-4 w-4" />}
            label={t('totalCost') || 'Est. Cost'}
            value={formatCost(summary.totalCost)}
          />
        )}
      </div>

      {/* Tool call metrics */}
      {summary.toolCallCount > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <StatCard
            icon={<Activity className="h-4 w-4" />}
            label={t('toolCalls')}
            value={summary.toolCallCount}
            subValue={`${summary.uniqueToolNames.length} ${t('uniqueTools')}`}
          />
          <StatCard
            icon={<CheckCircle2 className="h-4 w-4 text-green-500" />}
            label={t('successRate')}
            value={formatPercent(summary.toolSuccessRate)}
            subValue={`${summary.toolSuccessCount} / ${summary.toolCallCount}`}
          />
          {summary.toolFailureCount > 0 && (
            <StatCard
              icon={<XCircle className="h-4 w-4 text-red-500" />}
              label={t('failures')}
              value={summary.toolFailureCount}
            />
          )}
        </div>
      )}

      {/* Models and files */}
      {(summary.models.length > 0 || summary.uniqueFilePaths.length > 0) && (
        <div className="flex flex-wrap gap-1.5">
          {summary.models.map((model) => (
            <span
              key={model}
              className="inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] text-muted-foreground"
            >
              {model}
            </span>
          ))}
          {summary.uniqueToolNames.map((tool) => (
            <span
              key={tool}
              className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-mono"
            >
              {tool}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
