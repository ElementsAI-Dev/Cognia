/**
 * Tests for Snippet Registry
 */

import { SnippetProvider, snippetProvider, SNIPPET_REGISTRY, type CodeSnippet } from './snippet-registry';

describe('SnippetProvider', () => {
  describe('getSnippets', () => {
    it('should return snippets for JavaScript', () => {
      const snippets = snippetProvider.getSnippets('javascript');

      expect(Array.isArray(snippets)).toBe(true);
      expect(snippets.length).toBeGreaterThan(0);
    });

    it('should return snippets for TypeScript', () => {
      const snippets = snippetProvider.getSnippets('typescript');

      expect(snippets.length).toBeGreaterThan(0);
    });

    it('should return snippets for Python', () => {
      const snippets = snippetProvider.getSnippets('python');

      expect(snippets.length).toBeGreaterThan(0);
    });

    it('should return empty array for unknown language', () => {
      const snippets = snippetProvider.getSnippets('unknown-language');

      expect(snippets.length).toBe(0);
    });
  });

  describe('registerSnippet', () => {
    it('should register a custom snippet', () => {
      const customSnippet: CodeSnippet = {
        id: 'custom-test',
        prefix: 'customtest',
        description: 'A custom test snippet',
        body: 'console.log("custom");',
        language: 'javascript',
        category: 'custom',
      };

      snippetProvider.registerSnippet(customSnippet);

      const snippets = snippetProvider.getSnippets('javascript');
      const found = snippets.find(s => s.prefix === 'customtest');

      expect(found).toBeDefined();
    });
  });

  describe('searchSnippets', () => {
    it('should find snippets by prefix', () => {
      const results = snippetProvider.searchSnippets('javascript', 'fn');

      expect(results.length).toBeGreaterThan(0);
    });

    it('should find snippets by description', () => {
      const results = snippetProvider.searchSnippets('javascript', 'function');

      expect(results.length).toBeGreaterThan(0);
    });

    it('should return empty for no matches', () => {
      const results = snippetProvider.searchSnippets('javascript', 'xyznonexistent123');

      expect(results.length).toBe(0);
    });
  });

  describe('getSnippetByPrefix', () => {
    it('should get snippet by exact prefix', () => {
      const snippet = snippetProvider.findSnippetByPrefix('javascript', 'fn');

      expect(snippet).toBeDefined();
      expect(snippet?.prefix).toBe('fn');
    });

    it('should return undefined for unknown prefix', () => {
      const snippet = snippetProvider.findSnippetByPrefix('javascript', 'unknownprefix123');

      expect(snippet).toBeUndefined();
    });
  });

  describe('expandSnippet', () => {
    it('should expand snippet body', () => {
      const snippet: CodeSnippet = {
        id: 'test-log',
        prefix: 'log',
        description: 'Log to console',
        body: 'console.log(${1:message});',
        language: 'javascript',
        category: 'logging',
      };

      const result = snippetProvider.applySnippet(snippet);

      expect(result).toContain('console.log');
    });

    it('should handle snippets with array body', () => {
      const snippet: CodeSnippet = {
        id: 'test-func',
        prefix: 'func',
        description: 'Create function',
        body: ['function ${1:name}(${2:params}) {', '  ${3:body}', '}'],
        language: 'javascript',
        category: 'functions',
      };

      const result = snippetProvider.applySnippet(snippet);

      expect(result).toContain('function');
    });
  });

  describe('SNIPPET_REGISTRY', () => {
    it('should have built-in snippets for common languages', () => {
      expect(SNIPPET_REGISTRY.javascript).toBeDefined();
      expect(SNIPPET_REGISTRY.typescript).toBeDefined();
      expect(SNIPPET_REGISTRY.python).toBeDefined();
    });
  });

  describe('singleton instance', () => {
    it('should export a singleton instance', () => {
      expect(snippetProvider).toBeInstanceOf(SnippetProvider);
    });
  });
});
