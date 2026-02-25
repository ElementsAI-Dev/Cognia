'use client';

/**
 * Git Commit Graph - SVG-based commit graph visualization
 *
 * Renders a visual commit graph with:
 * - Commit nodes (circles) with branch-colored lanes
 * - Parent-child connections (bezier curves)
 * - Branch/tag labels
 * - Hover tooltips with commit details
 * - Click to select a commit
 */

import { useMemo, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  GitBranch,
  Tag,
  RefreshCw,
  Loader2,
  Search,
  Copy,
  CherryIcon,
  RotateCcw,
  GitBranchPlus,
  TagIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { cn } from '@/lib/utils';
import { formatCommitDate } from '@/types/system/git';
import { assignLanes, LANE_WIDTH, NODE_RADIUS, ROW_HEIGHT, SVG_PADDING_LEFT, SVG_PADDING_TOP, LANE_COLORS } from '@/lib/git';
import type { GitCommitGraphProps } from '@/types/git';

// ==================== Component ====================

export function GitCommitGraph({
  commits,
  selectedCommit,
  onCommitClick,
  onRefresh,
  onLoadMore,
  onCherryPick,
  onRevert,
  onCreateBranch,
  onCreateTag,
  isLoading,
  className,
}: GitCommitGraphProps) {
  const t = useTranslations('git');
  const [hoveredCommit, setHoveredCommit] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter commits by search query
  const filteredCommits = useMemo(() => {
    if (!searchQuery.trim()) return commits;
    const q = searchQuery.toLowerCase();
    return commits.filter(
      (c) =>
        c.message.toLowerCase().includes(q) ||
        c.author.toLowerCase().includes(q) ||
        c.shortHash.toLowerCase().includes(q) ||
        c.hash.toLowerCase().startsWith(q)
    );
  }, [commits, searchQuery]);

  const matchedHashes = useMemo(() => {
    if (!searchQuery.trim()) return null;
    return new Set(filteredCommits.map((c) => c.hash));
  }, [filteredCommits, searchQuery]);

  const { commits: layoutCommits, maxLane } = useMemo(
    () => assignLanes(commits),
    [commits]
  );

  const hashToRow = useMemo(() => {
    const map = new Map<string, number>();
    layoutCommits.forEach((c, i) => map.set(c.hash, i));
    return map;
  }, [layoutCommits]);

  const svgWidth = SVG_PADDING_LEFT + (maxLane + 2) * LANE_WIDTH;
  const svgHeight = SVG_PADDING_TOP + layoutCommits.length * ROW_HEIGHT;

  const getX = useCallback(
    (lane: number) => SVG_PADDING_LEFT + lane * LANE_WIDTH + LANE_WIDTH / 2,
    []
  );
  const getY = useCallback(
    (row: number) => SVG_PADDING_TOP + row * ROW_HEIGHT + ROW_HEIGHT / 2,
    []
  );

  const getLaneColor = useCallback(
    (lane: number) => LANE_COLORS[lane % LANE_COLORS.length],
    []
  );

  // Render connections
  const connections = useMemo(() => {
    const paths: React.ReactNode[] = [];
    layoutCommits.forEach((commit, row) => {
      commit.parents.forEach((parentHash) => {
        const parentRow = hashToRow.get(parentHash);
        if (parentRow === undefined) return;

        const parentCommit = layoutCommits[parentRow];
        if (!parentCommit) return;

        const x1 = getX(commit.lane);
        const y1 = getY(row);
        const x2 = getX(parentCommit.lane);
        const y2 = getY(parentRow);

        const color = getLaneColor(commit.lane);

        if (commit.lane === parentCommit.lane) {
          // Straight line
          paths.push(
            <line
              key={`${commit.hash}-${parentHash}`}
              x1={x1}
              y1={y1 + NODE_RADIUS}
              x2={x2}
              y2={y2 - NODE_RADIUS}
              stroke={color}
              strokeWidth={2}
              opacity={0.7}
            />
          );
        } else {
          // Bezier curve for lane changes
          const midY = (y1 + y2) / 2;
          paths.push(
            <path
              key={`${commit.hash}-${parentHash}`}
              d={`M ${x1} ${y1 + NODE_RADIUS} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2 - NODE_RADIUS}`}
              stroke={color}
              strokeWidth={2}
              fill="none"
              opacity={0.7}
            />
          );
        }
      });
    });
    return paths;
  }, [layoutCommits, hashToRow, getX, getY, getLaneColor]);

  if (commits.length === 0 && !isLoading) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-12 text-muted-foreground', className)}>
        <GitBranch className="h-12 w-12 mb-4 opacity-30" />
        <p className="text-sm">{t('graph.noCommits')}</p>
        {onRefresh && (
          <Button variant="outline" size="sm" className="mt-4" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('graph.refresh')}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2 border-b">
        <div className="flex items-center gap-2 shrink-0">
          <GitBranch className="h-4 w-4" />
          <span className="text-sm font-medium">{t('graph.title')}</span>
          <Badge variant="secondary" className="text-xs">
            {commits.length}
          </Badge>
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('graph.searchPlaceholder')}
            className="h-7 pl-7 text-xs"
          />
        </div>

        {onRefresh && (
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0"
            onClick={onRefresh}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>

      {/* Graph */}
      <ScrollArea className="flex-1">
        <div className="flex">
          {/* SVG Graph Column */}
          <svg
            width={svgWidth}
            height={svgHeight}
            className="shrink-0"
          >
            {connections}
            {layoutCommits.map((commit, row) => {
              const cx = getX(commit.lane);
              const cy = getY(row);
              const color = getLaneColor(commit.lane);
              const isSelected = selectedCommit === commit.hash;
              const isHovered = hoveredCommit === commit.hash;
              const isMerge = commit.parents.length > 1;
              const dimmed = matchedHashes !== null && !matchedHashes.has(commit.hash);

              return (
                <g key={commit.hash} style={{ opacity: dimmed ? 0.25 : 1 }}>
                  {/* Node — diamond for merge, circle for normal */}
                  {isMerge ? (
                    <polygon
                      points={`${cx},${cy - NODE_RADIUS - 1} ${cx + NODE_RADIUS + 1},${cy} ${cx},${cy + NODE_RADIUS + 1} ${cx - NODE_RADIUS - 1},${cy}`}
                      fill={isSelected || isHovered ? color : 'var(--background)'}
                      stroke={color}
                      strokeWidth={isSelected ? 3 : 2}
                      className="cursor-pointer transition-all"
                      onMouseEnter={() => setHoveredCommit(commit.hash)}
                      onMouseLeave={() => setHoveredCommit(null)}
                      onClick={() => onCommitClick?.(commit)}
                    />
                  ) : (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={NODE_RADIUS}
                      fill={isSelected || isHovered ? color : 'var(--background)'}
                      stroke={color}
                      strokeWidth={isSelected ? 3 : 2}
                      className="cursor-pointer transition-all"
                      onMouseEnter={() => setHoveredCommit(commit.hash)}
                      onMouseLeave={() => setHoveredCommit(null)}
                      onClick={() => onCommitClick?.(commit)}
                    />
                  )}
                  {/* Selected ring */}
                  {isSelected && (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={NODE_RADIUS + 4}
                      fill="none"
                      stroke={color}
                      strokeWidth={1.5}
                      opacity={0.5}
                    />
                  )}
                </g>
              );
            })}
          </svg>

          {/* Commit details column */}
          <TooltipProvider delayDuration={300}>
          <div className="flex-1 min-w-0">
            {layoutCommits.map((commit, row) => {
              const isSelected = selectedCommit === commit.hash;
              const isHovered = hoveredCommit === commit.hash;
              const top = SVG_PADDING_TOP + row * ROW_HEIGHT;

              const rowDimmed = matchedHashes !== null && !matchedHashes.has(commit.hash);

              return (
                <ContextMenu key={commit.hash}>
                  <ContextMenuTrigger asChild>
                <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          'flex items-center gap-2 px-2 cursor-pointer hover:bg-muted/50 transition-colors',
                          isSelected && 'bg-primary/10',
                          isHovered && 'bg-muted/30',
                          rowDimmed && 'opacity-25'
                        )}
                        style={{ height: ROW_HEIGHT, marginTop: row === 0 ? top - ROW_HEIGHT / 2 : 0 }}
                        onClick={() => onCommitClick?.(commit)}
                        onMouseEnter={() => setHoveredCommit(commit.hash)}
                        onMouseLeave={() => setHoveredCommit(null)}
                      >
                        {/* Refs */}
                        <div className="flex items-center gap-1 shrink-0">
                          {commit.refs.map((ref) => {
                            const isTag = ref.startsWith('tag:');
                            const label = isTag
                              ? ref.replace('tag: ', '')
                              : ref.replace('HEAD -> ', '').replace('origin/', '');
                            const isHead = ref.includes('HEAD');

                            return (
                              <Badge
                                key={ref}
                                variant={isHead ? 'default' : isTag ? 'outline' : 'secondary'}
                                className="text-[10px] px-1 py-0 h-4 max-w-[100px] truncate"
                              >
                                {isTag && <Tag className="h-2.5 w-2.5 mr-0.5" />}
                                {!isTag && <GitBranch className="h-2.5 w-2.5 mr-0.5" />}
                                {label}
                              </Badge>
                            );
                          })}
                        </div>

                        {/* Message */}
                        <span className="text-sm truncate flex-1 min-w-0">
                          {commit.message}
                        </span>

                        {/* Hash */}
                        <code className="text-[11px] text-muted-foreground font-mono shrink-0">
                          {commit.shortHash}
                        </code>

                        {/* Date */}
                        <span className="text-[11px] text-muted-foreground shrink-0 w-14 text-right">
                          {formatCommitDate(commit.date)}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" align="start" className="max-w-sm">
                      <div className="space-y-1">
                        <p className="font-medium text-sm">{commit.message}</p>
                        <p className="text-xs text-muted-foreground">
                          {commit.author} &lt;{commit.authorEmail}&gt;
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {commit.date}
                        </p>
                        <p className="text-xs font-mono">{commit.hash}</p>
                        {commit.parents.length > 1 && (
                          <p className="text-xs text-muted-foreground">
                            {t('graph.mergeCommit')} ({commit.parents.length} {t('graph.parents')})
                          </p>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem onClick={() => navigator.clipboard.writeText(commit.hash)}>
                      <Copy className="h-3.5 w-3.5 mr-2" />
                      {t('graph.copyHash')}
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    {onCherryPick && (
                      <ContextMenuItem onClick={() => onCherryPick(commit.hash)}>
                        <CherryIcon className="h-3.5 w-3.5 mr-2" />
                        {t('graph.cherryPick')}
                      </ContextMenuItem>
                    )}
                    {onRevert && (
                      <ContextMenuItem onClick={() => onRevert(commit.hash)}>
                        <RotateCcw className="h-3.5 w-3.5 mr-2" />
                        {t('graph.revertCommit')}
                      </ContextMenuItem>
                    )}
                    {onCreateBranch && (
                      <ContextMenuItem onClick={() => onCreateBranch(commit.hash)}>
                        <GitBranchPlus className="h-3.5 w-3.5 mr-2" />
                        {t('graph.createBranch')}
                      </ContextMenuItem>
                    )}
                    {onCreateTag && (
                      <ContextMenuItem onClick={() => onCreateTag(commit.hash)}>
                        <TagIcon className="h-3.5 w-3.5 mr-2" />
                        {t('graph.createTag')}
                      </ContextMenuItem>
                    )}
                  </ContextMenuContent>
                </ContextMenu>
              );
            })}
          </div>
          </TooltipProvider>
        </div>

        {/* Load more */}
        {onLoadMore && (
          <div className="flex justify-center py-3 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={onLoadMore}
              disabled={isLoading}
            >
              {t('graph.loadMore')}
            </Button>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
