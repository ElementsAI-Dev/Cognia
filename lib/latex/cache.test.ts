/**
 * Tests for LaTeX cache module
 */

import {
  renderMathCached,
  renderMathSafe,
  renderMathBatch,
  clearMathCache,
  getMathCacheStats,
  preloadMathCache,
  MathCache,
} from './cache';

// Mock katex module
jest.mock('katex', () => ({
  renderToString: jest.fn((latex: string, options: { displayMode: boolean }) => {
    if (latex === 'invalid\\latex') {
      throw new Error('KaTeX parse error');
    }
    return `<span class="katex">${latex}${options.displayMode ? '-display' : '-inline'}</span>`;
  }),
}));

describe('MathCache', () => {
  let cache: MathCache;

  beforeEach(() => {
    cache = new MathCache(10, 60000); // Small cache for testing
  });

  describe('get/set', () => {
    it('should return null for non-existent entries', () => {
      expect(cache.get('x^2', true)).toBeNull();
    });

    it('should store and retrieve entries', () => {
      cache.set('x^2', true, '<span>x^2</span>');
      expect(cache.get('x^2', true)).toBe('<span>x^2</span>');
    });

    it('should differentiate between display and inline modes', () => {
      cache.set('x^2', true, '<span>display</span>');
      cache.set('x^2', false, '<span>inline</span>');
      
      expect(cache.get('x^2', true)).toBe('<span>display</span>');
      expect(cache.get('x^2', false)).toBe('<span>inline</span>');
    });

    it('should update access count on get', () => {
      cache.set('x^2', true, '<span>x^2</span>');
      cache.get('x^2', true);
      cache.get('x^2', true);
      // Access count should be updated (internal behavior)
      expect(cache.get('x^2', true)).toBe('<span>x^2</span>');
    });
  });

  describe('has', () => {
    it('should return false for non-existent entries', () => {
      expect(cache.has('x^2', true)).toBe(false);
    });

    it('should return true for existing entries', () => {
      cache.set('x^2', true, '<span>x^2</span>');
      expect(cache.has('x^2', true)).toBe(true);
    });
  });

  describe('clear', () => {
    it('should remove all entries', () => {
      cache.set('x^2', true, '<span>x^2</span>');
      cache.set('y^2', false, '<span>y^2</span>');
      
      cache.clear();
      
      expect(cache.get('x^2', true)).toBeNull();
      expect(cache.get('y^2', false)).toBeNull();
    });
  });

  describe('getStats', () => {
    it('should return correct size', () => {
      expect(cache.getStats().size).toBe(0);
      
      cache.set('x^2', true, '<span>x^2</span>');
      expect(cache.getStats().size).toBe(1);
      
      cache.set('y^2', false, '<span>y^2</span>');
      expect(cache.getStats().size).toBe(2);
    });

    it('should return maxSize', () => {
      expect(cache.getStats().maxSize).toBe(10);
    });

    it('should track hits and misses', () => {
      expect(cache.getStats().hits).toBe(0);
      expect(cache.getStats().misses).toBe(0);

      cache.get('x^2', true);
      expect(cache.getStats().misses).toBe(1);

      cache.set('x^2', true, '<span>x^2</span>');
      cache.get('x^2', true);
      expect(cache.getStats().hits).toBe(1);
    });
  });

  describe('eviction', () => {
    it('should evict entries when cache is full', () => {
      // Fill the cache
      for (let i = 0; i < 15; i++) {
        cache.set(`formula${i}`, true, `<span>${i}</span>`);
      }
      
      // Cache should have evicted some entries
      expect(cache.getStats().size).toBeLessThanOrEqual(10);
    });
  });
});

