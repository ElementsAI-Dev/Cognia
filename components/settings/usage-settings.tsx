'use client';

/**
 * UsageSettings - Display and manage token usage and costs
 */

import { useState } from 'react';
import {
  Coins,
  TrendingUp,
  Clock,
  Trash2,
  Download,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Tokens</CardDescription>
            <CardTitle className="text-2xl">
              {formatTokens(totalUsage.tokens)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="mr-1 h-3 w-3" />
              {totalUsage.requests} requests
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Estimated Cost</CardDescription>
            <CardTitle className="text-2xl">
              {formatCost(totalUsage.cost)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-xs text-muted-foreground">
              <Coins className="mr-1 h-3 w-3" />
              Based on API pricing
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Since</CardDescription>
            <CardTitle className="text-2xl">
              {records.length > 0
                ? new Date(records[0].createdAt).toLocaleDateString()
                : 'N/A'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-xs text-muted-foreground">
              <Clock className="mr-1 h-3 w-3" />
              {records.length} total records
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Usage by Provider */}
      {providerUsage.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Usage by Provider</CardTitle>
            <CardDescription>
              Token usage breakdown by AI provider
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {providerUsage.map((provider) => (
              <div key={provider.provider} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium capitalize">
                      {provider.provider}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {provider.requests} requests
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatTokens(provider.tokens)} • {formatCost(provider.cost)}
                  </div>
                </div>
                <Progress
                  value={(provider.tokens / maxProviderTokens) * 100}
                  className="h-2"
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Daily Usage Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daily Usage (Last 7 Days)</CardTitle>
          <CardDescription>Token usage over the past week</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2 h-32">
            {dailyUsage.map((day) => (
              <div
                key={day.date}
                className="flex-1 flex flex-col items-center gap-1"
              >
                <div
                  className="w-full bg-primary/20 rounded-t transition-all"
                  style={{
                    height: `${Math.max((day.tokens / maxDailyTokens) * 100, 2)}%`,
                  }}
                >
                  <div
                    className="w-full bg-primary rounded-t"
                    style={{
                      height: `${day.tokens > 0 ? 100 : 0}%`,
                    }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">
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
            <CardHeader className="cursor-pointer hover:bg-accent/50 rounded-t-lg transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Recent Activity</CardTitle>
                  <CardDescription>
                    Last 10 API requests
                  </CardDescription>
                </div>
                <ChevronDown
                  className={`h-5 w-5 text-muted-foreground transition-transform ${
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
                    No usage records yet
                  </p>
                )}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="outline" onClick={handleExportUsage}>
          <Download className="mr-2 h-4 w-4" />
          Export Usage
        </Button>
        <Button
          variant="destructive"
          onClick={() => setShowClearDialog(true)}
          disabled={records.length === 0}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Clear Records
        </Button>
      </div>

      {/* Clear Confirmation */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Usage Records</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to clear all usage records? This action
              cannot be undone and will reset your usage statistics.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearRecords}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Clear All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default UsageSettings;
