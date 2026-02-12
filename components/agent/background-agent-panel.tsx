'use client';

/**
 * BackgroundAgentPanel - Panel for managing background agents
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import {
  X,
  Play,
  Pause,
  StopCircle,
  Trash2,
  Bell,
  BellOff,
  Bot,
  Terminal,
  BarChart3,
  Search,
  Download,
  Filter,
  CheckSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useBackgroundAgent } from '@/hooks/agent';
import { AgentFlowVisualizer } from './agent-flow-visualizer';
import { AgentCard } from './background-agent-card';
import {
  AgentLogsViewer,
  PerformanceStatsCard,
  ResultPreview,
  type PerformanceStats,
} from './background-agent-sub-components';
import type {
  BackgroundAgent,
  BackgroundAgentStatus,
} from '@/types/agent/background-agent';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { downloadFile, formatAgentAsMarkdown } from '@/lib/agent';

export function BackgroundAgentPanel() {
  const t = useTranslations('agent');
  const [activeTab, setActiveTab] = useState<'all' | 'running' | 'completed'>('all');
  const [detailTab, setDetailTab] = useState<'flow' | 'logs' | 'stats'>('flow');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<BackgroundAgentStatus | 'all'>('all');

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);

  const {
    agents,
    runningAgents,
    completedAgents,
    selectedAgent,
    isPanelOpen,
    unreadNotificationCount,
    queueState,
    startAgent,
    pauseAgent,
    resumeAgent,
    cancelAgent,
    deleteAgent,
    cancelAll,
    pauseQueue,
    resumeQueue,
    markAllNotificationsRead,
    closePanel,
    selectAgent,
    clearCompleted,
  } = useBackgroundAgent();

  // Calculate performance stats
  const performanceStats = useMemo<PerformanceStats>(() => {
    const completed = completedAgents.filter((a) => a.status === 'completed');
    const failed = completedAgents.filter((a) => a.status === 'failed');
    const totalDuration = completed.reduce((sum, a) => {
      if (a.startedAt && a.completedAt) {
        return sum + (a.completedAt.getTime() - a.startedAt.getTime());
      }
      return sum;
    }, 0);

    return {
      totalTasks: agents.length,
      completedTasks: completed.length,
      failedTasks: failed.length,
      averageDuration: completed.length > 0 ? totalDuration / completed.length : 0,
      successRate:
        completedAgents.length > 0 ? (completed.length / completedAgents.length) * 100 : 0,
      activeSubAgents: runningAgents.reduce(
        (sum, a) => sum + a.subAgents.filter((s) => s.status === 'running').length,
        0
      ),
      toolCallsTotal: agents.reduce((sum, a) => sum + (a.result?.toolResults?.length || 0), 0),
      tokenUsage: agents.reduce((sum, a) => sum + (a.result?.tokenUsage?.totalTokens || 0), 0),
    };
  }, [agents, completedAgents, runningAgents]);

  // Desktop notification handler
  const sendNotification = useCallback(
    (title: string, body: string) => {
      if (!notificationsEnabled) return;
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/icon.png' });
      }
    },
    [notificationsEnabled]
  );

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Track already-notified agent IDs to prevent duplicate notifications
  const notifiedAgentsRef = useRef<Set<string>>(new Set());

  // Watch for agent completion and send notifications
  useEffect(() => {
    completedAgents.forEach((agent) => {
      if (notifiedAgentsRef.current.has(agent.id)) return;
      notifiedAgentsRef.current.add(agent.id);

      if (agent.status === 'completed') {
        sendNotification(t('agentCompleted'), t('agentCompletedBody', { name: agent.name }));
      } else if (agent.status === 'failed') {
        sendNotification(t('agentFailed'), t('agentFailedBody', { name: agent.name }));
      }
    });
  }, [completedAgents, sendNotification, t]);

  // Filter agents based on search and status
  const filteredAgents = useMemo(() => {
    let result =
      activeTab === 'running'
        ? runningAgents
        : activeTab === 'completed'
          ? completedAgents
          : agents;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (agent) =>
          agent.name.toLowerCase().includes(query) || agent.task.toLowerCase().includes(query)
      );
    }

    // Apply status filter (only for 'all' tab)
    if (activeTab === 'all' && statusFilter !== 'all') {
      result = result.filter((agent) => agent.status === statusFilter);
    }

    return result;
  }, [agents, runningAgents, completedAgents, activeTab, searchQuery, statusFilter]);

  const displayAgents = filteredAgents;

  // Toggle selection
  const toggleSelection = useCallback((agentId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(agentId)) {
        next.delete(agentId);
      } else {
        next.add(agentId);
      }
      return next;
    });
  }, []);

  // Select all visible agents
  const selectAllVisible = useCallback(() => {
    setSelectedIds(new Set(displayAgents.map((a) => a.id)));
  }, [displayAgents]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Batch operations
  const batchPause = useCallback(() => {
    selectedIds.forEach((id) => pauseAgent(id));
    clearSelection();
  }, [selectedIds, pauseAgent, clearSelection]);

  const batchResume = useCallback(() => {
    selectedIds.forEach((id) => resumeAgent(id));
    clearSelection();
  }, [selectedIds, resumeAgent, clearSelection]);

  const batchCancel = useCallback(() => {
    selectedIds.forEach((id) => cancelAgent(id));
    clearSelection();
  }, [selectedIds, cancelAgent, clearSelection]);

  const batchDelete = useCallback(() => {
    selectedIds.forEach((id) => deleteAgent(id));
    clearSelection();
  }, [selectedIds, deleteAgent, clearSelection]);

  const exportAgent = useCallback((agent: BackgroundAgent, format: 'json' | 'md') => {
    const filename = `${agent.name.replace(/[^a-z0-9]/gi, '-')}-${agent.id.slice(0, 8)}.${format}`;
    if (format === 'json') {
      downloadFile(filename, JSON.stringify(agent, null, 2), 'application/json');
    } else {
      downloadFile(filename, formatAgentAsMarkdown(agent), 'text/markdown');
    }
  }, []);

  const exportAllVisible = useCallback(
    (format: 'json' | 'md') => {
      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `background-agents-${timestamp}.${format}`;
      if (format === 'json') {
        downloadFile(filename, JSON.stringify(displayAgents, null, 2), 'application/json');
      } else {
        const content = displayAgents.map(formatAgentAsMarkdown).join('\n\n---\n\n');
        downloadFile(filename, content, 'text/markdown');
      }
    },
    [displayAgents]
  );

  return (
    <Sheet open={isPanelOpen} onOpenChange={(open) => !open && closePanel()}>
      <SheetContent side="right" className="w-full sm:max-w-xl p-0" showCloseButton={false}>
        <SheetHeader className="p-4 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              {t('backgroundAgents')}
              {runningAgents.length > 0 && (
                <Badge variant="default" className="ml-2">
                  {t('nRunning', { count: runningAgents.length })}
                </Badge>
              )}
            </SheetTitle>
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                  >
                    {notificationsEnabled ? (
                      <Bell className="h-4 w-4" />
                    ) : (
                      <BellOff className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {notificationsEnabled ? t('disableNotifications') : t('enableNotifications')}
                </TooltipContent>
              </Tooltip>
              {unreadNotificationCount > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="relative"
                      onClick={markAllNotificationsRead}
                    >
                      <Bell className="h-4 w-4" />
                      <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] text-destructive-foreground flex items-center justify-center">
                        {unreadNotificationCount}
                      </span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('markAllRead')}</TooltipContent>
                </Tooltip>
              )}
              <Button variant="ghost" size="sm" onClick={closePanel}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Queue status */}
          <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
            <span>
              {t('queueStatus', { waiting: queueState.items, current: queueState.currentlyRunning, max: queueState.maxConcurrent })}
            </span>
            <div className="flex items-center gap-2">
              {queueState.isPaused ? (
                <Button variant="outline" size="sm" className="h-6 text-xs" onClick={resumeQueue}>
                  <Play className="h-3 w-3 mr-1" />
                  {t('resumeQueue')}
                </Button>
              ) : (
                <Button variant="outline" size="sm" className="h-6 text-xs" onClick={pauseQueue}>
                  <Pause className="h-3 w-3 mr-1" />
                  {t('pauseQueue')}
                </Button>
              )}
            </div>
          </div>
        </SheetHeader>

        <div className="flex h-[calc(100vh-120px)]">
          {/* Agent list */}
          <div className="w-1/2 border-r">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
              <TabsList className="w-full justify-start rounded-none border-b h-10 bg-transparent p-0">
                <TabsTrigger
                  value="all"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
                >
                  {t('allTab', { count: agents.length })}
                </TabsTrigger>
                <TabsTrigger
                  value="running"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
                >
                  {t('runningTab', { count: runningAgents.length })}
                </TabsTrigger>
                <TabsTrigger
                  value="completed"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
                >
                  {t('completedTab', { count: completedAgents.length })}
                </TabsTrigger>
              </TabsList>

              {/* Search and Filter Bar */}
              <div className="p-2 border-b flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder={t('searchAgents')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-7 pl-7 text-xs"
                  />
                </div>

                {activeTab === 'all' && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                        <Filter className="h-3 w-3" />
                        {statusFilter === 'all' ? t('allStatuses') : statusFilter}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuCheckboxItem
                        checked={statusFilter === 'all'}
                        onCheckedChange={() => setStatusFilter('all')}
                      >
                        {t('allStatuses')}
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuSeparator />
                      {(
                        [
                          'idle',
                          'queued',
                          'running',
                          'paused',
                          'completed',
                          'failed',
                          'cancelled',
                        ] as BackgroundAgentStatus[]
                      ).map((status) => (
                        <DropdownMenuCheckboxItem
                          key={status}
                          checked={statusFilter === status}
                          onCheckedChange={() => setStatusFilter(status)}
                        >
                          {status}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                <Button
                  variant={isMultiSelectMode ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => {
                    setIsMultiSelectMode(!isMultiSelectMode);
                    if (isMultiSelectMode) clearSelection();
                  }}
                >
                  <CheckSquare className="h-3.5 w-3.5" />
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => exportAllVisible('json')}>
                      {t('exportAsJson')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => exportAllVisible('md')}>
                      {t('exportAsMarkdown')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Multi-select toolbar */}
              {isMultiSelectMode && selectedIds.size > 0 && (
                <div className="p-2 border-b bg-muted/50 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-medium">{t('nSelected', { count: selectedIds.size })}</span>
                    <Button
                      variant="link"
                      size="sm"
                      className="h-5 text-xs p-0"
                      onClick={selectAllVisible}
                    >
                      {t('selectAll')}
                    </Button>
                    <Button
                      variant="link"
                      size="sm"
                      className="h-5 text-xs p-0"
                      onClick={clearSelection}
                    >
                      {t('clear')}
                    </Button>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={batchPause}>
                      <Pause className="h-3 w-3 mr-1" />
                      {t('pause')}
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={batchResume}>
                      <Play className="h-3 w-3 mr-1" />
                      {t('resume')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs text-destructive"
                      onClick={batchCancel}
                    >
                      <StopCircle className="h-3 w-3 mr-1" />
                      {t('cancel')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs text-destructive"
                      onClick={batchDelete}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      {t('delete')}
                    </Button>
                  </div>
                </div>
              )}

              <TabsContent value={activeTab} className="m-0">
                <ScrollArea className="h-[calc(100vh-200px)]">
                  <div className="p-2 space-y-2">
                    {displayAgents.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                        <Bot className="h-12 w-12 mb-2 opacity-50" />
                        <p className="text-sm">{t('noAgents')}</p>
                      </div>
                    ) : (
                      displayAgents.map((agent) => (
                        <div key={agent.id} className="flex items-start gap-2">
                          {isMultiSelectMode && (
                            <Checkbox
                              checked={selectedIds.has(agent.id)}
                              onCheckedChange={() => toggleSelection(agent.id)}
                              className="mt-3"
                            />
                          )}
                          <div className="flex-1">
                            <AgentCard
                              agent={agent}
                              isSelected={selectedAgent?.id === agent.id}
                              onSelect={() => selectAgent(agent.id)}
                              onStart={() => startAgent(agent.id)}
                              onPause={() => pauseAgent(agent.id)}
                              onResume={() => resumeAgent(agent.id)}
                              onCancel={() => cancelAgent(agent.id)}
                              onDelete={() => deleteAgent(agent.id)}
                              onExport={(format) => exportAgent(agent, format)}
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>

                {/* Actions */}
                {displayAgents.length > 0 && (
                  <div className="p-2 border-t flex items-center justify-between">
                    {activeTab === 'completed' && (
                      <Button variant="outline" size="sm" onClick={clearCompleted}>
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        {t('clearAll')}
                      </Button>
                    )}
                    {activeTab === 'running' && runningAgents.length > 0 && (
                      <Button variant="destructive" size="sm" onClick={cancelAll}>
                        <StopCircle className="h-3.5 w-3.5 mr-1" />
                        {t('cancelAll')}
                      </Button>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Agent details */}
          <div className="w-1/2 flex flex-col">
            {selectedAgent ? (
              <>
                {/* Detail tabs */}
                <div className="border-b">
                  <div className="flex items-center gap-1 p-2">
                    <Button
                      variant={detailTab === 'flow' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setDetailTab('flow')}
                    >
                      <Bot className="h-3.5 w-3.5 mr-1" />
                      {t('flow')}
                    </Button>
                    <Button
                      variant={detailTab === 'logs' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setDetailTab('logs')}
                    >
                      <Terminal className="h-3.5 w-3.5 mr-1" />
                      {t('logs')}
                      {selectedAgent.logs && selectedAgent.logs.length > 0 && (
                        <Badge variant="outline" className="ml-1 text-[10px] h-4">
                          {selectedAgent.logs.length}
                        </Badge>
                      )}
                    </Button>
                    <Button
                      variant={detailTab === 'stats' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setDetailTab('stats')}
                    >
                      <BarChart3 className="h-3.5 w-3.5 mr-1" />
                      {t('stats')}
                    </Button>
                  </div>
                </div>

                {/* Detail content */}
                <ScrollArea className="flex-1">
                  <div className="p-4 space-y-4">
                    {detailTab === 'flow' && (
                      <>
                        <AgentFlowVisualizer agent={selectedAgent} />
                        <ResultPreview agent={selectedAgent} />
                      </>
                    )}
                    {detailTab === 'logs' && (
                      <AgentLogsViewer logs={selectedAgent.logs || []} maxHeight={400} />
                    )}
                    {detailTab === 'stats' && <PerformanceStatsCard stats={performanceStats} />}
                  </div>
                </ScrollArea>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Bot className="h-16 w-16 mb-4 opacity-30" />
                <p className="text-sm">{t('selectAgentDetails')}</p>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

