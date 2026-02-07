'use client';

/**
 * SidebarContainer - main sidebar wrapper
 * 
 * Features:
 * - Session search and filtering
 * - Session grouping by time (today, yesterday, last week, older)
 * - Quick actions panel
 * - Usage stats, background tasks, workflows widgets
 * - Theme toggle, keyboard shortcuts, projects link, settings
 */

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  Plus,
  Settings,
  Moon,
  Sun,
  Monitor,
  FolderKanban,
  Keyboard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useSessionStore, useSettingsStore, useUIStore } from '@/stores';
import { cn } from '@/lib/utils';
import { SessionSearch } from './sessions/session-search';
import { SessionGroup, useSessionGroups } from './sessions/session-group';
import { SidebarQuickActions } from './widgets/sidebar-quick-actions';
import { SidebarUsageStats } from './widgets/sidebar-usage-stats';
import { SidebarBackgroundTasks } from './widgets/sidebar-background-tasks';
import { SidebarAgentTeams } from './widgets/sidebar-agent-teams';
import { SidebarWorkflows } from './widgets/sidebar-workflows';
import type { Session } from '@/types';

interface SidebarContainerProps {
  collapsed?: boolean;
}

export function SidebarContainer({ collapsed = false }: SidebarContainerProps) {
  const t = useTranslations('sidebar');
  
  const sessions = useSessionStore((state) => state.sessions);
  const createSession = useSessionStore((state) => state.createSession);
  const theme = useSettingsStore((state) => state.theme);
  const setTheme = useSettingsStore((state) => state.setTheme);
  const openModal = useUIStore((state) => state.openModal);
  const setKeyboardShortcutsOpen = useUIStore((state) => state.setKeyboardShortcutsOpen);

  const [filteredSessions, setFilteredSessions] = useState<Session[] | null>(null);
  const displaySessions = filteredSessions ?? sessions;
  const groups = useSessionGroups(displaySessions);

  const handleNewChat = useCallback(() => {
    createSession();
  }, [createSession]);

  const cycleTheme = useCallback(() => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  }, [theme, setTheme]);

  const getThemeIcon = () => {
    if (theme === 'dark') return <Moon className="h-4 w-4" />;
    if (theme === 'light') return <Sun className="h-4 w-4" />;
    return <Monitor className="h-4 w-4" />;
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className={cn(
          "flex items-center gap-2 p-3",
          collapsed ? "flex-col" : "justify-between"
        )}>
          {!collapsed && (
            <span className="text-lg font-semibold text-foreground">Cognia</span>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="default"
                size={collapsed ? 'icon' : 'default'}
                className={cn(collapsed && 'w-full')}
                onClick={handleNewChat}
              >
                <Plus className="h-4 w-4" />
                {!collapsed && <span className="ml-2">{t('newChat')}</span>}
              </Button>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right">{t('newChat')}</TooltipContent>}
          </Tooltip>
        </div>

        <Separator />

        {/* Search */}
        <div className="p-2">
          <SessionSearch
            collapsed={collapsed}
            onResultsChange={setFilteredSessions}
          />
        </div>

        <Separator />

        {/* Session Groups */}
        <ScrollArea className="flex-1">
          <div className="space-y-2 p-2">
            {groups.pinned.length > 0 && (
              <SessionGroup
                title={t('pinned')}
                type="pinned"
                sessions={groups.pinned}
                collapsed={collapsed}
                defaultOpen
              />
            )}
            {groups.today.length > 0 && (
              <SessionGroup
                title={t('today')}
                type="today"
                sessions={groups.today}
                collapsed={collapsed}
                defaultOpen
              />
            )}
            {groups.yesterday.length > 0 && (
              <SessionGroup
                title={t('yesterday')}
                type="yesterday"
                sessions={groups.yesterday}
                collapsed={collapsed}
              />
            )}
            {groups.lastWeek.length > 0 && (
              <SessionGroup
                title={t('lastWeek')}
                type="lastWeek"
                sessions={groups.lastWeek}
                collapsed={collapsed}
              />
            )}
            {groups.older.length > 0 && (
              <SessionGroup
                title={t('older')}
                type="older"
                sessions={groups.older}
                collapsed={collapsed}
                defaultOpen={false}
              />
            )}

            {displaySessions.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">{t('noConversations')}</p>
                <p className="text-xs mt-1">{t('startNewChat')}</p>
              </div>
            )}
          </div>
        </ScrollArea>

        <Separator />

        {/* Quick Actions & Widgets */}
        {!collapsed && (
          <div className="p-2 space-y-2">
            <SidebarQuickActions collapsed={collapsed} />
            <SidebarUsageStats collapsed={collapsed} />
            <SidebarBackgroundTasks collapsed={collapsed} />
            <SidebarAgentTeams collapsed={collapsed} />
            <SidebarWorkflows collapsed={collapsed} />
          </div>
        )}

        <Separator />

        {/* Footer */}
        <div className={cn(
          'flex items-center gap-0.5 sm:gap-1 p-1.5 sm:p-2',
          collapsed ? 'flex-col' : 'flex-row justify-between'
        )}>
          <div className="flex items-center gap-0.5 sm:gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={cycleTheme}>
                  {getThemeIcon()}
                </Button>
              </TooltipTrigger>
              <TooltipContent side={collapsed ? 'right' : 'top'}>
                {t('themeLabel', { theme })}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setKeyboardShortcutsOpen(true)}
                >
                  <Keyboard className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side={collapsed ? 'right' : 'top'}>
                {t('keyboardShortcuts')}
              </TooltipContent>
            </Tooltip>
          </div>

          <div className="flex items-center gap-0.5 sm:gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/projects">
                  <Button variant="ghost" size="icon">
                    <FolderKanban className="h-4 w-4" />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent side={collapsed ? 'right' : 'top'}>
                {t('projects')}
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
                {t('settings')}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

export default SidebarContainer;
