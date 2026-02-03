'use client';

/**
 * DataSettings - Manage local data, export/import
 */

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Download,
  Upload,
  Trash2,
  AlertTriangle,
  FileJson,
  Database,
  HardDrive,
  FileArchive,
  MessageSquare,
  FileCode,
  RefreshCw,
  Sparkles,
  Activity,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useSessionStore, useArtifactStore } from '@/stores';
import { db } from '@/lib/db';
import { downloadExport, parseImportFile, importFullBackup } from '@/lib/storage';
import { BatchExportDialog } from '@/components/export';
import { ChatImportDialog } from '@/components/chat/dialogs';
import { toast } from '@/components/ui/sonner';
import { resetOnboardingTour } from '@/components/onboarding';
import { useStorageStats, useStorageCleanup } from '@/hooks/storage';
import type { StorageCategory } from '@/lib/storage';
import { StorageBreakdown } from './storage-breakdown';
import { StorageHealthDisplay } from './storage-health';
import { StorageCleanupDialog } from './storage-cleanup-dialog';


export function DataSettings() {
  const t = useTranslations('dataSettings');
  const tCommon = useTranslations('common');

  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [chatImportOpen, setChatImportOpen] = useState(false);

  const sessions = useSessionStore((state) => state.sessions);
  const clearAllSessions = useSessionStore((state) => state.clearAllSessions);

  // Storage management hooks
  const {
    stats,
    health,
    isLoading: isStatsLoading,
    refresh: refreshStats,
    formatBytes,
  } = useStorageStats({ refreshInterval: 30000 });

  const { clearCategory, isRunning: isClearing } = useStorageCleanup();

  // Handle category clear
  const handleClearCategory = useCallback(
    async (category: StorageCategory) => {
      try {
        const deleted = await clearCategory(category);
        toast.success(t('categoryCleared', { count: deleted }) || `Cleared ${deleted} items`);
        refreshStats();
      } catch (_error) {
        toast.error(t('clearFailed') || 'Failed to clear category');
      }
    },
    [clearCategory, refreshStats, t]
  );

  // Get localStorage estimate for quick display
  const getLocalStorageEstimate = () => {
    try {
      let total = 0;
      for (const key in localStorage) {
        if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
          total += localStorage[key].length * 2;
        }
      }
      return formatBytes(total);
    } catch {
      return 'Unknown';
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Use the new comprehensive export utility
      await downloadExport({
        includeSessions: true,
        includeSettings: true,
        includeArtifacts: true,
        includeIndexedDB: true,
        includeChecksum: true,
      });
      toast.success(t('exportSuccess') || 'Export successful!');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error(t('exportFailed') || 'Export failed.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      // Parse and validate import file
      const { data, errors: parseErrors } = await parseImportFile(file);
      
      if (!data || parseErrors.length > 0) {
        throw new Error(parseErrors.join(', ') || 'Invalid export file');
      }

      // Import using comprehensive import utility
      const result = await importFullBackup(data, {
        mergeStrategy: 'merge',
        generateNewIds: false,
        validateData: true,
      });

      if (result.success) {
        const summary = [
          result.imported.sessions > 0 && `${result.imported.sessions} sessions`,
          result.imported.artifacts > 0 && `${result.imported.artifacts} artifacts`,
          result.imported.messages > 0 && `${result.imported.messages} messages`,
          result.imported.settings && 'settings',
        ].filter(Boolean).join(', ');
        
        toast.success(t('importSuccess') || `Import successful! Imported: ${summary}`);
        refreshStats();
      } else {
        const errorMsg = result.errors.map(e => e.message).join(', ');
        throw new Error(errorMsg || 'Import failed');
      }
    } catch (error) {
      console.error('Import failed:', error);
      toast.error(t('importFailed') || `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsImporting(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const handleDeleteAllData = async () => {
    try {
      // Clear all stores
      clearAllSessions();
      useArtifactStore.getState().clearSessionData('');

      // Clear all IndexedDB tables
      await Promise.all([
        db.sessions.clear(),
        db.messages.clear(),
        db.documents.clear(),
        db.projects.clear(),
        db.workflows.clear(),
        db.summaries.clear(),
        db.knowledgeFiles.clear(),
      ]);

      // Clear all cognia-* localStorage keys
      const keysToRemove = Object.keys(localStorage).filter(
        (key) => key.startsWith('cognia-') || key === 'selection-toolbar-storage' || key === 'app-cache'
      );
      keysToRemove.forEach((key) => localStorage.removeItem(key));

      setDeleteDialogOpen(false);
      toast.success(t('deleteSuccess'));
      refreshStats();
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error(t('deleteFailed'));
    }
  };


  return (
    <div className="space-y-4">
      {/* Storage Info and Export/Import side by side on larger screens */}
      <div className="grid gap-3 sm:grid-cols-2">
        {/* Storage Info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-muted-foreground" />
                {t('storage')}
              </div>
              <div className="flex items-center gap-1">
                {isStatsLoading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => refreshStats()}
                  disabled={isStatsLoading}
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
              </div>
            </CardTitle>
            <CardDescription className="text-[10px]">
              {t('storageDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-1.5 grid-cols-2">
              <div className="rounded-lg border p-2 text-center bg-muted/30">
                <MessageSquare className="h-3.5 w-3.5 text-muted-foreground mx-auto mb-0.5" />
                <div className="text-base font-bold">{sessions.length}</div>
                <span className="text-[9px] text-muted-foreground">{t('sessions')}</span>
              </div>
              <div className="rounded-lg border p-2 text-center bg-muted/30">
                <FileCode className="h-3.5 w-3.5 text-muted-foreground mx-auto mb-0.5" />
                <div className="text-base font-bold">
                  {Object.keys(useArtifactStore.getState().artifacts).length}
                </div>
                <span className="text-[9px] text-muted-foreground">{t('artifacts')}</span>
              </div>
              <div className="rounded-lg border p-2 text-center bg-muted/30">
                <HardDrive className="h-3.5 w-3.5 text-muted-foreground mx-auto mb-0.5" />
                <div className="text-base font-bold">{getLocalStorageEstimate()}</div>
                <span className="text-[9px] text-muted-foreground">{t('localStorage')}</span>
              </div>
              <div className="rounded-lg border p-2 text-center bg-muted/30">
                <Database className="h-3.5 w-3.5 text-muted-foreground mx-auto mb-0.5" />
                <div className="text-base font-bold">
                  {stats ? formatBytes(stats.total.used) : 'N/A'}
                </div>
                <span className="text-[9px] text-muted-foreground">{t('indexedDB')}</span>
              </div>
            </div>
            {stats && (
              <div>
                <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                  <span>{t('usage')}</span>
                  <span>{formatBytes(stats.total.used)} / {formatBytes(stats.total.quota)}</span>
                </div>
                <Progress 
                  value={Math.min(stats.total.usagePercent, 100)} 
                  className="h-1.5"
                />
              </div>
            )}

            {/* Storage Breakdown */}
            {stats && stats.byCategory.length > 0 && (
              <StorageBreakdown
                categories={stats.byCategory}
                totalSize={stats.localStorage.used}
                onClearCategory={handleClearCategory}
                isClearing={isClearing}
                formatBytes={formatBytes}
              />
            )}

            {/* Storage Health */}
            {health && (
              <div className="pt-2 border-t">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium">{t('healthStatus') || 'Health Status'}</span>
                </div>
                <StorageHealthDisplay
                  health={health}
                  formatBytes={formatBytes}
                />
              </div>
            )}

            {/* Cleanup Button */}
            <div className="pt-2">
              <StorageCleanupDialog
                formatBytes={formatBytes}
                onCleanupComplete={refreshStats}
                trigger={
                  <Button size="sm" variant="outline" className="w-full">
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    {t('cleanupStorage') || 'Cleanup Storage'}
                  </Button>
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Export/Import and Danger Zone stacked */}
        <div className="space-y-4">
          {/* Export/Import */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <FileJson className="h-4 w-4 text-muted-foreground" />
                {t('exportImport')}
              </CardTitle>
              <CardDescription className="text-[10px]">
                {t('exportImportDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={handleExport} disabled={isExporting}>
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  {isExporting ? t('exporting') : t('export')}
                </Button>

                <Button size="sm" variant="outline" disabled={isImporting} asChild>
                  <label className="cursor-pointer">
                    <Upload className="mr-1.5 h-3.5 w-3.5" />
                    {isImporting ? t('importing') : t('import')}
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImport}
                      className="hidden"
                    />
                  </label>
                </Button>

                <BatchExportDialog
                  trigger={
                    <Button size="sm" variant="outline">
                      <FileArchive className="mr-1.5 h-3.5 w-3.5" />
                      {t('batchExport')}
                    </Button>
                  }
                />

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setChatImportOpen(true)}
                >
                  <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                  {t('importChatGPT') || 'Import ChatGPT'}
                </Button>

                <ChatImportDialog
                  open={chatImportOpen}
                  onOpenChange={setChatImportOpen}
                  onImportComplete={(result) => {
                    if (result.success) {
                      toast.success(
                        t('chatImportSuccess') ||
                          `Imported ${result.imported.sessions} chats with ${result.imported.messages} messages`
                      );
                      refreshStats();
                    }
                  }}
                />
              </div>

              <Alert className="py-2">
                <HardDrive className="h-3.5 w-3.5" />
                <AlertTitle className="text-xs font-medium">{t('dataPrivacy')}</AlertTitle>
                <AlertDescription className="text-[10px]">
                  {t('dataPrivacyDesc')}
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Onboarding & Help */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Sparkles className="h-4 w-4 text-muted-foreground" />
                {t('helpAndTour')}
              </CardTitle>
              <CardDescription className="text-[10px]">
                {t('helpAndTourDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  resetOnboardingTour('feature-tour');
                  toast.success(t('tourReset'));
                  // Reload to show tour
                  setTimeout(() => window.location.reload(), 500);
                }}
              >
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                {t('restartTour')}
              </Button>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-destructive/50">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4" />
                {t('dangerZone')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="destructive">
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    {t('deleteAll')}
                  </Button>
                </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('deleteConfirmTitle')}</DialogTitle>
                <DialogDescription>
                  {t('deleteConfirmDesc')}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDeleteDialogOpen(false)}
                >
                  {tCommon('cancel')}
                </Button>
                <Button variant="destructive" onClick={handleDeleteAllData}>
                  {t('deleteEverything')}
                </Button>
              </DialogFooter>
            </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default DataSettings;
