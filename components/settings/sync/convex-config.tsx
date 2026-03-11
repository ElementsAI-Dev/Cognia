'use client';

/**
 * ConvexConfigForm - Configuration form for Convex sync
 */

import { useState, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  Database,
  Eye,
  EyeOff,
  Save,
  Loader2,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { toast } from '@/components/ui/sonner';
import { useSyncStore } from '@/stores/sync';
import { isTauri } from '@/lib/utils';
import {
  storeConvexDeployKey,
  getConvexDeployKey,
  removeConvexDeployKey,
  getSyncManager,
} from '@/lib/sync';
import { normalizeConvexDeploymentUrl, validateConvexDeploymentUrl } from '@/lib/sync/convex-url';
import {
  setConvexConfig as setNativeConvexConfig,
  testConvexConnection as testNativeConvexConnection,
} from '@/lib/native/convex';
import type { ConflictResolution, SyncDataType } from '@/types/sync';
import { SyncAdvancedSettings } from './sync-advanced-settings';

interface ConvexConfigFormProps {
  onConnectionStatusChange?: (status: 'unknown' | 'success' | 'error') => void;
}

export function ConvexConfigForm({ onConnectionStatusChange }: ConvexConfigFormProps) {
  const t = useTranslations('syncSettings');
  const { convexConfig, setConvexConfig } = useSyncStore();

  const [deployKey, setDeployKey] = useState('');
  const [showDeployKey, setShowDeployKey] = useState(false);
  const [hasDeployKey, setHasDeployKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRemovingKey, setIsRemovingKey] = useState(false);

  useEffect(() => {
    getConvexDeployKey().then((key) => {
      setHasDeployKey(!!key);
    });
  }, []);

  const handleRemoveKey = useCallback(async () => {
    setIsRemovingKey(true);
    try {
      await removeConvexDeployKey();
      setHasDeployKey(false);
      setDeployKey('');
      onConnectionStatusChange?.('unknown');
      toast.success(t('convexDeployKeyRemoved') || 'Convex deploy key removed');
    } catch (_error) {
      toast.error(t('convexDeployKeyRemoveFailed') || 'Failed to remove deploy key');
    } finally {
      setIsRemovingKey(false);
    }
  }, [onConnectionStatusChange, t]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    onConnectionStatusChange?.('unknown');

    try {
      const deploymentUrl = convexConfig.deploymentUrl.trim();
      const projectSlug = convexConfig.projectSlug.trim();
      const keyInput = deployKey.trim();

      const deploymentUrlError = validateConvexDeploymentUrl(deploymentUrl);
      if (deploymentUrlError) {
        const message =
          deploymentUrlError === 'Convex deployment URL is required'
            ? t('convexDeploymentUrlRequired') || 'Deployment URL is required'
            : t('convexDeploymentUrlInvalid') ||
              'Deployment URL must be a valid Convex URL (.convex.cloud or .convex.site)';
        toast.error(message);
        onConnectionStatusChange?.('error');
        return;
      }

      const normalizedDeploymentUrl = normalizeConvexDeploymentUrl(deploymentUrl);

      const savedKey = keyInput || (await getConvexDeployKey()) || '';
      if (!savedKey) {
        toast.error(t('convexDeployKeyRequired') || 'Deploy key is required');
        onConnectionStatusChange?.('error');
        return;
      }

      setConvexConfig({ deploymentUrl: normalizedDeploymentUrl, projectSlug });

      if (keyInput) {
        const stored = await storeConvexDeployKey(keyInput);
        if (!stored) {
          toast.error(t('saveFailed') || 'Failed to save configuration');
          onConnectionStatusChange?.('error');
          return;
        }
        setDeployKey('');
        setHasDeployKey(true);
      }

      let result: { success: boolean; error?: string } | null = null;

      if (isTauri()) {
        try {
          const nativeStored = await setNativeConvexConfig({
            deploymentUrl: normalizedDeploymentUrl,
            deployKey: savedKey,
            enabled: convexConfig.enabled,
            syncIntervalSecs: Math.max(60, Math.round(convexConfig.syncInterval * 60)),
          });

          if (!nativeStored) {
            throw new Error('Failed to persist native Convex configuration');
          }

          const nativeConnected = await testNativeConvexConnection();
          result = nativeConnected
            ? { success: true }
            : { success: false, error: t('connectionFailed') || 'Connection failed' };
        } catch {
          // Keep web/provider fallback in desktop environments.
          result = null;
        }
      }

      if (!result) {
        const manager = getSyncManager();
        await manager.initConvex(savedKey);
        result = await manager.testConnection();
      }

      onConnectionStatusChange?.(result.success ? 'success' : 'error');

      if (result.success) {
        toast.success(t('configSaved') || 'Configuration saved');
      } else {
        toast.error(result.error || t('connectionFailed') || 'Connection failed');
      }
    } catch (_error) {
      toast.error(t('saveFailed') || 'Failed to save configuration');
      onConnectionStatusChange?.('error');
    } finally {
      setIsSaving(false);
    }
  }, [
    convexConfig.deploymentUrl,
    convexConfig.enabled,
    convexConfig.projectSlug,
    convexConfig.syncInterval,
    deployKey,
    onConnectionStatusChange,
    setConvexConfig,
    t,
  ]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Database className="h-4 w-4 text-muted-foreground" />
          {t('convexConfig') || 'Convex Configuration'}
        </CardTitle>
        <CardDescription className="text-xs">
          {t('convexConfigDesc') || 'Connect to a Convex cloud database for real-time sync'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm">{t('enableConvexSync') || 'Enable Convex Sync'}</Label>
            <p className="text-xs text-muted-foreground">
              {t('enableConvexSyncDesc') || 'Sync data to Convex cloud database'}
            </p>
          </div>
          <Switch
            checked={convexConfig.enabled}
            onCheckedChange={(enabled) => setConvexConfig({ enabled })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="convex-deployment-url" className="text-sm">
            {t('convexDeploymentUrl') || 'Deployment URL'}
          </Label>
          <Input
            id="convex-deployment-url"
            placeholder="https://your-app.convex.site"
            value={convexConfig.deploymentUrl}
            onChange={(e) => setConvexConfig({ deploymentUrl: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            {t('convexDeploymentUrlDesc') ||
              'Your Convex deployment or HTTP actions URL (e.g. https://your-app.convex.cloud or https://your-app.convex.site)'}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="convex-project-slug" className="text-sm">
            {t('convexProjectSlug') || 'Project Slug'}
          </Label>
          <Input
            id="convex-project-slug"
            placeholder="your-project"
            value={convexConfig.projectSlug}
            onChange={(e) => setConvexConfig({ projectSlug: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            {t('convexProjectSlugDesc') || 'Your Convex project name'}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="convex-deploy-key" className="text-sm">
            {t('convexDeployKey') || 'Deploy Key'}
          </Label>
          <div className="relative">
            <Input
              id="convex-deploy-key"
              type={showDeployKey ? 'text' : 'password'}
              placeholder={hasDeployKey ? '••••••••' : 'prod:xxxxxxxxxxxxxxxx'}
              value={deployKey}
              onChange={(e) => setDeployKey(e.target.value)}
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full px-3"
              onClick={() => setShowDeployKey(!showDeployKey)}
            >
              {showDeployKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('convexDeployKeyDesc') || 'Production deploy key from your Convex dashboard'}
          </p>
          {hasDeployKey && (
            <p className="text-xs text-muted-foreground">
              {t('convexDeployKeyStored') ||
                'Deploy key is securely stored. Enter new value to update.'}
            </p>
          )}
          {hasDeployKey && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRemoveKey}
              disabled={isRemovingKey}
            >
              {isRemovingKey ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              )}
              {t('disconnect') || 'Disconnect'}
            </Button>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm">{t('autoSync') || 'Auto Sync'}</Label>
            <p className="text-xs text-muted-foreground">
              {t('autoSyncDesc') || 'Automatically sync at regular intervals'}
            </p>
          </div>
          <Switch
            checked={convexConfig.autoSync}
            onCheckedChange={(autoSync) => setConvexConfig({ autoSync })}
          />
        </div>

        {convexConfig.autoSync && (
          <div className="space-y-2">
            <Label className="text-sm">
              {t('syncInterval') || 'Sync Interval'}: {convexConfig.syncInterval}{' '}
              {t('minutes') || 'minutes'}
            </Label>
            <Slider
              value={[convexConfig.syncInterval]}
              onValueChange={([value]) => setConvexConfig({ syncInterval: value })}
              min={5}
              max={120}
              step={5}
            />
          </div>
        )}

        <div className="space-y-2">
          <Label className="text-sm">{t('conflictResolution') || 'Conflict Resolution'}</Label>
          <Select
            value={convexConfig.conflictResolution}
            onValueChange={(value) =>
              setConvexConfig({ conflictResolution: value as ConflictResolution })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">{t('useNewest') || 'Use Newest'}</SelectItem>
              <SelectItem value="local">{t('preferLocal') || 'Prefer Local'}</SelectItem>
              <SelectItem value="remote">{t('preferRemote') || 'Prefer Remote'}</SelectItem>
              <SelectItem value="manual">{t('askEverytime') || 'Ask Every Time'}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm">{t('syncOnStartup') || 'Sync on Startup'}</Label>
            <Switch
              checked={convexConfig.syncOnStartup}
              onCheckedChange={(syncOnStartup) => setConvexConfig({ syncOnStartup })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm">{t('syncOnExit') || 'Sync on Exit'}</Label>
            <Switch
              checked={convexConfig.syncOnExit}
              onCheckedChange={(syncOnExit) => setConvexConfig({ syncOnExit })}
            />
          </div>
        </div>

        <SyncAdvancedSettings
          maxBackups={convexConfig.maxBackups}
          syncDataTypes={convexConfig.syncDataTypes as SyncDataType[]}
          onMaxBackupsChange={(maxBackups) => setConvexConfig({ maxBackups })}
          onSyncDataTypesChange={(syncDataTypes) => setConvexConfig({ syncDataTypes })}
        />

        <Button onClick={handleSave} disabled={isSaving} className="w-full">
          {isSaving ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-1.5 h-4 w-4" />
          )}
          {t('saveAndConnect') || 'Save & Connect'}
        </Button>
      </CardContent>
    </Card>
  );
}

export default ConvexConfigForm;
