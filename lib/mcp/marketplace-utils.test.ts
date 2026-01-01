/**
 * Tests for MCP Marketplace Utilities
 */

import {
  getSourceColor,
  highlightSearchQuery,
  getCachedDetails,
  setCachedDetails,
  clearDetailsCache,
} from './marketplace-utils';

describe('getSourceColor', () => {
  it('should return correct color for cline', () => {
    expect(getSourceColor('cline')).toBe('bg-blue-500/10 text-blue-600 border-blue-500/20');
  });

  it('should return correct color for smithery', () => {
    expect(getSourceColor('smithery')).toBe('bg-purple-500/10 text-purple-600 border-purple-500/20');
  });

  it('should return correct color for glama', () => {
    expect(getSourceColor('glama')).toBe('bg-emerald-500/10 text-emerald-600 border-emerald-500/20');
  });

  it('should return empty string for all source', () => {
    expect(getSourceColor('all')).toBe('');
  });
});

describe('highlightSearchQuery', () => {
  it('should return single segment for empty query', () => {
    const result = highlightSearchQuery('Hello World', '');
    expect(result).toEqual([{ text: 'Hello World', isHighlight: false }]);
  });

  it('should return single segment for empty text', () => {
    const result = highlightSearchQuery('', 'search');
    expect(result).toEqual([{ text: '', isHighlight: false }]);
  });

  it('should highlight matching text', () => {
    const result = highlightSearchQuery('Hello World', 'World');
    expect(result).toEqual([
      { text: 'Hello ', isHighlight: false },
      { text: 'World', isHighlight: true },
    ]);
  });

  it('should be case insensitive', () => {
    const result = highlightSearchQuery('Hello World', 'world');
    expect(result).toEqual([
      { text: 'Hello ', isHighlight: false },
      { text: 'World', isHighlight: true },
    ]);
  });

  it('should highlight multiple matches', () => {
    const result = highlightSearchQuery('test one test two test', 'test');
    expect(result).toEqual([
      { text: 'test', isHighlight: true },
      { text: ' one ', isHighlight: false },
      { text: 'test', isHighlight: true },
      { text: ' two ', isHighlight: false },
      { text: 'test', isHighlight: true },
    ]);
  });

  it('should highlight at the beginning', () => {
    const result = highlightSearchQuery('Hello World', 'Hello');
    expect(result).toEqual([
      { text: 'Hello', isHighlight: true },
      { text: ' World', isHighlight: false },
    ]);
  });

  it('should highlight entire text', () => {
    const result = highlightSearchQuery('Hello', 'Hello');
    expect(result).toEqual([
      { text: 'Hello', isHighlight: true },
    ]);
  });

  it('should handle no match', () => {
    const result = highlightSearchQuery('Hello World', 'xyz');
    expect(result).toEqual([{ text: 'Hello World', isHighlight: false }]);
  });
});

describe('details cache', () => {
  beforeEach(() => {
    clearDetailsCache();
  });

  it('should return null for uncached item', () => {
    expect(getCachedDetails('uncached-id')).toBeNull();
  });

  it('should cache and retrieve details', () => {
    const details = { mcpId: 'test', name: 'Test Server' };
    setCachedDetails('test-id', details);
    
    const cached = getCachedDetails('test-id');
    expect(cached).toEqual(details);
  });

  it('should clear cache', () => {
    setCachedDetails('test-id', { name: 'Test' });
    expect(getCachedDetails('test-id')).not.toBeNull();
    
    clearDetailsCache();
    expect(getCachedDetails('test-id')).toBeNull();
  });

  it('should handle different types', () => {
    const stringData = 'string data';
    const objectData = { key: 'value', nested: { a: 1 } };
    const arrayData = [1, 2, 3];

    setCachedDetails('string-id', stringData);
    setCachedDetails('object-id', objectData);
    setCachedDetails('array-id', arrayData);

    expect(getCachedDetails<string>('string-id')).toBe(stringData);
    expect(getCachedDetails<typeof objectData>('object-id')).toEqual(objectData);
    expect(getCachedDetails<number[]>('array-id')).toEqual(arrayData);
  });
});
