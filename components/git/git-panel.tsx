'use client';

/**
 * Git Panel - Main sidebar panel integrating all Git features
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  GitBranch,
  GitCommit,
  History,
  Archive,
  FileText,
  RefreshCw,
  Loader2,
  AlertCircle,
  Check,
  X,
  Cloud,
  CloudOff,
  Upload,
  Download,
  FolderGit2,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useGit } from '@/hooks/native/use-git';
import { GitBranchManager } from './git-branch-manager';
import { GitCommitHistory } from './git-commit-history';
import { GitDiffViewer } from './git-diff-viewer';
import { GitFileTree } from './git-file-tree';
import { GitStashPanel } from './git-stash-panel';
import { formatCommitDate, formatCommitMessage, type GitCommitInfo } from '@/types/system/git';
import { cn } from '@/lib/utils';

interface GitPanelProps {
  repoPath?: string;
  projectId?: string;
  className?: string;
}

export function GitPanel({ repoPath, projectId, className }: GitPanelProps) {
  const t = useTranslations('git');
  const tCommon = useTranslations('common');

  const {
    isDesktopAvailable,
    isInstalled,
    isCheckingGit,
    currentRepo,
    branches,
    commits,
    fileStatus,
    stashList,
    isOperating,
    error,
    installGit,
    openGitWebsite,
    refreshStatus,
    stageAll,
    stage,
    unstage,
    commit,
    push,
    pull,
    createBranch,
    deleteBranch,
    checkout,
    discardChanges,
    stashSave,
    stashPop,
    stashApply,
    stashDrop,
    stashClear,
    mergeBranch,
    getDiffBetween,
    clearError,
  } = useGit({
    repoPath,
    projectId,
    autoCheck: true,
    autoLoadStatus: true,
  });

  const [activeTab, setActiveTab] = useState('changes');
  const [showCommitDialog, setShowCommitDialog] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');
  const [isCommitting, setIsCommitting] = useState(false);
  const [showDiffView, setShowDiffView] = useState(false);
  const [currentDiffs, setCurrentDiffs] = useState<import('@/types/system/git').GitDiffInfo[]>([]);
  const [isLoadingDiffs, setIsLoadingDiffs] = useState(false);

  // Load diffs for the Changes tab
  const loadDiffs = useCallback(async (staged?: boolean) => {
    if (!repoPath) return;
    setIsLoadingDiffs(true);
    try {
      const diffs = await getDiffBetween('HEAD', staged ? '--staged' : '');
      setCurrentDiffs(diffs || []);
      setShowDiffView(true);
    } catch (error) {
      console.error('Failed to load diffs:', error);
    } finally {
      setIsLoadingDiffs(false);
    }
  }, [repoPath, getDiffBetween]);
  
  // Refresh status periodically
  useEffect(() => {
    if (isInstalled && repoPath) {
      const interval = setInterval(refreshStatus, 60000);
      return () => clearInterval(interval);
    }
  }, [isInstalled, repoPath, refreshStatus]);

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

  const handleStageFiles = useCallback(async (files: string[]) => {
    return stage(files);
  }, [stage]);

  const handleUnstageFiles = useCallback(async (files: string[]) => {
    return unstage(files);
  }, [unstage]);

  const handleDiscardFiles = useCallback(async (files: string[]) => {
    return discardChanges(files);
  }, [discardChanges]);

  const handleCheckout = useCallback(async (target: string, createNew?: boolean) => {
    return checkout(target, createNew);
  }, [checkout]);

  const handleCreateBranch = useCallback(async (name: string, startPoint?: string) => {
    return createBranch(name, startPoint);
  }, [createBranch]);

  const handleDeleteBranch = useCallback(async (name: string, force?: boolean) => {
    return deleteBranch(name, force);
  }, [deleteBranch]);

  const handleMergeBranch = useCallback(async (branch: string) => {
    return mergeBranch(branch);
  }, [mergeBranch]);

  const handleViewCommitDiff = useCallback(async (commit: GitCommitInfo) => {
    const diffs = await getDiffBetween(`${commit.hash}^`, commit.hash);
    return diffs || [];
  }, [getDiffBetween]);

  const handleCheckoutCommit = useCallback(async (commitHash: string) => {
    return checkout(commitHash);
  }, [checkout]);

  const handleRevertCommit = useCallback(async (commitHash: string) => {
    // Revert is essentially creating a new commit that undoes the changes
    // For now, we checkout the parent commit's state for that file
    // A proper revert would need backend support
    return checkout(commitHash);
  }, [checkout]);

  const loadBranches = useCallback(async () => {
    await refreshStatus();
  }, [refreshStatus]);

  // Desktop not available (web mode)
  if (!isDesktopAvailable) {
    return (
      <div className={cn('p-4', className)}>
        <div className="text-center py-8">
          <GitBranch className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-medium mb-2">{t('desktopRequired.title')}</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {t('desktopRequired.description')}
          </p>
          <Button variant="outline" onClick={openGitWebsite}>
            <ExternalLink className="h-4 w-4 mr-2" />
            {t('desktopRequired.learnMore')}
          </Button>
        </div>
      </div>
    );
  }

  // Not installed state
  if (!isInstalled && !isCheckingGit) {
    return (
      <div className={cn('p-4', className)}>
        <div className="text-center py-8">
          <GitBranch className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-medium mb-2">{t('notInstalled.title')}</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {t('notInstalled.description')}
          </p>
          <div className="flex justify-center gap-2">
            <Button onClick={installGit}>
              <Download className="h-4 w-4 mr-2" />
              {t('notInstalled.install')}
            </Button>
            <Button variant="outline" onClick={openGitWebsite}>
              {t('notInstalled.website')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Checking state
  if (isCheckingGit) {
    return (
      <div className={cn('p-4', className)}>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span className="text-muted-foreground">{t('checking')}</span>
        </div>
      </div>
    );
  }

  // No repo selected
  if (!currentRepo && repoPath) {
    return (
      <div className={cn('p-4', className)}>
        <div className="text-center py-8">
          <FolderGit2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-medium mb-2">{t('noRepo.title')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('noRepo.description')}
          </p>
        </div>
      </div>
    );
  }

  const hasChanges = fileStatus.length > 0;
  const stagedCount = fileStatus.filter(f => f.staged).length;
  const unstagedCount = fileStatus.filter(f => !f.staged).length;

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="m-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span className="text-xs">{error}</span>
            <Button size="sm" variant="ghost" onClick={clearError} className="h-6 w-6 p-0">
              <X className="h-3 w-3" />
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Repository Header */}
      <div className="p-3 border-b">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <FolderGit2 className="h-4 w-4 shrink-0" />
            <span className="font-medium text-sm truncate">
              {currentRepo?.path?.split(/[\/]/).pop() || t('repository')}
            </span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={refreshStatus}
            disabled={isOperating}
            className="h-7 w-7 p-0"
          >
            {isOperating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Branch & Status */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="flex items-center gap-1">
            <GitBranch className="h-3 w-3" />
            {currentRepo?.branch || t('status.detached')}
          </Badge>
          <Badge
            variant={currentRepo?.status === 'clean' ? 'default' : 'secondary'}
            className={cn(
              currentRepo?.status === 'clean' && 'bg-green-500',
              currentRepo?.status === 'dirty' && 'bg-yellow-500'
            )}
          >
            {currentRepo?.status === 'clean' ? t('status.clean') : t('status.dirty')}
          </Badge>
          {currentRepo?.remoteUrl ? (
            <Cloud className="h-3 w-3 text-muted-foreground" />
          ) : (
            <CloudOff className="h-3 w-3 text-muted-foreground" />
          )}
        </div>

        {/* Ahead/Behind */}
        {(currentRepo?.ahead ?? 0) > 0 || (currentRepo?.behind ?? 0) > 0 ? (
          <div className="flex items-center gap-2 text-xs mt-1">
            {(currentRepo?.ahead ?? 0) > 0 && (
              <span className="text-blue-600">↑ {currentRepo?.ahead}</span>
            )}
            {(currentRepo?.behind ?? 0) > 0 && (
              <span className="text-orange-600">↓ {currentRepo?.behind}</span>
            )}
          </div>
        ) : null}

        {/* Quick Actions */}
        <div className="flex items-center gap-1 mt-2">
          <Button
            size="sm"
            variant="default"
            className="h-7 text-xs flex-1"
            onClick={() => setShowCommitDialog(true)}
            disabled={!hasChanges}
          >
            <GitCommit className="h-3 w-3 mr-1" />
            {t('actions.commit')}
            {stagedCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-4 text-xs">
                {stagedCount}
              </Badge>
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 w-7 p-0"
            onClick={() => push()}
            disabled={isOperating || !currentRepo?.remoteUrl || (currentRepo?.ahead ?? 0) === 0}
            title={t('actions.push')}
          >
            <Upload className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 w-7 p-0"
            onClick={() => pull()}
            disabled={isOperating || !currentRepo?.remoteUrl}
            title={t('actions.pull')}
          >
            <Download className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Tabs Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid grid-cols-4 mx-2 mt-2">
          <TabsTrigger value="changes" className="text-xs">
            <FileText className="h-3 w-3 mr-1" />
            {t('tabs.changes')}
            {hasChanges && (
              <Badge variant="secondary" className="ml-1 h-4 text-xs">
                {fileStatus.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="branches" className="text-xs">
            <GitBranch className="h-3 w-3 mr-1" />
            {t('tabs.branches')}
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs">
            <History className="h-3 w-3 mr-1" />
            {t('tabs.history')}
          </TabsTrigger>
          <TabsTrigger value="stash" className="text-xs">
            <Archive className="h-3 w-3 mr-1" />
            {t('tabs.stash')}
            {stashList.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-4 text-xs">
                {stashList.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          <TabsContent value="changes" className="p-2 m-0 space-y-3">
            <GitFileTree
              files={fileStatus}
              isLoading={isOperating}
              onStageFiles={handleStageFiles}
              onUnstageFiles={handleUnstageFiles}
              onDiscardFiles={handleDiscardFiles}
              onRefresh={refreshStatus}
            />
            
            {/* Diff Preview Toggle */}
            {fileStatus.length > 0 && (
              <div className="border-t pt-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    if (showDiffView) {
                      setShowDiffView(false);
                    } else {
                      loadDiffs();
                    }
                  }}
                  disabled={isLoadingDiffs}
                >
                  {isLoadingDiffs ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4 mr-2" />
                  )}
                  {showDiffView ? t('diff.collapseAll') : t('diff.expandAll')}
                </Button>
                
                {showDiffView && currentDiffs.length > 0 && (
                  <div className="mt-3">
                    <GitDiffViewer
                      diffs={currentDiffs}
                      fileStatus={fileStatus}
                      onStageFile={(path) => handleStageFiles([path])}
                      onUnstageFile={(path) => handleUnstageFiles([path])}
                      onDiscardFile={(path) => handleDiscardFiles([path])}
                    />
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="branches" className="p-2 m-0">
            <GitBranchManager
              branches={branches}
              currentBranch={currentRepo?.branch || undefined}
              isLoading={isOperating}
              onCheckout={handleCheckout}
              onCreateBranch={handleCreateBranch}
              onDeleteBranch={handleDeleteBranch}
              onMergeBranch={handleMergeBranch}
              onRefresh={loadBranches}
            />
          </TabsContent>

          <TabsContent value="history" className="p-2 m-0">
            <GitCommitHistory
              commits={commits}
              currentBranch={currentRepo?.branch || undefined}
              isLoading={isOperating}
              onRefresh={refreshStatus}
              onViewDiff={handleViewCommitDiff}
              onCheckout={handleCheckoutCommit}
              onRevert={handleRevertCommit}
            />
          </TabsContent>

          <TabsContent value="stash" className="p-2 m-0">
            <GitStashPanel
              stashes={stashList}
              isLoading={isOperating}
              onStashSave={stashSave}
              onStashPop={stashPop}
              onStashApply={stashApply}
              onStashDrop={stashDrop}
              onStashClear={stashClear}
              onRefresh={refreshStatus}
            />
          </TabsContent>
        </ScrollArea>
      </Tabs>

      {/* Last Commit Info */}
      {currentRepo?.lastCommit && (
        <div className="p-2 border-t bg-muted/30">
          <div className="flex items-start gap-2">
            <GitCommit className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-xs truncate">
                {formatCommitMessage(currentRepo.lastCommit)}
              </p>
              <p className="text-xs text-muted-foreground">
                {currentRepo.lastCommit.author} • {formatCommitDate(currentRepo.lastCommit.date)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Commit Dialog */}
      <Dialog open={showCommitDialog} onOpenChange={setShowCommitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('commitDialog.title')}</DialogTitle>
            <DialogDescription>{t('commitDialog.description')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* File Summary */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <Check className="h-4 w-4 text-green-500" />
                <span>{t('commitDialog.staged', { count: stagedCount })}</span>
              </div>
              <div className="flex items-center gap-1">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span>{t('commitDialog.unstaged', { count: unstagedCount })}</span>
              </div>
            </div>

            {/* Commit Message */}
            <div className="space-y-2">
              <Label htmlFor="commitMessage">{t('commitDialog.message')}</Label>
              <Textarea
                id="commitMessage"
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                placeholder={t('commitDialog.messagePlaceholder')}
                rows={4}
              />
            </div>

            {unstagedCount > 0 && (
              <p className="text-xs text-muted-foreground">
                {t('commitDialog.willStageAll')}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCommitDialog(false)}>
              {tCommon('cancel')}
            </Button>
            <Button onClick={handleCommit} disabled={!commitMessage.trim() || isCommitting}>
              {isCommitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <GitCommit className="h-4 w-4 mr-2" />
              )}
              {t('commitDialog.commit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default GitPanel;
