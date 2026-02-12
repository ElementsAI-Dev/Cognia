/**
 * Arena formatting utilities - date and duration formatting for battle history
 */

/**
 * Format a date for battle history display
 */
export function formatBattleDate(date: Date, locale: string = 'en-US'): string {
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * Format duration between two dates for battle display
 */
export function formatBattleDuration(startDate: Date, endDate?: Date): string {
  if (!endDate) return '-';
  const ms = endDate.getTime() - startDate.getTime();
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${seconds % 60}s`;
}
