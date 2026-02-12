/**
 * MCP Format Utilities
 * Shared formatting functions used across MCP components
 */

import type { PromptMessage, ToolUsageRecord } from '@/types/mcp';

/**
 * Format milliseconds into a human-readable duration string
 * e.g., 500 → "500ms", 1500 → "1.5s", 65000 → "1m 5s"
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${mins}m ${secs}s`;
}

/**
 * Format duration between two Date objects
 * Higher precision variant used in detail views
 */
export function formatDurationFromDates(start: Date, end: Date): string {
  const ms = end.getTime() - start.getTime();
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  return `${Math.floor(ms / 60000)}m ${((ms % 60000) / 1000).toFixed(1)}s`;
}

/**
 * Format a Date into a timestamp string with millisecond precision
 * e.g., "10:30:45.123"
 */
export function formatTimestamp(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
  });
}

/**
 * Format a Unix timestamp into a relative time string
 * e.g., "<1m ago", "5m ago", "2h ago"
 */
export function formatRelativeTimestamp(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return '<1m ago';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return `${Math.floor(diff / 3600000)}h ago`;
}

/**
 * Format a Unix timestamp into a compact relative string (no "ago" suffix)
 * e.g., "<1m", "5m", "2h", "3d"
 */
export function formatLastUsed(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff < 60000) return '<1m';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  return `${Math.floor(diff / 86400000)}d`;
}

/**
 * Format a tool name from snake_case/kebab-case to Title Case
 * e.g., "read-file" → "Read File", "list_tools" → "List Tools"
 */
export function formatToolName(name: string): string {
  return name
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Format latency in milliseconds for display
 * e.g., undefined → "-", 0.5 → "<1ms", 150 → "150ms"
 */
export function formatLatency(ms?: number): string {
  if (ms === undefined) return '-';
  if (ms < 1) return '<1ms';
  return `${Math.round(ms)}ms`;
}

/**
 * Format execution time for compact display
 * e.g., 500 → "500ms", 1500 → "1.5s"
 */
export function formatExecutionTime(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

/**
 * Flatten prompt messages into a single text string
 */
export function flattenPromptMessages(messages: PromptMessage[]): string {
  return messages
    .map((message) => {
      if (typeof message.content === 'string') return message.content;
      if (Array.isArray(message.content)) {
        return message.content
          .map((item) => (item.type === 'text' ? item.text : JSON.stringify(item)))
          .join('\n');
      }
      return '';
    })
    .join('\n');
}

/**
 * Extract display name from a full tool name (mcp_serverId_toolName → toolName)
 */
export function getToolDisplayName(toolName: string): string {
  const parts = toolName.split('_');
  if (parts.length > 2) {
    return parts.slice(2).join('_');
  }
  return toolName;
}

/**
 * Extract server name from a full tool name (mcp_serverId_toolName → serverId)
 */
export function getServerNameFromToolName(toolName: string): string {
  const parts = toolName.split('_');
  if (parts.length > 1) {
    return parts[1];
  }
  return '';
}

/**
 * Calculate success rate percentage from a ToolUsageRecord
 */
export function getSuccessRate(record: ToolUsageRecord): number {
  if (record.usageCount === 0) return 0;
  return Math.round((record.successCount / record.usageCount) * 100);
}

/**
 * Get elapsed time string from an ActiveToolCall-like object
 */
export function getElapsedTime(startedAt: Date, completedAt?: Date | null): string {
  const end = completedAt || new Date();
  const ms = end.getTime() - startedAt.getTime();
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}
