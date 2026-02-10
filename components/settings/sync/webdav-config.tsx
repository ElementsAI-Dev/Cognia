'use client';

/**
 * WebDAVConfigForm - Configuration form for WebDAV sync
 */

import { useState, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  Cloud,
  Eye,
  EyeOff,
  Save,
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
import {
  storeWebDAVPassword,
  getWebDAVPassword,
  getSyncManager,
} from '@/lib/sync';
import type { ConflictResolution, SyncDataType } from '@/types/sync';
import { SyncAdvancedSettings } from './sync-advanced-settings';

interface WebDAVConfigFormProps {
  onConnectionStatusChange?: (status: 'unknown' | 'success' | 'error') => void;
}

export function WebDAVConfigForm({ onConnectionStatusChange }: WebDAVConfigFormProps) {
  const t = useTranslations('syncSettings');

  const { webdavConfig, setWebDAVConfig } = useSyncStore();

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);

  // Check for existing password on mount
  useEffect(() => {
    getWebDAVPassword().then((pwd) => {
      setHasPassword(!!pwd);
    });
  }, []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    
    try {
      // Store password if provided
      if (password) {
        await storeWebDAVPassword(password);
        setHasPassword(true);
        setPassword('');
      }

      // Initialize provider
      const manager = getSyncManager();
      const pwd = password || await getWebDAVPassword();
      
      if (pwd) {
        await manager.initWebDAV(pwd);
        
        // Test connection
        const result = await manager.testConnection();
        onConnectionStatusChange?.(result.success ? 'success' : 'error');
        
        if (result.success) {
          toast.success(t('configSaved') || 'Configuration saved');
        } else {
          toast.error(result.error || t('connectionFailed') || 'Connection failed');
        }
      } else {
        toast.error(t('passwordRequired') || 'Password is required');
      }
    } catch (_error) {
      toast.error(t('saveFailed') || 'Failed to save configuration');
      onConnectionStatusChange?.('error');
    } finally {
      setIsSaving(false);
    }
  }, [password, onConnectionStatusChange, t]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Cloud className="h-4 w-4 text-muted-foreground" />
          {t('webdavConfig') || 'WebDAV Configuration'}
        </CardTitle>
        <CardDescription className="text-xs">
          {t('webdavConfigDesc') || 'Configure your WebDAV server settings'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Enable Switch */}
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm">{t('enabled') || 'Enable Sync'}</Label>
            <p className="text-xs text-muted-foreground">
              {t('enabledDesc') || 'Enable WebDAV synchronization'}
            </p>
          </div>
          <Switch
            checked={webdavConfig.enabled}
            onCheckedChange={(enabled) => setWebDAVConfig({ enabled })}
          />
        </div>

        {/* Server URL */}
        <div className="space-y-2">
          <Label htmlFor="webdav-url" className="text-sm">
            {t('serverUrl') || 'Server URL'}
          </Label>
          <Input
            id="webdav-url"
            placeholder="https://your-webdav-server.com/dav/"
            value={webdavConfig.serverUrl}
            onChange={(e) => setWebDAVConfig({ serverUrl: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            {t('serverUrlDesc') || 'Full URL to your WebDAV endpoint'}
          </p>
        </div>

        {/* Username */}
        <div className="space-y-2">
          <Label htmlFor="webdav-username" className="text-sm">
            {t('username') || 'Username'}
          </Label>
          <Input
            id="webdav-username"
            placeholder="your-username"
            value={webdavConfig.username}
            onChange={(e) => setWebDAVConfig({ username: e.target.value })}
          />
        </div>

        {/* Password */}
        <div className="space-y-2">
          <Label htmlFor="webdav-password" className="text-sm">
            {t('password') || 'Password'}
          </Label>
          <div className="relative">
            <Input
              id="webdav-password"
              type={showPassword ? 'text' : 'password'}
              placeholder={hasPassword ? '••••••••' : 'Enter password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full px-3"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
          {hasPassword && (
            <p className="text-xs text-muted-foreground">
              {t('passwordStored') || 'Password is securely stored. Enter new value to update.'}
            </p>
          )}
        </div>

        {/* Remote Path */}
        <div className="space-y-2">
          <Label htmlFor="webdav-path" className="text-sm">
            {t('remotePath') || 'Remote Path'}
          </Label>
          <Input
            id="webdav-path"
            placeholder="/cognia-sync/"
            value={webdavConfig.remotePath}
            onChange={(e) => setWebDAVConfig({ remotePath: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            {t('remotePathDesc') || 'Directory on server for sync files'}
          </p>
        </div>

        {/* Auto Sync */}
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm">{t('autoSync') || 'Auto Sync'}</Label>
            <p className="text-xs text-muted-foreground">
              {t('autoSyncDesc') || 'Automatically sync at regular intervals'}
            </p>
          </div>
          <Switch
            checked={webdavConfig.autoSync}
            onCheckedChange={(autoSync) => setWebDAVConfig({ autoSync })}
          />
        </div>

        {/* Sync Interval */}
        {webdavConfig.autoSync && (
          <div className="space-y-2">
            <Label className="text-sm">
              {t('syncInterval') || 'Sync Interval'}: {webdavConfig.syncInterval} {t('minutes') || 'minutes'}
            </Label>
            <Slider
              value={[webdavConfig.syncInterval]}
              onValueChange={([value]) => setWebDAVConfig({ syncInterval: value })}
              min={5}
              max={120}
              step={5}
            />
          </div>
        )}

        {/* Conflict Resolution */}
        <div className="space-y-2">
          <Label className="text-sm">{t('conflictResolution') || 'Conflict Resolution'}</Label>
          <Select
            value={webdavConfig.conflictResolution}
            onValueChange={(value) => setWebDAVConfig({ conflictResolution: value as ConflictResolution })}
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

        {/* Sync on Startup/Exit */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm">{t('syncOnStartup') || 'Sync on Startup'}</Label>
            <Switch
              checked={webdavConfig.syncOnStartup}
              onCheckedChange={(syncOnStartup) => setWebDAVConfig({ syncOnStartup })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm">{t('syncOnExit') || 'Sync on Exit'}</Label>
            <Switch
              checked={webdavConfig.syncOnExit}
              onCheckedChange={(syncOnExit) => setWebDAVConfig({ syncOnExit })}
            />
          </div>
        </div>

        {/* Advanced: Max Backups & Selective Sync */}
        <SyncAdvancedSettings
          maxBackups={webdavConfig.maxBackups}
          syncDataTypes={webdavConfig.syncDataTypes as SyncDataType[]}
          onMaxBackupsChange={(maxBackups) => setWebDAVConfig({ maxBackups })}
          onSyncDataTypesChange={(syncDataTypes) => setWebDAVConfig({ syncDataTypes })}
        />

        {/* Save Button */}
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
