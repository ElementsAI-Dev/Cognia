'use client';

/**
 * Arena Page - Dedicated page for model comparison and analytics
 * Features leaderboard, heatmap, history, and quick battle
 */

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Scale, Trophy, Grid3X3, History, Zap, Settings } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  ArenaLeaderboard,
  ArenaHeatmap,
  ArenaHistory,
  ArenaDialog,
  ArenaBattleView,
  ArenaQuickBattle,
} from '@/components/arena';
import { useArenaStore } from '@/stores/arena';
import { useArena } from '@/hooks/arena';
import Link from 'next/link';

export default function ArenaPage() {
  const t = useTranslations('arena');

  const [activeTab, setActiveTab] = useState('leaderboard');
  const [showArenaDialog, setShowArenaDialog] = useState(false);
  const [selectedBattleId, setSelectedBattleId] = useState<string | null>(null);
  const [quickPrompt, setQuickPrompt] = useState('');

  const battles = useArenaStore((state) => state.battles);
  const activeBattleId = useArenaStore((state) => state.activeBattleId);
  const setActiveBattle = useArenaStore((state) => state.setActiveBattle);
  const { continueTurn, canContinue } = useArena();

  const completedBattles = battles.filter((b) => b.winnerId || b.isTie);
  const totalBattles = battles.length;

  const currentBattleId = selectedBattleId || activeBattleId;

  const handleCloseBattle = useCallback(() => {
    setSelectedBattleId(null);
    if (activeBattleId) {
      setActiveBattle(null);
    }
  }, [activeBattleId, setActiveBattle]);

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
            <Badge variant="outline">{t('completedCount', { count: completedBattles.length })}</Badge>
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
              <Trophy className="h-4 w-4" />
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
            </div>
          </TabsContent>

          <TabsContent value="leaderboard" className="h-[calc(100%-60px)]">
            <ArenaLeaderboard />
          </TabsContent>

          <TabsContent value="heatmap" className="h-[calc(100%-60px)]">
            <ArenaHeatmap />
          </TabsContent>

          <TabsContent value="history" className="h-[calc(100%-60px)]">
            <ArenaHistory
              onViewBattle={(battleId) => setSelectedBattleId(battleId)}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Arena Dialog */}
      <ArenaDialog
        open={showArenaDialog}
        onOpenChange={setShowArenaDialog}
        initialPrompt={quickPrompt}
        onBattleComplete={() => {
          setQuickPrompt('');
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
