'use client';

/**
 * ArenaHistory - Battle history with filtering and replay
 * Shows past battles with detailed information
 */

import { memo, useState, useMemo, useCallback } from 'react';
import { useLocale } from 'next-intl';
import { useTranslations } from 'next-intl';
import {
  History,
  Trophy,
  Scale,
  Search,
  Filter,
  Calendar,
  Clock,
  Eye,
  Trash2,
  RotateCcw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { formatBattleDate, formatBattleDuration } from '@/lib/arena';
import { useArenaStore } from '@/stores/arena';
import type { ArenaBattle, ArenaContestant, BattleFilterStatus, BattleSortOrder } from '@/types/arena';

interface ArenaHistoryProps {
  className?: string;
  onViewBattle?: (battleId: string) => void;
  onRematch?: (battle: ArenaBattle) => void;
  maxItems?: number;
}

function BattleCard({
  battle,
  onView,
  onRematch,
  onDelete,
  locale,
}: {
  battle: ArenaBattle;
  onView?: () => void;
  onRematch?: () => void;
  onDelete?: () => void;
  locale?: string;
}) {
  const t = useTranslations('arena');
  const [isExpanded, setIsExpanded] = useState(false);

  const winner = battle.contestants.find((c) => c.id === battle.winnerId);
  const isCompleted = battle.winnerId || battle.isTie;

  const getStatusBadge = () => {
    if (battle.isTie) {
      return (
        <Badge variant="outline" className="text-xs">
          {t('history.tie')}
        </Badge>
      );
    }
    if (battle.winnerId) {
      return <Badge className="text-xs bg-green-600">{t('history.completed')}</Badge>;
    }
    return (
      <Badge variant="secondary" className="text-xs">
        {t('history.pending')}
      </Badge>
    );
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <Card
        className={cn(
          'p-3 py-3 gap-0 transition-colors',
          isExpanded ? 'bg-muted/30' : 'hover:bg-muted/20'
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {getStatusBadge()}
              <span className="text-xs text-muted-foreground">
                {formatBattleDate(new Date(battle.createdAt), locale)}
              </span>
              {battle.mode === 'blind' && (
                <Badge variant="outline" className="text-[10px]">
                  {t('history.blind')}
                </Badge>
              )}
            </div>
            <p className="text-sm line-clamp-2">{battle.prompt}</p>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            {onView && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onView}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('history.viewDetails')}</TooltipContent>
              </Tooltip>
            )}
            {onRematch && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRematch}>
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('history.rematch')}</TooltipContent>
              </Tooltip>
            )}
            {onDelete && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('history.deleteTitle')}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('history.deleteDescription')}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('history.cancel')}</AlertDialogCancel>
                    <AlertDialogAction onClick={onDelete}>{t('history.delete')}</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        {/* Expanded content */}
        <CollapsibleContent className="mt-3 space-y-3">
          {/* Contestants */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">
              {t('history.contestants')} ({battle.contestants.length})
            </div>
            <div className="grid gap-2">
              {battle.contestants.map((contestant: ArenaContestant, index: number) => (
                <div
                  key={contestant.id}
                  className={cn(
                    'flex items-center justify-between p-2 rounded-md bg-background/50',
                    contestant.id === battle.winnerId && 'ring-1 ring-green-500'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="text-[10px] w-5 h-5 p-0 flex items-center justify-center"
                    >
                      {index + 1}
                    </Badge>
                    <div>
                      <div className="text-sm font-medium flex items-center gap-1">
                        {contestant.displayName}
                        {contestant.id === battle.winnerId && (
                          <Trophy className="h-3 w-3 text-yellow-500" />
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">{contestant.provider}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {contestant.latencyMs && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {(contestant.latencyMs / 1000).toFixed(1)}s
                      </div>
                    )}
                    {contestant.tokenCount && (
                      <div>
                        {contestant.tokenCount.total} {t('tokens')}
                      </div>
                    )}
                    {contestant.estimatedCost != null && (
                      <div className="text-emerald-600 dark:text-emerald-400">
                        ${contestant.estimatedCost.toFixed(4)}
                      </div>
                    )}
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px]',
                        contestant.status === 'completed' && 'text-green-600 border-green-300',
                        contestant.status === 'error' && 'text-red-600 border-red-300'
                      )}
                    >
                      {contestant.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Battle parameters */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground pt-2 border-t">
            {battle.taskClassification?.category && (
              <div className="flex items-center gap-1">
                <span className="font-medium">{t('category')}:</span>
                <Badge variant="outline" className="text-[10px]">
                  {battle.taskClassification.category}
                </Badge>
              </div>
            )}
            {battle.conversationMode && (
              <div>
                <span className="font-medium">{t('mode')}:</span>{' '}
                {battle.conversationMode === 'multi' ? t('multiTurn') : t('singleTurn')}
              </div>
            )}
            {battle.modelParameters?.temperature != null && (
              <div>
                <span className="font-medium">Temp:</span> {battle.modelParameters.temperature}
              </div>
            )}
            {battle.modelParameters?.maxTokens != null && (
              <div>
                <span className="font-medium">Max tokens:</span> {battle.modelParameters.maxTokens}
              </div>
            )}
            {battle.mode && (
              <div>
                <span className="font-medium">{t('battleMode')}:</span>{' '}
                {battle.mode === 'blind' ? t('blind') : t('open')}
              </div>
            )}
          </div>

          {/* Winner info */}
          {isCompleted && (
            <div className="flex items-center gap-4 text-xs pt-2 border-t">
              {winner && (
                <div className="flex items-center gap-1">
                  <Trophy className="h-3 w-3 text-yellow-500" />
                  <span className="font-medium">{winner.displayName}</span>
                </div>
              )}
              {battle.isTie && (
                <div className="flex items-center gap-1">
                  <Scale className="h-3 w-3" />
                  <span>{t('history.declaredTie')}</span>
                </div>
              )}
              {battle.winReason && (
                <Badge variant="outline" className="text-[10px]">
                  {t(`reasons.${battle.winReason}`)}
                </Badge>
              )}
              {battle.completedAt && (
                <div className="text-muted-foreground">
                  {t('duration')}:{' '}
                  {formatBattleDuration(new Date(battle.createdAt), new Date(battle.completedAt))}
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          {battle.notes && (
            <div className="text-xs text-muted-foreground pt-2 border-t">
              <span className="font-medium">{t('notes')}:</span> {battle.notes}
            </div>
          )}
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function ArenaHistoryComponent({ className, onViewBattle, onRematch, maxItems = 50 }: ArenaHistoryProps) {
  const t = useTranslations('arena');
  const locale = useLocale();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<BattleFilterStatus>('all');
  const [modelFilter, setModelFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<BattleSortOrder>('newest');

  const battles = useArenaStore((state) => state.battles);
  const deleteBattle = useArenaStore((state) => state.deleteBattle);

  // Get unique models
  const models = useMemo(() => {
    const set = new Set<string>();
    battles.forEach((b) => {
      b.contestants.forEach((c) => {
        set.add(`${c.provider}:${c.model}`);
      });
    });
    return ['all', ...Array.from(set)];
  }, [battles]);

  // Filter and sort battles
  const filteredBattles = useMemo(() => {
    let filtered = [...battles];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (b) =>
          b.prompt.toLowerCase().includes(query) ||
          b.contestants.some((c) => c.displayName.toLowerCase().includes(query))
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((b) => {
        if (statusFilter === 'completed') return b.winnerId && !b.isTie;
        if (statusFilter === 'tie') return b.isTie;
        if (statusFilter === 'error') {
          return !b.winnerId && !b.isTie && b.contestants.every((c) => c.status === 'error');
        }
        if (statusFilter === 'pending') {
          return !b.winnerId && !b.isTie && b.contestants.some(
            (c) => c.status === 'streaming' || c.status === 'pending' || c.status === 'completed'
          );
        }
        return true;
      });
    }

    // Model filter
    if (modelFilter !== 'all') {
      filtered = filtered.filter((b) =>
        b.contestants.some((c) => `${c.provider}:${c.model}` === modelFilter)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

    // Limit
    return filtered.slice(0, maxItems);
  }, [battles, searchQuery, statusFilter, modelFilter, sortOrder, maxItems]);

  const handleDelete = useCallback(
    (battleId: string) => {
      deleteBattle(battleId);
    },
    [deleteBattle]
  );

  if (battles.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
        <History className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">{t('history.noHistory')}</h3>
        <p className="text-sm text-muted-foreground mt-1">{t('history.startBattles')}</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5" />
          <h3 className="text-lg font-semibold">{t('history.title')}</h3>
          <Badge variant="secondary" className="text-xs">
            {t('battlesCount', { count: battles.length })}
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('history.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8"
          />
        </div>

        {/* Status filter */}
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as BattleFilterStatus)}>
          <SelectTrigger className="w-32 h-8">
            <Filter className="h-3 w-3 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('history.allStatus')}</SelectItem>
            <SelectItem value="completed">{t('history.completed')}</SelectItem>
            <SelectItem value="tie">{t('history.tie')}</SelectItem>
            <SelectItem value="pending">{t('history.pending')}</SelectItem>
            <SelectItem value="error">{t('error')}</SelectItem>
          </SelectContent>
        </Select>

        {/* Model filter */}
        <Select value={modelFilter} onValueChange={setModelFilter}>
          <SelectTrigger className="w-40 h-8">
            <SelectValue placeholder="Model" />
          </SelectTrigger>
          <SelectContent>
            {models.map((m) => (
              <SelectItem key={m} value={m}>
                {m === 'all' ? t('history.allModels') : m.split(':')[1]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sort */}
        <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as BattleSortOrder)}>
          <SelectTrigger className="w-28 h-8">
            <Calendar className="h-3 w-3 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">{t('history.newest')}</SelectItem>
            <SelectItem value="oldest">{t('history.oldest')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      <div className="text-xs text-muted-foreground">
        {t('history.showing', { count: filteredBattles.length, total: battles.length })}
      </div>

      {/* Battle list */}
      <ScrollArea className="h-[500px]">
        <div className="space-y-2 pr-4">
          {filteredBattles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">{t('history.noResults')}</div>
          ) : (
            filteredBattles.map((battle) => (
              <BattleCard
                key={battle.id}
                battle={battle}
                locale={locale}
                onView={onViewBattle ? () => onViewBattle(battle.id) : undefined}
                onRematch={onRematch ? () => onRematch(battle) : undefined}
                onDelete={() => handleDelete(battle.id)}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export const ArenaHistory = memo(ArenaHistoryComponent);
export default ArenaHistory;
