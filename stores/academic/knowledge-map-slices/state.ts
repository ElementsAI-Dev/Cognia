/**
 * Knowledge Map Store - Base State
 */

import type { KnowledgeMapNavigationHistory } from '@/types/learning/knowledge-map';
import type { KnowledgeMapStoreInitialState } from '../knowledge-map-store-types';

export const initialNavigationHistory: KnowledgeMapNavigationHistory = {
  entries: [],
  currentIndex: -1,
};

export const initialKnowledgeMapStoreState: KnowledgeMapStoreInitialState = {
  knowledgeMaps: {},
  activeKnowledgeMapId: null,
  annotations: {},
  navigationHistory: initialNavigationHistory,
  isGenerating: false,
  generationProgress: 0,
  error: null,
};
