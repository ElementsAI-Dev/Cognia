'use client';

/**
 * AppSchedulerView - Desktop master-detail layout and mobile tab layout for app tasks
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Plus,
  Calendar,
  List,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { TaskDetails, TaskList } from '@/components/scheduler';
import type { ScheduledTask, TaskExecution } from '@/types/scheduler';

interface AppSchedulerViewProps {
  tasks: ScheduledTask[];
  selectedTask: ScheduledTask | null;
  executions: TaskExecution[];
  isLoading: boolean;
  isSelectMode: boolean;
  selectedTaskIds: Set<string>;
  onSelectTask: (taskId: string | null) => void;
  onPause: (taskId: string) => void;
  onResume: (taskId: string) => void;
  onRunNow: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onEdit: () => void;
  onCreate: () => void;
  onToggleSelect: (taskId: string) => void;
  onCancelPluginExecution: (executionId: string) => boolean;
  isPluginExecutionActive: (executionId: string) => boolean;
}

export function AppSchedulerView({
  tasks,
  selectedTask,
  executions,
  isLoading,
  isSelectMode,
  selectedTaskIds,
  onSelectTask,
  onPause,
  onResume,
  onRunNow,
  onDelete,
  onEdit,
  onCreate,
  onToggleSelect,
  onCancelPluginExecution,
  isPluginExecutionActive,
}: AppSchedulerViewProps) {
  const t = useTranslations('scheduler');
  const [mobileView, setMobileView] = useState<'list' | 'details'>('list');

  return (
    <div className="flex flex-1 flex-col min-h-0">
      {/* Desktop Layout - Master Detail */}
      <div className="hidden flex-1 md:flex min-h-0 border-t">
        {/* Task List Panel */}
        <div className="w-80 lg:w-96 flex flex-col border-r bg-muted/5">
          <div className="flex-1 min-h-0">
            <TaskList
              tasks={tasks}
              selectedTaskId={selectedTask?.id || null}
              onSelect={onSelectTask}
              onPause={onPause}
              onResume={onResume}
              onRunNow={onRunNow}
              onDelete={onDelete}
              isLoading={isLoading}
              isSelectMode={isSelectMode}
              selectedTaskIds={selectedTaskIds}
              onToggleSelect={onToggleSelect}
            />
          </div>
        </div>

        {/* Task Details Panel */}
        <div className="flex-1 min-w-0">
          {selectedTask ? (
            <TaskDetails
              task={selectedTask}
              executions={executions}
              onPause={() => onPause(selectedTask.id)}
              onResume={() => onResume(selectedTask.id)}
              onRunNow={() => onRunNow(selectedTask.id)}
              onDelete={() => onDelete(selectedTask.id)}
              onEdit={onEdit}
              isLoading={isLoading}
              onCancelPluginExecution={onCancelPluginExecution}
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
                  onClick={onCreate}
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
                onSelectTask(taskId);
                setMobileView('details');
              }}
              onPause={onPause}
              onResume={onResume}
              onRunNow={onRunNow}
              onDelete={onDelete}
              isLoading={isLoading}
              isSelectMode={isSelectMode}
              selectedTaskIds={selectedTaskIds}
              onToggleSelect={onToggleSelect}
            />
          </TabsContent>

          <TabsContent value="details" className="flex-1 min-h-0 mt-0">
            {selectedTask ? (
              <TaskDetails
                task={selectedTask}
                executions={executions}
                onPause={() => onPause(selectedTask.id)}
                onResume={() => onResume(selectedTask.id)}
                onRunNow={() => onRunNow(selectedTask.id)}
                onDelete={() => onDelete(selectedTask.id)}
                onEdit={onEdit}
                isLoading={isLoading}
                onCancelPluginExecution={onCancelPluginExecution}
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
  );
}
