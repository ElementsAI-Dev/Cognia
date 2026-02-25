'use client';

/**
 * Arena Page - Dedicated page for model comparison and analytics
 * Features leaderboard, heatmap, history, and quick battle
 */

import { useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Scale, Trophy, Grid3X3, History, Zap, Settings, BarChart3, Eye, EyeOff, Wifi, WifiOff, Shuffle, Clock } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  ArenaLeaderboard,
  ArenaHeatmap,
  ArenaHistory,
  ArenaDialog,
  ArenaBattleView,
  ArenaQuickBattle,
  ArenaErrorBoundary,
  ArenaStats,
} from '@/components/arena';
import {
  useArenaStore,
  selectActiveBattle,
  selectActiveBattleId,
  selectSettings as selectArenaSettings,
  selectTotalBattleCount,
  selectCompletedBattleCount,
  selectBattles,
} from '@/stores/arena';
import { useArena, useLeaderboardSync, useLeaderboardOnlineStatus } from '@/hooks/arena';
import { getRandomPrompts, getRecentBattlePrompts } from '@/lib/arena';
import type { ArenaPrompt } from '@/lib/arena';
import type { ArenaBattle, ModelSelection } from '@/types/arena';
import Link from 'next/link';

export default function ArenaPage() {
  const t = useTranslations('arena');

  const [activeTab, setActiveTab] = useState('leaderboard');
  const [showArenaDialog, setShowArenaDialog] = useState(false);
  const [selectedBattleId, setSelectedBattleId] = useState<string | null>(null);
  const [quickPrompt, setQuickPrompt] = useState('');
  const [suggestedPrompts, setSuggestedPrompts] = useState<ArenaPrompt[]>(() => getRandomPrompts(4));
  const [rematchModels, setRematchModels] = useState<ModelSelection[] | undefined>(undefined);

  const battles = useArenaStore(selectBattles);
  const totalBattles = useArenaStore(selectTotalBattleCount);
  const completedBattleCount = useArenaStore(selectCompletedBattleCount);
  const activeBattle = useArenaStore(selectActiveBattle);
  const activeBattleId = useArenaStore(selectActiveBattleId);
  const arenaSettings = useArenaStore(selectArenaSettings);
  const setActiveBattle = useArenaStore((state) => state.setActiveBattle);
  const getActiveBattle = useArenaStore((state) => state.getActiveBattle);
  const { continueTurn, canContinue } = useArena();

  // Leaderboard sync - auto-fetch when leaderboard tab is active
  const { isSyncing: leaderboardSyncing } = useLeaderboardSync({
    autoFetch: activeTab === 'leaderboard',
  });
  const { isOnline } = useLeaderboardOnlineStatus();

  const recentPrompts = useMemo(() => getRecentBattlePrompts(battles, 5), [battles]);

  const handleRefreshSuggestions = useCallback(() => {
    setSuggestedPrompts(getRandomPrompts(4));
  }, []);

  const handleRematch = useCallback((battle: ArenaBattle) => {
    setQuickPrompt(battle.prompt);
    setRematchModels(
      battle.contestants.map((c) => ({
        provider: c.provider,
        model: c.model,
        displayName: c.displayName,
      }))
    );
    setShowArenaDialog(true);
  }, []);

  const currentBattleId = selectedBattleId || activeBattleId;

  const handleCloseBattle = useCallback(() => {
    setSelectedBattleId(null);
    // Use getActiveBattle() for imperative access to check completion status
    const battle = getActiveBattle();
    if (battle) {
      setActiveBattle(null);
    }
  }, [getActiveBattle, setActiveBattle]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <div className="flex items-center gap-3">
          <Scale className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-xl font-semibold">{t('title')}</h1>
            <p className="text-sm text-muted-foreground">{t('description')}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="secondary">{t('battlesCount', { count: totalBattles })}</Badge>
            <Badge variant="outline">{t('completedCount', { count: completedBattleCount })}</Badge>
            {arenaSettings.defaultMode === 'blind' ? (
              <Badge variant="secondary" className="gap-1">
                <EyeOff className="h-3 w-3" />
                {t('blindMode')}
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1">
                <Eye className="h-3 w-3" />
                {t('normalMode')}
              </Badge>
            )}
            {activeBattle && (
              <Badge variant="default" className="gap-1 animate-pulse">
                {activeBattle.contestants.map((c) => c.displayName || c.model).join(' vs ')}
              </Badge>
            )}
            <Badge variant="outline" className="gap-1">
              {isOnline ? (
                <><Wifi className="h-3 w-3 text-green-500" /> {t('online')}</>
              ) : (
                <><WifiOff className="h-3 w-3 text-red-500" /> {t('offline')}</>
              )}
            </Badge>
          </div>
          <Button onClick={() => setShowArenaDialog(true)} className="gap-2">
            <Zap className="h-4 w-4" />
            {t('startBattle')}
          </Button>
          <Button variant="outline" size="icon" asChild>
            <Link href="/settings?section=arena">
              <Settings className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          <TabsList className="mb-4">
            <TabsTrigger value="battle" className="gap-2">
              <Zap className="h-4 w-4" />
              {t('quickBattle.title')}
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="gap-2">
              <Trophy className={cn('h-4 w-4', leaderboardSyncing && 'animate-spin')} />
              {t('leaderboard.title')}
            </TabsTrigger>
            <TabsTrigger value="heatmap" className="gap-2">
              <Grid3X3 className="h-4 w-4" />
              {t('heatmap.title')}
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />
              {t('history.title')}
            </TabsTrigger>
            <TabsTrigger value="stats" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              {t('stats.title')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="battle" className="h-[calc(100%-60px)]">
            <div className="max-w-3xl space-y-4">
              <div className="rounded-lg border bg-card p-4 space-y-4">
                <div>
                  <p className="text-sm font-medium text-foreground">{t('prompt')}</p>
                  <p className="text-xs text-muted-foreground">{t('promptPlaceholder')}</p>
                </div>
                <Textarea
                  value={quickPrompt}
                  onChange={(event) => setQuickPrompt(event.target.value)}
                  placeholder={t('promptPlaceholder')}
                  className="min-h-[120px]"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <ArenaQuickBattle prompt={quickPrompt} />
                  <Button variant="outline" onClick={() => setShowArenaDialog(true)}>
                    {t('newBattle')}
                  </Button>
                </div>
              </div>

              {/* Suggested Prompts */}
              <div className="rounded-lg border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{t('prompts.suggested')}</p>
                  <Button variant="ghost" size="sm" className="h-7 gap-1" onClick={handleRefreshSuggestions}>
                    <Shuffle className="h-3 w-3" />
                    {t('prompts.refresh')}
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {suggestedPrompts.map((sp) => (
                    <button
                      key={sp.id}
                      className="p-3 rounded-lg border text-left hover:bg-muted/50 transition-colors"
                      onClick={() => setQuickPrompt(sp.prompt)}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-[10px] capitalize">{sp.category}</Badge>
                        <Badge variant="secondary" className="text-[10px]">{sp.difficulty}</Badge>
                      </div>
                      <p className="text-sm font-medium line-clamp-1">{sp.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{sp.prompt}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Recent Prompts */}
              {recentPrompts.length > 0 && (
                <div className="rounded-lg border bg-card p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium">{t('prompts.recent')}</p>
                  </div>
                  <div className="space-y-1">
                    {recentPrompts.map((rp, i) => (
                      <button
                        key={i}
                        className="w-full p-2 rounded text-left hover:bg-muted/50 transition-colors"
                        onClick={() => setQuickPrompt(rp)}
                      >
                        <p className="text-sm line-clamp-1">{rp}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="leaderboard" className="h-[calc(100%-60px)]">
            <ArenaErrorBoundary sectionName="Leaderboard">
              <ArenaLeaderboard />
            </ArenaErrorBoundary>
          </TabsContent>

          <TabsContent value="heatmap" className="h-[calc(100%-60px)]">
            <ArenaErrorBoundary sectionName="Heatmap">
              <ArenaHeatmap />
            </ArenaErrorBoundary>
          </TabsContent>

          <TabsContent value="history" className="h-[calc(100%-60px)]">
            <ArenaErrorBoundary sectionName="History">
              <ArenaHistory
                onViewBattle={(battleId) => setSelectedBattleId(battleId)}
                onRematch={handleRematch}
              />
            </ArenaErrorBoundary>
          </TabsContent>

          <TabsContent value="stats" className="h-[calc(100%-60px)]">
            <ArenaErrorBoundary sectionName="Stats">
              <ArenaStats />
            </ArenaErrorBoundary>
          </TabsContent>
        </Tabs>
      </div>

      {/* Arena Dialog */}
      <ArenaDialog
        open={showArenaDialog}
        onOpenChange={(open) => {
          setShowArenaDialog(open);
          if (!open) setRematchModels(undefined);
        }}
        initialPrompt={quickPrompt}
        initialModels={rematchModels}
        onBattleComplete={() => {
          setQuickPrompt('');
          setRematchModels(undefined);
        }}
      />

      {/* Battle View */}
      {currentBattleId && (
        <ArenaBattleView
          battleId={currentBattleId}
          open={!!currentBattleId}
          onOpenChange={(open) => {
            if (!open) {
              handleCloseBattle();
            }
          }}
          onContinueTurn={continueTurn}
          canContinue={currentBattleId ? canContinue(currentBattleId) : false}
        />
      )}
    </div>
  );
}
