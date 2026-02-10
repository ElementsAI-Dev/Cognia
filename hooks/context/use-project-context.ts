/**
 * useProjectContext - Hook for building and managing project context in chat
 * Integrates basic keyword search, advanced RAG pipeline search,
 * vector search, and DB-backed context building.
 */

import { useMemo, useCallback, useState } from 'react';
import { useProjectStore } from '@/stores';
import {
  buildProjectContext,
  getRelevantKnowledge,
  searchKnowledgeFiles,
  getKnowledgeBaseStats,
  searchKnowledgeBaseAdvanced,
  searchKnowledgeBaseVector,
  buildProjectContextFromDB,
  type VectorSearchConfig,
} from '@/lib/document/knowledge-rag';
import type { EmbeddingProvider } from '@/lib/vector/embedding';
import type { KnowledgeFile, Project } from '@/types';

export interface ProjectContextResult {
  systemPrompt: string;
  knowledgeContext: string;
  filesUsed: string[];
  hasKnowledge: boolean;
  stats: {
    totalFiles: number;
    totalSize: number;
    estimatedTokens: number;
  };
}

export interface UseProjectContextOptions {
  maxContextLength?: number;
  useRelevanceFiltering?: boolean;
}

/**
 * Hook to get project context for a session
 */
export function useProjectContext(
  projectId: string | undefined,
  query?: string,
  options: UseProjectContextOptions = {}
): ProjectContextResult | null {
  const getProject = useProjectStore((state) => state.getProject);

  return useMemo(() => {
    if (!projectId) return null;

    const project = getProject(projectId);
    if (!project) return null;

    const context = buildProjectContext(project, query, {
      maxContextLength: options.maxContextLength ?? 6000,
      useRelevanceFiltering: options.useRelevanceFiltering ?? true,
    });

    const stats = getKnowledgeBaseStats(project.knowledgeBase);

    return {
      ...context,
      hasKnowledge: project.knowledgeBase.length > 0,
      stats: {
        totalFiles: stats.totalFiles,
        totalSize: stats.totalSize,
        estimatedTokens: stats.estimatedTokens,
      },
    };
  }, [projectId, query, options.maxContextLength, options.useRelevanceFiltering, getProject]);
}

/**
 * Hook to search project knowledge base
 */
export function useKnowledgeSearch(projectId: string | undefined) {
  const getProject = useProjectStore((state) => state.getProject);

  const search = useCallback(
    (query: string, maxResults: number = 10) => {
      if (!projectId) return [];

      const project = getProject(projectId);
      if (!project) return [];

      return searchKnowledgeFiles(project.knowledgeBase, query, { maxResults });
    },
    [projectId, getProject]
  );

  const getRelevant = useCallback(
    (query: string, maxFiles: number = 5): KnowledgeFile[] => {
      if (!projectId) return [];

      const project = getProject(projectId);
      if (!project) return [];

      return getRelevantKnowledge(project.knowledgeBase, query, maxFiles);
    },
    [projectId, getProject]
  );

  return { search, getRelevant };
}

/**
 * Hook to get knowledge base stats
 */
export function useKnowledgeStats(projectId: string | undefined) {
  const getProject = useProjectStore((state) => state.getProject);

  return useMemo(() => {
    if (!projectId) return null;

    const project = getProject(projectId);
    if (!project) return null;

    return getKnowledgeBaseStats(project.knowledgeBase);
  }, [projectId, getProject]);
}

/**
 * Hook to build context for a specific query
 */
export function useBuildContext(project: Project | undefined) {
  return useCallback(
    (query: string, options: UseProjectContextOptions = {}): ProjectContextResult | null => {
      if (!project) return null;

      const context = buildProjectContext(project, query, {
        maxContextLength: options.maxContextLength ?? 6000,
        useRelevanceFiltering: options.useRelevanceFiltering ?? true,
      });

      const stats = getKnowledgeBaseStats(project.knowledgeBase);

      return {
        ...context,
        hasKnowledge: project.knowledgeBase.length > 0,
        stats: {
          totalFiles: stats.totalFiles,
          totalSize: stats.totalSize,
          estimatedTokens: stats.estimatedTokens,
        },
      };
    },
    [project]
  );
}

/**
 * Format knowledge context for display in UI
 */
