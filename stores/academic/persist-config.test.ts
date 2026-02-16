/**
 * Unit tests for academic store persist config
 */

import { act, renderHook } from '@testing-library/react';
import { partializeAcademicStore } from './persist-config';
import { useAcademicStore } from './academic-store';

describe('partializeAcademicStore', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useAcademicStore());
    act(() => {
      result.current.reset();
    });
  });

  it('should keep only persisted fields', () => {
    const { result } = renderHook(() => useAcademicStore());

    act(() => {
      result.current.setSearchQuery('graph neural network');
      result.current.addSearchHistory('graph neural network');
      result.current.setViewMode('table');
      result.current.setSort('year', 'asc');
      result.current.saveAnalysisResult('paper-1', {
        paperId: 'paper-1',
        analysisType: 'summary',
        content: 'summary',
        createdAt: new Date('2025-01-01T00:00:00.000Z'),
      });
    });

    const persisted = partializeAcademicStore(result.current);

    expect(persisted).toEqual({
      settings: result.current.settings,
      search: {
        searchHistory: ['graph neural network'],
      },
      library: {
        viewMode: 'table',
        sortBy: 'year',
        sortOrder: 'asc',
        analysisHistory: result.current.library.analysisHistory,
      },
    });
  });
});
