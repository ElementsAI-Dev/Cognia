/**
 * Tests for Memory Activator
 */

import { MemoryActivator, createMemoryActivator } from './memory-activator';
import type { Memory } from '@/types';

describe('MemoryActivator', () => {
  const mockMemories: Memory[] = [
    {
      id: '1',
      type: 'preference',
      content: 'I prefer dark mode interfaces',
      source: 'explicit',
      tags: ['ui', 'preferences'],
      createdAt: new Date(),
      lastUsedAt: new Date(),
      useCount: 5,
      enabled: true,
      pinned: true,
      priority: 8,
      scope: 'global',
    },
    {
      id: '2',
      type: 'fact',
      content: 'My name is John and I work as a software engineer',
      source: 'explicit',
      tags: ['personal', 'work'],
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      lastUsedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      useCount: 2,
      enabled: true,
      pinned: false,
      priority: 5,
      scope: 'global',
    },
    {
      id: '3',
      type: 'instruction',
      content: 'Always respond in a concise manner',
      source: 'explicit',
      tags: ['communication'],
      createdAt: new Date(),
      lastUsedAt: new Date(),
      useCount: 10,
      enabled: true,
      pinned: false,
      priority: 7,
      scope: 'global',
    },
    {
      id: '4',
      type: 'context',
      content: 'Working on a React project with TypeScript',
      source: 'inferred',
      tags: ['code', 'project'],
      createdAt: new Date(),
      lastUsedAt: new Date(),
      useCount: 3,
      enabled: true,
      pinned: false,
      priority: 5,
      scope: 'session',
      sessionId: 'session-1',
    },
    {
      id: '5',
      type: 'preference',
      content: 'Disabled memory for testing',
      source: 'explicit',
      tags: [],
      createdAt: new Date(),
      lastUsedAt: new Date(),
      useCount: 0,
      enabled: false,
      pinned: false,
      priority: 5,
      scope: 'global',
    },
  ];

  describe('createMemoryActivator', () => {
    it('should create activator with default config', () => {
      const activator = createMemoryActivator();
      expect(activator).toBeInstanceOf(MemoryActivator);
    });

    it('should create activator with custom config', () => {
      const activator = createMemoryActivator({
        semanticWeight: 0.6,
        keywordWeight: 0.3,
      });
      expect(activator).toBeInstanceOf(MemoryActivator);
    });
  });

  describe('activate', () => {
    it('should activate memories based on context', async () => {
      const activator = createMemoryActivator({ enableSemantic: false });

      const results = await activator.activate(mockMemories, {
        currentMessage: 'What is my name?',
        limit: 10,
      });

      expect(results.length).toBeGreaterThan(0);
      // Pinned memory should be included
      expect(results.some(r => r.memory.id === '1')).toBe(true);
    });

    it('should filter by session', async () => {
      const activator = createMemoryActivator({ enableSemantic: false });

      const results = await activator.activate(mockMemories, {
        currentMessage: 'React project',
        sessionId: 'session-1',
        limit: 10,
      });

      // Session-scoped memory should be included
      expect(results.some(r => r.memory.id === '4')).toBe(true);
    });

    it('should filter by memory type', async () => {
      const activator = createMemoryActivator({ enableSemantic: false });

      const results = await activator.activate(mockMemories, {
        currentMessage: 'test query',
        focusTypes: ['fact'],
        limit: 10,
      });

      // Only fact type should be included
      results.forEach(r => {
        expect(r.memory.type).toBe('fact');
      });
    });

    it('should exclude disabled memories', async () => {
      const activator = createMemoryActivator({ enableSemantic: false });

      const results = await activator.activate(mockMemories, {
        currentMessage: 'test query',
        limit: 10,
      });

      // Disabled memory should not be included
      expect(results.some(r => r.memory.id === '5')).toBe(false);
    });

    it('should respect threshold', async () => {
      const activator = createMemoryActivator({ enableSemantic: false });

      const results = await activator.activate(mockMemories, {
        currentMessage: 'random query with no matches',
        threshold: 0.9,
        limit: 10,
      });

      // Only high-scoring memories (like pinned) should pass high threshold
      results.forEach(r => {
        expect(r.activationScore).toBeGreaterThanOrEqual(0.9);
      });
    });

    it('should include activation reasons', async () => {
      const activator = createMemoryActivator({ enableSemantic: false });

      const results = await activator.activate(mockMemories, {
        currentMessage: 'dark mode interface preferences',
        limit: 10,
      });

      const pinnedResult = results.find(r => r.memory.pinned);
      if (pinnedResult) {
        expect(pinnedResult.activationReasons.length).toBeGreaterThan(0);
        expect(pinnedResult.activationReasons.some(r => r.type === 'pinned')).toBe(true);
      }
    });
  });

  describe('keywordActivation', () => {
    it('should find memories by keyword match', () => {
      const activator = createMemoryActivator();

      const results = activator.keywordActivation('dark mode interface', mockMemories);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].memory.content).toContain('dark mode');
    });

    it('should return empty for no matches', () => {
      const activator = createMemoryActivator();

      const results = activator.keywordActivation('xyzabc123', mockMemories, { threshold: 0.5 });

      expect(results.length).toBe(0);
    });
  });

  describe('temporalActivation', () => {
    it('should find memories within time range', () => {
      const activator = createMemoryActivator();

      const results = activator.temporalActivation(mockMemories, { relativeDays: -30 });

      expect(results.length).toBeGreaterThan(0);
    });

    it('should filter by time range', () => {
      const activator = createMemoryActivator();
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const results = activator.temporalActivation(mockMemories, {
        start: yesterday,
        end: new Date(),
      });

      // Only recently used memories
      expect(results.every(r => {
        const lastUsed = r.memory.lastUsedAt instanceof Date 
          ? r.memory.lastUsedAt 
          : new Date(r.memory.lastUsedAt);
        return lastUsed >= yesterday;
      })).toBe(true);
    });
  });

  describe('hybridActivation', () => {
    it('should combine multiple strategies', async () => {
      const activator = createMemoryActivator({ enableSemantic: false });

      const results = await activator.hybridActivation(
        { currentMessage: 'dark mode preferences', limit: 10 },
        mockMemories
      );

      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('config', () => {
    it('should update config', () => {
      const activator = createMemoryActivator();

      activator.updateConfig({ minThreshold: 0.5 });

      // Config should be updated (internal state)
      expect(activator).toBeInstanceOf(MemoryActivator);
    });

    it('should clear cache', () => {
      const activator = createMemoryActivator();

      activator.clearCache();

      // Should not throw
      expect(activator).toBeInstanceOf(MemoryActivator);
    });
  });
});
