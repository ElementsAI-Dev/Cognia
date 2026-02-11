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
import { validateCronExpression, describeCronExpression, formatCronExpression, parseCronExpression } from '@/lib/scheduler/cron-parser';
import { testNotificationChannel } from '@/lib/scheduler/notification-integration';

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
  { value: 'plugin', label: 'Plugin', labelZh: '插件' },
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
  const [nameError, setNameError] = useState<string | null>(null);
  const [triggerError, setTriggerError] = useState<string | null>(null);
  const [notificationTestResult, setNotificationTestResult] = useState<{ channel: string; success: boolean; error?: string } | null>(null);
  const [isTestingNotification, setIsTestingNotification] = useState(false);

  // Validation constants
  const MAX_NAME_LENGTH = 100;
  const MIN_INTERVAL_MINUTES = 1;
  const MAX_PAYLOAD_SIZE = 64 * 1024; // 64KB

  // Validate cron expression
  const handleCronChange = useCallback((value: string) => {
    setCronExpression(value);
    const result = validateCronExpression(value);
    setCronError(result.valid ? null : result.error || 'Invalid expression');
  }, []);

  // Format cron expression (normalize whitespace/parts)
  const handleFormatCron = useCallback(() => {
    const parts = parseCronExpression(cronExpression);
    if (parts) {
      const formatted = formatCronExpression(parts);
      if (formatted !== cronExpression) {
        setCronExpression(formatted);
        setCronError(null);
      }
    }
  }, [cronExpression]);

  // Test notification channel
  const handleTestNotification = useCallback(async (channel: NotificationChannel) => {
    setIsTestingNotification(true);
    setNotificationTestResult(null);
    try {
      const result = await testNotificationChannel(channel);
      setNotificationTestResult({ channel, success: result.success, error: result.error });
    } catch (err) {
      setNotificationTestResult({ channel, success: false, error: err instanceof Error ? err.message : 'Test failed' });
    } finally {
      setIsTestingNotification(false);
    }
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
    let hasErrors = false;

    // Validate name
    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError(t('nameRequired') || 'Task name is required');
      hasErrors = true;
    } else if (trimmedName.length > MAX_NAME_LENGTH) {
      setNameError(t('nameTooLong') || `Name must be ${MAX_NAME_LENGTH} characters or less`);
      hasErrors = true;
    } else {
      setNameError(null);
    }

    // Validate payload JSON and size
    let payload: Record<string, unknown> = {};
    try {
      payload = JSON.parse(payloadJson);
      if (payloadJson.length > MAX_PAYLOAD_SIZE) {
        setPayloadError(t('payloadTooLarge') || 'Payload exceeds 64KB limit');
        hasErrors = true;
      } else {
        setPayloadError(null);
      }
    } catch {
      setPayloadError(t('invalidJson') || 'Invalid JSON');
      hasErrors = true;
    }

    // Validate trigger-specific fields
    setTriggerError(null);

    // Build trigger
    const trigger: CreateScheduledTaskInput['trigger'] = {
      type: triggerType,
      timezone,
    };

    switch (triggerType) {
      case 'cron':
        if (cronError) {
          hasErrors = true;
        }
        trigger.cronExpression = cronExpression;
        break;
      case 'interval':
        if (intervalMinutes < MIN_INTERVAL_MINUTES) {
          setTriggerError(t('intervalTooShort') || `Interval must be at least ${MIN_INTERVAL_MINUTES} minute(s)`);
          hasErrors = true;
        }
        trigger.intervalMs = intervalMinutes * 60 * 1000;
        break;
      case 'once':
        if (!runAtDate || !runAtTime) {
          setTriggerError(t('dateTimeRequired') || 'Date and time are required');
          hasErrors = true;
        } else {
          const runAt = new Date(`${runAtDate}T${runAtTime}`);
          if (runAt <= new Date()) {
            setTriggerError(t('dateInPast') || 'Scheduled time must be in the future');
            hasErrors = true;
          }
          trigger.runAt = runAt;
        }
        break;
      case 'event':
        if (!eventType.trim()) {
          setTriggerError(t('eventTypeRequired') || 'Event type is required');
          hasErrors = true;
        }
        trigger.eventType = eventType;
        break;
    }

    if (hasErrors) return;

    const input: CreateScheduledTaskInput = {
      name: trimmedName,
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
    <div className="space-y-4 sm:space-y-5">
      {/* Basic Info Section */}
      <div className="rounded-xl border bg-gradient-to-br from-card to-card/50 p-3 sm:p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Settings className="h-4 w-4 text-primary" />
          </div>
          <h3 className="font-semibold">{t('basicInfo') || 'Basic Information'}</h3>
        </div>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">
              {t('taskName') || 'Task Name'} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => { setName(e.target.value); setNameError(null); }}
              placeholder={t('taskNamePlaceholder') || 'Enter task name'}
              maxLength={MAX_NAME_LENGTH}
              className={cn(
                'h-10 transition-all focus:ring-2 focus:ring-primary/20',
                nameError && 'border-destructive focus:ring-destructive/20'
              )}
            />
            {nameError && (
              <p className="text-xs text-destructive">{nameError}</p>
            )}
            {name.length > MAX_NAME_LENGTH * 0.8 && (
              <p className="text-xs text-muted-foreground">{name.length}/{MAX_NAME_LENGTH}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              {t('description') || 'Description'}
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('descriptionPlaceholder') || 'Describe what this task does'}
              rows={2}
              className="resize-none transition-all focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">{t('taskType') || 'Task Type'}</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5">
              {TASK_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setTaskType(type.value)}
                  className={cn(
                    'rounded-lg border px-2 py-2 text-xs font-medium transition-all',
                    'hover:border-primary/50 hover:bg-primary/5',
                    taskType === type.value
                      ? 'border-primary bg-primary/10 text-primary shadow-sm'
                      : 'border-border bg-background text-muted-foreground'
                  )}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Trigger Configuration Section */}
      <div className="rounded-xl border bg-gradient-to-br from-card to-card/50 p-3 sm:p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
            <Clock className="h-4 w-4 text-blue-500" />
          </div>
          <h3 className="font-semibold">{t('triggerConfig') || 'Trigger Configuration'}</h3>
        </div>

        <div className="space-y-4">
          {/* Trigger Type Selection */}
          <div className="grid grid-cols-1 xs:grid-cols-2 gap-2">
            {TRIGGER_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setTriggerType(type.value)}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg border p-3 text-left transition-all',
                  'hover:border-blue-500/50 hover:bg-blue-500/5',
                  triggerType === type.value
                    ? 'border-blue-500 bg-blue-500/10 shadow-sm'
                    : 'border-border bg-background/50'
                )}
              >
                <div className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
                  triggerType === type.value ? 'bg-blue-500 text-white' : 'bg-muted text-muted-foreground'
                )}>
                  {type.icon}
                </div>
                <div className="min-w-0">
                  <div className={cn(
                    'text-sm font-medium truncate',
                    triggerType === type.value ? 'text-blue-600 dark:text-blue-400' : 'text-foreground'
                  )}>
                    {type.label}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Cron Configuration */}
          {triggerType === 'cron' && (
            <div className="space-y-4 rounded-lg border border-dashed bg-muted/30 p-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm">{t('useCustomCron') || 'Use custom cron expression'}</Label>
                <Switch
                  checked={useCustomCron}
                  onCheckedChange={setUseCustomCron}
                />
              </div>

              {useCustomCron ? (
                <div className="space-y-2">
                  <Input
                    value={cronExpression}
                    onChange={(e) => handleCronChange(e.target.value)}
                    placeholder="* * * * *"
                    className={cn(
                      'h-10 font-mono text-sm transition-all',
                      cronError ? 'border-destructive focus:ring-destructive/20' : 'focus:ring-2 focus:ring-primary/20'
                    )}
                  />
                  {cronError ? (
                    <p className="text-xs text-destructive">{cronError}</p>
                  ) : (
                    <div className="space-y-1">
                      <p className="rounded-md bg-green-500/10 px-2 py-1 text-xs text-green-600 dark:text-green-400">
                        {describeCronExpression(cronExpression)}
                      </p>
                      <button
                        type="button"
                        onClick={handleFormatCron}
                        className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {t('formatExpression') || 'Format expression'}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Select value={cronPreset} onValueChange={handlePresetSelect}>
                  <SelectTrigger className="h-10">
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
                <Label className="text-sm">{t('timezone') || 'Timezone'}</Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger className="h-10">
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
            <div className="space-y-2 rounded-lg border border-dashed bg-muted/30 p-3">
              <Label className="text-sm">{t('intervalMinutes') || 'Interval (minutes)'}</Label>
              <Input
                type="number"
                min={1}
                value={intervalMinutes}
                onChange={(e) => setIntervalMinutes(parseInt(e.target.value) || 1)}
                className="h-10 transition-all focus:ring-2 focus:ring-primary/20"
              />
            </div>
          )}

          {/* One-time Configuration */}
          {triggerType === 'once' && (
            <div className="grid grid-cols-2 gap-3 rounded-lg border border-dashed bg-muted/30 p-3">
              <div className="space-y-2">
                <Label className="text-sm">{t('date') || 'Date'}</Label>
                <Input
                  type="date"
                  value={runAtDate}
                  onChange={(e) => setRunAtDate(e.target.value)}
                  className="h-10 transition-all focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">{t('time') || 'Time'}</Label>
                <Input
                  type="time"
                  value={runAtTime}
                  onChange={(e) => setRunAtTime(e.target.value)}
                  className="h-10 transition-all focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
          )}

          {/* Event Configuration */}
          {triggerType === 'event' && (
            <div className="space-y-2 rounded-lg border border-dashed bg-muted/30 p-3">
              <Label className="text-sm">{t('eventType') || 'Event Type'}</Label>
              <Input
                value={eventType}
                onChange={(e) => { setEventType(e.target.value); setTriggerError(null); }}
                placeholder="e.g., message.created, workflow.completed"
                className="h-10 transition-all focus:ring-2 focus:ring-primary/20"
              />
            </div>
          )}

          {/* Trigger validation error */}
          {triggerError && (
            <p className="text-xs text-destructive">{triggerError}</p>
          )}
        </div>
      </div>

      {/* Task Payload Section */}
      <div className="rounded-xl border bg-gradient-to-br from-card to-card/50 p-3 sm:p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10">
            <Settings className="h-4 w-4 text-purple-500" />
          </div>
          <div>
            <h3 className="font-semibold">{t('taskPayload') || 'Task Payload'}</h3>
            <p className="text-xs text-muted-foreground">
              {t('payloadHelp') || 'JSON configuration passed to the task executor'}
            </p>
          </div>
        </div>
        
        <div className="space-y-2">
          <Textarea
            value={payloadJson}
            onChange={(e) => {
              setPayloadJson(e.target.value);
              setPayloadError(null);
            }}
            placeholder='{"key": "value"}'
            className={cn(
              'min-h-[100px] resize-none font-mono text-sm transition-all',
              payloadError ? 'border-destructive focus:ring-destructive/20' : 'focus:ring-2 focus:ring-primary/20'
            )}
            rows={4}
          />
          {payloadError && (
            <p className="text-xs text-destructive">{payloadError}</p>
          )}
        </div>
      </div>

      {/* Notifications Section */}
      <div className="rounded-xl border bg-gradient-to-br from-card to-card/50 p-3 sm:p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
            <Bell className="h-4 w-4 text-amber-500" />
          </div>
          <h3 className="font-semibold">{t('notifications') || 'Notifications'}</h3>
        </div>

        <div className="space-y-4">
          <div className="grid gap-2">
            {[
              { key: 'start', label: t('notifyOnStart') || 'Notify on start', checked: notifyOnStart, onChange: setNotifyOnStart },
              { key: 'complete', label: t('notifyOnComplete') || 'Notify on complete', checked: notifyOnComplete, onChange: setNotifyOnComplete },
              { key: 'error', label: t('notifyOnError') || 'Notify on error', checked: notifyOnError, onChange: setNotifyOnError },
            ].map((item) => (
              <div
                key={item.key}
                className={cn(
                  'flex items-center justify-between rounded-lg border px-3 py-2.5 transition-all',
                  item.checked ? 'border-amber-500/30 bg-amber-500/5' : 'border-border bg-background/50'
                )}
              >
                <Label className="cursor-pointer text-sm">{item.label}</Label>
                <Switch checked={item.checked} onCheckedChange={item.onChange} />
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">{t('notificationChannels') || 'Channels'}</Label>
            <div className="flex gap-2">
              {(['desktop', 'toast'] as NotificationChannel[]).map((channel) => (
                <div key={channel} className="flex-1 space-y-1">
                  <button
                    type="button"
                    onClick={() => toggleChannel(channel)}
                    className={cn(
                      'w-full rounded-lg border px-3 py-2 text-sm font-medium capitalize transition-all',
                      'hover:border-amber-500/50 hover:bg-amber-500/5',
                      notificationChannels.includes(channel)
                        ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        : 'border-border bg-background/50 text-muted-foreground'
                    )}
                  >
                    {channel}
                  </button>
                  {notificationChannels.includes(channel) && (
                    <button
                      type="button"
                      onClick={() => handleTestNotification(channel)}
                      disabled={isTestingNotification}
                      className="w-full text-[10px] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                    >
                      {isTestingNotification ? (t('testing') || 'Testing...') : (t('testChannel') || 'Test')}
                    </button>
                  )}
                </div>
              ))}
            </div>
            {notificationTestResult && (
              <p className={cn(
                'text-xs px-2 py-1 rounded-md',
                notificationTestResult.success
                  ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                  : 'bg-red-500/10 text-red-600 dark:text-red-400'
              )}>
                {notificationTestResult.success
                  ? `${notificationTestResult.channel}: ${t('testSuccess') || 'Test passed'}`
                  : `${notificationTestResult.channel}: ${notificationTestResult.error || t('testFailed') || 'Test failed'}`}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Advanced Settings */}
      <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className={cn(
              'flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium transition-all',
              'hover:bg-muted/50',
              showAdvanced ? 'bg-muted/30' : 'bg-background'
            )}
          >
            <span className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-muted-foreground" />
              {t('advancedSettings') || 'Advanced Settings'}
            </span>
            {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 rounded-xl border bg-muted/20 p-3 sm:p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">{t('timeoutMs') || 'Timeout (ms)'}</Label>
              <Input
                type="number"
                min={1000}
                value={timeout}
                onChange={(e) => setTimeout(parseInt(e.target.value) || 300000)}
                className="h-9 text-sm transition-all focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">{t('maxRetries') || 'Max Retries'}</Label>
              <Input
                type="number"
                min={0}
                max={10}
                value={maxRetries}
                onChange={(e) => setMaxRetries(parseInt(e.target.value) || 0)}
                className="h-9 text-sm transition-all focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">{t('retryDelayMs') || 'Retry Delay (ms)'}</Label>
              <Input
                type="number"
                min={0}
                value={retryDelay}
                onChange={(e) => setRetryDelay(parseInt(e.target.value) || 0)}
                className="h-9 text-sm transition-all focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Actions */}
      <div className="flex flex-col-reverse xs:flex-row gap-2 sm:gap-3 pt-2">
        <Button 
          variant="outline" 
          onClick={onCancel} 
          disabled={isSubmitting}
          className="flex-1 h-10 sm:h-11"
        >
          {t('cancel') || 'Cancel'}
        </Button>
        <Button 
          onClick={handleSubmit} 
          disabled={isSubmitting || !name.trim()}
          className="flex-1 h-10 sm:h-11 bg-gradient-to-r from-primary to-primary/80 shadow-md transition-all hover:shadow-lg"
        >
          {isSubmitting ? t('saving') || 'Saving...' : t('save') || 'Save Task'}
        </Button>
      </div>
    </div>
  );
}

export default TaskForm;
