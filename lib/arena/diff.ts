/**
 * Arena diff utilities - word-level diff algorithm for response comparison
 */

import type { DiffSegment } from '@/types/arena';

/**
 * Simple word-level diff using Longest Common Subsequence (LCS)
 * Produces segments marked as common, added, or removed
 */
export function computeWordDiff(textA: string, textB: string): { diffA: DiffSegment[]; diffB: DiffSegment[] } {
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
 * Compute similarity percentage between two texts (Jaccard similarity on words)
 */
export function computeSimilarity(textA: string, textB: string): number {
  const wordsA = new Set(textA.toLowerCase().split(/\s+/).filter(Boolean));
  const wordsB = new Set(textB.toLowerCase().split(/\s+/).filter(Boolean));
  const intersection = new Set([...wordsA].filter((w) => wordsB.has(w)));
  const union = new Set([...wordsA, ...wordsB]);
  return union.size > 0 ? Math.round((intersection.size / union.size) * 100) : 100;
}
