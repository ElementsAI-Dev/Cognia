'use client';

/**
 * Blame Summary — File-level AI code attribution summary card.
 * Shows AI vs human code ratio with model breakdown.
 * Inspired by Cursor Blame (Enterprise feature).
 */

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Bot, User, HelpCircle, Blend } from 'lucide-react';
import type { FileBlameStats } from '@/lib/agent-trace/blame-provider';
import { cn } from '@/lib/utils';

interface BlameSummaryProps {
  stats: FileBlameStats;
  className?: string;
  compact?: boolean;
}

export function BlameSummary({ stats, className, compact = false }: BlameSummaryProps) {
  const modelEntries = useMemo(
    () =>
      Object.entries(stats.models)
        .sort(([, a], [, b]) => b - a)
        .map(([model, count]) => ({
          model: model.split('/').pop() || model,
          fullModel: model,
          count,
          percentage: stats.totalLines > 0 ? (count / stats.totalLines) * 100 : 0,
        })),
    [stats]
  );

  if (compact) {
    return (
      <div className={cn('flex items-center gap-2 text-xs', className)}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1">
              <Bot className="h-3 w-3 text-blue-500" />
              <span>{stats.aiPercentage.toFixed(0)}%</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            AI: {stats.aiLines} lines ({stats.aiPercentage.toFixed(1)}%)
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1">
              <User className="h-3 w-3 text-green-500" />
              <span>{stats.humanPercentage.toFixed(0)}%</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            Human: {stats.humanLines} lines ({stats.humanPercentage.toFixed(1)}%)
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          Code Attribution
          <Badge variant="outline" className="text-[10px] font-normal">
            {stats.totalLines} lines
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Attribution bar */}
        <div className="space-y-1.5">
          <div className="flex h-2 rounded-full overflow-hidden bg-muted">
            {stats.aiLines > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className="bg-blue-500 transition-all"
                    style={{ width: `${stats.aiPercentage}%` }}
                  />
                </TooltipTrigger>
                <TooltipContent>AI: {stats.aiLines} lines</TooltipContent>
              </Tooltip>
            )}
            {stats.humanLines > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className="bg-green-500 transition-all"
                    style={{ width: `${stats.humanPercentage}%` }}
                  />
                </TooltipTrigger>
                <TooltipContent>Human: {stats.humanLines} lines</TooltipContent>
              </Tooltip>
            )}
            {stats.mixedLines > 0 && (
              <div
                className="bg-purple-500 transition-all"
                style={{
                  width: `${(stats.mixedLines / stats.totalLines) * 100}%`,
                }}
              />
            )}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            <div className="flex items-center gap-1">
              <Bot className="h-3 w-3 text-blue-500" />
              <span>AI {stats.aiPercentage.toFixed(1)}%</span>
            </div>
            <div className="flex items-center gap-1">
              <User className="h-3 w-3 text-green-500" />
              <span>Human {stats.humanPercentage.toFixed(1)}%</span>
            </div>
            {stats.mixedLines > 0 && (
              <div className="flex items-center gap-1">
                <Blend className="h-3 w-3 text-purple-500" />
                <span>Mixed {((stats.mixedLines / stats.totalLines) * 100).toFixed(1)}%</span>
              </div>
            )}
            {stats.unknownLines > 0 && (
              <div className="flex items-center gap-1">
                <HelpCircle className="h-3 w-3 text-gray-400" />
                <span>Unknown {((stats.unknownLines / stats.totalLines) * 100).toFixed(1)}%</span>
              </div>
            )}
          </div>
        </div>

        {/* Model breakdown */}
        {modelEntries.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">By Model</p>
            {modelEntries.slice(0, 5).map(({ model, fullModel, count, percentage }) => (
              <div key={fullModel} className="flex items-center gap-2 text-xs">
                <span className="truncate min-w-0 flex-1" title={fullModel}>
                  {model}
                </span>
                <span className="text-muted-foreground shrink-0">{count} lines</span>
                <Progress value={percentage} className="w-16 h-1.5 shrink-0" />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default BlameSummary;
