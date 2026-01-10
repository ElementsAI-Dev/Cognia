'use client';

import { useState, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FolderKanban,
  Settings,
  Menu,
  Plus,
  MoreHorizontal,
  ImageIcon,
  Presentation,
  Home,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useSessionStore, useUIStore } from '@/stores';

interface NavItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  href?: string;
  action?: () => void;
  badge?: number;
}

interface MobileBottomNavProps {
  className?: string;
}

export function MobileBottomNav({ className }: MobileBottomNavProps) {
  const t = useTranslations('mobileNav');
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const createSession = useSessionStore((state) => state.createSession);
  const sessions = useSessionStore((state) => state.sessions);
  const setMobileNavOpen = useUIStore((state) => state.setMobileNavOpen);
  const openModal = useUIStore((state) => state.openModal);

  // Hide on scroll down, show on scroll up
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const handleNewChat = useCallback(() => {
    createSession();
  }, [createSession]);

  const handleOpenSidebar = useCallback(() => {
    setMobileNavOpen(true);
  }, [setMobileNavOpen]);

  const handleOpenSettings = useCallback(() => {
    openModal('settings');
    setMoreOpen(false);
  }, [openModal]);

  const primaryNavItems: NavItem[] = [
    {
      id: 'home',
      icon: <Home className="h-5 w-5" />,
      label: t('home'),
      href: '/',
    },
    {
      id: 'sessions',
      icon: <Menu className="h-5 w-5" />,
      label: t('sessions'),
      action: handleOpenSidebar,
      badge: sessions.length > 0 ? sessions.length : undefined,
    },
    {
      id: 'new',
      icon: <Plus className="h-5 w-5" />,
      label: t('newChat'),
      action: handleNewChat,
    },
    {
      id: 'projects',
      icon: <FolderKanban className="h-5 w-5" />,
      label: t('projects'),
      href: '/projects',
    },
    {
      id: 'more',
      icon: <MoreHorizontal className="h-5 w-5" />,
      label: t('more'),
      action: () => setMoreOpen(true),
    },
  ];

  const moreNavItems: NavItem[] = [
    {
      id: 'settings',
      icon: <Settings className="h-5 w-5" />,
      label: t('settings'),
      action: handleOpenSettings,
    },
    {
      id: 'ppt-studio',
      icon: <Presentation className="h-5 w-5" />,
      label: t('pptStudio'),
      href: '/ppt',
    },
    {
      id: 'image-studio',
      icon: <ImageIcon className="h-5 w-5" />,
      label: t('imageStudio'),
      href: '/image-studio',
    },
  ];

  const isActive = (item: NavItem) => {
    if (item.href) {
      return pathname === item.href;
    }
    return false;
  };

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 md:hidden',
        'bg-background/95 backdrop-blur-md border-t border-border',
        'transition-transform duration-300 ease-in-out',
        'safe-area-inset-bottom',
        !isVisible && 'translate-y-full',
        className
      )}
    >
      <div className="flex items-center justify-around h-16 px-2">
        {primaryNavItems.map((item) => {
          const active = isActive(item);

          if (item.id === 'more') {
            return (
              <Popover key={item.id} open={moreOpen} onOpenChange={setMoreOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      'flex flex-col items-center justify-center h-14 w-14 gap-0.5 p-1',
                      'text-muted-foreground hover:text-foreground',
                      'transition-colors'
                    )}
                  >
                    {item.icon}
                    <span className="text-[10px] font-medium">{item.label}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  side="top"
                  align="end"
                  className="w-48 p-2"
                >
                  <div className="grid gap-1">
                    {moreNavItems.map((moreItem) => (
                      moreItem.href ? (
                        <Link key={moreItem.id} href={moreItem.href}>
                          <Button
                            variant="ghost"
                            className="w-full justify-start gap-2"
                            onClick={() => setMoreOpen(false)}
                          >
                            {moreItem.icon}
                            <span>{moreItem.label}</span>
                          </Button>
                        </Link>
                      ) : (
                        <Button
                          key={moreItem.id}
                          variant="ghost"
                          className="w-full justify-start gap-2"
                          onClick={moreItem.action}
                        >
                          {moreItem.icon}
                          <span>{moreItem.label}</span>
                        </Button>
                      )
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            );
          }

          if (item.href) {
            return (
              <Link key={item.id} href={item.href}>
                <Button
                  variant="ghost"
                  className={cn(
                    'flex flex-col items-center justify-center h-14 w-14 gap-0.5 p-1 relative',
                    'transition-colors',
                    active
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {item.icon}
                  <span className="text-[10px] font-medium">{item.label}</span>
                  {active && (
                    <span className="absolute top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                  )}
                </Button>
              </Link>
            );
          }

          return (
            <Button
              key={item.id}
              variant="ghost"
              className={cn(
                'flex flex-col items-center justify-center h-14 w-14 gap-0.5 p-1 relative',
                'text-muted-foreground hover:text-foreground',
                'transition-colors'
              )}
              onClick={item.action}
            >
              {item.icon}
              <span className="text-[10px] font-medium">{item.label}</span>
              {item.badge && (
                <span className="absolute top-1 right-2 min-w-[16px] h-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center px-1">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </Button>
          );
        })}
      </div>
    </nav>
  );
}

export default MobileBottomNav;
