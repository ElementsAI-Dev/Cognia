/**
 * Unit tests for knowledge map store persist config
 */

import { act, renderHook } from '@testing-library/react';
import { useKnowledgeMapStore } from './knowledge-map-store';
import { partializeKnowledgeMapStore } from './knowledge-map-persist-config';

describe('partializeKnowledgeMapStore', () => {
  beforeEach(() => {
    act(() => {
      useKnowledgeMapStore.getState().reset();
    });
  });

  it('should keep only persisted fields', () => {
    const { result } = renderHook(() => useKnowledgeMapStore());

    act(() => {
      result.current.setActiveKnowledgeMap('km-1');
      result.current.setError('temp error');
      result.current.navigateTo({
        knowledgeMapId: 'km-1',
        traceId: 'trace-1',
        pageNumber: 1,
      });
      result.current.updateKnowledgeMap('missing-map', { title: 'noop' });
      result.current.addAnnotation({
        knowledgeMapId: 'km-1',
        type: 'note',
        content: 'annotation',
        locationRef: 'trace-1',
      });
    });

    const persisted = partializeKnowledgeMapStore(result.current);

    expect(persisted).toEqual({
      knowledgeMaps: result.current.knowledgeMaps,
      annotations: result.current.annotations,
    });
    expect(Object.keys(persisted)).toEqual(['knowledgeMaps', 'annotations']);
  });
});
