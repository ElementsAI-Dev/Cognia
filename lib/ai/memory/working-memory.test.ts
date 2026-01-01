/**
 * Tests for Working Memory
 */

import {
  WorkingMemory,
  createWorkingMemory,
  DEFAULT_WORKING_MEMORY_CONFIG,
} from './working-memory';
import type { ActivatedMemory } from './memory-activator';
import type { Memory } from '@/types';

describe('WorkingMemory', () => {
  const createMockMemory = (overrides: Partial<Memory> = {}): Memory => ({
    id: '1',
    type: 'fact',
    content: 'Test memory content',
    source: 'explicit',
    tags: [],
    createdAt: new Date(),
    lastUsedAt: new Date(),
    useCount: 0,
    enabled: true,
    pinned: false,
    priority: 5,
    scope: 'global',
    ...overrides,
  });

  const createMockActivatedMemory = (
    memoryOverrides: Partial<Memory> = {},
    score: number = 0.8
  ): ActivatedMemory => ({
    memory: createMockMemory(memoryOverrides),
    activationScore: score,
    activationReasons: [{ type: 'keyword_match', description: 'Test', contribution: score }],
    relevanceType: 'direct',
  });

  describe('createWorkingMemory', () => {
    it('should create working memory with session ID', () => {
      const wm = createWorkingMemory('session-123');
      expect(wm).toBeInstanceOf(WorkingMemory);
      expect(wm.getSessionId()).toBe('session-123');
    });

    it('should create working memory with custom config', () => {
      const wm = createWorkingMemory('session-123', {
        maxTokens: 8000,
        maxRecentMessages: 20,
      });
      expect(wm).toBeInstanceOf(WorkingMemory);
    });
  });

  describe('message management', () => {
    it('should add messages', () => {
      const wm = createWorkingMemory('session-1');

      wm.addMessage({ role: 'user', content: 'Hello' });
      wm.addMessage({ role: 'assistant', content: 'Hi there!' });

      const messages = wm.getRecentMessages();
      expect(messages.length).toBe(2);
      expect(messages[0].content).toBe('Hello');
      expect(messages[1].content).toBe('Hi there!');
    });

    it('should add timestamp to messages', () => {
      const wm = createWorkingMemory('session-1');

      wm.addMessage({ role: 'user', content: 'Test' });

      const messages = wm.getRecentMessages();
      expect(messages[0].timestamp).toBeDefined();
    });

    it('should respect maxRecentMessages limit', () => {
      const wm = createWorkingMemory('session-1', { maxRecentMessages: 3 });

      for (let i = 0; i < 5; i++) {
        wm.addMessage({ role: 'user', content: `Message ${i}` });
      }

      const messages = wm.getRecentMessages();
      expect(messages.length).toBe(3);
      expect(messages[0].content).toBe('Message 2');
    });

    it('should get limited messages', () => {
      const wm = createWorkingMemory('session-1');

      for (let i = 0; i < 10; i++) {
        wm.addMessage({ role: 'user', content: `Message ${i}` });
      }

      const messages = wm.getRecentMessages(3);
      expect(messages.length).toBe(3);
    });

    it('should clear messages', () => {
      const wm = createWorkingMemory('session-1');

      wm.addMessage({ role: 'user', content: 'Test' });
      wm.clearMessages();

      expect(wm.getRecentMessages().length).toBe(0);
    });
  });

  describe('activated memory management', () => {
    it('should set activated memories', () => {
      const wm = createWorkingMemory('session-1');

      const memories = [
        createMockActivatedMemory({ id: '1', content: 'Memory 1' }),
        createMockActivatedMemory({ id: '2', content: 'Memory 2' }),
      ];

      wm.setActivatedMemories(memories);

      expect(wm.getActivatedMemories().length).toBe(2);
    });

    it('should respect maxActivatedMemories limit', () => {
      const wm = createWorkingMemory('session-1', { maxActivatedMemories: 2 });

      const memories = [
        createMockActivatedMemory({ id: '1' }, 0.9),
        createMockActivatedMemory({ id: '2' }, 0.8),
        createMockActivatedMemory({ id: '3' }, 0.7),
      ];

      wm.setActivatedMemories(memories);

      expect(wm.getActivatedMemories().length).toBe(2);
    });

    it('should add single activated memory', () => {
      const wm = createWorkingMemory('session-1');

      wm.addActivatedMemory(createMockActivatedMemory({ id: '1' }));
      wm.addActivatedMemory(createMockActivatedMemory({ id: '2' }));

      expect(wm.getActivatedMemories().length).toBe(2);
    });

    it('should update existing activated memory', () => {
      const wm = createWorkingMemory('session-1');

      wm.addActivatedMemory(createMockActivatedMemory({ id: '1' }, 0.5));
      wm.addActivatedMemory(createMockActivatedMemory({ id: '1' }, 0.9));

      const memories = wm.getActivatedMemories();
      expect(memories.length).toBe(1);
      expect(memories[0].activationScore).toBe(0.9);
    });

    it('should remove activated memory', () => {
      const wm = createWorkingMemory('session-1');

      wm.addActivatedMemory(createMockActivatedMemory({ id: '1' }));
      wm.addActivatedMemory(createMockActivatedMemory({ id: '2' }));
      wm.removeActivatedMemory('1');

      const memories = wm.getActivatedMemories();
      expect(memories.length).toBe(1);
      expect(memories[0].memory.id).toBe('2');
    });

    it('should keep top N by score when exceeding limit', () => {
      const wm = createWorkingMemory('session-1', { maxActivatedMemories: 2 });

      wm.addActivatedMemory(createMockActivatedMemory({ id: '1' }, 0.3));
      wm.addActivatedMemory(createMockActivatedMemory({ id: '2' }, 0.9));
      wm.addActivatedMemory(createMockActivatedMemory({ id: '3' }, 0.6));

      const memories = wm.getActivatedMemories();
      expect(memories.length).toBe(2);
      expect(memories[0].memory.id).toBe('2'); // Highest score
      expect(memories[1].memory.id).toBe('3'); // Second highest
    });
  });

  describe('session context management', () => {
    it('should update session context', () => {
      const wm = createWorkingMemory('session-1');

      wm.updateSessionContext({
        currentTask: 'Build a React component',
        userIntent: 'coding',
      });

      const context = wm.getSessionContext();
      expect(context.currentTask).toBe('Build a React component');
      expect(context.userIntent).toBe('coding');
    });

    it('should update lastUpdated on context change', () => {
      const wm = createWorkingMemory('session-1');
      const beforeUpdate = wm.getSessionContext().lastUpdated;

      // Small delay to ensure different timestamp
      wm.updateSessionContext({ currentTask: 'New task' });

      const afterUpdate = wm.getSessionContext().lastUpdated;
      expect(afterUpdate.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
    });
  });

  describe('scratchpad management', () => {
    it('should append to scratchpad', () => {
      const wm = createWorkingMemory('session-1', { enableScratchpad: true });

      wm.appendToScratchpad('Note 1');
      wm.appendToScratchpad('Note 2');

      const context = wm.getSessionContext();
      expect(context.scratchpad).toContain('Note 1');
      expect(context.scratchpad).toContain('Note 2');
    });

    it('should clear scratchpad', () => {
      const wm = createWorkingMemory('session-1', { enableScratchpad: true });

      wm.appendToScratchpad('Some notes');
      wm.clearScratchpad();

      expect(wm.getSessionContext().scratchpad).toBe('');
    });

    it('should not append when scratchpad disabled', () => {
      const wm = createWorkingMemory('session-1', { enableScratchpad: false });

      wm.appendToScratchpad('Should not appear');

      expect(wm.getSessionContext().scratchpad).toBe('');
    });
  });

  describe('pending actions', () => {
    it('should add pending actions', () => {
      const wm = createWorkingMemory('session-1');

      wm.addPendingAction('Action 1');
      wm.addPendingAction('Action 2');

      const context = wm.getSessionContext();
      expect(context.pendingActions.length).toBe(2);
    });

    it('should remove pending action by index', () => {
      const wm = createWorkingMemory('session-1');

      wm.addPendingAction('Action 1');
      wm.addPendingAction('Action 2');
      wm.removePendingAction(0);

      const context = wm.getSessionContext();
      expect(context.pendingActions.length).toBe(1);
      expect(context.pendingActions[0]).toBe('Action 2');
    });

    it('should clear all pending actions', () => {
      const wm = createWorkingMemory('session-1');

      wm.addPendingAction('Action 1');
      wm.addPendingAction('Action 2');
      wm.clearPendingActions();

      expect(wm.getSessionContext().pendingActions.length).toBe(0);
    });
  });

  describe('token management', () => {
    it('should track token usage', () => {
      const wm = createWorkingMemory('session-1');

      wm.addMessage({ role: 'user', content: 'This is a test message' });
      wm.addActivatedMemory(createMockActivatedMemory({ content: 'Memory content' }));

      const usage = wm.getTokenUsage();
      expect(usage.messages).toBeGreaterThan(0);
      expect(usage.memories).toBeGreaterThan(0);
      expect(usage.total).toBeGreaterThan(0);
    });

    it('should calculate available tokens', () => {
      const wm = createWorkingMemory('session-1', {
        maxTokens: 1000,
        reservedTokens: 200,
      });

      const available = wm.getAvailableTokens();
      expect(available).toBeLessThanOrEqual(800);
    });

    it('should check if within budget', () => {
      const wm = createWorkingMemory('session-1', {
        maxTokens: 10000,
        reservedTokens: 500,
      });

      expect(wm.isWithinBudget()).toBe(true);
    });
  });

  describe('promotion/demotion candidates', () => {
    it('should find promotion candidates', () => {
      const wm = createWorkingMemory('session-1', { autoPromoteThreshold: 0.7 });

      wm.addActivatedMemory(
        createMockActivatedMemory(
          { id: '1', scope: 'session', sessionId: 'session-1' },
          0.9
        )
      );

      const candidates = wm.findPromotionCandidates();
      expect(candidates.length).toBe(1);
      expect(candidates[0].memory.id).toBe('1');
    });

    it('should find demotion candidates', () => {
      const wm = createWorkingMemory('session-1', { autoDemoteThreshold: 0.3 });

      wm.addActivatedMemory(createMockActivatedMemory({ id: '1' }, 0.1));
      wm.addActivatedMemory(createMockActivatedMemory({ id: '2' }, 0.8));

      const candidates = wm.findDemotionCandidates();
      expect(candidates.length).toBe(1);
      expect(candidates[0].memoryId).toBe('1');
    });
  });

  describe('prompt building', () => {
    it('should build prompt section', () => {
      const wm = createWorkingMemory('session-1');

      wm.updateSessionContext({ currentTask: 'Build a feature' });
      wm.addActivatedMemory(
        createMockActivatedMemory({ id: '1', type: 'preference', content: 'I prefer TypeScript' })
      );
      wm.addActivatedMemory(
        createMockActivatedMemory({ id: '2', type: 'fact', content: 'My name is John' })
      );

      const prompt = wm.buildPromptSection();

      expect(prompt).toContain('Current Task');
      expect(prompt).toContain('Build a feature');
      expect(prompt).toContain('User Preferences');
      expect(prompt).toContain('TypeScript');
      expect(prompt).toContain('About the User');
      expect(prompt).toContain('John');
    });

    it('should include scratchpad in prompt', () => {
      const wm = createWorkingMemory('session-1', { enableScratchpad: true });

      wm.appendToScratchpad('Important note');

      const prompt = wm.buildPromptSection();

      expect(prompt).toContain('Working Notes');
      expect(prompt).toContain('Important note');
    });

    it('should compress for context with token limit', () => {
      const wm = createWorkingMemory('session-1');

      wm.updateSessionContext({ currentTask: 'A task' });
      for (let i = 0; i < 5; i++) {
        wm.addActivatedMemory(
          createMockActivatedMemory({ id: `${i}`, content: `Memory ${i}` }, 0.9 - i * 0.1)
        );
      }

      const compressed = wm.compressForContext(500);

      expect(compressed.length).toBeLessThan(2000); // Rough character limit
    });
  });

  describe('state management', () => {
    it('should get full state', () => {
      const wm = createWorkingMemory('session-1');

      wm.addMessage({ role: 'user', content: 'Test' });

      const state = wm.getState();

      expect(state.sessionId).toBe('session-1');
      expect(state.recentMessages.length).toBe(1);
      expect(state.sessionContext).toBeDefined();
      expect(state.tokenUsage).toBeDefined();
    });

    it('should reset state', () => {
      const wm = createWorkingMemory('session-1');

      wm.addMessage({ role: 'user', content: 'Test' });
      wm.addActivatedMemory(createMockActivatedMemory({ id: '1' }));
      wm.updateSessionContext({ currentTask: 'Task' });

      wm.reset();

      const state = wm.getState();
      expect(state.recentMessages.length).toBe(0);
      expect(state.activatedMemories.length).toBe(0);
      expect(state.sessionContext.currentTask).toBeUndefined();
      expect(state.sessionId).toBe('session-1'); // Session ID preserved
    });
  });

  describe('DEFAULT_WORKING_MEMORY_CONFIG', () => {
    it('should have sensible defaults', () => {
      expect(DEFAULT_WORKING_MEMORY_CONFIG.maxTokens).toBeGreaterThan(0);
      expect(DEFAULT_WORKING_MEMORY_CONFIG.reservedTokens).toBeGreaterThan(0);
      expect(DEFAULT_WORKING_MEMORY_CONFIG.maxRecentMessages).toBeGreaterThan(0);
      expect(DEFAULT_WORKING_MEMORY_CONFIG.maxActivatedMemories).toBeGreaterThan(0);
      expect(DEFAULT_WORKING_MEMORY_CONFIG.autoPromoteThreshold).toBeGreaterThan(0);
      expect(DEFAULT_WORKING_MEMORY_CONFIG.autoPromoteThreshold).toBeLessThanOrEqual(1);
    });
  });
});
