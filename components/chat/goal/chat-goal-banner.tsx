'use client';

/**
 * ChatGoalBanner - Displays the current conversation goal as a collapsible banner
 * Shows goal content, status, and progress with quick actions
 */

import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Target,
  ChevronDown,
  ChevronUp,
  Check,
  Pause,
  Play,
  Pencil,
  X,
  Trophy,
  Circle,
  CheckCircle2,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { ChatGoal, ChatGoalStatus } from '@/types';

interface ChatGoalBannerProps {
  goal: ChatGoal;
  onEdit?: () => void;
  onComplete?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onClear?: () => void;
  className?: string;
  compact?: boolean;
}

const statusConfig: Record<ChatGoalStatus, { 
  label: string; 
  color: string; 
  icon: React.ReactNode;
  bgColor: string;
}> = {
  active: {
    label: 'Active',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800',
    icon: <Target className="h-3.5 w-3.5" />,
  },
  completed: {
    label: 'Completed',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800',
    icon: <Trophy className="h-3.5 w-3.5" />,
  },
  paused: {
    label: 'Paused',
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800',
    icon: <Pause className="h-3.5 w-3.5" />,
  },
};

export function ChatGoalBanner({
  goal,
  onEdit,
  onComplete,
  onPause,
  onResume,
  onClear,
  className,
  compact = false,
}: ChatGoalBannerProps) {
  const t = useTranslations('chatGoal');
  const [isExpanded, setIsExpanded] = useState(!compact);
  const config = statusConfig[goal.status];

  const handleToggle = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  if (compact && !isExpanded) {
    return (
      <button
        onClick={handleToggle}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors',
          'hover:bg-accent/50',
          config.bgColor,
          className
        )}
      >
        <Target className={cn('h-3.5 w-3.5', config.color)} />
        <span className="text-xs font-medium truncate max-w-[150px]">
          {goal.content}
        </span>
        {goal.progress !== undefined && goal.progress > 0 && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {goal.progress}%
          </Badge>
        )}
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      </button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className={cn(
        'border rounded-lg overflow-hidden',
        config.bgColor,
        className
      )}
    >
      <div className="px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={cn('mt-0.5', config.color)}>
              {config.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {t('label')}
                </span>
                <Badge
                  variant="outline"
                  className={cn('text-[10px] px-1.5 py-0', config.color)}
                >
                  {t(`status.${goal.status}`)}
                </Badge>
              </div>
              <p className="text-sm font-medium leading-relaxed">
                {goal.content}
              </p>
              
              {/* Steps display for multi-step goals */}
              {goal.steps && goal.steps.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {goal.steps.slice(0, 5).map((step, index) => (
                    <div
                      key={step.id}
                      className={cn(
                        'flex items-center gap-2 text-xs',
                        step.completed ? 'text-muted-foreground line-through' : 'text-foreground'
                      )}
                    >
                      {step.completed ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                      ) : (
                        <Circle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      )}
                      <span className="truncate">{index + 1}. {step.content}</span>
                    </div>
                  ))}
                  {goal.steps.length > 5 && (
                    <div className="text-xs text-muted-foreground pl-5">
                      +{goal.steps.length - 5} {t('moreSteps') || 'more steps'}
                    </div>
                  )}
                </div>
              )}

              {/* Progress bar */}
              {goal.progress !== undefined && goal.progress > 0 && goal.status !== 'completed' && (
                <div className="mt-2 flex items-center gap-2">
                  <Progress value={goal.progress} className="h-1.5 flex-1" />
                  <span className="text-xs text-muted-foreground font-medium">
                    {goal.progress}%
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            {goal.status === 'active' && (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={onComplete}
                    >
                      <Check className="h-3.5 w-3.5 text-green-600" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('actions.complete')}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={onPause}
                    >
                      <Pause className="h-3.5 w-3.5 text-yellow-600" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('actions.pause')}</TooltipContent>
                </Tooltip>
              </>
            )}
            {goal.status === 'paused' && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={onResume}
                  >
                    <Play className="h-3.5 w-3.5 text-blue-600" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('actions.resume')}</TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={onEdit}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('actions.edit')}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={onClear}
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('actions.clear')}</TooltipContent>
            </Tooltip>
            {compact && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleToggle}
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default ChatGoalBanner;
