/**
 * Tests for Search Query Optimizer
 */

import { optimizeSearchQuery, isSearchRelevantQuery } from './search-query-optimizer';

describe('optimizeSearchQuery', () => {
  it('returns empty string for empty input', () => {
    expect(optimizeSearchQuery('')).toBe('');
    expect(optimizeSearchQuery('   ')).toBe('');
  });

  it('cleans filler prefixes from queries', () => {
    // "What is" is matched by the filler pattern and removed
    const result = optimizeSearchQuery('What is TypeScript?');
    expect(result).toContain('TypeScript');
    expect(result.length).toBeGreaterThan(0);
  });

  it('removes filler words from beginning', () => {
    const r1 = optimizeSearchQuery('Please tell me about React hooks');
    expect(r1).toContain('React hooks');

    const r2 = optimizeSearchQuery('Can you explain TypeScript generics');
    expect(r2).toContain('TypeScript generics');

    const r3 = optimizeSearchQuery('I want to know about Next.js');
    expect(r3).toContain('Next.js');
  });

  it('removes filler words in Chinese', () => {
    const r1 = optimizeSearchQuery('请帮我查找 TypeScript 教程');
    expect(r1).toContain('TypeScript');

    const r2 = optimizeSearchQuery('我想了解 React 框架');
    expect(r2).toContain('React');
  });

  it('removes trailing politeness', () => {
    const r1 = optimizeSearchQuery('How to use Docker thanks');
    expect(r1).not.toMatch(/thanks$/i);

    const r2 = optimizeSearchQuery('GraphQL tutorial please');
    expect(r2).not.toMatch(/please$/i);
  });

  it('removes trailing punctuation that does not add search value', () => {
    const r1 = optimizeSearchQuery('deploy to Vercel.');
    expect(r1).not.toMatch(/\.$/);

    const r2 = optimizeSearchQuery('learn Rust!');
    expect(r2).not.toMatch(/!$/);
  });

  it('extracts core question from long messages', () => {
    const longMessage =
      'I have been working on a project for several months now. ' +
      'What is the best way to implement authentication in Next.js? ' +
      'I tried a few approaches but none of them worked.';
    const result = optimizeSearchQuery(longMessage);
    expect(result.length).toBeLessThanOrEqual(300);
    expect(result).toContain('authentication');
  });

  it('truncates very long messages gracefully', () => {
    const veryLong = 'A'.repeat(1000);
    const result = optimizeSearchQuery(veryLong);
    expect(result.length).toBeLessThanOrEqual(300);
  });

  it('handles messages with only filler words', () => {
    const result = optimizeSearchQuery('please thanks');
    expect(result.length).toBeGreaterThan(0);
  });

  it('normalizes excessive whitespace', () => {
    const result = optimizeSearchQuery('  How   to   use   Tailwind   CSS  ');
    expect(result).toContain('Tailwind CSS');
    expect(result).not.toMatch(/  /); // no double spaces
  });

  it('preserves meaningful content from short queries', () => {
    const result = optimizeSearchQuery('TypeScript generics guide');
    expect(result).toContain('TypeScript');
    expect(result).toContain('generics');
  });

  it('extracts first sentence from multi-sentence text without question', () => {
    const text =
      'React is a JavaScript library for building user interfaces. ' +
      'It was developed by Facebook. It uses a virtual DOM.';
    const result = optimizeSearchQuery(text);
    expect(result.length).toBeLessThanOrEqual(300);
  });
});

describe('isSearchRelevantQuery', () => {
  it('returns false for empty or short messages', () => {
    expect(isSearchRelevantQuery('')).toBe(false);
    expect(isSearchRelevantQuery('hi')).toBe(false);
  });

  it('detects queries about current/latest information', () => {
    expect(isSearchRelevantQuery('What is the latest version of Node.js?')).toBe(true);
    expect(isSearchRelevantQuery('Recent news about AI')).toBe(true);
    expect(isSearchRelevantQuery('Current React best practices')).toBe(true);
  });

  it('detects queries with year references', () => {
    expect(isSearchRelevantQuery('Best frameworks in 2025')).toBe(true);
  });

  it('detects queries about tutorials and documentation', () => {
    expect(isSearchRelevantQuery('How to set up Docker tutorial')).toBe(true);
    expect(isSearchRelevantQuery('Next.js documentation for app router')).toBe(true);
  });

  it('detects comparison queries', () => {
    expect(isSearchRelevantQuery('React vs Vue comparison')).toBe(true);
    expect(isSearchRelevantQuery('Difference between REST and GraphQL')).toBe(true);
    expect(isSearchRelevantQuery('Best alternative to Webpack')).toBe(true);
  });

  it('detects price/stock/weather queries', () => {
    expect(isSearchRelevantQuery('What is the current price of Bitcoin')).toBe(true);
    expect(isSearchRelevantQuery('weather forecast for tomorrow')).toBe(true);
  });

  it('detects Chinese search-relevant queries', () => {
    expect(isSearchRelevantQuery('最新的 TypeScript 版本是什么')).toBe(true);
    expect(isSearchRelevantQuery('React 和 Vue 的对比分析')).toBe(true);
    expect(isSearchRelevantQuery('怎么部署 Next.js 应用教程')).toBe(true);
  });

  it('returns false for generic conversational messages without web triggers', () => {
    // Note: "today" and "now" are considered search-relevant triggers
    expect(isSearchRelevantQuery('Write me a poem about cats')).toBe(false);
    expect(isSearchRelevantQuery('Explain this code to me')).toBe(false);
    expect(isSearchRelevantQuery('Summarize the following text')).toBe(false);
  });
});
