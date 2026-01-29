'use client';

/**
 * DebugPanel - Debugging tools for workflow execution
 * Supports breakpoints, step execution, and variable watching
 */

import { useState, useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useWorkflowEditorStore } from '@/stores/workflow';
import { useShallow } from 'zustand/react/shallow';
import { cn } from '@/lib/utils';
import {
  Bug,
  Play,
  Pause,
  Square,
  SkipForward,
  StepForward,
  Circle,
  CircleDot,
  Eye,
  ChevronDown,
  ChevronRight,
  Trash2,
  Terminal,
  CheckCircle,
  Clock,
  Loader2,
  Braces,
  Plus,
} from 'lucide-react';

interface Breakpoint {
  nodeId: string;
  nodeName: string;
  enabled: boolean;
  condition?: string;
  hitCount: number;
}

interface WatchVariable {
  id: string;
  expression: string;
  value: unknown;
  error?: string;
}

interface DebugPanelProps {
  className?: string;
}

export function DebugPanel({ className }: DebugPanelProps) {
  const t = useTranslations('workflowEditor');
  
  const {
    currentWorkflow,
    isExecuting,
    executionState,
    startExecution,
    pauseExecution,
    resumeExecution,
    cancelExecution,
  } = useWorkflowEditorStore(
    useShallow((state) => ({
      currentWorkflow: state.currentWorkflow,
      isExecuting: state.isExecuting,
      executionState: state.executionState,
      startExecution: state.startExecution,
      pauseExecution: state.pauseExecution,
      resumeExecution: state.resumeExecution,
      cancelExecution: state.cancelExecution,
    }))
  );

  const [breakpoints, setBreakpoints] = useState<Breakpoint[]>([]);
  const [watchVariables, setWatchVariables] = useState<WatchVariable[]>([]);
  const [isDebugMode, setIsDebugMode] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>(['breakpoints', 'watch', 'callstack']);
  const [stepMode, setStepMode] = useState<'into' | 'over' | 'out'>('into');

  // Get current execution info
  const currentNodeId = executionState?.currentNodeId;
  const currentNode = currentWorkflow?.nodes.find(n => n.id === currentNodeId);
  const isPaused = executionState?.status === 'paused';

  // Call stack from execution state
  const callStack = useMemo(() => {
    if (!executionState || !currentWorkflow) return [];
    
    const stack: { nodeId: string; nodeName: string; status: string }[] = [];
    Object.entries(executionState.nodeStates).forEach(([nodeId, state]) => {
      if (state.status === 'running' || state.status === 'completed') {
        const node = currentWorkflow.nodes.find(n => n.id === nodeId);
        if (node) {
          stack.push({
            nodeId,
            nodeName: node.data.label,
            status: state.status,
          });
        }
      }
    });
    return stack;
  }, [executionState, currentWorkflow]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const toggleBreakpoint = useCallback((nodeId: string) => {
    const node = currentWorkflow?.nodes.find(n => n.id === nodeId);
    if (!node) return;

    setBreakpoints(prev => {
      const existing = prev.find(bp => bp.nodeId === nodeId);
      if (existing) {
        return prev.filter(bp => bp.nodeId !== nodeId);
      }
      return [...prev, {
        nodeId,
        nodeName: node.data.label,
        enabled: true,
        hitCount: 0,
      }];
    });
  }, [currentWorkflow]);

  const toggleBreakpointEnabled = useCallback((nodeId: string) => {
    setBreakpoints(prev =>
      prev.map(bp =>
        bp.nodeId === nodeId ? { ...bp, enabled: !bp.enabled } : bp
      )
    );
  }, []);

  const clearAllBreakpoints = useCallback(() => {
    setBreakpoints([]);
  }, []);

  const addWatchVariable = useCallback(() => {
    const id = `watch-${Date.now()}`;
    setWatchVariables(prev => [...prev, {
      id,
      expression: '',
      value: undefined,
    }]);
  }, []);

  const updateWatchExpression = useCallback((id: string, expression: string) => {
    setWatchVariables(prev =>
      prev.map(w => w.id === id ? { ...w, expression } : w)
    );
  }, []);

  const removeWatchVariable = useCallback((id: string) => {
    setWatchVariables(prev => prev.filter(w => w.id !== id));
  }, []);

  const handleStepInto = useCallback(() => {
    setStepMode('into');
    resumeExecution();
  }, [resumeExecution]);

  const handleStepOver = useCallback(() => {
    setStepMode('over');
    resumeExecution();
  }, [resumeExecution]);

  const handleStepOut = useCallback(() => {
    setStepMode('out');
    resumeExecution();
  }, [resumeExecution]);

  // Log step mode for debugging (will be used when step debugging is fully implemented)
  if (process.env.NODE_ENV === 'development' && stepMode) {
    // Step mode tracking for future implementation
  }

  const handleStartDebug = useCallback(() => {
    setIsDebugMode(true);
    startExecution({});
  }, [startExecution]);

  return (
    <div className={cn('flex flex-col h-full bg-background border-l', className)}>
      {/* Header */}
      <div className="p-3 border-b space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bug className="h-4 w-4" />
            <h3 className="text-sm font-semibold">{t('debug') || 'Debug'}</h3>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="debug-mode" className="text-xs">{t('enableDebugMode') || 'Debug Mode'}</Label>
            <Switch
              id="debug-mode"
              checked={isDebugMode}
              onCheckedChange={setIsDebugMode}
            />
          </div>
        </div>

        {/* Debug controls */}
        <div className="flex items-center gap-1">
          <TooltipProvider>
            {!isExecuting ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="default"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleStartDebug}
                    disabled={!currentWorkflow || !isDebugMode}
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Start Debug (F5)</TooltipContent>
              </Tooltip>
            ) : (
              <>
                {isPaused ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="default"
                        size="icon"
                        className="h-8 w-8"
                        onClick={resumeExecution}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Continue (F5)</TooltipContent>
                  </Tooltip>
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={pauseExecution}
                      >
                        <Pause className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Pause (F6)</TooltipContent>
                  </Tooltip>
                )}
              </>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={cancelExecution}
                  disabled={!isExecuting}
                >
                  <Square className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Stop (Shift+F5)</TooltipContent>
            </Tooltip>

            <Separator orientation="vertical" className="h-6 mx-1" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleStepOver}
                  disabled={!isPaused}
                >
                  <SkipForward className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Step Over (F10)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleStepInto}
                  disabled={!isPaused}
                >
                  <StepForward className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Step Into (F11)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleStepOut}
                  disabled={!isPaused}
                >
                  <StepForward className="h-4 w-4 rotate-180" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Step Out (Shift+F11)</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Current execution status */}
        {isExecuting && currentNode && (
          <div className="bg-blue-500/10 rounded-lg p-2">
            <div className="flex items-center gap-2 text-xs">
              <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
              <span className="text-muted-foreground">Executing:</span>
              <span className="font-medium">{currentNode.data.label}</span>
            </div>
          </div>
        )}

        {isPaused && currentNode && (
          <div className="bg-yellow-500/10 rounded-lg p-2">
            <div className="flex items-center gap-2 text-xs">
              <Pause className="h-3 w-3 text-yellow-500" />
              <span className="text-muted-foreground">Paused at:</span>
              <span className="font-medium">{currentNode.data.label}</span>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {/* Breakpoints */}
          <Collapsible
            open={expandedSections.includes('breakpoints')}
            onOpenChange={() => toggleSection('breakpoints')}
          >
            <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-md hover:bg-accent text-sm">
              {expandedSections.includes('breakpoints') ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <CircleDot className="h-4 w-4 text-red-500" />
              <span className="font-medium">Breakpoints</span>
              <Badge variant="secondary" className="ml-auto">
                {breakpoints.filter(bp => bp.enabled).length}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  clearAllBreakpoints();
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-4 space-y-1">
              {breakpoints.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2 px-2">
                  Click on a node to set a breakpoint
                </p>
              ) : (
                breakpoints.map(bp => (
                  <div
                    key={bp.nodeId}
                    className="flex items-center gap-2 p-1.5 rounded hover:bg-accent"
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() => toggleBreakpointEnabled(bp.nodeId)}
                    >
                      {bp.enabled ? (
                        <CircleDot className="h-3 w-3 text-red-500" />
                      ) : (
                        <Circle className="h-3 w-3 text-muted-foreground" />
                      )}
                    </Button>
                    <span className={cn(
                      "text-xs flex-1",
                      !bp.enabled && "text-muted-foreground line-through"
                    )}>
                      {bp.nodeName}
                    </span>
                    {bp.hitCount > 0 && (
                      <Badge variant="outline" className="text-[10px]">
                        Hit: {bp.hitCount}
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() => toggleBreakpoint(bp.nodeId)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Watch Variables */}
          <Collapsible
            open={expandedSections.includes('watch')}
            onOpenChange={() => toggleSection('watch')}
          >
            <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-md hover:bg-accent text-sm">
              {expandedSections.includes('watch') ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <Eye className="h-4 w-4 text-blue-500" />
              <span className="font-medium">Watch</span>
              <Badge variant="secondary" className="ml-auto">
                {watchVariables.length}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  addWatchVariable();
                }}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-4 space-y-1">
              {watchVariables.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2 px-2">
                  Add expressions to watch their values
                </p>
              ) : (
                watchVariables.map(watch => (
                  <div
                    key={watch.id}
                    className="flex items-start gap-2 p-1.5 rounded hover:bg-accent"
                  >
                    <Braces className="h-3.5 w-3.5 mt-0.5 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <input
                        type="text"
                        value={watch.expression}
                        onChange={(e) => updateWatchExpression(watch.id, e.target.value)}
                        placeholder="Enter expression..."
                        className="w-full bg-transparent text-xs border-none focus:outline-none"
                      />
                      {watch.value !== undefined && (
                        <div className="text-xs text-muted-foreground font-mono truncate">
                          = {JSON.stringify(watch.value)}
                        </div>
                      )}
                      {watch.error && (
                        <div className="text-xs text-destructive">
                          {watch.error}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() => removeWatchVariable(watch.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Call Stack */}
          <Collapsible
            open={expandedSections.includes('callstack')}
            onOpenChange={() => toggleSection('callstack')}
          >
            <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-md hover:bg-accent text-sm">
              {expandedSections.includes('callstack') ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <Terminal className="h-4 w-4 text-purple-500" />
              <span className="font-medium">Call Stack</span>
              <Badge variant="secondary" className="ml-auto">
                {callStack.length}
              </Badge>
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-4 space-y-1">
              {callStack.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2 px-2">
                  No active execution
                </p>
              ) : (
                callStack.map((frame, index) => (
                  <div
                    key={frame.nodeId}
                    className={cn(
                      "flex items-center gap-2 p-1.5 rounded hover:bg-accent cursor-pointer",
                      index === 0 && "bg-accent"
                    )}
                  >
                    {frame.status === 'running' ? (
                      <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
                    ) : frame.status === 'completed' ? (
                      <CheckCircle className="h-3 w-3 text-green-500" />
                    ) : (
                      <Clock className="h-3 w-3 text-muted-foreground" />
                    )}
                    <span className="text-xs font-mono">{frame.nodeName}</span>
                  </div>
                ))
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ScrollArea>
    </div>
  );
}

export default DebugPanel;
