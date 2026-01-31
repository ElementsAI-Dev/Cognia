'use client';

/**
 * ArenaChatView - Inline arena view for chat container
 * Displays arena functionality within the chat interface
 */

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Scale,
  Trophy,
  Grid3X3,
  History,
  Zap,
  Plus,
  ChevronRight,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ArenaLeaderboard,
  ArenaHeatmap,
  ArenaHistory,
  ArenaDialog,
  ArenaBattleView,
} from '@/components/arena';
import { useArenaStore } from '@/stores/arena';
import { cn } from '@/lib/utils';

interface ArenaChatViewProps {
  sessionId?: string;
  systemPrompt?: string;
  initialPrompt?: string;
  className?: string;
}

export function ArenaChatView({
  sessionId,
  systemPrompt,
  initialPrompt = '',
  className,
}: ArenaChatViewProps) {
  const t = useTranslations('arena');

  const [activeTab, setActiveTab] = useState('battle');
  const [showArenaDialog, setShowArenaDialog] = useState(false);
  const [selectedBattleId, setSelectedBattleId] = useState<string | null>(null);

  const battles = useArenaStore((state) => state.battles);
  const activeBattleId = useArenaStore((state) => state.activeBattleId);
  const setActiveBattle = useArenaStore((state) => state.setActiveBattle);

  const activeBattles = battles.filter(
    (b) => !b.winnerId && !b.isTie && b.contestants.some((c) => c.status === 'streaming' || c.status === 'pending')
  );
  const recentBattles = battles.slice(0, 5);
  const completedBattles = battles.filter((b) => b.winnerId || b.isTie);

  const handleStartBattle = useCallback(() => {
    setShowArenaDialog(true);
  }, []);

  const handleViewBattle = useCallback((battleId: string) => {
    setSelectedBattleId(battleId);
  }, []);

  const handleCloseBattle = useCallback(() => {
    setSelectedBattleId(null);
    if (activeBattleId) {
      setActiveBattle(null);
    }
  }, [activeBattleId, setActiveBattle]);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-2">
          <Scale className="h-5 w-5 text-primary shrink-0" />
          <h2 className="font-semibold hidden sm:block">{t('title')}</h2>
          <Badge variant="secondary" className="text-xs hidden xs:inline-flex">
            {battles.length} {t('history.battles')}
          </Badge>
        </div>
        <Button onClick={handleStartBattle} size="sm" className="gap-1.5">
          <Zap className="h-4 w-4" />
          <span className="hidden sm:inline">{t('startBattle')}</span>
        </Button>
      </div>

      {/* Active Battles Banner */}
      {activeBattles.length > 0 && (
        <div className="px-3 sm:px-4 py-2 bg-primary/10 border-b">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse shrink-0" />
              <span className="text-sm font-medium truncate">
                {activeBattles.length} {t('history.inProgress')}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 shrink-0"
              onClick={() => {
                if (activeBattles[0]) {
                  handleViewBattle(activeBattles[0].id);
                }
              }}
            >
              <span className="hidden xs:inline">{t('viewBattle')}</span>
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-h-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <div className="px-2 sm:px-4 pt-2 border-b overflow-x-auto">
            <TabsList className="h-9 w-full sm:w-auto">
              <TabsTrigger value="battle" className="gap-1 sm:gap-1.5 text-xs px-2 sm:px-3">
                <Zap className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">{t('quickBattle.title')}</span>
              </TabsTrigger>
              <TabsTrigger value="leaderboard" className="gap-1 sm:gap-1.5 text-xs px-2 sm:px-3">
                <Trophy className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">{t('leaderboard.title')}</span>
              </TabsTrigger>
              <TabsTrigger value="heatmap" className="gap-1 sm:gap-1.5 text-xs px-2 sm:px-3">
                <Grid3X3 className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">{t('heatmap.title')}</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-1 sm:gap-1.5 text-xs px-2 sm:px-3">
                <History className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">{t('history.title')}</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="battle" className="flex-1 m-0 min-h-0">
            <ScrollArea className="h-full">
              <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
                {/* Quick Start Card */}
                <div className="rounded-lg border bg-card p-4">
                  <h3 className="font-medium mb-2">{t('quickBattle.title')}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {t('description')}
                  </p>
                  <Button onClick={handleStartBattle} className="w-full gap-2">
                    <Plus className="h-4 w-4" />
                    {t('newBattle')}
                  </Button>
                </div>

                {/* Recent Battles */}
                {recentBattles.length > 0 && (
                  <div className="rounded-lg border bg-card">
                    <div className="px-4 py-3 border-b">
                      <h3 className="font-medium text-sm">{t('history.recentBattles')}</h3>
                    </div>
                    <div className="divide-y">
                      {recentBattles.map((battle) => (
                        <div
                          key={battle.id}
                          className="px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => handleViewBattle(battle.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {battle.prompt.slice(0, 50)}
                                {battle.prompt.length > 50 ? '...' : ''}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-[10px]">
                                  {battle.contestants.length} {t('models')}
                                </Badge>
                                {battle.winnerId && (
                                  <Badge className="text-[10px] bg-primary">
                                    <Trophy className="h-2.5 w-2.5 mr-1" />
                                    {t('winnerSelected')}
                                  </Badge>
                                )}
                                {battle.isTie && (
                                  <Badge variant="secondary" className="text-[10px]">
                                    {t('tie')}
                                  </Badge>
                                )}
                                {!battle.winnerId && !battle.isTie && (
                                  <Badge variant="outline" className="text-[10px] text-yellow-600">
                                    {t('history.inProgress')}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stats Summary */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border bg-card p-3">
                    <div className="text-2xl font-bold">{battles.length}</div>
                    <div className="text-xs text-muted-foreground">{t('history.totalBattles')}</div>
                  </div>
                  <div className="rounded-lg border bg-card p-3">
                    <div className="text-2xl font-bold">{completedBattles.length}</div>
                    <div className="text-xs text-muted-foreground">{t('history.completed')}</div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="leaderboard" className="flex-1 m-0 min-h-0 p-2 sm:p-4 overflow-auto">
            <ArenaLeaderboard />
          </TabsContent>

          <TabsContent value="heatmap" className="flex-1 m-0 min-h-0 p-2 sm:p-4 overflow-auto">
            <ArenaHeatmap />
          </TabsContent>

          <TabsContent value="history" className="flex-1 m-0 min-h-0 p-2 sm:p-4 overflow-auto">
            <ArenaHistory onViewBattle={handleViewBattle} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Arena Dialog */}
      <ArenaDialog
        open={showArenaDialog}
        onOpenChange={setShowArenaDialog}
        initialPrompt={initialPrompt}
        sessionId={sessionId}
        systemPrompt={systemPrompt}
        onBattleStart={() => setActiveTab('battle')}
      />

      {/* Battle View */}
      {(selectedBattleId || activeBattleId) && (
        <ArenaBattleView
          battleId={selectedBattleId || activeBattleId!}
          open={!!(selectedBattleId || activeBattleId)}
          onOpenChange={(open) => {
            if (!open) {
              handleCloseBattle();
            }
          }}
        />
      )}
    </div>
  );
}

export default ArenaChatView;
