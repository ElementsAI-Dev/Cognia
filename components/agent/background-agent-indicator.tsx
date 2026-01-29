'use client';

/**
 * BackgroundAgentIndicator - Status indicator for background agents
 * Shows in the UI when agents are running in the background
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Bot,
  CheckCircle,
  XCircle,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LoadingSpinner } from '@/components/ui/loading-states';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useBackgroundAgent } from '@/hooks/agent';

interface BackgroundAgentIndicatorProps {
  className?: string;
}

export function BackgroundAgentIndicator({ className }: BackgroundAgentIndicatorProps) {
  const t = useTranslations('agent');
  const [isOpen, setIsOpen] = useState(false);

  const {
    runningAgents,
    completedAgents,
    unreadNotificationCount,
    openPanel,
  } = useBackgroundAgent();

  const hasRunning = runningAgents.length > 0;
  const totalAgents = runningAgents.length + completedAgents.length;

  // Calculate overall progress
  const overallProgress = hasRunning
    ? Math.round(runningAgents.reduce((sum, a) => sum + a.progress, 0) / runningAgents.length)
    : 0;

  if (totalAgents === 0) {
    return null;
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'relative gap-2 h-8',
            hasRunning && 'text-primary',
            className
          )}
        >
          {hasRunning ? (
            <LoadingSpinner size="sm" />
          ) : (
            <Bot className="h-4 w-4" />
          )}
          
          <span className="text-xs">
            {hasRunning ? `${runningAgents.length} ${t('running')}` : `${completedAgents.length} ${t('completed')}`}
          </span>

          {unreadNotificationCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] text-destructive-foreground flex items-center justify-center">
              {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
            </span>
          )}

          {isOpen ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 p-0">
        <div className="p-3 border-b">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">{t('backgroundAgents')}</h4>
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={openPanel}>
              {t('viewAll')}
            </Button>
          </div>

          {hasRunning && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>Overall Progress</span>
                <span>{overallProgress}%</span>
              </div>
              <Progress value={overallProgress} className="h-1.5" />
            </div>
          )}
        </div>

        <div className="max-h-[300px] overflow-y-auto">
          {/* Running agents */}
          {runningAgents.length > 0 && (
            <div className="p-2">
              <div className="text-xs font-medium text-muted-foreground mb-2">Running</div>
              <div className="space-y-2">
                {runningAgents.slice(0, 3).map((agent) => (
                  <div
                    key={agent.id}
                    className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/20"
                  >
                    <LoadingSpinner size="sm" className="text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{agent.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Progress value={agent.progress} className="h-1 flex-1" />
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {agent.progress}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {runningAgents.length > 3 && (
                  <p className="text-xs text-muted-foreground text-center">
                    +{runningAgents.length - 3} more running
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Recently completed */}
          {completedAgents.length > 0 && (
            <div className="p-2 border-t">
              <div className="text-xs font-medium text-muted-foreground mb-2">Recently Completed</div>
              <div className="space-y-2">
                {completedAgents.slice(0, 3).map((agent) => (
                  <div
                    key={agent.id}
                    className={cn(
                      'flex items-center gap-2 p-2 rounded-lg',
                      agent.status === 'completed' && 'bg-green-50 dark:bg-green-950/30',
                      agent.status === 'failed' && 'bg-destructive/10'
                    )}
                  >
                    {agent.status === 'completed' ? (
                      <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{agent.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {agent.completedAt && new Date(agent.completedAt).toLocaleTimeString()}
                      </p>
                    </div>
                    <Badge
                      variant={agent.status === 'completed' ? 'secondary' : 'destructive'}
                      className="text-[10px]"
                    >
                      {agent.status}
                    </Badge>
                  </div>
                ))}
                {completedAgents.length > 3 && (
                  <p className="text-xs text-muted-foreground text-center">
                    +{completedAgents.length - 3} more
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-2 border-t bg-muted/50">
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={() => {
              setIsOpen(false);
              openPanel();
            }}
          >
            Open Background Agents Panel
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default BackgroundAgentIndicator;
