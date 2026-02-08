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
  Clock,
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
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowRight,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
  const [showDashboard, setShowDashboard] = useState(false);

  const isSystemView = schedulerTab === 'system';

  // Load recent executions and upcoming tasks when dashboard is shown
  useEffect(() => {
    if (showDashboard && isInitialized) {
      loadRecentExecutions(20);
      loadUpcomingTasks(5);
    }
  }, [showDashboard, isInitialized, loadRecentExecutions, loadUpcomingTasks]);

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

  const formatDuration = (ms: number | undefined): string => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
  };
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
      <div className="p-3 sm:p-4 border-b">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <Calendar className="h-5 w-5 sm:h-6 sm:w-6 shrink-0" />
              <span className="truncate">{t('title') || 'Task Scheduler'}</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 hidden sm:block">
              {t('subtitle') || 'Manage automated tasks and workflows'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing} className="h-8 sm:h-9">
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline ml-1">{t('refresh') || 'Refresh'}</span>
            </Button>
            <Button size="sm" onClick={handleCreateClick} className="h-8 sm:h-9">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">
                {isSystemView ? t('createSystemTask') || 'Create System Task' : t('createTask') || 'Create Task'}
              </span>
            </Button>
          </div>
        </div>

        {/* Statistics + Scheduler Status */}
        {!isSystemView && statistics && (
          <div className="space-y-2 mt-3 sm:mt-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
              <Card className="bg-gradient-to-br from-card to-muted/20">
                <CardContent className="p-2.5 sm:p-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-base sm:text-lg font-bold">{statistics.totalTasks}</div>
                      <div className="text-[10px] sm:text-xs text-muted-foreground truncate">{t('totalTasks') || 'Total'}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-green-500/5 to-green-500/10">
                <CardContent className="p-2.5 sm:p-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-500/10">
                      <Activity className="h-4 w-4 text-green-500" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-base sm:text-lg font-bold text-green-500">{activeTasks.length}</div>
                      <div className="text-[10px] sm:text-xs text-muted-foreground truncate">{t('activeTasks') || 'Active'}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-yellow-500/5 to-yellow-500/10">
                <CardContent className="p-2.5 sm:p-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-yellow-500/10">
                      <Pause className="h-4 w-4 text-yellow-500" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-base sm:text-lg font-bold text-yellow-500">{pausedTasks.length}</div>
                      <div className="text-[10px] sm:text-xs text-muted-foreground truncate">{t('pausedTasks') || 'Paused'}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-card to-muted/20">
                <CardContent className="p-2.5 sm:p-3">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <Badge variant="outline" className="text-green-500 text-xs px-1.5">
                        {statistics.successfulExecutions}
                      </Badge>
                      <span className="text-muted-foreground">/</span>
                      <Badge variant="outline" className="text-red-500 text-xs px-1.5">
                        {statistics.failedExecutions}
                      </Badge>
                    </div>
                    <div className="text-[10px] sm:text-xs text-muted-foreground">
                      {t('successFailed') || 'S/F'}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            {/* Scheduler Status Indicator */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${schedulerStatus === 'running' ? 'bg-green-500 animate-pulse' : schedulerStatus === 'stopped' ? 'bg-red-500' : 'bg-gray-400'}`} />
                <span>{schedulerStatus === 'running' ? t('schedulerRunning') || 'Scheduler running' : schedulerStatus === 'stopped' ? t('schedulerStopped') || 'Scheduler stopped' : t('schedulerIdle') || 'Scheduler idle'}</span>
              </div>
              {getActivePluginCount() > 0 && (
                <Badge variant="outline" className="text-blue-500 text-[10px]">
                  {getActivePluginCount()} {t('activePluginTasks') || 'active plugin task(s)'}
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Search + Quick Actions */}
      {!isSystemView && (
        <div className="px-3 sm:px-4 py-2 space-y-2">
          {/* Search / Filter Bar */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('searchTasks') || 'Search tasks...'}
                className="h-8 pl-8 pr-8 text-sm"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => { setSearchQuery(''); clearFilter(); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={showDashboard ? 'secondary' : 'outline'}
                    size="sm"
                    className="h-8"
                    onClick={() => setShowDashboard(!showDashboard)}
                  >
                    <BarChart3 className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('toggleDashboard') || 'Toggle Dashboard'}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8" onClick={handleCleanup}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('cleanupOldExecutions') || 'Cleanup old executions (30d)'}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground mr-1">
              {t('quickActions') || 'Quick Actions'}:
            </span>
            <WorkflowScheduleDialog
              workflowId="default"
              workflowName="Workflow"
              trigger={
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5">
                  <Workflow className="h-3.5 w-3.5" />
                  {t('scheduleWorkflowAction') || 'Schedule Workflow'}
                </Button>
              }
              onScheduled={() => refresh()}
            />
            <BackupScheduleDialog
              trigger={
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5">
                  <Database className="h-3.5 w-3.5" />
                  {t('scheduleBackup') || 'Schedule Backup'}
                </Button>
              }
              onScheduled={() => refresh()}
            />
          </div>

          {/* Dashboard Panel - Upcoming Tasks & Recent Executions */}
          {showDashboard && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-2">
              {/* Upcoming Tasks */}
              <Card>
                <CardHeader className="pb-2 px-3 pt-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-500" />
                    {t('upcomingTasks') || 'Upcoming Tasks'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  {upcomingTasks.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2">{t('noUpcomingTasks') || 'No upcoming tasks'}</p>
                  ) : (
                    <div className="space-y-1.5">
                      {upcomingTasks.map((task) => (
                        <button
                          key={task.id}
                          type="button"
                          onClick={() => { selectTask(task.id); setShowDashboard(false); }}
                          className="flex items-center justify-between w-full rounded-md px-2 py-1.5 text-left hover:bg-muted/50 transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-medium truncate">{task.name}</div>
                            <div className="text-[10px] text-muted-foreground">
                              {task.nextRunAt?.toLocaleString() || '-'}
                            </div>
                          </div>
                          <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0 ml-2" />
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Executions */}
              <Card>
                <CardHeader className="pb-2 px-3 pt-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Activity className="h-4 w-4 text-green-500" />
                    {t('recentExecutions') || 'Recent Executions'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  {recentExecutions.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2">{t('noRecentExecutions') || 'No recent executions'}</p>
                  ) : (
                    <div className="space-y-1.5">
                      {recentExecutions.slice(0, 8).map((exec) => (
                        <div
                          key={exec.id}
                          className="flex items-center justify-between rounded-md px-2 py-1.5 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            {exec.status === 'completed' ? (
                              <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />
                            ) : exec.status === 'failed' ? (
                              <XCircle className="h-3 w-3 text-red-500 shrink-0" />
                            ) : (
                              <AlertCircle className="h-3 w-3 text-yellow-500 shrink-0" />
                            )}
                            <span className="truncate font-medium">{exec.taskName}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            <span className="text-muted-foreground">{formatDuration(exec.duration)}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {exec.startedAt.toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      <div className="px-3 sm:px-4 pb-2">
        <Tabs value={schedulerTab} onValueChange={(v) => setSchedulerTab(v as 'app' | 'system')}>
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="app" className="gap-1">
              {t('appScheduler') || 'App Scheduler'}
            </TabsTrigger>
            <TabsTrigger value="system" className="gap-1">
              {t('systemScheduler') || 'System Scheduler'}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {!isSystemView && (
        <>
          {/* Main Content - Desktop: side-by-side, Mobile: tabs */}
          {/* Desktop Layout */}
          <div className="flex-1 hidden md:flex min-h-0">
            {/* Task List */}
            <div className="w-72 lg:w-80 border-r flex flex-col">
              <div className="p-2 border-b">
                <h2 className="text-sm font-medium px-2">{t('tasks') || 'Tasks'}</h2>
              </div>
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

            {/* Task Details */}
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
                <div className="flex items-center justify-center h-full text-center p-4">
                  <div>
                    <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted/50">
                      <Calendar className="h-10 w-10 text-muted-foreground/50" />
                    </div>
                    <h3 className="text-lg font-medium">
                      {t('selectTask') || 'Select a task'}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1 max-w-[240px]">
                      {t('selectTaskDescription') || 'Choose a task from the list to view details'}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => setShowCreateSheet(true)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      {t('createFirst') || 'Create your first task'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Layout - Tab Navigation */}
          <div className="flex-1 flex flex-col md:hidden min-h-0">
            <Tabs
              value={mobileView}
              onValueChange={(v) => setMobileView(v as 'list' | 'details')}
              className="flex flex-col flex-1 min-h-0"
            >
              <TabsList className="mx-3 mt-2 grid w-auto grid-cols-2">
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
                  <div className="flex items-center justify-center h-full text-center p-4">
                    <div>
                      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted/50">
                        <Calendar className="h-8 w-8 text-muted-foreground/50" />
                      </div>
                      <h3 className="text-base font-medium">
                        {t('selectTask') || 'Select a task'}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {t('selectTaskDescription') || 'Choose a task from the list'}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4"
                        onClick={() => setMobileView('list')}
                      >
                        <List className="h-4 w-4 mr-1" />
                        {t('viewTasks') || 'View Tasks'}
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </>
      )}

      {isSystemView && (
        <div className="flex-1 min-h-0">
          {!isSystemAvailable ? (
            <div className="p-4 text-sm text-muted-foreground">
              <p>{t('systemSchedulerUnavailable') || 'System scheduler is unavailable.'}</p>
              {capabilities?.can_elevate && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  onClick={() => setShowAdminDialog(true)}
                >
                  {t('requestElevation') || 'Request Elevation'}
                </Button>
              )}
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="space-y-3 p-3 sm:p-4">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline" className="capitalize">
                    {isElevated ? t('runLevelAdmin') || 'Administrator' : t('runLevelUser') || 'User'}
                  </Badge>
                  <span>{t('systemSchedulerDescription') || 'Manage OS-level scheduled tasks'}</span>
                </div>
                {systemError && (
                  <div className="text-xs text-destructive">
                    {systemError}
                  </div>
                )}
                {sortedSystemTasks.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    {t('noSystemTasks') || 'No system tasks'}
                  </div>
                ) : (
                  sortedSystemTasks.map((task) => (
                    <Card key={task.id} className="bg-gradient-to-br from-card to-muted/20">
                      <CardContent className="p-3 sm:p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 space-y-1">
                            <div className="text-sm font-medium truncate">{task.name}</div>
                            {task.description && (
                              <div className="text-xs text-muted-foreground line-clamp-2">
                                {task.description}
                              </div>
                            )}
                            <div className="text-xs text-muted-foreground">
                              {formatSystemTrigger(task.trigger)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatSystemAction(task.action)}
                            </div>
                          </div>
                          <Badge variant="outline" className="capitalize">
                            {task.status}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSystemRunNow(task.id)}
                            disabled={systemLoading}
                          >
                            {t('runNow') || 'Run Now'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSystemToggle(task)}
                            disabled={systemLoading}
                          >
                            {task.status === 'disabled'
                              ? t('enableTask') || 'Enable'
                              : t('disableTask') || 'Disable'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSystemEditTaskId(task.id);
                              setShowSystemEditSheet(true);
                            }}
                          >
                            {t('edit') || 'Edit'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive"
                            onClick={() => setSystemDeleteTaskId(task.id)}
                          >
                            {t('delete') || 'Delete'}
                          </Button>
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
