'use client';

/**
 * GitHubConfigForm - Configuration form for GitHub sync
 */

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Github,
  Eye,
  EyeOff,
  Save,
  Loader2,
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
  storeGitHubToken,
  getGitHubToken,
  getSyncManager,
} from '@/lib/sync';
import type { ConflictResolution } from '@/types/sync';

interface GitHubConfigFormProps {
  onConnectionStatusChange?: (status: 'unknown' | 'success' | 'error') => void;
}

export function GitHubConfigForm({ onConnectionStatusChange }: GitHubConfigFormProps) {
  const t = useTranslations('syncSettings');

  const { githubConfig, setGitHubConfig } = useSyncStore();

  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasToken, setHasToken] = useState(false);

  // Check for existing token on mount
  useState(() => {
    getGitHubToken().then((t) => {
      setHasToken(!!t);
    });
  });

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    
    try {
      // Store token if provided
      if (token) {
        await storeGitHubToken(token);
        setHasToken(true);
        setToken('');
      }

      // Initialize provider
      const manager = getSyncManager();
      const savedToken = token || await getGitHubToken();
      
      if (savedToken) {
        await manager.initGitHub(savedToken);
        
        // Test connection
        const result = await manager.testConnection();
        onConnectionStatusChange?.(result.success ? 'success' : 'error');
        
        if (result.success) {
          toast.success(t('configSaved') || 'Configuration saved');
        } else {
          toast.error(result.error || t('connectionFailed') || 'Connection failed');
        }
      } else {
        toast.error(t('tokenRequired') || 'GitHub token is required');
      }
    } catch (_error) {
      toast.error(t('saveFailed') || 'Failed to save configuration');
      onConnectionStatusChange?.('error');
    } finally {
      setIsSaving(false);
    }
  }, [token, onConnectionStatusChange, t]);

  const openGitHubTokenPage = () => {
    window.open('https://github.com/settings/tokens/new?scopes=repo,gist&description=Cognia%20Sync', '_blank');
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Github className="h-4 w-4 text-muted-foreground" />
          {t('githubConfig') || 'GitHub Configuration'}
        </CardTitle>
        <CardDescription className="text-xs">
          {t('githubConfigDesc') || 'Configure GitHub repository or Gist sync'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Enable Switch */}
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm">{t('enabled') || 'Enable Sync'}</Label>
            <p className="text-xs text-muted-foreground">
              {t('enabledDescGithub') || 'Enable GitHub synchronization'}
            </p>
          </div>
          <Switch
            checked={githubConfig.enabled}
            onCheckedChange={(enabled) => setGitHubConfig({ enabled })}
          />
        </div>

        {/* Personal Access Token */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="github-token" className="text-sm">
              {t('personalAccessToken') || 'Personal Access Token'}
            </Label>
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs"
              onClick={openGitHubTokenPage}
            >
              {t('createToken') || 'Create Token'}
              <ExternalLink className="ml-1 h-3 w-3" />
            </Button>
          </div>
          <div className="relative">
            <Input
              id="github-token"
              type={showToken ? 'text' : 'password'}
              placeholder={hasToken ? '••••••••' : 'ghp_xxxxxxxxxxxx'}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full px-3"
              onClick={() => setShowToken(!showToken)}
            >
              {showToken ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('tokenScope') || 'Token needs "repo" and "gist" scopes'}
          </p>
        </div>

        {/* Gist Mode Switch */}
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm">{t('gistMode') || 'Use Gist'}</Label>
            <p className="text-xs text-muted-foreground">
              {t('gistModeDesc') || 'Use GitHub Gist instead of repository'}
            </p>
          </div>
          <Switch
            checked={githubConfig.gistMode}
            onCheckedChange={(gistMode) => setGitHubConfig({ gistMode })}
          />
        </div>

        {/* Repository Settings (when not using Gist) */}
        {!githubConfig.gistMode && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="github-owner" className="text-sm">
                  {t('repoOwner') || 'Repository Owner'}
                </Label>
                <Input
                  id="github-owner"
                  placeholder="your-username"
                  value={githubConfig.repoOwner}
                  onChange={(e) => setGitHubConfig({ repoOwner: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="github-repo" className="text-sm">
                  {t('repoName') || 'Repository Name'}
                </Label>
                <Input
                  id="github-repo"
                  placeholder="cognia-sync"
                  value={githubConfig.repoName}
                  onChange={(e) => setGitHubConfig({ repoName: e.target.value })}
                />
              </div>
            </div>

            {/* Branch */}
            <div className="space-y-2">
              <Label htmlFor="github-branch" className="text-sm">
                {t('branch') || 'Branch'}
              </Label>
              <Input
                id="github-branch"
                placeholder="main"
                value={githubConfig.branch}
                onChange={(e) => setGitHubConfig({ branch: e.target.value })}
              />
            </div>

            {/* Create Private Repo */}
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">{t('createPrivateRepo') || 'Create Private Repo'}</Label>
                <p className="text-xs text-muted-foreground">
                  {t('createPrivateRepoDesc') || 'Auto-create private repo if not exists'}
                </p>
              </div>
              <Switch
                checked={githubConfig.createPrivateRepo}
                onCheckedChange={(createPrivateRepo) => setGitHubConfig({ createPrivateRepo })}
              />
            </div>
          </>
        )}

        {/* Gist ID (when using Gist) */}
        {githubConfig.gistMode && (
          <div className="space-y-2">
            <Label htmlFor="github-gist" className="text-sm">
              {t('gistId') || 'Gist ID'} ({t('optional') || 'optional'})
            </Label>
            <Input
              id="github-gist"
              placeholder="Leave empty to create new"
              value={githubConfig.gistId || ''}
              onChange={(e) => setGitHubConfig({ gistId: e.target.value || undefined })}
            />
            <p className="text-xs text-muted-foreground">
              {t('gistIdDesc') || 'Leave empty to create a new Gist on first sync'}
            </p>
          </div>
        )}

        {/* Remote Path */}
        <div className="space-y-2">
          <Label htmlFor="github-path" className="text-sm">
            {t('remotePath') || 'Remote Path'}
          </Label>
          <Input
            id="github-path"
            placeholder="backup/"
            value={githubConfig.remotePath}
            onChange={(e) => setGitHubConfig({ remotePath: e.target.value })}
          />
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
            checked={githubConfig.autoSync}
            onCheckedChange={(autoSync) => setGitHubConfig({ autoSync })}
          />
        </div>

        {/* Sync Interval */}
        {githubConfig.autoSync && (
          <div className="space-y-2">
            <Label className="text-sm">
              {t('syncInterval') || 'Sync Interval'}: {githubConfig.syncInterval} {t('minutes') || 'minutes'}
            </Label>
            <Slider
              value={[githubConfig.syncInterval]}
              onValueChange={([value]) => setGitHubConfig({ syncInterval: value })}
              min={15}
              max={240}
              step={15}
            />
          </div>
        )}

        {/* Conflict Resolution */}
        <div className="space-y-2">
          <Label className="text-sm">{t('conflictResolution') || 'Conflict Resolution'}</Label>
          <Select
            value={githubConfig.conflictResolution}
            onValueChange={(value) => setGitHubConfig({ conflictResolution: value as ConflictResolution })}
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
              checked={githubConfig.syncOnStartup}
              onCheckedChange={(syncOnStartup) => setGitHubConfig({ syncOnStartup })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm">{t('syncOnExit') || 'Sync on Exit'}</Label>
            <Switch
              checked={githubConfig.syncOnExit}
              onCheckedChange={(syncOnExit) => setGitHubConfig({ syncOnExit })}
            />
          </div>
        </div>

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
