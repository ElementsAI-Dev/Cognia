'use client';

/**
 * AgentTeamConfigEditor - Edit team configuration after creation
 *
 * Features:
 * - Toggle execution mode (coordinated/autonomous/delegate)
 * - Set token budget
 * - Enable/disable plan approval, messaging, task retry
 * - Set concurrency limits
 * - Save current team as template
 */

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Settings2,
  Users,
  Zap,
  GitBranch,
  MessageSquare,
  Shield,
  RotateCcw,
  Save,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAgentTeamStore } from '@/stores/agent/agent-team-store';
import type { TeamExecutionMode, AgentTeamConfig } from '@/types/agent/agent-team';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/sonner';

// ============================================================================
// Types
// ============================================================================

interface AgentTeamConfigEditorProps {
  teamId: string;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function AgentTeamConfigEditor({ teamId, className }: AgentTeamConfigEditorProps) {
  const t = useTranslations('agentTeam');

  const team = useAgentTeamStore((s) => s.teams[teamId]);
  const updateTeamConfig = useAgentTeamStore((s) => s.updateTeamConfig);
  const saveAsTemplate = useAgentTeamStore((s) => s.saveAsTemplate);

  const [templateName, setTemplateName] = useState('');
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);

  const isEditable = team?.status === 'idle' || team?.status === 'paused';

  const handleConfigChange = useCallback(
    (changes: Partial<AgentTeamConfig>) => {
      if (!team || !isEditable) return;
      updateTeamConfig(teamId, { ...team.config, ...changes });
    },
    [team, teamId, isEditable, updateTeamConfig]
  );

  const handleSaveAsTemplate = useCallback(() => {
    if (!team || !templateName.trim()) return;
    saveAsTemplate(teamId, templateName.trim());
    toast.success(t('templateManage.templateSaved') || 'Template saved');
    setTemplateName('');
    setShowSaveTemplate(false);
  }, [team, teamId, templateName, saveAsTemplate, t]);

  if (!team) return null;

  const config = team.config;

