'use client';

/**
 * WorkflowTriggerPanel - Configure workflow triggers
 * Supports manual, scheduled (cron), and event-based triggers
 */

import { useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  Play,
  Clock,
  Zap,
  Webhook,
  Calendar,
  Trash2,
  Settings,
  CheckCircle,
  XCircle,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { useWorkflowEditorStore } from '@/stores/workflow';
import type {
  TriggerType,
  WorkflowTrigger,
  TriggerConfig,
} from '@/types/workflow/workflow-editor';

export type { TriggerType, WorkflowTrigger, TriggerConfig };

// Common cron presets
const CRON_PRESETS = [
  { label: 'Every minute', value: '* * * * *' },
  { label: 'Every 5 minutes', value: '*/5 * * * *' },
  { label: 'Every 15 minutes', value: '*/15 * * * *' },
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Every day at midnight', value: '0 0 * * *' },
  { label: 'Every day at 9am', value: '0 9 * * *' },
  { label: 'Every Monday at 9am', value: '0 9 * * 1' },
  { label: 'Every month (1st day)', value: '0 0 1 * *' },
];

// Event types
const EVENT_TYPES = [
  { value: 'message.created', label: 'New message created' },
  { value: 'session.created', label: 'New session created' },
  { value: 'artifact.created', label: 'New artifact created' },
  { value: 'file.uploaded', label: 'File uploaded' },
  { value: 'workflow.completed', label: 'Workflow completed' },
  { value: 'custom', label: 'Custom event' },
];

interface WorkflowTriggerPanelProps {
  className?: string;
}

export function WorkflowTriggerPanel({ className }: WorkflowTriggerPanelProps) {
  const t = useTranslations('workflowEditor');
  const { currentWorkflow, updateWorkflowSettings } = useWorkflowEditorStore();

  // Get triggers from workflow settings or initialize empty
  const triggers = useMemo<WorkflowTrigger[]>(() => {
    return currentWorkflow?.settings.triggers || [];
  }, [currentWorkflow?.settings]);

  const [expandedTrigger, setExpandedTrigger] = useState<string | null>(null);

  // Add new trigger
  const handleAddTrigger = useCallback((type: TriggerType) => {
    const newTrigger: WorkflowTrigger = {
      id: `trigger-${Date.now()}`,
      type,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} Trigger`,
      enabled: true,
      config: {},
    };

    const updatedTriggers = [...triggers, newTrigger];
    updateWorkflowSettings({ triggers: updatedTriggers });
    setExpandedTrigger(newTrigger.id);
  }, [triggers, updateWorkflowSettings]);

  // Update trigger
  const handleUpdateTrigger = useCallback((triggerId: string, updates: Partial<WorkflowTrigger>) => {
    const updatedTriggers = triggers.map(t =>
      t.id === triggerId ? { ...t, ...updates } : t
    );
    updateWorkflowSettings({ triggers: updatedTriggers });
  }, [triggers, updateWorkflowSettings]);

  // Delete trigger
  const handleDeleteTrigger = useCallback((triggerId: string) => {
    const updatedTriggers = triggers.filter(t => t.id !== triggerId);
    updateWorkflowSettings({ triggers: updatedTriggers });
  }, [triggers, updateWorkflowSettings]);

  // Toggle trigger enabled
  const handleToggleTrigger = useCallback((triggerId: string) => {
    const trigger = triggers.find(t => t.id === triggerId);
    if (trigger) {
      handleUpdateTrigger(triggerId, { enabled: !trigger.enabled });
    }
  }, [triggers, handleUpdateTrigger]);

  const getTriggerIcon = (type: TriggerType) => {
    switch (type) {
      case 'manual':
        return <Play className="h-4 w-4" />;
      case 'schedule':
        return <Clock className="h-4 w-4" />;
      case 'event':
        return <Zap className="h-4 w-4" />;
      case 'webhook':
        return <Webhook className="h-4 w-4" />;
    }
  };

  const getTriggerColor = (type: TriggerType) => {
    switch (type) {
      case 'manual':
        return 'text-blue-500';
      case 'schedule':
        return 'text-purple-500';
      case 'event':
        return 'text-amber-500';
      case 'webhook':
        return 'text-green-500';
    }
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      <div className="p-4 border-b">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Settings className="h-5 w-5" />
          {t('triggers') || 'Triggers'}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          {t('triggersDescription') || 'Configure how this workflow is triggered'}
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Add trigger buttons */}
          <div className="grid grid-cols-2 gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-auto py-3 flex flex-col gap-1"
                    onClick={() => handleAddTrigger('manual')}
                  >
                    <Play className="h-5 w-5 text-blue-500" />
                    <span className="text-xs">{t('manual') || 'Manual'}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {t('manualTriggerDesc') || 'Run workflow manually'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-auto py-3 flex flex-col gap-1"
                    onClick={() => handleAddTrigger('schedule')}
                  >
                    <Clock className="h-5 w-5 text-purple-500" />
                    <span className="text-xs">{t('schedule') || 'Schedule'}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {t('scheduleTriggerDesc') || 'Run on a schedule (cron)'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-auto py-3 flex flex-col gap-1"
                    onClick={() => handleAddTrigger('event')}
                  >
                    <Zap className="h-5 w-5 text-amber-500" />
                    <span className="text-xs">{t('event') || 'Event'}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {t('eventTriggerDesc') || 'Run when an event occurs'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-auto py-3 flex flex-col gap-1"
                    onClick={() => handleAddTrigger('webhook')}
                  >
                    <Webhook className="h-5 w-5 text-green-500" />
                    <span className="text-xs">{t('webhook') || 'Webhook'}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {t('webhookTriggerDesc') || 'Run via HTTP webhook'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <Separator />

          {/* Trigger list */}
          {triggers.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">
                {t('noTriggers') || 'No triggers configured'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t('addTriggerHint') || 'Add a trigger to automate this workflow'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {triggers.map((trigger) => (
                <Collapsible
                  key={trigger.id}
                  open={expandedTrigger === trigger.id}
                  onOpenChange={(open) => setExpandedTrigger(open ? trigger.id : null)}
                >
                  <Card className={cn(
                    'transition-colors',
                    !trigger.enabled && 'opacity-60'
                  )}>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={getTriggerColor(trigger.type)}>
                              {getTriggerIcon(trigger.type)}
                            </span>
                            <div>
                              <CardTitle className="text-sm">{trigger.name}</CardTitle>
                              <CardDescription className="text-xs">
                                {trigger.type.charAt(0).toUpperCase() + trigger.type.slice(1)}
                              </CardDescription>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={trigger.enabled ? 'default' : 'secondary'}>
                              {trigger.enabled ? (
                                <CheckCircle className="h-3 w-3 mr-1" />
                              ) : (
                                <XCircle className="h-3 w-3 mr-1" />
                              )}
                              {trigger.enabled ? 'Active' : 'Disabled'}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <CardContent className="p-3 pt-0 space-y-3">
                        <Separator />

                        {/* Trigger name */}
                        <div className="space-y-1.5">
                          <Label className="text-xs">{t('triggerName') || 'Name'}</Label>
                          <Input
                            value={trigger.name}
                            onChange={(e) => handleUpdateTrigger(trigger.id, { name: e.target.value })}
                            className="h-8 text-sm"
                          />
                        </div>

                        {/* Trigger-specific config */}
                        {trigger.type === 'schedule' && (
                          <ScheduleTriggerConfig
                            config={trigger.config}
                            onChange={(config) => handleUpdateTrigger(trigger.id, { config })}
                          />
                        )}

                        {trigger.type === 'event' && (
                          <EventTriggerConfig
                            config={trigger.config}
                            onChange={(config) => handleUpdateTrigger(trigger.id, { config })}
                          />
                        )}

                        {trigger.type === 'webhook' && (
                          <WebhookTriggerConfig
                            config={trigger.config}
                            workflowId={currentWorkflow?.id || ''}
                            onChange={(config) => handleUpdateTrigger(trigger.id, { config })}
                          />
                        )}

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-2">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={trigger.enabled}
                              onCheckedChange={() => handleToggleTrigger(trigger.id)}
                            />
                            <Label className="text-xs">
                              {trigger.enabled ? 'Enabled' : 'Disabled'}
                            </Label>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteTrigger(trigger.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// Schedule trigger configuration
interface ScheduleTriggerConfigProps {
  config: TriggerConfig;
  onChange: (config: TriggerConfig) => void;
}

function ScheduleTriggerConfig({ config, onChange }: ScheduleTriggerConfigProps) {
  const [usePreset, setUsePreset] = useState(true);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Switch
          checked={usePreset}
          onCheckedChange={setUsePreset}
        />
        <Label className="text-xs">Use preset</Label>
      </div>

      {usePreset ? (
        <div className="space-y-1.5">
          <Label className="text-xs">Schedule preset</Label>
          <Select
            value={config.cronExpression || ''}
            onValueChange={(value) => onChange({ ...config, cronExpression: value })}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Select schedule" />
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
      ) : (
        <div className="space-y-1.5">
          <Label className="text-xs">Cron expression</Label>
          <Input
            value={config.cronExpression || ''}
            onChange={(e) => onChange({ ...config, cronExpression: e.target.value })}
            placeholder="* * * * *"
            className="h-8 text-sm font-mono"
          />
          <p className="text-xs text-muted-foreground">
            Format: minute hour day month weekday
          </p>
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-xs">Timezone</Label>
        <Select
          value={config.timezone || 'UTC'}
          onValueChange={(value) => onChange({ ...config, timezone: value })}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="UTC">UTC</SelectItem>
            <SelectItem value="America/New_York">Eastern Time</SelectItem>
            <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
            <SelectItem value="Europe/London">London</SelectItem>
            <SelectItem value="Europe/Paris">Paris</SelectItem>
            <SelectItem value="Asia/Shanghai">Shanghai</SelectItem>
            <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// Event trigger configuration
interface EventTriggerConfigProps {
  config: TriggerConfig;
  onChange: (config: TriggerConfig) => void;
}

function EventTriggerConfig({ config, onChange }: EventTriggerConfigProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">Event type</Label>
        <Select
          value={config.eventType || ''}
          onValueChange={(value) => onChange({ ...config, eventType: value })}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="Select event" />
          </SelectTrigger>
          <SelectContent>
            {EVENT_TYPES.map((event) => (
              <SelectItem key={event.value} value={event.value}>
                {event.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {config.eventType === 'custom' && (
        <div className="space-y-1.5">
          <Label className="text-xs">Custom event name</Label>
          <Input
            value={config.eventSource || ''}
            onChange={(e) => onChange({ ...config, eventSource: e.target.value })}
            placeholder="my.custom.event"
            className="h-8 text-sm"
          />
        </div>
      )}

      <div className="p-2 bg-muted/50 rounded-md">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            Event data will be available as workflow input variables.
          </p>
        </div>
      </div>
    </div>
  );
}

// Webhook trigger configuration
interface WebhookTriggerConfigProps {
  config: TriggerConfig;
  workflowId: string;
  onChange: (config: TriggerConfig) => void;
}

function WebhookTriggerConfig({ config, workflowId, onChange }: WebhookTriggerConfigProps) {
  const webhookUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/api/workflows/${workflowId}/webhook`;

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">HTTP Method</Label>
        <Select
          value={config.webhookMethod || 'POST'}
          onValueChange={(value) => onChange({ ...config, webhookMethod: value as 'GET' | 'POST' | 'PUT' })}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="GET">GET</SelectItem>
            <SelectItem value="POST">POST</SelectItem>
            <SelectItem value="PUT">PUT</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Webhook URL</Label>
        <div className="flex gap-2">
          <Input
            value={webhookUrl}
            readOnly
            className="h-8 text-xs font-mono bg-muted"
          />
          <Button
            variant="outline"
            size="sm"
            className="h-8 shrink-0"
            onClick={() => navigator.clipboard.writeText(webhookUrl)}
          >
            Copy
          </Button>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Secret (optional)</Label>
        <Input
          type="password"
          value={config.webhookSecret || ''}
          onChange={(e) => onChange({ ...config, webhookSecret: e.target.value })}
          placeholder="Enter secret for validation"
          className="h-8 text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Used to validate incoming webhook requests
        </p>
      </div>
    </div>
  );
}

export default WorkflowTriggerPanel;
