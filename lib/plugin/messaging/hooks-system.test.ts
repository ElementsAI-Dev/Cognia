/**
 * Plugin Hooks System Tests
 *
 * Tests for:
 * - HookPriority enum and utility functions
 * - Pre/post operation hooks (UserPromptSubmit, PreToolUse, PostToolUse, PreCompact, PostChatReceive)
 */

import {
  HookPriority,
  normalizePriority,
  priorityToNumber,
  priorityToString,
  PluginEventHooks,
  getPluginEventHooks,
} from './hooks-system';
import type {
  PromptSubmitContext,
  PromptSubmitResult,
  PreToolUseResult,
  PostToolUseResult,
  PreCompactContext,
  PreCompactResult,
  ChatResponseData,
  PostChatReceiveResult,
} from '@/types/plugin/plugin-hooks';

// Mock the plugin store
jest.mock('@/stores/plugin', () => ({
  usePluginStore: {
    getState: jest.fn(() => ({
      plugins: {},
    })),
  },
}));

describe('Plugin Hooks System', () => {
  describe('HookPriority enum', () => {
    it('should have correct values', () => {
      expect(HookPriority.CRITICAL).toBe(100);
      expect(HookPriority.HIGH).toBe(75);
      expect(HookPriority.NORMAL).toBe(50);
      expect(HookPriority.LOW).toBe(25);
      expect(HookPriority.DEFERRED).toBe(0);
    });
  });

  describe('normalizePriority', () => {
    describe('numeric priorities', () => {
      it('should return CRITICAL for values >= 100', () => {
        expect(normalizePriority(100)).toBe(HookPriority.CRITICAL);
        expect(normalizePriority(150)).toBe(HookPriority.CRITICAL);
      });

      it('should return HIGH for values >= 75 and < 100', () => {
        expect(normalizePriority(75)).toBe(HookPriority.HIGH);
        expect(normalizePriority(99)).toBe(HookPriority.HIGH);
      });

      it('should return NORMAL for values >= 50 and < 75', () => {
        expect(normalizePriority(50)).toBe(HookPriority.NORMAL);
        expect(normalizePriority(74)).toBe(HookPriority.NORMAL);
      });

      it('should return LOW for values >= 25 and < 50', () => {
        expect(normalizePriority(25)).toBe(HookPriority.LOW);
        expect(normalizePriority(49)).toBe(HookPriority.LOW);
      });

      it('should return DEFERRED for values < 25', () => {
        expect(normalizePriority(0)).toBe(HookPriority.DEFERRED);
        expect(normalizePriority(24)).toBe(HookPriority.DEFERRED);
      });
    });

    describe('string priorities', () => {
      it('should return CRITICAL for "highest" or "critical"', () => {
        expect(normalizePriority('highest')).toBe(HookPriority.CRITICAL);
        expect(normalizePriority('critical')).toBe(HookPriority.CRITICAL);
        expect(normalizePriority('CRITICAL')).toBe(HookPriority.CRITICAL);
      });

      it('should return HIGH for "high"', () => {
        expect(normalizePriority('high')).toBe(HookPriority.HIGH);
        expect(normalizePriority('HIGH')).toBe(HookPriority.HIGH);
      });

      it('should return NORMAL for "normal"', () => {
        expect(normalizePriority('normal')).toBe(HookPriority.NORMAL);
        expect(normalizePriority('NORMAL')).toBe(HookPriority.NORMAL);
      });

      it('should return LOW for "low"', () => {
        expect(normalizePriority('low')).toBe(HookPriority.LOW);
        expect(normalizePriority('LOW')).toBe(HookPriority.LOW);
      });

      it('should return DEFERRED for "lowest" or "deferred"', () => {
        expect(normalizePriority('lowest')).toBe(HookPriority.DEFERRED);
        expect(normalizePriority('deferred')).toBe(HookPriority.DEFERRED);
      });

      it('should return NORMAL for unknown strings', () => {
        expect(normalizePriority('unknown')).toBe(HookPriority.NORMAL);
        expect(normalizePriority('random')).toBe(HookPriority.NORMAL);
      });
    });
  });

  describe('priorityToNumber', () => {
    it('should return the numeric value of priority', () => {
      expect(priorityToNumber(HookPriority.CRITICAL)).toBe(100);
      expect(priorityToNumber(HookPriority.HIGH)).toBe(75);
      expect(priorityToNumber(HookPriority.NORMAL)).toBe(50);
      expect(priorityToNumber(HookPriority.LOW)).toBe(25);
      expect(priorityToNumber(HookPriority.DEFERRED)).toBe(0);
    });
  });

  describe('priorityToString', () => {
    it('should return "high" for CRITICAL', () => {
      expect(priorityToString(HookPriority.CRITICAL)).toBe('high');
    });

    it('should return "high" for HIGH', () => {
      expect(priorityToString(HookPriority.HIGH)).toBe('high');
    });

    it('should return "normal" for NORMAL', () => {
      expect(priorityToString(HookPriority.NORMAL)).toBe('normal');
    });

    it('should return "low" for LOW', () => {
      expect(priorityToString(HookPriority.LOW)).toBe('low');
    });

    it('should return "low" for DEFERRED', () => {
      expect(priorityToString(HookPriority.DEFERRED)).toBe('low');
    });
  });
});

