/**
 * Arena data export utilities
 */

import type { ArenaModelRating } from '@/types/arena';

/**
 * Export leaderboard data as a downloadable JSON file
 */
export function exportLeaderboardData(
  sortedRatings: ArenaModelRating[],
  activeCategory: string
): void {
  const data = sortedRatings.map((r, i) => ({
    rank: i + 1,
    model: r.model,
    provider: r.provider,
    rating: Math.round(r.rating),
    ci95Lower: r.ci95Lower ? Math.round(r.ci95Lower) : null,
    ci95Upper: r.ci95Upper ? Math.round(r.ci95Upper) : null,
    winRate: r.winRate ? (r.winRate * 100).toFixed(1) + '%' : null,
    battles: r.totalBattles,
    wins: r.wins,
    losses: r.losses,
    ties: r.ties,
  }));

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `arena-leaderboard-${activeCategory}-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
