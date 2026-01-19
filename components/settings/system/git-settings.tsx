'use client';

/**
 * Git Settings - Configure Git integration for version control
 */

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  GitBranch,
  GitCommit,
  Download,
  RefreshCw,
  ExternalLink,
  Check,
  X,
  AlertCircle,
  Loader2,
  Settings2,
  FolderGit2,
  User,
  Mail,
  Save,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useGit } from '@/hooks/native/use-git';
import { useGitStore } from '@/stores/git';
import { gitService } from '@/lib/native/git';
import type { GitConfig } from '@/types/system/git';

export function GitSettings() {
  const t = useTranslations('settings.git');
  const tCommon = useTranslations('common');

  const {
    gitStatus,
    isInstalled,
    isCheckingGit,
    isInstallingGit,
    error,
    checkGitInstalled,
    installGit,
    openGitWebsite,
    clearError,
  } = useGit({ autoCheck: true });

  const autoCommitConfig = useGitStore((state) => state.autoCommitConfig);
  const setAutoCommitConfig = useGitStore((state) => state.setAutoCommitConfig);
  const trackedRepos = useGitStore((state) => state.trackedRepos);

  const [gitConfig, setGitConfig] = useState<GitConfig | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);

  // Local form state
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [defaultBranch, setDefaultBranch] = useState('main');

  // Load Git config when installed
  useEffect(() => {
    if (isInstalled) {
      loadGitConfig();
    }
  }, [isInstalled]);

  const loadGitConfig = async () => {
    setIsLoadingConfig(true);
    setConfigError(null);
    try {
      const config = await gitService.getConfig();
      setGitConfig(config);
      setUserName(config.userName || '');
      setUserEmail(config.userEmail || '');
      setDefaultBranch(config.defaultBranch || 'main');
    } catch (err) {
      setConfigError(err instanceof Error ? err.message : 'Failed to load config');
    } finally {
      setIsLoadingConfig(false);
    }
  };

  const saveGitConfig = async () => {
    setIsSavingConfig(true);
    setConfigError(null);
    try {
      await gitService.setConfig({
        userName: userName || null,
        userEmail: userEmail || null,
        defaultBranch: defaultBranch || null,
        editor: gitConfig?.editor || null,
      });
      await loadGitConfig();
    } catch (err) {
      setConfigError(err instanceof Error ? err.message : 'Failed to save config');
    } finally {
      setIsSavingConfig(false);
    }
  };

  const hasConfigChanges =
    gitConfig &&
    (userName !== (gitConfig.userName || '') ||
      userEmail !== (gitConfig.userEmail || '') ||
      defaultBranch !== (gitConfig.defaultBranch || 'main'));

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {(error || configError) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{error || configError}</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                clearError();
                setConfigError(null);
              }}
            >
              {tCommon('dismiss')}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Installation Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="h-5 w-5" />
                {t('installation.title')}
              </CardTitle>
              <CardDescription>{t('installation.description')}</CardDescription>
            </div>
            <Button size="sm" variant="ghost" onClick={checkGitInstalled} disabled={isCheckingGit}>
              {isCheckingGit ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isCheckingGit ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          ) : isInstalled ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span className="font-medium">{t('installation.installed')}</span>
                <Badge variant="secondary">{gitStatus.version}</Badge>
              </div>
              {gitStatus.path && (
                <p className="text-sm text-muted-foreground truncate">{gitStatus.path}</p>
              )}
              {gitStatus.lastChecked && (
                <p className="text-xs text-muted-foreground">
                  {t('installation.lastChecked')}:{' '}
                  {new Date(gitStatus.lastChecked).toLocaleString()}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-amber-600">
                <X className="h-4 w-4" />
                <span>{t('installation.notInstalled')}</span>
              </div>
              <p className="text-sm text-muted-foreground">{t('installation.installPrompt')}</p>
              <div className="flex gap-2">
                <Button size="sm" onClick={installGit} disabled={isInstallingGit}>
                  {isInstallingGit ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t('installation.installing')}
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      {t('installation.install')}
                    </>
                  )}
                </Button>
                <Button size="sm" variant="outline" onClick={openGitWebsite}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  {t('installation.website')}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Git Configuration */}
      {isInstalled && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              {t('config.title')}
            </CardTitle>
            <CardDescription>{t('config.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingConfig ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="userName" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {t('config.userName')}
                    </Label>
                    <Input
                      id="userName"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder={t('config.userNamePlaceholder')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="userEmail" className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {t('config.userEmail')}
                    </Label>
                    <Input
                      id="userEmail"
                      type="email"
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      placeholder={t('config.userEmailPlaceholder')}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="defaultBranch" className="flex items-center gap-2">
                    <GitBranch className="h-4 w-4" />
                    {t('config.defaultBranch')}
                  </Label>
                  <Select value={defaultBranch} onValueChange={setDefaultBranch}>
                    <SelectTrigger className="w-full md:w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="main">main</SelectItem>
                      <SelectItem value="master">master</SelectItem>
                      <SelectItem value="develop">develop</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {hasConfigChanges && (
                  <Button onClick={saveGitConfig} disabled={isSavingConfig}>
                    {isSavingConfig ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    {t('config.save')}
                  </Button>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Auto-Commit Settings */}
      {isInstalled && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitCommit className="h-5 w-5" />
              {t('autoCommit.title')}
            </CardTitle>
            <CardDescription>{t('autoCommit.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t('autoCommit.enable')}</Label>
                <p className="text-sm text-muted-foreground">{t('autoCommit.enableDescription')}</p>
              </div>
              <Switch
                checked={autoCommitConfig.enabled}
                onCheckedChange={(enabled) => setAutoCommitConfig({ enabled })}
              />
            </div>

            <Separator />

            <div className="space-y-3">
              <Label>{t('autoCommit.triggers')}</Label>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">{t('autoCommit.onSessionEnd')}</span>
                  <Switch
                    checked={autoCommitConfig.triggers.includes('session_end')}
                    onCheckedChange={(checked) => {
                      const triggers = checked
                        ? [...autoCommitConfig.triggers, 'session_end']
                        : autoCommitConfig.triggers.filter((t) => t !== 'session_end');
                      setAutoCommitConfig({
                        triggers: triggers as typeof autoCommitConfig.triggers,
                      });
                    }}
                    disabled={!autoCommitConfig.enabled}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">{t('autoCommit.onExport')}</span>
                  <Switch
                    checked={autoCommitConfig.triggers.includes('export')}
                    onCheckedChange={(checked) => {
                      const triggers = checked
                        ? [...autoCommitConfig.triggers, 'export']
                        : autoCommitConfig.triggers.filter((t) => t !== 'export');
                      setAutoCommitConfig({
                        triggers: triggers as typeof autoCommitConfig.triggers,
                      });
                    }}
                    disabled={!autoCommitConfig.enabled}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">{t('autoCommit.onInterval')}</span>
                  <Switch
                    checked={autoCommitConfig.triggers.includes('interval')}
                    onCheckedChange={(checked) => {
                      const triggers = checked
                        ? [...autoCommitConfig.triggers, 'interval']
                        : autoCommitConfig.triggers.filter((t) => t !== 'interval');
                      setAutoCommitConfig({
                        triggers: triggers as typeof autoCommitConfig.triggers,
                      });
                    }}
                    disabled={!autoCommitConfig.enabled}
                  />
                </div>
              </div>
            </div>

            {autoCommitConfig.triggers.includes('interval') && (
              <div className="space-y-2">
                <Label>{t('autoCommit.intervalMinutes')}</Label>
                <Select
                  value={String(autoCommitConfig.intervalMinutes)}
                  onValueChange={(v) => setAutoCommitConfig({ intervalMinutes: Number(v) })}
                  disabled={!autoCommitConfig.enabled}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 min</SelectItem>
                    <SelectItem value="15">15 min</SelectItem>
                    <SelectItem value="30">30 min</SelectItem>
                    <SelectItem value="60">60 min</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tracked Repositories */}
      {isInstalled && trackedRepos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderGit2 className="h-5 w-5" />
              {t('trackedRepos.title')}
            </CardTitle>
            <CardDescription>
              {t('trackedRepos.description', { count: trackedRepos.length })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {trackedRepos.map((repo, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                  <FolderGit2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm truncate flex-1">{repo}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default GitSettings;
