/**
 * Tests for LLM Memory Extractor
 */

import {
  LLMMemoryExtractor,
  createLLMExtractor,
  DEFAULT_LLM_EXTRACTOR_CONFIG,
} from './llm-extractor';
import type { ConversationMessage } from './memory-pipeline';

describe('LLMMemoryExtractor', () => {
  const mockMessages: ConversationMessage[] = [
    { role: 'user', content: 'My name is John and I work as a software engineer' },
    { role: 'assistant', content: 'Nice to meet you, John! How can I help you today?' },
    { role: 'user', content: 'I prefer using TypeScript over JavaScript for new projects' },
    { role: 'assistant', content: 'TypeScript is a great choice for type safety!' },
    { role: 'user', content: 'Remember to always add code examples when explaining concepts' },
  ];

  describe('createLLMExtractor', () => {
    it('should create extractor with default config', () => {
      const extractor = createLLMExtractor();
      expect(extractor).toBeInstanceOf(LLMMemoryExtractor);
    });

    it('should create extractor with custom config', () => {
      const extractor = createLLMExtractor({
        minConfidence: 0.8,
        maxCandidates: 5,
      });
      expect(extractor).toBeInstanceOf(LLMMemoryExtractor);
    });

    it('should create extractor with LLM function', () => {
      const mockLLM = { generate: jest.fn() };
      const extractor = createLLMExtractor({ enableLLM: true }, mockLLM);
      expect(extractor).toBeInstanceOf(LLMMemoryExtractor);
    });
  });

  describe('extractWithPatterns', () => {
    it('should extract facts from messages', () => {
      const extractor = createLLMExtractor();

      const candidates = extractor.extractWithPatterns(mockMessages);

      const facts = candidates.filter(c => c.type === 'fact');
      expect(facts.length).toBeGreaterThan(0);
      expect(facts.some(f => f.content.toLowerCase().includes('name is john'))).toBe(true);
    });

    it('should extract preferences from messages', () => {
      const extractor = createLLMExtractor();

      const candidates = extractor.extractWithPatterns(mockMessages);

      const preferences = candidates.filter(c => c.type === 'preference');
      expect(preferences.length).toBeGreaterThan(0);
      expect(preferences.some(p => p.content.toLowerCase().includes('prefer'))).toBe(true);
    });

    it('should extract instructions from messages', () => {
      const extractor = createLLMExtractor();

      const candidates = extractor.extractWithPatterns(mockMessages);

      const instructions = candidates.filter(c => c.type === 'instruction');
      expect(instructions.length).toBeGreaterThan(0);
      expect(instructions.some(i => i.content.toLowerCase().includes('remember'))).toBe(true);
    });

    it('should filter by extract types', () => {
      const extractor = createLLMExtractor({
        extractTypes: ['fact'],
      });

      const candidates = extractor.extractWithPatterns(mockMessages);

      candidates.forEach(c => {
        expect(c.type).toBe('fact');
      });
    });

    it('should respect minConfidence threshold', () => {
      const extractor = createLLMExtractor({
        minConfidence: 0.9,
      });

      const candidates = extractor.extractWithPatterns(mockMessages);

      candidates.forEach(c => {
        expect(c.confidence).toBeGreaterThanOrEqual(0.9);
      });
    });

    it('should respect maxCandidates limit', () => {
      const extractor = createLLMExtractor({
        maxCandidates: 2,
      });

      const candidates = extractor.extractWithPatterns(mockMessages);

      expect(candidates.length).toBeLessThanOrEqual(2);
    });

    it('should skip system messages', () => {
      const messagesWithSystem: ConversationMessage[] = [
        { role: 'system', content: 'My name is SystemBot' },
        ...mockMessages,
      ];

      const extractor = createLLMExtractor();
      const candidates = extractor.extractWithPatterns(messagesWithSystem);

      // Should not extract from system message
      expect(candidates.some(c => c.content.includes('SystemBot'))).toBe(false);
    });

    it('should skip very short content', () => {
      const shortMessages: ConversationMessage[] = [
        { role: 'user', content: 'I am ok' },
      ];

      const extractor = createLLMExtractor();
      const candidates = extractor.extractWithPatterns(shortMessages);

      // Very short extractions should be filtered
      candidates.forEach(c => {
        expect(c.content.length).toBeGreaterThanOrEqual(10);
      });
    });

    it('should deduplicate similar extractions', () => {
      const duplicateMessages: ConversationMessage[] = [
        { role: 'user', content: 'I prefer dark mode' },
        { role: 'user', content: 'I prefer dark mode interfaces' },
      ];

      const extractor = createLLMExtractor();
      const candidates = extractor.extractWithPatterns(duplicateMessages);

      // Should not have exact duplicates
      const contents = candidates.map(c => c.content.toLowerCase());
      const uniqueContents = new Set(contents);
      expect(contents.length).toBe(uniqueContents.size);
    });

    it('should sort by confidence descending', () => {
      const extractor = createLLMExtractor();
      const candidates = extractor.extractWithPatterns(mockMessages);

      for (let i = 1; i < candidates.length; i++) {
        expect(candidates[i - 1].confidence).toBeGreaterThanOrEqual(candidates[i].confidence);
      }
    });
  });

  describe('extract (main method)', () => {
    it('should use pattern extraction when LLM disabled', async () => {
      const extractor = createLLMExtractor({ enableLLM: false });

      const candidates = await extractor.extract(mockMessages);

      expect(candidates.length).toBeGreaterThan(0);
    });

    it('should use pattern extraction when LLM not provided', async () => {
      const extractor = createLLMExtractor({ enableLLM: true });

      const candidates = await extractor.extract(mockMessages);

      expect(candidates.length).toBeGreaterThan(0);
    });

    it('should use LLM extraction when configured', async () => {
      const mockLLM = {
        generate: jest.fn().mockResolvedValue(JSON.stringify([
          { content: 'User prefers TypeScript', type: 'preference', confidence: 0.9 },
        ])),
      };

      const extractor = createLLMExtractor({ enableLLM: true }, mockLLM);

      const candidates = await extractor.extract(mockMessages);

      expect(mockLLM.generate).toHaveBeenCalled();
      expect(candidates.length).toBeGreaterThan(0);
    });

    it('should fallback to patterns when LLM fails', async () => {
      const mockLLM = {
        generate: jest.fn().mockRejectedValue(new Error('LLM error')),
      };

      const extractor = createLLMExtractor({ enableLLM: true }, mockLLM);

      const candidates = await extractor.extract(mockMessages);

      // Should still return results from pattern fallback
      expect(candidates.length).toBeGreaterThan(0);
    });

    it('should fallback to patterns when LLM returns invalid JSON', async () => {
      const mockLLM = {
        generate: jest.fn().mockResolvedValue('not valid json'),
      };

      const extractor = createLLMExtractor({ enableLLM: true }, mockLLM);

      const candidates = await extractor.extract(mockMessages);

      expect(candidates.length).toBeGreaterThan(0);
    });

    it('should filter LLM results by extractTypes', async () => {
      const mockLLM = {
        generate: jest.fn().mockResolvedValue(JSON.stringify([
          { content: 'User is John', type: 'fact', confidence: 0.9 },
          { content: 'User likes TypeScript', type: 'preference', confidence: 0.9 },
        ])),
      };

      const extractor = createLLMExtractor(
        { enableLLM: true, extractTypes: ['fact'] },
        mockLLM
      );

      const candidates = await extractor.extract(mockMessages);

      candidates.forEach(c => {
        expect(c.type).toBe('fact');
      });
    });

    it('should filter LLM results by minConfidence', async () => {
      const mockLLM = {
        generate: jest.fn().mockResolvedValue(JSON.stringify([
          { content: 'High confidence', type: 'fact', confidence: 0.9 },
          { content: 'Low confidence', type: 'fact', confidence: 0.4 },
        ])),
      };

      const extractor = createLLMExtractor(
        { enableLLM: true, minConfidence: 0.7 },
        mockLLM
      );

      const candidates = await extractor.extract(mockMessages);

      candidates.forEach(c => {
        expect(c.confidence).toBeGreaterThanOrEqual(0.7);
      });
    });
  });

  describe('extractFromSummary', () => {
    it('should extract from summary text', async () => {
      const extractor = createLLMExtractor();

      const summary = 'User prefers dark mode. User is a software engineer. User wants concise responses.';
      const candidates = await extractor.extractFromSummary(summary);

      expect(candidates.length).toBeGreaterThan(0);
    });

    it('should respect maxCandidates for summary extraction', async () => {
      const extractor = createLLMExtractor({ maxCandidates: 1 });

      const summary = 'User prefers A. User prefers B. User prefers C.';
      const candidates = await extractor.extractFromSummary(summary);

      expect(candidates.length).toBeLessThanOrEqual(1);
    });

    it('should mark source as summary', async () => {
      const extractor = createLLMExtractor();

      const summary = 'User prefers TypeScript';
      const candidates = await extractor.extractFromSummary(summary);

      candidates.forEach(c => {
        expect(c.source).toBe('summary');
      });
    });
  });

  describe('detectExplicitMemoryRequest', () => {
    it('should detect "remember this" requests', () => {
      const extractor = createLLMExtractor();

      const result = extractor.detectExplicitMemoryRequest('Remember this: I like coffee');

      expect(result).not.toBeNull();
      expect(result?.type).toBe('instruction');
      expect(result?.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it('should detect "don\'t forget" requests', () => {
      const extractor = createLLMExtractor();

      const result = extractor.detectExplicitMemoryRequest("Don't forget that I prefer tea");

      expect(result).not.toBeNull();
    });

    it('should detect "please remember" requests', () => {
      const extractor = createLLMExtractor();

      const result = extractor.detectExplicitMemoryRequest('Please remember my timezone is UTC+8');

      expect(result).not.toBeNull();
    });

    it('should detect "keep in mind" requests', () => {
      const extractor = createLLMExtractor();

      const result = extractor.detectExplicitMemoryRequest('Keep in mind that I work at night');

      expect(result).not.toBeNull();
    });

    it('should return null for non-memory requests', () => {
      const extractor = createLLMExtractor();

      const result = extractor.detectExplicitMemoryRequest('What is the weather today?');

      expect(result).toBeNull();
    });

    it('should include reasoning in explicit memory detection', () => {
      const extractor = createLLMExtractor();

      const result = extractor.detectExplicitMemoryRequest('Remember this important info');

      expect(result?.reasoning).toBeDefined();
    });
  });

  describe('inferTags', () => {
    it('should infer code-related tags', () => {
      const extractor = createLLMExtractor();

      const tags = extractor.inferTags('I am a software developer', 'fact');

      expect(tags).toContain('code');
    });

    it('should infer UI-related tags', () => {
      const extractor = createLLMExtractor();

      const tags = extractor.inferTags('I prefer dark mode interface', 'preference');

      expect(tags).toContain('ui');
    });

    it('should infer work-related tags', () => {
      const extractor = createLLMExtractor();

      const tags = extractor.inferTags('I work at TechCorp company', 'fact');

      expect(tags).toContain('work');
    });

    it('should infer language-related tags', () => {
      const extractor = createLLMExtractor();

      const tags = extractor.inferTags('I speak English and Chinese', 'fact');

      expect(tags).toContain('language');
    });

    it('should include memory type as tag', () => {
      const extractor = createLLMExtractor();

      const tags = extractor.inferTags('Some content', 'preference');

      expect(tags).toContain('preference');
    });

    it('should deduplicate tags', () => {
      const extractor = createLLMExtractor();

      const tags = extractor.inferTags('I prefer coding style', 'preference');

      const uniqueTags = new Set(tags);
      expect(tags.length).toBe(uniqueTags.size);
    });
  });

  describe('config management', () => {
    it('should update config', () => {
      const extractor = createLLMExtractor();

      extractor.updateConfig({ minConfidence: 0.9 });

      expect(extractor).toBeInstanceOf(LLMMemoryExtractor);
    });

    it('should set LLM function', () => {
      const extractor = createLLMExtractor();
      const mockLLM = { generate: jest.fn() };

      extractor.setLLM(mockLLM);

      expect(extractor).toBeInstanceOf(LLMMemoryExtractor);
    });
  });

  describe('DEFAULT_LLM_EXTRACTOR_CONFIG', () => {
    it('should have sensible defaults', () => {
      expect(DEFAULT_LLM_EXTRACTOR_CONFIG.enableLLM).toBe(false);
      expect(DEFAULT_LLM_EXTRACTOR_CONFIG.temperature).toBeGreaterThanOrEqual(0);
      expect(DEFAULT_LLM_EXTRACTOR_CONFIG.temperature).toBeLessThanOrEqual(1);
      expect(DEFAULT_LLM_EXTRACTOR_CONFIG.maxCandidates).toBeGreaterThan(0);
      expect(DEFAULT_LLM_EXTRACTOR_CONFIG.minConfidence).toBeGreaterThan(0);
      expect(DEFAULT_LLM_EXTRACTOR_CONFIG.minConfidence).toBeLessThanOrEqual(1);
    });

    it('should include all memory types by default', () => {
      expect(DEFAULT_LLM_EXTRACTOR_CONFIG.extractTypes).toContain('preference');
      expect(DEFAULT_LLM_EXTRACTOR_CONFIG.extractTypes).toContain('fact');
      expect(DEFAULT_LLM_EXTRACTOR_CONFIG.extractTypes).toContain('instruction');
      expect(DEFAULT_LLM_EXTRACTOR_CONFIG.extractTypes).toContain('context');
    });
  });

  describe('edge cases', () => {
    it('should handle empty messages array', async () => {
      const extractor = createLLMExtractor();

      const candidates = await extractor.extract([]);

      expect(candidates.length).toBe(0);
    });

    it('should handle messages with empty content', async () => {
      const extractor = createLLMExtractor();

      const candidates = await extractor.extract([
        { role: 'user', content: '' },
      ]);

      expect(candidates.length).toBe(0);
    });

    it('should handle very long content', async () => {
      const extractor = createLLMExtractor();
      const longContent = 'I prefer ' + 'x'.repeat(10000);

      const candidates = await extractor.extract([
        { role: 'user', content: longContent },
      ]);

      // Should not crash
      expect(Array.isArray(candidates)).toBe(true);
    });

    it('should handle special characters in content', async () => {
      const extractor = createLLMExtractor();

      const candidates = await extractor.extract([
        { role: 'user', content: 'I prefer using <TypeScript> & "strict" mode' },
      ]);

      expect(Array.isArray(candidates)).toBe(true);
    });
  });
});
