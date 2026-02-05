'use client';

/**
 * SessionStats - Display statistics for the current session
 */

import { useMemo, useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  MessageSquare,
  Clock,
  FileText,
  Zap,
  TrendingUp,
  Calendar,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { UIMessage } from '@/types';
import { estimateTokensFast } from '@/lib/ai/tokenizer';

interface SessionStatsProps {
  messages: UIMessage[];
  sessionCreatedAt?: Date;
  className?: string;
  compact?: boolean;
}

interface StatItem {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  tooltip?: string;
}

function formatDuration(sessionCreatedAt: Date | undefined): string {
  if (!sessionCreatedAt) return '';
  const diffMs = Date.now() - sessionCreatedAt.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) {
    return `${diffMins}m`;
  }
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return `${hours}h ${mins}m`;
}

export function SessionStats({
  messages,
  sessionCreatedAt,
  className,
  compact = false,
}: SessionStatsProps) {
  const t = useTranslations('chat');
  // Duration is calculated via state + effect to avoid impure Date.now() in render
  const [duration, setDuration] = useState(() => formatDuration(sessionCreatedAt));

  useEffect(() => {
    if (!sessionCreatedAt) return;
    const interval = setInterval(() => {
      setDuration(formatDuration(sessionCreatedAt));
    }, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [sessionCreatedAt]);

  const stats = useMemo(() => {
    const userMessages = messages.filter((m) => m.role === 'user');
    const assistantMessages = messages.filter((m) => m.role === 'assistant');
    
    // Calculate total characters (kept for potential future use)
    const _totalChars = messages.reduce((acc, m) => acc + m.content.length, 0);
    
    // Calculate average response length
    const avgResponseLength = assistantMessages.length > 0
      ? Math.round(assistantMessages.reduce((acc, m) => acc + m.content.length, 0) / assistantMessages.length)
      : 0;

    // Estimate tokens using centralized tokenizer utility
    const estimatedTokens = messages.reduce(
      (acc, m) => acc + estimateTokensFast(m.content),
      0
    );

    // Count code blocks
    const codeBlocks = messages.reduce((acc, m) => {
      const matches = m.content.match(/```/g);
      return acc + (matches ? Math.floor(matches.length / 2) : 0);
    }, 0);

    return {
      totalMessages: messages.length,
      userMessages: userMessages.length,
      assistantMessages: assistantMessages.length,
      estimatedTokens,
      avgResponseLength,
      codeBlocks,
    };
  }, [messages]);

  const statItems: StatItem[] = [
    {
      label: t('statsMessages'),
      value: stats.totalMessages,
      icon: <MessageSquare className="h-3.5 w-3.5" />,
      tooltip: t('statsMessagesDetail', { user: stats.userMessages, ai: stats.assistantMessages }),
    },
    {
      label: t('statsTokens'),
      value: stats.estimatedTokens > 1000 
        ? `${(stats.estimatedTokens / 1000).toFixed(1)}k` 
        : stats.estimatedTokens,
      icon: <Zap className="h-3.5 w-3.5" />,
      tooltip: t('statsTokensTooltip'),
    },
    {
      label: t('statsAvgLength'),
      value: stats.avgResponseLength > 1000 
        ? `${(stats.avgResponseLength / 1000).toFixed(1)}k` 
        : stats.avgResponseLength,
      icon: <TrendingUp className="h-3.5 w-3.5" />,
      tooltip: t('statsAvgLengthTooltip'),
    },
    {
      label: t('statsCode'),
      value: stats.codeBlocks,
      icon: <FileText className="h-3.5 w-3.5" />,
      tooltip: t('statsCodeTooltip'),
    },
  ];

  if (duration) {
    statItems.push({
      label: t('statsDuration'),
      value: duration,
      icon: <Clock className="h-3.5 w-3.5" />,
      tooltip: t('statsDurationTooltip'),
    });
  }

  if (compact) {
    return (
      <TooltipProvider>
        <div className={cn('flex items-center gap-2', className)}>
          {statItems.slice(0, 3).map((stat) => (
            <Tooltip key={stat.label}>
              <TooltipTrigger asChild>
                <Badge variant="secondary" className="gap-1 text-xs font-normal">
                  {stat.icon}
                  {stat.value}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>{stat.label}: {stat.tooltip || stat.value}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <div className={cn('flex flex-wrap items-center gap-3', className)}>
        {statItems.map((stat) => (
          <Tooltip key={stat.label}>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {stat.icon}
                <span className="font-medium">{stat.value}</span>
                <span className="hidden sm:inline">{stat.label}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{stat.tooltip || `${stat.label}: ${stat.value}`}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}

export function SessionStatsCard({
  messages,
  sessionCreatedAt,
  className,
}: SessionStatsProps) {
  const stats = useMemo(() => {
    const userMessages = messages.filter((m) => m.role === 'user');
    const assistantMessages = messages.filter((m) => m.role === 'assistant');
    // Use centralized tokenizer utility for better estimation
    const estimatedTokens = messages.reduce(
      (acc, m) => acc + estimateTokensFast(m.content),
      0
    );

    return {
      totalMessages: messages.length,
      userMessages: userMessages.length,
      assistantMessages: assistantMessages.length,
      estimatedTokens,
      createdAt: sessionCreatedAt,
    };
  }, [messages, sessionCreatedAt]);

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Session Statistics
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <MessageSquare className="h-3.5 w-3.5" />
            <span className="text-xs">Messages</span>
          </div>
          <p className="text-lg font-semibold">{stats.totalMessages}</p>
          <p className="text-xs text-muted-foreground">
            {stats.userMessages} you · {stats.assistantMessages} AI
          </p>
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Zap className="h-3.5 w-3.5" />
            <span className="text-xs">Est. Tokens</span>
          </div>
          <p className="text-lg font-semibold">
            {stats.estimatedTokens > 1000 
              ? `${(stats.estimatedTokens / 1000).toFixed(1)}k` 
              : stats.estimatedTokens}
          </p>
        </div>
        {stats.createdAt && (
          <div className="col-span-2 pt-2 border-t">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span>Started {stats.createdAt.toLocaleDateString()}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default SessionStats;
