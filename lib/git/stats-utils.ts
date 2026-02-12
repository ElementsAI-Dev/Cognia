/**
 * Git Stats Utilities
 *
 * Helper functions for repository statistics visualization,
 * including GitHub-style activity heatmap rendering.
 */

/**
 * Get heatmap cell color based on commit count relative to max.
 * Returns CSS color strings using HSL green scale.
 */
export function getHeatmapColor(count: number, max: number): string {
  if (count === 0) return 'var(--muted)';
  const ratio = count / Math.max(max, 1);
  if (ratio < 0.25) return 'hsl(150, 50%, 75%)';
  if (ratio < 0.5) return 'hsl(150, 60%, 55%)';
  if (ratio < 0.75) return 'hsl(150, 70%, 40%)';
  return 'hsl(150, 80%, 30%)';
}

/**
 * Generate an array of date strings (YYYY-MM-DD) for the last 52 weeks,
 * starting from the most recent Sunday going back.
 */
export function getLast52Weeks(): string[] {
  const days: string[] = [];
  const now = new Date();
  // Go back to the most recent Sunday
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  // Go back 52 weeks
  const start = new Date(startOfWeek);
  start.setDate(start.getDate() - 52 * 7);

  const current = new Date(start);
  while (current <= now) {
    days.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  return days;
}
