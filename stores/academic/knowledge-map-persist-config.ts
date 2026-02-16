/**
 * Knowledge Map Store Persist Config
 */

import type { KnowledgeMapStoreState } from './knowledge-map-store-types';

export function partializeKnowledgeMapStore(state: KnowledgeMapStoreState) {
  return {
    knowledgeMaps: state.knowledgeMaps,
    annotations: state.annotations,
  };
}
