'use client';

/**
 * MobileBottomNav - Bottom navigation for mobile devices
 * Replaces sidebar on small screens
 */

import React from 'react';
import { useTranslations } from 'next-intl';
import {
  Puzzle,
  Store,
  RefreshCw,
  Heart,
  Settings2,
  MoreHorizontal,
  Activity,
  Code2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

// Mobile nav item type
interface MobileNavItem {
  id: string;
  icon: React.ElementType;
  labelKey: string;
  badge?: number;
  badgeVariant?: 'default' | 'destructive';
}

// Primary nav items (shown in bottom bar)
const PRIMARY_NAV_ITEMS: MobileNavItem[] = [
  { id: 'my-plugins', icon: Puzzle, labelKey: 'tabs.myPlugins' },
  { id: 'marketplace', icon: Store, labelKey: 'tabs.marketplace' },
  { id: 'updates', icon: RefreshCw, labelKey: 'tabs.updates' },
  { id: 'favorites', icon: Heart, labelKey: 'tabs.favorites' },
  { id: 'more', icon: MoreHorizontal, labelKey: 'tabs.more' },
];

// Secondary nav items (shown in "more" sheet)
const SECONDARY_NAV_ITEMS: MobileNavItem[] = [
  { id: 'analytics', icon: Activity, labelKey: 'tabs.analytics' },
  { id: 'develop', icon: Code2, labelKey: 'tabs.develop' },
  { id: 'health', icon: Heart, labelKey: 'tabs.health' },
  { id: 'settings', icon: Settings2, labelKey: 'tabs.settings' },
];

interface MobileBottomNavProps {
  /** Currently active tab ID */
  activeTab: string;
  /** Callback when tab changes */
  onTabChange: (tab: string) => void;
  /** Additional class names */
  className?: string;
  /** Dynamic badge counts */
  pluginCount?: number;
  updateCount?: number;
  favoriteCount?: number;
  errorCount?: number;
}

export function MobileBottomNav({
  activeTab,
  onTabChange,
  className,
  pluginCount = 0,
  updateCount = 0,
  favoriteCount = 0,
  errorCount = 0,
}: MobileBottomNavProps) {
  const t = useTranslations('pluginSettings');
  const [isMoreOpen, setIsMoreOpen] = React.useState(false);

  // Get badge for nav item
  const getBadge = (id: string): { count: number; variant: 'default' | 'destructive' } | null => {
    switch (id) {
      case 'my-plugins':
        return pluginCount > 0 ? { count: pluginCount, variant: 'default' } : null;
      case 'updates':
        return updateCount > 0 ? { count: updateCount, variant: 'default' } : null;
      case 'favorites':
        return favoriteCount > 0 ? { count: favoriteCount, variant: 'default' } : null;
      case 'health':
        return errorCount > 0 ? { count: errorCount, variant: 'destructive' } : null;
      default:
        return null;
    }
  };

  // Handle nav item click
  const handleNavClick = (id: string) => {
    if (id === 'more') {
      setIsMoreOpen(true);
    } else {
      onTabChange(id);
    }
  };

  // Handle secondary nav item click
  const handleSecondaryNavClick = (id: string) => {
    onTabChange(id);
    setIsMoreOpen(false);
  };

  // Render nav item
  const renderNavItem = (item: MobileNavItem, isActive: boolean) => {
    const Icon = item.icon;
    const badge = getBadge(item.id);

    return (
      <button
        key={item.id}
        onClick={() => handleNavClick(item.id)}
        className={cn(
          'flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1',
          'py-2 px-1 rounded-lg transition-colors',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          isActive ? 'text-primary' : 'text-muted-foreground',
          item.id !== 'more' && 'active:scale-95'
        )}
        aria-current={isActive ? 'page' : undefined}
        aria-label={t(item.labelKey)}
      >
        <div className="relative">
          <Icon className={cn('h-5 w-5', isActive && 'text-primary')} />
          {/* Badge */}
          {badge && badge.count > 0 && (
            <span
              className={cn(
                'absolute -top-1.5 -right-1.5',
                'h-4 min-w-4 px-1 rounded-full',
                'text-[10px] font-medium text-white',
                'flex items-center justify-center',
                badge.variant === 'destructive' ? 'bg-destructive' : 'bg-primary'
              )}
            >
              {badge.count > 99 ? '99+' : badge.count}
            </span>
          )}
        </div>
        <span className="text-[10px] font-medium truncate">
          {t(item.labelKey)}
        </span>
      </button>
    );
  };

  // Render secondary nav item (in sheet)
  const renderSecondaryNavItem = (item: MobileNavItem) => {
    const Icon = item.icon;
    const badge = getBadge(item.id);
    const isActive = activeTab === item.id;

    return (
      <Button
        key={item.id}
        variant={isActive ? 'secondary' : 'ghost'}
        className={cn(
          'w-full justify-start gap-3 h-11',
          isActive && 'bg-primary/10 text-primary'
        )}
        onClick={() => handleSecondaryNavClick(item.id)}
      >
        <Icon className="h-4 w-4" />
        <span className="flex-1 text-left">{t(item.labelKey)}</span>
        {badge && badge.count > 0 && (
          <Badge
            variant={badge.variant === 'destructive' ? 'destructive' : 'secondary'}
            className="h-5 px-1.5 text-[10px]"
          >
            {badge.count}
          </Badge>
        )}
      </Button>
    );
  };

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav
        className={cn(
          'sm:hidden fixed bottom-0 left-0 right-0 z-30',
          'border-t bg-background/95 backdrop-blur-sm',
          'pb-safe', // Safe area inset for iOS
          className
        )}
        aria-label="Mobile navigation"
      >
        <div className="grid grid-cols-5 h-14">
          {PRIMARY_NAV_ITEMS.map((item) =>
            renderNavItem(item, activeTab === item.id)
          )}
        </div>
      </nav>

      {/* More Sheet */}
      <Sheet open={isMoreOpen} onOpenChange={setIsMoreOpen}>
        <SheetContent side="bottom" className="h-auto max-h-[60vh]">
          <SheetHeader>
            <SheetTitle>{t('tabs.more')}</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-1 py-4">
            {/* Quick stats */}
            <div className="flex items-center gap-4 px-4 py-3 mb-2 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-medium">{pluginCount} {t('stats.plugins')}</span>
              </div>
              <Separator orientation="vertical" className="h-4" />
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">{updateCount} {t('stats.updates')}</span>
              </div>
              {errorCount > 0 && (
                <>
                  <Separator orientation="vertical" className="h-4" />
                  <div className="flex items-center gap-1.5 text-destructive">
                    <span className="text-xs">{errorCount} {t('stats.errors')}</span>
                  </div>
                </>
              )}
            </div>

            {/* Secondary nav items */}
            {SECONDARY_NAV_ITEMS.map(renderSecondaryNavItem)}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

export default MobileBottomNav;
