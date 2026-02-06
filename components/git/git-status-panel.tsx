'use client';

/**
 * Git Status Panel - Shows Git installation and repository status
 */

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useGit } from '@/hooks/native/use-git';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  GitBranch,
  GitCommit,
  GitPullRequest,
  Download,
  RefreshCw,
  ExternalLink,
  Check,
  X,
  AlertCircle,
  Loader2,
  Cloud,
  CloudOff,
} from 'lucide-react';
import { getGitStatusColor, formatCommitDate, formatCommitMessage } from '@/types/system/git';

export interface GitStatusPanelProps {
  repoPath?: string;
  projectId?: string;
  showInstallation?: boolean;
  showRepoStatus?: boolean;
  compact?: boolean;
}

export function GitStatusPanel({
  repoPath,
  projectId,
  showInstallation = true,
  showRepoStatus = true,
  compact = false,
}: GitStatusPanelProps) {
  const t = useTranslations('git.statusPanel');
  const {
    gitStatus,
    isInstalled,
    isCheckingGit,
    isInstallingGit,
    currentRepo,
    branches,
    fileStatus,
    isOperating,
    error,
    checkGitInstalled,
    installGit,
    openGitWebsite,
    refreshStatus,
    clearError,
  } = useGit({
    repoPath,
    projectId,
    autoCheck: true,
    autoLoadStatus: true,
  });

  // Refresh status periodically
  useEffect(() => {
    if (isInstalled && repoPath) {
      const interval = setInterval(refreshStatus, 30000);
      return () => clearInterval(interval);
    }
  }, [isInstalled, repoPath, refreshStatus]);

  const statusColor = currentRepo
    ? getGitStatusColor(currentRepo.status as Parameters<typeof getGitStatusColor>[0])
    : 'gray';

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {isCheckingGit ? (
          <Skeleton className="h-5 w-20" />
        ) : isInstalled ? (
          <>
            <Check className="h-4 w-4 text-green-500" />
            <span className="text-sm text-muted-foreground">Git {gitStatus.version || ''}</span>
            {currentRepo && (
              <Badge variant="outline" className="text-xs">
                {currentRepo.branch || 'detached'}
              </Badge>
            )}
          </>
        ) : (
          <>
            <X className="h-4 w-4 text-red-500" />
            <span className="text-sm text-muted-foreground">{t('notInstalled')}</span>
            <Button size="sm" variant="outline" onClick={installGit}>
              {t('install')}
            </Button>
          </>
        )}
      </div>
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
              {t('dismiss')}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Installation Status */}
      {showInstallation && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <GitBranch className="h-5 w-5" />
                  {t('installation.title')}
                </CardTitle>
                <CardDescription>{t('installation.description')}</CardDescription>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={checkGitInstalled}
                disabled={isCheckingGit}
              >
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
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="font-medium">{t('installed')}</span>
                  <Badge variant="secondary">{gitStatus.version}</Badge>
                </div>
                {gitStatus.path && (
                  <p className="text-sm text-muted-foreground truncate">{gitStatus.path}</p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-amber-600">
                  <AlertCircle className="h-4 w-4" />
                  <span>{t('notInstalledWarning')}</span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={installGit} disabled={isInstallingGit}>
                    {isInstallingGit ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t('installing')}
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        {t('installGit')}
                      </>
                    )}
                  </Button>
                  <Button size="sm" variant="outline" onClick={openGitWebsite}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    {t('website')}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Repository Status */}
      {showRepoStatus && isInstalled && currentRepo && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <GitCommit className="h-5 w-5" />
                  {t('repoStatus.title')}
                </CardTitle>
                <CardDescription className="truncate max-w-[300px]">
                  {currentRepo.path}
                </CardDescription>
              </div>
              <Button size="sm" variant="ghost" onClick={refreshStatus} disabled={isOperating}>
                {isOperating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Branch and Status */}
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="flex items-center gap-1">
                <GitBranch className="h-3 w-3" />
                {currentRepo.branch || 'detached'}
              </Badge>
              <Badge
                variant={statusColor === 'green' ? 'default' : 'secondary'}
                className={
                  statusColor === 'green'
                    ? 'bg-green-500'
                    : statusColor === 'yellow'
                      ? 'bg-yellow-500'
                      : statusColor === 'red'
                        ? 'bg-red-500'
                        : ''
                }
              >
                {currentRepo.status}
              </Badge>
              {currentRepo.remoteUrl ? (
                <Cloud className="h-4 w-4 text-muted-foreground" />
              ) : (
                <CloudOff className="h-4 w-4 text-muted-foreground" />
              )}
            </div>

            {/* Ahead/Behind */}
            {(currentRepo.ahead > 0 || currentRepo.behind > 0) && (
              <div className="flex items-center gap-2 text-sm">
                {currentRepo.ahead > 0 && (
                  <span className="text-blue-600">
                    ↑ {t('repoStatus.ahead', { count: currentRepo.ahead })}
                  </span>
                )}
                {currentRepo.behind > 0 && (
                  <span className="text-orange-600">
                    ↓ {t('repoStatus.behind', { count: currentRepo.behind })}
                  </span>
                )}
              </div>
            )}

            {/* File Changes */}
            {fileStatus.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  {t('repoStatus.changes', { count: fileStatus.length })}
                </p>
                <div className="max-h-32 overflow-auto space-y-1">
                  {fileStatus.slice(0, 10).map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 text-sm text-muted-foreground"
                    >
                      <Badge
                        variant="outline"
                        className={
                          file.status === 'added'
                            ? 'text-green-600 border-green-600'
                            : file.status === 'deleted'
                              ? 'text-red-600 border-red-600'
                              : file.status === 'modified'
                                ? 'text-yellow-600 border-yellow-600'
                                : ''
                        }
                      >
                        {file.status.charAt(0).toUpperCase()}
                      </Badge>
                      <span className="truncate">{file.path}</span>
                    </div>
                  ))}
                  {fileStatus.length > 10 && (
                    <p className="text-xs text-muted-foreground">
                      {t('repoStatus.moreFiles', { count: fileStatus.length - 10 })}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Last Commit */}
            {currentRepo.lastCommit && (
              <div className="space-y-1 border-t pt-3">
                <p className="text-sm font-medium">{t('repoStatus.lastCommit')}</p>
                <div className="flex items-start gap-2">
                  <GitCommit className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">
                      {formatCommitMessage(currentRepo.lastCommit)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {currentRepo.lastCommit.author} •{' '}
                      {formatCommitDate(currentRepo.lastCommit.date)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Branches */}
            {branches.length > 0 && (
              <div className="space-y-2 border-t pt-3">
                <p className="text-sm font-medium">
                  {t('repoStatus.branchCount', { count: branches.length })}
                </p>
                <div className="flex flex-wrap gap-1">
                  {branches.slice(0, 5).map((branch, idx) => (
                    <Badge
                      key={idx}
                      variant={branch.isCurrent ? 'default' : 'outline'}
                      className="text-xs"
                    >
                      {branch.name}
                    </Badge>
                  ))}
                  {branches.length > 5 && (
                    <Badge variant="outline" className="text-xs">
                      +{branches.length - 5}
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* No Repository */}
      {showRepoStatus && isInstalled && !currentRepo && repoPath && (
        <Card>
          <CardContent className="py-6 text-center">
            <GitPullRequest className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t('notARepo')}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default GitStatusPanel;
