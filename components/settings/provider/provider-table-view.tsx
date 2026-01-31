'use client';

import React, { useCallback, useMemo, useState } from 'react';
import {
  Check,
  AlertCircle,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Wrench,
  ImageIcon,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import type { ProviderConfig } from '@/types/provider';
import { getCategoryIcon } from '@/lib/ai/providers/provider-helpers';
import type { ApiTestResult } from '@/lib/ai/infrastructure/api-test';

type SortColumn = 'name' | 'models' | 'context' | 'price' | 'status';

interface ProviderTableViewProps {
  providers: Array<[string, ProviderConfig]>;
  providerSettings: Record<string, {
    enabled?: boolean;
    apiKey?: string;
    apiKeys?: string[];
    defaultModel?: string;
  }>;
  testResults: Record<string, ApiTestResult | null>;
  testingProviders: Record<string, boolean>;
  isBatchTesting: boolean;
  onTestConnection: (providerId: string) => void;
  onToggleProvider: (providerId: string, enabled: boolean) => void;
  onSetDefaultModel: (providerId: string, modelId: string) => void;
  onConfigureProvider: (providerId: string) => void;
  renderProviderCard: (providerId: string, provider: ProviderConfig) => React.ReactNode;
}

export const ProviderTableView = React.memo(function ProviderTableView({
  providers,
  providerSettings,
  testResults,
  testingProviders,
  isBatchTesting,
  onTestConnection,
  onToggleProvider,
  onSetDefaultModel,
  onConfigureProvider,
  renderProviderCard,
}: ProviderTableViewProps) {
  const t = useTranslations('providers');

  const [sortBy, setSortBy] = useState<SortColumn>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  const visibleProviderIds = useMemo(
    () => providers.map(([id]) => id),
    [providers]
  );

  const selectedCount = useMemo(() => {
    let count = 0;
    for (const id of visibleProviderIds) {
      if (selectedIds.has(id)) count++;
    }
    return count;
  }, [selectedIds, visibleProviderIds]);

  const isAllSelected = selectedCount > 0 && selectedCount === visibleProviderIds.length;
  const isSomeSelected = selectedCount > 0 && !isAllSelected;

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (visibleProviderIds.every((id) => next.has(id))) {
        for (const id of visibleProviderIds) next.delete(id);
      } else {
        for (const id of visibleProviderIds) next.add(id);
      }
      return next;
    });
  }, [visibleProviderIds]);

  const toggleSelect = useCallback((providerId: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(providerId);
      else next.delete(providerId);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const toggleRow = useCallback((providerId: string) => {
    setExpandedRows((prev) => ({ ...prev, [providerId]: !prev[providerId] }));
  }, []);

  const handleSort = useCallback((column: SortColumn) => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  }, [sortBy]);

  const sortedProviders = useMemo(() => {
    const sorted = [...providers];
    sorted.sort(([idA, a], [idB, b]) => {
      let comparison = 0;
      const settingsA = providerSettings[idA] || {};
      const settingsB = providerSettings[idB] || {};

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'models':
          comparison = a.models.length - b.models.length;
          break;
        case 'context': {
          const ctxA = a.models[0]?.contextLength || 0;
          const ctxB = b.models[0]?.contextLength || 0;
          comparison = ctxA - ctxB;
          break;
        }
        case 'price': {
          const priceA = a.models[0]?.pricing?.promptPer1M || 0;
          const priceB = b.models[0]?.pricing?.promptPer1M || 0;
          comparison = priceA - priceB;
          break;
        }
        case 'status': {
          const statusA =
            settingsA.enabled &&
            (settingsA.apiKey || (settingsA.apiKeys && settingsA.apiKeys.length > 0) || idA === 'ollama')
              ? 1
              : 0;
          const statusB =
            settingsB.enabled &&
            (settingsB.apiKey || (settingsB.apiKeys && settingsB.apiKeys.length > 0) || idB === 'ollama')
              ? 1
              : 0;
          comparison = statusA - statusB;
          break;
        }
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    return sorted;
  }, [providers, providerSettings, sortBy, sortOrder]);

  const handleBatchTestSelected = useCallback(async () => {
    const ids = visibleProviderIds.filter((id) => selectedIds.has(id));
    for (const id of ids) {
      onTestConnection(id);
    }
  }, [visibleProviderIds, selectedIds, onTestConnection]);

  const handleSetSelectedEnabled = useCallback((enabled: boolean) => {
    const ids = visibleProviderIds.filter((id) => selectedIds.has(id));
    for (const id of ids) {
      onToggleProvider(id, enabled);
    }
  }, [visibleProviderIds, selectedIds, onToggleProvider]);

  const renderSortIcon = (column: SortColumn) => {
    if (sortBy === column) {
      return sortOrder === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />;
    }
    return <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />;
  };

  return (
    <>
      {/* Table View - Hidden on mobile */}
      <Card className="overflow-hidden hidden sm:block">
        <div className="flex items-center justify-between gap-2 border-b px-3 py-2 bg-muted/20">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={isAllSelected ? true : isSomeSelected ? 'indeterminate' : false}
              onCheckedChange={toggleSelectAll}
              aria-label={t('selectAllProviders')}
            />
            <span className="text-sm text-muted-foreground">
              {t('selectedCount', { count: selectedCount })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBatchTestSelected}
              disabled={isBatchTesting || selectedCount === 0}
            >
              {t('testSelected')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSetSelectedEnabled(true)}
              disabled={selectedCount === 0}
            >
              {t('enableSelected')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSetSelectedEnabled(false)}
              disabled={selectedCount === 0}
            >
              {t('disableSelected')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelection}
              disabled={selectedCount === 0}
            >
              {t('clearSelection')}
            </Button>
          </div>
        </div>
        <div className="max-h-[600px] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10 shadow-[0_1px_0_0_hsl(var(--border))]">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-10" />
                <TableHead className="w-[180px]">
                  <Button variant="ghost" size="sm" className="h-7 -ml-2 px-2 font-medium" onClick={() => handleSort('name')}>
                    {t('provider')}
                    {renderSortIcon('name')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" className="h-7 -ml-2 px-2 font-medium" onClick={() => handleSort('models')}>
                    {t('models')}
                    {renderSortIcon('models')}
                  </Button>
                </TableHead>
                <TableHead className="hidden md:table-cell">
                  <Button variant="ghost" size="sm" className="h-7 -ml-2 px-2 font-medium" onClick={() => handleSort('context')}>
                    {t('context')}
                    {renderSortIcon('context')}
                  </Button>
                </TableHead>
                <TableHead className="hidden lg:table-cell">{t('features')}</TableHead>
                <TableHead className="hidden xl:table-cell">
                  <Button variant="ghost" size="sm" className="h-7 -ml-2 px-2 font-medium" onClick={() => handleSort('price')}>
                    {t('pricing')}
                    {renderSortIcon('price')}
                  </Button>
                </TableHead>
                <TableHead className="text-center">
                  <Button variant="ghost" size="sm" className="h-7 px-2 font-medium" onClick={() => handleSort('status')}>
                    {t('status')}
                    {renderSortIcon('status')}
                  </Button>
                </TableHead>
                <TableHead className="text-right w-[100px]">{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedProviders.map(([providerId, provider]) => {
                const settings = providerSettings[providerId] || {};
                const isEnabled = settings.enabled !== false;
                const apiKey = settings.apiKey || '';
                const hasAnyApiKey = apiKey.length > 0 || (settings.apiKeys && settings.apiKeys.length > 0);
                const defaultModel = provider.models.find((m) => m.id === (settings.defaultModel || provider.defaultModel));
                const testResult = testResults[providerId];
                const pricedModels = provider.models.filter((m) => m.pricing);
                const minPrice = pricedModels.length ? Math.min(...pricedModels.map((m) => m.pricing?.promptPer1M || 0)) : 0;
                const maxPrice = pricedModels.length ? Math.max(...pricedModels.map((m) => m.pricing?.completionPer1M || 0)) : 0;

                return (
                  <React.Fragment key={providerId}>
                    <TableRow className={cn(!isEnabled && 'opacity-50')}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(providerId)}
                          onCheckedChange={(v) => toggleSelect(providerId, !!v)}
                          aria-label={t('selectProviderRow')}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="text-muted-foreground">{getCategoryIcon(provider.category)}</div>
                          <div>
                            <div className="font-medium">{provider.name}</div>
                            <div className="text-xs text-muted-foreground truncate max-w-[140px]">
                              {provider.description || ''}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {provider.models.slice(0, 2).map((model) => (
                            <Badge
                              key={model.id}
                              variant={model.id === defaultModel?.id ? 'default' : 'outline'}
                              className="text-[10px] px-1.5 py-0"
                            >
                              {model.name}
                            </Badge>
                          ))}
                          {provider.models.length > 2 && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              +{provider.models.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-xs text-muted-foreground">
                          {(() => {
                            const ctx = defaultModel?.contextLength;
                            if (typeof ctx !== 'number' || ctx <= 0) return '-';
                            return ctx >= 1000000 ? `${(ctx / 1000000).toFixed(1)}M` : `${Math.round(ctx / 1000)}K`;
                          })()}
                        </span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex gap-1">
                          {defaultModel?.supportsVision && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span><ImageIcon className="h-3.5 w-3.5 text-muted-foreground" /></span>
                              </TooltipTrigger>
                              <TooltipContent>{t('capabilityVision')}</TooltipContent>
                            </Tooltip>
                          )}
                          {defaultModel?.supportsTools && (
                            <Tooltip>
                              <TooltipTrigger>
                                <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>{t('capabilityTools')}</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        {provider.models.some((m) => m.pricing) ? (
                          <span className="text-xs text-muted-foreground font-mono">
                            ${minPrice.toFixed(2)} - ${maxPrice.toFixed(2)}
                          </span>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">
                            {t('pricingVaries')}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {isEnabled && hasAnyApiKey ? (
                          testResult?.success ? (
                            <Badge variant="default" className="text-[10px] bg-green-600">
                              <Check className="h-3 w-3 mr-0.5" />
                              {t('connected')}
                            </Badge>
                          ) : testResult && !testResult.success ? (
                            <Badge variant="destructive" className="text-[10px]">
                              <AlertCircle className="h-3 w-3 mr-0.5" />
                              {t('failed')}
                            </Badge>
                          ) : (
                            <Badge variant="default" className="text-[10px]">
                              <Check className="h-3 w-3 mr-0.5" />
                              {t('ready')}
                            </Badge>
                          )
                        ) : (
                          <Badge variant="outline" className="text-[10px]">{t('notSet')}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => onTestConnection(providerId)}
                                disabled={(!hasAnyApiKey && providerId !== 'ollama') || testingProviders[providerId]}
                              >
                                {testingProviders[providerId] ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <RefreshCw className="h-3.5 w-3.5" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t('testConnection')}</TooltipContent>
                          </Tooltip>
                          <Switch
                            checked={isEnabled}
                            onCheckedChange={(checked) => onToggleProvider(providerId, checked)}
                            className="scale-75"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => toggleRow(providerId)}
                          >
                            {expandedRows[providerId] ? (
                              <ChevronUp className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {/* Expanded Row Details */}
                    {expandedRows[providerId] && (
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableCell colSpan={8} className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* All Models */}
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium">{t('allModels')} ({provider.models.length})</h4>
                              <div className="flex flex-wrap gap-1">
                                {provider.models.map((model) => (
                                  <Badge
                                    key={model.id}
                                    variant={model.id === defaultModel?.id ? 'default' : 'outline'}
                                    className="text-xs cursor-pointer hover:bg-primary/80"
                                    onClick={() => onSetDefaultModel(providerId, model.id)}
                                  >
                                    {model.name}
                                    {model.supportsVision && <ImageIcon className="ml-1 h-3 w-3" />}
                                    {model.supportsTools && <Wrench className="ml-1 h-3 w-3" />}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            {/* Pricing Details */}
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium">{t('pricingPerMillion')}</h4>
                              <div className="text-xs space-y-1">
                                {provider.models.filter((m) => m.pricing).slice(0, 4).map((model) => (
                                  <div key={model.id} className="flex justify-between text-muted-foreground">
                                    <span>{model.name}</span>
                                    <span className="font-mono">
                                      ${model.pricing?.promptPer1M.toFixed(2)} / ${model.pricing?.completionPer1M.toFixed(2)}
                                    </span>
                                  </div>
                                ))}
                                {!provider.models.some((m) => m.pricing) && (
                                  <span className="text-muted-foreground">{t('pricingVaries')}</span>
                                )}
                              </div>
                            </div>
                            {/* Quick Actions */}
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium">{t('quickActions')}</h4>
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => onConfigureProvider(providerId)}
                                >
                                  {t('configureApiKey')}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => onTestConnection(providerId)}
                                  disabled={(!hasAnyApiKey && providerId !== 'ollama') || testingProviders[providerId]}
                                >
                                  {testingProviders[providerId] ? t('testing') : t('testConnection')}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Mobile fallback: show cards when table view selected but on small screen */}
      <div className="sm:hidden grid grid-cols-1 gap-3">
        {sortedProviders.map(([providerId, provider]) => renderProviderCard(providerId, provider))}
      </div>
    </>
  );
});

export default ProviderTableView;
