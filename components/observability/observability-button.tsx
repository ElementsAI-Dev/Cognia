'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Activity } from 'lucide-react';
import { ObservabilityDashboard } from './observability-dashboard';
import { useAgentTrace } from '@/hooks/agent-trace';
import { buildObservabilitySettingsProjection } from '@/lib/observability';
import { useSettingsStore, useUsageStore } from '@/stores';

interface ObservabilityButtonProps {
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showLabel?: boolean;
  trigger?: React.ReactNode;
}

export function ObservabilityButton({
  variant = 'ghost',
  size = 'icon',
  showLabel = false,
  trigger,
}: ObservabilityButtonProps) {
  const t = useTranslations('observability.button');
  const [isOpen, setIsOpen] = useState(false);
  const observabilitySettings = useSettingsStore((state) => state.observabilitySettings);
  const agentTraceSettings = useSettingsStore((state) => state.agentTraceSettings);
  const usageRecordCount = useUsageStore((state) => state.records.length);
  const { totalCount: traceRecordCount = 0 } = useAgentTrace({ limit: 1 });
  const projection = useMemo(
    () =>
      buildObservabilitySettingsProjection({
        observabilitySettings,
        agentTraceSettings,
        usageRecordCount,
        traceRecordCount,
      }),
    [agentTraceSettings, observabilitySettings, traceRecordCount, usageRecordCount]
  );

  const iconClassName =
    projection.surfaces.sidebar.status === 'ready'
      ? 'text-green-500'
      : projection.surfaces.sidebar.status === 'incomplete'
        ? 'text-amber-500'
        : projection.surfaces.sidebar.status === 'history-only'
          ? 'text-sky-500'
          : '';

  const defaultTrigger = (
    <Button variant={variant} size={size} className="gap-2">
      <Activity className={`h-4 w-4 ${iconClassName}`.trim()} />
      {showLabel && <span>{t('label')}</span>}
    </Button>
  );

  const triggerElement = trigger || defaultTrigger;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {trigger ? (
        <DialogTrigger asChild>{triggerElement}</DialogTrigger>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>{triggerElement}</DialogTrigger>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>{t('tooltipTitle')}</p>
            {projection.surfaces.sidebar.status === 'disabled' && (
              <p className="text-xs text-muted-foreground">{t('tooltipDisabledHint')}</p>
            )}
            {projection.surfaces.sidebar.status === 'history-only' && (
              <p className="text-xs text-muted-foreground">
                {t('tooltipHistoryHint')}
              </p>
            )}
            {projection.surfaces.sidebar.status === 'incomplete' && (
              <p className="text-xs text-muted-foreground">
                {t('tooltipIncompleteHint')}
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      )}

      <DialogContent className="max-w-6xl h-[80vh] p-0 overflow-hidden">
        <ObservabilityDashboard onClose={() => setIsOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
