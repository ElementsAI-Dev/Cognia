/**
 * Trace Display Utilities
 *
 * Color mapping functions for span types and statuses.
 */

import type { SpanData } from '@/types/observability';

/**
 * Get CSS class for span type badge
 */
export function getSpanTypeColor(type: SpanData['type']): string {
  switch (type) {
    case 'generation':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
    case 'tool':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300';
    case 'agent':
      return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300';
  }
}

/**
 * Get CSS class for status text
 */
export function getStatusColor(status: SpanData['status']): string {
  switch (status) {
    case 'success':
      return 'text-green-600 dark:text-green-400';
    case 'error':
      return 'text-red-600 dark:text-red-400';
    default:
      return 'text-yellow-600 dark:text-yellow-400';
  }
}
