'use client';

/**
 * PluginGroupedList - Displays plugins grouped by type or capability
 * Features: Collapsible groups, group counts, responsive design
 */

import React, { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import type { Plugin, PluginType, PluginCapability } from '@/types/plugin';
import { PluginCard } from './plugin-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  ChevronDown,
  Code2,
  FileCode2,
  Layers,
  Wrench,
  Zap,
  Palette,
  Terminal,
  LayoutGrid,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type GroupBy = 'type' | 'capability' | 'status';
type ViewMode = 'grid' | 'list';

interface PluginGroupedListProps {
  plugins: Plugin[];
  groupBy: GroupBy;
  viewMode?: ViewMode;
  onToggle: (plugin: Plugin) => void;
  onConfigure: (plugin: Plugin) => void;
  onUninstall: (plugin: Plugin) => void;
  onViewDetails?: (plugin: Plugin) => void;
  defaultExpandedGroups?: string[];
}

const TYPE_INFO: Record<PluginType, { icon: React.ElementType; label: string; color: string }> = {
  frontend: { icon: Code2, label: 'Frontend', color: 'bg-blue-500' },
  python: { icon: FileCode2, label: 'Python', color: 'bg-yellow-500' },
  hybrid: { icon: Layers, label: 'Hybrid', color: 'bg-purple-500' },
};

const CAPABILITY_INFO: Record<PluginCapability, { icon: React.ElementType; label: string; color: string }> = {
  tools: { icon: Wrench, label: 'Tools', color: 'bg-blue-500' },
  components: { icon: Layers, label: 'Components', color: 'bg-purple-500' },
  modes: { icon: Zap, label: 'Modes', color: 'bg-amber-500' },
  skills: { icon: Code2, label: 'Skills', color: 'bg-emerald-500' },
  themes: { icon: Palette, label: 'Themes', color: 'bg-pink-500' },
  commands: { icon: Terminal, label: 'Commands', color: 'bg-cyan-500' },
  hooks: { icon: Code2, label: 'Hooks', color: 'bg-indigo-500' },
  processors: { icon: Code2, label: 'Processors', color: 'bg-orange-500' },
  providers: { icon: Code2, label: 'Providers', color: 'bg-teal-500' },
  exporters: { icon: Code2, label: 'Exporters', color: 'bg-rose-500' },
  importers: { icon: Code2, label: 'Importers', color: 'bg-lime-500' },
  a2ui: { icon: LayoutGrid, label: 'A2UI', color: 'bg-violet-500' },
  python: { icon: FileCode2, label: 'Python', color: 'bg-yellow-500' },
  scheduler: { icon: Code2, label: 'Scheduler', color: 'bg-sky-500' },
};

const STATUS_INFO: Record<string, { label: string; color: string }> = {
  enabled: { label: 'Enabled', color: 'bg-green-500' },
  disabled: { label: 'Disabled', color: 'bg-slate-500' },
  error: { label: 'Error', color: 'bg-red-500' },
  loading: { label: 'Loading', color: 'bg-blue-500' },
  loaded: { label: 'Loaded', color: 'bg-slate-500' },
  installed: { label: 'Installed', color: 'bg-slate-500' },
  discovered: { label: 'Discovered', color: 'bg-slate-500' },
  enabling: { label: 'Enabling', color: 'bg-blue-500' },
  disabling: { label: 'Disabling', color: 'bg-blue-500' },
};

interface PluginGroup {
  key: string;
  label: string;
  icon?: React.ElementType;
  color: string;
  plugins: Plugin[];
}

export function PluginGroupedList({
  plugins,
  groupBy,
  viewMode = 'grid',
  onToggle,
  onConfigure,
  onUninstall,
  onViewDetails,
  defaultExpandedGroups,
}: PluginGroupedListProps) {
  const t = useTranslations('pluginGroupedList');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(defaultExpandedGroups || [])
  );

  const groups = useMemo(() => {
    const groupMap = new Map<string, Plugin[]>();

    plugins.forEach((plugin) => {
      let keys: string[] = [];

      switch (groupBy) {
        case 'type':
          keys = [plugin.manifest.type];
          break;
        case 'capability':
          keys = plugin.manifest.capabilities;
          break;
        case 'status':
          keys = [plugin.status];
          break;
      }

      keys.forEach((key) => {
        if (!groupMap.has(key)) {
          groupMap.set(key, []);
        }
        groupMap.get(key)!.push(plugin);
      });
    });

    const result: PluginGroup[] = [];
    groupMap.forEach((groupPlugins, key) => {
      let info: { icon?: React.ElementType; label: string; color: string };

      switch (groupBy) {
        case 'type':
          info = TYPE_INFO[key as PluginType] || { label: key, color: 'bg-slate-500' };
          break;
        case 'capability':
          info = CAPABILITY_INFO[key as PluginCapability] || { label: key, color: 'bg-slate-500' };
          break;
        case 'status':
          info = STATUS_INFO[key] || { label: key, color: 'bg-slate-500' };
          break;
        default:
          info = { label: key, color: 'bg-slate-500' };
      }

      result.push({
        key,
        label: info.label,
        icon: 'icon' in info ? info.icon : undefined,
        color: info.color,
        plugins: groupPlugins.sort((a, b) => 
          a.manifest.name.localeCompare(b.manifest.name)
        ),
      });
    });

    return result.sort((a, b) => b.plugins.length - a.plugins.length);
  }, [plugins, groupBy]);

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedGroups(new Set(groups.map((g) => g.key)));
  };

  const collapseAll = () => {
    setExpandedGroups(new Set());
  };

  if (groups.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Group Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{t('groupedBy', { by: groupBy })}</span>
          <Badge variant="secondary" className="text-xs">
            {groups.length} {t('groups')}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={expandAll}>
            {t('expandAll')}
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={collapseAll}>
            {t('collapseAll')}
          </Button>
        </div>
      </div>

      {/* Groups */}
      <div className="space-y-2">
        {groups.map((group) => {
          const isExpanded = expandedGroups.has(group.key);
          const Icon = group.icon;

          return (
            <Collapsible
              key={group.key}
              open={isExpanded}
              onOpenChange={() => toggleGroup(group.key)}
            >
              <CollapsibleTrigger asChild>
                <button className="w-full flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors group">
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', group.color + '/20')}>
                    {Icon && <Icon className={cn('h-4 w-4', group.color.replace('bg-', 'text-'))} />}
                  </div>
                  <div className="flex-1 text-left">
                    <span className="font-medium text-sm">{group.label}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {group.plugins.length}
                  </Badge>
                  <ChevronDown className={cn(
                    'h-4 w-4 text-muted-foreground transition-transform',
                    isExpanded && 'rotate-180'
                  )} />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <div className={cn(
                  viewMode === 'grid'
                    ? 'grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'
                    : 'flex flex-col gap-2'
                )}>
                  {group.plugins.map((plugin) => (
                    <PluginCard
                      key={plugin.manifest.id}
                      plugin={plugin}
                      variant={viewMode === 'list' ? 'compact' : 'card'}
                      onToggle={() => onToggle(plugin)}
                      onConfigure={() => onConfigure(plugin)}
                      onUninstall={() => onUninstall(plugin)}
                      onViewDetails={onViewDetails ? () => onViewDetails(plugin) : undefined}
                    />
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
}

export default PluginGroupedList;
