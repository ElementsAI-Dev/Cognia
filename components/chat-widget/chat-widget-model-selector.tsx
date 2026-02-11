'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ChevronDown } from 'lucide-react';
import { ProviderIcon } from '@/components/providers/ai/provider-icon';
import type { ProviderName } from '@/types';
import {
  CHAT_WIDGET_PROVIDERS,
  CHAT_WIDGET_MODELS,
  getProviderShortName,
  getShortModelName,
} from '@/lib/chat-widget/constants';

interface ChatWidgetModelSelectorProps {
  provider: ProviderName;
  model: string;
  onProviderChange: (provider: ProviderName) => void;
  onModelChange: (model: string) => void;
  className?: string;
}


export function ChatWidgetModelSelector({
  provider,
  model,
  onProviderChange,
  onModelChange,
  className,
}: ChatWidgetModelSelectorProps) {
  const t = useTranslations('chatWidget.modelSelector');

  const currentModels = useMemo(() => {
    return CHAT_WIDGET_MODELS[provider] || [];
  }, [provider]);

  const displayName = useMemo(() => {
    const providerShort = getProviderShortName(provider);
    const modelShort = getShortModelName(model);
    return `${providerShort} ${modelShort}`;
  }, [provider, model]);

  const handleProviderSelect = (newProvider: ProviderName) => {
    if (newProvider !== provider) {
      onProviderChange(newProvider);
      // Auto-select first model of new provider
      const models = CHAT_WIDGET_MODELS[newProvider];
      if (models && models.length > 0) {
        onModelChange(models[0].value);
      }
    }
  };

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'h-6 px-2 text-[11px] font-medium gap-1',
                'bg-muted/50 hover:bg-muted',
                'text-muted-foreground hover:text-foreground',
                className
              )}
            >
              <ProviderIcon providerId={provider} size={14} className="shrink-0" />
              <span className="max-w-[80px] truncate">{displayName}</span>
              <ChevronDown className="h-2.5 w-2.5 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={4}>
          <p>{t('changeModel')}</p>
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          {t('selectProvider')}
        </DropdownMenuLabel>
        {CHAT_WIDGET_PROVIDERS.map((p) => (
          <DropdownMenuItem
            key={p.value}
            onClick={() => handleProviderSelect(p.value)}
            className={cn('text-sm', provider === p.value && 'bg-accent/50 font-medium')}
          >
            {p.label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          {t('selectModel')}
        </DropdownMenuLabel>
        {currentModels.map((m) => (
          <DropdownMenuItem
            key={m.value}
            onClick={() => onModelChange(m.value)}
            className={cn('text-sm', model === m.value && 'bg-accent/50 font-medium')}
          >
            {m.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
