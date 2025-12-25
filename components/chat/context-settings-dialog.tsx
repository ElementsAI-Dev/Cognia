'use client';

/**
 * ContextSettingsDialog - Dialog for controlling context window settings
 * Shows token usage, context length controls, and memory activation options
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Info, Eye, Gauge } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ContextSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Token stats
  totalTokens: number;
  usedTokens: number;
  systemTokens: number;
  contextTokens: number;
  // Settings
  contextLimitPercent: number;
  onContextLimitChange: (percent: number) => void;
  showMemoryActivation: boolean;
  onShowMemoryActivationChange: (show: boolean) => void;
  showTokenUsageMeter: boolean;
  onShowTokenUsageMeterChange: (show: boolean) => void;
  // Model info
  modelMaxTokens: number;
}

type EncoderType = 'tiktoken' | 'regex';

export function ContextSettingsDialog({
  open,
  onOpenChange,
  totalTokens = 100000,
  usedTokens = 0,
  systemTokens = 0,
  contextTokens = 0,
  contextLimitPercent = 50,
  onContextLimitChange,
  showMemoryActivation = false,
  onShowMemoryActivationChange,
  showTokenUsageMeter = true,
  onShowTokenUsageMeterChange,
  modelMaxTokens = 200000,
}: ContextSettingsDialogProps) {
  const t = useTranslations('contextSettings');
  const [encoderType, setEncoderType] = useState<EncoderType>('tiktoken');

  const usagePercent = totalTokens > 0 ? Math.round((usedTokens / totalTokens) * 100) : 0;
  const remainingTokens = totalTokens - usedTokens;
  const tokenLimit = Math.round((contextLimitPercent / 100) * modelMaxTokens);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">{t('title')}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {t('description')}
          </p>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Word Encoder */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">{t('wordEncoder')}</h4>
            <div className="flex gap-2">
              <Button
                variant={encoderType === 'tiktoken' ? 'secondary' : 'outline'}
                size="sm"
                className="text-xs"
                onClick={() => setEncoderType('tiktoken')}
              >
                o200k_base <span className="ml-1 text-muted-foreground">(GPT-4o)</span>
              </Button>
              <Button
                variant={encoderType === 'regex' ? 'secondary' : 'outline'}
                size="sm"
                className="text-xs"
                onClick={() => setEncoderType('regex')}
              >
                Regex <span className="ml-1 text-muted-foreground">(Fast)</span>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {encoderType === 'tiktoken' ? t('tiktokenDesc') : t('regexDesc')}
            </p>
          </div>

          {/* Context Length */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-sm font-medium">{t('contextLength')}</h4>
            </div>
            <p className="text-xs text-muted-foreground">
              {t('contextLengthDesc')}
            </p>

            {/* Context Usage */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t('contextUsage')}</span>
                <span className="font-medium">{usagePercent}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
            </div>

            {/* Token Limit Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t('tokenLimit')}</span>
                <span className="font-medium">
                  {tokenLimit.toLocaleString()} / {modelMaxTokens.toLocaleString()}
                </span>
              </div>
              <Slider
                value={[contextLimitPercent]}
                onValueChange={([value]) => onContextLimitChange(value)}
                min={10}
                max={100}
                step={5}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                {t('tokenLimitDesc')}
              </p>
            </div>
          </div>

          {/* Token Stats */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-sm font-medium">{t('token')}</h4>
              <span className="ml-auto text-sm font-medium">{usagePercent}%</span>
            </div>

            {/* Token bar */}
            <div className="space-y-2">
              <div className="h-3 rounded-full bg-muted overflow-hidden flex">
                <div
                  className="h-full bg-purple-500 transition-all duration-300"
                  style={{ width: `${(systemTokens / totalTokens) * 100}%` }}
                />
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${(contextTokens / totalTokens) * 100}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{usedTokens.toLocaleString()} / {totalTokens.toLocaleString()} tokens</span>
                <span>{t('remaining', { count: remainingTokens.toLocaleString() })}</span>
              </div>

              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-purple-500" />
                  <span className="text-muted-foreground">{t('system')}</span>
                  <span className="font-medium">{systemTokens.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <span className="text-muted-foreground">{t('context')}</span>
                  <span className="font-medium">{contextTokens.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Toggle Options */}
          <div className="space-y-4">
            {/* Show Memory Activation */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{t('showMemoryActivation')}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('memoryActivationDesc')}
                  </p>
                </div>
              </div>
              <Switch
                checked={showMemoryActivation}
                onCheckedChange={onShowMemoryActivationChange}
              />
            </div>

            {/* Show Token Usage Meter */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gauge className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{t('showTokenUsage')}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('tokenUsageDesc')}
                  </p>
                </div>
              </div>
              <Switch
                checked={showTokenUsageMeter}
                onCheckedChange={onShowTokenUsageMeterChange}
              />
            </div>
          </div>

          {/* Current Statistics */}
          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-sm font-medium">{t('currentStats')}</h4>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t('events')}</span>
              <span className="font-medium">6/6</span>
              <span className="text-muted-foreground">{t('activeTokens')}</span>
              <span className="font-medium">{usedTokens.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ContextSettingsDialog;
