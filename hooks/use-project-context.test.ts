/**
 * useProjectContext Hook Tests
 */

import { renderHook } from '@testing-library/react';
import {
  useProjectContext,
  useKnowledgeSearch,
  useKnowledgeStats,
  useBuildContext,
  formatKnowledgeForDisplay,
} from './use-project-context';

// Mock dependencies
jest.mock('@/stores', () => ({
  useProjectStore: jest.fn((selector) => {
    const state = {
      getProject: jest.fn((id: string) => {
        if (id === 'test-project') {
          return {
            id: 'test-project',
            name: 'Test Project',
            knowledgeBase: [
              { name: 'doc1.md', type: 'markdown', content: 'Test content 1', size: 100 },
              { name: 'doc2.txt', type: 'text', content: 'Test content 2', size: 200 },
            ],
          };
        }
        return undefined;
      }),
    };
    return selector(state);
  }),
}));

jest.mock('@/lib/document/knowledge-rag', () => ({
  buildProjectContext: jest.fn((project, query, options) => ({
    systemPrompt: `System prompt for ${project.name}`,
    knowledgeContext: 'Knowledge context',
    filesUsed: ['doc1.md'],
  })),
  getRelevantKnowledge: jest.fn((knowledgeBase, query, maxFiles) => 
    knowledgeBase.slice(0, maxFiles)
  ),
  searchKnowledgeFiles: jest.fn((knowledgeBase, query, options) => 
    knowledgeBase.filter((f: { name: string }) => f.name.includes(query.slice(0, 3)))
  ),
  getKnowledgeBaseStats: jest.fn((knowledgeBase) => ({
    totalFiles: knowledgeBase.length,
    totalSize: knowledgeBase.reduce((sum: number, f: { size: number }) => sum + f.size, 0),
    estimatedTokens: 100,
  })),
}));

describe('useProjectContext', () => {
  it('should return null for undefined projectId', () => {
    const { result } = renderHook(() => useProjectContext(undefined));
    expect(result.current).toBeNull();
  });

  it('should return null for non-existent project', () => {
    const { result } = renderHook(() => useProjectContext('non-existent'));
    expect(result.current).toBeNull();
  });

  it('should return context for valid project', () => {
    const { result } = renderHook(() => useProjectContext('test-project'));

    expect(result.current).not.toBeNull();
    expect(result.current?.systemPrompt).toContain('Test Project');
    expect(result.current?.hasKnowledge).toBe(true);
    expect(result.current?.stats.totalFiles).toBe(2);
  });

  it('should pass query to context builder', () => {
    const { result } = renderHook(() => 
      useProjectContext('test-project', 'search query')
    );

    expect(result.current).not.toBeNull();
  });

  it('should respect options', () => {
    const { result } = renderHook(() => 
      useProjectContext('test-project', undefined, {
        maxContextLength: 3000,
        useRelevanceFiltering: false,
      })
    );

    expect(result.current).not.toBeNull();
  });
});

describe('useKnowledgeSearch', () => {
  it('should return search and getRelevant functions', () => {
    const { result } = renderHook(() => useKnowledgeSearch('test-project'));

    expect(typeof result.current.search).toBe('function');
    expect(typeof result.current.getRelevant).toBe('function');
  });

  it('should return empty for undefined projectId', () => {
    const { result } = renderHook(() => useKnowledgeSearch(undefined));

    const searchResults = result.current.search('test');
    const relevantResults = result.current.getRelevant('test');

    expect(searchResults).toEqual([]);
    expect(relevantResults).toEqual([]);
  });

  it('should search knowledge files', () => {
    const { result } = renderHook(() => useKnowledgeSearch('test-project'));

    const searchResults = result.current.search('doc');

    expect(Array.isArray(searchResults)).toBe(true);
  });

  it('should get relevant knowledge', () => {
    const { result } = renderHook(() => useKnowledgeSearch('test-project'));

    const relevantResults = result.current.getRelevant('test query', 3);

    expect(Array.isArray(relevantResults)).toBe(true);
  });
});

describe('useKnowledgeStats', () => {
  it('should return null for undefined projectId', () => {
    const { result } = renderHook(() => useKnowledgeStats(undefined));
    expect(result.current).toBeNull();
  });

  it('should return null for non-existent project', () => {
    const { result } = renderHook(() => useKnowledgeStats('non-existent'));
    expect(result.current).toBeNull();
  });

  it('should return stats for valid project', () => {
    const { result } = renderHook(() => useKnowledgeStats('test-project'));

    expect(result.current).not.toBeNull();
    expect(result.current?.totalFiles).toBe(2);
    expect(result.current?.totalSize).toBe(300);
    expect(result.current?.estimatedTokens).toBe(100);
  });
});

describe('useBuildContext', () => {
  it('should return null builder for undefined project', () => {
    const { result } = renderHook(() => useBuildContext(undefined));

    const context = result.current('test query');
    expect(context).toBeNull();
  });

  it('should build context for valid project', () => {
    const mockProject = {
      id: 'test-project',
      name: 'Test Project',
      knowledgeBase: [
        { name: 'doc1.md', type: 'markdown', content: 'Test', size: 100 },
      ],
    };

    const { result } = renderHook(() => useBuildContext(mockProject as never));

    const context = result.current('test query');

    expect(context).not.toBeNull();
    expect(context?.systemPrompt).toBeDefined();
    expect(context?.hasKnowledge).toBe(true);
  });

  it('should respect options', () => {
    const mockProject = {
      id: 'test-project',
      name: 'Test Project',
      knowledgeBase: [],
    };

    const { result } = renderHook(() => useBuildContext(mockProject as never));

    const context = result.current('query', { maxContextLength: 2000 });
    expect(context).not.toBeNull();
  });
});

describe('formatKnowledgeForDisplay', () => {
  it('should format knowledge files', () => {
    const files = [
      { name: 'doc1.md', type: 'markdown', content: 'Short content', size: 50 },
      { name: 'doc2.txt', type: 'text', content: 'A'.repeat(300), size: 300 },
    ];

    const formatted = formatKnowledgeForDisplay(files as never[]);

    expect(formatted).toHaveLength(2);
    expect(formatted[0].name).toBe('doc1.md');
    expect(formatted[0].preview).toBe('Short content');
    expect(formatted[1].preview.endsWith('...')).toBe(true);
  });

  it('should respect custom preview length', () => {
    const files = [
      { name: 'doc.md', type: 'markdown', content: 'A'.repeat(100), size: 100 },
    ];

    const formatted = formatKnowledgeForDisplay(files as never[], 50);

    expect(formatted[0].preview.length).toBe(53); // 50 + '...'
  });

  it('should handle empty array', () => {
    const formatted = formatKnowledgeForDisplay([]);
    expect(formatted).toEqual([]);
  });
});
