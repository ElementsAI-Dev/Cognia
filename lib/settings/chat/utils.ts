/**
 * Chat Settings Utility Functions
 * Centralized utility functions for chat and response settings
 */

import type { SafetySeverity, SeverityBadgeVariant } from '@/types/settings/chat';

/**
 * Get badge variant based on severity level
 * Used for displaying safety rule severity badges
 */
export function getSeverityBadgeVariant(severity: SafetySeverity): SeverityBadgeVariant {
  switch (severity) {
    case 'critical':
    case 'high':
      return 'destructive';
    case 'medium':
      return 'default';
    case 'low':
      return 'secondary';
    default:
      return 'default';
  }
}

/**
 * Format token count for display
 */
export function formatTokenCount(tokens: number): string {
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(1)}M`;
  }
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}K`;
  }
  return tokens.toString();
}

/**
 * Calculate estimated total tokens based on context and max tokens
 */
export function calculateEstimatedTokens(contextLength: number, maxTokens: number): number {
  return contextLength * 500 + maxTokens;
}
