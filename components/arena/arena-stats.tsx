'use client';

/**
 * Arena Stats Dashboard - Displays aggregate battle statistics
 * Shows total battles, model usage, category distribution, voting patterns
 */

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  Swords,
  Trophy,
  BarChart3,
  TrendingUp,
  Clock,
  Hash,
  Percent,
  Users,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useArenaStore, selectBattles, selectModelRatings, selectPreferences } from '@/stores/arena';
import type { ArenaBattle, ArenaModelRating } from '@/types/arena';

interface ArenaStatsProps {
  className?: string;
}

interface ModelUsageStats {
  modelId: string;
  provider: string;
  model: string;
  displayName: string;
  battleCount: number;
  winCount: number;
  winRate: number;
}

interface CategoryStats {
  category: string;
  count: number;
  percentage: number;
}

function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
  className,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subValue?: string;
  className?: string;
}) {
  return (
    <Card className={cn('', className)}>
      <CardContent className="pt-4 pb-3 px-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground truncate">{label}</p>
            <p className="text-lg font-semibold">{value}</p>
            {subValue && (
              <p className="text-xs text-muted-foreground">{subValue}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function computeStats(battles: ArenaBattle[], ratings: ArenaModelRating[]) {
  const completedBattles = battles.filter((b) => b.winnerId || b.isTie || b.isBothBad);
  const totalBattles = battles.length;
  const completedCount = completedBattles.length;
  const tieCount = completedBattles.filter((b) => b.isTie).length;
  const bothBadCount = completedBattles.filter((b) => b.isBothBad).length;
  const decisiveCount = completedBattles.filter((b) => b.winnerId && !b.isTie && !b.isBothBad).length;

  // Average response time (ms between createdAt and completedAt)
  const responseTimes = completedBattles
    .filter((b) => b.completedAt && b.createdAt)
    .map((b) => new Date(b.completedAt!).getTime() - new Date(b.createdAt).getTime());
  const avgResponseTime = responseTimes.length > 0
    ? Math.round(responseTimes.reduce((a, c) => a + c, 0) / responseTimes.length / 1000)
    : 0;

  // Model usage stats
  const modelUsage = new Map<string, { battleCount: number; winCount: number; provider: string; model: string; displayName: string }>();
  for (const battle of battles) {
    for (const c of battle.contestants) {
      const key = `${c.provider}:${c.model}`;
      const existing = modelUsage.get(key) || { battleCount: 0, winCount: 0, provider: c.provider, model: c.model, displayName: c.displayName };
      existing.battleCount++;
      if (battle.winnerId === c.id) {
        existing.winCount++;
      }
      modelUsage.set(key, existing);
    }
  }

  const modelStats: ModelUsageStats[] = Array.from(modelUsage.entries())
    .map(([modelId, stats]) => ({
      modelId,
      ...stats,
      winRate: stats.battleCount > 0 ? stats.winCount / stats.battleCount : 0,
    }))
    .sort((a, b) => b.battleCount - a.battleCount);

  // Category distribution
  const categoryCounts = new Map<string, number>();
  for (const battle of battles) {
    const cat = battle.taskClassification?.category || 'uncategorized';
    categoryCounts.set(cat, (categoryCounts.get(cat) || 0) + 1);
  }
  const categoryStats: CategoryStats[] = Array.from(categoryCounts.entries())
    .map(([category, count]) => ({
      category,
      count,
      percentage: totalBattles > 0 ? Math.round((count / totalBattles) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // Blind mode usage
  const blindModeCount = battles.filter((b) => b.mode === 'blind').length;
  const blindModePercent = totalBattles > 0 ? Math.round((blindModeCount / totalBattles) * 100) : 0;

  // Multi-turn usage
  const multiTurnCount = battles.filter((b) => b.conversationMode === 'multi').length;

  // Unique models used
  const uniqueModels = new Set(battles.flatMap((b) => b.contestants.map((c) => `${c.provider}:${c.model}`)));

  return {
    totalBattles,
    completedCount,
    tieCount,
    bothBadCount,
    decisiveCount,
    avgResponseTime,
    modelStats,
    categoryStats,
    blindModeCount,
    blindModePercent,
    multiTurnCount,
    uniqueModelCount: uniqueModels.size,
    topRating: ratings.length > 0 ? ratings[0] : null,
  };
}

function ArenaStatsComponent({ className }: ArenaStatsProps) {
  const t = useTranslations('arena');

  const battles = useArenaStore(selectBattles);
  const modelRatings = useArenaStore(selectModelRatings);
  const preferences = useArenaStore(selectPreferences);

  const stats = useMemo(() => computeStats(battles, modelRatings), [battles, modelRatings]);

  if (stats.totalBattles === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-16 text-muted-foreground', className)}>
        <BarChart3 className="h-12 w-12 mb-4 opacity-30" />
        <p className="text-lg font-medium">{t('stats.noData', { fallback: 'No battle data yet' })}</p>
        <p className="text-sm">{t('stats.startBattles', { fallback: 'Start some battles to see statistics here' })}</p>
      </div>
    );
  }

  return (
    <ScrollArea className={cn('h-full', className)}>
      <div className="p-4 space-y-6">
        {/* Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            icon={Swords}
            label={t('stats.totalBattles', { fallback: 'Total Battles' })}
            value={stats.totalBattles}
            subValue={`${stats.completedCount} ${t('stats.completed', { fallback: 'completed' })}`}
          />
          <StatCard
            icon={Trophy}
            label={t('stats.decisiveVotes', { fallback: 'Decisive Votes' })}
            value={stats.decisiveCount}
            subValue={`${stats.tieCount} ${t('stats.ties', { fallback: 'ties' })}, ${stats.bothBadCount} ${t('stats.bothBad', { fallback: 'both bad' })}`}
          />
          <StatCard
            icon={Users}
            label={t('stats.uniqueModels', { fallback: 'Models Tested' })}
            value={stats.uniqueModelCount}
            subValue={`${preferences.length} ${t('stats.preferences', { fallback: 'preferences' })}`}
          />
          <StatCard
            icon={Clock}
            label={t('stats.avgTime', { fallback: 'Avg. Battle Time' })}
            value={stats.avgResponseTime > 0 ? `${stats.avgResponseTime}s` : '—'}
            subValue={`${stats.blindModePercent}% ${t('stats.blindMode', { fallback: 'blind mode' })}`}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Top Models by Usage */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                {t('stats.topModels', { fallback: 'Most Battled Models' })}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {stats.modelStats.slice(0, 8).map((model) => (
                <div key={model.modelId} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium truncate">{model.displayName}</span>
                      <span className="text-xs text-muted-foreground ml-2 shrink-0">
                        {model.battleCount} {t('stats.battles', { fallback: 'battles' })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={model.winRate * 100} className="h-1.5 flex-1" />
                      <span className="text-xs text-muted-foreground w-10 text-right">
                        {Math.round(model.winRate * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {stats.modelStats.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t('stats.noModels', { fallback: 'No model data' })}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Category Distribution */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Hash className="h-4 w-4" />
                {t('stats.categories', { fallback: 'Category Distribution' })}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {stats.categoryStats.slice(0, 8).map((cat) => (
                <div key={cat.category} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="outline" className="text-xs capitalize">
                        {cat.category}
                      </Badge>
                      <span className="text-xs text-muted-foreground ml-2">
                        {cat.count} ({cat.percentage}%)
                      </span>
                    </div>
                    <Progress value={cat.percentage} className="h-1.5" />
                  </div>
                </div>
              ))}
              {stats.categoryStats.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t('stats.noCategories', { fallback: 'No category data' })}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Voting Patterns */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Percent className="h-4 w-4" />
              {t('stats.votingPatterns', { fallback: 'Voting Patterns' })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold">
                  {stats.completedCount > 0
                    ? Math.round((stats.decisiveCount / stats.completedCount) * 100)
                    : 0}%
                </p>
                <p className="text-xs text-muted-foreground">{t('stats.decisiveRate', { fallback: 'Decisive Rate' })}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">
                  {stats.completedCount > 0
                    ? Math.round((stats.tieCount / stats.completedCount) * 100)
                    : 0}%
                </p>
                <p className="text-xs text-muted-foreground">{t('stats.tieRate', { fallback: 'Tie Rate' })}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{stats.multiTurnCount}</p>
                <p className="text-xs text-muted-foreground">{t('stats.multiTurn', { fallback: 'Multi-turn' })}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{stats.blindModeCount}</p>
                <p className="text-xs text-muted-foreground">{t('stats.blindBattles', { fallback: 'Blind Battles' })}</p>
              </div>
            </div>

            {/* Top rated model highlight */}
            {stats.topRating && (
              <>
                <Separator className="my-4" />
                <div className="flex items-center gap-3">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  <div>
                    <p className="text-sm font-medium">
                      {t('stats.topRated', { fallback: 'Top Rated' })}: {stats.topRating.model}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t('stats.rating', { fallback: 'Rating' })}: {Math.round(stats.topRating.rating)} ·{' '}
                      {t('stats.winRate', { fallback: 'Win rate' })}: {Math.round((stats.topRating.winRate || 0) * 100)}% ·{' '}
                      {stats.topRating.totalBattles} {t('stats.battles', { fallback: 'battles' })}
                    </p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}

export const ArenaStats = ArenaStatsComponent;
export default ArenaStats;
