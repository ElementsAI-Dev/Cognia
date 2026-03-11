'use client';

/**
 * Workflow Schedule Dialog
 * Dialog for scheduling a workflow to run automatically
 */

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Calendar, Clock, Play, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useScheduler } from '@/hooks/scheduler';
import type { TaskTriggerType } from '@/types/scheduler';
import { getCronExpressionOptions, DEFAULT_EXECUTION_CONFIG } from '@/types/scheduler';
import { TimezoneSelect } from '@/components/scheduler/timezone-select';
import type { WorkflowErrorEnvelope } from '@/types/workflow/workflow-editor';
import {
  createWorkflowErrorEnvelope,
  formatWorkflowErrorEnvelope,
} from '@/lib/workflow-editor/workflow-error';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface WorkflowScheduleDialogProps {
  workflowId: string;
  workflowName: string;
  defaultInput?: Record<string, unknown>;
  trigger?: React.ReactNode;
  onScheduled?: (taskId: string) => void;
}

// Use canonical presets, mapped to Select-compatible format
const CRON_PRESETS = getCronExpressionOptions(10);

export function WorkflowScheduleDialog({
  workflowId,
  workflowName,
  defaultInput,
  trigger,
  onScheduled,
}: WorkflowScheduleDialogProps) {
  const t = useTranslations('scheduler');
  const { createTask, error } = useScheduler();

  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [scheduleError, setScheduleError] = useState<WorkflowErrorEnvelope | null>(null);

  // Form state
  const [taskName, setTaskName] = useState(`${workflowName} - Scheduled`);
  const [triggerType, setTriggerType] = useState<TaskTriggerType>('cron');
  const [cronExpression, setCronExpression] = useState('0 9 * * *');
  const [timezone, setTimezone] = useState('UTC');
  const [intervalMs, setIntervalMs] = useState(3600000); // 1 hour
  const [runAt, setRunAt] = useState<string>('');
  const [notifyOnComplete, setNotifyOnComplete] = useState(true);
  const [notifyOnError, setNotifyOnError] = useState(true);
  const [showAdvancedConfig, setShowAdvancedConfig] = useState(false);
  const [maxRetries, setMaxRetries] = useState(DEFAULT_EXECUTION_CONFIG.maxRetries);
  const [retryDelay, setRetryDelay] = useState(DEFAULT_EXECUTION_CONFIG.retryDelay);
  const [runMissedOnStartup, setRunMissedOnStartup] = useState(DEFAULT_EXECUTION_CONFIG.runMissedOnStartup);
  const [maxMissedRuns, setMaxMissedRuns] = useState(DEFAULT_EXECUTION_CONFIG.maxMissedRuns ?? 1);
  const [allowConcurrent, setAllowConcurrent] = useState(DEFAULT_EXECUTION_CONFIG.allowConcurrent);

  const handleSubmit = useCallback(async () => {
    setSubmitError(null);
    setScheduleError(null);
    setIsSubmitting(true);
    try {
      const trigger = (() => {
        switch (triggerType) {
          case 'cron':
            return { type: 'cron' as const, cronExpression, timezone };
          case 'interval':
            return { type: 'interval' as const, intervalMs };
          case 'once':
            return { type: 'once' as const, runAt: new Date(runAt) };
          default:
            return { type: 'cron' as const, cronExpression };
        }
      })();

      const task = await createTask({
        name: taskName,
        type: 'workflow',
        trigger,
        payload: {
          workflowId,
          workflowName,
          input: defaultInput ?? {},
          scheduleContext: {
            source: 'workflow-schedule-dialog',
            triggerType,
            configuredAt: new Date().toISOString(),
          },
        },
        tags: ['workflow-schedule', workflowId],
        notification: {
          onStart: false,
          onComplete: notifyOnComplete,
          onError: notifyOnError,
          onProgress: false,
          channels: ['toast'],
        },
        config: {
          timeout: DEFAULT_EXECUTION_CONFIG.timeout,
          maxRetries,
          retryDelay,
          runMissedOnStartup,
          maxMissedRuns: Math.max(0, maxMissedRuns),
          allowConcurrent,
        },
      });

      if (task) {
        onScheduled?.(task.id);
        setOpen(false);
      } else {
        const failed = createWorkflowErrorEnvelope({
          stage: 'schedule',
          code: 'workflow.schedule.failed',
          message: error || t('scheduleFailed') || 'Failed to schedule workflow',
          retryable: true,
          affectedTargets: [workflowId],
        });
        setScheduleError(failed);
        setSubmitError(formatWorkflowErrorEnvelope(failed));
      }
    } catch (submitErr) {
      const failed = createWorkflowErrorEnvelope({
        stage: 'schedule',
        code: 'workflow.schedule.exception',
        message:
          submitErr instanceof Error
            ? submitErr.message
            : t('scheduleFailed') || 'Failed to schedule workflow',
        retryable: true,
        affectedTargets: [workflowId],
      });
      setScheduleError(failed);
      setSubmitError(formatWorkflowErrorEnvelope(failed));
    } finally {
      setIsSubmitting(false);
    }
  }, [
    taskName,
    triggerType,
    cronExpression,
    timezone,
    intervalMs,
    runAt,
    notifyOnComplete,
    notifyOnError,
    maxRetries,
    retryDelay,
    runMissedOnStartup,
    maxMissedRuns,
    allowConcurrent,
    workflowId,
    workflowName,
    defaultInput,
    createTask,
    error,
    t,
    onScheduled,
  ]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Calendar className="mr-2 h-4 w-4" />
            {t('scheduleWorkflow')}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {t('scheduleWorkflow')}
          </DialogTitle>
          <DialogDescription>
            {t('scheduleWorkflowDescription', { name: workflowName })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Task Name */}
          <div className="space-y-2">
            <Label htmlFor="task-name">{t('taskName')}</Label>
            <Input
              id="task-name"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              placeholder={t('taskNamePlaceholder')}
            />
          </div>

          {/* Trigger Type */}
          <div className="space-y-2">
            <Label>{t('triggerType')}</Label>
            <Tabs value={triggerType} onValueChange={(v) => setTriggerType(v as TaskTriggerType)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="cron">
                  <Clock className="mr-1 h-3 w-3" />
                  {t('triggers.cron')}
                </TabsTrigger>
                <TabsTrigger value="interval">
                  {t('triggers.interval')}
                </TabsTrigger>
                <TabsTrigger value="once">
                  {t('triggers.once')}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="cron" className="space-y-3 pt-3">
                <div className="space-y-2">
                  <Label>{t('cronPresets')}</Label>
                  <Select value={cronExpression} onValueChange={setCronExpression}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('selectPreset')} />
                    </SelectTrigger>
                    <SelectContent>
                      {CRON_PRESETS.map((preset) => (
                        <SelectItem key={preset.value} value={preset.value}>
                          {preset.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cron-expr">{t('cronExpression')}</Label>
                  <Input
                    id="cron-expr"
                    value={cronExpression}
                    onChange={(e) => setCronExpression(e.target.value)}
                    placeholder="0 9 * * *"
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('cronHelp')}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>{t('timezone')}</Label>
                  <TimezoneSelect
                    value={timezone}
                    onValueChange={setTimezone}
                    testId="workflow-schedule-timezone"
                    includeOffset
                  />
                </div>
              </TabsContent>

              <TabsContent value="interval" className="space-y-3 pt-3">
                <div className="space-y-2">
                  <Label>{t('intervalDuration')}</Label>
                  <Select
                    value={intervalMs.toString()}
                    onValueChange={(v) => setIntervalMs(parseInt(v, 10))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="300000">5 minutes</SelectItem>
                      <SelectItem value="900000">15 minutes</SelectItem>
                      <SelectItem value="1800000">30 minutes</SelectItem>
                      <SelectItem value="3600000">1 hour</SelectItem>
                      <SelectItem value="7200000">2 hours</SelectItem>
                      <SelectItem value="21600000">6 hours</SelectItem>
                      <SelectItem value="43200000">12 hours</SelectItem>
                      <SelectItem value="86400000">24 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              <TabsContent value="once" className="space-y-3 pt-3">
                <div className="space-y-2">
                  <Label htmlFor="run-at">{t('runAt')}</Label>
                  <Input
                    id="run-at"
                    type="datetime-local"
                    value={runAt}
                    onChange={(e) => setRunAt(e.target.value)}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Notifications */}
          <div className="space-y-3">
            <Label>{t('notificationSettings.title')}</Label>
            <div className="flex items-center justify-between">
              <span className="text-sm">{t('notificationSettings.onComplete')}</span>
              <Switch
                checked={notifyOnComplete}
                onCheckedChange={setNotifyOnComplete}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">{t('notificationSettings.onError')}</span>
              <Switch
                checked={notifyOnError}
                onCheckedChange={setNotifyOnError}
              />
            </div>
          </div>

          <Collapsible open={showAdvancedConfig} onOpenChange={setShowAdvancedConfig}>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm"
              >
                <span>{t('advancedSettings') || 'Advanced Settings'}</span>
                {showAdvancedConfig ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-3 rounded-lg border bg-muted/20 p-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">{t('maxRetries') || 'Max Retries'}</Label>
                  <Input
                    type="number"
                    min={0}
                    value={maxRetries}
                    onChange={(e) => setMaxRetries(parseInt(e.target.value, 10) || 0)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t('retryDelayMs') || 'Retry Delay (ms)'}</Label>
                  <Input
                    type="number"
                    min={0}
                    value={retryDelay}
                    onChange={(e) => setRetryDelay(parseInt(e.target.value, 10) || 0)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t('maxMissedRuns') || 'Max Missed Runs'}</Label>
                  <Input
                    type="number"
                    min={0}
                    value={maxMissedRuns}
                    onChange={(e) => setMaxMissedRuns(parseInt(e.target.value, 10) || 0)}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">{t('runMissedOnStartup') || 'Run missed on startup'}</span>
                <Switch checked={runMissedOnStartup} onCheckedChange={setRunMissedOnStartup} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">{t('allowConcurrent') || 'Allow Concurrent'}</span>
                <Switch checked={allowConcurrent} onCheckedChange={setAllowConcurrent} />
              </div>
            </CollapsibleContent>
          </Collapsible>

          {submitError && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive">
              {submitError}
              {scheduleError?.retryable && (
                <div className="mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7"
                    onClick={() => {
                      void handleSubmit();
                    }}
                  >
                    {t('retry') || 'Retry'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            <X className="mr-2 h-4 w-4" />
            {t('cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !taskName.trim()}>
            <Play className="mr-2 h-4 w-4" />
            {isSubmitting ? t('scheduling') : t('schedule')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
