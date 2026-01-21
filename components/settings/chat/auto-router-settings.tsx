'use client';

/**
 * Auto Router Settings Component
 * Configures intelligent model routing behavior
 */

import React from 'react';
import {
  Zap,
  Scale,
  Brain,
  Sparkles,
  BarChart3,
  DollarSign,
  Settings2,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useSettingsStore } from '@/stores';
import { getRoutingStats, resetRoutingStats, clearRoutingCache, getCacheStats } from '@/lib/ai/generation/routing-cache';
import type { RoutingMode, RoutingStrategy, ModelTier } from '@/types/provider/auto-router';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

const ROUTING_MODE_KEYS: Array<{ value: RoutingMode; labelKey: string; descKey: string }> = [
  { value: 'rule-based', labelKey: 'modeRuleBased', descKey: 'modeRuleBasedDesc' },
  { value: 'llm-based', labelKey: 'modeLlmBased', descKey: 'modeLlmBasedDesc' },
  { value: 'hybrid', labelKey: 'modeHybrid', descKey: 'modeHybridDesc' },
];

const ROUTING_STRATEGY_KEYS: Array<{ value: RoutingStrategy; labelKey: string; descKey: string; icon: React.ReactNode }> = [
  { value: 'quality', labelKey: 'strategyQuality', descKey: 'strategyQualityDesc', icon: <Brain className="h-4 w-4" /> },
  { value: 'cost', labelKey: 'strategyCost', descKey: 'strategyCostDesc', icon: <DollarSign className="h-4 w-4" /> },
  { value: 'speed', labelKey: 'strategySpeed', descKey: 'strategySpeedDesc', icon: <Zap className="h-4 w-4" /> },
  { value: 'balanced', labelKey: 'strategyBalanced', descKey: 'strategyBalancedDesc', icon: <Scale className="h-4 w-4" /> },
  { value: 'adaptive', labelKey: 'strategyAdaptive', descKey: 'strategyAdaptiveDesc', icon: <Sparkles className="h-4 w-4" /> },
];

const FALLBACK_TIER_KEYS: Array<{ value: ModelTier; labelKey: string; icon: React.ReactNode }> = [
  { value: 'fast', labelKey: 'tierFast', icon: <Zap className="h-4 w-4 text-green-500" /> },
  { value: 'balanced', labelKey: 'tierBalanced', icon: <Scale className="h-4 w-4 text-blue-500" /> },
  { value: 'powerful', labelKey: 'tierPowerful', icon: <Brain className="h-4 w-4 text-purple-500" /> },
  { value: 'reasoning', labelKey: 'tierReasoning', icon: <Sparkles className="h-4 w-4 text-amber-500" /> },
];

