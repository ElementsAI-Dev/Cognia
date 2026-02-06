'use client';

/**
 * AgentTeamSettings - Settings page for Agent Teams
 *
 * Configures:
 * - Global team defaults (max teammates, concurrency, execution mode)
 * - Template management (view/add/delete)
 * - Active teams overview
 * - Team history / cleanup
 *
 * Follows ExternalAgentSettings pattern.
 */

import { useState, useCallback } from 'react';
import {
  Users,
  Trash2,
  Layers,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  Shield,
  Zap,
  Clock,
  GitBranch,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAgentTeamStore } from '@/stores/agent/agent-team-store';
import {
  TEAM_STATUS_CONFIG,
  type AgentTeamConfig,
  type TeamExecutionMode,
} from '@/types/agent/agent-team';

// ============================================================================
// Sub-components
// ============================================================================

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="space-y-0.5 flex-1">
        <Label>{label}</Label>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

// ============================================================================
// AgentTeamSettings
// ============================================================================

export function AgentTeamSettings() {
  const t = useTranslations('agentTeamSettings');
  const tCommon = useTranslations('common');

  // Store
  const defaultConfig = useAgentTeamStore((s) => s.defaultConfig);
  const updateDefaultConfig = useAgentTeamStore((s) => s.updateDefaultConfig);
  const teams = useAgentTeamStore((s) => s.teams);
  const templates = useAgentTeamStore((s) => s.templates);
  const deleteTemplate = useAgentTeamStore((s) => s.deleteTemplate);
  const cleanupTeam = useAgentTeamStore((s) => s.cleanupTeam);
  const reset = useAgentTeamStore((s) => s.reset);

  // Local state
  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showCleanupDialog, setShowCleanupDialog] = useState(false);
  const [expandedTemplates, setExpandedTemplates] = useState(false);
  const [expandedHistory, setExpandedHistory] = useState(false);

  const teamList = Object.values(teams);
  const templateList = Object.values(templates);
  const builtInTemplates = templateList.filter((t) => t.isBuiltIn);
  const customTemplates = templateList.filter((t) => !t.isBuiltIn);

  const completedTeams = teamList.filter((t) => t.status === 'completed' || t.status === 'failed' || t.status === 'cancelled');
  const activeTeams = teamList.filter((t) => t.status === 'executing' || t.status === 'planning' || t.status === 'paused');

  const handleUpdateConfig = useCallback(
    (updates: Partial<AgentTeamConfig>) => {
      updateDefaultConfig(updates);
    },
    [updateDefaultConfig]
  );

  const handleCleanupAll = useCallback(() => {
    completedTeams.forEach((team) => cleanupTeam(team.id));
    setShowCleanupDialog(false);
  }, [completedTeams, cleanupTeam]);

  const handleDeleteTemplate = useCallback(() => {
    if (deleteTemplateId) {
      deleteTemplate(deleteTemplateId);
      setDeleteTemplateId(null);
    }
  }, [deleteTemplateId, deleteTemplate]);

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t('title')}
          </CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Execution Mode */}
          <SettingRow
            label={t('executionMode')}
            description={t('executionModeDesc')}
          >
            <Select
              value={defaultConfig.executionMode}
              onValueChange={(v) => handleUpdateConfig({ executionMode: v as TeamExecutionMode })}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="coordinated">
                  <div className="flex items-center gap-2">
                    <Users className="h-3.5 w-3.5" />
                    {t('modeCoordinate')}
                  </div>
                </SelectItem>
                <SelectItem value="autonomous">
                  <div className="flex items-center gap-2">
                    <Zap className="h-3.5 w-3.5" />
                    {t('modeAutonomous')}
                  </div>
                </SelectItem>
                <SelectItem value="delegate">
                  <div className="flex items-center gap-2">
                    <GitBranch className="h-3.5 w-3.5" />
                    {t('modeDelegate')}
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>

          <Separator />

          {/* Max Teammates */}
          <SettingRow
            label={t('maxTeammates')}
            description={t('maxTeammatesDesc')}
          >
            <div className="flex items-center gap-3">
              <Slider
                value={[defaultConfig.maxTeammates]}
                onValueChange={([v]) => handleUpdateConfig({ maxTeammates: v })}
                min={2}
                max={20}
                step={1}
                className="w-[120px]"
              />
              <span className="text-sm font-mono w-6 text-right">
                {defaultConfig.maxTeammates}
              </span>
            </div>
          </SettingRow>

          {/* Max Concurrent */}
          <SettingRow
            label={t('maxConcurrent')}
            description={t('maxConcurrentDesc')}
          >
            <div className="flex items-center gap-3">
              <Slider
                value={[defaultConfig.maxConcurrentTeammates]}
                onValueChange={([v]) => handleUpdateConfig({ maxConcurrentTeammates: v })}
                min={1}
                max={10}
                step={1}
                className="w-[120px]"
              />
              <span className="text-sm font-mono w-6 text-right">
                {defaultConfig.maxConcurrentTeammates}
              </span>
            </div>
          </SettingRow>

          <Separator />

          {/* Timeout */}
          <SettingRow
            label={t('defaultTimeout')}
            description={t('defaultTimeoutDesc')}
          >
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={Math.round((defaultConfig.defaultTimeout || 300000) / 1000)}
                onChange={(e) =>
                  handleUpdateConfig({ defaultTimeout: Number(e.target.value) * 1000 })
                }
                className="w-20 text-right"
                min={30}
                max={3600}
              />
              <span className="text-sm text-muted-foreground">s</span>
            </div>
          </SettingRow>

          {/* Max Steps per Teammate */}
          <SettingRow
            label={t('maxSteps')}
            description={t('maxStepsDesc')}
          >
            <Input
              type="number"
              value={defaultConfig.defaultMaxSteps || 15}
              onChange={(e) =>
                handleUpdateConfig({ defaultMaxSteps: Number(e.target.value) })
              }
              className="w-20 text-right"
              min={1}
              max={100}
            />
          </SettingRow>

          <Separator />

          {/* Require Plan Approval */}
          <SettingRow
            label={t('autoApprovePlans')}
            description={t('autoApprovePlansDesc')}
          >
            <Switch
              checked={!(defaultConfig.requirePlanApproval ?? false)}
              onCheckedChange={(autoApprove) =>
                handleUpdateConfig({ requirePlanApproval: !autoApprove })
              }
            />
          </SettingRow>

          {/* Enable Inter-agent Messaging */}
          <SettingRow
            label={t('enableMessaging')}
            description={t('enableMessagingDesc')}
          >
            <Switch
              checked={defaultConfig.enableMessaging !== false}
              onCheckedChange={(enableMessaging) =>
                handleUpdateConfig({ enableMessaging })
              }
            />
          </SettingRow>

          {/* Auto Shutdown */}
          <SettingRow
            label={t('contextIsolation')}
            description={t('contextIsolationDesc')}
          >
            <Switch
              checked={defaultConfig.autoShutdown !== false}
              onCheckedChange={(autoShutdown) =>
                handleUpdateConfig({ autoShutdown })
              }
            />
          </SettingRow>
        </CardContent>
      </Card>

      {/* Templates Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Layers className="h-4 w-4" />
                {t('templates')}
              </CardTitle>
              <CardDescription>{t('templatesDesc')}</CardDescription>
            </div>
            <Badge variant="secondary">{templateList.length}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Collapsible open={expandedTemplates} onOpenChange={setExpandedTemplates}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-start gap-2 mb-2">
                {expandedTemplates ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                {t('viewTemplates')} ({templateList.length})
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <ScrollArea className="max-h-[400px]">
                <div className="space-y-3">
                  {/* Built-in */}
                  {builtInTemplates.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {t('builtInTemplates')} ({builtInTemplates.length})
                      </p>
                      {builtInTemplates.map((tmpl) => (
                        <div
                          key={tmpl.id}
                          className="flex items-center justify-between rounded-md border p-3"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{tmpl.name}</span>
                              <Badge variant="outline" className="text-[10px]">
                                {tmpl.category}
                              </Badge>
                              <Badge variant="secondary" className="text-[10px]">
                                {tmpl.teammates.length} teammates
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                              {tmpl.description}
                            </p>
                          </div>
                          <Tooltip>
                            <TooltipTrigger>
                              <Shield className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>{t('builtInProtected')}</TooltipContent>
                          </Tooltip>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Custom */}
                  {customTemplates.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {t('customTemplates')} ({customTemplates.length})
                      </p>
                      {customTemplates.map((tmpl) => (
                        <div
                          key={tmpl.id}
                          className="flex items-center justify-between rounded-md border p-3"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{tmpl.name}</span>
                              <Badge variant="outline" className="text-[10px]">
                                {tmpl.category}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {tmpl.description}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => setDeleteTemplateId(tmpl.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {templateList.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {t('noTemplates')}
                    </p>
                  )}
                </div>
              </ScrollArea>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {/* Active Teams / History Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4" />
                {t('teamsOverview')}
              </CardTitle>
              <CardDescription>{t('teamsOverviewDesc')}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {activeTeams.length > 0 && (
                <Badge variant="default" className="animate-pulse">
                  {activeTeams.length} {t('active')}
                </Badge>
              )}
              <Badge variant="secondary">{teamList.length} {t('total')}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {teamList.length === 0 ? (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>{t('noTeamsYet')}</AlertDescription>
            </Alert>
          ) : (
            <Collapsible open={expandedHistory} onOpenChange={setExpandedHistory}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2 mb-2">
                  {expandedHistory ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  {t('viewTeams')} ({teamList.length})
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <ScrollArea className="max-h-[300px]">
                  <div className="space-y-2">
                    {teamList.map((team) => {
                      const statusConfig = TEAM_STATUS_CONFIG[team.status];
                      return (
                        <div
                          key={team.id}
                          className="flex items-center justify-between rounded-md border p-3"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{team.name}</span>
                              <Badge
                                variant="outline"
                                className={cn('text-[10px]', statusConfig.color)}
                              >
                                {statusConfig.label}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground">
                                {team.teammateIds.length} teammates
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                              {team.task}
                            </p>
                          </div>
                          {(team.status === 'completed' || team.status === 'failed' || team.status === 'cancelled') && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => cleanupTeam(team.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>

                {completedTeams.length > 1 && (
                  <div className="mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-2 text-destructive hover:text-destructive"
                      onClick={() => setShowCleanupDialog(true)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {t('cleanupCompleted')} ({completedTeams.length})
                    </Button>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          )}
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-destructive">
            <AlertTriangle className="h-4 w-4" />
            {t('dangerZone')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{t('resetAll')}</p>
              <p className="text-sm text-muted-foreground">{t('resetAllDesc')}</p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              className="gap-1.5"
              onClick={() => setShowResetDialog(true)}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {t('resetButton')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete Template Dialog */}
      <AlertDialog open={!!deleteTemplateId} onOpenChange={() => setDeleteTemplateId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteTemplateTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('deleteTemplateDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTemplate} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {tCommon('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('resetTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('resetDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { reset(); setShowResetDialog(false); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('resetButton')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cleanup Dialog */}
      <AlertDialog open={showCleanupDialog} onOpenChange={setShowCleanupDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('cleanupTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('cleanupDesc', { count: completedTeams.length })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleCleanupAll}>
              {t('cleanupConfirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
