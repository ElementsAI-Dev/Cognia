'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Activity } from 'lucide-react';
import { ObservabilityDashboard } from './observability-dashboard';
import { useSettingsStore } from '@/stores';

interface ObservabilityButtonProps {
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showLabel?: boolean;
}

export function ObservabilityButton({
  variant = 'ghost',
  size = 'icon',
  showLabel = false,
}: ObservabilityButtonProps) {
  const t = useTranslations('observability.button');
  const [isOpen, setIsOpen] = useState(false);
  const observabilitySettings = useSettingsStore((state) => state.observabilitySettings);
  const isEnabled = observabilitySettings?.enabled ?? false;

  const button = (
    <Button variant={variant} size={size} className="gap-2">
      <Activity className={`h-4 w-4 ${isEnabled ? 'text-green-500' : ''}`} />
      {showLabel && <span>{t('label')}</span>}
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>{button}</DialogTrigger>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>{t('tooltipTitle')}</p>
          {!isEnabled && (
            <p className="text-xs text-muted-foreground">{t('tooltipDisabledHint')}</p>
          )}
        </TooltipContent>
      </Tooltip>

      <DialogContent className="max-w-6xl h-[80vh] p-0 overflow-hidden">
        <ObservabilityDashboard onClose={() => setIsOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
