'use client';

/**
 * Scheduler Page
 * Main page for managing scheduled tasks
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  Plus,
  RefreshCw,
  Calendar,
  Activity,
  Settings,
  List,
  FileText,
  Database,
  Workflow,
  Search,
  X,
  Trash2,
  CheckSquare,
  Pause,
  Play,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  BackupScheduleDialog,
  StatsOverview,
  TaskDetails,
  TaskList,
  WorkflowScheduleDialog,
} from '@/components/scheduler';
import { useScheduler, useSystemScheduler } from '@/hooks/scheduler';
import type {
  CreateScheduledTaskInput,
  CreateSystemTaskInput,
  SystemTask,
} from '@/types/scheduler';
import { SystemSchedulerView } from './system-scheduler-view';
import { SchedulerDialogs } from './scheduler-dialogs';

export default function SchedulerPage() {
  const t = useTranslations('scheduler');
  const {
    tasks,
    executions,
    statistics,
    selectedTask,
    activeTasks,
    pausedTasks,
    upcomingTasks,
    recentExecutions,
    schedulerStatus,
    filter,
    isLoading,
    isInitialized,
    createTask,
    updateTask,
    deleteTask,
    pauseTask,
    resumeTask,
    runTaskNow,
    selectTask,
    setFilter,
    clearFilter,
    refresh,
    loadRecentExecutions,
    loadUpcomingTasks,
    cleanupOldExecutions,
    cancelPluginExecution,
    getActivePluginCount,
    isPluginExecutionActive,
    bulkPause,
    bulkResume,
    bulkDelete,
  } = useScheduler();
  const {
    capabilities,
    isAvailable: isSystemAvailable,
    isElevated,
    tasks: systemTasks,
    pendingConfirmation,
    loading: systemLoading,
    error: systemError,
    refresh: refreshSystem,
    createTask: createSystemTask,
    updateTask: updateSystemTask,
    deleteTask: deleteSystemTask,
    enableTask: enableSystemTask,
    disableTask: disableSystemTask,
    runTaskNow: runSystemTaskNow,
    confirmPending,
    confirmTask,
    cancelPending,
    validateTask,
    requestElevation,
    clearError: clearSystemError,
  } = useSystemScheduler();

  // UI state
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mobileView, setMobileView] = useState<'list' | 'details'>('list');
  const [schedulerTab, setSchedulerTab] = useState<'app' | 'system'>('app');
  const [showSystemCreateSheet, setShowSystemCreateSheet] = useState(false);
  const [showSystemEditSheet, setShowSystemEditSheet] = useState(false);
  const [systemDeleteTaskId, setSystemDeleteTaskId] = useState<string | null>(null);
  const [systemEditTaskId, setSystemEditTaskId] = useState<string | null>(null);
  const [systemSubmitting, setSystemSubmitting] = useState(false);
  const [showAdminDialog, setShowAdminDialog] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);

  const [searchQuery, setSearchQuery] = useState(filter.search || '');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const isSystemView = schedulerTab === 'system';

  // Load recent executions and upcoming tasks on init
  useEffect(() => {
    if (isInitialized) {
      loadRecentExecutions(20);
      loadUpcomingTasks(5);
    }
  }, [isInitialized, loadRecentExecutions, loadUpcomingTasks]);

  // Debounced search filter
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (searchQuery.trim()) {
        setFilter({ search: searchQuery.trim() });
      } else if (filter.search) {
        clearFilter();
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchQuery, setFilter, clearFilter, filter.search]);

  const handleCleanup = useCallback(async () => {
    const deleted = await cleanupOldExecutions(30);
    if (deleted > 0) {
      loadRecentExecutions(20);
    }
  }, [cleanupOldExecutions, loadRecentExecutions]);

  const isRefreshing = isSystemView ? systemLoading : isLoading;
  const selectedSystemTask = useMemo(
    () => systemTasks.find((task) => task.id === systemEditTaskId) || null,
    [systemTasks, systemEditTaskId]
  );
  // Handlers
  const handleCreateTask = useCallback(
    async (input: CreateScheduledTaskInput) => {
      setIsSubmitting(true);
      try {
        await createTask(input);
        setShowCreateSheet(false);
      } finally {
        setIsSubmitting(false);
      }
    },
    [createTask]
  );

  const handleCreateSystemTask = useCallback(
    async (input: CreateSystemTaskInput) => {
      setSystemSubmitting(true);
      clearSystemError();
      try {
        const validation = await validateTask(input);
        if (!validation.valid) {
          clearSystemError();
          return;
        }
        const response = await createSystemTask(input);
        if (response.status === 'success') {
          setShowSystemCreateSheet(false);
        } else if (
          response.status === 'error' &&
          response.message.toLowerCase().includes('administrator')
        ) {
          setShowAdminDialog(true);
        }
      } finally {
        setSystemSubmitting(false);
      }
    },
    [createSystemTask, clearSystemError, validateTask]
  );

  const handleEditTask = useCallback(
    async (input: CreateScheduledTaskInput) => {
      if (!selectedTask) return;
      setIsSubmitting(true);
      try {
        await updateTask(selectedTask.id, {
          name: input.name,
          description: input.description,
          trigger: input.trigger,
          payload: input.payload,
          notification: input.notification,
          config: input.config,
          tags: input.tags,
        });
        setShowEditSheet(false);
      } finally {
        setIsSubmitting(false);
      }
    },
    [selectedTask, updateTask]
  );

  const handleEditSystemTask = useCallback(
    async (input: CreateSystemTaskInput) => {
      if (!selectedSystemTask) return;
      setSystemSubmitting(true);
      clearSystemError();
      try {
        const validation = await validateTask(input);
        if (!validation.valid) {
          clearSystemError();
          return;
        }
        const response = await updateSystemTask(selectedSystemTask.id, input);
        if (response.status === 'success') {
          setShowSystemEditSheet(false);
          setSystemEditTaskId(null);
        } else if (
          response.status === 'error' &&
          response.message.toLowerCase().includes('administrator')
        ) {
          setShowAdminDialog(true);
        }
      } finally {
        setSystemSubmitting(false);
      }
    },
    [selectedSystemTask, updateSystemTask, clearSystemError, validateTask]
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (deleteTaskId) {
      await deleteTask(deleteTaskId);
      setDeleteTaskId(null);
    }
  }, [deleteTaskId, deleteTask]);

  const handleSystemDeleteConfirm = useCallback(async () => {
    if (systemDeleteTaskId) {
      await deleteSystemTask(systemDeleteTaskId);
      setSystemDeleteTaskId(null);
    }
  }, [systemDeleteTaskId, deleteSystemTask]);

  const handlePause = useCallback(
    async (taskId: string) => {
      await pauseTask(taskId);
    },
    [pauseTask]
  );

  const handleResume = useCallback(
    async (taskId: string) => {
      await resumeTask(taskId);
    },
    [resumeTask]
  );

  const handleRunNow = useCallback(
    async (taskId: string) => {
      await runTaskNow(taskId);
    },
    [runTaskNow]
  );

  const handleSystemRunNow = useCallback(
    async (taskId: string) => {
      await runSystemTaskNow(taskId);
    },
    [runSystemTaskNow]
  );

  const handleSystemToggle = useCallback(
    async (task: SystemTask) => {
      if (task.status === 'disabled') {
        await enableSystemTask(task.id);
      } else {
        await disableSystemTask(task.id);
      }
    },
    [enableSystemTask, disableSystemTask]
  );

  const toggleTaskSelection = useCallback((taskId: string) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  }, []);

  const handleBulkPause = useCallback(async () => {
    if (selectedTaskIds.size === 0) return;
    await bulkPause(Array.from(selectedTaskIds));
    setSelectedTaskIds(new Set());
    setIsSelectMode(false);
  }, [selectedTaskIds, bulkPause]);

  const handleBulkResume = useCallback(async () => {
    if (selectedTaskIds.size === 0) return;
    await bulkResume(Array.from(selectedTaskIds));
    setSelectedTaskIds(new Set());
    setIsSelectMode(false);
  }, [selectedTaskIds, bulkResume]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedTaskIds.size === 0) return;
    await bulkDelete(Array.from(selectedTaskIds));
    setSelectedTaskIds(new Set());
    setIsSelectMode(false);
  }, [selectedTaskIds, bulkDelete]);

  const handleRefresh = useCallback(() => {
    if (isSystemView) {
      refreshSystem();
    } else {
      refresh();
    }
  }, [isSystemView, refresh, refreshSystem]);

  const handleCreateClick = useCallback(() => {
    if (isSystemView) {
      setShowSystemCreateSheet(true);
    } else {
      setShowCreateSheet(true);
    }
  }, [isSystemView]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Skip if typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === 'n' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handleCreateClick();
      } else if (e.key === 'r' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handleRefresh();
      } else if (e.key === 'Escape') {
        setShowCreateSheet(false);
        setShowEditSheet(false);
        setShowSystemCreateSheet(false);
        setShowSystemEditSheet(false);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [handleCreateClick, handleRefresh]);

  const handleSystemEditOpen = useCallback((taskId: string) => {
    setSystemEditTaskId(taskId);
    setShowSystemEditSheet(true);
  }, []);

  const handleRequestElevation = useCallback(async () => {
    setSystemSubmitting(true);
    await requestElevation();
    setSystemSubmitting(false);
    setShowAdminDialog(false);
    refreshSystem();
  }, [requestElevation, refreshSystem]);

  if (!isInitialized && !isSystemView) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            {t('initializing') || 'Initializing scheduler...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
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
                  {getActivePluginCount() > 0 && (
                    <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                      {getActivePluginCount()} plugin
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
                  <Button variant="outline" size="sm" onClick={handleCleanup} className="h-8 w-8 p-0">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('cleanupOldExecutions') || 'Cleanup old executions (30d)'}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing} className="h-8 gap-1.5">
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{t('refresh') || 'Refresh'}</span>
            </Button>
            <Button size="sm" onClick={handleCreateClick} className="h-8 gap-1.5 bg-primary shadow-sm">
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">
                {isSystemView ? t('createSystemTask') || 'New System Task' : t('createTask') || 'New Task'}
              </span>
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-4 sm:px-6">
          <Tabs value={schedulerTab} onValueChange={(v) => setSchedulerTab(v as 'app' | 'system')}>
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

      {!isSystemView && (
        <div className="flex flex-1 flex-col min-h-0">
          {/* Stats + Search Bar */}
          <div className="space-y-4 px-4 py-4 sm:px-6">
            {/* Stats Overview */}
            <StatsOverview
              statistics={statistics}
              activeTasks={activeTasks}
              pausedTasks={pausedTasks}
              upcomingTasks={upcomingTasks}
              recentExecutions={recentExecutions}
              schedulerStatus={schedulerStatus}
              onSelectTask={selectTask}
            />

            {/* Search + Filter + Quick Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('searchTasks') || 'Search tasks...'}
                  className="h-8 pl-9 pr-8 text-sm"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => { setSearchQuery(''); clearFilter(); }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Status Filter Chips */}
              <div className="flex items-center gap-1">
                {[
                  { key: 'all', label: t('all') || 'All', count: tasks.length },
                  { key: 'active', label: t('activeTasks') || 'Active', count: activeTasks.length },
                  { key: 'paused', label: t('pausedTasks') || 'Paused', count: pausedTasks.length },
                ].map((chip) => (
                  <button
                    key={chip.key}
                    type="button"
                    onClick={() => {
                      setStatusFilter(chip.key);
                      if (chip.key === 'all') {
                        clearFilter();
                      } else {
                        setFilter({ status: chip.key as 'active' | 'paused' });
                      }
                    }}
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-all ${
                      statusFilter === chip.key
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {chip.label}
                    {chip.count > 0 && (
                      <span className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] ${
                        statusFilter === chip.key ? 'bg-primary-foreground/20' : 'bg-background'
                      }`}>
                        {chip.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Bulk / Quick Actions */}
              <div className="ml-auto flex items-center gap-1.5">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={isSelectMode ? 'default' : 'ghost'}
                        size="sm"
                        className="h-7 gap-1.5 text-xs"
                        onClick={() => {
                          setIsSelectMode(!isSelectMode);
                          if (isSelectMode) setSelectedTaskIds(new Set());
                        }}
                      >
                        <CheckSquare className="h-3.5 w-3.5" />
                        <span className="hidden lg:inline">{isSelectMode ? t('cancelSelect') || 'Cancel' : t('bulkSelect') || 'Select'}</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('bulkSelectTooltip') || 'Toggle multi-select mode'}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                {isSelectMode && selectedTaskIds.size > 0 && (
                  <>
                    <Badge variant="secondary" className="h-6 px-2 text-xs">
                      {selectedTaskIds.size} {t('selected') || 'selected'}
                    </Badge>
                    <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={handleBulkPause}>
                      <Pause className="h-3 w-3" />
                      {t('bulkPause') || 'Pause'}
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={handleBulkResume}>
                      <Play className="h-3 w-3" />
                      {t('bulkResume') || 'Resume'}
                    </Button>
                    <Button variant="destructive" size="sm" className="h-7 gap-1 text-xs" onClick={handleBulkDelete}>
                      <Trash2 className="h-3 w-3" />
                      {t('bulkDelete') || 'Delete'}
                    </Button>
                  </>
                )}
                <WorkflowScheduleDialog
                  workflowId="default"
                  workflowName="Workflow"
                  trigger={
                    <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                      <Workflow className="h-3.5 w-3.5" />
                      <span className="hidden lg:inline">{t('scheduleWorkflowAction') || 'Workflow'}</span>
                    </Button>
                  }
                  onScheduled={() => refresh()}
                />
                <BackupScheduleDialog
                  trigger={
                    <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                      <Database className="h-3.5 w-3.5" />
                      <span className="hidden lg:inline">{t('scheduleBackup') || 'Backup'}</span>
                    </Button>
                  }
                  onScheduled={() => refresh()}
                />
              </div>
            </div>
          </div>

          {/* Desktop Layout - Master Detail */}
          <div className="hidden flex-1 md:flex min-h-0 border-t">
            {/* Task List Panel */}
            <div className="w-80 lg:w-96 flex flex-col border-r bg-muted/5">
              <div className="flex-1 min-h-0">
                <TaskList
                  tasks={tasks}
                  selectedTaskId={selectedTask?.id || null}
                  onSelect={selectTask}
                  onPause={handlePause}
                  onResume={handleResume}
                  onRunNow={handleRunNow}
                  onDelete={setDeleteTaskId}
                  isLoading={isLoading}
                  isSelectMode={isSelectMode}
                  selectedTaskIds={selectedTaskIds}
                  onToggleSelect={toggleTaskSelection}
                />
              </div>
            </div>

            {/* Task Details Panel */}
            <div className="flex-1 min-w-0">
              {selectedTask ? (
                <TaskDetails
                  task={selectedTask}
                  executions={executions}
                  onPause={() => handlePause(selectedTask.id)}
                  onResume={() => handleResume(selectedTask.id)}
                  onRunNow={() => handleRunNow(selectedTask.id)}
                  onDelete={() => setDeleteTaskId(selectedTask.id)}
                  onEdit={() => setShowEditSheet(true)}
                  isLoading={isLoading}
                  onCancelPluginExecution={cancelPluginExecution}
                  isPluginExecutionActive={isPluginExecutionActive}
                />
              ) : (
                <div className="flex h-full items-center justify-center p-8 text-center">
                  <div className="max-w-[280px]">
                    <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-muted/80 to-muted/40">
                      <Calendar className="h-9 w-9 text-muted-foreground/40" />
                    </div>
                    <h3 className="text-base font-medium">
                      {t('selectTask') || 'Select a task'}
                    </h3>
                    <p className="mt-1.5 text-sm text-muted-foreground">
                      {t('selectTaskDescription') || 'Choose a task from the list to view its details and execution history'}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-5 gap-1.5"
                      onClick={() => setShowCreateSheet(true)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {t('createFirst') || 'Create your first task'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Layout */}
          <div className="flex flex-1 flex-col border-t md:hidden min-h-0">
            <Tabs
              value={mobileView}
              onValueChange={(v) => setMobileView(v as 'list' | 'details')}
              className="flex flex-1 flex-col min-h-0"
            >
              <TabsList className="mx-4 mt-2 grid w-auto grid-cols-2">
                <TabsTrigger value="list" className="gap-1.5">
                  <List className="h-4 w-4" />
                  {t('tasks') || 'Tasks'}
                  {tasks.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                      {tasks.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="details" className="gap-1.5">
                  <FileText className="h-4 w-4" />
                  {t('details') || 'Details'}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="list" className="flex-1 min-h-0 mt-0 p-0">
                <TaskList
                  tasks={tasks}
                  selectedTaskId={selectedTask?.id || null}
                  onSelect={(taskId) => {
                    selectTask(taskId);
                    setMobileView('details');
                  }}
                  onPause={handlePause}
                  onResume={handleResume}
                  onRunNow={handleRunNow}
                  onDelete={setDeleteTaskId}
                  isLoading={isLoading}
                  isSelectMode={isSelectMode}
                  selectedTaskIds={selectedTaskIds}
                  onToggleSelect={toggleTaskSelection}
                />
              </TabsContent>

              <TabsContent value="details" className="flex-1 min-h-0 mt-0">
                {selectedTask ? (
                  <TaskDetails
                    task={selectedTask}
                    executions={executions}
                    onPause={() => handlePause(selectedTask.id)}
                    onResume={() => handleResume(selectedTask.id)}
                    onRunNow={() => handleRunNow(selectedTask.id)}
                    onDelete={() => setDeleteTaskId(selectedTask.id)}
                    onEdit={() => setShowEditSheet(true)}
                    isLoading={isLoading}
                    onCancelPluginExecution={cancelPluginExecution}
                    isPluginExecutionActive={isPluginExecutionActive}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center p-4 text-center">
                    <div>
                      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50">
                        <Calendar className="h-8 w-8 text-muted-foreground/40" />
                      </div>
                      <h3 className="text-base font-medium">
                        {t('selectTask') || 'Select a task'}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {t('selectTaskDescription') || 'Choose a task from the list'}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4 gap-1.5"
                        onClick={() => setMobileView('list')}
                      >
                        <List className="h-3.5 w-3.5" />
                        {t('viewTasks') || 'View Tasks'}
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      )}

      {isSystemView && (
        <div className="flex-1 min-h-0">
          <SystemSchedulerView
            capabilities={capabilities}
            isAvailable={isSystemAvailable}
            isElevated={isElevated}
            systemTasks={systemTasks}
            loading={systemLoading}
            error={systemError}
            onRunNow={handleSystemRunNow}
            onToggle={handleSystemToggle}
            onEdit={handleSystemEditOpen}
            onDelete={setSystemDeleteTaskId}
            onRequestElevation={() => setShowAdminDialog(true)}
          />
        </div>
      )}

      <SchedulerDialogs
        showCreateSheet={showCreateSheet}
        onShowCreateSheetChange={setShowCreateSheet}
        onCreateTask={handleCreateTask}
        isSubmitting={isSubmitting}
        showEditSheet={showEditSheet}
        onShowEditSheetChange={setShowEditSheet}
        onEditTask={handleEditTask}
        selectedTask={selectedTask}
        showSystemCreateSheet={showSystemCreateSheet}
        onShowSystemCreateSheetChange={setShowSystemCreateSheet}
        onCreateSystemTask={handleCreateSystemTask}
        systemSubmitting={systemSubmitting}
        showSystemEditSheet={showSystemEditSheet}
        onShowSystemEditSheetChange={setShowSystemEditSheet}
        onEditSystemTask={handleEditSystemTask}
        selectedSystemTask={selectedSystemTask}
        deleteTaskId={deleteTaskId}
        onDeleteTaskIdChange={setDeleteTaskId}
        onDeleteConfirm={handleDeleteConfirm}
        systemDeleteTaskId={systemDeleteTaskId}
        onSystemDeleteTaskIdChange={setSystemDeleteTaskId}
        onSystemDeleteConfirm={handleSystemDeleteConfirm}
        pendingConfirmation={pendingConfirmation}
        onConfirmPending={pendingConfirmation?.task_id ? () => confirmTask(pendingConfirmation.task_id!) : confirmPending}
        onCancelPending={cancelPending}
        showAdminDialog={showAdminDialog}
        onShowAdminDialogChange={setShowAdminDialog}
        onRequestElevation={handleRequestElevation}
      />
    </div>
  );
}
