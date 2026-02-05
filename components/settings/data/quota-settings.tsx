'use client';

/**
 * QuotaSettings - Manage usage quota limits per provider
 */

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Settings2, AlertTriangle, Check, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useUsageStore, type QuotaLimits } from '@/stores/system/usage-store';
import { cn } from '@/lib/utils';
import { formatCost, formatTokens } from '@/types/system/usage';

const PROVIDERS = [
  'openai',
  'anthropic',
  'google',
  'deepseek',
  'groq',
  'mistral',
  'openrouter',
  'ollama',
] as const;

interface QuotaSettingsProps {
  className?: string;
}

export function QuotaSettings({ className }: QuotaSettingsProps) {
  const t = useTranslations('usage');
  const tCommon = useTranslations('common');

  const quotaLimits = useUsageStore((state) => state.quotaLimits);
  const setQuotaLimits = useUsageStore((state) => state.setQuotaLimits);
  const clearQuotaLimits = useUsageStore((state) => state.clearQuotaLimits);
  const getQuotaStatus = useUsageStore((state) => state.getQuotaStatus);

  const [selectedProvider, setSelectedProvider] = useState<string>(PROVIDERS[0]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editLimits, setEditLimits] = useState<QuotaLimits>({});

  const quotaStatus = useMemo(
    () => getQuotaStatus(selectedProvider),
    [getQuotaStatus, selectedProvider]
  );

  const handleEditOpen = () => {
    setEditLimits(quotaLimits[selectedProvider] || {});
    setEditDialogOpen(true);
  };

  const handleSave = () => {
    setQuotaLimits(selectedProvider, editLimits);
    setEditDialogOpen(false);
  };

  const handleClear = () => {
    clearQuotaLimits(selectedProvider);
  };

  const getUsagePercent = (used: number, limit: number | undefined): number => {
    if (!limit || limit === 0) return 0;
    return Math.min((used / limit) * 100, 100);
  };

  const getStatusColor = (percent: number): string => {
    if (percent >= 100) return 'text-destructive';
    if (percent >= 80) return 'text-yellow-500';
    return 'text-green-500';
  };


  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              {t('quotaSettings') || 'Quota Settings'}
            </CardTitle>
            <CardDescription className="text-xs">
              {t('quotaDescription') || 'Set usage limits per provider'}
            </CardDescription>
          </div>
          <Select value={selectedProvider} onValueChange={setSelectedProvider}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROVIDERS.map((provider) => (
                <SelectItem key={provider} value={provider} className="text-xs capitalize">
                  {provider}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status Alert */}
        {quotaStatus.isBlocked && (
          <div className="flex items-center gap-2 p-2 rounded-md bg-destructive/10 text-destructive text-xs">
            <AlertTriangle className="h-4 w-4" />
            <span>{quotaStatus.blockReason}</span>
          </div>
        )}

        {/* Usage Progress Bars */}
        <div className="space-y-3">
          {/* Requests Today */}
          <QuotaProgressItem
            label={t('requestsToday') || 'Requests Today'}
            used={quotaStatus.usage.requestsToday}
            limit={quotaStatus.limits.maxRequestsPerDay}
            formatValue={(v) => v.toString()}
            getUsagePercent={getUsagePercent}
            getStatusColor={getStatusColor}
          />

          {/* Tokens Today */}
          <QuotaProgressItem
            label={t('tokensToday') || 'Tokens Today'}
            used={quotaStatus.usage.tokensToday}
            limit={quotaStatus.limits.maxTokensPerDay}
            formatValue={formatTokens}
            getUsagePercent={getUsagePercent}
            getStatusColor={getStatusColor}
          />

          {/* Cost Today */}
          <QuotaProgressItem
            label={t('costToday') || 'Cost Today'}
            used={quotaStatus.usage.costToday}
            limit={quotaStatus.limits.maxCostPerDay}
            formatValue={formatCost}
            getUsagePercent={getUsagePercent}
            getStatusColor={getStatusColor}
          />

          {/* Cost This Month */}
          <QuotaProgressItem
            label={t('costThisMonth') || 'Cost This Month'}
            used={quotaStatus.usage.costThisMonth}
            limit={quotaStatus.limits.maxCostPerMonth}
            formatValue={formatCost}
            getUsagePercent={getUsagePercent}
            getStatusColor={getStatusColor}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t">
          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="flex-1" onClick={handleEditOpen}>
                <Settings2 className="mr-1.5 h-3.5 w-3.5" />
                {t('editLimits') || 'Edit Limits'}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="capitalize">
                  {selectedProvider} {t('quotaLimits') || 'Quota Limits'}
                </DialogTitle>
                <DialogDescription>
                  {t('quotaLimitsDescription') || 'Set usage limits. Leave empty for no limit.'}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="maxRequestsPerDay" className="text-sm">
                    {t('maxRequestsPerDay') || 'Max Requests Per Day'}
                  </Label>
                  <Input
                    id="maxRequestsPerDay"
                    type="number"
                    min={0}
                    placeholder="No limit"
                    value={editLimits.maxRequestsPerDay ?? ''}
                    onChange={(e) =>
                      setEditLimits({
                        ...editLimits,
                        maxRequestsPerDay: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="maxTokensPerDay" className="text-sm">
                    {t('maxTokensPerDay') || 'Max Tokens Per Day'}
                  </Label>
                  <Input
                    id="maxTokensPerDay"
                    type="number"
                    min={0}
                    placeholder="No limit"
                    value={editLimits.maxTokensPerDay ?? ''}
                    onChange={(e) =>
                      setEditLimits({
                        ...editLimits,
                        maxTokensPerDay: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="maxCostPerDay" className="text-sm">
                    {t('maxCostPerDay') || 'Max Cost Per Day ($)'}
                  </Label>
                  <Input
                    id="maxCostPerDay"
                    type="number"
                    min={0}
                    step={0.01}
                    placeholder="No limit"
                    value={editLimits.maxCostPerDay ?? ''}
                    onChange={(e) =>
                      setEditLimits({
                        ...editLimits,
                        maxCostPerDay: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="maxCostPerMonth" className="text-sm">
                    {t('maxCostPerMonth') || 'Max Cost Per Month ($)'}
                  </Label>
                  <Input
                    id="maxCostPerMonth"
                    type="number"
                    min={0}
                    step={0.01}
                    placeholder="No limit"
                    value={editLimits.maxCostPerMonth ?? ''}
                    onChange={(e) =>
                      setEditLimits({
                        ...editLimits,
                        maxCostPerMonth: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                  {tCommon('cancel')}
                </Button>
                <Button onClick={handleSave}>
                  <Check className="mr-1.5 h-3.5 w-3.5" />
                  {tCommon('save')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button
            size="sm"
            variant="ghost"
            onClick={handleClear}
            disabled={!quotaLimits[selectedProvider]}
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            {t('resetLimits') || 'Reset'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface QuotaProgressItemProps {
  label: string;
  used: number;
  limit: number | undefined;
  formatValue: (value: number) => string;
  getUsagePercent: (used: number, limit: number | undefined) => number;
  getStatusColor: (percent: number) => string;
}

function QuotaProgressItem({
  label,
  used,
  limit,
  formatValue,
  getUsagePercent,
  getStatusColor,
}: QuotaProgressItemProps) {
  const percent = getUsagePercent(used, limit);
  const hasLimit = limit !== undefined && limit > 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <div className="flex items-center gap-1.5">
          <span className={cn('font-medium', hasLimit && getStatusColor(percent))}>
            {formatValue(used)}
          </span>
          {hasLimit && (
            <>
              <span className="text-muted-foreground">/</span>
              <span className="text-muted-foreground">{formatValue(limit)}</span>
            </>
          )}
          {!hasLimit && (
            <Badge variant="outline" className="text-[10px] px-1 py-0">
              No limit
            </Badge>
          )}
        </div>
      </div>
      {hasLimit && (
        <Progress value={percent} className="h-1.5" />
      )}
    </div>
  );
}

export default QuotaSettings;
