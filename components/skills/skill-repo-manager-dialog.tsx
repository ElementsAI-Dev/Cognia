'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, Plus, Settings, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { AddSkillRepoInput, SkillRepo } from '@/hooks/skills';

interface SkillRepoManagerDialogProps {
  repos: SkillRepo[];
  onAddRepo: (input: AddSkillRepoInput) => Promise<void>;
  onRemoveRepo: (owner: string, name: string) => Promise<void>;
  onToggleRepo: (owner: string, name: string, enabled: boolean) => Promise<void>;
}

export function SkillRepoManagerDialog({
  repos,
  onAddRepo,
  onRemoveRepo,
  onToggleRepo,
}: SkillRepoManagerDialogProps) {
  const t = useTranslations('skills');
  const [open, setOpen] = useState(false);
  const [newRepoSource, setNewRepoSource] = useState('');
  const [newSourcePath, setNewSourcePath] = useState('');
  const [newBranch, setNewBranch] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = async () => {
    if (!newRepoSource.trim()) return;
    setIsAdding(true);
    try {
      await onAddRepo({
        repoUrl: newRepoSource.trim(),
        branch: newBranch.trim() || undefined,
        sourcePath: newSourcePath.trim() || undefined,
      });
      setNewRepoSource('');
      setNewSourcePath('');
      setNewBranch('');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          {t('manageRepos')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('skillRepositories')}</DialogTitle>
          <DialogDescription>{t('repoManagerDescription')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            {repos.map((repo) => (
              <div
                key={`${repo.owner}/${repo.name}`}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Switch
                    checked={repo.enabled}
                    onCheckedChange={(checked) => onToggleRepo(repo.owner, repo.name, checked)}
                  />
                  <div>
                    <p className="text-sm font-medium">
                      {repo.owner}/{repo.name}
                    </p>
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <p>
                        {t('branch')}: {repo.branch}
                      </p>
                      {repo.sourcePath && (
                        <p>
                          {t('sourcePathLabel')}: {repo.sourcePath}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveRepo(repo.owner, repo.name)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>

          <div className="border-t pt-4">
            <Label className="text-sm font-medium">{t('addRepository')}</Label>
            <Input
              placeholder={t('repoSourcePlaceholder')}
              value={newRepoSource}
              onChange={(e) => setNewRepoSource(e.target.value)}
              className="mt-2"
            />
            <div className="flex items-center gap-2 mt-2">
              <Input
                placeholder={t('branchPlaceholder')}
                value={newBranch}
                onChange={(e) => setNewBranch(e.target.value)}
                className="flex-1"
              />
              <Input
                placeholder={t('sourcePathPlaceholder')}
                value={newSourcePath}
                onChange={(e) => setNewSourcePath(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={handleAdd}
                disabled={isAdding || !newRepoSource.trim()}
                aria-label={t('addRepository')}
              >
                {isAdding ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {t('repoSourceHint')}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t('close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

