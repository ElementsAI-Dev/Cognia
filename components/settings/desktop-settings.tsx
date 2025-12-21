'use client';

/**
 * DesktopSettings - Native desktop app settings
 * Only shown when running in Tauri desktop environment
 */

import { useState, useEffect } from 'react';
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
            Desktop Settings
          </CardTitle>
          <CardDescription>
            These settings are only available in the desktop app
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <Monitor className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-sm">
              Download the desktop app to access native features like system
              notifications, global shortcuts, and automatic updates.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => openInBrowser('https://github.com/your-repo/releases')}
            >
              <Download className="h-4 w-4 mr-2" />
              Download Desktop App
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
        title: 'Notifications Enabled',
        body: 'You will now receive desktop notifications.',
      });
    }
  };

  const handleTestNotification = async () => {
    await sendNotification({
      title: 'Test Notification',
      body: 'This is a test notification from Cognia.',
    });
  };

  return (
    <div className="space-y-6">
      {/* System Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            System Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Platform</span>
            <Badge variant="secondary">{platform || 'Unknown'}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">App Version</span>
            <Badge variant="outline">{appVersion || 'Unknown'}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Window Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Window Controls
          </CardTitle>
          <CardDescription>
            Control window behavior and appearance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Pin className="h-4 w-4" />
                Always on Top
              </Label>
              <p className="text-sm text-muted-foreground">
                Keep window above other windows
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
                Fullscreen Mode
              </Label>
              <p className="text-sm text-muted-foreground">
                Enter or exit fullscreen mode
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
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
          <CardDescription>
            Configure desktop notification settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!notificationPermission ? (
            <div className="flex flex-col items-center py-4 text-center">
              <Bell className="h-8 w-8 mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-3">
                Enable notifications to receive alerts
              </p>
              <Button onClick={handleRequestNotificationPermission}>
                Enable Notifications
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive desktop notifications for important events
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
                Send Test Notification
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Updates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Updates
          </CardTitle>
          <CardDescription>
            Check for and install app updates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isDownloading ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Downloading update...</span>
                <span>{downloadProgress}%</span>
              </div>
              <Progress value={downloadProgress} />
            </div>
          ) : updateInfo?.available ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="bg-green-500">
                  Update Available
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
                Install Update
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-sm">
                  {updateInfo === null
                    ? 'Check for available updates'
                    : 'You are on the latest version'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Current: v{appVersion}
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
                    Check for Updates
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Links */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resources</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => openInBrowser('https://github.com/your-repo')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            View on GitHub
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => openInBrowser('https://github.com/your-repo/issues')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Report an Issue
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default DesktopSettings;
