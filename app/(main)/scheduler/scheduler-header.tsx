'use client';

/**
 * SchedulerHeader - Title bar, status indicator, action buttons, and tab navigation
 */

import { useTranslations } from 'next-intl';
import {
  Plus,
  RefreshCw,
  Calendar,
  Activity,
  Settings,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import type { SchedulerStatus } from '@/stores/scheduler/scheduler-store';

interface SchedulerHeaderProps {
  schedulerStatus: SchedulerStatus;
  activePluginCount: number;
  isRefreshing: boolean;
  isSystemView: boolean;
  schedulerTab: 'app' | 'system';
  onTabChange: (tab: 'app' | 'system') => void;
  onRefresh: () => void;
  onCleanup: () => void;
  onCreate: () => void;
}

export function SchedulerHeader({
  schedulerStatus,
  activePluginCount,
  isRefreshing,
  isSystemView,
  schedulerTab,
  onTabChange,
  onRefresh,
  onCleanup,
  onCreate,
}: SchedulerHeaderProps) {
  const t = useTranslations('scheduler');

  return (
    <div className="border-b bg-gradient-to-b from-background to-muted/5">
      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
                {t('title') || 'Task Scheduler'}
              </h1>
              <div className="mt-0.5 flex items-center gap-2">
                <div className={`h-1.5 w-1.5 rounded-full ${schedulerStatus === 'running' ? 'bg-green-500 animate-pulse' : schedulerStatus === 'stopped' ? 'bg-red-500' : 'bg-gray-400'}`} />
                <span className="text-xs text-muted-foreground">
                  {schedulerStatus === 'running' ? t('schedulerRunning') || 'Running' : schedulerStatus === 'stopped' ? t('schedulerStopped') || 'Stopped' : t('schedulerIdle') || 'Idle'}
                </span>
                {activePluginCount > 0 && (
                  <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                    {activePluginCount} plugin
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={onCleanup} className="h-8 w-8 p-0">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('cleanupOldExecutions') || 'Cleanup old executions (30d)'}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={isRefreshing} className="h-8 gap-1.5">
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{t('refresh') || 'Refresh'}</span>
          </Button>
          <Button size="sm" onClick={onCreate} className="h-8 gap-1.5 bg-primary shadow-sm">
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">
              {isSystemView ? t('createSystemTask') || 'New System Task' : t('createTask') || 'New Task'}
            </span>
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="px-4 sm:px-6">
        <Tabs value={schedulerTab} onValueChange={(v) => onTabChange(v as 'app' | 'system')}>
          <TabsList className="h-9 w-full sm:w-auto">
            <TabsTrigger value="app" className="gap-1.5 text-xs">
              <Activity className="h-3.5 w-3.5" />
              {t('appScheduler') || 'App Scheduler'}
            </TabsTrigger>
            <TabsTrigger value="system" className="gap-1.5 text-xs">
              <Settings className="h-3.5 w-3.5" />
              {t('systemScheduler') || 'System Scheduler'}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
}
