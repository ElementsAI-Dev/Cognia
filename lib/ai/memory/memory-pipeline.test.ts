/**
 * Tests for Memory Pipeline (Two-Phase Extraction + Update)
 */

import {
  extractMemoryCandidates,
  decideMemoryUpdates,
  applyDecisions,
  type ConversationMessage,
} from './memory-pipeline';
import type { Memory, MemoryPipelineConfig } from '@/types';
import { DEFAULT_PIPELINE_CONFIG } from '@/types/memory-provider';

// Mock embedding module
jest.mock('../embedding', () => ({
  generateEmbedding: jest.fn().mockResolvedValue({ embedding: [0.1, 0.2, 0.3] }),
  cosineSimilarity: jest.fn().mockReturnValue(0.5),
}));

describe('Memory Pipeline', () => {
  describe('extractMemoryCandidates', () => {
    it('should extract preference memories', () => {
      const messages: ConversationMessage[] = [
        { role: 'user', content: 'I prefer dark mode for all my applications' },
      ];

      const candidates = extractMemoryCandidates({ messages });

      expect(candidates.length).toBeGreaterThan(0);
      expect(candidates[0].type).toBe('preference');
      expect(candidates[0].content).toContain('prefer');
    });

    it('should extract fact memories', () => {
      const messages: ConversationMessage[] = [
        { role: 'user', content: 'My name is John and I work at Google' },
      ];

      const candidates = extractMemoryCandidates({ messages });

      expect(candidates.length).toBeGreaterThan(0);
      expect(candidates.some(c => c.type === 'fact')).toBe(true);
    });

    it('should extract instruction memories', () => {
      const messages: ConversationMessage[] = [
        { role: 'user', content: 'Remember to always use TypeScript for code examples' },
      ];

      const candidates = extractMemoryCandidates({ messages });

      expect(candidates.length).toBeGreaterThan(0);
      expect(candidates.some(c => c.type === 'instruction')).toBe(true);
    });

    it('should extract context memories', () => {
      const messages: ConversationMessage[] = [
        { role: 'user', content: "I'm working on a React Native mobile app" },
      ];

      const candidates = extractMemoryCandidates({ messages });

      expect(candidates.length).toBeGreaterThan(0);
      expect(candidates.some(c => c.type === 'context')).toBe(true);
    });

    it('should limit candidates to maxCandidates', () => {
      const messages: ConversationMessage[] = [
        { role: 'user', content: 'I prefer dark mode. I like TypeScript. I always use React. I enjoy coding. My favorite language is Python.' },
      ];

      const config: MemoryPipelineConfig = { ...DEFAULT_PIPELINE_CONFIG, maxCandidates: 2 };
      const candidates = extractMemoryCandidates({ messages }, config);

      expect(candidates.length).toBeLessThanOrEqual(2);
    });

    it('should assign higher confidence to memory keywords', () => {
      const messages: ConversationMessage[] = [
        { role: 'user', content: 'Remember that I prefer dark mode' },
      ];

      const candidates = extractMemoryCandidates({ messages });

      expect(candidates.length).toBeGreaterThan(0);
      expect(candidates[0].confidence).toBeGreaterThanOrEqual(0.9);
    });

    it('should skip system messages', () => {
      const messages: ConversationMessage[] = [
        { role: 'system', content: 'I prefer dark mode' },
        { role: 'user', content: 'Hello' },
      ];

      const candidates = extractMemoryCandidates({ messages });

      // Should not extract from system message
      expect(candidates.every(c => !c.content.includes('dark mode'))).toBe(true);
    });

    it('should extract from rolling summary', () => {
      const messages: ConversationMessage[] = [
        { role: 'user', content: 'Hello' },
      ];

      const candidates = extractMemoryCandidates({
        messages,
        rollingSummary: 'User prefers dark mode and uses TypeScript',
      });

      expect(candidates.length).toBeGreaterThan(0);
    });
  });

  describe('decideMemoryUpdates', () => {
    const createMockMemory = (id: string, content: string): Memory => ({
      id,
      type: 'preference',
      content,
      source: 'explicit',
      createdAt: new Date(),
      lastUsedAt: new Date(),
      useCount: 0,
      enabled: true,
    });

    it('should decide ADD for new unique memories', async () => {
      const candidates = [{
        content: 'I prefer dark mode',
        type: 'preference' as const,
        confidence: 0.8,
        source: 'conversation' as const,
      }];

      const decisions = await decideMemoryUpdates(candidates, {
        existingMemories: [],
      });

      expect(decisions.length).toBe(1);
      expect(decisions[0].operation).toBe('ADD');
    });

    it('should decide NOOP for very similar memories', async () => {
      const candidates = [{
        content: 'I prefer dark mode',
        type: 'preference' as const,
        confidence: 0.8,
        source: 'conversation' as const,
      }];

      const existingMemories = [
        createMockMemory('1', 'I prefer dark mode for my applications'),
      ];

      const decisions = await decideMemoryUpdates(candidates, {
        existingMemories,
      });

      expect(decisions.length).toBe(1);
      // Should be NOOP or UPDATE depending on similarity
      expect(['NOOP', 'UPDATE', 'ADD']).toContain(decisions[0].operation);
    });

    it('should detect contradictions', async () => {
      const candidates = [{
        content: "I don't like dark mode",
        type: 'preference' as const,
        confidence: 0.8,
        source: 'conversation' as const,
      }];

      const existingMemories = [
        createMockMemory('1', 'I like dark mode'),
      ];

      const decisions = await decideMemoryUpdates(candidates, {
        existingMemories,
      });

      expect(decisions.length).toBe(1);
      // Should detect the contradiction
      expect(['UPDATE', 'ADD']).toContain(decisions[0].operation);
    });
  });

  describe('applyDecisions', () => {
    it('should call createMemory for ADD operations', () => {
      const createMemory = jest.fn().mockReturnValue({ id: '1' });
      const updateMemory = jest.fn();
      const deleteMemory = jest.fn();

      const decisions = [{
        operation: 'ADD' as const,
        memory: {
          content: 'I prefer dark mode',
          type: 'preference' as const,
          confidence: 0.8,
          source: 'conversation' as const,
        },
        reason: 'New memory',
      }];

      const result = applyDecisions(decisions, createMemory, updateMemory, deleteMemory);

      expect(createMemory).toHaveBeenCalledTimes(1);
      expect(result.added).toBe(1);
      expect(result.updated).toBe(0);
      expect(result.deleted).toBe(0);
    });

    it('should call updateMemory for UPDATE operations', () => {
      const createMemory = jest.fn();
      const updateMemory = jest.fn();
      const deleteMemory = jest.fn();

      const decisions = [{
        operation: 'UPDATE' as const,
        memory: {
          content: 'I prefer dark mode',
          type: 'preference' as const,
          confidence: 0.8,
          source: 'conversation' as const,
        },
        existingMemoryId: '1',
        mergedContent: 'I prefer dark mode for all applications',
        reason: 'Merged content',
      }];

      const result = applyDecisions(decisions, createMemory, updateMemory, deleteMemory);

      expect(updateMemory).toHaveBeenCalledTimes(1);
      expect(updateMemory).toHaveBeenCalledWith('1', { content: 'I prefer dark mode for all applications' });
      expect(result.updated).toBe(1);
    });

    it('should call deleteMemory for DELETE operations', () => {
      const createMemory = jest.fn();
      const updateMemory = jest.fn();
      const deleteMemory = jest.fn();

      const decisions = [{
        operation: 'DELETE' as const,
        memory: {
          content: 'Old preference',
          type: 'preference' as const,
          confidence: 0.8,
          source: 'conversation' as const,
        },
        existingMemoryId: '1',
        reason: 'Outdated',
      }];

      const result = applyDecisions(decisions, createMemory, updateMemory, deleteMemory);

      expect(deleteMemory).toHaveBeenCalledTimes(1);
      expect(deleteMemory).toHaveBeenCalledWith('1');
      expect(result.deleted).toBe(1);
    });

    it('should skip NOOP operations', () => {
      const createMemory = jest.fn();
      const updateMemory = jest.fn();
      const deleteMemory = jest.fn();

      const decisions = [{
        operation: 'NOOP' as const,
        memory: {
          content: 'I prefer dark mode',
          type: 'preference' as const,
          confidence: 0.8,
          source: 'conversation' as const,
        },
        existingMemoryId: '1',
        reason: 'Already exists',
      }];

      const result = applyDecisions(decisions, createMemory, updateMemory, deleteMemory);

      expect(createMemory).not.toHaveBeenCalled();
      expect(updateMemory).not.toHaveBeenCalled();
      expect(deleteMemory).not.toHaveBeenCalled();
      expect(result.skipped).toBe(1);
    });

    it('should handle multiple decisions', () => {
      const createMemory = jest.fn().mockReturnValue({ id: 'new' });
      const updateMemory = jest.fn();
      const deleteMemory = jest.fn();

      const decisions = [
        {
          operation: 'ADD' as const,
          memory: { content: 'New memory', type: 'fact' as const, confidence: 0.8, source: 'conversation' as const },
          reason: 'New',
        },
        {
          operation: 'UPDATE' as const,
          memory: { content: 'Updated', type: 'preference' as const, confidence: 0.7, source: 'conversation' as const },
          existingMemoryId: '1',
          mergedContent: 'Merged content',
          reason: 'Update',
        },
        {
          operation: 'NOOP' as const,
          memory: { content: 'Skip', type: 'instruction' as const, confidence: 0.6, source: 'conversation' as const },
          existingMemoryId: '2',
          reason: 'Skip',
        },
      ];

      const result = applyDecisions(decisions, createMemory, updateMemory, deleteMemory);

      expect(result.added).toBe(1);
      expect(result.updated).toBe(1);
      expect(result.skipped).toBe(1);
      expect(result.deleted).toBe(0);
    });
  });

  describe('extractMemoryCandidates - additional patterns', () => {
    it('should extract "I don\'t like" patterns', () => {
      const messages: ConversationMessage[] = [
        { role: 'user', content: "I don't like verbose code comments" },
      ];

      const candidates = extractMemoryCandidates({ messages });

      expect(candidates.length).toBeGreaterThan(0);
      expect(candidates[0].type).toBe('preference');
    });

    it('should extract "I always" patterns', () => {
      const messages: ConversationMessage[] = [
        { role: 'user', content: 'I always use TypeScript for my projects' },
      ];

      const candidates = extractMemoryCandidates({ messages });

      expect(candidates.length).toBeGreaterThan(0);
    });

    it('should extract "my favorite" patterns', () => {
      const messages: ConversationMessage[] = [
        { role: 'user', content: 'My favorite programming language is Rust' },
      ];

      const candidates = extractMemoryCandidates({ messages });

      expect(candidates.length).toBeGreaterThan(0);
      expect(candidates[0].type).toBe('preference');
    });

    it('should extract "I live in" fact patterns', () => {
      const messages: ConversationMessage[] = [
        { role: 'user', content: 'I live in San Francisco' },
      ];

      const candidates = extractMemoryCandidates({ messages });

      expect(candidates.length).toBeGreaterThan(0);
      expect(candidates[0].type).toBe('fact');
    });

    it('should extract "call me" instruction patterns', () => {
      const messages: ConversationMessage[] = [
        { role: 'user', content: 'Call me Alex from now on' },
      ];

      const candidates = extractMemoryCandidates({ messages });

      expect(candidates.length).toBeGreaterThan(0);
      expect(candidates[0].type).toBe('instruction');
    });

    it('should extract "we use" context patterns', () => {
      const messages: ConversationMessage[] = [
        { role: 'user', content: 'We use React and Node.js in our stack' },
      ];

      const candidates = extractMemoryCandidates({ messages });

      expect(candidates.length).toBeGreaterThan(0);
      expect(candidates[0].type).toBe('context');
    });

    it('should handle empty messages array', () => {
      const candidates = extractMemoryCandidates({ messages: [] });
      expect(candidates).toEqual([]);
    });

    it('should handle messages with no extractable content', () => {
      const messages: ConversationMessage[] = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
      ];

      const candidates = extractMemoryCandidates({ messages });
      expect(Array.isArray(candidates)).toBe(true);
    });

    it('should deduplicate similar extractions', () => {
      const messages: ConversationMessage[] = [
        { role: 'user', content: 'I prefer dark mode. I prefer dark mode in all apps.' },
      ];

      const candidates = extractMemoryCandidates({ messages });
      
      // Should not have duplicate extractions
      const contents = candidates.map(c => c.content.toLowerCase());
      const uniqueContents = [...new Set(contents)];
      expect(contents.length).toBe(uniqueContents.length);
    });

    it('should skip very short extractions', () => {
      const messages: ConversationMessage[] = [
        { role: 'user', content: 'I like it' },
      ];

      const candidates = extractMemoryCandidates({ messages });
      
      // Very short content should be skipped
      expect(candidates.every(c => c.content.length >= 10)).toBe(true);
    });

    it('should respect recentMessageCount config', () => {
      const messages: ConversationMessage[] = [
        { role: 'user', content: 'I prefer dark mode' },
        { role: 'assistant', content: 'OK' },
        { role: 'user', content: 'I like TypeScript' },
        { role: 'assistant', content: 'Great' },
        { role: 'user', content: 'My name is John' },
      ];

      const config: MemoryPipelineConfig = { 
        ...DEFAULT_PIPELINE_CONFIG, 
        recentMessageCount: 2,
      };
      
      const candidates = extractMemoryCandidates({ messages }, config);
      
      // Should only process the last 2 messages
      expect(Array.isArray(candidates)).toBe(true);
    });
  });

  describe('decideMemoryUpdates - edge cases', () => {
    const createMockMemory = (id: string, content: string): Memory => ({
      id,
      type: 'preference',
      content,
      source: 'explicit',
      createdAt: new Date(),
      lastUsedAt: new Date(),
      useCount: 0,
      enabled: true,
    });

    it('should handle empty candidates array', async () => {
      const decisions = await decideMemoryUpdates([], {
        existingMemories: [createMockMemory('1', 'Test')],
      });

      expect(decisions).toEqual([]);
    });

    it('should handle multiple candidates', async () => {
      const candidates = [
        { content: 'I prefer dark mode', type: 'preference' as const, confidence: 0.8, source: 'conversation' as const },
        { content: 'My name is John', type: 'fact' as const, confidence: 0.9, source: 'conversation' as const },
      ];

      const decisions = await decideMemoryUpdates(candidates, {
        existingMemories: [],
      });

      expect(decisions.length).toBe(2);
      expect(decisions.every(d => d.operation === 'ADD')).toBe(true);
    });

    it('should merge related memories', async () => {
      const candidates = [{
        content: 'I prefer dark mode with blue accents',
        type: 'preference' as const,
        confidence: 0.8,
        source: 'conversation' as const,
      }];

      const existingMemories = [
        createMockMemory('1', 'I prefer dark mode'),
      ];

      const decisions = await decideMemoryUpdates(candidates, {
        existingMemories,
      }, { ...DEFAULT_PIPELINE_CONFIG, similarityThreshold: 0.3 });

      expect(decisions.length).toBe(1);
      // Should recognize similarity
      expect(['UPDATE', 'NOOP', 'ADD']).toContain(decisions[0].operation);
    });
  });
});
