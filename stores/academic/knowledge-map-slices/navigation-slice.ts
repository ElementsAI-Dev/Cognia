/**
 * Knowledge Map Store - Navigation Slice
 */

import type {
  KnowledgeMapNavigationActions,
  KnowledgeMapSliceCreator,
} from '../knowledge-map-store-types';

export const createKnowledgeMapNavigationSlice: KnowledgeMapSliceCreator<
  KnowledgeMapNavigationActions
> = (set, get) => ({
  navigateTo: (target) => {
    set((state) => {
      const newEntries = [
        ...state.navigationHistory.entries.slice(0, state.navigationHistory.currentIndex + 1),
        target,
      ];

      return {
        navigationHistory: {
          entries: newEntries,
          currentIndex: newEntries.length - 1,
        },
        activeKnowledgeMapId: target.knowledgeMapId,
      };
    });
  },

  navigateBack: () => {
    set((state) => {
      if (state.navigationHistory.currentIndex <= 0) return state;

      const newIndex = state.navigationHistory.currentIndex - 1;
      const target = state.navigationHistory.entries[newIndex];

      return {
        navigationHistory: {
          ...state.navigationHistory,
          currentIndex: newIndex,
        },
        activeKnowledgeMapId: target?.knowledgeMapId || state.activeKnowledgeMapId,
      };
    });
  },

  navigateForward: () => {
    set((state) => {
      if (state.navigationHistory.currentIndex >= state.navigationHistory.entries.length - 1) {
        return state;
      }

      const newIndex = state.navigationHistory.currentIndex + 1;
      const target = state.navigationHistory.entries[newIndex];

      return {
        navigationHistory: {
          ...state.navigationHistory,
          currentIndex: newIndex,
        },
        activeKnowledgeMapId: target?.knowledgeMapId || state.activeKnowledgeMapId,
      };
    });
  },

  canNavigateBack: () => {
    return get().navigationHistory.currentIndex > 0;
  },

  canNavigateForward: () => {
    const { navigationHistory } = get();
    return navigationHistory.currentIndex < navigationHistory.entries.length - 1;
  },
});