export function AutoRouterSettings() {
  const t = useTranslations('autoRouterSettings');
  const autoRouterSettings = useSettingsStore((state) => state.autoRouterSettings);
  const setAutoRouterSettings = useSettingsStore((state) => state.setAutoRouterSettings);
  const setAutoRouterEnabled = useSettingsStore((state) => state.setAutoRouterEnabled);
  const setAutoRouterMode = useSettingsStore((state) => state.setAutoRouterMode);
  const setAutoRouterStrategy = useSettingsStore((state) => state.setAutoRouterStrategy);
  const setAutoRouterShowIndicator = useSettingsStore((state) => state.setAutoRouterShowIndicator);
  const setAutoRouterFallbackTier = useSettingsStore((state) => state.setAutoRouterFallbackTier);
  const resetAutoRouterSettings = useSettingsStore((state) => state.resetAutoRouterSettings);

  const [stats, setStats] = React.useState(getRoutingStats());
  const [cacheStats, setCacheStats] = React.useState(getCacheStats());

  const refreshStats = () => {
    setStats(getRoutingStats());
    setCacheStats(getCacheStats());
  };

  const handleResetStats = () => {
    resetRoutingStats();
    clearRoutingCache();
    refreshStats();
  };

  return (
    <div className="space-y-6">
      {/* Enable/Disable */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="text-base font-medium">{t('autoModelRouting')}</Label>
          <p className="text-sm text-muted-foreground">
            {t('autoModelRoutingDesc')}
          </p>
        </div>
        <Switch
          checked={autoRouterSettings.enabled}
          onCheckedChange={setAutoRouterEnabled}
        />
      </div>

      {autoRouterSettings.enabled && (
        <>
          {/* Routing Mode */}
          <div className="space-y-2">
            <Label>{t('routingMode')}</Label>
            <Select
              value={autoRouterSettings.routingMode}
              onValueChange={(value) => setAutoRouterMode(value as RoutingMode)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROUTING_MODE_KEYS.map((mode) => (
                  <SelectItem key={mode.value} value={mode.value}>
                    <div className="flex flex-col">
                      <span>{t(mode.labelKey)}</span>
                      <span className="text-xs text-muted-foreground">{t(mode.descKey)}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Routing Strategy */}
          <div className="space-y-2">
            <Label>{t('routingStrategy')}</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {ROUTING_STRATEGY_KEYS.map((strategy) => (
                <TooltipProvider key={strategy.value}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        className={cn(
                          'flex items-center gap-2 p-3 rounded-lg border transition-colors',
                          autoRouterSettings.strategy === strategy.value
                            ? 'border-primary bg-primary/10'
                            : 'border-muted hover:border-muted-foreground/50'
                        )}
                        onClick={() => setAutoRouterStrategy(strategy.value)}
                      >
                        {strategy.icon}
                        <span className="text-sm font-medium">{t(strategy.labelKey)}</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{t(strategy.descKey)}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          </div>

          {/* Fallback Tier */}
          <div className="space-y-2">
            <Label>{t('fallbackTier')}</Label>
            <p className="text-xs text-muted-foreground">
              {t('fallbackTierDesc')}
            </p>
            <Select
              value={autoRouterSettings.fallbackTier}
              onValueChange={(value) => setAutoRouterFallbackTier(value as ModelTier)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FALLBACK_TIER_KEYS.map((tier) => (
                  <SelectItem key={tier.value} value={tier.value}>
                    <div className="flex items-center gap-2">
                      {tier.icon}
                      <span>{t(tier.labelKey)}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Show Routing Indicator */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t('showRoutingIndicator')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('showRoutingIndicatorDesc')}
              </p>
            </div>
            <Switch
              checked={autoRouterSettings.showRoutingIndicator}
              onCheckedChange={setAutoRouterShowIndicator}
            />
          </div>

          {/* Allow Override */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t('allowManualOverride')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('allowManualOverrideDesc')}
              </p>
            </div>
            <Switch
              checked={autoRouterSettings.allowOverride}
              onCheckedChange={(checked) => 
                setAutoRouterSettings({ allowOverride: checked })
              }
            />
          </div>

          {/* Cache Settings */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t('enableRoutingCache')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('enableRoutingCacheDesc')}
                </p>
              </div>
              <Switch
                checked={autoRouterSettings.enableCache}
                onCheckedChange={(checked) => 
                  setAutoRouterSettings({ enableCache: checked })
                }
              />
            </div>
            
            {autoRouterSettings.enableCache && (
              <div className="space-y-2 pl-4 border-l-2 border-muted">
                <Label className="text-sm">{t('cacheTtl')}</Label>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[autoRouterSettings.cacheTTL]}
                    onValueChange={([value]) => 
                      setAutoRouterSettings({ cacheTTL: value })
                    }
                    min={60}
                    max={3600}
                    step={60}
                    className="flex-1"
                  />
                  <span className="text-sm text-muted-foreground w-16">
                    {autoRouterSettings.cacheTTL}s
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Statistics Card */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  {t('routingStatistics')}
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={refreshStats}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleResetStats}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <CardDescription>
                {t('performanceMetrics')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{t('totalRequests')}</p>
                  <p className="text-2xl font-bold">{stats.totalRequests}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{t('avgLatency')}</p>
                  <p className="text-2xl font-bold">{stats.avgLatency.toFixed(1)}ms</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{t('cacheHitRate')}</p>
                  <p className="text-2xl font-bold">{(stats.cacheHitRate * 100).toFixed(1)}%</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{t('cacheSize')}</p>
                  <p className="text-2xl font-bold">{cacheStats.size}</p>
                </div>
              </div>

              {/* Tier Distribution */}
              <div className="mt-4 space-y-2">
                <p className="text-xs text-muted-foreground">{t('tierDistribution')}</p>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline" className="gap-1">
                    <Zap className="h-3 w-3 text-green-500" />
                    {t('tierFast')}: {stats.byTier.fast}
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <Scale className="h-3 w-3 text-blue-500" />
                    {t('tierBalanced')}: {stats.byTier.balanced}
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <Brain className="h-3 w-3 text-purple-500" />
                    {t('tierPowerful')}: {stats.byTier.powerful}
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <Sparkles className="h-3 w-3 text-amber-500" />
                    {t('tierReasoning')}: {stats.byTier.reasoning}
                  </Badge>
                </div>
              </div>

              {/* Cost Savings */}
              {stats.estimatedCostSaved > 0 && (
                <div className="mt-4 p-3 bg-green-500/10 rounded-lg">
                  <p className="text-xs text-muted-foreground">{t('estimatedCostSaved')}</p>
                  <p className="text-lg font-bold text-green-600">
                    ${stats.estimatedCostSaved.toFixed(4)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reset Button */}
          <Button
            variant="outline"
            onClick={resetAutoRouterSettings}
            className="w-full"
          >
            <Settings2 className="h-4 w-4 mr-2" />
            {t('resetToDefaults')}
          </Button>
        </>
      )}
    </div>
  );
}

export default AutoRouterSettings;
