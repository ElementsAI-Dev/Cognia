'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  Settings2,
  RotateCcw,
  Zap,
  Hand,
  Blend,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useMcpStore } from '@/stores';
import { DEFAULT_TOOL_SELECTION_CONFIG } from '@/types/mcp';
import type { McpToolSelectionStrategy } from '@/types/mcp';
import { cn } from '@/lib/utils';

export interface MCPToolSelectionConfigProps {
  className?: string;
}

const STRATEGY_OPTIONS: Array<{
  value: McpToolSelectionStrategy;
  icon: React.ReactNode;
  labelKey: string;
  descKey: string;
}> = [
  {
    value: 'auto',
    icon: <Zap className="h-4 w-4" />,
    labelKey: 'strategyAuto',
    descKey: 'strategyAutoDesc',
  },
  {
    value: 'manual',
    icon: <Hand className="h-4 w-4" />,
    labelKey: 'strategyManual',
    descKey: 'strategyManualDesc',
  },
  {
    value: 'hybrid',
    icon: <Blend className="h-4 w-4" />,
    labelKey: 'strategyHybrid',
    descKey: 'strategyHybridDesc',
  },
];

export function MCPToolSelectionConfig({ className }: MCPToolSelectionConfigProps) {
  const t = useTranslations('mcp');
  const toolSelectionConfig = useMcpStore((state) => state.toolSelectionConfig);
  const setToolSelectionConfig = useMcpStore((state) => state.setToolSelectionConfig);
  const servers = useMcpStore((state) => state.servers);

  const connectedServers = useMemo(
    () => servers.filter((s) => s.status.type === 'connected'),
    [servers]
  );

  const handleReset = () => {
    setToolSelectionConfig(DEFAULT_TOOL_SELECTION_CONFIG);
  };

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            {t('toolSelection')}
          </CardTitle>
          <CardDescription>{t('selectionStrategy')}</CardDescription>
        </div>
        <Button variant="ghost" size="sm" onClick={handleReset}>
          <RotateCcw className="h-3.5 w-3.5 mr-1" />
          {t('resetDefaults')}
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Strategy selector */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">{t('selectionStrategy')}</Label>
          <div className="grid grid-cols-3 gap-2">
            {STRATEGY_OPTIONS.map((option) => (
              <button
                key={option.value}
                className={cn(
                  'flex flex-col items-center gap-1.5 rounded-md border p-3 text-center transition-colors hover:bg-accent',
                  toolSelectionConfig.strategy === option.value &&
                    'border-primary bg-primary/5'
                )}
                onClick={() => setToolSelectionConfig({ strategy: option.value })}
              >
                {option.icon}
                <span className="text-xs font-medium">{t(option.labelKey)}</span>
                <span className="text-xs text-muted-foreground line-clamp-2">
                  {t(option.descKey)}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Max tools slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">{t('maxToolsLimit')}</Label>
            <Badge variant="outline" className="text-xs">
              {toolSelectionConfig.maxTools}
            </Badge>
          </div>
          <Slider
            value={[toolSelectionConfig.maxTools]}
            onValueChange={([value]) => setToolSelectionConfig({ maxTools: value })}
            min={1}
            max={50}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>1</span>
            <span>50</span>
          </div>
        </div>

        {/* Relevance scoring toggle */}
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium">{t('relevanceScoring')}</Label>
          </div>
          <Switch
            checked={toolSelectionConfig.enableRelevanceScoring}
            onCheckedChange={(checked) =>
              setToolSelectionConfig({ enableRelevanceScoring: checked })
            }
          />
        </div>

        {/* History boost toggle */}
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium">{t('historyBoost')}</Label>
          </div>
          <Switch
            checked={toolSelectionConfig.useHistoryBoost}
            onCheckedChange={(checked) =>
              setToolSelectionConfig({ useHistoryBoost: checked })
            }
          />
        </div>

        {/* Min relevance slider */}
        {toolSelectionConfig.enableRelevanceScoring && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">{t('minRelevance')}</Label>
              <Badge variant="outline" className="text-xs">
                {(toolSelectionConfig.minRelevanceScore * 100).toFixed(0)}%
              </Badge>
            </div>
            <Slider
              value={[toolSelectionConfig.minRelevanceScore * 100]}
              onValueChange={([value]) =>
                setToolSelectionConfig({ minRelevanceScore: value / 100 })
              }
              min={0}
              max={100}
              step={5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0%</span>
              <span>100%</span>
            </div>
          </div>
        )}

        {/* Priority servers */}
        {connectedServers.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t('priorityServers')}</Label>
            <div className="flex flex-wrap gap-1.5">
              {connectedServers.map((server) => {
                const isPriority = toolSelectionConfig.priorityServerIds?.includes(server.id);
                return (
                  <Badge
                    key={server.id}
                    variant={isPriority ? 'default' : 'outline'}
                    className="cursor-pointer text-xs"
                    onClick={() => {
                      const current = toolSelectionConfig.priorityServerIds || [];
                      const next = isPriority
                        ? current.filter((id) => id !== server.id)
                        : [...current, server.id];
                      setToolSelectionConfig({ priorityServerIds: next });
                    }}
                  >
                    {server.name}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
