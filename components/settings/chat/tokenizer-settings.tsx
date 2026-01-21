"use client";

import { useCallback } from "react";
import {
  Calculator,
  Zap,
  Clock,
  Database,
  AlertTriangle,
  RefreshCw,
  Info,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslations } from 'next-intl';
import { useSettingsStore, selectTokenizerSettings } from "@/stores/settings/settings-store";
import type { TokenizerProvider } from "@/types/system/tokenizer";
import { TOKENIZER_PROVIDER_OPTIONS } from "@/lib/settings/chat";

interface TokenizerSettingsProps {
  className?: string;
}

export function TokenizerSettings({ className }: TokenizerSettingsProps) {
  const t = useTranslations('tokenizerSettings');
  const tokenizerSettings = useSettingsStore(selectTokenizerSettings);
  const setTokenizerEnabled = useSettingsStore((s) => s.setTokenizerEnabled);
  const setTokenizerProvider = useSettingsStore((s) => s.setTokenizerProvider);
  const setTokenizerAutoDetect = useSettingsStore((s) => s.setTokenizerAutoDetect);
  const setTokenizerCache = useSettingsStore((s) => s.setTokenizerCache);
  const setTokenizerCacheTTL = useSettingsStore((s) => s.setTokenizerCacheTTL);
  const setTokenizerTimeout = useSettingsStore((s) => s.setTokenizerTimeout);
  const setTokenizerFallback = useSettingsStore((s) => s.setTokenizerFallback);
  const setTokenizerShowBreakdown = useSettingsStore((s) => s.setTokenizerShowBreakdown);
  const setTokenizerContextWarning = useSettingsStore((s) => s.setTokenizerContextWarning);
  const setTokenizerContextThreshold = useSettingsStore((s) => s.setTokenizerContextThreshold);
  const resetTokenizerSettings = useSettingsStore((s) => s.resetTokenizerSettings);

  const handleProviderChange = useCallback(
    (value: string) => {
      setTokenizerProvider(value as TokenizerProvider);
    },
    [setTokenizerProvider]
  );

  const handleTimeoutChange = useCallback(
    (value: number[]) => {
      setTokenizerTimeout(value[0]);
    },
    [setTokenizerTimeout]
  );

  const handleCacheTTLChange = useCallback(
    (value: number[]) => {
      setTokenizerCacheTTL(value[0]);
    },
    [setTokenizerCacheTTL]
  );

  const handleThresholdChange = useCallback(
    (value: number[]) => {
      setTokenizerContextThreshold(value[0]);
    },
    [setTokenizerContextThreshold]
  );

  return (
    <TooltipProvider>
      <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Calculator className="h-5 w-5 shrink-0" />
              <CardTitle className="text-base">{t('title')}</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetTokenizerSettings}
              className="h-8 px-2 shrink-0"
            >
              <RefreshCw className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">{t('reset')}</span>
            </Button>
          </div>
          <CardDescription className="text-xs">
            {t('description')}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Enable Precise Counting */}
          <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
            <div className="space-y-0.5 min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Label htmlFor="precise-counting" className="text-sm">{t('enablePreciseCounting')}</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help shrink-0" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs text-xs">
                      {t('enablePreciseCountingTooltip')}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('enablePreciseCountingDesc')}
              </p>
            </div>
            <Switch
              id="precise-counting"
              checked={tokenizerSettings.enablePreciseCounting}
              onCheckedChange={setTokenizerEnabled}
              className="shrink-0"
            />
          </div>

          {/* Tokenizer Provider */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label>{t('preferredTokenizer')}</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    {t('preferredTokenizerTooltip')}
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Select
              value={tokenizerSettings.preferredProvider}
              onValueChange={handleProviderChange}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('selectTokenizer')} />
              </SelectTrigger>
              <SelectContent>
                {TOKENIZER_PROVIDER_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col">
                      <span>{t(option.labelKey)}</span>
                      <span className="text-xs text-muted-foreground">{t(option.descKey)}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Auto-detect */}
          <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
            <div className="space-y-0.5 min-w-0 flex-1">
              <Label htmlFor="auto-detect" className="text-sm">{t('autoDetectByModel')}</Label>
              <p className="text-xs text-muted-foreground">
                {t('autoDetectByModelDesc')}
              </p>
            </div>
            <Switch
              id="auto-detect"
              checked={tokenizerSettings.autoDetect}
              onCheckedChange={setTokenizerAutoDetect}
              className="shrink-0"
            />
          </div>

          {/* Caching */}
          <div className="space-y-3 rounded-lg border p-3">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 shrink-0" />
                  <Label htmlFor="enable-cache" className="text-sm">{t('enableCaching')}</Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('enableCachingDesc')}
                </p>
              </div>
              <Switch
                id="enable-cache"
                checked={tokenizerSettings.enableCache}
                onCheckedChange={setTokenizerCache}
                className="shrink-0"
              />
            </div>

            {tokenizerSettings.enableCache && (
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">{t('cacheTTL')}</Label>
                  <span className="text-sm font-mono">{tokenizerSettings.cacheTTL}s</span>
                </div>
                <Slider
                  value={[tokenizerSettings.cacheTTL]}
                  onValueChange={handleCacheTTLChange}
                  min={60}
                  max={3600}
                  step={60}
                />
                <p className="text-[10px] text-muted-foreground">
                  {t('cacheTTLRange')}
                </p>
              </div>
            )}
          </div>

          {/* API Timeout */}
          <div className="space-y-2 rounded-lg border p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 shrink-0" />
                <Label className="text-sm">{t('apiTimeout')}</Label>
              </div>
              <span className="text-sm font-mono">{tokenizerSettings.apiTimeout}ms</span>
            </div>
            <Slider
              value={[tokenizerSettings.apiTimeout]}
              onValueChange={handleTimeoutChange}
              min={1000}
              max={30000}
              step={1000}
            />
            <p className="text-[10px] text-muted-foreground">
              {t('apiTimeoutRange')}
            </p>
          </div>

          {/* Fallback */}
          <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
            <div className="space-y-0.5 min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 shrink-0" />
                <Label htmlFor="fallback" className="text-sm">{t('fallbackToEstimation')}</Label>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('fallbackToEstimationDesc')}
              </p>
            </div>
            <Switch
              id="fallback"
              checked={tokenizerSettings.fallbackToEstimation}
              onCheckedChange={setTokenizerFallback}
              className="shrink-0"
            />
          </div>

          {/* Display Options */}
          <div className="border-t pt-4 space-y-3">
            <h4 className="text-sm font-medium">{t('displayOptions')}</h4>

            <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
              <div className="space-y-0.5 min-w-0 flex-1">
                <Label htmlFor="show-breakdown" className="text-sm">{t('showTokenBreakdown')}</Label>
                <p className="text-xs text-muted-foreground">
                  {t('showTokenBreakdownDesc')}
                </p>
              </div>
              <Switch
                id="show-breakdown"
                checked={tokenizerSettings.showBreakdown}
                onCheckedChange={setTokenizerShowBreakdown}
                className="shrink-0"
              />
            </div>

            <div className="space-y-3 rounded-lg border p-3">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <Label htmlFor="context-warning" className="text-sm">{t('contextLimitWarning')}</Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t('contextLimitWarningDesc')}
                  </p>
                </div>
                <Switch
                  id="context-warning"
                  checked={tokenizerSettings.showContextWarning}
                  onCheckedChange={setTokenizerContextWarning}
                  className="shrink-0"
                />
              </div>

              {tokenizerSettings.showContextWarning && (
                <div className="space-y-2 pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">{t('warningThreshold')}</Label>
                    <span className="text-sm font-mono">{tokenizerSettings.contextWarningThreshold}%</span>
                  </div>
                  <Slider
                    value={[tokenizerSettings.contextWarningThreshold]}
                    onValueChange={handleThresholdChange}
                    min={50}
                    max={100}
                    step={5}
                  />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

export default TokenizerSettings;
