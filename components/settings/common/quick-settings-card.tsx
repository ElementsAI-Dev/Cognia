'use client';

/**
 * QuickSettingsCard - Summary panel showing key settings at a glance
 * Enhanced to match design spec with primary/secondary stats layout
 */

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  Settings,
  Cpu,
  Star,
  Clock,
  Check,
  ChevronDown,
  ChevronUp,
  Zap,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { useSettingsStore } from '@/stores';
import { PROVIDERS } from '@/types/provider';

export function QuickSettingsCard() {
  const t = useTranslations('settings');
  const [isExpanded, setIsExpanded] = useState(true);

  const providerSettings = useSettingsStore((state) => state.providerSettings);
  const defaultProvider = useSettingsStore((state) => state.defaultProvider);

  // Calculate statistics
  const stats = useMemo(() => {
    const configured = Object.entries(providerSettings).filter(
      ([id, settings]) => settings?.enabled && (settings?.apiKey || id === 'ollama')
    );

    const totalModels = configured.reduce((acc, [providerId]) => {
      const provider = PROVIDERS[providerId];
      return acc + (provider?.models?.length || 0);
    }, 0);

    const defaultProviderData = PROVIDERS[defaultProvider];
    const defaultModel =
      providerSettings[defaultProvider]?.defaultModel ||
      defaultProviderData?.defaultModel ||
      defaultProviderData?.models?.[0]?.name;

    return {
      configuredCount: configured.length,
      totalModels,
      defaultProvider: defaultProviderData?.name || defaultProvider,
      defaultModel: defaultModel || 'Not set',
      activeCount: configured.filter(([, s]) => s?.enabled).length,
    };
  }, [providerSettings, defaultProvider]);

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <Card className="border">
        <CollapsibleTrigger asChild>
          <CardHeader className="py-3 px-4 cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">
                  {t('quickOverview') || 'Quick Overview'}
                </span>
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 px-4 space-y-4">
            {/* Primary Stats */}
            <div className="grid grid-cols-2 gap-4">
              {/* Providers Stat */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                    {t('quickProviders') || 'Providers'}
                  </p>
                  <p className="text-2xl font-bold">{stats.configuredCount}</p>
                </div>
                <Badge
                  variant={stats.configuredCount > 0 ? 'default' : 'secondary'}
                  className={cn(
                    'h-7 px-2.5 text-xs',
                    stats.configuredCount > 0 && 'bg-green-600'
                  )}
                >
                  <Check className="h-3 w-3 mr-1" />
                  {stats.activeCount} {t('active') || 'active'}
                </Badge>
              </div>

              {/* Models Stat */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                    {t('quickModels') || 'Models'}
                  </p>
                  <p className="text-2xl font-bold">{stats.totalModels}</p>
                </div>
                <Badge variant="outline" className="h-7 px-2.5 text-xs">
                  <Cpu className="h-3 w-3 mr-1" />
                  {t('available') || 'available'}
                </Badge>
              </div>
            </div>

            {/* Secondary Stats */}
            <div className="grid grid-cols-3 gap-3">
              {/* Default Provider */}
              <div className="p-3 rounded-lg bg-muted/20 border space-y-1">
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                  {t('quickDefault') || 'Default Provider'}
                </p>
                <p className="text-sm font-medium truncate flex items-center gap-1.5">
                  <Settings className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  {stats.defaultProvider}
                </p>
              </div>

              {/* Default Model */}
              <div className="p-3 rounded-lg bg-muted/20 border space-y-1">
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                  {t('quickDefaultModel') || 'Default Model'}
                </p>
                <p className="text-sm font-medium truncate flex items-center gap-1.5">
                  <Star className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  {stats.defaultModel}
                </p>
              </div>

              {/* Status */}
              <div className="p-3 rounded-lg bg-muted/20 border space-y-1">
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                  {t('quickStatus') || 'Status'}
                </p>
                <p className="text-sm font-medium truncate flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  {stats.configuredCount > 0
                    ? t('ready') || 'Ready'
                    : t('notConfigured') || 'Not configured'}
                </p>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export default QuickSettingsCard;
