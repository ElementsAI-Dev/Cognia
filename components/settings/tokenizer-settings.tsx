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
import { useSettingsStore, selectTokenizerSettings } from "@/stores/settings/settings-store";
import type { TokenizerProvider } from "@/types/system/tokenizer";

interface TokenizerSettingsProps {
  className?: string;
}

const PROVIDER_OPTIONS: { value: TokenizerProvider; label: string; description: string }[] = [
  {
    value: "auto",
    label: "Auto-detect",
    description: "Automatically select tokenizer based on model",
  },
  {
    value: "tiktoken",
    label: "Tiktoken (OpenAI)",
    description: "Local tokenizer for GPT models - fast and accurate",
  },
  {
    value: "gemini-api",
    label: "Gemini API",
    description: "Google's official token counter - requires API key",
  },
  {
    value: "claude-api",
    label: "Claude API",
    description: "Anthropic's official token counter - requires API key",
  },
  {
    value: "glm-api",
    label: "GLM API (Zhipu)",
    description: "Zhipu's official token counter - requires API key",
  },
  {
    value: "estimation",
    label: "Estimation",
    description: "Fast local estimation - approximate but always available",
  },
];

export function TokenizerSettings({ className }: TokenizerSettingsProps) {
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
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              <CardTitle>Token Counting</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetTokenizerSettings}
              className="h-8 px-2"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Reset
            </Button>
          </div>
          <CardDescription>
            Configure how tokens are counted for different AI models. Precise counting uses
            official provider APIs when available.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Enable Precise Counting */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Label htmlFor="precise-counting">Enable Precise Counting</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      When enabled, uses official tokenizers for accurate counts. May use remote
                      APIs for some providers.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-sm text-muted-foreground">
                Use official tokenizers for accurate token counts
              </p>
            </div>
            <Switch
              id="precise-counting"
              checked={tokenizerSettings.enablePreciseCounting}
              onCheckedChange={setTokenizerEnabled}
            />
          </div>

          {/* Tokenizer Provider */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label>Preferred Tokenizer</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    Select which tokenizer to use. Auto-detect chooses based on the model.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Select
              value={tokenizerSettings.preferredProvider}
              onValueChange={handleProviderChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select tokenizer" />
              </SelectTrigger>
              <SelectContent>
                {PROVIDER_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col">
                      <span>{option.label}</span>
                      <span className="text-xs text-muted-foreground">{option.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Auto-detect */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-detect">Auto-detect by Model</Label>
              <p className="text-sm text-muted-foreground">
                Automatically select the best tokenizer for each model
              </p>
            </div>
            <Switch
              id="auto-detect"
              checked={tokenizerSettings.autoDetect}
              onCheckedChange={setTokenizerAutoDetect}
            />
          </div>

          {/* Caching */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  <Label htmlFor="enable-cache">Enable Caching</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Cache token counts to reduce API calls
                </p>
              </div>
              <Switch
                id="enable-cache"
                checked={tokenizerSettings.enableCache}
                onCheckedChange={setTokenizerCache}
              />
            </div>

            {tokenizerSettings.enableCache && (
              <div className="space-y-2 pl-6">
                <div className="flex items-center justify-between">
                  <Label>Cache TTL: {tokenizerSettings.cacheTTL}s</Label>
                </div>
                <Slider
                  value={[tokenizerSettings.cacheTTL]}
                  onValueChange={handleCacheTTLChange}
                  min={60}
                  max={3600}
                  step={60}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  How long to keep cached token counts (60s - 1 hour)
                </p>
              </div>
            )}
          </div>

          {/* API Timeout */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <Label>API Timeout: {tokenizerSettings.apiTimeout}ms</Label>
            </div>
            <Slider
              value={[tokenizerSettings.apiTimeout]}
              onValueChange={handleTimeoutChange}
              min={1000}
              max={30000}
              step={1000}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Timeout for remote tokenizer API calls (1s - 30s)
            </p>
          </div>

          {/* Fallback */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                <Label htmlFor="fallback">Fallback to Estimation</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Use estimation if precise counting fails
              </p>
            </div>
            <Switch
              id="fallback"
              checked={tokenizerSettings.fallbackToEstimation}
              onCheckedChange={setTokenizerFallback}
            />
          </div>

          {/* Display Options */}
          <div className="border-t pt-4 space-y-4">
            <h4 className="font-medium">Display Options</h4>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="show-breakdown">Show Token Breakdown</Label>
                <p className="text-sm text-muted-foreground">
                  Display detailed token counts per message
                </p>
              </div>
              <Switch
                id="show-breakdown"
                checked={tokenizerSettings.showBreakdown}
                onCheckedChange={setTokenizerShowBreakdown}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  <Label htmlFor="context-warning">Context Limit Warning</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Show warning when approaching context limit
                </p>
              </div>
              <Switch
                id="context-warning"
                checked={tokenizerSettings.showContextWarning}
                onCheckedChange={setTokenizerContextWarning}
              />
            </div>

            {tokenizerSettings.showContextWarning && (
              <div className="space-y-2 pl-6">
                <div className="flex items-center justify-between">
                  <Label>Warning Threshold: {tokenizerSettings.contextWarningThreshold}%</Label>
                </div>
                <Slider
                  value={[tokenizerSettings.contextWarningThreshold]}
                  onValueChange={handleThresholdChange}
                  min={50}
                  max={100}
                  step={5}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Show warning when context usage exceeds this percentage
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

export default TokenizerSettings;
