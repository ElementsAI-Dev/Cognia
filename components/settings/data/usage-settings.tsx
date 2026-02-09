'use client';

/**
 * UsageSettings - Display and manage token usage and costs
 */

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Coins, TrendingUp, Clock, Trash2, Download, ChevronDown, Search, AlertCircle, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/layout/feedback/empty-state';
import { useUsageStore } from '@/stores';
import { formatTokens, type UsageRecord } from '@/types/system/usage';
import { useCurrencyFormat } from '@/hooks/ui/use-currency-format';
import { UsageAnalyticsCard } from '@/components/chat/utils/usage-analytics-card';
import { QuotaSettings } from './quota-settings';
import {
  downloadRecordsAsCSV,
  downloadRecordsAsJSON,
  downloadTimeSeriesAsCSV,
  exportSummaryToJSON,
  downloadFile,
} from '@/lib/ai/usage-export';
import { generateUsageTimeSeries } from '@/lib/ai/usage-analytics';
import { useUsageStore as useUsageStoreSelectors } from '@/stores/system/usage-store';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function UsageSettings() {
  const t = useTranslations('usageSettings');
  const tCommon = useTranslations('common');
  const { formatCost } = useCurrencyFormat();

  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');

  const records = useUsageStore((state) => state.records);
  const clearUsageRecords = useUsageStore((state) => state.clearUsageRecords);

  // Derived state with useMemo to prevent unnecessary re-renders
  const totalUsage = useMemo(() => {
    let tokens = 0;
    let cost = 0;
    for (const record of records) {
      tokens += record.tokens.total;
      cost += record.cost;
    }
    return {
      tokens,
      cost,
      requests: records.length,
    };
  }, [records]);

  const providerUsage = useMemo(() => {
    const providerMap = new Map<
      string,
      { provider: string; tokens: number; cost: number; requests: number }
    >();
    for (const record of records) {
      const existing = providerMap.get(record.provider);
      if (existing) {
        existing.tokens += record.tokens.total;
        existing.cost += record.cost;
        existing.requests += 1;
      } else {
        providerMap.set(record.provider, {
          provider: record.provider,
          tokens: record.tokens.total,
          cost: record.cost,
          requests: 1,
        });
      }
    }
    return Array.from(providerMap.values()).sort((a, b) => b.tokens - a.tokens);
  }, [records]);

  const getPerformanceMetrics = useUsageStoreSelectors((state) => state.getPerformanceMetrics);

  const dailyTimeSeries = useMemo(
    () => generateUsageTimeSeries(records, 'week', 'day'),
    [records]
  );

  const dailyUsage = useMemo(() => {
    // Fill in missing days for the chart
    const days = 7;
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - days);
    const dailyMap = new Map<string, { date: string; tokens: number; cost: number; requests: number }>();
    for (let i = 0; i <= days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      dailyMap.set(dateStr, { date: dateStr, tokens: 0, cost: 0, requests: 0 });
    }
    for (const point of dailyTimeSeries) {
      const dateStr = point.date.slice(0, 10);
      const existing = dailyMap.get(dateStr);
      if (existing) {
        existing.tokens = point.tokens;
        existing.cost = point.cost;
        existing.requests = point.requests;
      }
    }
    return Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [dailyTimeSeries]);

  const perfMetrics = useMemo(() => getPerformanceMetrics(), [getPerformanceMetrics]);

  const filteredRecords = useMemo(() => {
    if (!searchQuery.trim()) return [...records].reverse();
    const query = searchQuery.toLowerCase();
    return records
      .filter(
        (r) => r.provider.toLowerCase().includes(query) || r.model.toLowerCase().includes(query)
      )
      .reverse();
  }, [records, searchQuery]);

  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredRecords.length / pageSize);

  const handleClearRecords = () => {
    clearUsageRecords();
    setShowClearDialog(false);
  };

  // Calculate max for progress bars
  const maxProviderTokens = Math.max(...providerUsage.map((p) => p.tokens), 1);
  const maxDailyTokens = Math.max(...dailyUsage.map((d) => d.tokens), 1);

  return (
    <div className="space-y-4">
      {/* Advanced Analytics Card with trends and recommendations */}
      <UsageAnalyticsCard 
        period="week" 
        showRecommendations={true} 
        showBreakdown={true}
        className="mb-2"
      />

      {/* Quota Settings */}
      <QuotaSettings className="mb-2" />

      {/* Top Row: Summary Cards + Provider Usage side by side */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Summary Cards - Compact */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t('overview')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 grid-cols-3">
              <div className="rounded-lg border p-2 text-center">
                <div className="text-[10px] text-muted-foreground uppercase">{t('tokens')}</div>
                <div className="text-base font-bold">{formatTokens(totalUsage.tokens)}</div>
                <div className="flex items-center justify-center text-[10px] text-muted-foreground">
                  <TrendingUp className="mr-1 h-2.5 w-2.5" />
                  {totalUsage.requests} {t('requests')}
                </div>
              </div>
              <div className="rounded-lg border p-2 text-center">
                <div className="text-[10px] text-muted-foreground uppercase">{t('cost')}</div>
                <div className="text-base font-bold">{formatCost(totalUsage.cost)}</div>
                <div className="flex items-center justify-center text-[10px] text-muted-foreground">
                  <Coins className="mr-1 h-2.5 w-2.5" />
                  {t('estimated')}
                </div>
              </div>
              <div className="rounded-lg border p-2 text-center">
                <div className="text-[10px] text-muted-foreground uppercase">{t('since')}</div>
                <div className="text-base font-bold">
                  {records.length > 0
                    ? new Date(records[0].createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })
                    : 'N/A'}
                </div>
                <div className="flex items-center justify-center text-[10px] text-muted-foreground">
                  <Clock className="mr-1 h-2.5 w-2.5" />
                  {records.length} {t('records')}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Usage by Provider */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t('byProvider')}</CardTitle>
          </CardHeader>
          <CardContent>
            {providerUsage.length > 0 ? (
              <div className="space-y-2">
                {providerUsage.map((provider) => (
                  <div key={provider.provider} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium capitalize">{provider.provider}</span>
                        <Badge variant="secondary" className="text-[10px] px-1 py-0">
                          {provider.requests}
                        </Badge>
                      </div>
                      <span className="text-muted-foreground">
                        {formatTokens(provider.tokens)} • {formatCost(provider.cost)}
                      </span>
                    </div>
                    <Progress
                      value={(provider.tokens / maxProviderTokens) * 100}
                      className="h-1.5"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Coins}
                title={t('noProviderData')}
                compact
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Daily Usage Chart - Full width for better visibility */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t('last7Days')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2 h-24">
            {dailyUsage.map((day) => (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-primary/20 rounded-t transition-all relative"
                  style={{
                    height: `${Math.max((day.tokens / maxDailyTokens) * 100, 4)}%`,
                  }}
                >
                  <div
                    className="w-full bg-primary rounded-t absolute bottom-0"
                    style={{
                      height: `${day.tokens > 0 ? 100 : 0}%`,
                    }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(day.date).toLocaleDateString(undefined, {
                    weekday: 'short',
                  })}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Records */}
      <Collapsible open={showDetails} onOpenChange={setShowDetails}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-accent/50 rounded-t-lg transition-colors py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm">{t('recentActivity')}</CardTitle>
                  <Badge variant="secondary" className="text-[10px]">
                    {filteredRecords.length}
                  </Badge>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform ${
                    showDetails ? 'rotate-180' : ''
                  }`}
                />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 space-y-4">
              {/* Search within records */}
              <div className="relative pt-2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder={t('searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-8 pl-8 text-xs bg-muted/30"
                />
              </div>

              <div className="divide-y">
                {paginatedRecords.map((record: UsageRecord) => (
                  <div
                    key={record.id}
                    className={`flex items-center justify-between py-2 text-sm ${
                      record.status === 'error' || record.status === 'timeout'
                        ? 'bg-destructive/5 -mx-2 px-2 rounded'
                        : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {(record.status === 'error' || record.status === 'timeout') && (
                        <AlertCircle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
                      )}
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium capitalize">{record.provider}</span>
                          <span className="text-muted-foreground"> / {record.model}</span>
                          {record.status && record.status !== 'success' && (
                            <Badge variant="destructive" className="text-[10px] px-1 py-0">
                              {record.status}
                            </Badge>
                          )}
                        </div>
                        {record.errorMessage && (
                          <div className="text-[10px] text-destructive truncate max-w-[200px]">
                            {record.errorMessage}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span>{formatTokens(record.tokens.total)} tokens</span>
                        {record.latency !== undefined && (
                          <span className="flex items-center gap-0.5 text-muted-foreground">
                            <Timer className="h-3 w-3" />
                            {record.latency < 1000
                              ? `${record.latency}ms`
                              : `${(record.latency / 1000).toFixed(1)}s`}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(record.createdAt).toLocaleString()}
                        {record.timeToFirstToken !== undefined && (
                          <span className="ml-1">(TTFT: {record.timeToFirstToken}ms)</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {filteredRecords.length === 0 && (
                  <EmptyState
                    icon={Clock}
                    title={searchQuery ? tCommon('noResults') : t('noRecords')}
                    compact
                  />
                )}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2 border-t text-xs">
                  <span className="text-muted-foreground">
                    {currentPage} / {totalPages}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronDown className="h-4 w-4 rotate-90" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronDown className="h-4 w-4 -rotate-90" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Actions */}
      <div className="flex gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" disabled={records.length === 0}>
              <Download className="mr-1.5 h-3.5 w-3.5" />
              {t('export')}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => downloadRecordsAsJSON(records)}>
              {t('exportJson') || 'Export as JSON'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => downloadRecordsAsCSV(records)}>
              {t('exportCsv') || 'Export as CSV'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => downloadTimeSeriesAsCSV(dailyTimeSeries)}>
              {t('exportTimeSeries') || 'Export Time Series (CSV)'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              const summary = exportSummaryToJSON({
                totalRequests: totalUsage.requests,
                totalTokens: totalUsage.tokens,
                totalCost: totalUsage.cost,
                averageLatency: perfMetrics.avgLatency,
                errorRate: perfMetrics.errorRate,
                timeRange: records.length > 0
                  ? `${new Date(records[0].createdAt).toISOString()} - ${new Date(records[records.length - 1].createdAt).toISOString()}`
                  : 'N/A',
                exportedAt: new Date().toISOString(),
              });
              downloadFile(summary, `usage-summary-${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
            }}>
              {t('exportSummary') || 'Export Summary (JSON)'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          size="sm"
          variant="destructive"
          onClick={() => setShowClearDialog(true)}
          disabled={records.length === 0}
        >
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          {t('clear')}
        </Button>
      </div>

      {/* Clear Confirmation */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('clearTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('clearDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearRecords}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('clearAll')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default UsageSettings;
