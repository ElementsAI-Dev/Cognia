'use client';

/**
 * DesktopSettings - Native desktop app settings
 * Only shown when running in Tauri desktop environment
 */

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  Monitor,
  Bell,
  Download,
  Pin,
  Maximize,
  RefreshCw,
  ExternalLink,
  Info,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useNativeStore } from '@/stores/native-store';
import { useWindow } from '@/hooks/use-window';
import { isTauri } from '@/lib/native/utils';
import {
  requestNotificationPermission,
  sendNotification,
} from '@/lib/native/notification';
import {
  checkForUpdates,
  downloadAndInstallUpdate,
  type UpdateInfo,
} from '@/lib/native/updater';
import { openInBrowser } from '@/lib/native/system';

export function DesktopSettings() {
  const t = useTranslations('desktopSettings');
  const [isDesktop, setIsDesktopState] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const {
    platform,
    appVersion,
    notificationsEnabled,
    notificationPermission,
    setNotificationsEnabled,
    setNotificationPermission,
  } = useNativeStore();

  const {
    isAlwaysOnTop,
    toggleAlwaysOnTop,
    toggleFullscreen,
    isFullscreen,
  } = useWindow();

  useEffect(() => {
    setIsDesktopState(isTauri());
  }, []);

  if (!isDesktop) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            {t('title')}
          </CardTitle>
          <CardDescription>
            {t('notAvailable')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <Monitor className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-sm">
              {t('downloadHint')}
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => openInBrowser('https://github.com/your-repo/releases')}
            >
              <Download className="h-4 w-4 mr-2" />
              {t('downloadApp')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleCheckUpdate = async () => {
    setIsCheckingUpdate(true);
    try {
      const info = await checkForUpdates();
      setUpdateInfo(info);
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const handleInstallUpdate = async () => {
    setIsDownloading(true);
    setDownloadProgress(0);
    try {
      await downloadAndInstallUpdate((progress) => {
        setDownloadProgress(progress.percentage);
      });
    } catch (error) {
      console.error('Update failed:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleRequestNotificationPermission = async () => {
    const granted = await requestNotificationPermission();
    setNotificationPermission(granted);
    if (granted) {
      await sendNotification({
        title: t('notificationsEnabled'),
        body: t('notificationsEnabledBody'),
      });
    }
  };

  const handleTestNotification = async () => {
    await sendNotification({
      title: t('testNotification'),
      body: t('testNotificationBody'),
    });
  };

  return (
    <div className="space-y-6">
      {/* System Info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="h-4 w-4 text-muted-foreground" />
            {t('systemInfo')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t('platform')}</span>
            <Badge variant="secondary">{platform || t('unknown')}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t('appVersion')}</span>
            <Badge variant="outline">{appVersion || t('unknown')}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Window Controls */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Monitor className="h-4 w-4 text-muted-foreground" />
            {t('windowControls')}
          </CardTitle>
          <CardDescription className="text-xs">
            {t('windowControlsDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Pin className="h-4 w-4" />
                {t('alwaysOnTop')}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t('alwaysOnTopDesc')}
              </p>
            </div>
            <Switch
              checked={isAlwaysOnTop}
              onCheckedChange={toggleAlwaysOnTop}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Maximize className="h-4 w-4" />
                {t('fullscreenMode')}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t('fullscreenModeDesc')}
              </p>
            </div>
            <Switch
              checked={isFullscreen}
              onCheckedChange={toggleFullscreen}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4 text-muted-foreground" />
            {t('notifications')}
          </CardTitle>
          <CardDescription className="text-xs">
            {t('notificationsDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!notificationPermission ? (
            <div className="flex flex-col items-center py-4 text-center">
              <Bell className="h-8 w-8 mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-3">
                {t('enableNotificationsHint')}
              </p>
              <Button onClick={handleRequestNotificationPermission}>
                {t('enableNotifications')}
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('enableNotifications')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('enableNotificationsDesc')}
                  </p>
                </div>
                <Switch
                  checked={notificationsEnabled}
                  onCheckedChange={setNotificationsEnabled}
                />
              </div>
              <Separator />
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestNotification}
                disabled={!notificationsEnabled}
              >
                {t('sendTestNotification')}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Updates */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Download className="h-4 w-4 text-muted-foreground" />
            {t('updates')}
          </CardTitle>
          <CardDescription className="text-xs">
            {t('updatesDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isDownloading ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>{t('downloadingUpdate')}</span>
                <span>{downloadProgress}%</span>
              </div>
              <Progress value={downloadProgress} />
            </div>
          ) : updateInfo?.available ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="bg-green-500">
                  {t('updateAvailable')}
                </Badge>
                <span className="text-sm font-medium">
                  v{updateInfo.version}
                </span>
              </div>
              {updateInfo.body && (
                <p className="text-sm text-muted-foreground">
                  {updateInfo.body}
                </p>
              )}
              <Button onClick={handleInstallUpdate}>
                <RefreshCw className="h-4 w-4 mr-2" />
                {t('installUpdate')}
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-sm">
                  {updateInfo === null
                    ? t('checkForUpdates')
                    : t('latestVersion')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('currentVersion', { version: appVersion || '' })}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={handleCheckUpdate}
                disabled={isCheckingUpdate}
              >
                {isCheckingUpdate ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {t('checkForUpdates')}
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Links */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{t('resources')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => openInBrowser('https://github.com/your-repo')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            {t('viewOnGitHub')}
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => openInBrowser('https://github.com/your-repo/issues')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            {t('reportIssue')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default DesktopSettings;