describe('Chat Hook System', () => {
  let hooks: PluginEventHooks;

  beforeEach(() => {
    hooks = getPluginEventHooks();
    jest.clearAllMocks();
  });

  describe('dispatchUserPromptSubmit', () => {
    it('should return proceed action when no plugins are registered', async () => {
      const context: PromptSubmitContext = {
        mode: 'chat',
        previousMessages: [],
      };

      const result = await hooks.dispatchUserPromptSubmit('Hello', 'session-1', context);

      expect(result.action).toBe('proceed');
    });

    it('should have correct result type structure', async () => {
      const context: PromptSubmitContext = {
        mode: 'agent',
        previousMessages: [
          { id: '1', role: 'user', content: 'Previous message' },
        ],
        attachments: [
          { id: 'att-1', name: 'file.txt', type: 'file' },
        ],
      };

      const result = await hooks.dispatchUserPromptSubmit('Test prompt', 'session-1', context);

      expect(result).toHaveProperty('action');
      expect(['proceed', 'block', 'modify']).toContain(result.action);
    });
  });

  describe('dispatchPreToolUse', () => {
    it('should return allow action when no plugins are registered', async () => {
      const result = await hooks.dispatchPreToolUse('testTool', { arg1: 'value' }, 'session-1');

      expect(result.action).toBe('allow');
    });

    it('should have correct result type structure', async () => {
      const result = await hooks.dispatchPreToolUse(
        'searchFiles',
        { query: 'test', path: '/src' },
        'agent-123'
      );

      expect(result).toHaveProperty('action');
      expect(['allow', 'deny', 'modify']).toContain(result.action);
    });
  });

  describe('dispatchPostToolUse', () => {
    it('should return empty result when no plugins are registered', async () => {
      const result = await hooks.dispatchPostToolUse(
        'testTool',
        { arg1: 'value' },
        { success: true, data: 'result' },
        'session-1'
      );

      expect(result).toEqual({});
    });

    it('should handle tool result with optional modifications', async () => {
      const toolResult = {
        files: ['file1.ts', 'file2.ts'],
        count: 2,
      };

      const result = await hooks.dispatchPostToolUse(
        'listFiles',
        { directory: '/src' },
        toolResult,
        'agent-456'
      );

      expect(typeof result).toBe('object');
      if (result.modifiedResult !== undefined) {
        expect(result.modifiedResult).toBeDefined();
      }
      if (result.additionalMessages) {
        expect(Array.isArray(result.additionalMessages)).toBe(true);
      }
    });
  });

  describe('dispatchPreCompact', () => {
    it('should return empty result when no plugins are registered', async () => {
      const context: PreCompactContext = {
        sessionId: 'session-1',
        messageCount: 50,
        tokenCount: 8000,
        compressionRatio: 0.8,
      };

      const result = await hooks.dispatchPreCompact(context);

      expect(result).toEqual({});
    });

    it('should handle compression context properly', async () => {
      const context: PreCompactContext = {
        sessionId: 'long-session',
        messageCount: 100,
        tokenCount: 15000,
        compressionRatio: 1.2,
      };

      const result = await hooks.dispatchPreCompact(context);

      expect(typeof result).toBe('object');
      if (result.skipCompaction !== undefined) {
        expect(typeof result.skipCompaction).toBe('boolean');
      }
      if (result.contextToInject !== undefined) {
        expect(typeof result.contextToInject).toBe('string');
      }
      if (result.customStrategy !== undefined) {
        expect(['aggressive', 'moderate', 'minimal']).toContain(result.customStrategy);
      }
    });
  });

  describe('dispatchPostChatReceive', () => {
    it('should return empty result when no plugins are registered', async () => {
      const response: ChatResponseData = {
        content: 'AI response content',
        messageId: 'msg-123',
        sessionId: 'session-1',
        model: 'gpt-4',
        provider: 'openai',
      };

      const result = await hooks.dispatchPostChatReceive(response);

      expect(result).toEqual({});
    });

    it('should handle response data with all fields', async () => {
      const response: ChatResponseData = {
        content: 'Here is a detailed analysis of the code...',
        messageId: 'msg-456',
        sessionId: 'session-2',
        model: 'claude-3-sonnet',
        provider: 'anthropic',
      };

      const result = await hooks.dispatchPostChatReceive(response);

      expect(typeof result).toBe('object');
      if (result.modifiedContent !== undefined) {
        expect(typeof result.modifiedContent).toBe('string');
      }
      if (result.additionalMessages) {
        expect(Array.isArray(result.additionalMessages)).toBe(true);
      }
      if (result.metadata) {
        expect(typeof result.metadata).toBe('object');
      }
    });
  });
});

