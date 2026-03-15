/**
 * useArtifactList - State management hook for artifact list component
 * Extracted from artifact-list.tsx to separate state logic from UI
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
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
  const deleteArtifacts = useArtifactStore((state) => state.deleteArtifacts);
  const artifactWorkspace = useArtifactStore((state) => state.artifactWorkspace);
  const setArtifactWorkspaceFilters = useArtifactStore((state) => state.setArtifactWorkspaceFilters);
  const setArtifactWorkspaceScope = useArtifactStore((state) => state.setArtifactWorkspaceScope);
  const getArtifactsForWorkspace = useArtifactStore((state) => state.getArtifactsForWorkspace);
  const getActiveSession = useSessionStore((state) => state.getActiveSession);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchMode, setBatchMode] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | string[] | null>(null);

  const currentSessionId = sessionId || getActiveSession()?.id;

  useEffect(() => {
    if (currentSessionId && artifactWorkspace.scope === 'session') {
      setArtifactWorkspaceScope('session', currentSessionId);
    }
  }, [artifactWorkspace.scope, currentSessionId, setArtifactWorkspaceScope]);

  const sessionArtifacts = useMemo(() => {
    if (!currentSessionId) return [];

    return getArtifactsForWorkspace({ sessionId: currentSessionId });
  }, [
    artifactWorkspace.recentArtifactIds,
    artifactWorkspace.runtimeFilter,
    artifactWorkspace.scope,
    artifactWorkspace.searchQuery,
    artifactWorkspace.sessionId,
    artifactWorkspace.typeFilter,
    currentSessionId,
    getArtifactsForWorkspace,
  ]);

  const setSearchQuery = useCallback(
    (searchQuery: string) => {
      setArtifactWorkspaceFilters({ searchQuery });
    },
    [setArtifactWorkspaceFilters]
  );

  const setTypeFilter = useCallback(
    (typeFilter: string) => {
      setArtifactWorkspaceFilters({ typeFilter: typeFilter as ArtifactType | 'all' });
    },
    [setArtifactWorkspaceFilters]
  );

  const setRuntimeFilter = useCallback(
    (runtimeFilter: string) => {
      setArtifactWorkspaceFilters({
        runtimeFilter: runtimeFilter as typeof artifactWorkspace.runtimeFilter,
      });
    },
    [artifactWorkspace.runtimeFilter, setArtifactWorkspaceFilters]
  );

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
    searchQuery: artifactWorkspace.searchQuery,
    typeFilter: artifactWorkspace.typeFilter,
    runtimeFilter: artifactWorkspace.runtimeFilter,
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
    setRuntimeFilter,
  };
}
