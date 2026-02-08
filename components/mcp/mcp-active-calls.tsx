'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import {
  Zap,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  X,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { useMcpStore, type ActiveToolCall } from '@/stores';
import { cn } from '@/lib/utils';

export interface MCPActiveCallsProps {
  autoRefreshMs?: number;
  className?: string;
}

export function MCPActiveCalls({ autoRefreshMs = 1000, className }: MCPActiveCallsProps) {
  const t = useTranslations('mcp');
  const activeToolCalls = useMcpStore((state) => state.activeToolCalls);
  const cancelRequest = useMcpStore((state) => state.cancelRequest);
  const clearCompletedToolCalls = useMcpStore((state) => state.clearCompletedToolCalls);

  const [, setTick] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const calls = useMemo(() => {
    const arr = Array.from(activeToolCalls.values());
    arr.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
    return arr;
  }, [activeToolCalls]);

  const hasCompleted = useMemo(
    () => calls.some((c) => c.status === 'completed' || c.status === 'error' || c.status === 'timeout'),
    [calls]
  );

  const hasRunning = useMemo(
    () => calls.some((c) => c.status === 'running' || c.status === 'pending'),
    [calls]
  );

  useEffect(() => {
    if (hasRunning && autoRefreshMs > 0) {
      intervalRef.current = setInterval(() => setTick((t) => t + 1), autoRefreshMs);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [hasRunning, autoRefreshMs]);

  const handleCancel = useCallback(
    async (call: ActiveToolCall) => {
      try {
        await cancelRequest(call.serverId, call.id, 'Cancelled by user');
      } catch {
        // cancel may fail silently
      }
    },
    [cancelRequest]
  );

  const getElapsedTime = useCallback((call: ActiveToolCall): string => {
    const end = call.completedAt || new Date();
    const ms = end.getTime() - call.startedAt.getTime();
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  }, []);

  const getStatusIcon = (status: ActiveToolCall['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-3.5 w-3.5 text-muted-foreground" />;
      case 'running':
        return <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
      case 'error':
        return <XCircle className="h-3.5 w-3.5 text-destructive" />;
      case 'timeout':
        return <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />;
    }
  };

  const getStatusLabel = (status: ActiveToolCall['status']): string => {
    switch (status) {
      case 'pending':
        return t('pending');
      case 'running':
        return t('running');
      case 'completed':
        return t('completed');
      case 'error':
        return t('error');
      case 'timeout':
        return t('timeout');
    }
  };

  const getStatusColor = (status: ActiveToolCall['status']): string => {
    switch (status) {
      case 'pending':
        return 'text-muted-foreground';
      case 'running':
        return 'text-blue-500';
      case 'completed':
        return 'text-green-500';
      case 'error':
        return 'text-destructive';
      case 'timeout':
        return 'text-yellow-500';
    }
  };

  if (calls.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            {t('activeCalls')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Empty className="py-8">
            <EmptyMedia variant="icon">
              <Zap className="h-5 w-5" />
            </EmptyMedia>
            <EmptyTitle className="text-sm">{t('noActiveCalls')}</EmptyTitle>
            <EmptyDescription className="text-xs">{t('noActiveCallsDesc')}</EmptyDescription>
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
            <Zap className="h-5 w-5" />
            {t('activeCalls')}
          </CardTitle>
          <CardDescription>
            {calls.length} {t('calls')}
          </CardDescription>
        </div>
        {hasCompleted && (
          <Button variant="ghost" size="sm" onClick={clearCompletedToolCalls}>
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            {t('clearCompleted')}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[400px]">
          <div className="space-y-2">
            {calls.map((call) => (
              <div
                key={call.id}
                className={cn(
                  'rounded-md border p-3 space-y-2 transition-colors',
                  call.status === 'running' && 'border-blue-500/30 bg-blue-500/5',
                  call.status === 'error' && 'border-destructive/30 bg-destructive/5',
                  call.status === 'completed' && 'opacity-70'
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {getStatusIcon(call.status)}
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{call.toolName}</div>
                      <div className="text-xs text-muted-foreground">{call.serverId}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge
                      variant="outline"
                      className={cn('text-xs', getStatusColor(call.status))}
                    >
                      {getStatusLabel(call.status)}
                    </Badge>
                    <span className="text-xs text-muted-foreground ml-1">
                      {getElapsedTime(call)}
                    </span>
                    {(call.status === 'pending' || call.status === 'running') && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => handleCancel(call)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>

                {call.progress !== undefined && call.status === 'running' && (
                  <Progress value={call.progress * 100} className="h-1" />
                )}

                {call.error && (
                  <div className="text-xs text-destructive bg-destructive/10 rounded px-2 py-1 truncate">
                    {call.error}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
