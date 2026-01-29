'use client';

/**
 * StorageBreakdown - Visual breakdown of storage usage by category
 */

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  Settings,
  MessageSquare,
  MessageCircle,
  FileCode,
  Bot,
  Image,
  GraduationCap,
  Workflow,
  Puzzle,
  Database,
  Layers,
  FileText,
  Folder,
  Cog,
  MoreHorizontal,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StorageCategoryInfo, StorageCategory } from '@/lib/storage';

/**
 * Icon mapping for categories
 */
const CATEGORY_ICONS: Record<StorageCategory, React.ElementType> = {
  settings: Settings,
  session: MessageSquare,
  chat: MessageCircle,
  artifact: FileCode,
  agent: Bot,
  media: Image,
  learning: GraduationCap,
  workflow: Workflow,
  plugin: Puzzle,
  cache: Database,
  vector: Layers,
  document: FileText,
  project: Folder,
  system: Cog,
  other: MoreHorizontal,
};

/**
 * Color mapping for categories
 */
const CATEGORY_COLORS: Record<StorageCategory, string> = {
  settings: 'bg-blue-500',
  session: 'bg-green-500',
  chat: 'bg-emerald-500',
  artifact: 'bg-purple-500',
  agent: 'bg-orange-500',
  media: 'bg-pink-500',
  learning: 'bg-indigo-500',
  workflow: 'bg-cyan-500',
  plugin: 'bg-yellow-500',
  cache: 'bg-gray-500',
  vector: 'bg-violet-500',
  document: 'bg-amber-500',
  project: 'bg-teal-500',
  system: 'bg-slate-500',
  other: 'bg-zinc-500',
};

interface StorageBreakdownProps {
  categories: StorageCategoryInfo[];
  totalSize: number;
  onClearCategory?: (category: StorageCategory) => void;
  isClearing?: boolean;
  formatBytes: (bytes: number) => string;
  className?: string;
}

export function StorageBreakdown({
  categories,
  totalSize,
  onClearCategory,
  isClearing = false,
  formatBytes,
  className,
}: StorageBreakdownProps) {
  const t = useTranslations('dataSettings');

  // Sort categories by size
  const sortedCategories = useMemo(() => {
    return [...categories]
      .filter((c) => c.totalSize > 0)
      .sort((a, b) => b.totalSize - a.totalSize);
  }, [categories]);

  // Top 5 categories for chart
  const topCategories = sortedCategories.slice(0, 5);
  const otherCategories = sortedCategories.slice(5);
  const otherTotal = otherCategories.reduce((sum, c) => sum + c.totalSize, 0);

  if (sortedCategories.length === 0) {
    return (
      <div className={cn('text-center text-muted-foreground text-sm py-4', className)}>
        {t('noStorageData') || 'No storage data'}
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Visual bar chart */}
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
        {topCategories.map((cat) => {
          const percentage = totalSize > 0 ? (cat.totalSize / totalSize) * 100 : 0;
          return (
            <TooltipProvider key={cat.category}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={cn(CATEGORY_COLORS[cat.category], 'h-full transition-all')}
                    style={{ width: `${percentage}%` }}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">{cat.displayName}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(cat.totalSize)} ({percentage.toFixed(1)}%)
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
        {otherTotal > 0 && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="h-full bg-zinc-400 transition-all"
                  style={{ width: `${(otherTotal / totalSize) * 100}%` }}
                />
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-medium">{t('other') || 'Other'}</p>
                <p className="text-xs text-muted-foreground">
                  {formatBytes(otherTotal)} ({((otherTotal / totalSize) * 100).toFixed(1)}%)
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 text-[10px]">
        {topCategories.map((cat) => {
          const Icon = CATEGORY_ICONS[cat.category];
          return (
            <div key={cat.category} className="flex items-center gap-1">
              <div className={cn('h-2 w-2 rounded-full', CATEGORY_COLORS[cat.category])} />
              <Icon className="h-3 w-3 text-muted-foreground" />
              <span>{cat.displayName}</span>
            </div>
          );
        })}
        {otherTotal > 0 && (
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-zinc-400" />
            <span>{t('other') || 'Other'}</span>
          </div>
        )}
      </div>

      {/* Detailed list */}
      <Collapsible>
        <CollapsibleTrigger className="flex w-full items-center justify-between py-1 text-xs text-muted-foreground hover:text-foreground">
          <span>{t('viewDetails') || 'View details'}</span>
          <ChevronDown className="h-3 w-3" />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-1.5 pt-2">
          {sortedCategories.map((cat) => {
            const Icon = CATEGORY_ICONS[cat.category];
            const percentage = totalSize > 0 ? (cat.totalSize / totalSize) * 100 : 0;

            return (
              <div
                key={cat.category}
                className="flex items-center gap-2 rounded-md border p-1.5 text-xs"
              >
                <div className={cn('h-6 w-6 rounded flex items-center justify-center', CATEGORY_COLORS[cat.category])}>
                  <Icon className="h-3.5 w-3.5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium truncate">{cat.displayName}</span>
                    <span className="text-muted-foreground ml-2">
                      {formatBytes(cat.totalSize)}
                    </span>
                  </div>
                  <Progress value={percentage} className="h-1 mt-0.5" />
                </div>
                {onClearCategory && cat.totalSize > 0 && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => onClearCategory(cat.category)}
                          disabled={isClearing}
                        >
                          <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {t('clearCategory') || 'Clear this category'}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            );
          })}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

export default StorageBreakdown;
