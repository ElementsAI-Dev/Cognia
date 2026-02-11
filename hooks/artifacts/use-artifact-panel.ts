/**
 * useArtifactPanelState - Extracted state and logic for ArtifactPanel
 * Separates state management from rendering for testability and readability
 */

import { useState, useCallback, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useTranslations } from 'next-intl';
import { useArtifactStore, useSettingsStore, useNativeStore } from '@/stores';
import { downloadFile } from '@/lib/utils/download';
import { opener } from '@/lib/native';
import { loggers } from '@/lib/logger';
import {
  getArtifactExtension,
  canPreview,
  canDesign,
} from '@/lib/artifacts';
import type { Artifact } from '@/types';

function getExtension(artifact: Artifact): string {
  return getArtifactExtension(artifact.type, artifact.language);
}

export function useArtifactPanelState() {
  const t = useTranslations('artifacts');
  const tCommon = useTranslations('common');

  // Store state - using useShallow for optimized subscriptions
  const {
    panelOpen,
    panelView,
    activeArtifactId,
    artifacts,
  } = useArtifactStore(
    useShallow((state) => ({
      panelOpen: state.panelOpen,
      panelView: state.panelView,
      activeArtifactId: state.activeArtifactId,
      artifacts: state.artifacts,
    }))
  );

  // Store actions - using useShallow for stable references
  const {
    closePanel,
    updateArtifact,
    saveArtifactVersion,
    createCanvasDocument,
    setActiveCanvas,
    openPanel,
  } = useArtifactStore(
    useShallow((state) => ({
      closePanel: state.closePanel,
      updateArtifact: state.updateArtifact,
      saveArtifactVersion: state.saveArtifactVersion,
      createCanvasDocument: state.createCanvasDocument,
      setActiveCanvas: state.setActiveCanvas,
      openPanel: state.openPanel,
    }))
  );

  const activeArtifact = activeArtifactId ? artifacts[activeArtifactId] : null;
  const theme = useSettingsStore((state) => state.theme);
  const isDesktop = useNativeStore((state) => state.isDesktop);

  // Local state
  const [viewMode, setViewMode] = useState<'code' | 'preview' | 'edit'>('code');
  const [copied, setCopied] = useState(false);
  const [designerOpen, setDesignerOpen] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [lastDownloadPath, setLastDownloadPath] = useState<string | null>(null);

  // Keyboard shortcuts
  useEffect(() => {
    if (!panelOpen || panelView !== 'artifact') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (e.key === 'Escape') {
        e.preventDefault();
        closePanel();
        return;
      }

      if (!activeArtifact) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 's' && viewMode === 'edit') {
        e.preventDefault();
        if (hasChanges) {
          saveArtifactVersion(activeArtifact.id, 'Before edit');
          updateArtifact(activeArtifact.id, { content: editContent });
          setHasChanges(false);
          setViewMode('code');
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'e' && viewMode !== 'edit') {
        e.preventDefault();
        setEditContent(activeArtifact.content);
        setHasChanges(false);
        setViewMode('edit');
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [panelOpen, panelView, activeArtifact, viewMode, hasChanges, editContent, closePanel, updateArtifact, saveArtifactVersion]);

  // Handlers
  const handleOpenInCanvas = useCallback(() => {
    if (activeArtifact) {
      const docId = createCanvasDocument({
        title: activeArtifact.title,
        content: activeArtifact.content,
        language: activeArtifact.language || 'javascript',
        type: 'code',
      });
      setActiveCanvas(docId);
      openPanel('canvas');
    }
  }, [activeArtifact, createCanvasDocument, setActiveCanvas, openPanel]);

  const handleEditMode = useCallback(() => {
    if (activeArtifact) {
      setEditContent(activeArtifact.content);
      setHasChanges(false);
      setViewMode('edit');
    }
  }, [activeArtifact]);

  const handleSaveEdit = useCallback(() => {
    if (activeArtifact && hasChanges) {
      saveArtifactVersion(activeArtifact.id, 'Before edit');
      updateArtifact(activeArtifact.id, { content: editContent });
      setHasChanges(false);
      setViewMode('code');
    }
  }, [activeArtifact, editContent, hasChanges, updateArtifact, saveArtifactVersion]);

  const handleCancelEdit = useCallback(() => {
    setViewMode('code');
    setHasChanges(false);
  }, []);

  const handleEditorChange = useCallback(
    (value: string | undefined) => {
      setEditContent(value || '');
      setHasChanges(value !== activeArtifact?.content);
    },
    [activeArtifact?.content]
  );

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  const handleCopy = async () => {
    if (activeArtifact) {
      await navigator.clipboard.writeText(activeArtifact.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (activeArtifact) {
      const filename = `${activeArtifact.title}.${getExtension(activeArtifact)}`;
      downloadFile(activeArtifact.content, filename, 'text/plain');
      if (isDesktop) {
        setLastDownloadPath(filename);
      }
    }
  };

  const handleRevealInExplorer = async () => {
    if (!isDesktop || !lastDownloadPath) return;
    try {
      const { downloadDir } = await import('@tauri-apps/api/path');
      const downloadsPath = await downloadDir();
      const fullPath = `${downloadsPath}${lastDownloadPath}`;
      await opener.revealInFileExplorer(fullPath);
    } catch {
      try {
        const { downloadDir } = await import('@tauri-apps/api/path');
        const downloadsPath = await downloadDir();
        await opener.openPath(downloadsPath);
      } catch (err) {
        loggers.ui.error('Failed to reveal in explorer', { error: err instanceof Error ? err.message : String(err) });
      }
    }
  };

  const isPreviewable = activeArtifact ? canPreview(activeArtifact.type) : false;
  const isDesignable = activeArtifact ? canDesign(activeArtifact.type) : false;

  return {
    // Translations
    t,
    tCommon,
    // Store state
    panelOpen,
    panelView,
    activeArtifact,
    theme,
    isDesktop,
    // Local state
    viewMode,
    setViewMode,
    copied,
    designerOpen,
    setDesignerOpen,
    editContent,
    hasChanges,
    isFullscreen,
    showVersionHistory,
    setShowVersionHistory,
    lastDownloadPath,
    // Derived
    isPreviewable,
    isDesignable,
    panelWidth: isFullscreen
      ? 'w-full sm:w-full sm:max-w-full'
      : 'w-full sm:w-[600px] sm:max-w-[600px]',
    // Actions
    closePanel,
    handleOpenInCanvas,
    handleEditMode,
    handleSaveEdit,
    handleCancelEdit,
    handleEditorChange,
    toggleFullscreen,
    handleCopy,
    handleDownload,
    handleRevealInExplorer,
  };
}
