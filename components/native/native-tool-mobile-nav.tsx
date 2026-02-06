'use client';

import { useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { NATIVE_TOOLS, type NativeToolItem } from './native-tool-sidebar';

interface NativeToolMobileNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  className?: string;
}

export function NativeToolMobileNav({
  activeTab,
  onTabChange,
  className,
}: NativeToolMobileNavProps) {
  const t = useTranslations('nativeToolsPage');
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const activeButton = activeRef.current;
      const containerRect = container.getBoundingClientRect();
      const buttonRect = activeButton.getBoundingClientRect();

      const scrollLeft =
        buttonRect.left - containerRect.left - containerRect.width / 2 + buttonRect.width / 2;
      // Check if scrollBy is available (not in JSDOM)
      if (typeof container.scrollBy === 'function') {
        container.scrollBy({ left: scrollLeft, behavior: 'smooth' });
      }
    }
  }, [activeTab]);

  return (
    <nav
      className={cn(
        'border-t bg-background/95 backdrop-blur-md',
        'safe-area-inset-bottom',
        className
      )}
      role="navigation"
      aria-label="Native tools"
    >
      <ScrollArea className="w-full" ref={scrollRef}>
        <div className="flex items-center gap-1 p-2 min-w-max">
          {NATIVE_TOOLS.map((tool: NativeToolItem) => {
            const Icon = tool.icon;
            const isActive = activeTab === tool.id;
            const label = t(`tabs.${tool.labelKey}`);

            return (
              <Button
                key={tool.id}
                ref={isActive ? activeRef : undefined}
                variant={isActive ? 'secondary' : 'ghost'}
                size="sm"
                className={cn(
                  'flex flex-col items-center gap-1 h-auto py-2 px-3 min-w-[4.5rem]',
                  'transition-all duration-200',
                  isActive && 'bg-primary/10 text-primary',
                  !isActive && 'text-muted-foreground hover:text-foreground'
                )}
                onClick={() => onTabChange(tool.id)}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className={cn('h-5 w-5', isActive && 'text-primary')} />
                <span className="text-[10px] font-medium whitespace-nowrap">{label}</span>
                {isActive && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-primary" />
                )}
              </Button>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" className="h-1.5" />
      </ScrollArea>
    </nav>
  );
}

export default NativeToolMobileNav;
