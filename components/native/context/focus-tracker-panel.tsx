'use client';

import { useTranslations } from 'next-intl';
import { useFocusTracking, AppUsageStats, FocusSession } from '@/hooks/context';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, Pause, Trash2, Clock, Monitor, BarChart3 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { EmptyState } from '@/components/layout/feedback/empty-state';
import { NativeToolHeader } from '../layout/native-tool-header';
import { cn, formatTime } from '@/lib/utils';

interface FocusTrackerPanelProps {
  className?: string;
}

export function FocusTrackerPanel({ className }: FocusTrackerPanelProps) {
  const t = useTranslations('focusTrackerPanel');
  const {
    isTracking,
    currentFocus,
    recentSessions,
    appStats,
    todaySummary,
    startTracking,
    stopTracking,
    clearFocusHistory,
  } = useFocusTracking();

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  const totalTodayMs = todaySummary?.total_active_ms ?? 0;

  return (
    <div className={cn('flex flex-col h-full min-h-0 overflow-hidden bg-background', className)}>
      <NativeToolHeader
        icon={Monitor}
        iconClassName={isTracking ? 'bg-green-500/10 text-green-500' : 'bg-muted text-muted-foreground'}
        title={t('title')}
        badge={
          isTracking ? (
            <span className="flex items-center gap-1 text-xs text-green-500">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              Active
            </span>
          ) : undefined
        }
        description={
          todaySummary
            ? `${formatDuration(todaySummary.total_active_ms)} today`
            : undefined
        }
        actions={
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isTracking ? 'destructive' : 'default'}
                size="sm"
                className="h-8"
                onClick={isTracking ? stopTracking : startTracking}
              >
                {isTracking ? (
                  <>
                    <Pause className="h-4 w-4 mr-1.5" />
                    {t('stop')}
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-1.5" />
                    {t('start')}
                  </>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('toggleTracking')}</TooltipContent>
          </Tooltip>
        }
      />

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-3 space-y-4">
          {!isTracking &&
            !currentFocus &&
            !todaySummary &&
            appStats.length === 0 &&
            recentSessions.length === 0 && (
              <EmptyState
                icon={Monitor}
                title={t('noTrackingData')}
                description={t('startTrackingHint')}
                compact
              />
            )}

          {currentFocus && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  {t('currentFocus')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium">{currentFocus.app_name}</p>
                <p className="text-sm text-muted-foreground truncate">
                  {currentFocus.window_title}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  <Clock className="h-3 w-3 inline mr-1" />
                  {formatDuration(currentFocus.duration_ms)}
                </p>
              </CardContent>
            </Card>
          )}

          {todaySummary && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  {t('todaySummary')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{t('totalActiveTime')}</span>
                    <span className="font-medium">{formatDuration(totalTodayMs)}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {todaySummary.switch_count} {t('appSwitches')}
                  </div>
                </div>

                {todaySummary.top_apps.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-muted-foreground">{t('topApps')}</div>
                    {todaySummary.top_apps.slice(0, 5).map(([app, time]) => (
                      <div key={app} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="truncate">{app}</span>
                          <span>{formatDuration(time)}</span>
                        </div>
                        <Progress
                          value={totalTodayMs > 0 ? (time / totalTodayMs) * 100 : 0}
                          className="h-1"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {appStats.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t('appStatistics')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {appStats.slice(0, 10).map((stat) => (
                    <AppStatItem key={stat.app_name} stat={stat} t={t} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {recentSessions.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t('recentSessions')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {recentSessions.slice(0, 10).map((session, index) => (
                    <SessionItem
                      key={`${session.start_time}-${index}`}
                      session={session}
                      formatDuration={formatDuration}
                      formatTime={formatTime}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>

      <div className="p-2 border-t flex justify-end shrink-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFocusHistory}
              className="text-xs text-destructive"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              {t('clearHistory')}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('clearFocusHistory')}</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

function AppStatItem({ stat, t }: { stat: AppUsageStats; t: (key: string) => string }) {
  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
  };

  return (
    <div className="flex items-center justify-between text-sm">
      <div className="min-w-0 flex-1">
        <p className="font-medium truncate">{stat.app_name}</p>
        <p className="text-xs text-muted-foreground">
          {stat.session_count} {t('sessions')} · {t('avg')} {formatDuration(stat.avg_session_ms)}
        </p>
      </div>
      <div className="text-right">
        <p className="font-medium">{formatDuration(stat.total_time_ms)}</p>
      </div>
    </div>
  );
}

function SessionItem({
  session,
  formatDuration,
  formatTime,
}: {
  session: FocusSession;
  formatDuration: (ms: number) => string;
  formatTime: (ts: number) => string;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <div className="min-w-0 flex-1">
        <p className="font-medium truncate">{session.app_name}</p>
        <p className="text-xs text-muted-foreground truncate">{session.window_title}</p>
      </div>
      <div className="text-right text-xs text-muted-foreground whitespace-nowrap">
        <p>{formatTime(session.start_time)}</p>
        <p>{formatDuration(session.duration_ms)}</p>
      </div>
    </div>
  );
}
