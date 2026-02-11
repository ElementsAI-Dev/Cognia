'use client';

/**
 * ProjectGitPanel - Git integration panel for projects
 */

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  GitBranch,
  GitCommit,
  FolderGit2,
  RefreshCw,
  Download,
  Upload,
  Check,
  X,
  AlertCircle,
  Loader2,
  Plus,
  History,
  Cloud,
  CloudOff,
  FolderOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useGit } from '@/hooks/native/use-git';
import { formatCommitDate, formatCommitMessage } from '@/types/system/git';
import { isTauri } from '@/lib/utils';
import { GitignoreTemplateSelector } from '@/components/git/gitignore-template-selector';

interface ProjectGitPanelProps {
  projectId: string;
}

export function ProjectGitPanel({ projectId }: ProjectGitPanelProps) {
  const t = useTranslations('projectGit');
  const tCommon = useTranslations('common');

  const {
    isInstalled,
    currentRepo,
    commits,
    fileStatus,
    isOperating,
    error,
    checkGitInstalled,
    refreshStatus,
    stageAll,
    commit,
    push,
    pull,
    fetch,
    clearError,
    projectConfig,
    enableGitForProject,
    disableGitForProject,
    updateProjectConfig,
  } = useGit({
    projectId,
    autoCheck: true,
    autoLoadStatus: true,
    repoPath: undefined,
  });

  const [showInitDialog, setShowInitDialog] = useState(false);
  const [showCommitDialog, setShowCommitDialog] = useState(false);
  const [repoPath, setRepoPath] = useState('');
  const [commitMessage, setCommitMessage] = useState('');
  const [isInitializing, setIsInitializing] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [gitignoreContent, setGitignoreContent] = useState('');

  // Load repo path from project config
  useEffect(() => {
    if (projectConfig?.repoPath) {
      setRepoPath(projectConfig.repoPath);
    }
  }, [projectConfig?.repoPath]);

  const handleInitRepo = async () => {
    if (!repoPath.trim()) return;

    setIsInitializing(true);
    try {
      const success = await enableGitForProject(repoPath);
      if (success) {
        setShowInitDialog(false);
        await refreshStatus();
      }
    } finally {
      setIsInitializing(false);
    }
  };

  const handleCommit = async () => {
    if (!commitMessage.trim()) return;

    setIsCommitting(true);
    try {
      await stageAll();
      const success = await commit(commitMessage);
      if (success) {
        setCommitMessage('');
        setShowCommitDialog(false);
        await refreshStatus();
      }
    } finally {
      setIsCommitting(false);
    }
  };

  const handleDisableGit = () => {
    disableGitForProject();
  };

  // Not installed state
  if (!isInstalled) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <GitBranch className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-medium mb-2">{t('notInstalled.title')}</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {t('notInstalled.description')}
          </p>
          <Button variant="outline" onClick={checkGitInstalled}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('checkAgain')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Not configured state
  if (!projectConfig?.enabled || !projectConfig?.repoPath) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <FolderGit2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-medium mb-2">{t('notConfigured.title')}</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {t('notConfigured.description')}
          </p>
          <Dialog open={showInitDialog} onOpenChange={setShowInitDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                {t('enableGit')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('initDialog.title')}</DialogTitle>
                <DialogDescription>{t('initDialog.description')}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="repoPath">{t('initDialog.repoPath')}</Label>
                  <div className="flex gap-2">
                    <Input
                      id="repoPath"
                      value={repoPath}
                      onChange={(e) => setRepoPath(e.target.value)}
                      placeholder={t('initDialog.repoPathPlaceholder')}
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={async () => {
                        if (!isTauri()) return;
                        try {
                          const { open } = await import('@tauri-apps/plugin-dialog');
                          const selected = await open({ directory: true, multiple: false });
                          if (selected && typeof selected === 'string') {
                            setRepoPath(selected);
                          }
                        } catch {
                          // Dialog cancelled or not available
                        }
                      }}
                    >
                      <FolderOpen className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t('initDialog.repoPathHint')}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>{t('initDialog.gitignore') ?? '.gitignore Template'}</Label>
                  <div className="flex items-center gap-2">
                    <GitignoreTemplateSelector
                      onSelect={setGitignoreContent}
                    />
                    {gitignoreContent && (
                      <Badge variant="secondary" className="text-xs">
                        <Check className="h-3 w-3 mr-1" />
                        {t('initDialog.gitignoreSelected') ?? 'Template selected'}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowInitDialog(false)}>
                  {tCommon('cancel')}
                </Button>
                <Button onClick={handleInitRepo} disabled={!repoPath.trim() || isInitializing}>
                  {isInitializing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <GitBranch className="h-4 w-4 mr-2" />
                  )}
                  {t('initDialog.initialize')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button size="sm" variant="ghost" onClick={clearError}>
              {tCommon('dismiss')}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Repository Status */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <FolderGit2 className="h-4 w-4" />
                {t('repoStatus.title')}
              </CardTitle>
              <CardDescription className="truncate max-w-[250px]">
                {projectConfig.repoPath}
              </CardDescription>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={refreshStatus}
              disabled={isOperating}
            >
              {isOperating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {currentRepo ? (
            <>
              {/* Branch & Status */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="flex items-center gap-1">
                  <GitBranch className="h-3 w-3" />
                  {currentRepo.branch || t('status.detached')}
                </Badge>
                <Badge
                  variant={currentRepo.status === 'clean' ? 'default' : 'secondary'}
                  className={
                    currentRepo.status === 'clean'
                      ? 'bg-green-500'
                      : currentRepo.status === 'dirty'
                      ? 'bg-yellow-500'
                      : ''
                  }
                >
                  {currentRepo.status === 'clean' ? t('status.clean') : t('status.dirty')}
                </Badge>
                {currentRepo.remoteUrl ? (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Cloud className="h-3 w-3" />
                    {t('hasRemote')}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="flex items-center gap-1 text-muted-foreground">
                    <CloudOff className="h-3 w-3" />
                    {t('localOnly')}
                  </Badge>
                )}
              </div>

              {/* Ahead/Behind */}
              {(currentRepo.ahead > 0 || currentRepo.behind > 0) && (
                <div className="flex items-center gap-2 text-sm">
                  {currentRepo.ahead > 0 && (
                    <span className="text-blue-600">↑ {currentRepo.ahead}</span>
                  )}
                  {currentRepo.behind > 0 && (
                    <span className="text-orange-600">↓ {currentRepo.behind}</span>
                  )}
                </div>
              )}

              {/* Last Commit */}
              {currentRepo.lastCommit && (
                <div className="flex items-start gap-2 p-2 rounded-md bg-muted/50">
                  <GitCommit className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">
                      {formatCommitMessage(currentRepo.lastCommit)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {currentRepo.lastCommit.author} • {formatCommitDate(currentRepo.lastCommit.date)}
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              <Loader2 className="h-6 w-6 mx-auto mb-2 animate-spin" />
              <p className="text-sm">{t('loadingStatus')}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t('quickActions.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {/* Commit Dialog */}
            <Dialog open={showCommitDialog} onOpenChange={setShowCommitDialog}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      disabled={!currentRepo?.hasUncommittedChanges && !currentRepo?.hasUntrackedFiles}
                    >
                      <GitCommit className="h-4 w-4 mr-2" />
                      {t('quickActions.commit')}
                    </Button>
                  </DialogTrigger>
                </TooltipTrigger>
                <TooltipContent>{t('quickActions.commitTooltip')}</TooltipContent>
              </Tooltip>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('commitDialog.title')}</DialogTitle>
                  <DialogDescription>{t('commitDialog.description')}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {fileStatus.length > 0 && (
                    <div className="space-y-2">
                      <Label>{t('commitDialog.changes')}</Label>
                      <ScrollArea className="h-32 rounded-md border p-2">
                        {fileStatus.map((file, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm py-1">
                            <Badge
                              variant="outline"
                              className={
                                file.status === 'added'
                                  ? 'text-green-600'
                                  : file.status === 'deleted'
                                  ? 'text-red-600'
                                  : 'text-yellow-600'
                              }
                            >
                              {file.status.charAt(0).toUpperCase()}
                            </Badge>
                            <span className="truncate">{file.path}</span>
                          </div>
                        ))}
                      </ScrollArea>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="commitMessage">{t('commitDialog.message')}</Label>
                    <Textarea
                      id="commitMessage"
                      value={commitMessage}
                      onChange={(e) => setCommitMessage(e.target.value)}
                      placeholder={t('commitDialog.messagePlaceholder')}
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowCommitDialog(false)}>
                    {tCommon('cancel')}
                  </Button>
                  <Button onClick={handleCommit} disabled={!commitMessage.trim() || isCommitting}>
                    {isCommitting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    {t('commitDialog.commit')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => push()}
                  disabled={isOperating || !currentRepo?.remoteUrl || currentRepo?.ahead === 0}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {t('quickActions.push')}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('quickActions.pushTooltip')}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => pull()}
                  disabled={isOperating || !currentRepo?.remoteUrl}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {t('quickActions.pull')}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('quickActions.pullTooltip')}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => fetch()}
                  disabled={isOperating || !currentRepo?.remoteUrl}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {t('quickActions.fetch')}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('quickActions.fetchTooltip')}</TooltipContent>
            </Tooltip>
          </div>
        </CardContent>
      </Card>

      {/* Recent Commits */}
      {commits.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4" />
              {t('recentCommits.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {commits.slice(0, 10).map((c, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 p-2 rounded-md hover:bg-muted/50"
                  >
                    <GitCommit className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{formatCommitMessage(c)}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.shortHash} • {c.author} • {formatCommitDate(c.date)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t('settings.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>{t('settings.autoCommit')}</Label>
              <p className="text-xs text-muted-foreground">
                {t('settings.autoCommitDescription')}
              </p>
            </div>
            <Switch
              checked={projectConfig.autoCommit}
              onCheckedChange={(autoCommit) => updateProjectConfig({ autoCommit })}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label>{t('settings.commitOnSessionEnd')}</Label>
              <p className="text-xs text-muted-foreground">
                {t('settings.commitOnSessionEndDescription')}
              </p>
            </div>
            <Switch
              checked={projectConfig.commitOnSessionEnd}
              onCheckedChange={(commitOnSessionEnd) => updateProjectConfig({ commitOnSessionEnd })}
            />
          </div>

          <Separator />

          <Button
            variant="outline"
            size="sm"
            className="text-destructive"
            onClick={handleDisableGit}
          >
            <X className="h-4 w-4 mr-2" />
            {t('settings.disableGit')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default ProjectGitPanel;
