'use client';

/**
 * Sandbox Session Detail Client - View executions within a specific session
 * Shows session metadata and all executions associated with it
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useSessions } from '@/hooks/sandbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  ArrowLeft,
  Layers,
  RefreshCw,
  Clock,
  Calendar,
  Terminal,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Timer,
  Copy,
  Code,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LANGUAGE_INFO } from '@/types/system/sandbox';
import type { SandboxExecutionRecord, ExecutionSession } from '@/types/system/sandbox';

export default function SessionDetailClient() {
  const t = useTranslations('sandboxPage');
  const params = useParams();
  const sessionId = params.id as string;

  const { sessions, getSessionExecutions } = useSessions();

  const [session, setSession] = useState<ExecutionSession | null>(null);
  const [executions, setExecutions] = useState<SandboxExecutionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const found = sessions.find((s) => s.id === sessionId);
      setSession(found || null);
      const execs = await getSessionExecutions(sessionId);
      setExecutions(execs);
    } catch (err) {
      console.error('Failed to load session data:', err);
    } finally {
      setLoading(false);
    }
  }, [sessionId, sessions, getSessionExecutions]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatMs = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'timeout':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
  };

  return (
    <div className="flex h-svh flex-col bg-background">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b px-4 bg-background/95 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href="/sandbox/sessions">
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">{t('backToSessions')}</TooltipContent>
          </Tooltip>
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10">
              <Layers className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-none">
                {session?.name || t('sessionDetail')}
              </h1>
              {session?.description && (
                <p className="text-xs text-muted-foreground mt-0.5">{session.description}</p>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {session && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDate(session.created_at)}
              </span>
              {!session.is_active && (
                <Badge variant="secondary" className="text-[10px]">{t('ended')}</Badge>
              )}
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => loadData()}
            disabled={loading}
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
        </div>
      </header>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-4">
          {/* Session stats */}
          {!loading && session && executions.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold">{executions.length}</p>
                  <p className="text-xs text-muted-foreground">{t('totalExecutions')}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {executions.filter((e) => e.status === 'completed').length}
                  </p>
                  <p className="text-xs text-muted-foreground">{t('successful')}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-red-600">
                    {executions.filter((e) => e.status === 'failed').length}
                  </p>
                  <p className="text-xs text-muted-foreground">{t('failed')}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold">
                    {new Set(executions.map((e) => e.language)).size}
                  </p>
                  <p className="text-xs text-muted-foreground">{t('languages')}</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-20 w-full" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && executions.length === 0 && (
            <Card className="py-12">
              <CardContent>
                <Empty className="border-0">
                  <EmptyMedia variant="icon">
                    <Terminal className="h-8 w-8" />
                  </EmptyMedia>
                  <EmptyTitle>{t('noExecutions')}</EmptyTitle>
                  <EmptyDescription>{t('noExecutionsDesc')}</EmptyDescription>
                  <Link href="/sandbox">
                    <Button className="mt-4 gap-1.5">
                      <Code className="h-4 w-4" />
                      {t('goToEditor')}
                    </Button>
                  </Link>
                </Empty>
              </CardContent>
            </Card>
          )}

          {/* Execution list */}
          {executions.map((execution, index) => {
            const langInfo = LANGUAGE_INFO[execution.language];
            return (
              <Card key={execution.id} className="overflow-hidden">
                <CardContent className="p-0">
                  {/* Execution header */}
                  <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b bg-muted/30">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(execution.status)}
                      <span className="text-sm font-medium">
                        #{executions.length - index}
                      </span>
                      <Badge variant="outline" className="text-xs gap-1" style={{ borderColor: langInfo?.color }}>
                        {langInfo?.icon} {langInfo?.name || execution.language}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Timer className="h-3 w-3" />
                        {formatMs(execution.execution_time_ms)}
                      </span>
                      {execution.is_favorite && (
                        <Badge variant="secondary" className="text-[10px]">★</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-muted-foreground">
                        {formatDate(execution.created_at)}
                      </span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleCopyCode(execution.code)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{t('copyCode')}</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>

                  {/* Code */}
                  <div className="px-4 py-2 border-b">
                    <pre className="font-mono text-xs whitespace-pre-wrap break-all max-h-[200px] overflow-y-auto">
                      {execution.code}
                    </pre>
                  </div>

                  {/* Output */}
                  <div className="px-4 py-2 bg-muted/10">
                    {execution.stdout && (
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-muted-foreground font-medium">stdout:</span>
                        <pre className="font-mono text-xs whitespace-pre-wrap break-all max-h-[150px] overflow-y-auto">
                          {execution.stdout}
                        </pre>
                      </div>
                    )}
                    {execution.stderr && (
                      <div className="space-y-0.5 mt-1">
                        <span className="text-[10px] text-red-500 font-medium">stderr:</span>
                        <pre className="font-mono text-xs whitespace-pre-wrap break-all text-red-400 max-h-[100px] overflow-y-auto">
                          {execution.stderr}
                        </pre>
                      </div>
                    )}
                    {execution.error && (
                      <div className="space-y-0.5 mt-1">
                        <span className="text-[10px] text-red-500 font-medium">{t('error')}:</span>
                        <pre className="font-mono text-xs whitespace-pre-wrap break-all text-red-400">
                          {execution.error}
                        </pre>
                      </div>
                    )}
                    {!execution.stdout && !execution.stderr && !execution.error && (
                      <p className="text-xs text-muted-foreground italic">{t('noOutput')}</p>
                    )}
                    {execution.exit_code != null && (
                      <span className="text-[10px] text-muted-foreground mt-1 block">
                        exit code: {execution.exit_code}
                      </span>
                    )}
                  </div>

                  {/* Tags */}
                  {execution.tags.length > 0 && (
                    <div className="px-4 py-1.5 border-t flex items-center gap-1 flex-wrap">
                      {execution.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
