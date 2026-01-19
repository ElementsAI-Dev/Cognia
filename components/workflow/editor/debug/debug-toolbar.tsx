'use client';

/**
 * DebugToolbar - Debug controls for workflow execution
 */

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useWorkflowEditorStore } from '@/stores/workflow';
import {
  Bug,
  Play,
  Pause,
  Square,
  SkipForward,
  ArrowDownToLine,
  Trash2,
  Circle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function DebugToolbar() {
  const t = useTranslations('workflowEditor');
  const {
    isDebugMode,
    isExecuting,
    isPausedAtBreakpoint,
    breakpoints,
    executionState,
    toggleDebugMode,
    stepOver,
    stepInto,
    continueExecution,
    clearBreakpoints,
    pauseExecution,
    cancelExecution,
  } = useWorkflowEditorStore();

  if (!isDebugMode) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={toggleDebugMode}
          >
            <Bug className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t('enableDebugMode') || 'Enable Debug Mode'}</TooltipContent>
      </Tooltip>
    );
  }

  const breakpointCount = breakpoints.size;
  const isRunning = isExecuting && !isPausedAtBreakpoint;
  const isPaused = isPausedAtBreakpoint || executionState?.status === 'paused';

  return (
    <div className="flex items-center gap-1 px-2 py-1 bg-amber-500/10 border border-amber-500/30 rounded-lg">
      {/* Debug Mode Indicator */}
      <div className="flex items-center gap-1.5 mr-1">
        <Bug className="h-4 w-4 text-amber-600" />
        <span className="text-xs font-medium text-amber-600">
          {t('debugMode') || 'Debug'}
        </span>
      </div>

      <Separator orientation="vertical" className="h-5 mx-1" />

      {/* Execution Controls */}
      <div className="flex items-center gap-0.5">
        {!isExecuting ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-100"
                onClick={continueExecution}
              >
                <Play className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('startDebug') || 'Start Debug'}</TooltipContent>
          </Tooltip>
        ) : isPaused ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-100"
                onClick={continueExecution}
              >
                <Play className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('continue') || 'Continue'}</TooltipContent>
          </Tooltip>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-amber-600 hover:text-amber-700 hover:bg-amber-100"
                onClick={pauseExecution}
              >
                <Pause className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('pause') || 'Pause'}</TooltipContent>
          </Tooltip>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={stepOver}
              disabled={!isExecuting || isRunning}
            >
              <SkipForward className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('stepOver') || 'Step Over'}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={stepInto}
              disabled={!isExecuting || isRunning}
            >
              <ArrowDownToLine className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('stepInto') || 'Step Into'}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={cancelExecution}
              disabled={!isExecuting}
            >
              <Square className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('stop') || 'Stop'}</TooltipContent>
        </Tooltip>
      </div>

      <Separator orientation="vertical" className="h-5 mx-1" />

      {/* Breakpoints */}
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs">
              <Circle className={cn(
                "h-3 w-3",
                breakpointCount > 0 ? "fill-red-500 text-red-500" : "text-muted-foreground"
              )} />
              <span className="text-muted-foreground">
                {breakpointCount}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {breakpointCount} {t('breakpoints') || 'breakpoint(s)'}
          </TooltipContent>
        </Tooltip>

        {breakpointCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={clearBreakpoints}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('clearBreakpoints') || 'Clear All Breakpoints'}</TooltipContent>
          </Tooltip>
        )}
      </div>

      <Separator orientation="vertical" className="h-5 mx-1" />

      {/* Status Badge */}
      {isExecuting && (
        <Badge 
          variant="outline" 
          className={cn(
            "text-[10px] px-1.5",
            isPaused 
              ? "bg-amber-100 text-amber-700 border-amber-300" 
              : "bg-green-100 text-green-700 border-green-300"
          )}
        >
          {isPaused ? (t('paused') || 'Paused') : (t('running') || 'Running')}
        </Badge>
      )}

      {/* Exit Debug Mode */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs ml-1"
            onClick={toggleDebugMode}
          >
            {t('exitDebug') || 'Exit Debug'}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t('exitDebugMode') || 'Exit Debug Mode'}</TooltipContent>
      </Tooltip>
    </div>
  );
}

export default DebugToolbar;
