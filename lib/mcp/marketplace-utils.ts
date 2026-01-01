/**
 * MCP Marketplace Utilities
 * Shared utilities for MCP marketplace components
 */

import type { McpMarketplaceSource } from '@/types/mcp-marketplace';

/**
 * Get source color class for badge styling
 * @param source - The marketplace source
 * @returns Tailwind CSS classes for the badge
 */
export function getSourceColor(source: McpMarketplaceSource): string {
  switch (source) {
    case 'cline':
      return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    case 'smithery':
      return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
    case 'glama':
      return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
    default:
      return '';
  }
}

/**
 * Highlight search query in text
 * @param text - The text to highlight in
 * @param query - The search query to highlight
 * @returns Array of text segments with highlight info
 */
export interface HighlightSegment {
  text: string;
  isHighlight: boolean;
}

export function highlightSearchQuery(text: string, query: string): HighlightSegment[] {
  if (!query || !text) {
    return [{ text, isHighlight: false }];
  }

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const segments: HighlightSegment[] = [];
  let lastIndex = 0;

  let index = lowerText.indexOf(lowerQuery);
  while (index !== -1) {
    // Add non-highlighted text before match
    if (index > lastIndex) {
      segments.push({
        text: text.slice(lastIndex, index),
        isHighlight: false,
      });
    }

    // Add highlighted match
    segments.push({
      text: text.slice(index, index + query.length),
      isHighlight: true,
    });

    lastIndex = index + query.length;
    index = lowerText.indexOf(lowerQuery, lastIndex);
  }

  // Add remaining text
  if (lastIndex < text.length) {
    segments.push({
      text: text.slice(lastIndex),
      isHighlight: false,
    });
  }

  return segments.length > 0 ? segments : [{ text, isHighlight: false }];
}

/**
 * Check if environment supports running MCP servers
 * @returns Object with support status and missing dependencies
 */
export interface EnvironmentCheckResult {
  supported: boolean;
  hasNode: boolean;
  hasNpx: boolean;
  nodeVersion?: string;
  missingDeps: string[];
  message?: string;
}

export async function checkMcpEnvironment(): Promise<EnvironmentCheckResult> {
  const result: EnvironmentCheckResult = {
    supported: false,
    hasNode: false,
    hasNpx: false,
    missingDeps: [],
  };

  // Check if we're in a Tauri environment
  const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;

  if (!isTauri) {
    // In web-only mode, we can't run stdio MCP servers
    result.message = 'MCP server installation requires the desktop app';
    return result;
  }

  try {
    // Try to import Tauri shell command
    const { Command } = await import('@tauri-apps/plugin-shell');

    // Check Node.js
    try {
      const nodeCmd = Command.create('node', ['--version']);
      const nodeOutput = await nodeCmd.execute();
      if (nodeOutput.code === 0) {
        result.hasNode = true;
        result.nodeVersion = nodeOutput.stdout.trim();
      }
    } catch {
      result.missingDeps.push('Node.js');
    }

    // Check npx
    try {
      const npxCmd = Command.create('npx', ['--version']);
      const npxOutput = await npxCmd.execute();
      if (npxOutput.code === 0) {
        result.hasNpx = true;
      }
    } catch {
      result.missingDeps.push('npx');
    }

    result.supported = result.hasNode && result.hasNpx;

    if (!result.supported) {
      result.message = `Missing dependencies: ${result.missingDeps.join(', ')}`;
    }
  } catch {
    result.message = 'Unable to check environment';
  }

  return result;
}

/**
 * Retry options for API requests
 */
export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  shouldRetry?: (error: Error, attempt: number) => boolean;
}

/**
 * Execute a function with exponential backoff retry
 * @param fn - The async function to execute
 * @param options - Retry options
 * @returns The result of the function
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    shouldRetry = (error: Error) => {
      // Retry on network errors and 5xx errors
      const message = error.message.toLowerCase();
      return (
        message.includes('network') ||
        message.includes('timeout') ||
        message.includes('fetch') ||
        message.includes('500') ||
        message.includes('502') ||
        message.includes('503') ||
        message.includes('504')
      );
    },
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxRetries || !shouldRetry(lastError, attempt)) {
        throw lastError;
      }

      // Exponential backoff with jitter
      const delay = Math.min(baseDelay * Math.pow(2, attempt) + Math.random() * 1000, maxDelay);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Cache for marketplace item details
 */
const detailsCache = new Map<string, { data: unknown; timestamp: number }>();
const DETAILS_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

/**
 * Get cached item details
 */
export function getCachedDetails<T>(mcpId: string): T | null {
  const cached = detailsCache.get(mcpId);
  if (cached && Date.now() - cached.timestamp < DETAILS_CACHE_DURATION) {
    return cached.data as T;
  }
  return null;
}

/**
 * Set cached item details
 */
export function setCachedDetails<T>(mcpId: string, data: T): void {
  detailsCache.set(mcpId, { data, timestamp: Date.now() });
}

/**
 * Clear details cache
 */
export function clearDetailsCache(): void {
  detailsCache.clear();
}

/**
 * Keyboard navigation helper
 */
export interface KeyboardNavigationState {
  focusedIndex: number;
  itemCount: number;
}

export function handleGridKeyNavigation(
  event: React.KeyboardEvent,
  state: KeyboardNavigationState,
  columnsPerRow: number,
  callbacks: {
    onFocusChange: (index: number) => void;
    onSelect: (index: number) => void;
  }
): boolean {
  const { focusedIndex, itemCount } = state;
  const { onFocusChange, onSelect } = callbacks;

  let newIndex = focusedIndex;
  let handled = true;

  switch (event.key) {
    case 'ArrowRight':
      newIndex = Math.min(focusedIndex + 1, itemCount - 1);
      break;
    case 'ArrowLeft':
      newIndex = Math.max(focusedIndex - 1, 0);
      break;
    case 'ArrowDown':
      newIndex = Math.min(focusedIndex + columnsPerRow, itemCount - 1);
      break;
    case 'ArrowUp':
      newIndex = Math.max(focusedIndex - columnsPerRow, 0);
      break;
    case 'Home':
      newIndex = 0;
      break;
    case 'End':
      newIndex = itemCount - 1;
      break;
    case 'Enter':
    case ' ':
      onSelect(focusedIndex);
      event.preventDefault();
      return true;
    default:
      handled = false;
  }

  if (handled && newIndex !== focusedIndex) {
    event.preventDefault();
    onFocusChange(newIndex);
  }

  return handled;
}
