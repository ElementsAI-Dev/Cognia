'use client';

/**
 * SyncSettings - Main sync settings panel for WebDAV and GitHub sync
 */

import { useState, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  Cloud,
  Github,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  Settings2,
  Download,
  Upload,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/components/ui/sonner';
import { useSyncStore } from '@/stores/sync';
import { initSyncScheduler } from '@/lib/sync';
import { WebDAVConfigForm } from './webdav-config';
import { GitHubConfigForm } from './github-config';
import { SyncHistoryDialog } from './sync-history-dialog';
import type { SyncProviderType } from '@/types/sync';

export function SyncSettings() {
  const t = useTranslations('syncSettings');

  const {
    activeProvider,
    setActiveProvider,
    webdavConfig,
    githubConfig,
    status,
    lastError,
    startSync,
    testConnection,
  } = useSyncStore();

  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'success' | 'error'>('unknown');

  // Initialize scheduler on mount
  useEffect(() => {
    initSyncScheduler();
  }, []);

  const handleProviderChange = useCallback((provider: string) => {
    if (provider === 'none') {
      setActiveProvider(null);
      setConnectionStatus('unknown');
    } else {
      setActiveProvider(provider as SyncProviderType);
      setConnectionStatus('unknown');
    }
  }, [setActiveProvider]);

  const handleTestConnection = useCallback(async () => {
    setIsTestingConnection(true);
    setConnectionStatus('unknown');

    try {
      const result = await testConnection();
      setConnectionStatus(result.success ? 'success' : 'error');
      
      if (result.success) {
        toast.success(t('connectionSuccess') || 'Connection successful!');
      } else {
        toast.error(result.error || t('connectionFailed') || 'Connection failed');
      }
    } catch (_error) {
      setConnectionStatus('error');
      toast.error(t('connectionFailed') || 'Connection test failed');
    } finally {
      setIsTestingConnection(false);
    }
  }, [testConnection, t]);

  const handleSync = useCallback(async (direction: 'upload' | 'download' | 'bidirectional') => {
    try {
      const result = await startSync(direction);
      
      if (result.success) {
        toast.success(
          t('syncSuccess', { count: result.itemsSynced }) || 
          `Sync completed! ${result.itemsSynced} items synced.`
        );
      } else {
        toast.error(result.error || t('syncFailed') || 'Sync failed');
      }
    } catch (_error) {
      toast.error(t('syncFailed') || 'Sync failed');
    }
  }, [startSync, t]);

  const currentConfig = activeProvider === 'webdav' ? webdavConfig : githubConfig;
  const lastSyncTime = currentConfig?.lastSyncAt;

  return (
    <div className="space-y-4">
      {/* Provider Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Cloud className="h-4 w-4 text-muted-foreground" />
            {t('cloudSync') || 'Cloud Sync'}
          </CardTitle>
          <CardDescription className="text-xs">
            {t('cloudSyncDesc') || 'Sync your data across devices using WebDAV or GitHub'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Provider Selector */}
          <div className="flex items-center justify-between">
            <Label htmlFor="sync-provider" className="text-sm">
              {t('syncProvider') || 'Sync Provider'}
            </Label>
            <Select
              value={activeProvider || 'none'}
              onValueChange={handleProviderChange}
            >
              <SelectTrigger id="sync-provider" className="w-[180px]">
                <SelectValue placeholder={t('selectProvider') || 'Select provider'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('disabled') || 'Disabled'}</SelectItem>
                <SelectItem value="webdav">
                  <div className="flex items-center gap-2">
                    <Cloud className="h-4 w-4" />
                    WebDAV
                  </div>
                </SelectItem>
                <SelectItem value="github">
                  <div className="flex items-center gap-2">
                    <Github className="h-4 w-4" />
                    GitHub
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status Indicators */}
          {activeProvider && (
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">{t('status') || 'Status'}:</span>
                {status === 'syncing' ? (
                  <Badge variant="secondary" className="gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {t('syncing') || 'Syncing'}
                  </Badge>
                ) : status === 'success' ? (
                  <Badge variant="default" className="gap-1 bg-green-500">
                    <CheckCircle2 className="h-3 w-3" />
                    {t('synced') || 'Synced'}
                  </Badge>
                ) : status === 'error' ? (
                  <Badge variant="destructive" className="gap-1">
                    <XCircle className="h-3 w-3" />
                    {t('error') || 'Error'}
                  </Badge>
                ) : (
                  <Badge variant="outline">
                    {t('idle') || 'Idle'}
                  </Badge>
                )}
              </div>

              {lastSyncTime && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span className="text-xs">
                    {t('lastSync') || 'Last sync'}: {new Date(lastSyncTime).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Error Display */}
          {lastError && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4" />
              {lastError}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Provider Configuration */}
      {activeProvider === 'webdav' && (
        <WebDAVConfigForm onConnectionStatusChange={setConnectionStatus} />
      )}

      {activeProvider === 'github' && (
        <GitHubConfigForm onConnectionStatusChange={setConnectionStatus} />
      )}

      {/* Sync Actions */}
      {activeProvider && currentConfig?.enabled && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Settings2 className="h-4 w-4 text-muted-foreground" />
              {t('syncActions') || 'Sync Actions'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Connection Test */}
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">{t('testConnection') || 'Test Connection'}</Label>
                <p className="text-xs text-muted-foreground">
                  {t('testConnectionDesc') || 'Verify your sync configuration'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {connectionStatus === 'success' && (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                )}
                {connectionStatus === 'error' && (
                  <XCircle className="h-4 w-4 text-destructive" />
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={isTestingConnection || status === 'syncing'}
                >
                  {isTestingConnection ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  {t('test') || 'Test'}
                </Button>
              </div>
            </div>

            <Separator />

            {/* Manual Sync Buttons */}
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => handleSync('bidirectional')}
                disabled={status === 'syncing'}
              >
                {status === 'syncing' ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                )}
                {t('syncNow') || 'Sync Now'}
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => handleSync('upload')}
                disabled={status === 'syncing'}
              >
                <Upload className="mr-1.5 h-3.5 w-3.5" />
                {t('uploadOnly') || 'Upload'}
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => handleSync('download')}
                disabled={status === 'syncing'}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                {t('downloadOnly') || 'Download'}
              </Button>

              <SyncHistoryDialog />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default SyncSettings;
