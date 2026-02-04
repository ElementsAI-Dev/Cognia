'use client';

/**
 * GoogleDriveConfigForm - Configuration UI for Google Drive sync
 */

import { useState, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  HardDrive,
  LogOut,
  CheckCircle2,
  XCircle,
  Loader2,
  FolderLock,
  Upload,
  Settings2,
  ExternalLink,
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
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import { useSyncStore } from '@/stores/sync';
import {
  buildGoogleAuthUrl,
  exchangeGoogleCode,
  getGoogleUserInfo,
  verifyGoogleOAuthState,
  clearGoogleOAuthState,
  calculateTokenExpiry,
  revokeGoogleToken,
} from '@/lib/sync/providers/google-oauth';
import {
  storeGoogleTokens,
  getGoogleAccessToken,
  removeGoogleTokens,
  hasStoredCredentials,
} from '@/lib/sync/credential-storage';

// Google OAuth Client ID - should be configured in environment
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

interface GoogleDriveConfigFormProps {
  onConnectionStatusChange?: (status: 'unknown' | 'success' | 'error') => void;
}

export function GoogleDriveConfigForm({
  onConnectionStatusChange,
}: GoogleDriveConfigFormProps) {
  const t = useTranslations('syncSettings');

  const { googleDriveConfig, setGoogleDriveConfig } = useSyncStore();

  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Check connection status on mount
  useEffect(() => {
    const checkConnection = async () => {
      const hasCredentials = await hasStoredCredentials('googledrive');
      setIsConnected(hasCredentials);

      if (hasCredentials && googleDriveConfig.userEmail) {
        setUserEmail(googleDriveConfig.userEmail);
      }
    };

    checkConnection();
  }, [googleDriveConfig.userEmail]);

  // Handle OAuth callback (check URL for code parameter)
  useEffect(() => {
    const handleCallback = async () => {
      if (typeof window === 'undefined') return;

      const url = new URL(window.location.href);
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      const error = url.searchParams.get('error');

      if (error) {
        toast.error(t('googleAuthError') || `Google authentication failed: ${error}`);
        // Clear URL params
        window.history.replaceState({}, '', window.location.pathname);
        return;
      }

      if (code && state) {
        setIsConnecting(true);

        try {
          // Verify state
          const oauthState = verifyGoogleOAuthState(state);
          if (!oauthState) {
            throw new Error('Invalid OAuth state');
          }

          // Exchange code for tokens
          const tokens = await exchangeGoogleCode(code, oauthState.codeVerifier, {
            clientId: GOOGLE_CLIENT_ID,
            redirectUri: oauthState.redirectUri,
          });

          // Calculate expiry
          const expiresAt = calculateTokenExpiry(tokens.expires_in);

          // Store tokens
          await storeGoogleTokens(
            tokens.access_token,
            tokens.refresh_token || '',
            expiresAt
          );

          // Get user info
          const userInfo = await getGoogleUserInfo(tokens.access_token);

          // Update config
          setGoogleDriveConfig({
            enabled: true,
            userEmail: userInfo.email,
          });

          setIsConnected(true);
          setUserEmail(userInfo.email);
          onConnectionStatusChange?.('success');

          toast.success(
            t('googleConnectedSuccess') ||
              `Connected to Google Drive as ${userInfo.email}`
          );

          // Clear OAuth state and URL params
          clearGoogleOAuthState();
          window.history.replaceState({}, '', window.location.pathname);
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Connection failed';
          toast.error(message);
          onConnectionStatusChange?.('error');
        } finally {
          setIsConnecting(false);
        }
      }
    };

    handleCallback();
  }, [t, setGoogleDriveConfig, onConnectionStatusChange]);

  const handleConnect = useCallback(async () => {
    if (!GOOGLE_CLIENT_ID) {
      toast.error(
        t('googleClientIdMissing') ||
          'Google Client ID is not configured. Please set NEXT_PUBLIC_GOOGLE_CLIENT_ID.'
      );
      return;
    }

    setIsConnecting(true);

    try {
      const redirectUri = `${window.location.origin}/settings/sync`;

      const { url } = await buildGoogleAuthUrl({
        clientId: GOOGLE_CLIENT_ID,
        redirectUri,
      });

      // Redirect to Google OAuth
      window.location.href = url;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start OAuth';
      toast.error(message);
      setIsConnecting(false);
    }
  }, [t]);

  const handleDisconnect = useCallback(async () => {
    setIsDisconnecting(true);

    try {
      // Revoke token if possible
      const accessToken = await getGoogleAccessToken();
      if (accessToken) {
        await revokeGoogleToken(accessToken);
      }

      // Remove stored tokens
      await removeGoogleTokens();

      // Update config
      setGoogleDriveConfig({
        enabled: false,
        userEmail: undefined,
      });

      setIsConnected(false);
      setUserEmail(null);
      onConnectionStatusChange?.('unknown');

      toast.success(t('googleDisconnected') || 'Disconnected from Google Drive');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Disconnect failed';
      toast.error(message);
    } finally {
      setIsDisconnecting(false);
    }
  }, [t, setGoogleDriveConfig, onConnectionStatusChange]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <HardDrive className="h-4 w-4 text-muted-foreground" />
          {t('googleDriveConfig') || 'Google Drive Configuration'}
        </CardTitle>
        <CardDescription className="text-xs">
          {t('googleDriveConfigDesc') ||
            'Connect your Google account to sync data to Google Drive'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Status */}
        {isConnected ? (
          <div className="flex items-center justify-between rounded-md border bg-muted/50 p-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm font-medium">
                  {t('googleConnected') || 'Connected'}
                </p>
                {userEmail && (
                  <p className="text-xs text-muted-foreground">{userEmail}</p>
                )}
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDisconnect}
              disabled={isDisconnecting}
            >
              {isDisconnecting ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <LogOut className="mr-1.5 h-3.5 w-3.5" />
              )}
              {t('disconnect') || 'Disconnect'}
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between rounded-md border p-3">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm">{t('googleNotConnected') || 'Not connected'}</p>
            </div>
            <Button
              size="sm"
              onClick={handleConnect}
              disabled={isConnecting || !GOOGLE_CLIENT_ID}
            >
              {isConnecting ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              )}
              {t('connectGoogle') || 'Connect Google Account'}
            </Button>
          </div>
        )}

        {!GOOGLE_CLIENT_ID && (
          <p className="text-xs text-destructive">
            {t('googleClientIdMissing') ||
              'Google Client ID is not configured. Set NEXT_PUBLIC_GOOGLE_CLIENT_ID environment variable.'}
          </p>
        )}

        {/* Configuration Options (only when connected) */}
        {isConnected && (
          <>
            {/* Enable Sync */}
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="google-enabled" className="text-sm">
                  {t('enableSync') || 'Enable Sync'}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t('enableSyncDesc') || 'Automatically sync data to Google Drive'}
                </p>
              </div>
              <Switch
                id="google-enabled"
                checked={googleDriveConfig.enabled}
                onCheckedChange={(checked) =>
                  setGoogleDriveConfig({ enabled: checked })
                }
              />
            </div>

            {/* App Data Folder */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderLock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label htmlFor="google-appdata" className="text-sm">
                    {t('useAppDataFolder') || 'Use App Data Folder'}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t('useAppDataFolderDesc') ||
                      'Store backups in a hidden app-specific folder (recommended)'}
                  </p>
                </div>
              </div>
              <Switch
                id="google-appdata"
                checked={googleDriveConfig.useAppDataFolder}
                onCheckedChange={(checked) =>
                  setGoogleDriveConfig({ useAppDataFolder: checked })
                }
              />
            </div>

            {/* Folder Name (when not using app data folder) */}
            {!googleDriveConfig.useAppDataFolder && (
              <div className="space-y-2">
                <Label htmlFor="google-folder" className="text-sm">
                  {t('folderName') || 'Folder Name'}
                </Label>
                <Input
                  id="google-folder"
                  value={googleDriveConfig.folderName}
                  onChange={(e) =>
                    setGoogleDriveConfig({ folderName: e.target.value })
                  }
                  placeholder="cognia-backup"
                />
              </div>
            )}

            {/* Resumable Upload */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Upload className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label htmlFor="google-resumable" className="text-sm">
                    {t('resumableUpload') || 'Resumable Upload'}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t('resumableUploadDesc') ||
                      'Enable for large backups and unstable connections'}
                  </p>
                </div>
              </div>
              <Switch
                id="google-resumable"
                checked={googleDriveConfig.enableResumableUpload}
                onCheckedChange={(checked) =>
                  setGoogleDriveConfig({ enableResumableUpload: checked })
                }
              />
            </div>

            {/* Auto Sync */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label htmlFor="google-autosync" className="text-sm">
                    {t('autoSync') || 'Auto Sync'}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t('autoSyncDesc') || 'Automatically sync at regular intervals'}
                  </p>
                </div>
              </div>
              <Switch
                id="google-autosync"
                checked={googleDriveConfig.autoSync}
                onCheckedChange={(checked) =>
                  setGoogleDriveConfig({ autoSync: checked })
                }
              />
            </div>

            {/* Sync Interval (when auto sync is enabled) */}
            {googleDriveConfig.autoSync && (
              <div className="space-y-2">
                <Label htmlFor="google-interval" className="text-sm">
                  {t('syncInterval') || 'Sync Interval (minutes)'}
                </Label>
                <Input
                  id="google-interval"
                  type="number"
                  min={5}
                  max={1440}
                  value={googleDriveConfig.syncInterval}
                  onChange={(e) =>
                    setGoogleDriveConfig({
                      syncInterval: parseInt(e.target.value, 10) || 30,
                    })
                  }
                />
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default GoogleDriveConfigForm;
