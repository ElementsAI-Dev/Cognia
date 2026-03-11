'use client';

/**
 * Backup Schedule Dialog
 * Dialog for scheduling automatic backups
 */

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Calendar, Clock, Database, Upload, X, ChevronDown, ChevronUp } from 'lucide-react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { useScheduler } from '@/hooks/scheduler';
import {
  type BackupDestination,
  type BackupTaskPayload,
  type BackupTaskType,
  DEFAULT_EXECUTION_CONFIG,
} from '@/types/scheduler';
import { TimezoneSelect } from '@/components/scheduler/timezone-select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

type BackupType = Exclude<BackupTaskType, 'plugins'>;

interface BackupScheduleDialogProps {
  trigger?: React.ReactNode;
  onScheduled?: (taskId: string) => void;
}

// Backup schedule presets
const SCHEDULE_PRESETS = [
  { label: 'Every day at 2 AM', value: '0 2 * * *', description: 'Daily backup' },
  { label: 'Every week (Sunday)', value: '0 2 * * 0', description: 'Weekly backup' },
  { label: 'Every month (1st)', value: '0 2 1 * *', description: 'Monthly backup' },
  { label: 'Every 6 hours', value: '0 */6 * * *', description: 'Frequent backup' },
];

export function BackupScheduleDialog({
  trigger,
  onScheduled,
}: BackupScheduleDialogProps) {
  const t = useTranslations('scheduler');
  const { createTask } = useScheduler();

  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [taskName, setTaskName] = useState('Scheduled Backup');
  const [cronExpression, setCronExpression] = useState('0 2 * * *');
  const [timezone, setTimezone] = useState('UTC');
  const [backupType, setBackupType] = useState<BackupType>('full');
  const [destination, setDestination] = useState<BackupDestination>('local');
  const [showAdvancedConfig, setShowAdvancedConfig] = useState(false);
  const [maxRetries, setMaxRetries] = useState(DEFAULT_EXECUTION_CONFIG.maxRetries);
  const [retryDelay, setRetryDelay] = useState(DEFAULT_EXECUTION_CONFIG.retryDelay);
  const [runMissedOnStartup, setRunMissedOnStartup] = useState(DEFAULT_EXECUTION_CONFIG.runMissedOnStartup);
  const [maxMissedRuns, setMaxMissedRuns] = useState(DEFAULT_EXECUTION_CONFIG.maxMissedRuns ?? 1);
  const [allowConcurrent, setAllowConcurrent] = useState(DEFAULT_EXECUTION_CONFIG.allowConcurrent);
  
  // Backup options
  const [includeSessions, setIncludeSessions] = useState(true);
  const [includeSettings, setIncludeSettings] = useState(true);
  const [includeArtifacts, setIncludeArtifacts] = useState(true);
  const [includeIndexedDB, setIncludeIndexedDB] = useState(true);
  
  // Notifications
  const [notifyOnComplete, setNotifyOnComplete] = useState(true);
  const [notifyOnError, setNotifyOnError] = useState(true);

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    try {
      const task = await createTask({
        name: taskName,
        type: 'backup',
        trigger: {
          type: 'cron',
          cronExpression,
          timezone,
        },
        payload: {
          backupType,
          destination,
          options: {
            includeSessions,
            includeSettings,
            includeArtifacts,
            includeIndexedDB,
          },
        } satisfies BackupTaskPayload,
        notification: {
          onStart: false,
          onComplete: notifyOnComplete,
          onError: notifyOnError,
          onProgress: false,
          channels: ['toast', 'desktop'],
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
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [
    taskName,
    cronExpression,
    timezone,
    backupType,
    destination,
    includeSessions,
    includeSettings,
    includeArtifacts,
    includeIndexedDB,
    notifyOnComplete,
    notifyOnError,
    maxRetries,
    retryDelay,
    runMissedOnStartup,
    maxMissedRuns,
    allowConcurrent,
    createTask,
    onScheduled,
  ]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Calendar className="mr-2 h-4 w-4" />
            {t('backup.schedule')}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            {t('backup.scheduleTitle')}
          </DialogTitle>
          <DialogDescription>
            {t('backup.scheduleDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Task Name */}
          <div className="space-y-2">
            <Label htmlFor="backup-name">{t('taskName')}</Label>
            <Input
              id="backup-name"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              placeholder={t('backup.namePlaceholder')}
            />
          </div>

          {/* Schedule */}
          <div className="space-y-2">
            <Label>{t('backup.scheduleFrequency')}</Label>
            <Select value={cronExpression} onValueChange={setCronExpression}>
              <SelectTrigger>
                <SelectValue placeholder={t('selectPreset')} />
              </SelectTrigger>
              <SelectContent>
                {SCHEDULE_PRESETS.map((preset) => (
                  <SelectItem key={preset.value} value={preset.value}>
                    <div className="flex flex-col">
                      <span>{preset.label}</span>
                      <span className="text-xs text-muted-foreground">{preset.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Input
                value={cronExpression}
                onChange={(e) => setCronExpression(e.target.value)}
                placeholder="0 2 * * *"
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">{t('timezone') || 'Timezone'}</Label>
              <TimezoneSelect
                value={timezone}
                onValueChange={setTimezone}
                testId="backup-schedule-timezone"
                includeOffset
              />
            </div>
          </div>

          {/* Backup Type */}
          <div className="space-y-2">
            <Label>{t('backup.type')}</Label>
            <Select value={backupType} onValueChange={(v) => setBackupType(v as BackupType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full">{t('backup.types.full')}</SelectItem>
                <SelectItem value="sessions">{t('backup.types.sessions')}</SelectItem>
                <SelectItem value="settings">{t('backup.types.settings')}</SelectItem>
                <SelectItem value="all">{t('backup.types.all')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Destination */}
          <div className="space-y-2">
            <Label>{t('backup.destination')}</Label>
            <Select value={destination} onValueChange={(v) => setDestination(v as BackupDestination)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="local">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    {t('backup.destinations.local')}
                  </div>
                </SelectItem>
                <SelectItem value="webdav">
                  <div className="flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    {t('backup.destinations.webdav')}
                  </div>
                </SelectItem>
                <SelectItem value="github">
                  <div className="flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    {t('backup.destinations.github')}
                  </div>
                </SelectItem>
                <SelectItem value="googledrive">
                  <div className="flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    {t('backup.destinations.googledrive')}
                  </div>
                </SelectItem>
                <SelectItem value="convex">
                  <div className="flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    {t('backup.destinations.convex')}
                  </div>
                </SelectItem>
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    {t('backup.destinations.all')}
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {t('backup.destinationHint') || 'Choose where this scheduled backup should be uploaded.'}
            </p>
          </div>

          {/* Backup Options */}
          {backupType === 'full' && (
            <div className="space-y-3 rounded-lg border p-3">
              <Label className="text-sm font-medium">{t('backup.includeOptions')}</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-sessions"
                    checked={includeSessions}
                    onCheckedChange={(c) => setIncludeSessions(c === true)}
                  />
                  <label htmlFor="include-sessions" className="text-sm">
                    {t('backup.options.sessions')}
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-settings"
                    checked={includeSettings}
                    onCheckedChange={(c) => setIncludeSettings(c === true)}
                  />
                  <label htmlFor="include-settings" className="text-sm">
                    {t('backup.options.settings')}
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-artifacts"
                    checked={includeArtifacts}
                    onCheckedChange={(c) => setIncludeArtifacts(c === true)}
                  />
                  <label htmlFor="include-artifacts" className="text-sm">
                    {t('backup.options.artifacts')}
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-indexeddb"
                    checked={includeIndexedDB}
                    onCheckedChange={(c) => setIncludeIndexedDB(c === true)}
                  />
                  <label htmlFor="include-indexeddb" className="text-sm">
                    {t('backup.options.indexedDB')}
                  </label>
                </div>
              </div>
            </div>
          )}

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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            <X className="mr-2 h-4 w-4" />
            {t('cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !taskName.trim()}>
            <Calendar className="mr-2 h-4 w-4" />
            {isSubmitting ? t('scheduling') : t('schedule')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