describe('Hook Type Definitions', () => {
  it('should have valid PromptSubmitResult structure', () => {
    const proceed: PromptSubmitResult = { action: 'proceed' };
    const block: PromptSubmitResult = { action: 'block', blockReason: 'Not allowed' };
    const modify: PromptSubmitResult = {
      action: 'modify',
      modifiedPrompt: 'Enhanced prompt',
      additionalContext: 'Extra context',
    };

    expect(proceed.action).toBe('proceed');
    expect(block.blockReason).toBe('Not allowed');
    expect(modify.modifiedPrompt).toBe('Enhanced prompt');
  });

  it('should have valid PreToolUseResult structure', () => {
    const allow: PreToolUseResult = { action: 'allow' };
    const deny: PreToolUseResult = { action: 'deny', denyReason: 'Unsafe operation' };
    const modify: PreToolUseResult = {
      action: 'modify',
      modifiedArgs: { sanitized: true, input: 'safe-value' },
    };

    expect(allow.action).toBe('allow');
    expect(deny.denyReason).toBe('Unsafe operation');
    expect(modify.modifiedArgs).toEqual({ sanitized: true, input: 'safe-value' });
  });

  it('should have valid PostToolUseResult structure', () => {
    const empty: PostToolUseResult = {};
    const withModified: PostToolUseResult = {
      modifiedResult: { enhanced: true, data: 'modified' },
    };
    const withMessages: PostToolUseResult = {
      additionalMessages: [
        { id: 'msg-1', role: 'assistant', content: 'Tool executed successfully' },
      ],
    };

    expect(empty).toEqual({});
    expect(withModified.modifiedResult).toEqual({ enhanced: true, data: 'modified' });
    expect(withMessages.additionalMessages).toHaveLength(1);
  });

  it('should have valid PreCompactResult structure', () => {
    const empty: PreCompactResult = {};
    const skip: PreCompactResult = { skipCompaction: true };
    const custom: PreCompactResult = {
      customStrategy: 'aggressive',
      contextToInject: 'Important context to preserve',
    };

    expect(empty).toEqual({});
    expect(skip.skipCompaction).toBe(true);
    expect(custom.customStrategy).toBe('aggressive');
  });

  it('should have valid PostChatReceiveResult structure', () => {
    const empty: PostChatReceiveResult = {};
    const withModified: PostChatReceiveResult = {
      modifiedContent: 'Enhanced response with formatting',
    };
    const full: PostChatReceiveResult = {
      modifiedContent: 'Modified content',
      additionalMessages: [
        { id: 'follow-up', role: 'assistant', content: 'Follow-up note' },
      ],
      metadata: { analyzed: true, sentiment: 'positive' },
    };

    expect(empty).toEqual({});
    expect(withModified.modifiedContent).toBe('Enhanced response with formatting');
    expect(full.additionalMessages).toHaveLength(1);
    expect(full.metadata).toHaveProperty('sentiment', 'positive');
  });
});
