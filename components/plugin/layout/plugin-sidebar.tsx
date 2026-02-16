'use client';

/**
 * PluginSidebar - Sidebar navigation for plugin management
 * Supports collapsed (icon) and expanded (full) modes
 */

import React from 'react';
import { useTranslations } from 'next-intl';
import {
  Puzzle,
  Store,
  Activity,
  Code2,
  Heart,
  Settings2,
  RefreshCw,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';

// Navigation item type
export interface PluginNavItem {
  id: string;
  icon: LucideIcon;
  labelKey: string;
  badge?: number;
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline';
  section?: 'main' | 'quick' | 'advanced';
}

// Default navigation items
export const PLUGIN_NAV_ITEMS: PluginNavItem[] = [
  // Main section
  { id: 'my-plugins', icon: Puzzle, labelKey: 'tabs.myPlugins', section: 'main' },
  { id: 'marketplace', icon: Store, labelKey: 'tabs.marketplace', section: 'main' },
  // Quick links section
  { id: 'updates', icon: RefreshCw, labelKey: 'tabs.updates', section: 'quick' },
  { id: 'favorites', icon: Heart, labelKey: 'tabs.favorites', section: 'quick' },
  // Advanced section
  { id: 'analytics', icon: Activity, labelKey: 'tabs.analytics', section: 'advanced' },
  { id: 'develop', icon: Code2, labelKey: 'tabs.develop', section: 'advanced' },
  { id: 'health', icon: Heart, labelKey: 'tabs.health', section: 'advanced' },
  { id: 'settings', icon: Settings2, labelKey: 'tabs.settings', section: 'advanced' },
];

interface PluginSidebarProps {
  /** Currently active tab ID */
  activeTab: string;
  /** Callback when tab changes */
  onTabChange: (tab: string) => void;
  /** Whether sidebar is collapsed */
  collapsed?: boolean;
  /** Callback when collapsed state changes */
  onCollapsedChange?: (collapsed: boolean) => void;
  /** Additional class names */
  className?: string;
  /** Dynamic badge counts */
  pluginCount?: number;
  updateCount?: number;
  favoriteCount?: number;
  errorCount?: number;
  /** Custom navigation items (overrides default) */
  navItems?: PluginNavItem[];
}

export function PluginSidebar({
  activeTab,
  onTabChange,
  collapsed = false,
  onCollapsedChange,
  className,
  pluginCount = 0,
  updateCount = 0,
  favoriteCount = 0,
  errorCount = 0,
  navItems = PLUGIN_NAV_ITEMS,
}: PluginSidebarProps) {
  const t = useTranslations('pluginSettings');
  const [expandedSections, setExpandedSections] = React.useState<Set<string>>(
    new Set(['main', 'quick', 'advanced'])
  );

  // Toggle section expansion
  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  // Get badge for nav item
  const getBadge = (id: string): { count: number; variant: 'default' | 'secondary' | 'destructive' | 'outline' } | null => {
    switch (id) {
      case 'my-plugins':
        return pluginCount > 0 ? { count: pluginCount, variant: 'secondary' } : null;
      case 'updates':
        return updateCount > 0 ? { count: updateCount, variant: 'default' } : null;
      case 'favorites':
        return favoriteCount > 0 ? { count: favoriteCount, variant: 'secondary' } : null;
      case 'health':
        return errorCount > 0 ? { count: errorCount, variant: 'destructive' } : null;
      default:
        return null;
    }
  };

  // Group items by section
  const groupedItems = React.useMemo(() => {
    const groups: Record<string, PluginNavItem[]> = {
      main: [],
      quick: [],
      advanced: [],
    };
    for (const item of navItems) {
      const section = item.section || 'main';
      if (!groups[section]) {
        groups[section] = [];
      }
      groups[section].push(item);
    }
    return groups;
  }, [navItems]);

  // Render nav item
  const renderNavItem = (item: PluginNavItem) => {
    const Icon = item.icon;
    const isActive = activeTab === item.id;
    const badge = getBadge(item.id);
    const label = t(item.labelKey);

    const buttonContent = (
      <Button
        variant={isActive ? 'secondary' : 'ghost'}
        className={cn(
          'w-full justify-start gap-3 h-10',
          'transition-all duration-200',
          isActive && 'bg-primary/10 text-primary font-medium',
          !isActive && 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
          collapsed && 'justify-center px-0'
        )}
        onClick={() => onTabChange(item.id)}
        aria-current={isActive ? 'page' : undefined}
      >
        <div className="relative">
          <Icon
            className={cn(
              'shrink-0 transition-colors',
              collapsed ? 'h-5 w-5' : 'h-4 w-4',
              isActive && 'text-primary'
            )}
          />
          {/* Badge dot for collapsed mode */}
          {collapsed && badge && badge.count > 0 && (
            <span
              className={cn(
                'absolute -top-1 -right-1 h-2 w-2 rounded-full',
                badge.variant === 'destructive' ? 'bg-destructive' : 'bg-primary'
              )}
            />
          )}
        </div>
        {!collapsed && (
          <>
            <span className="flex-1 truncate text-left">{label}</span>
            {badge && badge.count > 0 && (
              <Badge
                variant={badge.variant}
                className={cn(
                  'ml-auto h-5 min-w-5 px-1.5 text-[10px] font-medium',
                  badge.variant === 'destructive' && 'bg-destructive text-destructive-foreground'
                )}
              >
                {badge.count}
              </Badge>
            )}
          </>
        )}
      </Button>
    );

    if (collapsed) {
      return (
        <Tooltip key={item.id} delayDuration={0}>
          <TooltipTrigger asChild>{buttonContent}</TooltipTrigger>
          <TooltipContent side="right" className="font-medium flex items-center gap-2">
            {label}
            {badge && badge.count > 0 && (
              <Badge variant={badge.variant} className="h-5 px-1.5 text-[10px]">
                {badge.count}
              </Badge>
            )}
          </TooltipContent>
        </Tooltip>
      );
    }

    return <div key={item.id}>{buttonContent}</div>;
  };

  // Render section
  const renderSection = (sectionId: string, items: PluginNavItem[]) => {
    if (items.length === 0) return null;

    const sectionLabels: Record<string, string> = {
      main: t('sidebar.main') || 'Main',
      quick: t('sidebar.quickLinks') || 'Quick Links',
      advanced: t('sidebar.advanced') || 'Advanced',
    };

    const isExpanded = expandedSections.has(sectionId);

    return (
      <div key={sectionId} className="flex flex-col">
        {sectionId !== 'main' && !collapsed && (
          <Collapsible open={isExpanded} onOpenChange={() => toggleSection(sectionId)}>
            <CollapsibleTrigger asChild>
              <button
                className={cn(
                  'flex items-center gap-1 px-3 py-2 text-[10px] font-semibold',
                  'text-muted-foreground uppercase tracking-wider',
                  'hover:text-foreground transition-colors'
                )}
              >
                <ChevronDown
                  className={cn(
                    'h-3 w-3 transition-transform',
                    isExpanded && 'rotate-0',
                    !isExpanded && '-rotate-90'
                  )}
                />
                {sectionLabels[sectionId]}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="flex flex-col gap-0.5 px-2">
                {items.map(renderNavItem)}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
        {(sectionId === 'main' || collapsed) && (
          <div className="flex flex-col gap-0.5 px-2">
            {sectionId === 'main' && items.map(renderNavItem)}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside
      className={cn(
        'flex flex-col h-full border-r bg-muted/30',
        'transition-all duration-300 ease-in-out',
        collapsed ? 'w-16' : 'w-56',
        className
      )}
    >
      {/* Header */}
      {!collapsed && (
        <div className="flex items-center gap-2 px-4 py-3 border-b">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Puzzle className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold truncate">{t('title')}</h2>
          </div>
        </div>
      )}

      {/* Navigation */}
      <ScrollArea className="flex-1">
        <nav
          className="flex flex-col gap-1 py-2"
          role="navigation"
          aria-label="Plugin management"
        >
          {renderSection('main', groupedItems.main)}
          {!collapsed && renderSection('quick', groupedItems.quick)}
          {!collapsed && renderSection('advanced', groupedItems.advanced)}
        </nav>
      </ScrollArea>

      {/* Collapse toggle button - Desktop only */}
      <div className="hidden lg:flex items-center justify-center p-2 border-t">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-full justify-center"
          onClick={() => onCollapsedChange?.(!collapsed)}
        >
          <ChevronDown
            className={cn(
              'h-4 w-4 transition-transform',
              collapsed ? 'rotate-90' : '-rotate-90'
            )}
          />
        </Button>
      </div>
    </aside>
  );
}

export default PluginSidebar;
