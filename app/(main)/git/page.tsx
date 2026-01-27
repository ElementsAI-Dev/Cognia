'use client';

/**
 * Git Page - Main Git management page
 */

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { GitBranch, FolderOpen, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { GitPanel } from '@/components/git';
import { open } from '@tauri-apps/plugin-dialog';

export default function GitPage() {
  const t = useTranslations('git');
  const tc = useTranslations('common');
  const [repoPath, setRepoPath] = useState('');
  const [activeRepo, setActiveRepo] = useState<string | null>(null);

  const handleOpenRepo = () => {
    if (repoPath.trim()) {
      setActiveRepo(repoPath.trim());
    }
  };

  const handlePickFolder = useCallback(async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: t('selectRepository'),
      });
      if (selected && typeof selected === 'string') {
        setRepoPath(selected);
      }
    } catch {
      // User cancelled or error - silently ignore
    }
  }, [t]);

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar with Git Panel */}
      <div className="w-80 border-r bg-card flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center gap-2 mb-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {tc('back')}
              </Button>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            <h1 className="text-lg font-semibold">{t('pageTitle')}</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {t('pageDescription')}
          </p>
        </div>

        {/* Repository Selector */}
        {!activeRepo && (
          <div className="p-4 border-b">
            <Label htmlFor="repoPath" className="text-sm font-medium">
              {t('repositoryPath')}
            </Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="repoPath"
                value={repoPath}
                onChange={(e) => setRepoPath(e.target.value)}
                placeholder={t('repositoryPathPlaceholder')}
                className="flex-1"
              />
              <Button variant="outline" size="icon" onClick={handlePickFolder}>
                <FolderOpen className="h-4 w-4" />
              </Button>
            </div>
            <Button
              className="w-full mt-2"
              onClick={handleOpenRepo}
              disabled={!repoPath.trim()}
            >
              {t('openRepository')}
            </Button>
          </div>
        )}

        {/* Active Repo Header */}
        {activeRepo && (
          <div className="p-4 border-b bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">
                  {activeRepo.split(/[/\\]/).pop()}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {activeRepo}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveRepo(null)}
              >
                {t('change')}
              </Button>
            </div>
          </div>
        )}

        {/* Git Panel */}
        {activeRepo && (
          <GitPanel repoPath={activeRepo} className="flex-1 overflow-hidden" />
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-auto">
        {!activeRepo ? (
          <div className="flex items-center justify-center h-full">
            <Card className="max-w-md w-full">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-4 rounded-full bg-primary/10">
                  <GitBranch className="h-8 w-8 text-primary" />
                </div>
                <CardTitle>{t('repository')}</CardTitle>
                <CardDescription>
                  {t('desktopRequired.description')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="mainRepoPath">{t('repositoryPath')}</Label>
                  <div className="flex gap-2">
                    <Input
                      id="mainRepoPath"
                      value={repoPath}
                      onChange={(e) => setRepoPath(e.target.value)}
                      placeholder={t('repositoryPathPlaceholder')}
                      className="flex-1"
                    />
                    <Button variant="outline" size="icon">
                      <FolderOpen className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={handleOpenRepo}
                  disabled={!repoPath.trim()}
                >
                  Open Repository
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">{t('repositoryOverview')}</h2>
              <p className="text-muted-foreground">
                {t('useSidebarHint')}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t('quickTips')}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <p>• {t('tipChangesTab')}</p>
                  <p>• {t('tipBranchesTab')}</p>
                  <p>• {t('tipHistoryTab')}</p>
                  <p>• {t('tipPushPull')}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t('keyboardShortcuts')}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <p><kbd className="px-1 py-0.5 bg-muted rounded">Ctrl+S</kbd> {t('shortcutStageAll')}</p>
                  <p><kbd className="px-1 py-0.5 bg-muted rounded">Ctrl+Enter</kbd> {t('shortcutQuickCommit')}</p>
                  <p><kbd className="px-1 py-0.5 bg-muted rounded">Ctrl+Shift+P</kbd> {t('shortcutPush')}</p>
                  <p><kbd className="px-1 py-0.5 bg-muted rounded">Ctrl+Shift+L</kbd> {t('shortcutPull')}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{tc('settings')}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <p>{t('settingsHint')}</p>
                  <Link href="/settings" className="text-primary hover:underline">
                    {t('settingsLink')}
                  </Link>
                  <p className="mt-2">{t('section')}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
