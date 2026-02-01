'use client';

/**
 * Scheduler Page
 * Main page for managing scheduled tasks
 */

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Plus,
  RefreshCw,
  Calendar,
  Clock,
  Activity,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
import { TaskList, TaskForm, TaskDetails } from '@/components/scheduler';
import { useScheduler } from '@/hooks/scheduler';
import type { CreateScheduledTaskInput } from '@/types/scheduler';

export default function SchedulerPage() {
  const t = useTranslations('scheduler');
  const {
    tasks,
    executions,
    statistics,
    selectedTask,
    isLoading,
    isInitialized,
    createTask,
    updateTask,
    deleteTask,
    pauseTask,
    resumeTask,
    runTaskNow,
    selectTask,
    refresh,
  } = useScheduler();

  // UI state
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleDeleteConfirm = useCallback(async () => {
    if (deleteTaskId) {
      await deleteTask(deleteTaskId);
      setDeleteTaskId(null);
    }
  }, [deleteTaskId, deleteTask]);

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

  if (!isInitialized) {
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
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Calendar className="h-6 w-6" />
              {t('title') || 'Task Scheduler'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t('subtitle') || 'Manage automated tasks and workflows'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={refresh} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              {t('refresh') || 'Refresh'}
            </Button>
            <Button size="sm" onClick={() => setShowCreateSheet(true)}>
              <Plus className="h-4 w-4 mr-1" />
              {t('createTask') || 'Create Task'}
            </Button>
          </div>
        </div>

        {/* Statistics */}
        {statistics && (
          <div className="grid grid-cols-4 gap-4 mt-4">
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-lg font-bold">{statistics.totalTasks}</div>
                    <div className="text-xs text-muted-foreground">{t('totalTasks') || 'Total Tasks'}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-green-500" />
                  <div>
                    <div className="text-lg font-bold text-green-500">{statistics.activeTasks}</div>
                    <div className="text-xs text-muted-foreground">{t('activeTasks') || 'Active'}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <div>
                    <div className="text-lg font-bold">{statistics.upcomingExecutions}</div>
                    <div className="text-xs text-muted-foreground">{t('upcoming') || 'Upcoming'}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-green-500">
                    {statistics.successfulExecutions}
                  </Badge>
                  <span className="text-muted-foreground">/</span>
                  <Badge variant="outline" className="text-red-500">
                    {statistics.failedExecutions}
                  </Badge>
                  <div className="text-xs text-muted-foreground ml-1">
                    {t('successFailed') || 'Success/Failed'}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Task List */}
        <div className="w-80 border-r flex flex-col">
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
            />
          ) : (
            <div className="flex items-center justify-center h-full text-center">
              <div>
                <Calendar className="h-16 w-16 text-muted-foreground/30 mx-auto" />
                <h3 className="mt-4 text-lg font-medium">
                  {t('selectTask') || 'Select a task'}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
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

      {/* Create Task Sheet */}
      <Sheet open={showCreateSheet} onOpenChange={setShowCreateSheet}>
        <SheetContent className="w-[500px] sm:max-w-[500px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              {t('createTask') || 'Create Task'}
            </SheetTitle>
            <SheetDescription>
              {t('createTaskDescription') || 'Set up a new scheduled task'}
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

      {/* Edit Task Sheet */}
      <Sheet open={showEditSheet} onOpenChange={setShowEditSheet}>
        <SheetContent className="w-[500px] sm:max-w-[500px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t('editTask') || 'Edit Task'}</SheetTitle>
            <SheetDescription>
              {t('editTaskDescription') || 'Modify task settings'}
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
    </div>
  );
}
