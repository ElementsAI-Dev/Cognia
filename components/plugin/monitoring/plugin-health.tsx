'use client';

/**
 * Plugin Health - Health monitoring dashboard for plugins
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { usePluginStore } from '@/stores/plugin';
import {
  pluginHealthMonitor,
  pluginAnalyticsStore,
  type PluginHealthStatus,
} from '@/lib/plugin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Empty, EmptyMedia, EmptyDescription } from '@/components/ui/empty';
import {
  Heart,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Activity,
  Clock,
  Zap,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PluginHealthProps {
  className?: string;
  showAllPlugins?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function PluginHealth({
  className,
  showAllPlugins = true,
  autoRefresh = true,
  refreshInterval = 30000,
}: PluginHealthProps) {
  const t = useTranslations('pluginHealth');
  const { getEnabledPlugins, plugins } = usePluginStore();
  const [healthStatuses, setHealthStatuses] = useState<PluginHealthStatus[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshHealth = useCallback(() => {
    setIsRefreshing(true);
    const enabledPlugins = getEnabledPlugins();
    const pluginIds = showAllPlugins
      ? Object.keys(plugins)
      : enabledPlugins.map((p) => p.manifest.id);

    const statuses = pluginHealthMonitor.checkAllHealth(pluginIds);
    setHealthStatuses(statuses);
    setIsRefreshing(false);
  }, [getEnabledPlugins, plugins, showAllPlugins]);

  useEffect(() => {
    const timer = setTimeout(() => {
      refreshHealth();
    }, 0);
    return () => clearTimeout(timer);
  }, [refreshHealth]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(refreshHealth, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refreshHealth]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'unhealthy':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Heart className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getProgressColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const overallScore =
    healthStatuses.length > 0
      ? Math.round(
          healthStatuses.reduce((sum, s) => sum + s.score, 0) / healthStatuses.length
        )
      : 100;

  const healthyCount = healthStatuses.filter((s) => s.status === 'healthy').length;
  const degradedCount = healthStatuses.filter((s) => s.status === 'degraded').length;
  const unhealthyCount = healthStatuses.filter((s) => s.status === 'unhealthy').length;

  return (
    <div className={cn('flex flex-col gap-3 sm:gap-4 h-full', className)}>
      {/* Summary Cards - Responsive grid */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4 md:gap-4">
        <Card>
          <CardContent className="p-3 sm:pt-4 sm:px-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">{t('summary.overallHealth')}</p>
                <p className={cn('text-xl sm:text-2xl font-bold', getScoreColor(overallScore))}>
                  {overallScore}%
                </p>
              </div>
              <Heart className={cn('h-6 w-6 sm:h-8 sm:w-8', getScoreColor(overallScore))} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:pt-4 sm:px-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">{t('summary.healthy')}</p>
                <p className="text-xl sm:text-2xl font-bold text-green-500">{healthyCount}</p>
              </div>
              <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:pt-4 sm:px-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">{t('summary.degraded')}</p>
                <p className="text-xl sm:text-2xl font-bold text-yellow-500">{degradedCount}</p>
              </div>
              <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:pt-4 sm:px-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">{t('summary.unhealthy')}</p>
                <p className="text-xl sm:text-2xl font-bold text-red-500">{unhealthyCount}</p>
              </div>
              <AlertCircle className="h-6 w-6 sm:h-8 sm:w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Plugin Health List */}
      <Card className="flex-1 flex flex-col min-h-0">
        <CardHeader className="p-3 sm:p-4 pb-2 shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
              {t('list.title')}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshHealth}
              disabled={isRefreshing}
            >
              <RefreshCw
                className={cn('h-4 w-4', isRefreshing && 'animate-spin')}
              />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 pt-0 flex-1 min-h-0">
          <ScrollArea className="h-full">
            {healthStatuses.length === 0 ? (
              <Empty className="py-6 sm:py-8 border-0">
                <EmptyMedia>
                  <Heart className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground" />
                </EmptyMedia>
                <EmptyDescription>{t('list.noPlugins')}</EmptyDescription>
              </Empty>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {healthStatuses.map((status) => {
                  const plugin = plugins[status.pluginId];
                  const stats = pluginAnalyticsStore.getStats(status.pluginId);

                  return (
                    <div
                      key={status.pluginId}
                      className="flex flex-col gap-2 p-2.5 sm:p-3 rounded-lg bg-muted/50 sm:flex-row sm:items-center sm:gap-4"
                    >
                      {/* Status icon and main info */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex-shrink-0">
                          {getStatusIcon(status.status)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm truncate">
                              {plugin?.manifest.name || status.pluginId}
                            </span>
                            <Badge
                              variant={
                                status.status === 'healthy'
                                  ? 'default'
                                  : status.status === 'degraded'
                                  ? 'secondary'
                                  : 'destructive'
                              }
                              className="text-[10px] sm:text-xs"
                            >
                              {status.status}
                            </Badge>
                          </div>

                          {status.issues.length > 0 && (
                            <div className="mt-1 space-y-0.5">
                              {status.issues.slice(0, 1).map((issue, idx) => (
                                <TooltipProvider key={idx}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <p className="text-[10px] sm:text-xs text-muted-foreground truncate cursor-help">
                                        {issue.message}
                                      </p>
                                    </TooltipTrigger>
                                    {issue.suggestion && (
                                      <TooltipContent>
                                        <p>{issue.suggestion}</p>
                                      </TooltipContent>
                                    )}
                                  </Tooltip>
                                </TooltipProvider>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Stats - hidden on very small screens */}
                      <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground">
                        {stats && (
                          <>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger className="flex items-center gap-1">
                                  <Zap className="h-3 w-3" />
                                  <span>{stats.totalCalls}</span>
                                </TooltipTrigger>
                                <TooltipContent>{t('list.totalCalls')}</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  <span>{Math.round(stats.averageDuration)}ms</span>
                                </TooltipTrigger>
                                <TooltipContent>{t('list.avgResponseTime')}</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger className="flex items-center gap-1">
                                  {stats.failedCalls / (stats.totalCalls || 1) > 0.1 ? (
                                    <TrendingDown className="h-3 w-3 text-red-500" />
                                  ) : (
                                    <TrendingUp className="h-3 w-3 text-green-500" />
                                  )}
                                  <span>
                                    {((1 - stats.failedCalls / (stats.totalCalls || 1)) * 100).toFixed(0)}%
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>{t('list.successRate')}</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </>
                        )}
                      </div>

                      {/* Progress bar */}
                      <div className="w-full sm:w-20 flex-shrink-0">
                        <div className="flex items-center gap-2">
                          <Progress
                            value={status.score}
                            className="h-1.5 sm:h-2 flex-1"
                            indicatorClassName={getProgressColor(status.score)}
                          />
                          <span className={cn('text-xs font-medium w-6 text-right', getScoreColor(status.score))}>
                            {status.score}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

export type { PluginHealthProps };
