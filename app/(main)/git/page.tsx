'use client';

/**
 * Git Page - Main Git management page with tabbed interface
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import {
  GitBranch,
  FolderOpen,
  ArrowLeft,
  BarChart3,
  Camera,
  Tag,
  Globe,
  Network,
} from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GitPanel, type GitPanelRef } from '@/components/git';
import { GitCommitGraph } from '@/components/git/git-commit-graph';
import { GitStatsDashboard } from '@/components/git/git-stats-dashboard';
import { GitCheckpointPanel } from '@/components/git/git-checkpoint-panel';
import { GitTagPanel } from '@/components/git/git-tag-panel';
import { GitRemotePanel } from '@/components/git/git-remote-panel';
import { useGitStore } from '@/stores/git/git-store';
import { open } from '@tauri-apps/plugin-dialog';

type MainTab = 'overview' | 'graph' | 'stats' | 'checkpoints' | 'tags' | 'remotes';

export default function GitPage() {
  const t = useTranslations('git');
  const tc = useTranslations('common');
  const [repoPath, setRepoPath] = useState('');
  const [activeRepo, setActiveRepo] = useState<string | null>(null);
  const [mainTab, setMainTab] = useState<MainTab>('overview');
  const gitPanelRef = useRef<GitPanelRef>(null);

  const {
    graphCommits,
    repoStats,
    checkpoints,
    tags,
    remotes,
    loadGraphCommits,
    loadRepoStats,
    loadCheckpoints,
    createCheckpoint,
    restoreCheckpoint,
    deleteCheckpoint,
    createTag,
    deleteTag,
    pushTag,
    addRemote,
    removeRemote,
    loadTags,
    loadRemotes,
  } = useGitStore();

  const [selectedGraphCommit, setSelectedGraphCommit] = useState<string | null>(null);
  const [loadingTab, setLoadingTab] = useState<MainTab | null>(null);

  const tabLoaders: Partial<Record<MainTab, () => Promise<void>>> = {
    graph: loadGraphCommits,
    stats: loadRepoStats,
    checkpoints: loadCheckpoints,
    tags: loadTags,
    remotes: loadRemotes,
  };

  const refreshTab = useCallback(async (tab: MainTab) => {
    const loader = tabLoaders[tab];
    if (!loader) return;
    setLoadingTab(tab);
    try { await loader(); } finally { setLoadingTab(null); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadGraphCommits, loadRepoStats, loadCheckpoints, loadTags, loadRemotes]);

  // Load data when tab changes
  useEffect(() => {
    if (!activeRepo || mainTab === 'overview') return;
    refreshTab(mainTab);
  }, [mainTab, activeRepo, refreshTab]);

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

  // Tag handlers
  const handleCreateTag = useCallback(async (name: string, message?: string, target?: string) => {
    const result = await createTag(name, { message, target });
    if (result) await loadTags();
    return result;
  }, [createTag, loadTags]);

  const handleDeleteTag = useCallback(async (name: string) => {
    const result = await deleteTag(name);
    if (result) await loadTags();
    return result;
  }, [deleteTag, loadTags]);

  const handlePushTag = useCallback(async (name: string) => {
    return await pushTag(name);
  }, [pushTag]);

  // Remote handlers
  const handleAddRemote = useCallback(async (name: string, url: string) => {
    const result = await addRemote(name, url);
    if (result) await loadRemotes();
    return result;
  }, [addRemote, loadRemotes]);

  const handleRemoveRemote = useCallback(async (name: string) => {
    const result = await removeRemote(name);
    if (result) await loadRemotes();
    return result;
  }, [removeRemote, loadRemotes]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts when a repo is active
      if (!activeRepo) return;

      // Ctrl+S - Stage all changes
      if (e.ctrlKey && e.key === 's' && !e.shiftKey) {
        e.preventDefault();
        gitPanelRef.current?.stageAll?.();
      }

      // Ctrl+Enter - Quick commit
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        gitPanelRef.current?.commit?.();
      }

      // Ctrl+Shift+P - Push
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        gitPanelRef.current?.push?.();
      }

      // Ctrl+Shift+L - Pull
      if (e.ctrlKey && e.shiftKey && e.key === 'L') {
        e.preventDefault();
        gitPanelRef.current?.pull?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeRepo]);

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
          <GitPanel ref={gitPanelRef} repoPath={activeRepo} className="flex-1 overflow-hidden" />
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {!activeRepo ? (
          <div className="flex items-center justify-center h-full p-6">
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
                    <Button variant="outline" size="icon" onClick={handlePickFolder}>
                      <FolderOpen className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={handleOpenRepo}
                  disabled={!repoPath.trim()}
                >
                  {t('openRepository')}
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as MainTab)} className="flex flex-col h-full">
            <div className="border-b px-4 pt-2">
              <TabsList className="h-9">
                <TabsTrigger value="overview" className="text-xs gap-1.5">
                  <GitBranch className="h-3.5 w-3.5" />
                  {t('tab.overview')}
                </TabsTrigger>
                <TabsTrigger value="graph" className="text-xs gap-1.5">
                  <Network className="h-3.5 w-3.5" />
                  {t('tab.graph')}
                </TabsTrigger>
                <TabsTrigger value="stats" className="text-xs gap-1.5">
                  <BarChart3 className="h-3.5 w-3.5" />
                  {t('tab.stats')}
                </TabsTrigger>
                <TabsTrigger value="checkpoints" className="text-xs gap-1.5">
                  <Camera className="h-3.5 w-3.5" />
                  {t('tab.checkpoints')}
                </TabsTrigger>
                <TabsTrigger value="tags" className="text-xs gap-1.5">
                  <Tag className="h-3.5 w-3.5" />
                  {t('tab.tags')}
                </TabsTrigger>
                <TabsTrigger value="remotes" className="text-xs gap-1.5">
                  <Globe className="h-3.5 w-3.5" />
                  {t('tab.remotes')}
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Overview Tab */}
            <TabsContent value="overview" className="flex-1 overflow-auto p-6 mt-0">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">{t('repositoryOverview')}</h2>
                    <p className="text-muted-foreground">
                      {activeRepo.split(/[/\\]/).pop()}
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        {t('keyboardShortcuts')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">Ctrl+S</kbd>
                        <span className="text-muted-foreground">{t('shortcutStageAll')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">Ctrl+Enter</kbd>
                        <span className="text-muted-foreground">{t('shortcutQuickCommit')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">Ctrl+Shift+P</kbd>
                        <span className="text-muted-foreground">{t('shortcutPush')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">Ctrl+Shift+L</kbd>
                        <span className="text-muted-foreground">{t('shortcutPull')}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        {t('quickTips')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground space-y-1.5">
                      <p>• {t('tipChangesTab')}</p>
                      <p>• {t('tipBranchesTab')}</p>
                      <p>• {t('tipHistoryTab')}</p>
                      <p>• {t('tipPushPull')}</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="text-sm text-muted-foreground">
                  {t('settingsHint')}{' '}
                  <Link href="/settings" className="text-primary hover:underline">
                    {t('settingsLink')}
                  </Link>
                </div>
              </div>
            </TabsContent>

            {/* Graph Tab */}
            <TabsContent value="graph" className="flex-1 overflow-hidden mt-0">
              <GitCommitGraph
                commits={graphCommits}
                selectedCommit={selectedGraphCommit}
                onCommitClick={(c) => setSelectedGraphCommit(c.hash)}
                onRefresh={() => refreshTab('graph')}
                isLoading={loadingTab === 'graph'}
                className="h-full"
              />
            </TabsContent>

            {/* Stats Tab */}
            <TabsContent value="stats" className="flex-1 overflow-auto mt-0">
              <GitStatsDashboard
                stats={repoStats}
                onRefresh={() => refreshTab('stats')}
                isLoading={loadingTab === 'stats'}
              />
            </TabsContent>

            {/* Checkpoints Tab */}
            <TabsContent value="checkpoints" className="flex-1 overflow-hidden mt-0">
              <GitCheckpointPanel
                checkpoints={checkpoints}
                onCreateCheckpoint={createCheckpoint}
                onRestoreCheckpoint={restoreCheckpoint}
                onDeleteCheckpoint={deleteCheckpoint}
                onRefresh={() => refreshTab('checkpoints')}
                isLoading={loadingTab === 'checkpoints'}
                className="h-full"
              />
            </TabsContent>

            {/* Tags Tab */}
            <TabsContent value="tags" className="flex-1 overflow-hidden mt-0">
              <GitTagPanel
                tags={tags}
                onCreateTag={handleCreateTag}
                onDeleteTag={handleDeleteTag}
                onPushTag={handlePushTag}
                onRefresh={() => refreshTab('tags')}
                isLoading={loadingTab === 'tags'}
                className="h-full"
              />
            </TabsContent>

            {/* Remotes Tab */}
            <TabsContent value="remotes" className="flex-1 overflow-hidden mt-0">
              <GitRemotePanel
                remotes={remotes}
                onAddRemote={handleAddRemote}
                onRemoveRemote={handleRemoveRemote}
                onRefresh={() => refreshTab('remotes')}
                isLoading={loadingTab === 'remotes'}
                className="h-full"
              />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
