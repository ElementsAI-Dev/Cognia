'use client';

/**
 * Plugin Updates - Manage plugin updates
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { usePluginStore } from '@/stores/plugin';
import {
  getPluginUpdater,
  type UpdateInfo,
} from '@/lib/plugin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Download,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  ArrowUpCircle,
  Clock,
  Package,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PluginUpdatesProps {
  className?: string;
  autoCheck?: boolean;
}

export function PluginUpdates({
  className,
  autoCheck = true,
}: PluginUpdatesProps) {
  const t = useTranslations('pluginUpdates');
  const { plugins, getEnabledPlugins } = usePluginStore();
  const [updates, setUpdates] = useState<UpdateInfo[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [updatingPlugins, setUpdatingPlugins] = useState<Set<string>>(new Set());
  const [updateProgress, setUpdateProgress] = useState<Record<string, number>>({});
  const [showSettings, setShowSettings] = useState(false);
  const [autoUpdateEnabled, setAutoUpdateEnabled] = useState(false);

  const checkForUpdates = useCallback(async () => {
    setIsChecking(true);
    try {
      const updater = getPluginUpdater();
      const enabledPlugins = getEnabledPlugins();
      const pluginIds = enabledPlugins.map((p) => p.manifest.id);
      
      const availableUpdates = await updater.checkForUpdates(pluginIds);
      setUpdates(availableUpdates);
    } catch (error) {
      console.error('Failed to check for updates:', error);
    } finally {
      setIsChecking(false);
    }
  }, [getEnabledPlugins]);

  useEffect(() => {
    if (autoCheck) {
      const timer = setTimeout(checkForUpdates, 500);
      return () => clearTimeout(timer);
    }
  }, [autoCheck, checkForUpdates]);

  useEffect(() => {
    // Auto update config is managed internally by the updater
    setAutoUpdateEnabled(false);
  }, []);

  const handleUpdate = async (pluginId: string) => {
    setUpdatingPlugins((prev) => new Set(prev).add(pluginId));
    setUpdateProgress((prev) => ({ ...prev, [pluginId]: 0 }));

    try {
      const updater = getPluginUpdater();
      
      updater.onProgress((progress) => {
        if (progress.pluginId === pluginId) {
          setUpdateProgress((prev) => ({
            ...prev,
            [pluginId]: progress.progress,
          }));
        }
      });

      await updater.update(pluginId);
      
      // Remove from updates list after successful update
      setUpdates((prev) => prev.filter((u) => u.pluginId !== pluginId));
    } catch (error) {
      console.error(`Failed to update plugin ${pluginId}:`, error);
    } finally {
      setUpdatingPlugins((prev) => {
        const next = new Set(prev);
        next.delete(pluginId);
        return next;
      });
      setUpdateProgress((prev) => {
        const { [pluginId]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleUpdateAll = async () => {
    for (const update of updates) {
      await handleUpdate(update.pluginId);
    }
  };

  const handleAutoUpdateChange = (enabled: boolean) => {
    setAutoUpdateEnabled(enabled);
    const updater = getPluginUpdater();
    
    if (enabled) {
      updater.configureAutoUpdate({
        enabled: true,
        checkInterval: 24 * 60 * 60 * 1000, // 24 hours
        autoInstall: false,
        notifyOnly: true,
        excludePlugins: [],
        allowPrerelease: false,
      });
    } else {
      updater.stopAutoUpdate();
    }
  };

  const criticalUpdates = updates.filter((u) => u.breaking);
  const regularUpdates = updates.filter((u) => !u.breaking);

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="pb-2 shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowUpCircle className="h-4 w-4" />
            {t('title')}
            {updates.length > 0 && (
              <Badge className="ml-2">{updates.length}</Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={checkForUpdates}
              disabled={isChecking}
            >
              <RefreshCw
                className={cn('h-4 w-4', isChecking && 'animate-spin')}
              />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col min-h-0">
        {/* Settings Panel */}
        {showSettings && (
          <div className="mb-4 p-3 rounded-lg bg-muted/50 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="auto-update">{t('settings.autoCheck')}</Label>
                <p className="text-xs text-muted-foreground">
                  {t('settings.autoCheckDesc')}
                </p>
              </div>
              <Switch
                id="auto-update"
                checked={autoUpdateEnabled}
                onCheckedChange={handleAutoUpdateChange}
              />
            </div>
          </div>
        )}

        {/* Update All Button */}
        {updates.length > 1 && (
          <div className="mb-3 shrink-0">
            <Button
              onClick={handleUpdateAll}
              disabled={updatingPlugins.size > 0}
              className="w-full"
              size="sm"
            >
              <Download className="h-4 w-4 mr-2" />
              {t('updateAll', { count: updates.length })}
            </Button>
          </div>
        )}

        {/* Critical Updates */}
        {criticalUpdates.length > 0 && (
          <div className="mb-3 shrink-0">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-xs sm:text-sm font-medium text-red-500">
                {t('breakingChanges')}
              </span>
            </div>
            <div className="space-y-2">
              {criticalUpdates.map((update) => (
                <UpdateItem
                  key={update.pluginId}
                  update={update}
                  plugin={plugins[update.pluginId]}
                  isUpdating={updatingPlugins.has(update.pluginId)}
                  progress={updateProgress[update.pluginId]}
                  onUpdate={() => handleUpdate(update.pluginId)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Regular Updates */}
        <ScrollArea className="flex-1 min-h-0">
          {updates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
              <p className="text-muted-foreground">
                {t('allUpToDate')}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {isChecking ? t('checking') : t('lastChecked')}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {regularUpdates.map((update) => (
                <UpdateItem
                  key={update.pluginId}
                  update={update}
                  plugin={plugins[update.pluginId]}
                  isUpdating={updatingPlugins.has(update.pluginId)}
                  progress={updateProgress[update.pluginId]}
                  onUpdate={() => handleUpdate(update.pluginId)}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

interface UpdateItemProps {
  update: UpdateInfo;
  plugin: ReturnType<typeof usePluginStore.getState>['plugins'][string] | undefined;
  isUpdating: boolean;
  progress?: number;
  onUpdate: () => void;
}

function UpdateItem({
  update,
  plugin,
  isUpdating,
  progress,
  onUpdate,
}: UpdateItemProps) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
      <Package className="h-8 w-8 text-muted-foreground flex-shrink-0" />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">
            {plugin?.manifest.name || update.pluginId}
          </span>
          {update.breaking && (
            <Badge variant="destructive" className="text-xs">
              Breaking
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="font-mono">{update.currentVersion}</span>
          <span>→</span>
          <span className="font-mono text-primary">{update.latestVersion}</span>
        </div>
        {update.changelog && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {update.changelog}
          </p>
        )}
        {isUpdating && progress !== undefined && (
          <Progress value={progress} className="h-1 mt-2" />
        )}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {update.releaseDate && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>
              {new Date(update.releaseDate).toLocaleDateString()}
            </span>
          </div>
        )}
        <Button
          size="sm"
          onClick={onUpdate}
          disabled={isUpdating}
        >
          {isUpdating ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

export type { PluginUpdatesProps };
