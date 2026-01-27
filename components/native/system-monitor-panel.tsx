'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useAwareness } from '@/hooks/context';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EmptyState } from '@/components/layout/empty-state';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Cpu,
  MemoryStick,
  HardDrive,
  Battery,
  Wifi,
  WifiOff,
  RefreshCw,
  Zap,
  Clock,
  Activity,
} from 'lucide-react';
import { cn, formatBytes } from '@/lib/utils';

interface SystemMonitorPanelProps {
  className?: string;
}

export function SystemMonitorPanel({ className }: SystemMonitorPanelProps) {
  const t = useTranslations('systemMonitor');
  const {
    systemState,
    isLoading,
    fetchSystemState,
  } = useAwareness();

  useEffect(() => {
    const interval = setInterval(() => {
      fetchSystemState();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchSystemState]);

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getUsageColor = (percentage: number) => {
    if (percentage < 50) return 'text-green-500';
    if (percentage < 80) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className={cn('flex flex-col h-full min-h-0 overflow-hidden', className)}>
      <div className="flex items-center justify-between p-2 sm:p-3 border-b shrink-0">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          <span className="font-medium">{t('title')}</span>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              onClick={() => fetchSystemState()}
              disabled={isLoading}
            >
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('refresh')}</TooltipContent>
        </Tooltip>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-3 space-y-4">
          {!systemState && !isLoading && (
            <EmptyState
              icon={Activity}
              title={t('noData')}
              description={t('notAvailable')}
              compact
            />
          )}

          {systemState && (
            <>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Cpu className="h-4 w-4" />
                    {t('cpu')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{t('usage')}</span>
                    <span className={cn('text-sm font-medium', getUsageColor(systemState.cpu_usage))}>
                      {systemState.cpu_usage.toFixed(1)}%
                    </span>
                  </div>
                  <Progress
                    value={systemState.cpu_usage}
                    className="h-2"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <MemoryStick className="h-4 w-4" />
                    {t('memory')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>{t('used')}</span>
                    <span className={cn('font-medium', getUsageColor(systemState.memory_usage))}>
                      {formatBytes(systemState.memory_total - systemState.memory_available)} / {formatBytes(systemState.memory_total)}
                    </span>
                  </div>
                  <Progress
                    value={systemState.memory_usage}
                    className="h-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{t('available')}: {formatBytes(systemState.memory_available)}</span>
                    <span>{systemState.memory_usage.toFixed(1)}%</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <HardDrive className="h-4 w-4" />
                    {t('disk')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>{t('used')}</span>
                    <span className={cn('font-medium', getUsageColor(systemState.disk_usage))}>
                      {formatBytes(systemState.disk_total - systemState.disk_available)} / {formatBytes(systemState.disk_total)}
                    </span>
                  </div>
                  <Progress
                    value={systemState.disk_usage}
                    className="h-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{t('free')}: {formatBytes(systemState.disk_available)}</span>
                    <span>{systemState.disk_usage.toFixed(1)}%</span>
                  </div>
                </CardContent>
              </Card>

              {systemState.battery_level !== undefined && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Battery className="h-4 w-4" />
                      {t('battery')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{t('level')}</span>
                      <div className="flex items-center gap-2">
                        {systemState.is_charging && (
                          <Zap className="h-3 w-3 text-yellow-500" />
                        )}
                        <span className={cn('text-sm font-medium', getUsageColor(100 - systemState.battery_level))}>
                          {systemState.battery_level}%
                        </span>
                      </div>
                    </div>
                    <Progress
                      value={systemState.battery_level}
                      className="h-2"
                    />
                    {systemState.is_charging && (
                      <p className="text-xs text-muted-foreground">{t('charging')}</p>
                    )}
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{t('systemInfo')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span>{t('uptime')}</span>
                    </div>
                    <span className="font-medium">{formatUptime(systemState.uptime_seconds)}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Activity className="h-3 w-3 text-muted-foreground" />
                      <span>{t('processes')}</span>
                    </div>
                    <span className="font-medium">{systemState.process_count}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      {systemState.network_connected ? (
                        <Wifi className="h-3 w-3 text-green-500" />
                      ) : (
                        <WifiOff className="h-3 w-3 text-red-500" />
                      )}
                      <span>{t('network')}</span>
                    </div>
                    <Badge variant={systemState.network_connected ? 'default' : 'destructive'} className="text-xs">
                      {systemState.network_connected ? t('connected') : t('disconnected')}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Zap className="h-3 w-3 text-muted-foreground" />
                      <span>{t('powerMode')}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {systemState.power_mode}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
