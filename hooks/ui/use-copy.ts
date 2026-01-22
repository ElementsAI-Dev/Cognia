/**
 * Unified Copy Hook - provides consistent copy functionality across the app
 */

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { writeClipboardText } from '@/lib/file/clipboard';

export type CopyFormat = 'text' | 'markdown' | 'json' | 'html';

export interface UseCopyOptions {
  format?: CopyFormat;
  showToast?: boolean;
  toastMessage?: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export interface CopyResult {
  success: boolean;
  error?: Error;
}

export interface UseCopyReturn {
  copy: (content: string, options?: UseCopyOptions) => Promise<CopyResult>;
  copyFormatted: (content: unknown, format: CopyFormat) => Promise<CopyResult>;
  copyMultiple: (contents: string[], separator?: string) => Promise<CopyResult>;
  isCopying: boolean;
  lastCopied: string | null;
  lastCopiedAt: Date | null;
}

/**
 * Format content based on the specified format
 */
function formatContent(content: unknown, format: CopyFormat): string {
  switch (format) {
    case 'json':
      return typeof content === 'string' ? content : JSON.stringify(content, null, 2);

    case 'markdown':
      if (typeof content === 'string') return content;
      if (Array.isArray(content)) {
        return content.map((item, i) => `${i + 1}. ${item}`).join('\n');
      }
      return JSON.stringify(content, null, 2);

    case 'html':
      if (typeof content === 'string') return content;
      return `<pre>${JSON.stringify(content, null, 2)}</pre>`;

    case 'text':
    default:
      if (typeof content === 'string') return content;
      if (typeof content === 'object') {
        return JSON.stringify(content);
      }
      return String(content);
  }
}

/**
 * Unified copy hook for consistent clipboard operations
 */
export function useCopy(defaultOptions?: UseCopyOptions): UseCopyReturn {
  const [isCopying, setIsCopying] = useState(false);
  const [lastCopied, setLastCopied] = useState<string | null>(null);
  const [lastCopiedAt, setLastCopiedAt] = useState<Date | null>(null);

  const copy = useCallback(
    async (content: string, options?: UseCopyOptions): Promise<CopyResult> => {
      const mergedOptions = { ...defaultOptions, ...options };
      const {
        showToast = true,
        toastMessage = 'Copied to clipboard',
        onSuccess,
        onError,
      } = mergedOptions;

      setIsCopying(true);

      try {
        await writeClipboardText(content);

        setLastCopied(content);
        setLastCopiedAt(new Date());

        if (showToast) {
          toast.success(toastMessage);
        }

        onSuccess?.();

        return { success: true };
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Copy failed');

        if (showToast) {
          toast.error('Failed to copy to clipboard');
        }

        onError?.(err);

        return { success: false, error: err };
      } finally {
        setIsCopying(false);
      }
    },
    [defaultOptions]
  );

  const copyFormatted = useCallback(
    async (content: unknown, format: CopyFormat): Promise<CopyResult> => {
      const formattedContent = formatContent(content, format);
      return copy(formattedContent, { format });
    },
    [copy]
  );

  const copyMultiple = useCallback(
    async (contents: string[], separator: string = '\n\n'): Promise<CopyResult> => {
      const combined = contents.join(separator);
      return copy(combined, {
        toastMessage: `Copied ${contents.length} items to clipboard`,
      });
    },
    [copy]
  );

  return {
    copy,
    copyFormatted,
    copyMultiple,
    isCopying,
    lastCopied,
    lastCopiedAt,
  };
}

/**
 * Copy history management
 */
const COPY_HISTORY_KEY = 'cognia-copy-history';
const MAX_HISTORY_ITEMS = 20;

export interface CopyHistoryItem {
  id: string;
  content: string;
  format: CopyFormat;
  timestamp: Date;
  preview: string;
}

export function getCopyHistory(): CopyHistoryItem[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(COPY_HISTORY_KEY);
    if (!stored) return [];

    const items = JSON.parse(stored) as CopyHistoryItem[];
    return items.map((item) => ({
      ...item,
      timestamp: new Date(item.timestamp),
    }));
  } catch {
    return [];
  }
}

export function addToCopyHistory(content: string, format: CopyFormat = 'text'): void {
  if (typeof window === 'undefined') return;

  try {
    const history = getCopyHistory();

    const newItem: CopyHistoryItem = {
      id: crypto.randomUUID(),
      content,
      format,
      timestamp: new Date(),
      preview: content.slice(0, 100) + (content.length > 100 ? '...' : ''),
    };

    // Remove duplicates
    const filtered = history.filter((item) => item.content !== content);

    // Add new item at the beginning
    const updated = [newItem, ...filtered].slice(0, MAX_HISTORY_ITEMS);

    localStorage.setItem(COPY_HISTORY_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage errors
  }
}

export function clearCopyHistory(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(COPY_HISTORY_KEY);
}

export default useCopy;
