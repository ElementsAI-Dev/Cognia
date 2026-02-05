/**
 * Git Integration Panel Component
 * 
 * Provides UI for managing Git integration with workflow templates.
 * 
 * IMPORTANT: This component is DESKTOP-ONLY and requires Tauri environment.
 * It uses native Git commands through lib/native/git for:
 * - Cloning workflow template repositories
 * - Syncing with remote repositories
 * - Managing multiple template sources
 * 
 * The component checks for Tauri environment using isTauri() and shows
 * an appropriate message for web users.
 * 
 * Integration points:
 * - Can be added to TemplateBrowser for desktop users
 * - Can be used standalone in settings for template repository management
 * 
 * @example
 * ```tsx
 * // Only render for desktop users
 * {isTauri() && <GitIntegrationPanel />}
 * ```
 */

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  GitBranch,
  RefreshCw,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Empty,
  EmptyMedia,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from '@/components/ui/empty';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { getGitIntegrationService } from '@/lib/workflow/git-integration-service';
import type { GitRepository } from '@/types/workflow/template';
import { isTauri } from '@/lib/utils';

export function GitIntegrationPanel() {
  const t = useTranslations('marketplace.git');

  const [repositories, setRepositories] = useState<GitRepository[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<GitRepository | null>(null);
  const [isCloning, setIsCloning] = useState(false);
  const [cloneUrl, setCloneUrl] = useState('');
  const [cloneBranch, setCloneBranch] = useState('main');
  const [status, setStatus] = useState<{
    type: 'success' | 'error' | 'info' | null;
    message: string;
  }>({ type: null, message: '' });

  const gitService = getGitIntegrationService();

  const handleClone = async () => {
    if (!cloneUrl) {
      setStatus({ type: 'error', message: t('errorNoUrl') });
      return;
    }

    // Git operations require Tauri (desktop) environment
    if (!isTauri()) {
      setStatus({ type: 'error', message: 'Git integration is only available in the desktop app' });
      return;
    }

    setIsCloning(true);
    setStatus({ type: 'info', message: t('cloning') });

    try {
      // Generate a safe destination path based on repo name
      const repoName = cloneUrl.split('/').pop()?.replace('.git', '') || `repo-${Date.now()}`;
      // Use app data directory pattern for cross-platform compatibility
      const destination = `templates/${repoName}-${Date.now()}`;
      await gitService.cloneRepository(cloneUrl, destination, cloneBranch);

      const repo = gitService.getRepository(destination);
      if (repo) {
        setRepositories([...repositories, repo]);
        setSelectedRepo(repo);
        setStatus({ type: 'success', message: t('cloneSuccess') });
      }
    } catch (error) {
      setStatus({
        type: 'error',
        message: `${t('cloneError')}: ${error instanceof Error ? error.message : String(error)}`,
      });
    } finally {
      setIsCloning(false);
    }
  };

  const handlePull = async () => {
    if (!selectedRepo) return;

    setStatus({ type: 'info', message: t('pulling') });

    try {
      // Use localPath for git operations
      await gitService.pullChanges(selectedRepo.localPath);
      setStatus({ type: 'success', message: t('pullSuccess') });
    } catch (error) {
      setStatus({
        type: 'error',
        message: `${t('pullError')}: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  };

  const handlePush = async () => {
    if (!selectedRepo) return;

    setStatus({ type: 'info', message: t('pushing') });

    try {
      // Use localPath for git operations
      await gitService.pushChanges(selectedRepo.localPath);
      setStatus({ type: 'success', message: t('pushSuccess') });
    } catch (error) {
      setStatus({
        type: 'error',
        message: `${t('pushError')}: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  };

  const handleCheckUpdates = async () => {
    if (!selectedRepo) return;

    try {
      // Use localPath for git operations
      const hasUpdates = await gitService.checkForUpdates(selectedRepo.localPath);
      if (hasUpdates) {
        setStatus({ type: 'info', message: t('updatesAvailable') });
      } else {
        setStatus({ type: 'success', message: t('upToDate') });
      }
    } catch (error) {
      setStatus({
        type: 'error',
        message: `${t('checkError')}: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  };

  const handleSyncAll = async () => {
    setStatus({ type: 'info', message: t('syncingAll') });

    try {
      await gitService.syncAllRepositories();
      setStatus({ type: 'success', message: t('syncSuccess') });
    } catch (error) {
      setStatus({
        type: 'error',
        message: `${t('syncError')}: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  };

  const handleRemoveRepo = (localPath: string) => {
    setRepositories(repositories.filter((r) => r.localPath !== localPath));
    if (selectedRepo?.localPath === localPath) {
      setSelectedRepo(null);
    }
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="border-b p-4">
          <h2 className="text-2xl font-bold mb-4">{t('title')}</h2>

          <div className="flex gap-2">
            {/* Clone Dialog */}
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('cloneRepo')}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('cloneDialogTitle')}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="clone-url">{t('repoUrl')}</Label>
                    <Input
                      id="clone-url"
                      placeholder={t('repoUrlPlaceholder')}
                      value={cloneUrl}
                      onChange={(e) => setCloneUrl(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="clone-branch">{t('branch')}</Label>
                    <Input
                      id="clone-branch"
                      placeholder={t('branchPlaceholder')}
                      value={cloneBranch}
                      onChange={(e) => setCloneBranch(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={handleClone}
                    disabled={isCloning}
                    className="w-full"
                  >
                    {isCloning ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        {t('cloningShort')}
                      </>
                    ) : (
                      t('cloneRepo')
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" onClick={handleSyncAll}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {t('syncAll')}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('syncingAll')}</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Status */}
        {status.type && (
          <div className="p-4 border-b">
            <Alert
              variant={status.type === 'error' ? 'destructive' : 'default'}
            >
              <div className="flex items-center gap-2">
                {status.type === 'success' && (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                )}
                {status.type === 'error' && (
                  <AlertCircle className="h-4 w-4" />
                )}
                {status.type === 'info' && (
                  <Info className="h-4 w-4 text-blue-500" />
                )}
                <AlertDescription>{status.message}</AlertDescription>
              </div>
            </Alert>
          </div>
        )}

        {/* Repository List */}
        <ScrollArea className="flex-1 p-4">
          {repositories.length === 0 ? (
            <Empty className="h-full">
              <EmptyHeader>
                <EmptyMedia>
                  <GitBranch className="h-12 w-12" />
                </EmptyMedia>
                <EmptyTitle>{t('noRepos')}</EmptyTitle>
                <EmptyDescription>{t('cloneToStart')}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="space-y-4">
              {repositories.map((repo) => (
                <RepositoryCard
                  key={repo.localPath}
                  repository={repo}
                  isSelected={selectedRepo?.localPath === repo.localPath}
                  onSelect={() => setSelectedRepo(repo)}
                  onRemove={() => handleRemoveRepo(repo.localPath)}
                  onPull={handlePull}
                  onPush={handlePush}
                  onCheckUpdates={handleCheckUpdates}
                  t={t}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Selected Repository Actions */}
        {selectedRepo && (
          <Card className="border-t rounded-none">
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3">
                {selectedRepo.url.split('/').pop()?.replace('.git', '')}
              </h3>
              <div className="flex gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" onClick={handlePull}>
                      <GitBranch className="h-4 w-4 mr-2" />
                      {t('pull')}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('pulling')}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" onClick={handlePush}>
                      <GitBranch className="h-4 w-4 mr-2" />
                      {t('push')}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('pushing')}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" onClick={handleCheckUpdates}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      {t('checkUpdates')}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('checkUpdates')}</TooltipContent>
                </Tooltip>
              </div>
              {selectedRepo.hasUpdates && (
                <Alert className="mt-3" variant="default">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    {t('updatesAvailable')}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  );
}

interface RepositoryCardProps {
  repository: GitRepository;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onPull: () => void;
  onPush: () => void;
  onCheckUpdates: () => void;
  t: (key: string) => string;
}

function RepositoryCard({
  repository,
  isSelected,
  onSelect,
  onRemove,
  onPull,
  onPush,
  onCheckUpdates,
  t,
}: RepositoryCardProps) {
  const repoName = repository.url.split('/').pop()?.replace('.git', '') || repository.url;

  return (
    <Card
      className={`cursor-pointer transition-colors ${
        isSelected ? 'border-primary bg-primary/5' : ''
      }`}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            <span className="font-semibold">{repoName}</span>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('removeRepo')}</TooltipContent>
          </Tooltip>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
          <Badge variant="outline">{repository.branch}</Badge>
          <span>{repository.commit.slice(0, 7)}</span>
          {repository.hasUpdates && (
            <Badge variant="secondary">{t('updatesAvailableBadge')}</Badge>
          )}
          {repository.conflictCount > 0 && (
            <Badge variant="destructive">
              {repository.conflictCount} {t('conflicts')}
            </Badge>
          )}
        </div>

        <div className="flex gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  onPull();
                }}
              >
                <GitBranch className="h-3 w-3 mr-1" />
                {t('pull')}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('pulling')}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  onPush();
                }}
              >
                <GitBranch className="h-3 w-3 mr-1" />
                {t('push')}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('pushing')}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onCheckUpdates();
                }}
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('checkUpdates')}</TooltipContent>
          </Tooltip>
        </div>
      </CardContent>
    </Card>
  );
}
