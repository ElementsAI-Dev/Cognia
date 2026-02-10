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
  Pause,
  Play,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AdminElevationDialog,
  BackupScheduleDialog,
  StatsOverview,
  SystemTaskForm,
  TaskConfirmationDialog,
  TaskDetails,
  TaskForm,
  TaskList,
  WorkflowScheduleDialog,
} from '@/components/scheduler';
import { useScheduler, useSystemScheduler } from '@/hooks/scheduler';
import type {
  CreateScheduledTaskInput,
  CreateSystemTaskInput,
  SystemTask,
  SystemTaskAction,
  SystemTaskTrigger,
} from '@/types/scheduler';

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
    cancelPending,
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
  const sortedSystemTasks = useMemo(
    () => [...systemTasks].sort((a, b) => a.name.localeCompare(b.name)),
    [systemTasks]
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
    [createSystemTask, clearSystemError]
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
    [selectedSystemTask, updateSystemTask, clearSystemError]
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

  const formatSystemTrigger = useCallback(
    (trigger: SystemTaskTrigger) => {
      switch (trigger.type) {
        case 'cron':
          return `${t('systemCronExpression') || 'Cron'}: ${trigger.expression}`;
        case 'interval':
          return `${t('intervalSeconds') || 'Interval'}: ${trigger.seconds}s`;
        case 'once':
          return `${t('systemRunAt') || 'Run At'}: ${trigger.run_at}`;
        case 'on_boot':
          return `${t('triggerOnBoot') || 'On Boot'}: ${trigger.delay_seconds || 0}s`;
        case 'on_logon':
          return `${t('triggerOnLogon') || 'On Logon'}${trigger.user ? ` (${trigger.user})` : ''}`;
        case 'on_event':
          return `${t('triggerOnEvent') || 'On Event'}: ${trigger.source} (${trigger.event_id})`;
        default:
          return t('systemTrigger') || 'Trigger';
      }
    },
    [t]
  );

  const formatSystemAction = useCallback(
    (action: SystemTaskAction) => {
      switch (action.type) {
        case 'execute_script':
          return `${t('actionScript') || 'Script'}: ${action.language}`;
        case 'run_command':
          return `${t('actionCommand') || 'Command'}: ${action.command}`;
        case 'launch_app':
          return `${t('actionApp') || 'App'}: ${action.path}`;
        default:
          return t('systemAction') || 'Action';
      }
    },
    [t]
  );

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

              {/* Quick Actions */}
              <div className="ml-auto flex items-center gap-1.5">
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
          {!isSystemAvailable ? (
            <div className="flex h-full items-center justify-center p-8 text-center">
              <div className="max-w-[280px]">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50">
                  <Settings className="h-8 w-8 text-muted-foreground/40" />
                </div>
                <h3 className="text-base font-medium">{t('systemSchedulerUnavailable') || 'System scheduler is unavailable'}</h3>
                {capabilities?.can_elevate && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-4 gap-1.5"
                    onClick={() => setShowAdminDialog(true)}
                  >
                    {t('requestElevation') || 'Request Elevation'}
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="space-y-3 p-4 sm:p-6">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline" className="capitalize">
                    {isElevated ? t('runLevelAdmin') || 'Administrator' : t('runLevelUser') || 'User'}
                  </Badge>
                  <span>{t('systemSchedulerDescription') || 'Manage OS-level scheduled tasks'}</span>
                </div>
                {systemError && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                    {systemError}
                  </div>
                )}
                {sortedSystemTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/50">
                      <Settings className="h-7 w-7 text-muted-foreground/40" />
                    </div>
                    <p className="text-sm text-muted-foreground">{t('noSystemTasks') || 'No system tasks'}</p>
                  </div>
                ) : (
                  sortedSystemTasks.map((task) => (
                    <Card key={task.id} className="overflow-hidden border-border/50 transition-all hover:-translate-y-0.5 hover:shadow-md">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <div className={`h-2 w-2 shrink-0 rounded-full ${
                                task.status === 'disabled' ? 'bg-gray-400' : 'bg-green-500'
                              }`} />
                              <span className="truncate text-sm font-medium">{task.name}</span>
                            </div>
                            {task.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2 pl-4">{task.description}</p>
                            )}
                            <div className="flex flex-wrap gap-x-3 gap-y-1 pl-4 text-[11px] text-muted-foreground">
                              <span>{formatSystemTrigger(task.trigger)}</span>
                              <span>{formatSystemAction(task.action)}</span>
                            </div>
                          </div>
                          <Badge variant="outline" className={`shrink-0 capitalize ${
                            task.status === 'disabled' ? 'text-gray-500' : 'text-green-500'
                          }`}>
                            {task.status}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-1.5 pl-4">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleSystemRunNow(task.id)} disabled={systemLoading}>
                                  <Play className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{t('runNow') || 'Run Now'}</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleSystemToggle(task)} disabled={systemLoading}>
                                  {task.status === 'disabled' ? <Activity className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{task.status === 'disabled' ? t('enableTask') || 'Enable' : t('disableTask') || 'Disable'}</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setSystemEditTaskId(task.id); setShowSystemEditSheet(true); }}>
                                  <Settings className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{t('edit') || 'Edit'}</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => setSystemDeleteTaskId(task.id)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{t('delete') || 'Delete'}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          )}
        </div>
      )}

      {/* Create Task Sheet */}
      <Sheet open={showCreateSheet} onOpenChange={setShowCreateSheet}>
        <SheetContent className="w-full sm:w-[540px] sm:max-w-[540px] overflow-y-auto border-l bg-gradient-to-b from-background to-muted/20">
          <SheetHeader className="space-y-1">
            <SheetTitle className="flex items-center gap-2.5 text-lg">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                <Plus className="h-5 w-5 text-primary" />
              </div>
              {t('createTask') || 'Create Task'}
            </SheetTitle>
            <SheetDescription className="text-sm">
              {t('createTaskDescription') || 'Set up a new scheduled task with triggers, notifications and more'}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <TaskForm
              onSubmit={handleCreateTask}
              onCancel={() => setShowCreateSheet(false)}
              isSubmitting={isSubmitting}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Edit System Task Sheet */}
      <Sheet open={showSystemEditSheet} onOpenChange={setShowSystemEditSheet}>
        <SheetContent className="w-full sm:w-[540px] sm:max-w-[540px] overflow-y-auto border-l bg-gradient-to-b from-background to-muted/20">
          <SheetHeader className="space-y-1">
            <SheetTitle className="flex items-center gap-2.5 text-lg">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10">
                <Settings className="h-5 w-5 text-blue-500" />
              </div>
              {t('editSystemTask') || 'Edit System Task'}
            </SheetTitle>
            <SheetDescription className="text-sm">
              {t('systemSchedulerDescription') || 'Manage OS-level scheduled tasks'}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            {selectedSystemTask && (
              <SystemTaskForm
                initialValues={{
                  name: selectedSystemTask.name,
                  description: selectedSystemTask.description,
                  trigger: selectedSystemTask.trigger,
                  action: selectedSystemTask.action,
                  run_level: selectedSystemTask.run_level,
                  tags: selectedSystemTask.tags,
                }}
                onSubmit={handleEditSystemTask}
                onCancel={() => setShowSystemEditSheet(false)}
                isSubmitting={systemSubmitting}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Create System Task Sheet */}
      <Sheet open={showSystemCreateSheet} onOpenChange={setShowSystemCreateSheet}>
        <SheetContent className="w-full sm:w-[540px] sm:max-w-[540px] overflow-y-auto border-l bg-gradient-to-b from-background to-muted/20">
          <SheetHeader className="space-y-1">
            <SheetTitle className="flex items-center gap-2.5 text-lg">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                <Plus className="h-5 w-5 text-primary" />
              </div>
              {t('createSystemTask') || 'Create System Task'}
            </SheetTitle>
            <SheetDescription className="text-sm">
              {t('systemSchedulerDescription') || 'Manage OS-level scheduled tasks'}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <SystemTaskForm
              onSubmit={handleCreateSystemTask}
              onCancel={() => setShowSystemCreateSheet(false)}
              isSubmitting={systemSubmitting}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Edit Task Sheet */}
      <Sheet open={showEditSheet} onOpenChange={setShowEditSheet}>
        <SheetContent className="w-full sm:w-[540px] sm:max-w-[540px] overflow-y-auto border-l bg-gradient-to-b from-background to-muted/20">
          <SheetHeader className="space-y-1">
            <SheetTitle className="flex items-center gap-2.5 text-lg">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10">
                <Settings className="h-5 w-5 text-blue-500" />
              </div>
              {t('editTask') || 'Edit Task'}
            </SheetTitle>
            <SheetDescription className="text-sm">
              {t('editTaskDescription') || 'Modify task settings and configurations'}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            {selectedTask && (
              <TaskForm
                initialValues={{
                  name: selectedTask.name,
                  description: selectedTask.description,
                  type: selectedTask.type,
                  trigger: selectedTask.trigger,
                  payload: selectedTask.payload,
                  config: selectedTask.config,
                  notification: selectedTask.notification,
                }}
                onSubmit={handleEditTask}
                onCancel={() => setShowEditSheet(false)}
                isSubmitting={isSubmitting}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTaskId} onOpenChange={() => setDeleteTaskId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteTask') || 'Delete Task'}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteTaskConfirm') ||
                'Are you sure you want to delete this task? This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel') || 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground">
              {t('delete') || 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete System Task Confirmation */}
      <AlertDialog open={!!systemDeleteTaskId} onOpenChange={() => setSystemDeleteTaskId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteTask') || 'Delete Task'}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteTaskConfirm') ||
                'Are you sure you want to delete this task? This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel') || 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction onClick={handleSystemDeleteConfirm} className="bg-destructive text-destructive-foreground">
              {t('delete') || 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <TaskConfirmationDialog
        open={!!pendingConfirmation}
        confirmation={pendingConfirmation}
        loading={systemSubmitting}
        onConfirm={confirmPending}
        onCancel={cancelPending}
      />

      <AdminElevationDialog
        open={showAdminDialog}
        loading={systemSubmitting}
        onCancel={() => setShowAdminDialog(false)}
        onRequestElevation={async () => {
          setSystemSubmitting(true);
          await requestElevation();
          setSystemSubmitting(false);
          setShowAdminDialog(false);
          refreshSystem();
        }}
      />
    </div>
  );
}
