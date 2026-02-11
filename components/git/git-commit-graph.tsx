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
import { GitBranch, Tag, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { formatCommitDate } from '@/types/system/git';
import type { GitGraphCommit } from '@/types/system/git';

// ==================== Constants ====================

const LANE_WIDTH = 20;
const NODE_RADIUS = 5;
const ROW_HEIGHT = 32;
const SVG_PADDING_LEFT = 10;
const SVG_PADDING_TOP = 16;

const LANE_COLORS = [
  'hsl(210, 80%, 60%)', // blue
  'hsl(150, 70%, 50%)', // green
  'hsl(30, 90%, 55%)',  // orange
  'hsl(280, 70%, 60%)', // purple
  'hsl(0, 80%, 60%)',   // red
  'hsl(180, 70%, 50%)', // cyan
  'hsl(60, 80%, 50%)',  // yellow
  'hsl(330, 70%, 60%)', // pink
];

// ==================== Lane Algorithm ====================

interface LaneAssignment {
  commits: GitGraphCommit[];
  maxLane: number;
}

function assignLanes(commits: GitGraphCommit[]): LaneAssignment {
  if (commits.length === 0) return { commits: [], maxLane: 0 };

  const hashToIndex = new Map<string, number>();
  commits.forEach((c, i) => hashToIndex.set(c.hash, i));

  // Track which lanes are occupied at each row
  const activeLanes: (string | null)[] = [];
  const result = commits.map((commit) => ({ ...commit, lane: 0 }));

  for (let i = 0; i < result.length; i++) {
    const commit = result[i];

    // Check if this commit is already assigned to a lane (as a parent target)
    let assignedLane = activeLanes.indexOf(commit.hash);

    if (assignedLane === -1) {
      // Find first free lane
      assignedLane = activeLanes.indexOf(null);
      if (assignedLane === -1) {
        assignedLane = activeLanes.length;
        activeLanes.push(null);
      }
    }

    commit.lane = assignedLane;
    activeLanes[assignedLane] = null;

    // Reserve lanes for parents
    for (let p = 0; p < commit.parents.length; p++) {
      const parentHash = commit.parents[p];
      const parentIdx = hashToIndex.get(parentHash);
      if (parentIdx === undefined) continue;

      if (p === 0) {
        // First parent continues in same lane
        if (activeLanes[assignedLane] === null) {
          activeLanes[assignedLane] = parentHash;
        } else {
          // Lane taken, find a new one
          let freeLane = activeLanes.indexOf(null);
          if (freeLane === -1) {
            freeLane = activeLanes.length;
            activeLanes.push(null);
          }
          activeLanes[freeLane] = parentHash;
        }
      } else {
        // Merge parent: assign to a new lane if not already tracked
        const existing = activeLanes.indexOf(parentHash);
        if (existing === -1) {
          let freeLane = activeLanes.indexOf(null);
          if (freeLane === -1) {
            freeLane = activeLanes.length;
            activeLanes.push(null);
          }
          activeLanes[freeLane] = parentHash;
        }
      }
    }
  }

  const maxLane = Math.max(0, ...result.map((c) => c.lane));
  return { commits: result, maxLane };
}

// ==================== Props ====================

interface GitCommitGraphProps {
  commits: GitGraphCommit[];
  selectedCommit?: string | null;
  onCommitClick?: (commit: GitGraphCommit) => void;
  onRefresh?: () => void;
  isLoading?: boolean;
  className?: string;
}

// ==================== Component ====================

export function GitCommitGraph({
  commits,
  selectedCommit,
  onCommitClick,
  onRefresh,
  isLoading,
  className,
}: GitCommitGraphProps) {
  const t = useTranslations('git');
  const [hoveredCommit, setHoveredCommit] = useState<string | null>(null);

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
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <div className="flex items-center gap-2">
          <GitBranch className="h-4 w-4" />
          <span className="text-sm font-medium">{t('graph.title')}</span>
          <Badge variant="secondary" className="text-xs">
            {commits.length}
          </Badge>
        </div>
        {onRefresh && (
          <Button
            variant="ghost"
            size="sm"
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

              return (
                <g key={commit.hash}>
                  {/* Node */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isMerge ? NODE_RADIUS + 1 : NODE_RADIUS}
                    fill={isSelected || isHovered ? color : 'var(--background)'}
                    stroke={color}
                    strokeWidth={isSelected ? 3 : 2}
                    className="cursor-pointer transition-all"
                    onMouseEnter={() => setHoveredCommit(commit.hash)}
                    onMouseLeave={() => setHoveredCommit(null)}
                    onClick={() => onCommitClick?.(commit)}
                  />
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

              return (
                <Tooltip key={commit.hash}>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          'flex items-center gap-2 px-2 cursor-pointer hover:bg-muted/50 transition-colors',
                          isSelected && 'bg-primary/10',
                          isHovered && 'bg-muted/30'
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
              );
            })}
          </div>
          </TooltipProvider>
        </div>
      </ScrollArea>
    </div>
  );
}