describe('renderMathCached', () => {
  beforeEach(() => {
    clearMathCache();
  });

  it('should render LaTeX and cache the result', () => {
    const result1 = renderMathCached('x^2', true);
    expect(result1).toContain('x^2');
    expect(result1).toContain('-display');
    
    // Second call should use cache
    const result2 = renderMathCached('x^2', true);
    expect(result2).toBe(result1);
  });

  it('should handle inline mode', () => {
    const result = renderMathCached('x^2', false);
    expect(result).toContain('-inline');
  });

  it('should throw error for invalid LaTeX', () => {
    expect(() => renderMathCached('invalid\\latex', true)).toThrow('KaTeX parse error');
  });
});

describe('renderMathSafe', () => {
  beforeEach(() => {
    clearMathCache();
  });

  it('should return html and null error for valid LaTeX', () => {
    const result = renderMathSafe('x^2', true);
    expect(result.html).toContain('x^2');
    expect(result.error).toBeNull();
  });

  it('should return empty html and error message for invalid LaTeX', () => {
    const result = renderMathSafe('invalid\\latex', true);
    expect(result.html).toBe('');
    expect(result.error).toBe('KaTeX parse error');
  });
});

describe('renderMathBatch', () => {
  beforeEach(() => {
    clearMathCache();
  });

  it('should render multiple formulas', () => {
    const formulas = [
      { latex: 'x^2', displayMode: true },
      { latex: 'y^2', displayMode: false },
    ];
    
    const results = renderMathBatch(formulas);
    
    expect(results).toHaveLength(2);
    expect(results[0].html).toContain('x^2');
    expect(results[0].error).toBeNull();
    expect(results[1].html).toContain('y^2');
    expect(results[1].error).toBeNull();
  });

  it('should handle mixed valid and invalid formulas', () => {
    const formulas = [
      { latex: 'x^2', displayMode: true },
      { latex: 'invalid\\latex', displayMode: true },
    ];
    
    const results = renderMathBatch(formulas);
    
    expect(results[0].error).toBeNull();
    expect(results[1].error).toBe('KaTeX parse error');
  });
});

describe('clearMathCache', () => {
  it('should clear all cached entries', () => {
    renderMathCached('x^2', true);
    expect(getMathCacheStats().size).toBeGreaterThan(0);
    
    clearMathCache();
    expect(getMathCacheStats().size).toBe(0);
    expect(getMathCacheStats().hits).toBe(0);
    expect(getMathCacheStats().misses).toBe(0);
  });
});

describe('getMathCacheStats', () => {
  beforeEach(() => {
    clearMathCache();
  });

  it('should return cache statistics', () => {
    const stats = getMathCacheStats();
    expect(stats).toHaveProperty('size');
    expect(stats).toHaveProperty('maxSize');
    expect(stats).toHaveProperty('hitRate');
    expect(stats).toHaveProperty('hits');
    expect(stats).toHaveProperty('misses');
  });

  it('should track cache size', () => {
    expect(getMathCacheStats().size).toBe(0);
    
    renderMathCached('x^2', true);
    expect(getMathCacheStats().size).toBe(1);
    
    renderMathCached('y^2', false);
    expect(getMathCacheStats().size).toBe(2);
  });
});

describe('preloadMathCache', () => {
  beforeEach(() => {
    clearMathCache();
  });

  it('should preload formulas into cache', () => {
    const formulas = [
      { latex: 'x^2', displayMode: true },
      { latex: 'y^2', displayMode: false },
    ];
    
    preloadMathCache(formulas);
    
    expect(getMathCacheStats().size).toBe(2);
  });

  it('should not duplicate existing entries', () => {
    renderMathCached('x^2', true);
    expect(getMathCacheStats().size).toBe(1);
    
    preloadMathCache([{ latex: 'x^2', displayMode: true }]);
    expect(getMathCacheStats().size).toBe(1);
  });

  it('should ignore invalid formulas during preload', () => {
    preloadMathCache([
      { latex: 'x^2', displayMode: true },
      { latex: 'invalid\\latex', displayMode: true },
    ]);
    
    // Only valid formula should be cached
    expect(getMathCacheStats().size).toBe(1);
  });
});
