'use client';

/**
 * AISettingsDialog - Dialog for configuring AI generation parameters per session
 * Controls temperature, topP, maxTokens, frequencyPenalty, presencePenalty
 */

import { useTranslations } from 'next-intl';
import { Thermometer, Hash, Sliders, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface AISettings {
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
}

interface AISettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: AISettings;
  onSettingsChange: (settings: Partial<AISettings>) => void;
  defaultSettings?: AISettings;
}

const DEFAULT_AI_SETTINGS: AISettings = {
  temperature: 0.7,
  maxTokens: 4096,
  topP: 1.0,
  frequencyPenalty: 0,
  presencePenalty: 0,
};

export function AISettingsDialog({
  open,
  onOpenChange,
  settings,
  onSettingsChange,
  defaultSettings = DEFAULT_AI_SETTINGS,
}: AISettingsDialogProps) {
  const t = useTranslations('aiSettings');

  const handleReset = () => {
    onSettingsChange(defaultSettings);
  };

  const getTemperatureLabel = (temp: number) => {
    if (temp <= 0.3) return t('precise');
    if (temp <= 0.7) return t('balanced');
    return t('creative');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            <Sliders className="h-5 w-5" />
            {t('title')}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {t('description')}
          </p>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Temperature */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Thermometer className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">{t('temperature')}</Label>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {getTemperatureLabel(settings.temperature)}
                </span>
                <span className="font-mono text-sm font-medium w-10 text-right">
                  {settings.temperature.toFixed(1)}
                </span>
              </div>
            </div>
            <Slider
              value={[settings.temperature]}
              onValueChange={([value]) => onSettingsChange({ temperature: value })}
              min={0}
              max={2}
              step={0.1}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              {t('temperatureDesc')}
            </p>
          </div>

          {/* Max Tokens */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">{t('maxTokens')}</Label>
              </div>
              <Input
                type="number"
                value={settings.maxTokens}
                onChange={(e) => onSettingsChange({ maxTokens: Math.max(1, parseInt(e.target.value) || 1) })}
                className="w-24 h-8 text-sm text-right"
                min={1}
                max={128000}
              />
            </div>
            <Slider
              value={[settings.maxTokens]}
              onValueChange={([value]) => onSettingsChange({ maxTokens: value })}
              min={256}
              max={32768}
              step={256}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              {t('maxTokensDesc')}
            </p>
          </div>

          {/* Top P */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-sm font-mono text-muted-foreground cursor-help">P</span>
                  </TooltipTrigger>
                  <TooltipContent>{t('topPTooltip')}</TooltipContent>
                </Tooltip>
                <Label className="text-sm font-medium">{t('topP')}</Label>
              </div>
              <span className="font-mono text-sm font-medium w-10 text-right">
                {settings.topP.toFixed(2)}
              </span>
            </div>
            <Slider
              value={[settings.topP]}
              onValueChange={([value]) => onSettingsChange({ topP: value })}
              min={0}
              max={1}
              step={0.05}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              {t('topPDesc')}
            </p>
          </div>

          {/* Frequency Penalty */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-xs font-mono px-1.5 py-0.5 rounded",
                  settings.frequencyPenalty !== 0 ? "bg-orange-500/10 text-orange-500" : "bg-muted text-muted-foreground"
                )}>
                  FP
                </span>
                <Label className="text-sm font-medium">{t('frequencyPenalty')}</Label>
              </div>
              <span className="font-mono text-sm font-medium w-12 text-right">
                {settings.frequencyPenalty.toFixed(1)}
              </span>
            </div>
            <Slider
              value={[settings.frequencyPenalty]}
              onValueChange={([value]) => onSettingsChange({ frequencyPenalty: value })}
              min={-2}
              max={2}
              step={0.1}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              {t('frequencyPenaltyDesc')}
            </p>
          </div>

          {/* Presence Penalty */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-xs font-mono px-1.5 py-0.5 rounded",
                  settings.presencePenalty !== 0 ? "bg-blue-500/10 text-blue-500" : "bg-muted text-muted-foreground"
                )}>
                  PP
                </span>
                <Label className="text-sm font-medium">{t('presencePenalty')}</Label>
              </div>
              <span className="font-mono text-sm font-medium w-12 text-right">
                {settings.presencePenalty.toFixed(1)}
              </span>
            </div>
            <Slider
              value={[settings.presencePenalty]}
              onValueChange={([value]) => onSettingsChange({ presencePenalty: value })}
              min={-2}
              max={2}
              step={0.1}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              {t('presencePenaltyDesc')}
            </p>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {t('resetDefaults')}
          </Button>
          <Button onClick={() => onOpenChange(false)}>
            {t('done')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AISettingsDialog;
