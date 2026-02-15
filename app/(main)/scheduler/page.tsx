'use client';

/**
 * Scheduler Page
 * Main page for managing scheduled tasks
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { useScheduler, useSystemScheduler } from '@/hooks/scheduler';
import type {
  CreateScheduledTaskInput,
  CreateSystemTaskInput,
  SystemTask,
} from '@/types/scheduler';
import { SchedulerHeader } from './scheduler-header';
import { SchedulerToolbar } from './scheduler-toolbar';
import { AppSchedulerView } from './app-scheduler-view';
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
            Initializing scheduler...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <SchedulerHeader
        schedulerStatus={schedulerStatus}
        activePluginCount={getActivePluginCount()}
        isRefreshing={isRefreshing}
        isSystemView={isSystemView}
        schedulerTab={schedulerTab}
        onTabChange={setSchedulerTab}
        onRefresh={handleRefresh}
        onCleanup={handleCleanup}
        onCreate={handleCreateClick}
      />

      {!isSystemView && (
        <>
          <SchedulerToolbar
            tasks={tasks}
            statistics={statistics}
            activeTasks={activeTasks}
            pausedTasks={pausedTasks}
            upcomingTasks={upcomingTasks}
            recentExecutions={recentExecutions}
            schedulerStatus={schedulerStatus}
            searchQuery={searchQuery}
            statusFilter={statusFilter}
            isSelectMode={isSelectMode}
            selectedTaskIds={selectedTaskIds}
            onSearchQueryChange={setSearchQuery}
            onStatusFilterChange={setStatusFilter}
            onClearFilter={clearFilter}
            onSetFilter={setFilter}
            onSelectTask={selectTask}
            onToggleSelectMode={() => {
              setIsSelectMode(!isSelectMode);
              if (isSelectMode) setSelectedTaskIds(new Set());
            }}
            onBulkPause={handleBulkPause}
            onBulkResume={handleBulkResume}
            onBulkDelete={handleBulkDelete}
            onRefresh={refresh}
          />
          <AppSchedulerView
            tasks={tasks}
            selectedTask={selectedTask}
            executions={executions}
            isLoading={isLoading}
            isSelectMode={isSelectMode}
            selectedTaskIds={selectedTaskIds}
            onSelectTask={selectTask}
            onPause={handlePause}
            onResume={handleResume}
            onRunNow={handleRunNow}
            onDelete={setDeleteTaskId}
            onEdit={() => setShowEditSheet(true)}
            onCreate={() => setShowCreateSheet(true)}
            onToggleSelect={toggleTaskSelection}
            onCancelPluginExecution={cancelPluginExecution}
            isPluginExecutionActive={isPluginExecutionActive}
          />
        </>
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
