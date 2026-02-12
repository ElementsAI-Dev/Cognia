'use client';

import { useTranslations } from 'next-intl';
import {
  BarChart3,
  Clock,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ArrowUpDown,
  Activity,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { cn } from '@/lib/utils';
import { formatExecutionTime, formatLastUsed } from '@/lib/mcp/format-utils';
import { useMcpToolUsage } from '@/hooks/mcp/use-mcp-tool-usage';

export interface MCPToolUsageStatsProps {
  maxItems?: number;
  className?: string;
}

export function MCPToolUsageStats({ maxItems = 20, className }: MCPToolUsageStatsProps) {
  const t = useTranslations('mcp');
  const {
    usageRecords,
    maxUsageCount,
    sortBy: _sortBy,
    setSortBy,
    resetHistory: resetToolUsageHistory,
  } = useMcpToolUsage({ maxItems });

  if (usageRecords.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            {t('toolUsage')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Empty className="py-8">
            <EmptyMedia variant="icon">
              <Activity className="h-5 w-5" />
            </EmptyMedia>
            <EmptyTitle className="text-sm">{t('noUsageHistory')}</EmptyTitle>
            <EmptyDescription className="text-xs">{t('noUsageHistoryDesc')}</EmptyDescription>
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
            <BarChart3 className="h-5 w-5" />
            {t('toolUsage')}
          </CardTitle>
          <CardDescription>
            {usageRecords.length} {t('tool')}
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <ArrowUpDown className="h-3.5 w-3.5 mr-1" />
                {t('sortBy')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSortBy('usage')}>
                {t('sortByUsage')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('success')}>
                {t('sortBySuccess')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('time')}>
                {t('sortByTime')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="sm" onClick={resetToolUsageHistory}>
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            {t('resetHistory')}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[400px]">
          <div className="space-y-3">
            {usageRecords.map((record) => {
              const { successRate, displayName, serverName } = record;

              return (
                <div
                  key={record.toolName}
                  className="rounded-md border p-3 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{displayName}</div>
                      {serverName && (
                        <div className="text-xs text-muted-foreground">{serverName}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="secondary" className="text-xs">
                        {record.usageCount} {t('times')}
                      </Badge>
                    </div>
                  </div>

                  <Progress
                    value={(record.usageCount / maxUsageCount) * 100}
                    className="h-1.5"
                  />

                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      {successRate >= 80 ? (
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                      ) : successRate >= 50 ? (
                        <CheckCircle2 className="h-3 w-3 text-yellow-500" />
                      ) : (
                        <XCircle className="h-3 w-3 text-destructive" />
                      )}
                      <span
                        className={cn(
                          successRate >= 80
                            ? 'text-green-600'
                            : successRate >= 50
                              ? 'text-yellow-600'
                              : 'text-destructive'
                        )}
                      >
                        {successRate}%
                      </span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatExecutionTime(record.avgExecutionTime)}
                    </span>
                    <span className="text-muted-foreground/70">
                      {t('lastUsed')}: {formatLastUsed(record.lastUsedAt)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
