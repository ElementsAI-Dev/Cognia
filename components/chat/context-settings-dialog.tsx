'use client';

/**
 * ContextSettingsDialog - Dialog for controlling context window settings
 * Shows token usage, context length controls, and memory activation options
 */

import { useState, useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Gauge,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Zap,
  Brain,
  Settings2,
  ChevronDown,
  ChevronUp,
  Shrink,
  Undo2,
} from 'lucide-react';
import { useSettingsStore } from '@/stores';
import type { CompressionStrategy, CompressionTrigger } from '@/types/compression';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

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
  // Optional callbacks
  onClearContext?: () => void;
  onOptimizeContext?: () => void;
  messageCount?: number;
}

type EncoderType = 'tiktoken' | 'regex';

// Token status thresholds
const TOKEN_WARNING_THRESHOLD = 70;
const TOKEN_DANGER_THRESHOLD = 90;

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
  onClearContext,
  onOptimizeContext,
  messageCount = 0,
}: ContextSettingsDialogProps) {
  const t = useTranslations('contextSettings');
  const [encoderType, setEncoderType] = useState<EncoderType>('tiktoken');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showCompression, setShowCompression] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);

  // Compression settings from store
  const compressionSettings = useSettingsStore((state) => state.compressionSettings);
  const setCompressionEnabled = useSettingsStore((state) => state.setCompressionEnabled);
  const setCompressionStrategy = useSettingsStore((state) => state.setCompressionStrategy);
  const setCompressionTrigger = useSettingsStore((state) => state.setCompressionTrigger);
  const setCompressionTokenThreshold = useSettingsStore((state) => state.setCompressionTokenThreshold);
  const setCompressionMessageThreshold = useSettingsStore((state) => state.setCompressionMessageThreshold);
  const setCompressionPreserveRecent = useSettingsStore((state) => state.setCompressionPreserveRecent);

  // Handle manual compression
  const handleManualCompress = useCallback(async () => {
    if (onOptimizeContext) {
      setIsCompressing(true);
      try {
        await onOptimizeContext();
      } finally {
        setIsCompressing(false);
      }
    }
  }, [onOptimizeContext]);

  const usagePercent = totalTokens > 0 ? Math.round((usedTokens / totalTokens) * 100) : 0;
  const remainingTokens = totalTokens - usedTokens;
  const tokenLimit = Math.round((contextLimitPercent / 100) * modelMaxTokens);
  
  // Status calculation
  const status = useMemo(() => {
    if (usagePercent >= TOKEN_DANGER_THRESHOLD) return 'danger';
    if (usagePercent >= TOKEN_WARNING_THRESHOLD) return 'warning';
    return 'healthy';
  }, [usagePercent]);

  const statusConfig = {
    healthy: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500', label: t('statusHealthy') || 'Healthy' },
    warning: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500', label: t('statusWarning') || 'Warning' },
    danger: { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500', label: t('statusDanger') || 'Near Limit' },
  };

  const StatusIcon = statusConfig[status].icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold flex items-center gap-2">
              <Gauge className="h-5 w-5" />
              {t('title')}
            </DialogTitle>
            <Badge 
              variant="outline" 
              className={cn(
                'gap-1',
                status === 'healthy' && 'border-green-500/50 text-green-500',
                status === 'warning' && 'border-amber-500/50 text-amber-500',
                status === 'danger' && 'border-red-500/50 text-red-500'
              )}
            >
              <StatusIcon className="h-3 w-3" />
              {statusConfig[status].label}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {t('description')}
          </p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Main Token Usage Visualization */}
          <div className="rounded-lg border p-3 space-y-3">
            {/* Circular Progress Indicator */}
            <div className="flex items-center gap-4">
              <div className="relative h-16 w-16 shrink-0">
                <svg className="h-16 w-16 -rotate-90" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    className="text-muted/30"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeDasharray={`${usagePercent}, 100`}
                    className={cn(
                      'transition-all duration-500',
                      status === 'healthy' && 'text-green-500',
                      status === 'warning' && 'text-amber-500',
                      status === 'danger' && 'text-red-500'
                    )}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-bold">{usagePercent}%</span>
                </div>
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('used') || 'Used'}</span>
                  <span className="font-medium">{usedTokens.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('limit') || 'Limit'}</span>
                  <span className="font-medium">{totalTokens.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('remainingTokens') || 'Remaining'}</span>
                  <span className="font-medium text-green-500">{remainingTokens.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Detailed Token Breakdown */}
            <div className="space-y-2">
              <div className="h-2 rounded-full bg-muted overflow-hidden flex">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className="h-full bg-purple-500 transition-all duration-300 cursor-help"
                      style={{ width: `${totalTokens > 0 ? (systemTokens / totalTokens) * 100 : 0}%` }}
                    />
                  </TooltipTrigger>
                  <TooltipContent>{t('system')}: {systemTokens.toLocaleString()}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className="h-full bg-blue-500 transition-all duration-300 cursor-help"
                      style={{ width: `${totalTokens > 0 ? (contextTokens / totalTokens) * 100 : 0}%` }}
                    />
                  </TooltipTrigger>
                  <TooltipContent>{t('context')}: {contextTokens.toLocaleString()}</TooltipContent>
                </Tooltip>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-purple-500" />
                    <span className="text-muted-foreground">{t('system')}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                    <span className="text-muted-foreground">{t('context')}</span>
                  </div>
                </div>
                <span className="text-muted-foreground">{messageCount} {t('messages') || 'messages'}</span>
              </div>
            </div>
          </div>

          {/* Token Limit Control */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{t('tokenLimit')}</span>
              </div>
              <span className="text-sm font-mono">
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
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>10%</span>
              <span>{contextLimitPercent}%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2">
            {onOptimizeContext && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-1.5"
                onClick={onOptimizeContext}
              >
                <Zap className="h-3.5 w-3.5" />
                {t('optimize') || 'Optimize'}
              </Button>
            )}
            {onClearContext && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-1.5 text-destructive hover:text-destructive"
                onClick={onClearContext}
              >
                <Trash2 className="h-3.5 w-3.5" />
                {t('clear') || 'Clear'}
              </Button>
            )}
          </div>

          {/* Advanced Settings Collapsible */}
          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between">
                <span className="text-sm">{t('advancedSettings') || 'Advanced Settings'}</span>
                {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-2">
              {/* Word Encoder */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium">{t('wordEncoder')}</h4>
                <div className="flex gap-2">
                  <Button
                    variant={encoderType === 'tiktoken' ? 'secondary' : 'outline'}
                    size="sm"
                    className="text-xs flex-1"
                    onClick={() => setEncoderType('tiktoken')}
                  >
                    o200k_base
                  </Button>
                  <Button
                    variant={encoderType === 'regex' ? 'secondary' : 'outline'}
                    size="sm"
                    className="text-xs flex-1"
                    onClick={() => setEncoderType('regex')}
                  >
                    Regex
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {encoderType === 'tiktoken' ? t('tiktokenDesc') : t('regexDesc')}
                </p>
              </div>

              {/* Toggle Options */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{t('showMemoryActivation')}</span>
                  </div>
                  <Switch
                    checked={showMemoryActivation}
                    onCheckedChange={onShowMemoryActivationChange}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Gauge className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{t('showTokenUsage')}</span>
                  </div>
                  <Switch
                    checked={showTokenUsageMeter}
                    onCheckedChange={onShowTokenUsageMeterChange}
                  />
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Compression Settings */}
          <Collapsible open={showCompression} onOpenChange={setShowCompression}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between">
                <div className="flex items-center gap-2">
                  <Shrink className="h-4 w-4" />
                  <span className="text-sm">{t('compressionSettings') || 'Compression Settings'}</span>
                </div>
                {showCompression ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-2">
              {/* Enable Compression */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shrink className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{t('enableCompression') || 'Enable Compression'}</span>
                </div>
                <Switch
                  checked={compressionSettings.enabled}
                  onCheckedChange={setCompressionEnabled}
                />
              </div>

              {compressionSettings.enabled && (
                <>
                  {/* Compression Strategy */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">{t('compressionStrategy') || 'Strategy'}</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {(['summary', 'sliding-window', 'selective', 'hybrid'] as CompressionStrategy[]).map((strategy) => (
                        <Button
                          key={strategy}
                          variant={compressionSettings.strategy === strategy ? 'secondary' : 'outline'}
                          size="sm"
                          className="text-xs"
                          onClick={() => setCompressionStrategy(strategy)}
                        >
                          {t(`strategy.${strategy}`) || strategy}
                        </Button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t(`strategyDesc.${compressionSettings.strategy}`) ||
                        (compressionSettings.strategy === 'summary' ? 'Summarize older messages using AI' :
                         compressionSettings.strategy === 'sliding-window' ? 'Keep only the most recent messages' :
                         compressionSettings.strategy === 'selective' ? 'Keep important messages and summarize others' :
                         'Combination of sliding window + summary')}
                    </p>
                  </div>

                  {/* Compression Trigger */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">{t('compressionTrigger') || 'Trigger'}</h4>
                    <div className="flex gap-2">
                      {(['manual', 'token-threshold', 'message-count'] as CompressionTrigger[]).map((trigger) => (
                        <Button
                          key={trigger}
                          variant={compressionSettings.trigger === trigger ? 'secondary' : 'outline'}
                          size="sm"
                          className="text-xs flex-1"
                          onClick={() => setCompressionTrigger(trigger)}
                        >
                          {t(`trigger.${trigger}`) || trigger}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Token Threshold (if token-threshold trigger) */}
                  {compressionSettings.trigger === 'token-threshold' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">{t('tokenThreshold') || 'Token Threshold'}</span>
                        <span className="text-sm font-mono">{compressionSettings.tokenThreshold}%</span>
                      </div>
                      <Slider
                        value={[compressionSettings.tokenThreshold]}
                        onValueChange={([value]) => setCompressionTokenThreshold(value)}
                        min={50}
                        max={95}
                        step={5}
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground">
                        {t('tokenThresholdDesc') || 'Compress when token usage exceeds this percentage'}
                      </p>
                    </div>
                  )}

                  {/* Message Count Threshold (if message-count trigger) */}
                  {compressionSettings.trigger === 'message-count' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">{t('messageThreshold') || 'Message Threshold'}</span>
                        <span className="text-sm font-mono">{compressionSettings.messageCountThreshold}</span>
                      </div>
                      <Slider
                        value={[compressionSettings.messageCountThreshold]}
                        onValueChange={([value]) => setCompressionMessageThreshold(value)}
                        min={10}
                        max={100}
                        step={5}
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground">
                        {t('messageThresholdDesc') || 'Compress when message count exceeds this number'}
                      </p>
                    </div>
                  )}

                  {/* Preserve Recent Messages */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{t('preserveRecent') || 'Preserve Recent Messages'}</span>
                      <span className="text-sm font-mono">{compressionSettings.preserveRecentMessages}</span>
                    </div>
                    <Slider
                      value={[compressionSettings.preserveRecentMessages]}
                      onValueChange={([value]) => setCompressionPreserveRecent(value)}
                      min={2}
                      max={20}
                      step={1}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('preserveRecentDesc') || 'Number of recent messages to keep uncompressed'}
                    </p>
                  </div>

                  {/* Manual Compress Button */}
                  {compressionSettings.trigger === 'manual' && onOptimizeContext && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-1.5"
                      onClick={handleManualCompress}
                      disabled={isCompressing || messageCount <= compressionSettings.preserveRecentMessages}
                    >
                      <Shrink className={cn("h-3.5 w-3.5", isCompressing && "animate-spin")} />
                      {isCompressing
                        ? (t('compressing') || 'Compressing...')
                        : (t('compressNow') || 'Compress Now')}
                    </Button>
                  )}
                </>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            {t('done') || 'Done'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ContextSettingsDialog;
