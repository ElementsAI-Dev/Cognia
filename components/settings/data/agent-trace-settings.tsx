'use client';

import { useMemo, useState, useCallback } from 'react';
import Dexie from 'dexie';
import { useTranslations } from 'next-intl';
import { useLiveQuery } from 'dexie-react-hooks';
import { FileText, RefreshCw, Trash2, Download, Power } from 'lucide-react';

import { db, type DBAgentTrace } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { cn } from '@/lib/utils';
import { useSettingsStore } from '@/stores';
import { agentTraceRepository } from '@/lib/db/repositories/agent-trace-repository';

type DisplayTrace = {
  id: string;
  timestamp: Date;
  sessionId?: string;
  vcs?: string;
  files: string[];
  json: string;
};

function parseRecordFiles(json: string): string[] {
  try {
    const record = JSON.parse(json) as { files?: Array<{ path?: unknown }> };
    const files = record.files ?? [];
    return files
      .map((f) => (typeof f.path === 'string' ? f.path : null))
      .filter((p): p is string => Boolean(p));
  } catch (error) {
    console.error('Failed to parse agent trace record JSON:', error);
    return [];
  }
}

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
  const [selected, setSelected] = useState<DisplayTrace | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Settings
  const agentTraceSettings = useSettingsStore((state) => state.agentTraceSettings);
  const setAgentTraceEnabled = useSettingsStore((state) => state.setAgentTraceEnabled);

  const trimmedSessionId = sessionId.trim();
  const trimmedFilePath = filePath.trim();

  // Delete single trace
  const handleDeleteTrace = useCallback(async (id: string) => {
    try {
      setIsDeleting(true);
      await agentTraceRepository.delete(id);
      setSelected(null);
      setRefreshTick((x) => x + 1);
    } catch (error) {
      console.error('Failed to delete trace:', error);
    } finally {
      setIsDeleting(false);
    }
  }, []);

  // Clear all traces
  const handleClearAll = useCallback(async () => {
    try {
      setIsDeleting(true);
      await agentTraceRepository.clear();
      setSelected(null);
      setRefreshTick((x) => x + 1);
    } catch (error) {
      console.error('Failed to clear traces:', error);
    } finally {
      setIsDeleting(false);
    }
  }, []);

  // Export as JSON
  const handleExportJson = useCallback((tracesToExport: DisplayTrace[]) => {
    const records = tracesToExport.map((tr) => {
      try {
        return JSON.parse(tr.json);
      } catch {
        return { id: tr.id, error: 'Failed to parse' };
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

  // Export as JSONL
  const handleExportJsonl = useCallback((tracesToExport: DisplayTrace[]) => {
    const lines = tracesToExport.map((tr) => {
      try {
        return JSON.stringify(JSON.parse(tr.json));
      } catch {
        return JSON.stringify({ id: tr.id, error: 'Failed to parse' });
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

  const rows = useLiveQuery(
    async () => {
      const limit = 200;

      if (trimmedSessionId) {
        return db.agentTraces
          .where('[sessionId+timestamp]')
          .between([trimmedSessionId, Dexie.minKey], [trimmedSessionId, Dexie.maxKey])
          .reverse()
          .limit(limit)
          .toArray();
      }

      return db.agentTraces.orderBy('timestamp').reverse().limit(limit).toArray();
    },
    [trimmedSessionId, refreshTick],
    [] as DBAgentTrace[]
  );

  const traces = useMemo<DisplayTrace[]>(() => {
    const list = (rows ?? []).map((row) => {
      const files = parseRecordFiles(row.record);
      const vcs = formatVcs(row);
      return {
        id: row.id,
        timestamp: row.timestamp,
        sessionId: row.sessionId,
        vcs: vcs ?? undefined,
        files,
        json: row.record,
      };
    });

    if (!trimmedFilePath) return list;

    const query = trimmedFilePath.toLowerCase();
    return list.filter((tr) => tr.files.some((p) => p.toLowerCase().includes(query)));
  }, [rows, trimmedFilePath]);

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
              onClick={() => setRefreshTick((x) => x + 1)}
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
          </div>
        }
      />

      {/* Enable/Disable Toggle */}
      <SettingsCard title="Agent Trace Recording" description="Control whether agent actions are traced and stored locally.">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Power className={cn('h-4 w-4', agentTraceSettings.enabled ? 'text-green-500' : 'text-muted-foreground')} />
            <Label htmlFor="agent-trace-enabled">
              {agentTraceSettings.enabled ? 'Enabled' : 'Disabled'}
            </Label>
          </div>
          <Switch
            id="agent-trace-enabled"
            checked={agentTraceSettings.enabled}
            onCheckedChange={setAgentTraceEnabled}
          />
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
                  Clear All
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear All Traces?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all agent trace records. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearAll}>
                    Delete All
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </SettingsCard>

      {traces.length === 0 ? (
        <SettingsEmptyState
          title={t('emptyTitle')}
          description={t('emptyDescription')}
        />
      ) : (
        <SettingsCard title={t('listTitle')} description={t('listDescription')}>
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
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {trace.timestamp.toLocaleString()}
                      </div>
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
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Trace?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete this agent trace record.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => selected && handleDeleteTrace(selected.id)}>
                      Delete
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
