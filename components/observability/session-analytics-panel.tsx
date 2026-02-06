'use client';

/**
 * Session Analytics Panel
 *
 * Displays top sessions by usage with detailed breakdown.
 */

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { MessageSquare, Zap, DollarSign, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SessionData {
  sessionId: string;
  tokens: number;
  cost: number;
  requests: number;
  name?: string;
  lastActive?: Date;
}

interface SessionAnalyticsPanelProps {
  sessions: SessionData[];
  maxSessions?: number;
  title?: string;
  className?: string;
  showProgress?: boolean;
}

export function SessionAnalyticsPanel({
  sessions,
  maxSessions = 10,
  title,
  className,
  showProgress = true,
}: SessionAnalyticsPanelProps) {
  const t = useTranslations('observability.sessions');

  const displaySessions = useMemo(() => {
    return sessions.slice(0, maxSessions);
  }, [sessions, maxSessions]);

  const maxTokens = useMemo(() => {
    return Math.max(...sessions.map((s) => s.tokens), 1);
  }, [sessions]);

  const totalStats = useMemo(() => {
    return sessions.reduce(
      (acc, s) => ({
        tokens: acc.tokens + s.tokens,
        cost: acc.cost + s.cost,
        requests: acc.requests + s.requests,
      }),
      { tokens: 0, cost: 0, requests: 0 }
    );
  }, [sessions]);

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
    return tokens.toString();
  };

  const formatCost = (cost: number) => {
    if (cost < 0.01) return '< $0.01';
    if (cost < 1) return `$${cost.toFixed(3)}`;
    return `$${cost.toFixed(2)}`;
  };

  const formatSessionId = (id: string) => {
    if (id.length <= 12) return id;
    return `${id.slice(0, 6)}...${id.slice(-4)}`;
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  if (sessions.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            {title || t('title') || 'Top Sessions'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground text-sm">
            {t('noSessions') || 'No session data available'}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            {title || t('title') || 'Top Sessions'}
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {sessions.length} {t('sessions') || 'sessions'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs mb-1">
              <Zap className="h-3 w-3" />
              {t('totalTokens') || 'Tokens'}
            </div>
            <div className="font-semibold text-sm">{formatTokens(totalStats.tokens)}</div>
          </div>
          <div className="p-2 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs mb-1">
              <DollarSign className="h-3 w-3" />
              {t('totalCost') || 'Cost'}
            </div>
            <div className="font-semibold text-sm">{formatCost(totalStats.cost)}</div>
          </div>
          <div className="p-2 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs mb-1">
              <MessageSquare className="h-3 w-3" />
              {t('requests') || 'Requests'}
            </div>
            <div className="font-semibold text-sm">{totalStats.requests.toLocaleString()}</div>
          </div>
        </div>

        {/* Session List */}
        <ScrollArea className="max-h-64">
          <div className="space-y-3">
            {displaySessions.map((session, index) => (
              <div
                key={session.sessionId}
                className={cn(
                  'p-3 rounded-lg border bg-card transition-colors',
                  'hover:border-primary/30 hover:bg-muted/30'
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-xs font-mono shrink-0',
                        index === 0 && 'border-yellow-500 text-yellow-600',
                        index === 1 && 'border-gray-400 text-gray-500',
                        index === 2 && 'border-amber-600 text-amber-700'
                      )}
                    >
                      #{index + 1}
                    </Badge>
                    <span className="text-sm font-medium truncate" title={session.sessionId}>
                      {session.name || formatSessionId(session.sessionId)}
                    </span>
                  </div>
                  {session.lastActive && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                      <Clock className="h-3 w-3" />
                      {formatTimeAgo(session.lastActive)}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                  <span className="flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    {formatTokens(session.tokens)}
                  </span>
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    {formatCost(session.cost)}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    {session.requests}
                  </span>
                </div>

                {showProgress && (
                  <Progress value={(session.tokens / maxTokens) * 100} className="h-1" />
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        {sessions.length > maxSessions && (
          <div className="text-center text-xs text-muted-foreground pt-2">
            {t('showingTop', { count: maxSessions, total: sessions.length }) ||
              `Showing top ${maxSessions} of ${sessions.length} sessions`}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
