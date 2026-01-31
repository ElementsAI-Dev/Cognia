'use client';

/**
 * Arena Page - Dedicated page for model comparison and analytics
 * Features leaderboard, heatmap, history, and quick battle
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Scale, Trophy, Grid3X3, History, Zap, Settings } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArenaLeaderboard,
  ArenaHeatmap,
  ArenaHistory,
  ArenaDialog,
  ArenaBattleView,
} from '@/components/arena';
import { useArenaStore } from '@/stores/arena';
import Link from 'next/link';

export default function ArenaPage() {
  const t = useTranslations('arena');

  const [activeTab, setActiveTab] = useState('leaderboard');
  const [showArenaDialog, setShowArenaDialog] = useState(false);
  const [selectedBattleId, setSelectedBattleId] = useState<string | null>(null);

  const battles = useArenaStore((state) => state.battles);
  const activeBattleId = useArenaStore((state) => state.activeBattleId);

  const completedBattles = battles.filter((b) => b.winnerId || b.isTie);
  const totalBattles = battles.length;

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
            <Badge variant="secondary">{totalBattles} battles</Badge>
            <Badge variant="outline">{completedBattles.length} completed</Badge>
          </div>
          <Button onClick={() => setShowArenaDialog(true)} className="gap-2">
            <Zap className="h-4 w-4" />
            {t('startBattle')}
          </Button>
          <Button variant="outline" size="icon" asChild>
            <Link href="/settings/arena">
              <Settings className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          <TabsList className="mb-4">
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
        onBattleComplete={() => {
          // Optionally switch to history tab after battle
        }}
      />

      {/* Battle View */}
      {(selectedBattleId || activeBattleId) && (
        <ArenaBattleView
          battleId={selectedBattleId || activeBattleId!}
          open={!!(selectedBattleId || activeBattleId)}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedBattleId(null);
              if (activeBattleId) {
                useArenaStore.getState().setActiveBattle(null);
              }
            }
          }}
        />
      )}
    </div>
  );
}
