import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useSessionStore } from '@/stores';
import { messageRepository } from '@/lib/db';
import {
  exportSessionsToZip,
  downloadZip,
  estimateExportSize,
  type BatchExportFormat,
  type SessionWithMessages,
} from '@/lib/export';

/**
 * Hook for batch export functionality — session selection, size estimation, export with progress
 */
export function useBatchExport(t: (key: string) => string) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [format, setFormat] = useState<BatchExportFormat>('mixed');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState({ current: 0, total: 0 });
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [estimatedSize, setEstimatedSize] = useState(0);

  const sessions = useSessionStore((state) => state.sessions);

  // Update estimated size when selection changes
  useEffect(() => {
    const updateEstimate = async () => {
      if (selectedIds.size === 0) {
        setEstimatedSize(0);
        return;
      }

      setIsLoadingMessages(true);
      try {
        const sessionsWithMessages: SessionWithMessages[] = [];
        for (const id of selectedIds) {
          const session = sessions.find((s) => s.id === id);
          if (session) {
            const messages = await messageRepository.getBySessionId(id);
            sessionsWithMessages.push({ session, messages });
          }
        }
        setEstimatedSize(estimateExportSize(sessionsWithMessages));
      } catch (error) {
        console.error('Error estimating size:', error);
        toast.error(t('estimateFailed'));
      } finally {
        setIsLoadingMessages(false);
      }
    };

    const debounce = setTimeout(updateEstimate, 300);
    return () => clearTimeout(debounce);
  }, [selectedIds, sessions, t]);

  const toggleSession = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(sessions.map((s) => s.id)));
  }, [sessions]);

  const selectNone = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleExport = useCallback(async (onSuccess?: () => void) => {
    if (selectedIds.size === 0) return;

    setIsExporting(true);

    try {
      const sessionsWithMessages: SessionWithMessages[] = [];
      for (const id of selectedIds) {
        const session = sessions.find((s) => s.id === id);
        if (session) {
          const messages = await messageRepository.getBySessionId(id);
          sessionsWithMessages.push({ session, messages });
        }
      }

      setExportProgress({ current: 0, total: sessionsWithMessages.length });
      const result = await exportSessionsToZip(sessionsWithMessages, {
        format,
        includeIndex: true,
        includeMetadata: true,
        includeAttachments: true,
        theme: 'system',
        onProgress: (current, total) => setExportProgress({ current, total }),
      });

      if (result.success && result.blob) {
        downloadZip(result.blob, result.filename);
        toast.success(t('exportSuccess'));
        onSuccess?.();
      } else {
        console.error('Export failed:', result.error);
        toast.error(result.error || t('exportFailed'));
      }
    } catch (error) {
      console.error('Export failed:', error);
      toast.error(error instanceof Error ? error.message : t('exportFailed'));
    } finally {
      setIsExporting(false);
      setExportProgress({ current: 0, total: 0 });
    }
  }, [selectedIds, sessions, format, t]);

  return {
    sessions,
    selectedIds,
    format,
    setFormat,
    isExporting,
    exportProgress,
    isLoadingMessages,
    estimatedSize,
    toggleSession,
    selectAll,
    selectNone,
    handleExport,
  };
}
