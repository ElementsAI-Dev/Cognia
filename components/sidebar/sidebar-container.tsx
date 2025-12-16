'use client';

/**
 * SidebarContainer - main sidebar wrapper
 */

import { Plus, Settings, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useSessionStore, useSettingsStore, useUIStore } from '@/stores';
import { SessionList } from './session-list';
import { cn } from '@/lib/utils';

interface SidebarContainerProps {
  collapsed?: boolean;
}

export function SidebarContainer({ collapsed = false }: SidebarContainerProps) {
  const createSession = useSessionStore((state) => state.createSession);
  const theme = useSettingsStore((state) => state.theme);
  const setTheme = useSettingsStore((state) => state.setTheme);
  const openModal = useUIStore((state) => state.openModal);

  const handleNewChat = () => {
    createSession();
  };

  const toggleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-3">
          {!collapsed && (
            <span className="text-lg font-semibold text-foreground">Cognia</span>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size={collapsed ? 'icon' : 'default'}
                className={cn(collapsed && 'w-full')}
                onClick={handleNewChat}
              >
                <Plus className="h-4 w-4" />
                {!collapsed && <span className="ml-2">New Chat</span>}
              </Button>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right">New Chat</TooltipContent>}
          </Tooltip>
        </div>

        <Separator />

        {/* Session list */}
        <ScrollArea className="flex-1">
          <SessionList collapsed={collapsed} />
        </ScrollArea>

        <Separator />

        {/* Footer */}
        <div className={cn('flex items-center gap-1 p-2', collapsed ? 'flex-col' : 'flex-row')}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
              >
                {theme === 'dark' ? (
                  <Moon className="h-4 w-4" />
                ) : theme === 'light' ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <div className="relative h-4 w-4">
                    <Sun className="absolute h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                  </div>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side={collapsed ? 'right' : 'top'}>
              Theme: {theme}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => openModal('settings')}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side={collapsed ? 'right' : 'top'}>
              Settings
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}

export default SidebarContainer;
