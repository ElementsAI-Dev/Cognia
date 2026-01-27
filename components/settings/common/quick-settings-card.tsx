'use client';

/**
 * QuickSettingsCard - Summary panel showing key settings at a glance
 */

import { useTranslations } from 'next-intl';
import { Settings, Cpu, Palette, MessageSquare, Search, Wrench } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useSettingsStore } from '@/stores';
import { PROVIDERS } from '@/types/provider';

interface SettingsSummaryItem {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  status?: 'success' | 'warning' | 'default';
}

export function QuickSettingsCard() {
  const t = useTranslations('settings');
  const providerSettings = useSettingsStore((state) => state.providerSettings);
  const defaultProvider = useSettingsStore((state) => state.defaultProvider);
  const theme = useSettingsStore((state) => state.theme);
  const colorTheme = useSettingsStore((state) => state.colorTheme);
  const defaultTemperature = useSettingsStore((state) => state.defaultTemperature);
  const searchEnabled = useSettingsStore((state) => state.searchEnabled);
  const enableFileTools = useSettingsStore((state) => state.enableFileTools);
  const enableWebSearch = useSettingsStore((state) => state.enableWebSearch);
  const customShortcuts = useSettingsStore((state) => state.customShortcuts);

  // Count configured providers
  const configuredProviders = Object.entries(providerSettings).filter(
    ([id, settings]) => settings?.enabled && (settings?.apiKey || id === 'ollama')
  ).length;

  // Count enabled tools
  const enabledTools = [enableFileTools, enableWebSearch].filter(Boolean).length;

  // Get provider name
  const providerName = PROVIDERS[defaultProvider]?.name || defaultProvider;

  const summaryItems: SettingsSummaryItem[] = [
    {
      label: t('quickProviders'),
      value: t('quickConfigured', { count: configuredProviders }),
      icon: <Cpu className="h-3.5 w-3.5" />,
      status: configuredProviders > 0 ? 'success' : 'warning',
    },
    {
      label: t('quickDefault'),
      value: providerName,
      icon: <Settings className="h-3.5 w-3.5" />,
      status: 'default',
    },
    {
      label: t('quickTheme'),
      value: `${theme} / ${colorTheme}`,
      icon: <Palette className="h-3.5 w-3.5" />,
      status: 'default',
    },
    {
      label: t('quickTemperature'),
      value: defaultTemperature.toFixed(1),
      icon: <MessageSquare className="h-3.5 w-3.5" />,
      status: 'default',
    },
    {
      label: t('quickSearch'),
      value: searchEnabled ? t('enabled') : t('disabled'),
      icon: <Search className="h-3.5 w-3.5" />,
      status: searchEnabled ? 'success' : 'default',
    },
    {
      label: t('quickTools'),
      value: t('quickActive', { count: enabledTools }),
      icon: <Wrench className="h-3.5 w-3.5" />,
      status: enabledTools > 0 ? 'success' : 'default',
    },
  ];

  const getStatusColor = (status: SettingsSummaryItem['status']) => {
    switch (status) {
      case 'success':
        return 'bg-green-500/10 text-green-600 border-green-200';
      case 'warning':
        return 'bg-amber-500/10 text-amber-600 border-amber-200';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Settings className="h-4 w-4" />
          {t('quickOverview')}
          {Object.keys(customShortcuts).length > 0 && (
            <Badge variant="outline" className="text-[10px] ml-auto">
              {t('quickCustomShortcuts', { count: Object.keys(customShortcuts).length })}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <TooltipProvider delayDuration={300}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {summaryItems.map((item) => (
              <Tooltip key={item.label}>
                <TooltipTrigger asChild>
                  <div
                    className={`flex items-center gap-2 rounded-md border px-2 py-1.5 cursor-default ${getStatusColor(item.status)}`}
                  >
                    <span className="shrink-0">{item.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-medium uppercase tracking-wide opacity-70">
                        {item.label}
                      </p>
                      <p className="text-xs font-medium truncate">{item.value}</p>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">{item.label}: {item.value}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}

export default QuickSettingsCard;
