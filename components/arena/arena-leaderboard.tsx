'use client';

/**
 * ArenaLeaderboard - Category-specific model rankings with Bradley-Terry ratings
 * Shows confidence intervals, win rates, and tier groupings
 */

import { memo, useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronUp,
  Filter,
  RefreshCw,
  Download,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { getRankBadgeClass, CATEGORY_IDS, exportLeaderboardData } from '@/lib/arena';
import { groupIntoTiers } from '@/lib/ai/arena/bootstrap';
import { useArenaStore } from '@/stores/arena';
import { useLeaderboardData } from '@/hooks/arena';
import { remoteToLocalRating } from '@/types/arena';
import type { ArenaModelRating, LeaderboardSortField, LeaderboardSortDirection } from '@/types/arena';
import type { TaskCategory } from '@/types/provider/auto-router';

interface ArenaLeaderboardProps {
  className?: string;
  compact?: boolean;
}


function getTrendIcon(rating: ArenaModelRating) {
  // This would need historical data to show trends
  // For now, use stability as a proxy
  const stability = rating.stabilityScore || 0;
  if (stability > 0.7) return <TrendingUp className="h-3 w-3 text-green-500" />;
  if (stability < 0.3) return <TrendingDown className="h-3 w-3 text-red-500" />;
  return <Minus className="h-3 w-3 text-muted-foreground" />;
}

function ConfidenceBar({
  rating,
  ci95Lower,
  ci95Upper,
  scaleMin,
  scaleMax,
}: {
  rating: number;
  ci95Lower?: number;
  ci95Upper?: number;
  scaleMin?: number;
  scaleMax?: number;
}) {
  const lower = ci95Lower || rating - 50;
  const upper = ci95Upper || rating + 50;
  const range = upper - lower;
  const minRating = scaleMin ?? 1200;
  const maxRating = scaleMax ?? 1800;
  const scale = maxRating - minRating;

  const leftPercent = Math.max(0, Math.min(100, ((lower - minRating) / scale) * 100));
  const widthPercent = Math.max(1, Math.min(100 - leftPercent, (range / scale) * 100));
  const ratingPercent = Math.max(0, Math.min(100, ((rating - minRating) / scale) * 100));

  return (
    <div className="relative w-full h-4 bg-muted rounded-full overflow-hidden">
      {/* CI range */}
      <div
        className="absolute h-full bg-primary/30 rounded-full"
        style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
      />
      {/* Point estimate */}
      <div
        className="absolute w-1 h-full bg-primary rounded-full"
        style={{ left: `${ratingPercent}%` }}
      />
    </div>
  );
}

function ArenaLeaderboardComponent({ className, compact = false }: ArenaLeaderboardProps) {
  const t = useTranslations('arena');

  const [activeCategory, setActiveCategory] = useState<TaskCategory | 'all'>('all');
  const [sortField, setSortField] = useState<LeaderboardSortField>('rating');
  const [sortDirection, setSortDirection] = useState<LeaderboardSortDirection>('desc');
  const [providerFilter, setProviderFilter] = useState<string>('all');

  const modelRatings = useArenaStore((state) => state.modelRatings);
  const getBTRatings = useArenaStore((state) => state.getBTRatings);
  const recalculateBTRatings = useArenaStore((state) => state.recalculateBTRatings);
  const settings = useArenaStore((state) => state.settings);

  // Remote leaderboard data via sync hook
  const { leaderboard: remoteLeaderboard, status: syncStatus } = useLeaderboardData();
  const remoteRatings = useMemo(
    () => remoteLeaderboard.map(remoteToLocalRating),
    [remoteLeaderboard]
  );

  // BT ratings accessor
  const btRatings = useMemo(() => getBTRatings(), [getBTRatings]);

  // Get unique providers
  const providers = useMemo(() => {
    const set = new Set(modelRatings.map((r) => r.provider));
    return ['all', ...Array.from(set)];
  }, [modelRatings]);

  // Filter and sort ratings
  const sortedRatings = useMemo(() => {
    let filtered = [...modelRatings];

    // Filter by provider
    if (providerFilter !== 'all') {
      filtered = filtered.filter((r) => r.provider === providerFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: number;
      let bValue: number;

      switch (sortField) {
        case 'rating':
          aValue =
            activeCategory === 'all'
              ? a.rating
              : a.categoryRatings[activeCategory as TaskCategory] || a.rating;
          bValue =
            activeCategory === 'all'
              ? b.rating
              : b.categoryRatings[activeCategory as TaskCategory] || b.rating;
          break;
        case 'winRate':
          aValue = a.winRate || 0;
          bValue = b.winRate || 0;
          break;
        case 'battles':
          aValue = a.totalBattles;
          bValue = b.totalBattles;
          break;
        case 'stability':
          aValue = a.stabilityScore || 0;
          bValue = b.stabilityScore || 0;
          break;
        default:
          aValue = a.rating;
          bValue = b.rating;
      }

      return sortDirection === 'desc' ? bValue - aValue : aValue - bValue;
    });

    return filtered;
  }, [modelRatings, sortField, sortDirection, providerFilter, activeCategory]);

  const handleSort = (field: LeaderboardSortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleExport = () => {
    exportLeaderboardData(sortedRatings, activeCategory);
  };

  // Compute tier groupings from CI overlap
  const tierMap = useMemo(() => {
    const ratingsWithCI = sortedRatings
      .filter((r) => r.ci95Lower != null && r.ci95Upper != null)
      .map((r) => ({
        modelId: r.modelId,
        rating: r.rating,
        ci95Lower: r.ci95Lower!,
        ci95Upper: r.ci95Upper!,
      }));
    const tiers = groupIntoTiers(ratingsWithCI);
    const map = new Map<string, string>();
    const tierLabels = ['S', 'A', 'B', 'C', 'D'];
    tiers.forEach((tier, i) => {
      const label = tierLabels[Math.min(i, tierLabels.length - 1)];
      tier.models.forEach((modelId) => map.set(modelId, label));
    });
    return map;
  }, [sortedRatings]);

  // Compute dynamic min/max scale from rating CI bounds (with padding)
  const ciScale = useMemo(() => {
    if (sortedRatings.length === 0) return { min: 1200, max: 1800 };
    const allLowers = sortedRatings.map((r) => r.ci95Lower ?? r.rating - 50);
    const allUppers = sortedRatings.map((r) => r.ci95Upper ?? r.rating + 50);
    const dataMin = Math.min(...allLowers);
    const dataMax = Math.max(...allUppers);
    const padding = Math.max((dataMax - dataMin) * 0.1, 20);
    return {
      min: Math.floor(dataMin - padding),
      max: Math.ceil(dataMax + padding),
    };
  }, [sortedRatings]);

  const SortHeader = ({ field, children }: { field: LeaderboardSortField; children: React.ReactNode }) => (
    <button
      className="flex items-center gap-1 hover:text-foreground transition-colors"
      onClick={() => handleSort(field)}
    >
      {children}
      {sortField === field &&
        (sortDirection === 'desc' ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronUp className="h-3 w-3" />
        ))}
    </button>
  );

  if (modelRatings.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
        <Trophy className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">{t('leaderboard.noData')}</h3>
        <p className="text-sm text-muted-foreground mt-1">{t('leaderboard.startBattles')}</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          <h3 className="text-lg font-semibold">{t('leaderboard.title')}</h3>
          <Badge variant="secondary" className="text-xs">
            {t('modelsCount', { count: modelRatings.length })}
          </Badge>
          {remoteRatings.length > 0 && (
            <Badge variant="outline" className="text-xs">
              {t('leaderboard.globalModels', { count: remoteRatings.length })}
            </Badge>
          )}
          {syncStatus === 'fetching' && (
            <Badge variant="outline" className="text-xs animate-pulse">
              {t('leaderboard.sync.syncing')}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Provider filter */}
          <Select value={providerFilter} onValueChange={setProviderFilter}>
            <SelectTrigger className="w-32 h-8">
              <Filter className="h-3 w-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {providers.map((p) => (
                <SelectItem key={p} value={p}>
                  {p === 'all' ? t('leaderboard.allProviders') : p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Recalculate button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={recalculateBTRatings}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('leaderboard.recalculate')}</TooltipContent>
          </Tooltip>

          {/* Export button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('leaderboard.export')}</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Category tabs */}
      <Tabs
        value={activeCategory}
        onValueChange={(v) => setActiveCategory(v as TaskCategory | 'all')}
      >
        <TabsList className="w-full justify-start overflow-x-auto">
          {CATEGORY_IDS.map((catId) => (
            <TabsTrigger key={catId} value={catId} className="text-xs">
              {t(`leaderboard.categories.${catId}`)}
            </TabsTrigger>
          ))}
        </TabsList>

        {CATEGORY_IDS.map((catId) => (
          <TabsContent key={catId} value={catId} className="mt-4">
            <ScrollArea className={compact ? 'h-[300px]' : 'h-[500px]'}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    {!compact && (
                      <TableHead className="w-16">{t('leaderboard.tier')}</TableHead>
                    )}
                    <TableHead>Model</TableHead>
                    <TableHead className="text-right">
                      <SortHeader field="rating">Rating</SortHeader>
                    </TableHead>
                    {settings.showConfidenceIntervals && !compact && (
                      <TableHead className="w-32">
                        <div className="flex items-center gap-1">
                          95% CI
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-3 w-3 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[200px]">
                              <p className="text-xs">{t('leaderboard.ciTooltip')}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableHead>
                    )}
                    <TableHead className="text-right">
                      <SortHeader field="winRate">Win Rate</SortHeader>
                    </TableHead>
                    <TableHead className="text-right">
                      <SortHeader field="battles">Battles</SortHeader>
                    </TableHead>
                    {!compact && (
                      <TableHead className="text-right">BT</TableHead>
                    )}
                    {!compact && (
                      <TableHead className="text-right">
                        <SortHeader field="stability">Stability</SortHeader>
                      </TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedRatings.map((rating, index) => {
                    const displayRating =
                      catId === 'all'
                        ? rating.rating
                        : rating.categoryRatings[catId as TaskCategory] || rating.rating;

                    return (
                      <TableRow key={rating.modelId}>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              'w-6 h-6 rounded-full p-0 flex items-center justify-center text-[10px]',
                              getRankBadgeClass(index + 1)
                            )}
                          >
                            {index + 1}
                          </Badge>
                        </TableCell>
                        {!compact && (
                          <TableCell>
                            {(() => {
                              const tier = tierMap.get(rating.modelId);
                              if (!tier) return <span className="text-muted-foreground">-</span>;
                              const tierColors: Record<string, string> = {
                                S: 'bg-yellow-500/15 text-yellow-700 border-yellow-300 dark:text-yellow-400',
                                A: 'bg-blue-500/15 text-blue-700 border-blue-300 dark:text-blue-400',
                                B: 'bg-green-500/15 text-green-700 border-green-300 dark:text-green-400',
                                C: 'bg-gray-500/15 text-gray-600 border-gray-300 dark:text-gray-400',
                                D: 'bg-muted text-muted-foreground border-muted',
                              };
                              return (
                                <Badge variant="outline" className={cn('text-[10px] font-bold', tierColors[tier])}>
                                  {t(`leaderboard.tiers.${tier}`)}
                                </Badge>
                              );
                            })()}
                          </TableCell>
                        )}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div>
                              <div className="font-medium text-sm">{rating.model}</div>
                              <div className="text-xs text-muted-foreground">{rating.provider}</div>
                            </div>
                            {getTrendIcon(rating)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {Math.round(displayRating)}
                        </TableCell>
                        {settings.showConfidenceIntervals && !compact && (
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <ConfidenceBar
                                rating={displayRating}
                                ci95Lower={rating.ci95Lower}
                                ci95Upper={rating.ci95Upper}
                                scaleMin={ciScale.min}
                                scaleMax={ciScale.max}
                              />
                              <div className="text-[10px] text-muted-foreground text-center">
                                {rating.ci95Lower ? Math.round(rating.ci95Lower) : '-'} -{' '}
                                {rating.ci95Upper ? Math.round(rating.ci95Upper) : '-'}
                              </div>
                            </div>
                          </TableCell>
                        )}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Progress value={(rating.winRate || 0) * 100} className="w-12 h-1.5" />
                            <span className="text-xs font-mono w-10">
                              {rating.winRate ? `${(rating.winRate * 100).toFixed(0)}%` : '-'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {rating.totalBattles}
                          <span className="text-muted-foreground ml-1">
                            ({rating.wins}W/{rating.losses}L)
                          </span>
                        </TableCell>
                        {!compact && (
                          <TableCell className="text-right font-mono text-xs">
                            {(() => {
                              const bt = btRatings.find((r) => r.modelId === rating.modelId);
                              return bt?.btScore != null ? bt.btScore.toFixed(2) : '-';
                            })()}
                          </TableCell>
                        )}
                        {!compact && (
                          <TableCell className="text-right">
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[10px]',
                                (rating.stabilityScore || 0) > 0.7 &&
                                  'text-green-600 border-green-300',
                                (rating.stabilityScore || 0) < 0.3 && 'text-red-600 border-red-300'
                              )}
                            >
                              {rating.stabilityScore
                                ? `${(rating.stabilityScore * 100).toFixed(0)}%`
                                : '-'}
                            </Badge>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

export const ArenaLeaderboard = memo(ArenaLeaderboardComponent);
export default ArenaLeaderboard;
