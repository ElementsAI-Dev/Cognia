'use client';

/**
 * UsageSettings - Display and manage token usage and costs
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Coins,
  TrendingUp,
  Clock,
  Trash2,
  Download,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { useUsageStore } from '@/stores';
import { formatTokens, formatCost } from '@/types/usage';

export function UsageSettings() {
  const t = useTranslations('usageSettings');
  const tCommon = useTranslations('common');

  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const totalUsage = useUsageStore((state) => state.getTotalUsage());
  const providerUsage = useUsageStore((state) => state.getUsageByProvider());
  const dailyUsage = useUsageStore((state) => state.getDailyUsage(7));
  const clearUsageRecords = useUsageStore((state) => state.clearUsageRecords);
  const records = useUsageStore((state) => state.records);

  const handleClearRecords = () => {
    clearUsageRecords();
    setShowClearDialog(false);
  };

  const handleExportUsage = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      totalUsage,
      providerUsage,
      dailyUsage,
      records: records.slice(-100), // Last 100 records
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cognia-usage-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Calculate max for progress bars
  const maxProviderTokens = Math.max(...providerUsage.map((p) => p.tokens), 1);
  const maxDailyTokens = Math.max(...dailyUsage.map((d) => d.tokens), 1);

  return (
    <div className="space-y-4">
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
                  {totalUsage.requests} req
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
                    ? new Date(records[0].createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                    : 'N/A'}
                </div>
                <div className="flex items-center justify-center text-[10px] text-muted-foreground">
                  <Clock className="mr-1 h-2.5 w-2.5" />
                  {records.length} rec
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
                    <Progress value={(provider.tokens / maxProviderTokens) * 100} className="h-1.5" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">{t('noProviderData')}</p>
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
              <div
                key={day.date}
                className="flex-1 flex flex-col items-center gap-1"
              >
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
                <CardTitle className="text-sm">{t('recentActivity')}</CardTitle>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform ${
                    showDetails ? 'rotate-180' : ''
                  }`}
                />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="divide-y">
                {records.slice(-10).reverse().map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between py-2 text-sm"
                  >
                    <div>
                      <span className="font-medium capitalize">
                        {record.provider}
                      </span>
                      <span className="text-muted-foreground"> / {record.model}</span>
                    </div>
                    <div className="text-right">
                      <div>{formatTokens(record.tokens.total)} tokens</div>
                      <div className="text-xs text-muted-foreground">
                        {record.createdAt.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
                {records.length === 0 && (
                  <p className="py-4 text-center text-muted-foreground">
                    {t('noRecords')}
                  </p>
                )}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Actions */}
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={handleExportUsage}>
          <Download className="mr-1.5 h-3.5 w-3.5" />
          {t('export')}
        </Button>
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
            <AlertDialogDescription>
              {t('clearDesc')}
            </AlertDialogDescription>
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
