'use client';

/**
 * DashboardHeader - Toolbar for the observability dashboard
 *
 * Contains auto-refresh toggle, manual refresh, export dropdown,
 * clear data dropdown, time range selector, and close button.
 */

import { useTranslations } from 'next-intl';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  RefreshCw,
  BarChart3,
  Clock,
  Download,
  Trash2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  downloadRecordsAsCSV,
  downloadRecordsAsJSON,
  downloadTimeSeriesAsCSV,
} from '@/lib/ai/usage-export';
import { cn } from '@/lib/utils';
import type { TimeRange } from '@/types/observability';
import type { UsageRecord } from '@/types/system/usage';
import type { TimeSeriesDataPoint } from '@/lib/ai/usage-analytics';

interface DashboardHeaderProps {
  timeRange: TimeRange;
  onTimeRangeChange: (value: TimeRange) => void;
  autoRefresh: boolean;
  onAutoRefreshChange: (value: boolean) => void;
  isRefreshing: boolean;
  onRefresh: () => void;
  onClearAllData: () => void;
  onClearOldData: (daysToKeep: number) => void;
  records: UsageRecord[];
  timeSeries: TimeSeriesDataPoint[];
  langfuseEnabled?: boolean;
  openTelemetryEnabled?: boolean;
  onClose?: () => void;
  recordCount?: number;
}

export function DashboardHeader({
  timeRange,
  onTimeRangeChange,
  autoRefresh,
  onAutoRefreshChange,
  isRefreshing,
  onRefresh,
  onClearAllData,
  onClearOldData,
  records,
  timeSeries,
  langfuseEnabled,
  openTelemetryEnabled,
  onClose,
  recordCount,
}: DashboardHeaderProps) {
  const t = useTranslations('observability.dashboard');
  const tTime = useTranslations('observability.timeRange');
  const tCommon = useTranslations('observability');

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <BarChart3 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">{t('title')}</h2>
          <div className="flex items-center gap-2 hidden sm:flex">
            <p className="text-xs text-muted-foreground">
              {t('subtitle') || 'Monitor AI usage and performance'}
            </p>
            {recordCount != null && recordCount > 0 && (
              <Badge variant="outline" className="text-[10px] h-4 gap-1 px-1.5">
                {recordCount.toLocaleString()} {t('records') || 'records'}
              </Badge>
            )}
            {langfuseEnabled && (
              <Badge variant="outline" className="text-[10px] h-4 gap-1 px-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                Langfuse
              </Badge>
            )}
            {openTelemetryEnabled && (
              <Badge variant="outline" className="text-[10px] h-4 gap-1 px-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                OTel
              </Badge>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        {/* Auto-refresh toggle */}
        <div className="flex items-center gap-2">
          <Switch
            id="auto-refresh"
            checked={autoRefresh}
            onCheckedChange={onAutoRefreshChange}
            className="scale-90"
          />
          <Label htmlFor="auto-refresh" className="text-xs text-muted-foreground cursor-pointer">
            <Clock className="h-3 w-3 inline mr-1" />
            {t('autoRefresh') || 'Auto'}
          </Label>
        </div>
        <Separator orientation="vertical" className="h-6 hidden sm:block" />
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="gap-1"
        >
          <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
          <span className="hidden sm:inline">{t('refresh') || 'Refresh'}</span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">{t('export') || 'Export'}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => downloadRecordsAsCSV(records)}>
              {t('exportCSV') || 'Export Records (CSV)'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => downloadRecordsAsJSON(records)}>
              {t('exportJSON') || 'Export Records (JSON)'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => downloadTimeSeriesAsCSV(timeSeries)}>
              {t('exportTimeSeries') || 'Export Time Series (CSV)'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1 text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">{t('clearData') || 'Clear Data'}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onClearOldData(30)}>
              {t('clearOlderThan30d') || 'Keep Last 30 Days'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onClearOldData(7)}>
              {t('clearOlderThan7d') || 'Keep Last 7 Days'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onClearAllData} className="text-destructive">
              {t('clearAll') || 'Clear All Data'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Select value={timeRange} onValueChange={(v) => onTimeRangeChange(v as TimeRange)}>
          <SelectTrigger className="w-28 sm:w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1h">{tTime('1h')}</SelectItem>
            <SelectItem value="24h">{tTime('24h')}</SelectItem>
            <SelectItem value="7d">{tTime('7d')}</SelectItem>
            <SelectItem value="30d">{tTime('30d')}</SelectItem>
          </SelectContent>
        </Select>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            {tCommon('close')}
          </Button>
        )}
      </div>
    </div>
  );
}
