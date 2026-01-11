'use client';

/**
 * Plugin Health - Health monitoring dashboard for plugins
 */

import React, { useState, useEffect, useCallback } from 'react';
import { usePluginStore } from '@/stores/plugin';
import {
  pluginHealthMonitor,
  pluginAnalyticsStore,
  type PluginHealthStatus,
} from '@/lib/plugin/analytics';
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
    <div className={cn('space-y-4', className)}>
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overall Health</p>
                <p className={cn('text-2xl font-bold', getScoreColor(overallScore))}>
                  {overallScore}%
                </p>
              </div>
              <Heart className={cn('h-8 w-8', getScoreColor(overallScore))} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Healthy</p>
                <p className="text-2xl font-bold text-green-500">{healthyCount}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Degraded</p>
                <p className="text-2xl font-bold text-yellow-500">{degradedCount}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Unhealthy</p>
                <p className="text-2xl font-bold text-red-500">{unhealthyCount}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Plugin Health List */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Plugin Health Status
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
        <CardContent>
          <ScrollArea className="h-[300px]">
            {healthStatuses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Heart className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No plugins to monitor
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {healthStatuses.map((status) => {
                  const plugin = plugins[status.pluginId];
                  const stats = pluginAnalyticsStore.getStats(status.pluginId);

                  return (
                    <div
                      key={status.pluginId}
                      className="flex items-center gap-4 p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex-shrink-0">
                        {getStatusIcon(status.status)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">
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
                            className="text-xs"
                          >
                            {status.status}
                          </Badge>
                        </div>

                        {status.issues.length > 0 && (
                          <div className="mt-1 space-y-1">
                            {status.issues.slice(0, 2).map((issue, idx) => (
                              <TooltipProvider key={idx}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <p className="text-xs text-muted-foreground truncate cursor-help">
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

                      <div className="flex items-center gap-4 text-sm">
                        {stats && (
                          <>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger className="flex items-center gap-1">
                                  <Zap className="h-3 w-3" />
                                  <span>{stats.totalCalls}</span>
                                </TooltipTrigger>
                                <TooltipContent>Total calls</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  <span>{Math.round(stats.averageDuration)}ms</span>
                                </TooltipTrigger>
                                <TooltipContent>Avg response time</TooltipContent>
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
                                <TooltipContent>Success rate</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </>
                        )}
                      </div>

                      <div className="w-20 flex-shrink-0">
                        <div className="flex items-center gap-2">
                          <Progress
                            value={status.score}
                            className="h-2"
                            indicatorClassName={getProgressColor(status.score)}
                          />
                          <span className={cn('text-xs font-medium', getScoreColor(status.score))}>
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
