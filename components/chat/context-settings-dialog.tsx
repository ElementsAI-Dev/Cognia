'use client';

/**
 * ContextSettingsDialog - Dialog for controlling context window settings
 * Shows token usage, context length controls, and memory activation options
 */

import { useState } from 'react';
import { X, Info, Eye, Gauge } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  const [encoderType, setEncoderType] = useState<EncoderType>('tiktoken');

  const usagePercent = totalTokens > 0 ? Math.round((usedTokens / totalTokens) * 100) : 0;
  const remainingTokens = totalTokens - usedTokens;
  const tokenLimit = Math.round((contextLimitPercent / 100) * modelMaxTokens);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Context Settings</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Control dialogue context and memory activation
          </p>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Word Encoder */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Word Encoder</h4>
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
              {encoderType === 'tiktoken'
                ? 'Uses Web Worker for accurate calculation, slightly slower but exact'
                : 'Fast regex-based estimation, less accurate but instant'}
            </p>
          </div>

          {/* Context Length */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-sm font-medium">Context Length</h4>
            </div>
            <p className="text-xs text-muted-foreground">
              Control the number of tokens included in each request (estimated)
            </p>

            {/* Context Usage */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Context Usage</span>
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
                <span className="text-muted-foreground">Token Limit</span>
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
                Percentage of the model&apos;s context window used
              </p>
            </div>
          </div>

          {/* Token Stats */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-sm font-medium">Token</h4>
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
                <span>{remainingTokens.toLocaleString()} Remaining</span>
              </div>

              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-purple-500" />
                  <span className="text-muted-foreground">System</span>
                  <span className="font-medium">{systemTokens.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <span className="text-muted-foreground">Context</span>
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
                  <p className="text-sm font-medium">Show Memory Activation</p>
                  <p className="text-xs text-muted-foreground">
                    Highlight events in the activation context
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
                  <p className="text-sm font-medium">Show Token Usage Meter</p>
                  <p className="text-xs text-muted-foreground">
                    Show context capacity usage in the bottom right corner
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
              <h4 className="text-sm font-medium">Current Statistics</h4>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Events</span>
              <span className="font-medium">6/6</span>
              <span className="text-muted-foreground">Active Tokens</span>
              <span className="font-medium">{usedTokens.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ContextSettingsDialog;
