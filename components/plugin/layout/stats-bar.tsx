'use client';

/**
 * StatsBar - Compact statistics bar showing plugin health and metrics
 */

import React from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle, Zap, AlertCircle, Wrench, Command, Plug } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsBarProps {
  /** Total number of plugins */
  totalPlugins: number;
  /** Number of enabled plugins */
  enabledCount: number;
  /** Number of plugins with errors */
  errorCount: number;
  /** Total number of tools provided by plugins */
  totalTools: number;
  /** Total number of runtime registered commands */
  totalCommands?: number;
  /** Number of plugins currently active in runtime registry */
  runtimeActivePlugins?: number;
  /** Health score (0-100) */
  healthScore: number;
  /** Additional class names */
  className?: string;
  /** Compact mode for mobile */
  compact?: boolean;
}

export function StatsBar({
  totalPlugins,
  enabledCount,
  errorCount,
  totalTools,
  totalCommands,
  runtimeActivePlugins,
  healthScore,
  className,
  compact = false,
}: StatsBarProps) {
  const t = useTranslations('pluginSettings.stats');

  // Determine health color
  const getHealthColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-500';
    if (score >= 50) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const healthColor = getHealthColor(healthScore);

  return (
    <div
      className={cn(
        'flex items-center gap-x-4 gap-y-2',
        'px-4 sm:px-6 py-2.5',
        'bg-muted/30 border-b',
        'overflow-x-auto scrollbar-hide',
        className
      )}
    >
      {/* Health Score */}
      <div className="flex items-center gap-2 shrink-0">
        <div
          className={cn(
            'w-2 h-2 rounded-full transition-colors',
            healthColor
          )}
          aria-label={`Health score: ${healthScore}%`}
        />
        <span className="text-xs font-medium tabular-nums">{healthScore}%</span>
        {!compact && (
          <span className="text-xs text-muted-foreground hidden sm:inline">
            {t('health')}
          </span>
        )}
      </div>

      {/* Divider */}
      <div className="w-px h-4 bg-border shrink-0" />

      {/* Enabled Count */}
      <div className="flex items-center gap-1.5 shrink-0">
        <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
        <span className="text-xs tabular-nums">{enabledCount}</span>
        {!compact && (
          <span className="text-xs text-muted-foreground hidden sm:inline">
            {t('enabled')}
          </span>
        )}
      </div>

      {/* Tools Count */}
      <div className="flex items-center gap-1.5 shrink-0">
        <Zap className="h-3.5 w-3.5 text-amber-500" />
        <span className="text-xs tabular-nums">{totalTools}</span>
        {!compact && (
          <span className="text-xs text-muted-foreground hidden sm:inline">
            {t('tools')}
          </span>
        )}
      </div>

      {/* Total Plugins - Desktop only */}
      {!compact && totalPlugins > 0 && (
        <div className="hidden md:flex items-center gap-1.5 shrink-0">
          <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs tabular-nums">{totalPlugins}</span>
          <span className="text-xs text-muted-foreground">
            {t('total')}
          </span>
        </div>
      )}

      {typeof totalCommands === 'number' && (
        <div className="flex items-center gap-1.5 shrink-0">
          <Command className="h-3.5 w-3.5 text-blue-500" />
          <span className="text-xs tabular-nums">{totalCommands}</span>
          {!compact && (
            <span className="text-xs text-muted-foreground hidden sm:inline">
              Cmd
            </span>
          )}
        </div>
      )}

      {typeof runtimeActivePlugins === 'number' && (
        <div className="flex items-center gap-1.5 shrink-0">
          <Plug className="h-3.5 w-3.5 text-violet-500" />
          <span className="text-xs tabular-nums">{runtimeActivePlugins}</span>
          {!compact && (
            <span className="text-xs text-muted-foreground hidden sm:inline">
              Runtime
            </span>
          )}
        </div>
      )}

      {/* Error Count - Only show if there are errors */}
      {errorCount > 0 && (
        <>
          <div className="w-px h-4 bg-border shrink-0" />
          <div className="flex items-center gap-1.5 shrink-0 text-destructive">
            <AlertCircle className="h-3.5 w-3.5" />
            <span className="text-xs tabular-nums">{errorCount}</span>
            {!compact && (
              <span className="text-xs hidden sm:inline">
                {t('errors')}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default StatsBar;
