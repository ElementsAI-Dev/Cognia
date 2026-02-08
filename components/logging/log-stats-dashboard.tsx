'use client';

/**
 * LogStatsDashboard
 *
 * Recharts-based visualization dashboard for log analytics.
 * Shows level distribution, log volume over time, module activity,
 * and summary stat cards.
 */

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, AlertTriangle, Clock, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TOOLTIP_STYLE, CHART_MARGINS } from '@/components/observability/charts/chart-config';
import type { StructuredLogEntry, LogLevel } from '@/lib/logger';

export interface LogStatsDashboardProps {
  logs: StructuredLogEntry[];
  className?: string;
}

const LEVEL_COLORS: Record<LogLevel, string> = {
  trace: '#94a3b8',
  debug: '#3b82f6',
  info: '#22c55e',
  warn: '#eab308',
  error: '#ef4444',
  fatal: '#b91c1c',
};

/**
 * Compute time-bucketed log counts for the volume chart.
 * Buckets are 5-minute intervals.
 */
function computeVolumeBuckets(
  logs: StructuredLogEntry[],
  bucketMinutes = 5
): { time: string; info: number; warn: number; error: number; other: number }[] {
  if (logs.length === 0) return [];

  const bucketMs = bucketMinutes * 60 * 1000;
  const sorted = [...logs].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const first = new Date(sorted[0].timestamp).getTime();
  const last = new Date(sorted[sorted.length - 1].timestamp).getTime();
  const bucketCount = Math.max(1, Math.ceil((last - first) / bucketMs) + 1);
  const capped = Math.min(bucketCount, 96); // max 96 buckets (8 hours at 5min)

  const buckets: { time: string; info: number; warn: number; error: number; other: number }[] = [];
  const startTime = last - (capped - 1) * bucketMs;

  for (let i = 0; i < capped; i++) {
    const bucketStart = startTime + i * bucketMs;
    buckets.push({
      time: new Date(bucketStart).toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
      }),
      info: 0,
      warn: 0,
      error: 0,
      other: 0,
    });
  }

  for (const log of sorted) {
    const ts = new Date(log.timestamp).getTime();
    const idx = Math.floor((ts - startTime) / bucketMs);
    if (idx < 0 || idx >= capped) continue;

    if (log.level === 'error' || log.level === 'fatal') {
      buckets[idx].error++;
    } else if (log.level === 'warn') {
      buckets[idx].warn++;
    } else if (log.level === 'info') {
      buckets[idx].info++;
    } else {
      buckets[idx].other++;
    }
  }

  return buckets;
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
            color || 'bg-primary/10 text-primary'
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          <p className="text-lg font-semibold leading-tight">{value}</p>
          {sub && <p className="text-xs text-muted-foreground truncate">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export function LogStatsDashboard({ logs, className }: LogStatsDashboardProps) {
  const t = useTranslations('logging');

  // Level distribution data
  const levelData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const log of logs) {
      counts[log.level] = (counts[log.level] || 0) + 1;
    }
    return Object.entries(counts)
      .filter(([, count]) => count > 0)
      .map(([level, count]) => ({
        name: level,
        value: count,
        color: LEVEL_COLORS[level as LogLevel] || '#94a3b8',
      }))
      .sort((a, b) => b.value - a.value);
  }, [logs]);

  // Module activity data
  const moduleData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const log of logs) {
      counts[log.module] = (counts[log.module] || 0) + 1;
    }
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 modules
  }, [logs]);

  // Volume timeline data
  const volumeData = useMemo(() => computeVolumeBuckets(logs), [logs]);

  // Summary stats
  const stats = useMemo(() => {
    const errorCount = logs.filter((l) => l.level === 'error' || l.level === 'fatal').length;
    const errorRate = logs.length > 0 ? ((errorCount / logs.length) * 100).toFixed(1) : '0';

    const moduleCounts: Record<string, number> = {};
    for (const log of logs) {
      moduleCounts[log.module] = (moduleCounts[log.module] || 0) + 1;
    }
    const topModule = Object.entries(moduleCounts).sort((a, b) => b[1] - a[1])[0];

    let timeSpan = '';
    if (logs.length > 0) {
      const sorted = logs
        .map((l) => new Date(l.timestamp).getTime())
        .sort((a, b) => a - b);
      const diffMs = sorted[sorted.length - 1] - sorted[0];
      const diffHours = diffMs / (1000 * 60 * 60);
      if (diffHours < 1) {
        timeSpan = `${Math.round(diffMs / (1000 * 60))}m`;
      } else if (diffHours < 24) {
        timeSpan = `${diffHours.toFixed(1)}h`;
      } else {
        timeSpan = `${(diffHours / 24).toFixed(1)}d`;
      }
    }

    return { errorCount, errorRate, topModule, timeSpan };
  }, [logs]);

  if (logs.length === 0) {
    return (
      <div className={cn('flex items-center justify-center py-12 text-muted-foreground', className)}>
        <p className="text-sm">{t('dashboard.noData')}</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4 p-4', className)}>
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={Layers}
          label={t('dashboard.totalLogs')}
          value={logs.length.toLocaleString()}
          color="bg-blue-500/10 text-blue-500"
        />
        <StatCard
          icon={AlertTriangle}
          label={t('dashboard.errorRate')}
          value={`${stats.errorRate}%`}
          sub={`${stats.errorCount} ${t('dashboard.errors')}`}
          color="bg-red-500/10 text-red-500"
        />
        <StatCard
          icon={Activity}
          label={t('dashboard.topModule')}
          value={stats.topModule?.[0] || '-'}
          sub={stats.topModule ? `${stats.topModule[1]} ${t('panel.logs')}` : undefined}
          color="bg-green-500/10 text-green-500"
        />
        <StatCard
          icon={Clock}
          label={t('dashboard.timeSpan')}
          value={stats.timeSpan || '-'}
          color="bg-purple-500/10 text-purple-500"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Level Distribution - Pie Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t('dashboard.levelDistribution')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ width: '100%', height: 220 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={levelData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    label={(props: any) =>
                      `${String(props.name ?? '')} ${(((props.percent as number) ?? 0) * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {levelData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE.contentStyle}
                    labelStyle={TOOLTIP_STYLE.labelStyle}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Log Volume Timeline - Area Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t('dashboard.logVolume')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ width: '100%', height: 220 }}>
              <ResponsiveContainer>
                <AreaChart data={volumeData} margin={CHART_MARGINS.default}>
                  <defs>
                    <linearGradient id="logVolumeInfo" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="logVolumeWarn" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#eab308" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#eab308" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="logVolumeError" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE.contentStyle}
                    labelStyle={TOOLTIP_STYLE.labelStyle}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="info"
                    stackId="1"
                    stroke="#22c55e"
                    fill="url(#logVolumeInfo)"
                    name="Info"
                  />
                  <Area
                    type="monotone"
                    dataKey="warn"
                    stackId="1"
                    stroke="#eab308"
                    fill="url(#logVolumeWarn)"
                    name="Warn"
                  />
                  <Area
                    type="monotone"
                    dataKey="error"
                    stackId="1"
                    stroke="#ef4444"
                    fill="url(#logVolumeError)"
                    name="Error"
                  />
                  <Area
                    type="monotone"
                    dataKey="other"
                    stackId="1"
                    stroke="#94a3b8"
                    fill="#94a3b8"
                    fillOpacity={0.2}
                    name="Other"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Module Activity - Bar Chart */}
      {moduleData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t('dashboard.moduleActivity')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ width: '100%', height: Math.max(180, moduleData.length * 32) }}>
              <ResponsiveContainer>
                <BarChart
                  data={moduleData}
                  layout="vertical"
                  margin={{ ...CHART_MARGINS.withYAxis, left: 80 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 12 }}
                    width={75}
                  />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE.contentStyle}
                    labelStyle={TOOLTIP_STYLE.labelStyle}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Logs" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default LogStatsDashboard;