  return (
    <div className={cn('space-y-4 px-3 py-3', className)}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <Settings2 className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">
          {t('configEditor.title') || 'Team Configuration'}
        </span>
        {!isEditable && (
          <span className="text-[10px] text-muted-foreground ml-auto">
            ({t('configEditor.readOnly') || 'read-only during execution'})
          </span>
        )}
      </div>

      {/* Execution Mode */}
      <div className="space-y-1.5">
        <Label className="text-xs flex items-center gap-1.5">
          <Layers className="h-3 w-3" />
          {t('configEditor.executionMode') || 'Execution Mode'}
        </Label>
        <Select
          value={config.executionMode}
          onValueChange={(v) =>
            handleConfigChange({ executionMode: v as TeamExecutionMode })
          }
          disabled={!isEditable}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="coordinated">
              <div className="flex items-center gap-2">
                <Users className="h-3.5 w-3.5" />
                <span>{t('configEditor.coordinated') || 'Coordinated'}</span>
              </div>
            </SelectItem>
            <SelectItem value="autonomous">
              <div className="flex items-center gap-2">
                <Zap className="h-3.5 w-3.5" />
                <span>{t('configEditor.autonomous') || 'Autonomous'}</span>
              </div>
            </SelectItem>
            <SelectItem value="delegate">
              <div className="flex items-center gap-2">
                <GitBranch className="h-3.5 w-3.5" />
                <span>{t('configEditor.delegate') || 'Delegate'}</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
        <p className="text-[10px] text-muted-foreground">
          {config.executionMode === 'coordinated'
            ? (t('configEditor.coordinatedDesc') || 'Lead assigns tasks to specific teammates')
            : config.executionMode === 'autonomous'
              ? (t('configEditor.autonomousDesc') || 'Teammates self-claim available tasks')
              : (t('configEditor.delegateDesc') || 'Lead delegates, never implements itself')}
        </p>
      </div>

      <Separator />

      {/* Concurrency */}
      <div className="space-y-1.5">
        <Label className="text-xs flex items-center gap-1.5">
          <Users className="h-3 w-3" />
          {t('configEditor.maxConcurrent') || 'Max Concurrent Teammates'}
        </Label>
        <Input
          type="number"
          min={1}
          max={10}
          value={config.maxConcurrentTeammates}
          onChange={(e) =>
            handleConfigChange({
              maxConcurrentTeammates: Math.max(1, Math.min(10, parseInt(e.target.value) || 3)),
            })
          }
          disabled={!isEditable}
          className="h-8 text-xs w-20"
        />
      </div>

      {/* Token Budget */}
      <div className="space-y-1.5">
        <Label className="text-xs flex items-center gap-1.5">
          <Zap className="h-3 w-3" />
          {t('configEditor.tokenBudget') || 'Token Budget'}
        </Label>
        <Input
          type="number"
          min={0}
          step={10000}
          value={config.tokenBudget || 0}
          onChange={(e) =>
            handleConfigChange({
              tokenBudget: Math.max(0, parseInt(e.target.value) || 0),
            })
          }
          disabled={!isEditable}
          className="h-8 text-xs w-32"
          placeholder="0 = unlimited"
        />
        <p className="text-[10px] text-muted-foreground">
          {t('configEditor.tokenBudgetDesc') || '0 = unlimited. Team stops when budget is exceeded.'}
        </p>
      </div>

      <Separator />

      {/* Toggles */}
      <div className="space-y-3">
        <ToggleRow
          icon={<Shield className="h-3 w-3" />}
          label={t('configEditor.planApproval') || 'Require Plan Approval'}
          description={t('configEditor.planApprovalDesc') || 'Lead reviews teammate plans before execution'}
          checked={config.requirePlanApproval ?? false}
          onCheckedChange={(v) => handleConfigChange({ requirePlanApproval: v })}
          disabled={!isEditable}
        />
        <ToggleRow
          icon={<MessageSquare className="h-3 w-3" />}
          label={t('configEditor.messaging') || 'Enable Messaging'}
          description={t('configEditor.messagingDesc') || 'Teammates share results via messages'}
          checked={config.enableMessaging ?? true}
          onCheckedChange={(v) => handleConfigChange({ enableMessaging: v })}
          disabled={!isEditable}
        />
        <ToggleRow
          icon={<RotateCcw className="h-3 w-3" />}
          label={t('configEditor.taskRetry') || 'Enable Task Retry'}
          description={t('configEditor.taskRetryDesc') || 'Failed tasks are automatically retried'}
          checked={config.enableTaskRetry ?? false}
          onCheckedChange={(v) => handleConfigChange({ enableTaskRetry: v })}
          disabled={!isEditable}
        />
      </div>

      {config.enableTaskRetry && (
        <div className="space-y-1.5 ml-6">
          <Label className="text-xs">
            {t('configEditor.maxRetries') || 'Max Retries'}
          </Label>
          <Input
            type="number"
            min={1}
            max={5}
            value={config.maxRetries ?? 1}
            onChange={(e) =>
              handleConfigChange({
                maxRetries: Math.max(1, Math.min(5, parseInt(e.target.value) || 1)),
              })
            }
            disabled={!isEditable}
            className="h-8 text-xs w-16"
          />
        </div>
      )}

      <Separator />

      {/* Save as Template */}
      <div className="space-y-2">
        {showSaveTemplate ? (
          <div className="flex items-center gap-2">
            <Input
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder={t('templateManage.templateName') || 'Template name...'}
              className="h-8 text-xs flex-1"
              autoFocus
            />
            <Button
              size="sm"
              className="h-8 text-xs gap-1"
              onClick={handleSaveAsTemplate}
              disabled={!templateName.trim()}
            >
              <Save className="h-3 w-3" />
              {t('templateManage.saveAsTemplate') || 'Save'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs"
              onClick={() => {
                setShowSaveTemplate(false);
                setTemplateName('');
              }}
            >
              {t('cancel') || 'Cancel'}
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="w-full h-8 text-xs gap-1.5"
            onClick={() => setShowSaveTemplate(true)}
          >
            <Save className="h-3 w-3" />
            {t('templateManage.saveAsTemplate') || 'Save as Template'}
          </Button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// ToggleRow
// ============================================================================

function ToggleRow({
  icon,
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-start gap-2 flex-1 min-w-0">
        <div className="mt-0.5 text-muted-foreground">{icon}</div>
        <div>
          <p className="text-xs font-medium">{label}</p>
          <p className="text-[10px] text-muted-foreground">{description}</p>
        </div>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className="shrink-0"
      />
    </div>
  );
}

export type { AgentTeamConfigEditorProps };
