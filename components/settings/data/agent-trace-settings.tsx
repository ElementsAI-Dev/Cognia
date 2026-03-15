'use client';

import Link from 'next/link';
import { useMemo, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { FileText, RefreshCw, Trash2, Download, Power, RotateCcw, Clock } from 'lucide-react';

import { type DBAgentTrace } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  SettingsCard,
  SettingsEmptyState,
  SettingsGrid,
  SettingsPageHeader,
  SettingsRow,
} from '@/components/settings/common/settings-section';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useAgentTrace } from '@/hooks/agent-trace/use-agent-trace';
import { useAgentTraceAnalytics } from '@/hooks/agent-trace/use-agent-trace-analytics';
import { useSettingsStore } from '@/stores';
import { buildObservabilitySettingsProjection } from '@/lib/observability';
import { agentTraceRepository } from '@/lib/db/repositories/agent-trace-repository';
import { deriveObservationFromDbTrace } from '@/lib/agent-trace/observation';
import { AgentTraceTimeline } from './agent-trace-timeline';
import { AgentTraceStatsOverview, AgentTraceSessionSummary } from './agent-trace-stats';
import type { AgentTraceEventType, AgentTraceObservationOutcome } from '@/types/agent-trace';

type DisplayTrace = {
  id: string;
  timestamp: Date;
  sessionId?: string;
  vcs?: string;
  files: string[];
  json: string;
  summary: string;
  outcome: AgentTraceObservationOutcome;
  parseStatus: 'ok' | 'degraded';
};

function formatVcs(row: DBAgentTrace): string | null {
  if (!row.vcsType && !row.vcsRevision) return null;
  if (row.vcsType && row.vcsRevision) return `${row.vcsType}:${row.vcsRevision.slice(0, 12)}`;
  return row.vcsType ?? row.vcsRevision ?? null;
}

function formatJsonForDisplay(json: string): string {
  try {
    return JSON.stringify(JSON.parse(json), null, 2);
  } catch (error) {
    console.error('Failed to pretty print agent trace JSON:', error);
    return json;
  }
}

