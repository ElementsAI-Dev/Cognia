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
  Settings,
  List,
  FileText,
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
  const [mobileView, setMobileView] = useState<'list' | 'details'>('list');

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
            <Button variant="outline" size="sm" onClick={refresh} disabled={isLoading} className="h-8 sm:h-9">
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline ml-1">{t('refresh') || 'Refresh'}</span>
            </Button>
            <Button size="sm" onClick={() => setShowCreateSheet(true)} className="h-8 sm:h-9">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">{t('createTask') || 'Create Task'}</span>
            </Button>
          </div>
        </div>

        {/* Statistics */}
        {statistics && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mt-3 sm:mt-4">
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
                    <div className="text-base sm:text-lg font-bold text-green-500">{statistics.activeTasks}</div>
                    <div className="text-[10px] sm:text-xs text-muted-foreground truncate">{t('activeTasks') || 'Active'}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-blue-500/5 to-blue-500/10">
              <CardContent className="p-2.5 sm:p-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                    <Clock className="h-4 w-4 text-blue-500" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-base sm:text-lg font-bold">{statistics.upcomingExecutions}</div>
                    <div className="text-[10px] sm:text-xs text-muted-foreground truncate">{t('upcoming') || 'Upcoming'}</div>
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
        )}
      </div>

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
        <Tabs value={mobileView} onValueChange={(v) => setMobileView(v as 'list' | 'details')} className="flex flex-col flex-1 min-h-0">
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
    </div>
  );
}
