'use client';

/**
 * Arena Diff View - Side-by-side comparison with highlighted differences
 * Uses a simple word-level diff algorithm to show what's different between two responses
 */

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Diff, ArrowLeftRight, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface DiffSegment {
  text: string;
  type: 'common' | 'added' | 'removed';
}

interface ArenaDiffViewProps {
  responseA: string;
  responseB: string;
  labelA?: string;
  labelB?: string;
  className?: string;
}

/**
 * Simple word-level diff using Longest Common Subsequence (LCS)
 * Produces segments marked as common, added, or removed
 */
function computeWordDiff(textA: string, textB: string): { diffA: DiffSegment[]; diffB: DiffSegment[] } {
  const wordsA = textA.split(/(\s+)/);
  const wordsB = textB.split(/(\s+)/);

  const m = wordsA.length;
  const n = wordsB.length;

  // Build LCS table - O(min(m,n)) memory using two-row approach
  const maxLen = 2000;
  if (m > maxLen || n > maxLen) {
    // Fallback for very long texts: show full text without diff
    return {
      diffA: [{ text: textA, type: 'removed' }],
      diffB: [{ text: textB, type: 'added' }],
    };
  }

  // Full DP table needed for backtracking, but allocate typed arrays for better memory efficiency
  const dp: Uint16Array[] = Array.from({ length: m + 1 }, () => new Uint16Array(n + 1));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (wordsA[i - 1] === wordsB[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to get diff
  let i = m;
  let j = n;

  const rawA: Array<{ word: string; type: 'common' | 'removed' }> = [];
  const rawB: Array<{ word: string; type: 'common' | 'added' }> = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && wordsA[i - 1] === wordsB[j - 1]) {
      rawA.unshift({ word: wordsA[i - 1], type: 'common' });
      rawB.unshift({ word: wordsB[j - 1], type: 'common' });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      rawB.unshift({ word: wordsB[j - 1], type: 'added' });
      j--;
    } else {
      rawA.unshift({ word: wordsA[i - 1], type: 'removed' });
      i--;
    }
  }

  // Merge consecutive segments of the same type
  function mergeSegments<T extends 'common' | 'added' | 'removed'>(
    raw: Array<{ word: string; type: T }>
  ): DiffSegment[] {
    const merged: DiffSegment[] = [];
    for (const item of raw) {
      const last = merged[merged.length - 1];
      if (last && last.type === item.type) {
        last.text += item.word;
      } else {
        merged.push({ text: item.word, type: item.type });
      }
    }
    return merged;
  }

  return {
    diffA: mergeSegments(rawA),
    diffB: mergeSegments(rawB),
  };
}

/**
 * Compute similarity percentage between two texts
 */
function computeSimilarity(textA: string, textB: string): number {
  const wordsA = new Set(textA.toLowerCase().split(/\s+/).filter(Boolean));
  const wordsB = new Set(textB.toLowerCase().split(/\s+/).filter(Boolean));
  const intersection = new Set([...wordsA].filter((w) => wordsB.has(w)));
  const union = new Set([...wordsA, ...wordsB]);
  return union.size > 0 ? Math.round((intersection.size / union.size) * 100) : 100;
}

function DiffText({ segments }: { segments: DiffSegment[] }) {
  return (
    <div className="whitespace-pre-wrap text-sm leading-relaxed">
      {segments.map((seg, i) => {
        if (seg.type === 'common') {
          return <span key={i}>{seg.text}</span>;
        }
        if (seg.type === 'added') {
          return (
            <span key={i} className="bg-green-500/20 text-green-700 dark:text-green-400 rounded px-0.5">
              {seg.text}
            </span>
          );
        }
        // removed
        return (
          <span key={i} className="bg-red-500/20 text-red-700 dark:text-red-400 rounded px-0.5 line-through">
            {seg.text}
          </span>
        );
      })}
    </div>
  );
}

export function ArenaDiffView({
  responseA,
  responseB,
  labelA = 'Model A',
  labelB = 'Model B',
  className,
}: ArenaDiffViewProps) {
  const t = useTranslations('arena');
  const [showDiff, setShowDiff] = useState(true);

  const { diffA, diffB } = useMemo(
    () => computeWordDiff(responseA, responseB),
    [responseA, responseB]
  );

  const similarity = useMemo(
    () => computeSimilarity(responseA, responseB),
    [responseA, responseB]
  );

  const similarityColor = similarity > 80 ? 'text-green-600' : similarity > 50 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Diff className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{t('diffView.title')}</span>
          <Badge variant="outline" className={cn('text-xs', similarityColor)}>
            {similarity}% {t('diffView.similar')}
          </Badge>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDiff(!showDiff)}
              className="gap-1.5 h-7 text-xs"
            >
              {showDiff ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              {showDiff
                ? t('diffView.hideDiff')
                : t('diffView.showDiff')}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <ArrowLeftRight className="h-3 w-3 inline mr-1" />
            {t('diffView.toggleTooltip')}
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Side-by-side panels */}
      <div className="grid grid-cols-2 gap-3">
        {/* Model A */}
        <div className="rounded-lg border bg-card">
          <div className="px-3 py-2 border-b bg-muted/50">
            <span className="text-xs font-medium text-muted-foreground">{labelA}</span>
          </div>
          <ScrollArea className="h-[300px] md:h-[400px] lg:h-[500px]">
            <div className="p-3">
              {showDiff ? (
                <DiffText segments={diffA} />
              ) : (
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{responseA}</p>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Model B */}
        <div className="rounded-lg border bg-card">
          <div className="px-3 py-2 border-b bg-muted/50">
            <span className="text-xs font-medium text-muted-foreground">{labelB}</span>
          </div>
          <ScrollArea className="h-[300px] md:h-[400px] lg:h-[500px]">
            <div className="p-3">
              {showDiff ? (
                <DiffText segments={diffB} />
              ) : (
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{responseB}</p>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}

export default ArenaDiffView;
