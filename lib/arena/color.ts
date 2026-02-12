/**
 * Arena color utilities - CSS class mappings for arena UI elements
 */

import type { ProviderName } from '@/types/provider';

/**
 * Get CSS classes for win rate heatmap cells
 */
export function getWinRateColor(winRate: number): string {
  if (winRate >= 0.7) return 'bg-green-600 text-white';
  if (winRate >= 0.6) return 'bg-green-500 text-white';
  if (winRate >= 0.55) return 'bg-green-400 text-white';
  if (winRate >= 0.45) return 'bg-gray-300 text-gray-800';
  if (winRate >= 0.4) return 'bg-red-400 text-white';
  if (winRate >= 0.3) return 'bg-red-500 text-white';
  return 'bg-red-600 text-white';
}

/**
 * Format win rate as percentage text
 */
export function getWinRateText(winRate: number): string {
  return `${(winRate * 100).toFixed(0)}%`;
}

/**
 * Get CSS classes for leaderboard rank badges
 */
export function getRankBadgeClass(rank: number): string {
  if (rank === 1) return 'bg-yellow-500 text-yellow-950';
  if (rank === 2) return 'bg-gray-400 text-gray-950';
  if (rank === 3) return 'bg-amber-600 text-amber-950';
  return 'bg-muted text-muted-foreground';
}

/**
 * Get CSS classes for provider badges
 */
export function getProviderColor(provider: ProviderName): string {
  const colors: Record<string, string> = {
    openai: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    anthropic: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    google: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    deepseek: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    groq: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
    mistral: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    xai: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  };
  return colors[provider] || 'bg-gray-100 text-gray-700';
}
