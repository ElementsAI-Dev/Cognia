/**
 * useAcademic - Facade hook for academic mode functionality
 *
 * Composes useAcademicSearch, useAcademicLibrary, and useAcademicAnalysis
 * for backward compatibility. New code should prefer the domain-specific hooks.
 */

'use client';

import { useAcademicStore } from '@/stores/academic';
import { useAcademicSearch } from './use-academic-search';
import { useAcademicLibrary } from './use-academic-library';
import { useAcademicAnalysis } from './use-academic-analysis';
import type { UseAcademicSearchReturn } from './use-academic-search';
import type { UseAcademicLibraryReturn } from './use-academic-library';
import type { UseAcademicAnalysisReturn } from './use-academic-analysis';
import type { AcademicActiveTab } from '@/stores/academic/academic-store';

type SupportedAcademicProvider =
  | 'arxiv'
  | 'semantic-scholar'
  | 'core'
  | 'openalex'
  | 'dblp'
  | 'huggingface-papers';

export interface UseAcademicOptions {
  enableA2UI?: boolean;
  enableWebSearch?: boolean;
  defaultProviders?: SupportedAcademicProvider[];
}

export type UseAcademicReturn = UseAcademicSearchReturn &
  UseAcademicLibraryReturn &
  UseAcademicAnalysisReturn & {
    activeTab: AcademicActiveTab;
    setActiveTab: (tab: AcademicActiveTab) => void;
  };

export function useAcademic(options: UseAcademicOptions = {}): UseAcademicReturn {
  const {
    enableA2UI = true,
    enableWebSearch = true,
    defaultProviders = ['arxiv', 'semantic-scholar'] as SupportedAcademicProvider[],
  } = options;

  const academicStore = useAcademicStore();

  const searchHook = useAcademicSearch({
    enableA2UI,
    enableWebSearch,
    defaultProviders,
  });

  const libraryHook = useAcademicLibrary();

  const analysisHook = useAcademicAnalysis({
    enableA2UI,
  });

  return {
    ...searchHook,
    ...libraryHook,
    ...analysisHook,
    activeTab: academicStore.activeTab,
    setActiveTab: academicStore.setActiveTab,
  };
}

export default useAcademic;