export function AgentTraceSettings() {
  const t = useTranslations('settings.agentTrace');
  const tCommon = useTranslations('common');

  const [sessionId, setSessionId] = useState('');
  const [filePath, setFilePath] = useState('');
  const [vcsRevision, setVcsRevision] = useState('');
  const [eventType, setEventType] = useState<'all' | AgentTraceEventType>('all');
  const [outcome, setOutcome] = useState<'all' | AgentTraceObservationOutcome>('all');
  const [toolName, setToolName] = useState('');
  const [selected, setSelected] = useState<DisplayTrace | null>(null);
  const [copied, setCopied] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('list');
  const [selectedSessionForSummary, setSelectedSessionForSummary] = useState('');

  const agentTraceSettings = useSettingsStore((state) => state.agentTraceSettings);
  const observabilitySettings = useSettingsStore((state) => state.observabilitySettings);
  const setAgentTraceEnabled = useSettingsStore((state) => state.setAgentTraceEnabled);
  const setAgentTraceMaxRecords = useSettingsStore((state) => state.setAgentTraceMaxRecords);
  const setAgentTraceAutoCleanupDays = useSettingsStore((state) => state.setAgentTraceAutoCleanupDays);
  const setAgentTraceShellCommands = useSettingsStore((state) => state.setAgentTraceShellCommands);
  const setAgentTraceCodeEdits = useSettingsStore((state) => state.setAgentTraceCodeEdits);
  const setAgentTraceFailedCalls = useSettingsStore((state) => state.setAgentTraceFailedCalls);
  const resetAgentTraceSettings = useSettingsStore((state) => state.resetAgentTraceSettings);
  const observabilityProjection = useMemo(
    () =>
      buildObservabilitySettingsProjection({
        observabilitySettings,
        agentTraceSettings,
      }),
    [agentTraceSettings, observabilitySettings]
  );

  const trimmedSessionId = sessionId.trim();
  const trimmedFilePath = filePath.trim();
  const trimmedVcsRevision = vcsRevision.trim();
  const trimmedToolName = toolName.trim();

  const {
    traces: rows,
    observations,
    refresh,
    exportObservationBundle,
  } = useAgentTrace({
    sessionId: trimmedSessionId,
    filePath: trimmedFilePath,
    vcsRevision: trimmedVcsRevision,
    eventType: eventType === 'all' ? undefined : eventType,
    outcome: outcome === 'all' ? undefined : outcome,
    toolName: trimmedToolName || undefined,
    limit: 200,
  });

  const {
    stats,
    sessionSummary,
    loadSessionSummary,
    refresh: refreshAnalytics,
  } = useAgentTraceAnalytics({
    sessionId: selectedSessionForSummary || undefined,
    autoLoad: true,
  });

  const uniqueSessionIds = useMemo(() => {
    const ids = new Set<string>();
    for (const observation of observations ?? []) {
      if (observation.sessionId) ids.add(observation.sessionId);
    }
    return Array.from(ids);
  }, [observations]);

  const handleRefreshAll = useCallback(() => {
    refresh();
    void refreshAnalytics();
  }, [refresh, refreshAnalytics]);

  const handleDeleteTrace = useCallback(async (id: string) => {
    try {
      setIsDeleting(true);
      await agentTraceRepository.delete(id);
      setSelected(null);
      refresh();
    } catch (error) {
      console.error('Failed to delete trace:', error);
    } finally {
      setIsDeleting(false);
    }
  }, [refresh]);

  const handleClearAll = useCallback(async () => {
    try {
      setIsDeleting(true);
      await agentTraceRepository.clear();
      setSelected(null);
      refresh();
    } catch (error) {
      console.error('Failed to clear traces:', error);
    } finally {
      setIsDeleting(false);
    }
  }, [refresh]);

  const handleExportJson = useCallback((tracesToExport: DisplayTrace[]) => {
    const records = tracesToExport.map((trace) => {
      try {
        return JSON.parse(trace.json);
      } catch {
        return { id: trace.id, error: 'Failed to parse' };
      }
    });
    const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agent-traces-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleExportJsonl = useCallback((tracesToExport: DisplayTrace[]) => {
    const lines = tracesToExport.map((trace) => {
      try {
        return JSON.stringify(JSON.parse(trace.json));
      } catch {
        return JSON.stringify({ id: trace.id, error: 'Failed to parse' });
      }
    });
    const blob = new Blob([lines.join('\n')], { type: 'application/x-ndjson' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agent-traces-${new Date().toISOString().slice(0, 10)}.jsonl`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleExportBundle = useCallback(async () => {
    const bundle = await exportObservationBundle();
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agent-trace-bundle-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [exportObservationBundle]);

  const traces = useMemo<DisplayTrace[]>(() => {
    const observationMap = new Map(
      (observations && observations.length > 0
        ? observations
        : (rows ?? []).map((row) => deriveObservationFromDbTrace(row))
      ).map((observation) => [observation.id, observation])
    );

    return (rows ?? []).map((row) => {
      const observation = observationMap.get(row.id) ?? deriveObservationFromDbTrace(row);
      const vcs = formatVcs(row);
      return {
        id: row.id,
        timestamp: row.timestamp,
        sessionId: row.sessionId,
        vcs: vcs ?? undefined,
        files: observation.filePaths,
        json: row.record,
        summary: observation.summary,
        outcome: observation.outcome,
        parseStatus: observation.parseStatus,
      };
    });
  }, [observations, rows]);

  return (
    <div className="space-y-4">
      <SettingsPageHeader
        title={t('title')}
        description={t('description')}
        icon={<FileText className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshAll}
            >
              <RefreshCw className="h-4 w-4" />
              {t('refresh')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExportJson(traces)}
              disabled={traces.length === 0}
            >
              <Download className="h-4 w-4" />
              JSON
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExportJsonl(traces)}
              disabled={traces.length === 0}
            >
              <Download className="h-4 w-4" />
              JSONL
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void handleExportBundle();
              }}
              disabled={traces.length === 0}
            >
              <Download className="h-4 w-4" />
              {t('exportBundle')}
            </Button>
          </div>
        }
      />

      <SettingsCard
        title={t('observabilityOverviewTitle')}
        description={t('observabilityOverviewDescription')}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm font-medium">
            {observabilityProjection.runtimeCaptureEnabled
              ? t('observabilityOverviewReady')
              : observabilityProjection.captureEnabled
                ? t('observabilityOverviewNeedsSetup')
                : t('observabilityOverviewDisabled')}
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/settings?section=observability">{t('observabilityOverviewManage')}</Link>
          </Button>
        </div>
      </SettingsCard>

      <SettingsCard title={t('recording.title')} description={t('recording.description')}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Power className={cn('h-4 w-4', agentTraceSettings.enabled ? 'text-green-500' : 'text-muted-foreground')} />
            <Label htmlFor="agent-trace-enabled">
              {agentTraceSettings.enabled ? t('status.enabled') : t('status.disabled')}
            </Label>
          </div>
          <Switch
            id="agent-trace-enabled"
            checked={agentTraceSettings.enabled}
            onCheckedChange={setAgentTraceEnabled}
          />
        </div>
      </SettingsCard>

      <SettingsCard title={t('config.title')} description={t('config.description')}>
        <div className="space-y-4">
          <SettingsRow
            label={t('config.maxRecords')}
            description={t('config.maxRecordsDescription')}
          >
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                max={100000}
                value={agentTraceSettings.maxRecords}
                onChange={(e) => setAgentTraceMaxRecords(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-24"
              />
              <span className="text-xs text-muted-foreground">
                {agentTraceSettings.maxRecords === 0 ? t('config.maxRecordsUnlimited') : ''}
              </span>
            </div>
          </SettingsRow>

          <SettingsRow
            label={t('config.autoCleanup')}
            description={t('config.autoCleanupDescription')}
          >
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                max={365}
                value={agentTraceSettings.autoCleanupDays}
                onChange={(e) => setAgentTraceAutoCleanupDays(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-24"
              />
              <span className="text-xs text-muted-foreground">
                {agentTraceSettings.autoCleanupDays === 0
                  ? t('config.autoCleanupNever')
                  : t('config.autoCleanupDays', { days: agentTraceSettings.autoCleanupDays })}
              </span>
            </div>
          </SettingsRow>

          <SettingsRow
            label={t('config.traceShellCommands')}
            description={t('config.traceShellCommandsDescription')}
          >
            <Switch
              id="trace-shell-commands"
              checked={agentTraceSettings.traceShellCommands}
              onCheckedChange={setAgentTraceShellCommands}
            />
          </SettingsRow>

          <SettingsRow
            label={t('config.traceCodeEdits')}
            description={t('config.traceCodeEditsDescription')}
          >
            <Switch
              id="trace-code-edits"
              checked={agentTraceSettings.traceCodeEdits}
              onCheckedChange={setAgentTraceCodeEdits}
            />
          </SettingsRow>

          <SettingsRow
            label={t('config.traceFailedCalls')}
            description={t('config.traceFailedCallsDescription')}
          >
            <Switch
              id="trace-failed-calls"
              checked={agentTraceSettings.traceFailedCalls}
              onCheckedChange={setAgentTraceFailedCalls}
            />
          </SettingsRow>

          <div className="flex justify-end pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={resetAgentTraceSettings}
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              {t('config.resetToDefaults')}
            </Button>
          </div>
        </div>
      </SettingsCard>

      <SettingsCard title={t('filtersTitle')} description={t('filtersDescription')}>
        <SettingsGrid columns={2}>
          <div className="space-y-1.5">
            <div className="text-xs font-medium">{t('sessionId')}</div>
            <Input
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              placeholder={t('sessionIdPlaceholder')}
            />
          </div>
          <div className="space-y-1.5">
            <div className="text-xs font-medium">{t('filePath')}</div>
            <Input
              value={filePath}
              onChange={(e) => setFilePath(e.target.value)}
              placeholder={t('filePathPlaceholder')}
            />
          </div>
          <div className="space-y-1.5">
            <div className="text-xs font-medium">{t('vcsRevision')}</div>
            <Input
              value={vcsRevision}
              onChange={(e) => setVcsRevision(e.target.value)}
              placeholder={t('vcsRevisionPlaceholder')}
            />
          </div>
          <div className="space-y-1.5">
            <div className="text-xs font-medium">{t('eventType')}</div>
            <Select value={eventType} onValueChange={(value) => setEventType(value as 'all' | AgentTraceEventType)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('eventTypePlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('eventTypeAll')}</SelectItem>
                <SelectItem value="session_start">{t('eventTypeSessionStart')}</SelectItem>
                <SelectItem value="session_end">{t('eventTypeSessionEnd')}</SelectItem>
                <SelectItem value="permission_request">{t('eventTypePermissionRequest')}</SelectItem>
                <SelectItem value="permission_response">{t('eventTypePermissionResponse')}</SelectItem>
                <SelectItem value="tool_call_request">{t('eventTypeToolCallRequest')}</SelectItem>
                <SelectItem value="tool_call_result">{t('eventTypeToolCallResult')}</SelectItem>
                <SelectItem value="step_start">{t('eventTypeStepStart')}</SelectItem>
                <SelectItem value="step_finish">{t('eventTypeStepFinish')}</SelectItem>
                <SelectItem value="planning">{t('eventTypePlanning')}</SelectItem>
                <SelectItem value="response">{t('eventTypeResponse')}</SelectItem>
                <SelectItem value="checkpoint_create">{t('eventTypeCheckpointCreate')}</SelectItem>
                <SelectItem value="checkpoint_restore">{t('eventTypeCheckpointRestore')}</SelectItem>
                <SelectItem value="error">{t('eventTypeError')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <div className="text-xs font-medium">{t('outcome')}</div>
            <Select
              value={outcome}
              onValueChange={(value) => setOutcome(value as 'all' | AgentTraceObservationOutcome)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('outcomePlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('outcomeAll')}</SelectItem>
                <SelectItem value="success">{t('outcomeSuccess')}</SelectItem>
                <SelectItem value="error">{t('outcomeError')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <div className="text-xs font-medium">{t('toolName')}</div>
            <Input
              value={toolName}
              onChange={(e) => setToolName(e.target.value)}
              placeholder={t('toolNamePlaceholder')}
            />
          </div>
        </SettingsGrid>

        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {t('showingCount', { count: traces.length })}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSessionId('');
                setFilePath('');
                setVcsRevision('');
                setEventType('all');
                setOutcome('all');
                setToolName('');
              }}
            >
              {t('clearFilters')}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={traces.length === 0 || isDeleting}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  {t('actions.clearAll')}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('dialogs.clearAllTitle')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('dialogs.clearAllDescription')}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearAll}>
                    {t('actions.deleteAll')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </SettingsCard>

      <AgentTraceStatsOverview stats={stats} />

      {uniqueSessionIds.length > 0 && (
        <SettingsCard title={t('sessionSummary.title')} description={t('sessionSummary.description')}>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Select
                value={selectedSessionForSummary || '__none__'}
                onValueChange={(value) => {
                  const sid = value === '__none__' ? '' : value;
                  setSelectedSessionForSummary(sid);
                  if (sid) void loadSessionSummary(sid);
                }}
              >
                <SelectTrigger className="w-full max-w-xs">
                  <SelectValue placeholder={t('sessionSummary.selectSession')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{t('sessionSummary.selectSession')}</SelectItem>
                  {uniqueSessionIds.map((sid) => (
                    <SelectItem key={sid} value={sid}>
                      {sid.length > 20 ? `${sid.slice(0, 20)}...` : sid}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {sessionSummary && (
              <AgentTraceSessionSummary summary={sessionSummary} />
            )}
          </div>
        </SettingsCard>
      )}

      {traces.length === 0 ? (
        <SettingsEmptyState
          title={t('emptyTitle')}
          description={t('emptyDescription')}
        />
      ) : (
        <SettingsCard title={t('listTitle')} description={t('listDescription')}>
          <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'list' | 'timeline')}>
            <TabsList className="mb-3">
              <TabsTrigger value="list" className="gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                {t('viewModes.list')}
              </TabsTrigger>
              <TabsTrigger value="timeline" className="gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {t('viewModes.timeline')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="list">
              <ScrollArea className="h-[420px] pr-2">
                <div className="space-y-2">
                  {traces.map((trace) => (
                    <div
                      key={trace.id}
                      role="button"
                      tabIndex={0}
                      className={cn(
                        'w-full text-left rounded-md border px-3 py-2 hover:bg-muted/50 transition-colors',
                        selected?.id === trace.id && 'ring-1 ring-primary'
                      )}
                      onClick={() => setSelected(trace)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelected(trace);
                        }
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="font-medium text-sm truncate">{trace.id}</div>
                            {trace.vcs && (
                              <Badge variant="outline" className="text-[10px]">
                                {trace.vcs}
                              </Badge>
                            )}
                            {trace.sessionId && (
                              <Badge variant="secondary" className="text-[10px]">
                                {trace.sessionId}
                              </Badge>
                            )}
                            <Badge variant="secondary" className="text-[10px]">
                              {trace.outcome}
                            </Badge>
                            {trace.parseStatus === 'degraded' && (
                              <Badge variant="destructive" className="text-[10px]">
                                {t('degradedRowLabel')}
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {trace.timestamp.toLocaleString()}
                          </div>
                          <div className="text-xs mt-1">{trace.summary}</div>
                          <div className="text-xs mt-1 text-muted-foreground break-all">
                            {(trace.files[0] ?? '').slice(0, 200)}
                            {trace.files.length > 1 ? ` (+${trace.files.length - 1})` : ''}
                          </div>
                        </div>
                        <div className="shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCopied(false);
                              setSelected(trace);
                            }}
                          >
                            {t('view')}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="timeline">
              <AgentTraceTimeline traces={rows ?? []} />
            </TabsContent>
          </Tabs>
        </SettingsCard>
      )}

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t('detailsTitle')}</DialogTitle>
            <DialogDescription className="break-all">
              {selected?.id}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (!selected?.json) return;
                  try {
                    await navigator.clipboard.writeText(selected.json);
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 1500);
                  } catch (error) {
                    console.error('Failed to copy agent trace JSON:', error);
                  }
                }}
              >
                {copied ? tCommon('copied') : t('copy')}
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={isDeleting}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    {tCommon('delete')}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('dialogs.deleteTitle')}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('dialogs.deleteDescription')}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
                    <AlertDialogAction onClick={() => selected && handleDeleteTrace(selected.id)}>
                      {tCommon('delete')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
            <div className="text-xs text-muted-foreground">{t('detailsHint')}</div>
            <ScrollArea className="h-[520px] rounded-md border">
              <pre className={cn('p-3 text-xs leading-relaxed')}>
                {selected?.json ? formatJsonForDisplay(selected.json) : ''}
              </pre>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
