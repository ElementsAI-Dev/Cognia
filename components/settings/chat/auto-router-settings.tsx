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

const routingModes: Array<{ value: RoutingMode; label: string; description: string }> = [
  { 
    value: 'rule-based', 
    label: 'Rule-based', 
    description: 'Fast pattern matching, no API calls' 
  },
  { 
    value: 'llm-based', 
    label: 'LLM-based', 
    description: 'More accurate, uses small model for classification' 
  },
  { 
    value: 'hybrid', 
    label: 'Hybrid', 
    description: 'Rule-based with LLM fallback for complex queries' 
  },
];

const routingStrategies: Array<{ value: RoutingStrategy; label: string; description: string; icon: React.ReactNode }> = [
  { 
    value: 'quality', 
    label: 'Quality First', 
    description: 'Always use the best available model',
    icon: <Brain className="h-4 w-4" />,
  },
  { 
    value: 'cost', 
    label: 'Cost Optimized', 
    description: 'Minimize cost while maintaining quality',
    icon: <DollarSign className="h-4 w-4" />,
  },
  { 
    value: 'speed', 
    label: 'Speed Priority', 
    description: 'Prioritize fast response times',
    icon: <Zap className="h-4 w-4" />,
  },
  { 
    value: 'balanced', 
    label: 'Balanced', 
    description: 'Balance between quality, cost, and speed',
    icon: <Scale className="h-4 w-4" />,
  },
  { 
    value: 'adaptive', 
    label: 'Adaptive', 
    description: 'Learn from usage patterns',
    icon: <Sparkles className="h-4 w-4" />,
  },
];

const fallbackTiers: Array<{ value: ModelTier; label: string; icon: React.ReactNode }> = [
  { value: 'fast', label: 'Fast', icon: <Zap className="h-4 w-4 text-green-500" /> },
  { value: 'balanced', label: 'Balanced', icon: <Scale className="h-4 w-4 text-blue-500" /> },
  { value: 'powerful', label: 'Powerful', icon: <Brain className="h-4 w-4 text-purple-500" /> },
  { value: 'reasoning', label: 'Reasoning', icon: <Sparkles className="h-4 w-4 text-amber-500" /> },
];

export function AutoRouterSettings() {
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
          <Label className="text-base font-medium">Auto Model Routing</Label>
          <p className="text-sm text-muted-foreground">
            Automatically select the best model based on task complexity
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
            <Label>Routing Mode</Label>
            <Select
              value={autoRouterSettings.routingMode}
              onValueChange={(value) => setAutoRouterMode(value as RoutingMode)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {routingModes.map((mode) => (
                  <SelectItem key={mode.value} value={mode.value}>
                    <div className="flex flex-col">
                      <span>{mode.label}</span>
                      <span className="text-xs text-muted-foreground">{mode.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Routing Strategy */}
          <div className="space-y-2">
            <Label>Routing Strategy</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {routingStrategies.map((strategy) => (
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
                        <span className="text-sm font-medium">{strategy.label}</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{strategy.description}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          </div>

          {/* Fallback Tier */}
          <div className="space-y-2">
            <Label>Default Fallback Tier</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Model tier to use when no suitable model is found
            </p>
            <Select
              value={autoRouterSettings.fallbackTier}
              onValueChange={(value) => setAutoRouterFallbackTier(value as ModelTier)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fallbackTiers.map((tier) => (
                  <SelectItem key={tier.value} value={tier.value}>
                    <div className="flex items-center gap-2">
                      {tier.icon}
                      <span>{tier.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Show Routing Indicator */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Show Routing Indicator</Label>
              <p className="text-sm text-muted-foreground">
                Display routing decisions in the chat interface
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
              <Label>Allow Manual Override</Label>
              <p className="text-sm text-muted-foreground">
                Let users override automatic model selection
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
                <Label>Enable Routing Cache</Label>
                <p className="text-sm text-muted-foreground">
                  Cache routing decisions for faster responses
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
                <Label className="text-sm">Cache TTL (seconds)</Label>
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
                  Routing Statistics
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
                Performance and usage metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Total Requests</p>
                  <p className="text-2xl font-bold">{stats.totalRequests}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Avg Latency</p>
                  <p className="text-2xl font-bold">{stats.avgLatency.toFixed(1)}ms</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Cache Hit Rate</p>
                  <p className="text-2xl font-bold">{(stats.cacheHitRate * 100).toFixed(1)}%</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Cache Size</p>
                  <p className="text-2xl font-bold">{cacheStats.size}</p>
                </div>
              </div>

              {/* Tier Distribution */}
              <div className="mt-4 space-y-2">
                <p className="text-xs text-muted-foreground">Tier Distribution</p>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline" className="gap-1">
                    <Zap className="h-3 w-3 text-green-500" />
                    Fast: {stats.byTier.fast}
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <Scale className="h-3 w-3 text-blue-500" />
                    Balanced: {stats.byTier.balanced}
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <Brain className="h-3 w-3 text-purple-500" />
                    Powerful: {stats.byTier.powerful}
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <Sparkles className="h-3 w-3 text-amber-500" />
                    Reasoning: {stats.byTier.reasoning}
                  </Badge>
                </div>
              </div>

              {/* Cost Savings */}
              {stats.estimatedCostSaved > 0 && (
                <div className="mt-4 p-3 bg-green-500/10 rounded-lg">
                  <p className="text-xs text-muted-foreground">Estimated Cost Saved</p>
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
            Reset to Defaults
          </Button>
        </>
      )}
    </div>
  );
}

export default AutoRouterSettings;
