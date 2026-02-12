'use client';

/**
 * Arena Stats Dashboard - Displays aggregate battle statistics
 * Shows total battles, model usage, category distribution, voting patterns
 */

import { memo, useMemo } from 'react';
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
import { computeArenaStats } from '@/lib/arena';
import { useArenaStore, selectBattles, selectModelRatings, selectPreferences } from '@/stores/arena';

interface ArenaStatsProps {
  className?: string;
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

function ArenaStatsComponent({ className }: ArenaStatsProps) {
  const t = useTranslations('arena');

  const battles = useArenaStore(selectBattles);
  const modelRatings = useArenaStore(selectModelRatings);
  const preferences = useArenaStore(selectPreferences);

  const stats = useMemo(() => computeArenaStats(battles, modelRatings), [battles, modelRatings]);

  if (stats.totalBattles === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-16 text-muted-foreground', className)}>
        <BarChart3 className="h-12 w-12 mb-4 opacity-30" />
        <p className="text-lg font-medium">{t('stats.noData')}</p>
        <p className="text-sm">{t('stats.startBattles')}</p>
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
            label={t('stats.totalBattles')}
            value={stats.totalBattles}
            subValue={`${stats.completedCount} ${t('stats.completed')}`}
          />
          <StatCard
            icon={Trophy}
            label={t('stats.decisiveVotes')}
            value={stats.decisiveCount}
            subValue={`${stats.tieCount} ${t('stats.ties')}, ${stats.bothBadCount} ${t('stats.bothBad')}`}
          />
          <StatCard
            icon={Users}
            label={t('stats.uniqueModels')}
            value={stats.uniqueModelCount}
            subValue={`${preferences.length} ${t('stats.preferences')}`}
          />
          <StatCard
            icon={Clock}
            label={t('stats.avgTime')}
            value={stats.avgResponseTime > 0 ? `${stats.avgResponseTime}s` : '—'}
            subValue={`${stats.blindModePercent}% ${t('stats.blindMode')}`}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Top Models by Usage */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                {t('stats.topModels')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {stats.modelStats.slice(0, 8).map((model) => (
                <div key={model.modelId} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium truncate">{model.displayName}</span>
                      <span className="text-xs text-muted-foreground ml-2 shrink-0">
                        {model.battleCount} {t('stats.battles')}
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
                  {t('stats.noModels')}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Category Distribution */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Hash className="h-4 w-4" />
                {t('stats.categories')}
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
                  {t('stats.noCategories')}
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
              {t('stats.votingPatterns')}
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
                <p className="text-xs text-muted-foreground">{t('stats.decisiveRate')}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">
                  {stats.completedCount > 0
                    ? Math.round((stats.tieCount / stats.completedCount) * 100)
                    : 0}%
                </p>
                <p className="text-xs text-muted-foreground">{t('stats.tieRate')}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{stats.multiTurnCount}</p>
                <p className="text-xs text-muted-foreground">{t('stats.multiTurn')}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{stats.blindModeCount}</p>
                <p className="text-xs text-muted-foreground">{t('stats.blindBattles')}</p>
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
                      {t('stats.topRated')}: {stats.topRating.model}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t('stats.rating')}: {Math.round(stats.topRating.rating)} ·{' '}
                      {t('stats.winRate')}: {Math.round((stats.topRating.winRate || 0) * 100)}% ·{' '}
                      {stats.topRating.totalBattles} {t('stats.battles')}
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

export const ArenaStats = memo(ArenaStatsComponent);
export default ArenaStats;
