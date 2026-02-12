'use client';

/**
 * ArenaHeatmap - Win fraction heatmap for head-to-head model comparisons
 * Visualizes pairwise win rates in a matrix format
 */

import { memo, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Grid3X3, Info, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { getWinRateColor, getWinRateText, buildWinRateMatrix } from '@/lib/arena';
import type { MatrixModelInfo } from '@/lib/arena';
import { useArenaStore } from '@/stores/arena';
import type { ArenaHeadToHead } from '@/types/arena';

interface ArenaHeatmapProps {
  className?: string;
  maxModels?: number;
}

function ArenaHeatmapComponent({ className, maxModels = 15 }: ArenaHeatmapProps) {
  const t = useTranslations('arena');

  const [cellSize, setCellSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [hoveredCell, setHoveredCell] = useState<{ row: string; col: string } | null>(null);

  const modelRatings = useArenaStore((state) => state.modelRatings);
  const getHeadToHead = useArenaStore((state) => state.getHeadToHead);

  const headToHead = useMemo(() => getHeadToHead(), [getHeadToHead]);

  // Get top models by rating (limited to maxModels)
  const topModels: MatrixModelInfo[] = useMemo(() => {
    return [...modelRatings]
      .sort((a, b) => b.rating - a.rating)
      .slice(0, maxModels)
      .map((r) => ({
        id: r.modelId,
        name: r.model,
        provider: r.provider,
        rating: r.rating,
      }));
  }, [modelRatings, maxModels]);

  // Build win rate matrix
  const matrix = useMemo(
    () => buildWinRateMatrix(topModels, headToHead),
    [topModels, headToHead]
  );

  const cellSizeClasses = {
    sm: 'w-8 h-8 text-[8px]',
    md: 'w-12 h-12 text-[10px]',
    lg: 'w-16 h-16 text-xs',
  };

  const labelSizeClasses = {
    sm: 'w-20 text-[8px]',
    md: 'w-28 text-[10px]',
    lg: 'w-36 text-xs',
  };

  if (topModels.length < 2) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
        <Grid3X3 className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">{t('heatmap.noData')}</h3>
        <p className="text-sm text-muted-foreground mt-1">{t('heatmap.needMoreModels')}</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Grid3X3 className="h-5 w-5" />
          <h3 className="text-lg font-semibold">{t('heatmap.title')}</h3>
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-4 w-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-[250px]">
              <p className="text-xs">{t('heatmap.tooltip')}</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setCellSize('sm')}
            disabled={cellSize === 'sm'}
          >
            <ZoomOut className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setCellSize('lg')}
            disabled={cellSize === 'lg'}
          >
            <ZoomIn className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-muted-foreground">{t('heatmap.rowWinsVsColumn')}</span>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-red-600" />
          <span>0%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-gray-300" />
          <span>50%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-green-600" />
          <span>100%</span>
        </div>
      </div>

      <Separator />

      {/* Matrix */}
      <ScrollArea className="max-h-[600px]">
        <div className="inline-block">
          {/* Column headers */}
          <div className="flex">
            <div className={cn('shrink-0', labelSizeClasses[cellSize])} />
            {topModels.map((model) => (
              <Tooltip key={`col-${model.id}`}>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      'shrink-0 flex items-end justify-center pb-1 font-medium truncate',
                      cellSizeClasses[cellSize],
                      hoveredCell?.col === model.id && 'bg-muted/50'
                    )}
                    style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
                  >
                    {model.name.slice(0, 10)}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">{model.name}</p>
                  <p className="text-xs text-muted-foreground">{model.provider}</p>
                  <p className="text-xs">Rating: {Math.round(model.rating)}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>

          {/* Rows */}
          {topModels.map((rowModel) => (
            <div key={`row-${rowModel.id}`} className="flex">
              {/* Row header */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      'shrink-0 flex items-center pr-2 font-medium truncate',
                      labelSizeClasses[cellSize],
                      hoveredCell?.row === rowModel.id && 'bg-muted/50'
                    )}
                  >
                    {rowModel.name.slice(0, 12)}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">{rowModel.name}</p>
                  <p className="text-xs text-muted-foreground">{rowModel.provider}</p>
                  <p className="text-xs">Rating: {Math.round(rowModel.rating)}</p>
                </TooltipContent>
              </Tooltip>

              {/* Cells */}
              {topModels.map((colModel) => {
                const data = matrix[rowModel.id]?.[colModel.id];
                const isDiagonal = rowModel.id === colModel.id;
                const hasData = data && data.games > 0;

                return (
                  <Tooltip key={`cell-${rowModel.id}-${colModel.id}`}>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          'shrink-0 flex items-center justify-center border border-background transition-all',
                          cellSizeClasses[cellSize],
                          isDiagonal
                            ? 'bg-muted/30'
                            : hasData
                              ? getWinRateColor(data.winRate)
                              : 'bg-muted/10 text-muted-foreground',
                          hoveredCell?.row === rowModel.id && 'ring-1 ring-primary',
                          hoveredCell?.col === colModel.id && 'ring-1 ring-primary'
                        )}
                        onMouseEnter={() => setHoveredCell({ row: rowModel.id, col: colModel.id })}
                        onMouseLeave={() => setHoveredCell(null)}
                      >
                        {isDiagonal ? '-' : hasData ? getWinRateText(data.winRate) : '?'}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      {isDiagonal ? (
                        <p className="text-xs">{t('heatmap.sameModel')}</p>
                      ) : hasData ? (
                        <div className="space-y-1">
                          <p className="font-medium">
                            {rowModel.name} vs {colModel.name}
                          </p>
                          <p className="text-xs">
                            {t('heatmap.winRate')}: {getWinRateText(data.winRate)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {t('heatmap.gamesPlayed', { count: data.games })}
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs">{t('heatmap.noBattlesYet')}</p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Summary stats */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
        <div>
          <Badge variant="outline" className="text-[10px]">
            {t('modelsCount', { count: topModels.length })}
          </Badge>
        </div>
        <div>
          <Badge variant="outline" className="text-[10px]">
            {t('totalBattles', {
              count: headToHead.reduce((sum: number, h: ArenaHeadToHead) => sum + h.total, 0),
            })}
          </Badge>
        </div>
      </div>
    </div>
  );
}

export const ArenaHeatmap = memo(ArenaHeatmapComponent);
export default ArenaHeatmap;
