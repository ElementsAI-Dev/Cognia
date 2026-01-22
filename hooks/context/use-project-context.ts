/**
 * useProjectContext - Hook for building and managing project context in chat
 */

import { useMemo, useCallback } from 'react';
import { useProjectStore } from '@/stores';
import {
  buildProjectContext,
  getRelevantKnowledge,
  searchKnowledgeFiles,
  getKnowledgeBaseStats,
} from '@/lib/document/knowledge-rag';
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
