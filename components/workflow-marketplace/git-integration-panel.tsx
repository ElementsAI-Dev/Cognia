/**
 * Git Integration Panel Component
 * 
 * Provides UI for managing Git integration with workflow templates
 */

'use client';

import { useState } from 'react';
import {
  GitBranch,
  RefreshCw,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
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
import { getGitIntegrationService } from '@/lib/workflow/git-integration-service';
import type { GitRepository } from '@/types/workflow/template';

export function GitIntegrationPanel() {
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
      setStatus({ type: 'error', message: 'Please enter a Git repository URL' });
      return;
    }

    setIsCloning(true);
    setStatus({ type: 'info', message: 'Cloning repository...' });

    try {
      const destination = `/tmp/templates/${Date.now()}`;
      await gitService.cloneRepository(cloneUrl, destination, cloneBranch);

      const repo = gitService.getRepository(destination);
      if (repo) {
        setRepositories([...repositories, repo]);
        setSelectedRepo(repo);
        setStatus({ type: 'success', message: 'Repository cloned successfully' });
      }
    } catch (error) {
      setStatus({
        type: 'error',
        message: `Failed to clone repository: ${error instanceof Error ? error.message : String(error)}`,
      });
    } finally {
      setIsCloning(false);
    }
  };

  const handlePull = async () => {
    if (!selectedRepo) return;

    setStatus({ type: 'info', message: 'Pulling changes...' });

    try {
      await gitService.pullChanges(selectedRepo.url);
      setStatus({ type: 'success', message: 'Changes pulled successfully' });
    } catch (error) {
      setStatus({
        type: 'error',
        message: `Failed to pull changes: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  };

  const handlePush = async () => {
    if (!selectedRepo) return;

    setStatus({ type: 'info', message: 'Pushing changes...' });

    try {
      await gitService.pushChanges(selectedRepo.url);
      setStatus({ type: 'success', message: 'Changes pushed successfully' });
    } catch (error) {
      setStatus({
        type: 'error',
        message: `Failed to push changes: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  };

  const handleCheckUpdates = async () => {
    if (!selectedRepo) return;

    try {
      const hasUpdates = await gitService.checkForUpdates(selectedRepo.url);
      if (hasUpdates) {
        setStatus({ type: 'info', message: 'Updates available on remote' });
      } else {
        setStatus({ type: 'success', message: 'Repository is up to date' });
      }
    } catch (error) {
      setStatus({
        type: 'error',
        message: `Failed to check for updates: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  };

  const handleSyncAll = async () => {
    setStatus({ type: 'info', message: 'Syncing all repositories...' });

    try {
      await gitService.syncAllRepositories();
      setStatus({ type: 'success', message: 'All repositories synced' });
    } catch (error) {
      setStatus({
        type: 'error',
        message: `Failed to sync repositories: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  };

  const handleRemoveRepo = (url: string) => {
    setRepositories(repositories.filter((r) => r.url !== url));
    if (selectedRepo?.url === url) {
      setSelectedRepo(null);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b p-4">
        <h2 className="text-2xl font-bold mb-4">Git Integration</h2>

        {/* Clone Dialog */}
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Clone Repository
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Clone Git Repository</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="clone-url">Repository URL</Label>
                <Input
                  id="clone-url"
                  placeholder="https://github.com/username/repo.git"
                  value={cloneUrl}
                  onChange={(e) => setCloneUrl(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="clone-branch">Branch</Label>
                <Input
                  id="clone-branch"
                  placeholder="main"
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
                    Cloning...
                  </>
                ) : (
                  'Clone Repository'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Button variant="outline" onClick={handleSyncAll}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Sync All
        </Button>
      </div>

      {/* Status */}
      {status.type && (
        <div className="p-4 border-b">
          <div
            className={`flex items-center gap-2 ${
              status.type === 'error' ? 'text-destructive' : ''
            }`}
          >
            {status.type === 'success' && <CheckCircle2 className="h-4 w-4" />}
            {status.type === 'error' && <AlertCircle className="h-4 w-4" />}
            {status.type === 'info' && <RefreshCw className="h-4 w-4" />}
            <span className="text-sm">{status.message}</span>
          </div>
        </div>
      )}

      {/* Repository List */}
      <div className="flex-1 overflow-y-auto p-4">
        {repositories.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <GitBranch className="h-12 w-12 mb-4" />
            <p>No repositories connected</p>
            <p className="text-sm">Clone a repository to get started</p>
          </div>
        ) : (
          <div className="space-y-4">
            {repositories.map((repo) => (
              <RepositoryCard
                key={repo.url}
                repository={repo}
                isSelected={selectedRepo?.url === repo.url}
                onSelect={() => setSelectedRepo(repo)}
                onRemove={() => handleRemoveRepo(repo.url)}
                onPull={handlePull}
                onPush={handlePush}
                onCheckUpdates={handleCheckUpdates}
              />
            ))}
          </div>
        )}
      </div>

      {/* Selected Repository Actions */}
      {selectedRepo && (
        <div className="border-t p-4">
          <h3 className="font-semibold mb-3">
            {selectedRepo.url.split('/').pop()?.replace('.git', '')}
          </h3>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePull}>
              <GitBranch className="h-4 w-4 mr-2" />
              Pull
            </Button>
            <Button variant="outline" onClick={handlePush}>
              <GitBranch className="h-4 w-4 mr-2" />
              Push
            </Button>
            <Button variant="outline" onClick={handleCheckUpdates}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Check Updates
            </Button>
          </div>
          {selectedRepo.hasUpdates && (
            <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                Updates available on remote
              </p>
            </div>
          )}
        </div>
      )}
    </div>
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
}

function RepositoryCard({
  repository,
  isSelected,
  onSelect,
  onRemove,
  onPull,
  onPush,
  onCheckUpdates,
}: RepositoryCardProps) {
  const repoName = repository.url.split('/').pop()?.replace('.git', '') || repository.url;

  return (
    <div
      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
        isSelected ? 'border-primary bg-primary/5' : ''
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <GitBranch className="h-4 w-4" />
          <span className="font-semibold">{repoName}</span>
        </div>
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
      </div>

      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
        <Badge variant="outline">{repository.branch}</Badge>
        <span>{repository.commit.slice(0, 7)}</span>
        {repository.hasUpdates && (
          <Badge variant="secondary">Updates Available</Badge>
        )}
        {repository.conflictCount > 0 && (
          <Badge variant="destructive">{repository.conflictCount} Conflicts</Badge>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            onPull();
          }}
        >
          <GitBranch className="h-3 w-3 mr-1" />
          Pull
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            onPush();
          }}
        >
          <GitBranch className="h-3 w-3 mr-1" />
          Push
        </Button>
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
      </div>
    </div>
  );
}
