/**
 * Academic Store Persist Config
 */

import type { AcademicState } from './types';

export function partializeAcademicStore(state: AcademicState) {
  return {
    settings: state.settings,
    search: {
      searchHistory: state.search.searchHistory,
    },
    library: {
      viewMode: state.library.viewMode,
      sortBy: state.library.sortBy,
      sortOrder: state.library.sortOrder,
      analysisHistory: state.library.analysisHistory,
    },
  };
}
