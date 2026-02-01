'use client';

/**
 * TaskForm - Create or edit a scheduled task
 */

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Clock,
  Calendar,
  Zap,
  Bell,
  Settings,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import {
  type CreateScheduledTaskInput,
  type ScheduledTaskType,
  type TaskTriggerType,
  type NotificationChannel,
  CRON_PRESETS,
  TIMEZONE_OPTIONS,
  DEFAULT_EXECUTION_CONFIG,
} from '@/types/scheduler';
import { validateCronExpression, describeCronExpression } from '@/lib/scheduler/cron-parser';

interface TaskFormProps {
  initialValues?: Partial<CreateScheduledTaskInput>;
  onSubmit: (input: CreateScheduledTaskInput) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const TASK_TYPES: Array<{ value: ScheduledTaskType; label: string; labelZh: string }> = [
  { value: 'workflow', label: 'Workflow', labelZh: '工作流' },
  { value: 'agent', label: 'AI Agent', labelZh: 'AI 代理' },
  { value: 'sync', label: 'Data Sync', labelZh: '数据同步' },
  { value: 'backup', label: 'Backup', labelZh: '备份' },
  { value: 'custom', label: 'Custom', labelZh: '自定义' },
];

const TRIGGER_TYPES: Array<{ value: TaskTriggerType; label: string; labelZh: string; icon: React.ReactNode }> = [
  { value: 'cron', label: 'Schedule (Cron)', labelZh: '定时任务 (Cron)', icon: <Clock className="h-4 w-4" /> },
  { value: 'interval', label: 'Interval', labelZh: '固定间隔', icon: <Calendar className="h-4 w-4" /> },
  { value: 'once', label: 'One Time', labelZh: '单次执行', icon: <Zap className="h-4 w-4" /> },
  { value: 'event', label: 'Event Trigger', labelZh: '事件触发', icon: <Bell className="h-4 w-4" /> },
];

export function TaskForm({
  initialValues,
  onSubmit,
  onCancel,
  isSubmitting,
}: TaskFormProps) {
  const t = useTranslations('scheduler');

  // Form state
  const [name, setName] = useState(initialValues?.name || '');
  const [description, setDescription] = useState(initialValues?.description || '');
  const [taskType, setTaskType] = useState<ScheduledTaskType>(initialValues?.type || 'workflow');
  const [triggerType, setTriggerType] = useState<TaskTriggerType>(initialValues?.trigger?.type || 'cron');
  
  // Trigger config
  const [cronExpression, setCronExpression] = useState(initialValues?.trigger?.cronExpression || '0 9 * * *');
  const [cronPreset, setCronPreset] = useState<string>('');
  const [useCustomCron, setUseCustomCron] = useState(false);
  const [intervalMinutes, setIntervalMinutes] = useState(60);
  const [runAtDate, setRunAtDate] = useState('');
  const [runAtTime, setRunAtTime] = useState('');
  const [eventType, setEventType] = useState('');
  const [timezone, setTimezone] = useState(initialValues?.trigger?.timezone || 'UTC');
  
  // Payload
  const [payloadJson, setPayloadJson] = useState(
    initialValues?.payload ? JSON.stringify(initialValues.payload, null, 2) : '{}'
  );
  
  // Notification config
  const [notifyOnStart, setNotifyOnStart] = useState(initialValues?.notification?.onStart ?? false);
  const [notifyOnComplete, setNotifyOnComplete] = useState(initialValues?.notification?.onComplete ?? true);
  const [notifyOnError, setNotifyOnError] = useState(initialValues?.notification?.onError ?? true);
  const [notificationChannels, setNotificationChannels] = useState<NotificationChannel[]>(
    initialValues?.notification?.channels || ['toast']
  );
  
  // Execution config
  const [timeout, setTimeout] = useState(initialValues?.config?.timeout || DEFAULT_EXECUTION_CONFIG.timeout);
  const [maxRetries, setMaxRetries] = useState(initialValues?.config?.maxRetries || DEFAULT_EXECUTION_CONFIG.maxRetries);
  const [retryDelay, setRetryDelay] = useState(initialValues?.config?.retryDelay || DEFAULT_EXECUTION_CONFIG.retryDelay);
  
  // UI state
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [cronError, setCronError] = useState<string | null>(null);
  const [payloadError, setPayloadError] = useState<string | null>(null);

  // Validate cron expression
  const handleCronChange = useCallback((value: string) => {
    setCronExpression(value);
    const result = validateCronExpression(value);
    setCronError(result.valid ? null : result.error || 'Invalid expression');
  }, []);

  // Handle cron preset selection
  const handlePresetSelect = useCallback((presetId: string) => {
    setCronPreset(presetId);
    const preset = CRON_PRESETS.find(p => p.id === presetId);
    if (preset) {
      setCronExpression(preset.expression);
      setCronError(null);
    }
  }, []);

  // Toggle notification channel
  const toggleChannel = useCallback((channel: NotificationChannel) => {
    setNotificationChannels(prev => 
      prev.includes(channel)
        ? prev.filter(c => c !== channel)
        : [...prev, channel]
    );
  }, []);

  // Validate and submit
  const handleSubmit = async () => {
    // Validate name
    if (!name.trim()) {
      return;
    }

    // Validate payload JSON
    let payload: Record<string, unknown> = {};
    try {
      payload = JSON.parse(payloadJson);
      setPayloadError(null);
    } catch {
      setPayloadError('Invalid JSON');
      return;
    }

    // Build trigger
    const trigger: CreateScheduledTaskInput['trigger'] = {
      type: triggerType,
      timezone,
    };

    switch (triggerType) {
      case 'cron':
        if (cronError) return;
        trigger.cronExpression = cronExpression;
        break;
      case 'interval':
        trigger.intervalMs = intervalMinutes * 60 * 1000;
        break;
      case 'once':
        if (runAtDate && runAtTime) {
          trigger.runAt = new Date(`${runAtDate}T${runAtTime}`);
        }
        break;
      case 'event':
        trigger.eventType = eventType;
        break;
    }

    const input: CreateScheduledTaskInput = {
      name: name.trim(),
      description: description.trim() || undefined,
      type: taskType,
      trigger,
      payload,
      config: {
        timeout,
        maxRetries,
        retryDelay,
        runMissedOnStartup: false,
        maxMissedRuns: 1,
        allowConcurrent: false,
      },
      notification: {
        onStart: notifyOnStart,
        onComplete: notifyOnComplete,
        onError: notifyOnError,
        onProgress: false,
        channels: notificationChannels,
      },
    };

    await onSubmit(input);
  };

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">{t('taskName') || 'Task Name'} *</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('taskNamePlaceholder') || 'Enter task name'}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">{t('description') || 'Description'}</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('descriptionPlaceholder') || 'Describe what this task does'}
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label>{t('taskType') || 'Task Type'}</Label>
          <Select value={taskType} onValueChange={(v) => setTaskType(v as ScheduledTaskType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TASK_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      {/* Trigger Configuration */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Clock className="h-4 w-4" />
          {t('triggerConfig') || 'Trigger Configuration'}
        </h3>

        <div className="grid grid-cols-2 gap-2">
          {TRIGGER_TYPES.map((type) => (
            <Button
              key={type.value}
              variant={triggerType === type.value ? 'default' : 'outline'}
              size="sm"
              className="justify-start"
              onClick={() => setTriggerType(type.value)}
            >
              {type.icon}
              <span className="ml-2">{type.label}</span>
            </Button>
          ))}
        </div>

        {/* Cron Configuration */}
        {triggerType === 'cron' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Switch
                checked={useCustomCron}
                onCheckedChange={setUseCustomCron}
              />
              <Label>{t('useCustomCron') || 'Use custom cron expression'}</Label>
            </div>

            {useCustomCron ? (
              <div className="space-y-2">
                <Input
                  value={cronExpression}
                  onChange={(e) => handleCronChange(e.target.value)}
                  placeholder="* * * * *"
                  className={cn('font-mono', cronError && 'border-destructive')}
                />
                {cronError ? (
                  <p className="text-xs text-destructive">{cronError}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {describeCronExpression(cronExpression)}
                  </p>
                )}
              </div>
            ) : (
              <Select value={cronPreset} onValueChange={handlePresetSelect}>
                <SelectTrigger>
                  <SelectValue placeholder={t('selectSchedule') || 'Select a schedule'} />
                </SelectTrigger>
                <SelectContent>
                  {CRON_PRESETS.map((preset) => (
                    <SelectItem key={preset.id} value={preset.id}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <div className="space-y-2">
              <Label>{t('timezone') || 'Timezone'}</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONE_OPTIONS.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label} ({tz.offset})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Interval Configuration */}
        {triggerType === 'interval' && (
          <div className="space-y-2">
            <Label>{t('intervalMinutes') || 'Interval (minutes)'}</Label>
            <Input
              type="number"
              min={1}
              value={intervalMinutes}
              onChange={(e) => setIntervalMinutes(parseInt(e.target.value) || 1)}
            />
          </div>
        )}

        {/* One-time Configuration */}
        {triggerType === 'once' && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('date') || 'Date'}</Label>
              <Input
                type="date"
                value={runAtDate}
                onChange={(e) => setRunAtDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('time') || 'Time'}</Label>
              <Input
                type="time"
                value={runAtTime}
                onChange={(e) => setRunAtTime(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Event Configuration */}
        {triggerType === 'event' && (
          <div className="space-y-2">
            <Label>{t('eventType') || 'Event Type'}</Label>
            <Input
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              placeholder="e.g., message.created, workflow.completed"
            />
          </div>
        )}
      </div>

      <Separator />

      {/* Task Payload */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Settings className="h-4 w-4" />
          {t('taskPayload') || 'Task Payload'}
        </h3>
        <div className="space-y-2">
          <Textarea
            value={payloadJson}
            onChange={(e) => {
              setPayloadJson(e.target.value);
              setPayloadError(null);
            }}
            placeholder='{"key": "value"}'
            className={cn('font-mono text-sm', payloadError && 'border-destructive')}
            rows={4}
          />
          {payloadError && (
            <p className="text-xs text-destructive">{payloadError}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {t('payloadHelp') || 'JSON configuration passed to the task executor'}
          </p>
        </div>
      </div>

      <Separator />

      {/* Notifications */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Bell className="h-4 w-4" />
          {t('notifications') || 'Notifications'}
        </h3>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>{t('notifyOnStart') || 'Notify on start'}</Label>
            <Switch checked={notifyOnStart} onCheckedChange={setNotifyOnStart} />
          </div>
          <div className="flex items-center justify-between">
            <Label>{t('notifyOnComplete') || 'Notify on complete'}</Label>
            <Switch checked={notifyOnComplete} onCheckedChange={setNotifyOnComplete} />
          </div>
          <div className="flex items-center justify-between">
            <Label>{t('notifyOnError') || 'Notify on error'}</Label>
            <Switch checked={notifyOnError} onCheckedChange={setNotifyOnError} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>{t('notificationChannels') || 'Notification Channels'}</Label>
          <div className="flex flex-wrap gap-2">
            {(['desktop', 'toast'] as NotificationChannel[]).map((channel) => (
              <Badge
                key={channel}
                variant={notificationChannels.includes(channel) ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => toggleChannel(channel)}
              >
                {channel}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Advanced Settings */}
      <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full justify-between">
            {t('advancedSettings') || 'Advanced Settings'}
            {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>{t('timeoutMs') || 'Timeout (ms)'}</Label>
              <Input
                type="number"
                min={1000}
                value={timeout}
                onChange={(e) => setTimeout(parseInt(e.target.value) || 300000)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('maxRetries') || 'Max Retries'}</Label>
              <Input
                type="number"
                min={0}
                max={10}
                value={maxRetries}
                onChange={(e) => setMaxRetries(parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('retryDelayMs') || 'Retry Delay (ms)'}</Label>
              <Input
                type="number"
                min={0}
                value={retryDelay}
                onChange={(e) => setRetryDelay(parseInt(e.target.value) || 0)}
              />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Separator />

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
          {t('cancel') || 'Cancel'}
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting || !name.trim()}>
          {isSubmitting ? t('saving') || 'Saving...' : t('save') || 'Save Task'}
        </Button>
      </div>
    </div>
  );
}

export default TaskForm;
