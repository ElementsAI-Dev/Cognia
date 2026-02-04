'use client';

/**
 * SystemTaskForm - Create or edit a system scheduled task
 */

import { useCallback, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScriptTaskEditor } from '@/components/scheduler/script-task-editor';
import type {
  CreateSystemTaskInput,
  ExecuteScriptAction,
  LaunchAppAction,
  RunCommandAction,
  RunLevel,
  SystemTaskAction,
  SystemTaskTrigger,
} from '@/types/scheduler';
import { DEFAULT_SCRIPT_SETTINGS } from '@/types/scheduler';

interface SystemTaskFormProps {
  initialValues?: Partial<CreateSystemTaskInput>;
  onSubmit: (input: CreateSystemTaskInput) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

type SystemTriggerType = SystemTaskTrigger['type'];
type SystemActionType = SystemTaskAction['type'];

const defaultScriptAction: ExecuteScriptAction = {
  type: 'execute_script',
  language: 'python',
  code: '',
  timeout_secs: DEFAULT_SCRIPT_SETTINGS.timeout_secs,
  memory_mb: DEFAULT_SCRIPT_SETTINGS.memory_mb,
  use_sandbox: DEFAULT_SCRIPT_SETTINGS.use_sandbox,
};

export function SystemTaskForm({
  initialValues,
  onSubmit,
  onCancel,
  isSubmitting,
}: SystemTaskFormProps) {
  const t = useTranslations('scheduler');

  const [name, setName] = useState(initialValues?.name || '');
  const [description, setDescription] = useState(initialValues?.description || '');
  const [runLevel, setRunLevel] = useState<RunLevel>(initialValues?.run_level || 'user');

  const initialTriggerType = initialValues?.trigger?.type || 'cron';
  const cronTrigger = initialValues?.trigger?.type === 'cron' ? initialValues.trigger : null;
  const intervalTrigger = initialValues?.trigger?.type === 'interval' ? initialValues.trigger : null;
  const bootTrigger = initialValues?.trigger?.type === 'on_boot' ? initialValues.trigger : null;
  const logonTrigger = initialValues?.trigger?.type === 'on_logon' ? initialValues.trigger : null;
  const eventTrigger = initialValues?.trigger?.type === 'on_event' ? initialValues.trigger : null;
  const initialActionType = initialValues?.action?.type || 'execute_script';

  const [triggerType, setTriggerType] = useState<SystemTriggerType>(initialTriggerType);
  const [actionType, setActionType] = useState<SystemActionType>(initialActionType);

  const [cronExpression, setCronExpression] = useState(
    cronTrigger?.expression || '0 9 * * *'
  );
  const [cronTimezone, setCronTimezone] = useState(
    cronTrigger?.timezone || 'UTC'
  );
  const [intervalSeconds, setIntervalSeconds] = useState<number>(
    intervalTrigger?.seconds || 3600
  );
  const initialRunAt = useMemo(() => {
    if (initialTriggerType !== 'once') return null;
    const trigger = initialValues?.trigger;
    if (!trigger || trigger.type !== 'once') return null;
    const date = new Date(trigger.run_at);
    return Number.isNaN(date.getTime()) ? null : date;
  }, [initialTriggerType, initialValues?.trigger]);
  const [runAtDate, setRunAtDate] = useState(
    initialRunAt ? initialRunAt.toISOString().split('T')[0] : ''
  );
  const [runAtTime, setRunAtTime] = useState(
    initialRunAt ? initialRunAt.toISOString().split('T')[1]?.slice(0, 5) || '' : ''
  );
  const [bootDelaySeconds, setBootDelaySeconds] = useState<number>(
    bootTrigger?.delay_seconds || 0
  );
  const [logonUser, setLogonUser] = useState(logonTrigger?.user || '');
  const [eventSource, setEventSource] = useState(eventTrigger?.source || '');
  const [eventId, setEventId] = useState<number>(eventTrigger?.event_id || 0);

  const [scriptAction, setScriptAction] = useState<ExecuteScriptAction>(() => {
    if (initialActionType === 'execute_script') {
      return {
        ...defaultScriptAction,
        ...(initialValues?.action as ExecuteScriptAction),
      };
    }
    return defaultScriptAction;
  });

  const [command, setCommand] = useState(
    initialActionType === 'run_command'
      ? (initialValues?.action as RunCommandAction).command || ''
      : ''
  );
  const [commandArgs, setCommandArgs] = useState(
    initialActionType === 'run_command'
      ? ((initialValues?.action as RunCommandAction).args || []).join(' ')
      : ''
  );
  const [commandWorkingDir, setCommandWorkingDir] = useState(
    initialActionType === 'run_command'
      ? (initialValues?.action as RunCommandAction).working_dir || ''
      : ''
  );

  const [appPath, setAppPath] = useState(
    initialActionType === 'launch_app'
      ? (initialValues?.action as LaunchAppAction).path || ''
      : ''
  );
  const [appArgs, setAppArgs] = useState(
    initialActionType === 'launch_app'
      ? ((initialValues?.action as LaunchAppAction).args || []).join(' ')
      : ''
  );

  const triggerTypeOptions = useMemo(
    () => [
      { value: 'cron', label: t('systemCronExpression') || 'Cron Expression' },
      { value: 'interval', label: t('intervalSeconds') || 'Interval (seconds)' },
      { value: 'once', label: t('systemRunAt') || 'Run At' },
      { value: 'on_boot', label: t('triggerOnBoot') || 'On Boot' },
      { value: 'on_logon', label: t('triggerOnLogon') || 'On Logon' },
      { value: 'on_event', label: t('triggerOnEvent') || 'On Event' },
    ],
    [t]
  );

  const actionTypeOptions = useMemo(
    () => [
      { value: 'execute_script', label: t('actionScript') || 'Script' },
      { value: 'run_command', label: t('actionCommand') || 'Command' },
      { value: 'launch_app', label: t('actionApp') || 'App' },
    ],
    [t]
  );

  const buildTrigger = useCallback((): SystemTaskTrigger | null => {
    switch (triggerType) {
      case 'cron':
        if (!cronExpression.trim()) return null;
        return {
          type: 'cron',
          expression: cronExpression.trim(),
          timezone: cronTimezone || undefined,
        };
      case 'interval':
        if (intervalSeconds <= 0) return null;
        return {
          type: 'interval',
          seconds: intervalSeconds,
        };
      case 'once':
        if (!runAtDate || !runAtTime) return null;
        return {
          type: 'once',
          run_at: new Date(`${runAtDate}T${runAtTime}`).toISOString(),
        };
      case 'on_boot':
        return {
          type: 'on_boot',
          delay_seconds: bootDelaySeconds || 0,
        };
      case 'on_logon':
        return {
          type: 'on_logon',
          user: logonUser.trim() || undefined,
        };
      case 'on_event':
        if (!eventSource.trim() || !eventId) return null;
        return {
          type: 'on_event',
          source: eventSource.trim(),
          event_id: eventId,
        };
      default:
        return null;
    }
  }, [
    triggerType,
    cronExpression,
    cronTimezone,
    intervalSeconds,
    runAtDate,
    runAtTime,
    bootDelaySeconds,
    logonUser,
    eventSource,
    eventId,
  ]);

  const buildAction = useCallback((): SystemTaskAction | null => {
    switch (actionType) {
      case 'execute_script':
        if (!scriptAction.code.trim()) return null;
        return scriptAction;
      case 'run_command':
        if (!command.trim()) return null;
        return {
          type: 'run_command',
          command: command.trim(),
          args: commandArgs.split(' ').filter(Boolean),
          working_dir: commandWorkingDir.trim() || undefined,
        };
      case 'launch_app':
        if (!appPath.trim()) return null;
        return {
          type: 'launch_app',
          path: appPath.trim(),
          args: appArgs.split(' ').filter(Boolean),
        };
      default:
        return null;
    }
  }, [actionType, scriptAction, command, commandArgs, commandWorkingDir, appPath, appArgs]);

  const handleSubmit = useCallback(async () => {
    const trigger = buildTrigger();
    const action = buildAction();

    if (!name.trim() || !trigger || !action) {
      return;
    }

    const input: CreateSystemTaskInput = {
      name: name.trim(),
      description: description.trim() || undefined,
      trigger,
      action,
      run_level: runLevel,
    };

    await onSubmit(input);
  }, [buildTrigger, buildAction, name, description, runLevel, onSubmit]);

  const isSubmitDisabled = useMemo(() => {
    return (
      isSubmitting ||
      !name.trim() ||
      buildTrigger() === null ||
      buildAction() === null
    );
  }, [isSubmitting, name, buildTrigger, buildAction]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>{t('systemTaskName') || 'Task Name'}</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('taskNamePlaceholder') || 'Enter task name'}
          disabled={isSubmitting}
        />
      </div>

      <div className="space-y-2">
        <Label>{t('systemTaskDescription') || 'Task Description'}</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('descriptionPlaceholder') || 'Describe what this task does'}
          rows={2}
          disabled={isSubmitting}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>{t('systemRunLevel') || 'Run Level'}</Label>
          <Select value={runLevel} onValueChange={(value) => setRunLevel(value as RunLevel)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="user">{t('runLevelUser') || 'User'}</SelectItem>
              <SelectItem value="administrator">{t('runLevelAdmin') || 'Administrator'}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t('systemTriggerType') || 'Trigger Type'}</Label>
          <Select value={triggerType} onValueChange={(value) => setTriggerType(value as SystemTriggerType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {triggerTypeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {triggerType === 'cron' && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>{t('systemCronExpression') || 'Cron Expression'}</Label>
            <Input
              value={cronExpression}
              onChange={(e) => setCronExpression(e.target.value)}
              placeholder="0 9 * * *"
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('timezone') || 'Timezone'}</Label>
            <Input
              value={cronTimezone}
              onChange={(e) => setCronTimezone(e.target.value)}
              placeholder="UTC"
              disabled={isSubmitting}
            />
          </div>
        </div>
      )}

      {triggerType === 'interval' && (
        <div className="space-y-2">
          <Label>{t('intervalSeconds') || 'Interval (seconds)'}</Label>
          <Input
            type="number"
            min={1}
            value={intervalSeconds}
            onChange={(e) => setIntervalSeconds(parseInt(e.target.value) || 0)}
            disabled={isSubmitting}
          />
        </div>
      )}

      {triggerType === 'once' && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>{t('date') || 'Date'}</Label>
            <Input
              type="date"
              value={runAtDate}
              onChange={(e) => setRunAtDate(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('time') || 'Time'}</Label>
            <Input
              type="time"
              value={runAtTime}
              onChange={(e) => setRunAtTime(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
        </div>
      )}

      {triggerType === 'on_boot' && (
        <div className="space-y-2">
          <Label>{t('onBootDelaySeconds') || 'Boot Delay (seconds)'}</Label>
          <Input
            type="number"
            min={0}
            value={bootDelaySeconds}
            onChange={(e) => setBootDelaySeconds(parseInt(e.target.value) || 0)}
            disabled={isSubmitting}
          />
        </div>
      )}

      {triggerType === 'on_logon' && (
        <div className="space-y-2">
          <Label>{t('onLogonUser') || 'Logon User (optional)'}</Label>
          <Input
            value={logonUser}
            onChange={(e) => setLogonUser(e.target.value)}
            placeholder="username"
            disabled={isSubmitting}
          />
        </div>
      )}

      {triggerType === 'on_event' && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>{t('onEventSource') || 'Event Source'}</Label>
            <Input
              value={eventSource}
              onChange={(e) => setEventSource(e.target.value)}
              placeholder="Source"
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('onEventId') || 'Event ID'}</Label>
            <Input
              type="number"
              min={0}
              value={eventId}
              onChange={(e) => setEventId(parseInt(e.target.value) || 0)}
              disabled={isSubmitting}
            />
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label>{t('systemActionType') || 'Action Type'}</Label>
        <Select value={actionType} onValueChange={(value) => setActionType(value as SystemActionType)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {actionTypeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {actionType === 'execute_script' && (
        <ScriptTaskEditor value={scriptAction} onChange={setScriptAction} disabled={isSubmitting} />
      )}

      {actionType === 'run_command' && (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>{t('command') || 'Command'}</Label>
            <Input
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="/usr/bin/echo"
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('commandArgs') || 'Command Arguments'}</Label>
            <Input
              value={commandArgs}
              onChange={(e) => setCommandArgs(e.target.value)}
              placeholder="arg1 arg2"
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('workingDir') || 'Working Directory'}</Label>
            <Input
              value={commandWorkingDir}
              onChange={(e) => setCommandWorkingDir(e.target.value)}
              placeholder="/path/to/dir"
              disabled={isSubmitting}
            />
          </div>
        </div>
      )}

      {actionType === 'launch_app' && (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>{t('appPath') || 'Application Path'}</Label>
            <Input
              value={appPath}
              onChange={(e) => setAppPath(e.target.value)}
              placeholder="/Applications/MyApp.app"
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('appArgs') || 'Application Arguments'}</Label>
            <Input
              value={appArgs}
              onChange={(e) => setAppArgs(e.target.value)}
              placeholder="--flag value"
              disabled={isSubmitting}
            />
          </div>
        </div>
      )}

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1"
        >
          {t('cancel') || 'Cancel'}
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isSubmitDisabled}
          className="flex-1"
        >
          {isSubmitting ? t('saving') || 'Saving...' : t('save') || 'Save Task'}
        </Button>
      </div>
    </div>
  );
}
