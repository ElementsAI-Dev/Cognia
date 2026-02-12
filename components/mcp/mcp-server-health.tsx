'use client';

import { useTranslations } from 'next-intl';
import {
  HeartPulse,
  Activity,
  Wifi,
  WifiOff,
  RefreshCw,
  Loader2,
  Clock,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { cn } from '@/lib/utils';
import { useMcpServerHealth } from '@/hooks/mcp/use-mcp-server-health';

export interface MCPServerHealthProps {
  className?: string;
}

export function MCPServerHealth({ className }: MCPServerHealthProps) {
  const t = useTranslations('mcp');
  const {
    servers,
    serverHealthMap,
    connectedServers,
    pingingServers,
    handlePing,
    handlePingAll,
    connectServer,
    disconnectServer,
    getHealthStatus,
    getLatencyDisplay: formatLatency,
    getTimestampDisplay: formatTimestamp,
    getLatencyColor,
  } = useMcpServerHealth();

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'unhealthy':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      default:
        return <HelpCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (servers.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HeartPulse className="h-5 w-5" />
            {t('serverHealth')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Empty className="py-8">
            <EmptyMedia variant="icon">
              <Activity className="h-5 w-5" />
            </EmptyMedia>
            <EmptyTitle className="text-sm">{t('noHealthData')}</EmptyTitle>
            <EmptyDescription className="text-xs">{t('noHealthDataDesc')}</EmptyDescription>
          </Empty>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <HeartPulse className="h-5 w-5" />
            {t('serverHealth')}
          </CardTitle>
          <CardDescription>
            {connectedServers.length} / {servers.length} {t('connected')}
          </CardDescription>
        </div>
        {connectedServers.length > 0 && (
          <Button variant="outline" size="sm" onClick={handlePingAll}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            {t('pingNow')}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[400px]">
          <div className="space-y-2">
            {servers.map((server) => {
              const health = serverHealthMap.get(server.id);
              const status = getHealthStatus(server.id);
              const isConnected = server.status.type === 'connected';
              const isPinging = pingingServers.has(server.id);

              return (
                <div
                  key={server.id}
                  className={cn(
                    'rounded-md border p-3 transition-colors',
                    status === 'healthy' && 'border-green-500/20',
                    status === 'unhealthy' && 'border-destructive/20'
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {getHealthIcon(status)}
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{server.name}</div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {isConnected ? (
                            <span className="flex items-center gap-1 text-green-600">
                              <Wifi className="h-3 w-3" />
                              {t('connected')}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <WifiOff className="h-3 w-3" />
                              {t('disconnected')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {isConnected ? (
                        <>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() => handlePing(server.id)}
                                disabled={isPinging}
                              >
                                {isPinging ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <RefreshCw className="h-3.5 w-3.5" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t('pingNow')}</TooltipContent>
                          </Tooltip>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={() => disconnectServer(server.id)}
                          >
                            {t('disconnected')}
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => connectServer(server.id)}
                        >
                          {t('connected')}
                        </Button>
                      )}
                    </div>
                  </div>

                  {isConnected && health && (
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Activity className="h-3 w-3" />
                        <span className={getLatencyColor(health.pingLatencyMs)}>
                          {formatLatency(health.pingLatencyMs)}
                        </span>
                      </span>
                      {health.failedPings > 0 && (
                        <span className="flex items-center gap-1 text-destructive">
                          <AlertTriangle className="h-3 w-3" />
                          {health.failedPings} {t('failedPings')}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTimestamp(health.lastPingAt)}
                      </span>
                      <Badge
                        variant={status === 'healthy' ? 'default' : 'destructive'}
                        className="text-xs h-5"
                      >
                        {status === 'healthy' ? t('healthy') : t('unhealthy')}
                      </Badge>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
