'use client';

import { useMemo } from 'react';
import {
  Activity,
  BarChart3,
  CheckCircle,
  Clock,
  Database,
  TrendingUp,
  XCircle,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSandboxStats } from '@/hooks/use-sandbox-db';
import { getLanguageInfo } from '@/types/sandbox';

interface SandboxStatsProps {
  className?: string;
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendLabel,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  trendLabel?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
        {trend && trendLabel && (
          <div
            className={cn(
              'flex items-center text-xs mt-1',
              trend === 'up' && 'text-green-500',
              trend === 'down' && 'text-red-500',
              trend === 'neutral' && 'text-muted-foreground'
            )}
          >
            <TrendingUp
              className={cn(
                'h-3 w-3 mr-1',
                trend === 'down' && 'rotate-180'
              )}
            />
            {trendLabel}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LanguageBar({
  language,
  total,
  successful,
  failed,
  timeout,
  avgTime,
  maxTotal,
}: {
  language: string;
  total: number;
  successful: number;
  failed: number;
  timeout: number;
  avgTime: number;
  maxTotal: number;
}) {
  const langInfo = getLanguageInfo(language);
  const successRate = total > 0 ? (successful / total) * 100 : 0;
  const barWidth = maxTotal > 0 ? (total / maxTotal) * 100 : 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span>{langInfo.icon}</span>
          <span className="text-sm font-medium">{langInfo.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {total} 次
          </Badge>
          <Badge
            variant={successRate >= 80 ? 'default' : successRate >= 50 ? 'secondary' : 'destructive'}
            className="text-xs"
          >
            {successRate.toFixed(0)}%
          </Badge>
        </div>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full flex"
          style={{ width: `${barWidth}%` }}
        >
          <div
            className="bg-green-500 h-full"
            style={{ width: `${(successful / total) * 100}%` }}
          />
          <div
            className="bg-red-500 h-full"
            style={{ width: `${(failed / total) * 100}%` }}
          />
          <div
            className="bg-orange-500 h-full"
            style={{ width: `${(timeout / total) * 100}%` }}
          />
        </div>
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>
          成功 {successful} / 失败 {failed} / 超时 {timeout}
        </span>
        <span>平均 {avgTime.toFixed(0)}ms</span>
      </div>
    </div>
  );
}

function DailyChart({ data }: { data: { date: string; count: number }[] }) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="flex items-end gap-1 h-24">
      {data.map((item, index) => {
        const height = (item.count / maxCount) * 100;
        const date = new Date(item.date);
        const isToday =
          new Date().toDateString() === date.toDateString();

        return (
          <div
            key={index}
            className="flex-1 flex flex-col items-center gap-1"
          >
            <div
              className={cn(
                'w-full rounded-t transition-all',
                isToday ? 'bg-primary' : 'bg-primary/50'
              )}
              style={{ height: `${Math.max(height, 4)}%` }}
              title={`${item.date}: ${item.count} 次执行`}
            />
            {index % 7 === 0 && (
              <span className="text-[10px] text-muted-foreground">
                {date.getDate()}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function SandboxStats({ className }: SandboxStatsProps) {
  const { stats, languageStats, dailyCounts, loading, error } =
    useSandboxStats(30);

  const successRate = useMemo(() => {
    if (!stats || stats.total_executions === 0) return 0;
    return (stats.successful_executions / stats.total_executions) * 100;
  }, [stats]);

  const formatTime = (ms: number): string => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };


  if (loading) {
    return (
      <div className={cn('flex items-center justify-center py-12', className)}>
        <Activity className="h-6 w-6 animate-pulse text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('text-center py-8 text-destructive', className)}>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className={cn('text-center py-8 text-muted-foreground', className)}>
        <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p className="text-sm">暂无统计数据</p>
      </div>
    );
  }

  const maxLangTotal = Math.max(...languageStats.map((l) => l.total_executions), 1);

  return (
    <div className={cn('space-y-6', className)}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="总执行次数"
          value={stats.total_executions}
          icon={Zap}
          subtitle={`${stats.total_snippets} 个代码片段`}
        />
        <StatCard
          title="成功率"
          value={`${successRate.toFixed(1)}%`}
          icon={CheckCircle}
          subtitle={`${stats.successful_executions} 次成功`}
          trend={successRate >= 80 ? 'up' : successRate >= 50 ? 'neutral' : 'down'}
          trendLabel={successRate >= 80 ? '良好' : successRate >= 50 ? '一般' : '需改进'}
        />
        <StatCard
          title="平均执行时间"
          value={formatTime(stats.avg_execution_time_ms)}
          icon={Clock}
          subtitle={`总计 ${formatTime(stats.total_execution_time_ms)}`}
        />
        <StatCard
          title="失败/超时"
          value={`${stats.failed_executions}/${stats.timeout_executions}`}
          icon={XCircle}
          subtitle="失败 / 超时"
        />
      </div>

      {dailyCounts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              最近 30 天执行趋势
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DailyChart data={dailyCounts} />
          </CardContent>
        </Card>
      )}

      {languageStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Database className="h-4 w-4" />
              语言统计
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {languageStats.slice(0, 10).map((lang) => (
              <LanguageBar
                key={lang.language}
                language={lang.language}
                total={lang.total_executions}
                successful={lang.successful_executions}
                failed={lang.failed_executions}
                timeout={lang.timeout_executions}
                avgTime={lang.avg_execution_time_ms}
                maxTotal={maxLangTotal}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {stats.most_used_language && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">
                  {getLanguageInfo(stats.most_used_language).icon}
                </span>
                <div>
                  <p className="text-sm text-muted-foreground">最常用语言</p>
                  <p className="font-medium">
                    {getLanguageInfo(stats.most_used_language).name}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">会话数</p>
                <p className="font-medium">{stats.total_sessions}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default SandboxStats;
