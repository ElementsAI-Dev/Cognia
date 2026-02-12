'use client';

/**
 * useCanvasAutoSave - Manages auto-save timer and unsaved changes tracking for Canvas
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseCanvasAutoSaveOptions {
  documentId: string | null;
  content: string;
  onSave: (documentId: string, description?: string, isAutoSave?: boolean) => void;
  onContentUpdate: (documentId: string, content: string) => void;
  autoSaveDelay?: number;
}

export interface UseCanvasAutoSaveReturn {
  localContent: string;
  setLocalContent: (content: string) => void;
  hasUnsavedChanges: boolean;
  handleEditorChange: (value: string | undefined) => void;
  handleManualSave: () => void;
  lastSavedContentRef: React.MutableRefObject<string>;
}

export function useCanvasAutoSave({
  documentId,
  content,
  onSave,
  onContentUpdate,
  autoSaveDelay = 30000,
}: UseCanvasAutoSaveOptions): UseCanvasAutoSaveReturn {
  const [localContent, setLocalContent] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedContentRef = useRef<string>('');

  // Sync local content when document changes
  useEffect(() => {
    // Clear pending auto-save from previous document to prevent stale saves
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }

    if (content !== undefined) {
      // Use microtask to avoid synchronous setState in effect
      queueMicrotask(() => {
        setLocalContent(content);
        lastSavedContentRef.current = content;
        setHasUnsavedChanges(false);
      });
    }
  }, [documentId, content]);

  // Cleanup auto-save timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  const handleEditorChange = useCallback(
    (value: string | undefined) => {
      const newValue = value || '';
      setLocalContent(newValue);
      if (documentId) {
        onContentUpdate(documentId, newValue);
      }

      setHasUnsavedChanges(newValue !== lastSavedContentRef.current);

      // Auto-save after delay of inactivity if there are changes
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }

      if (newValue !== lastSavedContentRef.current && documentId) {
        autoSaveTimerRef.current = setTimeout(() => {
          onSave(documentId, undefined, true);
          lastSavedContentRef.current = newValue;
          setHasUnsavedChanges(false);
        }, autoSaveDelay);
      }
    },
    [documentId, onContentUpdate, onSave, autoSaveDelay]
  );

  const handleManualSave = useCallback(() => {
    if (documentId && hasUnsavedChanges) {
      onSave(documentId, undefined, false);
      lastSavedContentRef.current = localContent;
      setHasUnsavedChanges(false);
    }
  }, [documentId, hasUnsavedChanges, localContent, onSave]);

  return {
    localContent,
    setLocalContent,
    hasUnsavedChanges,
    handleEditorChange,
    handleManualSave,
    lastSavedContentRef,
  };
}

export default useCanvasAutoSave;
