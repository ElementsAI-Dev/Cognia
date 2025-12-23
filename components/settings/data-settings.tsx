'use client';

/**
 * DataSettings - Manage local data, export/import
 */

import { useState, useEffect } from 'react';
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
import { useSessionStore, useSettingsStore, useArtifactStore } from '@/stores';
import { db } from '@/lib/db';
import { BatchExportDialog } from '@/components/export';

// Helper to format bytes
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function DataSettings() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [storageInfo, setStorageInfo] = useState<{ used: number; quota: number } | null>(null);

  const sessions = useSessionStore((state) => state.sessions);
  const clearAllSessions = useSessionStore((state) => state.clearAllSessions);

  // Get storage estimate on mount
  useEffect(() => {
    if (navigator.storage?.estimate) {
      navigator.storage.estimate().then((estimate) => {
        setStorageInfo({
          used: estimate.usage || 0,
          quota: estimate.quota || 0,
        });
      });
    }
  }, []);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Gather all data
      const exportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        sessions: sessions,
        settings: useSettingsStore.getState(),
        artifacts: useArtifactStore.getState().artifacts,
        canvasDocuments: useArtifactStore.getState().canvasDocuments,
      };

      // Create and download file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cognia-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Validate version
      if (!data.version) {
        throw new Error('Invalid export file');
      }

      // Import sessions
      if (data.sessions && Array.isArray(data.sessions)) {
        // Note: This would need proper store methods to bulk import
        console.log('Importing sessions:', data.sessions.length);
      }

      // Import settings
      if (data.settings) {
        const { setTheme, updateProviderSettings } = useSettingsStore.getState();
        if (data.settings.theme) setTheme(data.settings.theme);
        if (data.settings.providerSettings) {
          Object.entries(data.settings.providerSettings).forEach(
            ([providerId, settings]) => {
              updateProviderSettings(providerId, settings as Record<string, unknown>);
            }
          );
        }
      }

      alert('Import successful!');
    } catch (error) {
      console.error('Import failed:', error);
      alert('Import failed. Please check the file format.');
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

      // Clear IndexedDB
      await db.sessions.clear();
      await db.messages.clear();
      await db.documents.clear();

      // Clear localStorage
      localStorage.removeItem('cognia-sessions');
      localStorage.removeItem('cognia-settings');
      localStorage.removeItem('cognia-artifacts');

      setDeleteDialogOpen(false);
      alert('All data has been deleted.');
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete all data.');
    }
  };

  // Calculate storage usage (approximate)
  const getStorageEstimate = () => {
    try {
      let total = 0;
      for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          total += localStorage[key].length * 2; // UTF-16 = 2 bytes per char
        }
      }
      return (total / 1024).toFixed(2) + ' KB';
    } catch {
      return 'Unknown';
    }
  };

  return (
    <div className="space-y-4">
      {/* Storage Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="h-4 w-4" />
            Storage
          </CardTitle>
          <CardDescription className="text-xs">
            Data stored locally in your browser
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border p-2 text-center">
              <MessageSquare className="h-3.5 w-3.5 text-muted-foreground mx-auto mb-1" />
              <div className="text-lg font-bold">{sessions.length}</div>
              <span className="text-[10px] text-muted-foreground">Sessions</span>
            </div>
            <div className="rounded-lg border p-2 text-center">
              <FileCode className="h-3.5 w-3.5 text-muted-foreground mx-auto mb-1" />
              <div className="text-lg font-bold">
                {Object.keys(useArtifactStore.getState().artifacts).length}
              </div>
              <span className="text-[10px] text-muted-foreground">Artifacts</span>
            </div>
            <div className="rounded-lg border p-2 text-center">
              <HardDrive className="h-3.5 w-3.5 text-muted-foreground mx-auto mb-1" />
              <div className="text-lg font-bold">{getStorageEstimate()}</div>
              <span className="text-[10px] text-muted-foreground">LocalStorage</span>
            </div>
            <div className="rounded-lg border p-2 text-center">
              <Database className="h-3.5 w-3.5 text-muted-foreground mx-auto mb-1" />
              <div className="text-lg font-bold">
                {storageInfo ? formatBytes(storageInfo.used) : 'N/A'}
              </div>
              <span className="text-[10px] text-muted-foreground">IndexedDB</span>
            </div>
          </div>
          {storageInfo && (
            <div className="mt-3">
              <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                <span>Usage</span>
                <span>{formatBytes(storageInfo.used)} / {formatBytes(storageInfo.quota)}</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all"
                  style={{ width: `${Math.min((storageInfo.used / storageInfo.quota) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export/Import */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileJson className="h-4 w-4" />
            Export & Import
          </CardTitle>
          <CardDescription className="text-xs">
            Backup or transfer data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={handleExport} disabled={isExporting}>
              <Download className="mr-1.5 h-3.5 w-3.5" />
              {isExporting ? 'Exporting...' : 'Export'}
            </Button>

            <Button size="sm" variant="outline" disabled={isImporting} asChild>
              <label className="cursor-pointer">
                <Upload className="mr-1.5 h-3.5 w-3.5" />
                {isImporting ? 'Importing...' : 'Import'}
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
                  Batch Export
                </Button>
              }
            />
          </div>

          <Alert className="py-2">
            <HardDrive className="h-3.5 w-3.5" />
            <AlertTitle className="text-sm">Data Privacy</AlertTitle>
            <AlertDescription className="text-xs">
              Exports contain chat history, settings, and API keys. Keep secure.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4" />
            Danger Zone
          </CardTitle>
          <CardDescription className="text-xs">
            Irreversible data deletion
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="destructive">
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Delete All Data
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Are you absolutely sure?</DialogTitle>
                <DialogDescription>
                  This action cannot be undone. This will permanently delete all your
                  chat sessions, artifacts, settings, and stored API keys.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDeleteDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDeleteAllData}>
                  Delete Everything
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}

export default DataSettings;
