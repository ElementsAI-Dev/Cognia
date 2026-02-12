/**
 * useArtifactList - State management hook for artifact list component
 * Extracted from artifact-list.tsx to separate state logic from UI
 */

import { useState, useMemo, useCallback, useDeferredValue } from 'react';
import { useArtifactStore, useSessionStore } from '@/stores';
import type { Artifact, ArtifactType } from '@/types';

interface UseArtifactListOptions {
  sessionId?: string;
  onArtifactClick?: (artifact: Artifact) => void;
}

export function useArtifactList({ sessionId, onArtifactClick }: UseArtifactListOptions) {
  const activeArtifactId = useArtifactStore((state) => state.activeArtifactId);
  const setActiveArtifact = useArtifactStore((state) => state.setActiveArtifact);
  const deleteArtifact = useArtifactStore((state) => state.deleteArtifact);
  const openPanel = useArtifactStore((state) => state.openPanel);
  const getSessionArtifacts = useArtifactStore((state) => state.getSessionArtifacts);
  const searchArtifacts = useArtifactStore((state) => state.searchArtifacts);
  const filterArtifactsByType = useArtifactStore((state) => state.filterArtifactsByType);
  const deleteArtifacts = useArtifactStore((state) => state.deleteArtifacts);
  const getActiveSession = useSessionStore((state) => state.getActiveSession);

  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchMode, setBatchMode] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | string[] | null>(null);

  const currentSessionId = sessionId || getActiveSession()?.id;

  const sessionArtifacts = useMemo(() => {
    if (!currentSessionId) return [];

    // All store methods (searchArtifacts, filterArtifactsByType, getSessionArtifacts)
    // already return results sorted by date descending, so no additional sorting needed
    if (deferredSearchQuery.trim()) {
      return searchArtifacts(deferredSearchQuery, currentSessionId);
    }

    if (typeFilter !== 'all') {
      return filterArtifactsByType(typeFilter as ArtifactType, currentSessionId);
    }

    return getSessionArtifacts(currentSessionId);
  }, [currentSessionId, getSessionArtifacts, searchArtifacts, filterArtifactsByType, deferredSearchQuery, typeFilter]);

  const handleArtifactClick = useCallback((artifact: Artifact) => {
    if (batchMode) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(artifact.id)) {
          next.delete(artifact.id);
        } else {
          next.add(artifact.id);
        }
        return next;
      });
      return;
    }
    setActiveArtifact(artifact.id);
    openPanel('artifact');
    onArtifactClick?.(artifact);
  }, [batchMode, setActiveArtifact, openPanel, onArtifactClick]);

  const handleDelete = useCallback((artifactId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPendingDelete(artifactId);
  }, []);

  const handleBatchDelete = useCallback(() => {
    if (selectedIds.size > 0) {
      setPendingDelete(Array.from(selectedIds));
    }
  }, [selectedIds]);

  const confirmDelete = useCallback(() => {
    if (!pendingDelete) return;
    if (Array.isArray(pendingDelete)) {
      deleteArtifacts(pendingDelete);
      setSelectedIds(new Set());
      setBatchMode(false);
    } else {
      deleteArtifact(pendingDelete);
    }
    setPendingDelete(null);
  }, [pendingDelete, deleteArtifact, deleteArtifacts]);

  const toggleBatchMode = useCallback(() => {
    setBatchMode((prev) => !prev);
    setSelectedIds(new Set());
  }, []);

  return {
    // State
    activeArtifactId,
    searchQuery,
    typeFilter,
    selectedIds,
    batchMode,
    pendingDelete,
    sessionArtifacts,
    // Actions
    setSearchQuery,
    setTypeFilter,
    setPendingDelete,
    toggleBatchMode,
    handleArtifactClick,
    handleDelete,
    handleBatchDelete,
    confirmDelete,
  };
}