export function formatKnowledgeForDisplay(
  files: KnowledgeFile[],
  maxPreviewLength: number = 200
): { name: string; type: string; preview: string; size: number }[] {
  return files.map((file) => ({
    name: file.name,
    type: file.type,
    preview:
      file.content.length > maxPreviewLength
        ? file.content.slice(0, maxPreviewLength) + '...'
        : file.content,
    size: file.size,
  }));
}

// ============================================================================
// Advanced Search Hooks
// ============================================================================

export interface AdvancedSearchConfig {
  embeddingProvider: EmbeddingProvider;
  embeddingModel: string;
  embeddingApiKey: string;
  enableHybridSearch?: boolean;
  enableReranking?: boolean;
  enableQueryExpansion?: boolean;
  topK?: number;
  similarityThreshold?: number;
}

export interface AdvancedSearchResult {
  context: string;
  filesUsed: KnowledgeFile[];
  method: 'pipeline' | 'keyword';
  searchMetadata?: {
    hybridSearchUsed: boolean;
    queryExpansionUsed: boolean;
    rerankingUsed: boolean;
    totalResults: number;
  };
}

/**
 * Hook for advanced RAG pipeline search on project knowledge base.
 * Uses hybrid search, reranking, and query expansion when available.
 * Falls back to keyword search on error.
 */
export function useAdvancedKnowledgeSearch(projectId: string | undefined) {
  const getProject = useProjectStore((state) => state.getProject);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const searchAdvanced = useCallback(
    async (
      query: string,
      config: AdvancedSearchConfig
    ): Promise<AdvancedSearchResult | null> => {
      if (!projectId) return null;

      const project = getProject(projectId);
      if (!project || project.knowledgeBase.length === 0) return null;

      setIsSearching(true);
      setSearchError(null);

      try {
        const result = await searchKnowledgeBaseAdvanced(
          project.knowledgeBase,
          query,
          config
        );
        return result;
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Advanced search failed';
        setSearchError(msg);
        return null;
      } finally {
        setIsSearching(false);
      }
    },
    [projectId, getProject]
  );

  return { searchAdvanced, isSearching, searchError };
}

/**
 * Hook for vector similarity search on project knowledge base.
 * Uses embedding-based similarity matching, falling back to keyword search.
 */
export function useVectorKnowledgeSearch(projectId: string | undefined) {
  const getProject = useProjectStore((state) => state.getProject);
  const [isSearching, setIsSearching] = useState(false);

  const searchByVector = useCallback(
    async (
      query: string,
      config: VectorSearchConfig,
      options: { topK?: number; threshold?: number } = {}
    ): Promise<KnowledgeFile[]> => {
      if (!projectId) return [];

      const project = getProject(projectId);
      if (!project || project.knowledgeBase.length === 0) return [];

      setIsSearching(true);
      try {
        return await searchKnowledgeBaseVector(
          project.knowledgeBase,
          query,
          config,
          options
        );
      } catch {
        return getRelevantKnowledge(project.knowledgeBase, query, options.topK ?? 5);
      } finally {
        setIsSearching(false);
      }
    },
    [projectId, getProject]
  );

  return { searchByVector, isSearching };
}

/**
 * Hook to build project context from the database (IndexedDB) instead of in-memory store.
 * Useful when knowledge files are stored in IndexedDB for large files.
 */
export function useBuildContextFromDB() {
  const [isBuilding, setIsBuilding] = useState(false);

  const buildContext = useCallback(
    async (
      projectId: string,
      query?: string,
      options: UseProjectContextOptions = {}
    ): Promise<ProjectContextResult | null> => {
      setIsBuilding(true);
      try {
        const result = await buildProjectContextFromDB(projectId, query, {
          maxContextLength: options.maxContextLength ?? 6000,
          useRelevanceFiltering: options.useRelevanceFiltering ?? true,
        });

        return {
          ...result,
          hasKnowledge: result.filesUsed.length > 0,
          stats: {
            totalFiles: result.filesUsed.length,
            totalSize: 0,
            estimatedTokens: Math.ceil(result.knowledgeContext.length / 4),
          },
        };
      } catch {
        return null;
      } finally {
        setIsBuilding(false);
      }
    },
    []
  );

  return { buildContext, isBuilding };
}
