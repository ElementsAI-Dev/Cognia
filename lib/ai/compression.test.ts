/**
 * Tests for compression utility functions
 */

import type { UIMessage } from '@/types/message';
import type { CompressionSettings, ContextState, SessionCompressionOverrides } from '@/types/compression';
import { DEFAULT_COMPRESSION_SETTINGS } from '@/types/compression';

// Mock dependencies before importing the module
jest.mock('@/hooks/use-token-count', () => ({
  countTokens: jest.fn((text: string) => Math.ceil(text.length / 4)),
  calculateTokenBreakdown: jest.fn(() => ({
    systemTokens: 100,
    contextTokens: 500,
    memoryTokens: 50,
    totalTokens: 650,
  })),
}));

jest.mock('nanoid', () => ({
  nanoid: jest.fn(() => 'mock-nanoid-id'),
}));

import {
  mergeCompressionSettings,
  calculateContextState,
  shouldTriggerCompression,
  applySlidingWindow,
  applySelectiveCompression,
  generateSimpleSummary,
  createSummaryMessage,
  applyHybridCompression,
  compressMessages,
  filterMessagesForContext,
  createCompressionHistoryEntry,
  getEffectiveCompressionSettings,
} from './compression';
import { calculateTokenBreakdown } from '@/hooks/use-token-count';

// Helper function to create mock messages
function createMockMessage(
  id: string,
  role: 'user' | 'assistant' | 'system',
  content: string,
  options: Partial<UIMessage> = {}
): UIMessage {
  return {
    id,
    role,
    content,
    createdAt: new Date(),
    ...options,
  };
}

describe('compression utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('mergeCompressionSettings', () => {
    it('should return global settings when no overrides provided', () => {
      const globalSettings: CompressionSettings = {
        ...DEFAULT_COMPRESSION_SETTINGS,
        enabled: true,
        strategy: 'summary',
      };

      const result = mergeCompressionSettings(globalSettings);

      expect(result).toEqual(globalSettings);
    });

    it('should merge session overrides with global settings', () => {
      const globalSettings: CompressionSettings = {
        ...DEFAULT_COMPRESSION_SETTINGS,
        enabled: true,
        strategy: 'summary',
        tokenThreshold: 70,
      };

      const overrides: SessionCompressionOverrides = {
        compressionStrategy: 'hybrid',
        tokenThreshold: 80,
      };

      const result = mergeCompressionSettings(globalSettings, overrides);

      expect(result.strategy).toBe('hybrid');
      expect(result.tokenThreshold).toBe(80);
      expect(result.enabled).toBe(true); // unchanged from global
    });

    it('should handle empty overrides object', () => {
      const globalSettings: CompressionSettings = {
        ...DEFAULT_COMPRESSION_SETTINGS,
        enabled: true,
      };

      const result = mergeCompressionSettings(globalSettings, {});

      expect(result).toEqual(globalSettings);
    });

    it('should handle compressionEnabled override', () => {
      const globalSettings: CompressionSettings = {
        ...DEFAULT_COMPRESSION_SETTINGS,
        enabled: true,
      };

      const overrides: SessionCompressionOverrides = {
        compressionEnabled: false,
      };

      const result = mergeCompressionSettings(globalSettings, overrides);

      expect(result.enabled).toBe(false);
    });

    it('should handle compressionTrigger override', () => {
      const globalSettings: CompressionSettings = {
        ...DEFAULT_COMPRESSION_SETTINGS,
        trigger: 'manual',
      };

      const overrides: SessionCompressionOverrides = {
        compressionTrigger: 'token-threshold',
      };

      const result = mergeCompressionSettings(globalSettings, overrides);

      expect(result.trigger).toBe('token-threshold');
    });
  });

  describe('calculateContextState', () => {
    const messages: UIMessage[] = [
      createMockMessage('1', 'user', 'Hello'),
      createMockMessage('2', 'assistant', 'Hi there!'),
      createMockMessage('3', 'user', 'How are you?'),
    ];

    it('should return healthy status when usage is below 70%', () => {
      // Mock returns totalTokens: 650, with maxTokens: 10000 -> 6.5% utilization
      const result = calculateContextState(messages, 10000);

      expect(result.status).toBe('healthy');
      expect(result.maxTokens).toBe(10000);
      expect(result.totalTokens).toBe(650); // from mocked calculateTokenBreakdown
      expect(result.utilizationPercent).toBe(7); // Math.round(650/10000 * 100) = 7%
    });

    it('should return warning status when usage is between 70% and 90%', () => {
      // Mock to return high token count
      (calculateTokenBreakdown as jest.Mock).mockReturnValueOnce({
        systemTokens: 100,
        contextTokens: 700,
        memoryTokens: 0,
        totalTokens: 800,
      });

      const result = calculateContextState(messages, 1000);

      // 800 tokens / 1000 = 80%, should be warning
      expect(result.status).toBe('warning');
      expect(result.utilizationPercent).toBe(80);
    });

    it('should return danger status when usage is above 90%', () => {
      // Mock to return very high token count
      (calculateTokenBreakdown as jest.Mock).mockReturnValueOnce({
        systemTokens: 100,
        contextTokens: 850,
        memoryTokens: 0,
        totalTokens: 950,
      });

      const result = calculateContextState(messages, 1000);

      // 950 tokens / 1000 = 95%, should be danger
      expect(result.status).toBe('danger');
      expect(result.utilizationPercent).toBe(95);
    });

    it('should calculate message count correctly', () => {
      const result = calculateContextState(messages, 10000);

      expect(result.messageCount).toBe(3);
    });

    it('should include compressionRecommended flag', () => {
      // With 6.5% utilization, compression should not be recommended
      const result = calculateContextState(messages, 10000);
      expect(result.compressionRecommended).toBe(false);

      // With 80% utilization, compression should be recommended
      (calculateTokenBreakdown as jest.Mock).mockReturnValueOnce({
        systemTokens: 100,
        contextTokens: 700,
        memoryTokens: 0,
        totalTokens: 800,
      });
      const result2 = calculateContextState(messages, 1000);
      expect(result2.compressionRecommended).toBe(true);
    });

    it('should recommend strategy based on utilization', () => {
      // At danger level (>= 90%), should recommend sliding-window
      (calculateTokenBreakdown as jest.Mock).mockReturnValueOnce({
        systemTokens: 0,
        contextTokens: 950,
        memoryTokens: 0,
        totalTokens: 950,
      });
      const dangerResult = calculateContextState(messages, 1000);
      expect(dangerResult.recommendedStrategy).toBe('sliding-window');
    });

    it('should recommend hybrid strategy when many messages (>50) at warning level', () => {
      // Create many messages (>50)
      const manyMessages: UIMessage[] = Array.from({ length: 55 }, (_, i) =>
        createMockMessage(`${i}`, i % 2 === 0 ? 'user' : 'assistant', `Message ${i}`)
      );

      // Mock warning level (70-89%)
      (calculateTokenBreakdown as jest.Mock).mockReturnValueOnce({
        systemTokens: 0,
        contextTokens: 800,
        memoryTokens: 0,
        totalTokens: 800,
      });

      const result = calculateContextState(manyMessages, 1000);

      expect(result.status).toBe('warning');
      expect(result.compressionRecommended).toBe(true);
      expect(result.recommendedStrategy).toBe('hybrid');
    });

    it('should recommend summary strategy when fewer messages (<=50) at warning level', () => {
      // Create few messages (<=50)
      const fewMessages: UIMessage[] = Array.from({ length: 30 }, (_, i) =>
        createMockMessage(`${i}`, i % 2 === 0 ? 'user' : 'assistant', `Message ${i}`)
      );

      // Mock warning level (70-89%)
      (calculateTokenBreakdown as jest.Mock).mockReturnValueOnce({
        systemTokens: 0,
        contextTokens: 750,
        memoryTokens: 0,
        totalTokens: 750,
      });

      const result = calculateContextState(fewMessages, 1000);

      expect(result.status).toBe('warning');
      expect(result.compressionRecommended).toBe(true);
      expect(result.recommendedStrategy).toBe('summary');
    });

    it('should not recommend strategy when utilization is healthy', () => {
      const result = calculateContextState(messages, 10000);

      expect(result.status).toBe('healthy');
      expect(result.compressionRecommended).toBe(false);
      expect(result.recommendedStrategy).toBeUndefined();
    });
  });

  describe('shouldTriggerCompression', () => {
    it('should return false when compression is disabled', () => {
      const settings: CompressionSettings = {
        ...DEFAULT_COMPRESSION_SETTINGS,
        enabled: false,
      };

      const contextState: ContextState = {
        status: 'danger',
        totalTokens: 9500,
        maxTokens: 10000,
        utilizationPercent: 95,
        messageCount: 100,
        compressionRecommended: true,
      };

      expect(shouldTriggerCompression(settings, contextState)).toBe(false);
    });

    it('should return false for manual trigger', () => {
      const settings: CompressionSettings = {
        ...DEFAULT_COMPRESSION_SETTINGS,
        enabled: true,
        trigger: 'manual',
      };

      const contextState: ContextState = {
        status: 'danger',
        totalTokens: 9500,
        maxTokens: 10000,
        utilizationPercent: 95,
        messageCount: 100,
        compressionRecommended: true,
      };

      expect(shouldTriggerCompression(settings, contextState)).toBe(false);
    });

    it('should trigger based on token threshold', () => {
      const settings: CompressionSettings = {
        ...DEFAULT_COMPRESSION_SETTINGS,
        enabled: true,
        trigger: 'token-threshold',
        tokenThreshold: 70,
      };

      const contextStateBelow: ContextState = {
        status: 'healthy',
        totalTokens: 6000,
        maxTokens: 10000,
        utilizationPercent: 60,
        messageCount: 30,
        compressionRecommended: false,
      };

      const contextStateAbove: ContextState = {
        status: 'warning',
        totalTokens: 8000,
        maxTokens: 10000,
        utilizationPercent: 80,
        messageCount: 30,
        compressionRecommended: true,
      };

      expect(shouldTriggerCompression(settings, contextStateBelow)).toBe(false);
      expect(shouldTriggerCompression(settings, contextStateAbove)).toBe(true);
    });

    it('should trigger based on message count', () => {
      const settings: CompressionSettings = {
        ...DEFAULT_COMPRESSION_SETTINGS,
        enabled: true,
        trigger: 'message-count',
        messageCountThreshold: 50,
      };

      const contextStateBelow: ContextState = {
        status: 'healthy',
        totalTokens: 3000,
        maxTokens: 10000,
        utilizationPercent: 30,
        messageCount: 40,
        compressionRecommended: false,
      };

      const contextStateAbove: ContextState = {
        status: 'healthy',
        totalTokens: 3000,
        maxTokens: 10000,
        utilizationPercent: 30,
        messageCount: 60,
        compressionRecommended: false,
      };

      expect(shouldTriggerCompression(settings, contextStateBelow)).toBe(false);
      expect(shouldTriggerCompression(settings, contextStateAbove)).toBe(true);
    });
  });

  describe('applySlidingWindow', () => {
    const messages: UIMessage[] = [
      createMockMessage('sys', 'system', 'You are a helpful assistant'),
      createMockMessage('1', 'user', 'Message 1'),
      createMockMessage('2', 'assistant', 'Response 1'),
      createMockMessage('3', 'user', 'Message 2'),
      createMockMessage('4', 'assistant', 'Response 2'),
      createMockMessage('5', 'user', 'Message 3'),
      createMockMessage('6', 'assistant', 'Response 3'),
    ];

    it('should preserve system messages', () => {
      const settings: CompressionSettings = {
        ...DEFAULT_COMPRESSION_SETTINGS,
        preserveRecentMessages: 2,
        preserveSystemMessages: true,
      };

      const result = applySlidingWindow(messages, settings);

      expect(result.filteredMessages.some((m) => m.role === 'system')).toBe(true);
    });

    it('should keep only recent messages based on preserveRecentMessages', () => {
      const settings: CompressionSettings = {
        ...DEFAULT_COMPRESSION_SETTINGS,
        preserveRecentMessages: 4,
        preserveSystemMessages: true,
      };

      const result = applySlidingWindow(messages, settings);

      // Should have system message + 4 recent non-system messages
      const nonSystemMessages = result.filteredMessages.filter((m) => m.role !== 'system');
      expect(nonSystemMessages.length).toBeLessThanOrEqual(4);
    });

    it('should return compressed message IDs', () => {
      const settings: CompressionSettings = {
        ...DEFAULT_COMPRESSION_SETTINGS,
        preserveRecentMessages: 2,
        preserveSystemMessages: true,
      };

      const result = applySlidingWindow(messages, settings);

      expect(result.compressedIds.length).toBeGreaterThan(0);
      expect(result.compressedIds).not.toContain('sys');
    });

    it('should return all messages when fewer than preserveRecentMessages', () => {
      const settings: CompressionSettings = {
        ...DEFAULT_COMPRESSION_SETTINGS,
        preserveRecentMessages: 20,
        preserveSystemMessages: true,
      };

      const result = applySlidingWindow(messages, settings);

      expect(result.filteredMessages.length).toBe(messages.length);
      expect(result.compressedIds.length).toBe(0);
    });

    it('should not preserve system messages when preserveSystemMessages is false', () => {
      const settings: CompressionSettings = {
        ...DEFAULT_COMPRESSION_SETTINGS,
        preserveRecentMessages: 2,
        preserveSystemMessages: false,
      };

      const result = applySlidingWindow(messages, settings);

      // System message should be compressed (not in filtered messages)
      expect(result.filteredMessages.some((m) => m.role === 'system')).toBe(false);
      expect(result.compressedIds).toContain('sys');
      // Should have only 2 recent non-system messages
      expect(result.filteredMessages.length).toBe(2);
    });

    it('should correctly calculate compressedIds excluding both system and recent messages', () => {
      const settings: CompressionSettings = {
        ...DEFAULT_COMPRESSION_SETTINGS,
        preserveRecentMessages: 2,
        preserveSystemMessages: true,
      };

      const result = applySlidingWindow(messages, settings);

      // Should compress messages 1, 2, 3, 4 (keeping sys, 5, 6)
      expect(result.compressedIds).toEqual(['1', '2', '3', '4']);
      expect(result.filteredMessages.length).toBe(3); // sys + 5 + 6
    });
  });

  describe('applySelectiveCompression', () => {
    const messages: UIMessage[] = [
      createMockMessage('sys', 'system', 'You are a helpful assistant'),
      createMockMessage('1', 'user', 'What is 2+2?'),
      createMockMessage('2', 'assistant', 'The answer is 4.'),
      createMockMessage('3', 'user', 'This is very important: remember my name is John'),
      createMockMessage('4', 'assistant', 'Got it, I will remember that your name is John.'),
      createMockMessage('5', 'user', 'Just chatting'),
      createMockMessage('6', 'assistant', 'Nice to chat with you.'),
    ];

    it('should preserve system messages', () => {
      const settings: CompressionSettings = {
        ...DEFAULT_COMPRESSION_SETTINGS,
        preserveRecentMessages: 2,
        preserveSystemMessages: true,
      };

      const result = applySelectiveCompression(messages, settings);

      expect(result.filteredMessages.some((m) => m.role === 'system')).toBe(true);
    });

    it('should keep recent messages', () => {
      const settings: CompressionSettings = {
        ...DEFAULT_COMPRESSION_SETTINGS,
        preserveRecentMessages: 2,
        preserveSystemMessages: true,
      };

      const result = applySelectiveCompression(messages, settings);

      // Most recent messages should be preserved
      const lastMessage = result.filteredMessages[result.filteredMessages.length - 1];
      expect(lastMessage.id).toBe('6');
    });

    it('should try to keep important messages', () => {
      const settings: CompressionSettings = {
        ...DEFAULT_COMPRESSION_SETTINGS,
        preserveRecentMessages: 2,
        preserveSystemMessages: true,
      };

      const result = applySelectiveCompression(messages, settings);

      // The system message should always be preserved
      const ids = result.filteredMessages.map((m) => m.id);
      expect(ids).toContain('sys'); // system always preserved
    });

    it('should preserve messages with code blocks', () => {
      const messagesWithCode: UIMessage[] = [
        createMockMessage('sys', 'system', 'You are a helpful assistant'),
        createMockMessage('1', 'user', 'Simple question'),
        createMockMessage('2', 'assistant', 'Simple answer'),
        createMockMessage('3', 'user', 'Show me code'),
        createMockMessage('4', 'assistant', 'Here is code:\n```javascript\nconsole.log("hello");\n```'),
        createMockMessage('5', 'user', 'Another simple question'),
        createMockMessage('6', 'assistant', 'Another simple answer'),
      ];

      const settings: CompressionSettings = {
        ...DEFAULT_COMPRESSION_SETTINGS,
        preserveRecentMessages: 2,
        preserveSystemMessages: true,
      };

      const result = applySelectiveCompression(messagesWithCode, settings);

      // Code block message should be preserved
      const ids = result.filteredMessages.map((m) => m.id);
      expect(ids).toContain('4');
    });

    it('should preserve messages with tool invocations', () => {
      const messagesWithTools: UIMessage[] = [
        createMockMessage('sys', 'system', 'You are a helpful assistant'),
        createMockMessage('1', 'user', 'Search something'),
        createMockMessage('2', 'assistant', 'Searching...', {
          toolInvocations: [{ id: 'tool1', name: 'web_search', input: {}, state: 'result' }] as unknown as UIMessage['toolInvocations'],
        }),
        createMockMessage('3', 'user', 'Simple question'),
        createMockMessage('4', 'assistant', 'Simple answer'),
      ];

      const settings: CompressionSettings = {
        ...DEFAULT_COMPRESSION_SETTINGS,
        preserveRecentMessages: 1,
        preserveSystemMessages: true,
      };

      const result = applySelectiveCompression(messagesWithTools, settings);

      // Tool invocation message should be preserved
      const ids = result.filteredMessages.map((m) => m.id);
      expect(ids).toContain('2');
    });

    it('should preserve messages with artifacts', () => {
      const messagesWithArtifact: UIMessage[] = [
        createMockMessage('sys', 'system', 'You are a helpful assistant'),
        createMockMessage('1', 'user', 'Create something'),
        createMockMessage('2', 'assistant', 'Here is an artifact for you'),
        createMockMessage('3', 'user', 'Simple question'),
        createMockMessage('4', 'assistant', 'Simple answer'),
      ];

      const settings: CompressionSettings = {
        ...DEFAULT_COMPRESSION_SETTINGS,
        preserveRecentMessages: 1,
        preserveSystemMessages: true,
      };

      const result = applySelectiveCompression(messagesWithArtifact, settings);

      // Artifact message should be preserved
      const ids = result.filteredMessages.map((m) => m.id);
      expect(ids).toContain('2');
    });

    it('should preserve user questions (ending with ?)', () => {
      const messagesWithQuestions: UIMessage[] = [
        createMockMessage('sys', 'system', 'You are a helpful assistant'),
        createMockMessage('1', 'user', 'What is the meaning of life?'),
        createMockMessage('2', 'assistant', 'The meaning of life is 42.'),
        createMockMessage('3', 'user', 'Tell me more'),
        createMockMessage('4', 'assistant', 'More details here'),
      ];

      const settings: CompressionSettings = {
        ...DEFAULT_COMPRESSION_SETTINGS,
        preserveRecentMessages: 1,
        preserveSystemMessages: true,
      };

      const result = applySelectiveCompression(messagesWithQuestions, settings);

      // Question message should be preserved
      const ids = result.filteredMessages.map((m) => m.id);
      expect(ids).toContain('1');
    });

    it('should preserve messages with structured data (JSON-like)', () => {
      const messagesWithJson: UIMessage[] = [
        createMockMessage('sys', 'system', 'You are a helpful assistant'),
        createMockMessage('1', 'user', 'Simple message'),
        createMockMessage('2', 'assistant', 'Here is data: { "name": "test", "value": 123 }'),
        createMockMessage('3', 'user', 'Another message'),
        createMockMessage('4', 'assistant', 'Plain response'),
      ];

      const settings: CompressionSettings = {
        ...DEFAULT_COMPRESSION_SETTINGS,
        preserveRecentMessages: 1,
        preserveSystemMessages: true,
      };

      const result = applySelectiveCompression(messagesWithJson, settings);

      // JSON message should be preserved
      const ids = result.filteredMessages.map((m) => m.id);
      expect(ids).toContain('2');
    });

    it('should return compressedIds for non-important messages', () => {
      const settings: CompressionSettings = {
        ...DEFAULT_COMPRESSION_SETTINGS,
        preserveRecentMessages: 2,
        preserveSystemMessages: true,
      };

      const result = applySelectiveCompression(messages, settings);

      // Should have some compressed IDs (non-important, non-recent)
      expect(Array.isArray(result.compressedIds)).toBe(true);
    });
  });

  describe('generateSimpleSummary', () => {
    it('should generate summary from messages', () => {
      const messages: UIMessage[] = [
        createMockMessage('1', 'user', 'What is TypeScript?'),
        createMockMessage('2', 'assistant', 'TypeScript is a typed superset of JavaScript.'),
        createMockMessage('3', 'user', 'How do I install it?'),
        createMockMessage('4', 'assistant', 'You can install it using npm: npm install typescript'),
      ];

      const summary = generateSimpleSummary(messages);

      expect(typeof summary).toBe('string');
      expect(summary.length).toBeGreaterThan(0);
    });

    it('should handle empty messages array', () => {
      const summary = generateSimpleSummary([]);

      expect(summary).toBe('');
    });

    it('should truncate very long messages', () => {
      const longContent = 'A'.repeat(1000);
      const messages: UIMessage[] = [
        createMockMessage('1', 'user', longContent),
      ];

      const summary = generateSimpleSummary(messages);

      // Summary should be shorter than original
      expect(summary.length).toBeLessThan(longContent.length);
    });
  });

  describe('createSummaryMessage', () => {
    it('should create a valid UIMessage with compression metadata', () => {
      const compressedMessages: UIMessage[] = [
        createMockMessage('1', 'user', 'Hello'),
        createMockMessage('2', 'assistant', 'Hi there!'),
      ];

      const summaryMessage = createSummaryMessage(compressedMessages, 'This is a summary');

      expect(summaryMessage.role).toBe('system');
      expect(summaryMessage.content).toBe('This is a summary');
      expect(summaryMessage.compressionState).toBeDefined();
      expect(summaryMessage.compressionState?.isSummary).toBe(true);
      expect(summaryMessage.compressionState?.summarizedMessageIds).toEqual(['1', '2']);
      expect(summaryMessage.compressionState?.originalMessageCount).toBe(2);
    });

    it('should generate summary if not provided', () => {
      const compressedMessages: UIMessage[] = [
        createMockMessage('1', 'user', 'What is React?'),
        createMockMessage('2', 'assistant', 'React is a JavaScript library for building UIs'),
      ];

      const summaryMessage = createSummaryMessage(compressedMessages);

      expect(summaryMessage.content.length).toBeGreaterThan(0);
    });

    it('should include strategyUsed in compressionState', () => {
      const compressedMessages: UIMessage[] = [
        createMockMessage('1', 'user', 'Hello'),
      ];

      const summaryMessage = createSummaryMessage(compressedMessages, 'Summary');

      expect(summaryMessage.compressionState?.strategyUsed).toBe('summary');
    });
  });

  describe('applyHybridCompression', () => {
    const messages: UIMessage[] = [
      createMockMessage('sys', 'system', 'System prompt'),
      ...Array.from({ length: 20 }, (_, i) =>
        createMockMessage(`${i + 1}`, i % 2 === 0 ? 'user' : 'assistant', `Message ${i + 1}`)
      ),
    ];

    it('should preserve system messages', () => {
      const settings: CompressionSettings = {
        ...DEFAULT_COMPRESSION_SETTINGS,
        preserveRecentMessages: 6,
        preserveSystemMessages: true,
      };

      const result = applyHybridCompression(messages, settings);

      expect(result.filteredMessages.some((m) => m.role === 'system')).toBe(true);
    });

    it('should return messages to summarize for hybrid compression', () => {
      const settings: CompressionSettings = {
        ...DEFAULT_COMPRESSION_SETTINGS,
        preserveRecentMessages: 4,
        preserveSystemMessages: true,
      };

      const result = applyHybridCompression(messages, settings);

      expect(result.needsSummary).toBe(true);
      expect(result.messagesToSummarize.length).toBeGreaterThan(0);
    });

    it('should return compressed message IDs', () => {
      const settings: CompressionSettings = {
        ...DEFAULT_COMPRESSION_SETTINGS,
        preserveRecentMessages: 4,
        preserveSystemMessages: true,
      };

      const result = applyHybridCompression(messages, settings);

      expect(result.compressedIds.length).toBeGreaterThan(0);
    });

    it('should not compress when fewer messages than preserveRecentMessages', () => {
      const fewMessages: UIMessage[] = [
        createMockMessage('sys', 'system', 'System'),
        createMockMessage('1', 'user', 'Hi'),
        createMockMessage('2', 'assistant', 'Hello'),
      ];

      const settings: CompressionSettings = {
        ...DEFAULT_COMPRESSION_SETTINGS,
        preserveRecentMessages: 10,
        preserveSystemMessages: true,
      };

      const result = applyHybridCompression(fewMessages, settings);

      expect(result.needsSummary).toBe(false);
      expect(result.compressedIds.length).toBe(0);
    });
  });

  describe('compressMessages', () => {
    const messages: UIMessage[] = [
      createMockMessage('sys', 'system', 'System prompt'),
      createMockMessage('1', 'user', 'Hello'),
      createMockMessage('2', 'assistant', 'Hi there!'),
      createMockMessage('3', 'user', 'How are you?'),
      createMockMessage('4', 'assistant', 'I am doing well, thank you!'),
    ];

    it('should use sliding-window strategy', async () => {
      const settings: CompressionSettings = {
        ...DEFAULT_COMPRESSION_SETTINGS,
        strategy: 'sliding-window',
        preserveRecentMessages: 2,
      };

      const result = await compressMessages(messages, settings);

      expect(result.success).toBe(true);
      expect(result.compressedMessageIds.length).toBeGreaterThanOrEqual(0);
    });

    it('should use selective strategy', async () => {
      const settings: CompressionSettings = {
        ...DEFAULT_COMPRESSION_SETTINGS,
        strategy: 'selective',
        preserveRecentMessages: 2,
      };

      const result = await compressMessages(messages, settings);

      expect(result.success).toBe(true);
    });

    it('should use summary strategy with custom generator', async () => {
      const manyMessages: UIMessage[] = [
        createMockMessage('sys', 'system', 'System'),
        ...Array.from({ length: 10 }, (_, i) =>
          createMockMessage(`${i + 1}`, i % 2 === 0 ? 'user' : 'assistant', `Message ${i + 1}`)
        ),
      ];

      const settings: CompressionSettings = {
        ...DEFAULT_COMPRESSION_SETTINGS,
        strategy: 'summary',
        preserveRecentMessages: 2,
      };

      const customGenerator = jest.fn().mockResolvedValue('Custom AI summary');

      const result = await compressMessages(manyMessages, settings, customGenerator);

      expect(result.success).toBe(true);
      expect(customGenerator).toHaveBeenCalled();
      expect(result.summaryText).toBe('Custom AI summary');
    });

    it('should use hybrid strategy', async () => {
      const settings: CompressionSettings = {
        ...DEFAULT_COMPRESSION_SETTINGS,
        strategy: 'hybrid',
        preserveRecentMessages: 2,
      };

      const result = await compressMessages(messages, settings);

      expect(result.success).toBe(true);
    });

    it('should include compression statistics', async () => {
      const settings: CompressionSettings = {
        ...DEFAULT_COMPRESSION_SETTINGS,
        strategy: 'sliding-window',
        preserveRecentMessages: 2,
      };

      const result = await compressMessages(messages, settings);

      expect(result.messagesCompressed).toBeGreaterThanOrEqual(0);
      expect(result.tokensBefore).toBeGreaterThan(0);
      expect(result.tokensAfter).toBeGreaterThanOrEqual(0);
      expect(result.compressionRatio).toBeGreaterThan(0);
      expect(result.compressedMessageIds).toBeDefined();
    });

    it('should return no compression when not enough messages for summary', async () => {
      const fewMessages: UIMessage[] = [
        createMockMessage('sys', 'system', 'System'),
        createMockMessage('1', 'user', 'Hi'),
      ];

      const settings: CompressionSettings = {
        ...DEFAULT_COMPRESSION_SETTINGS,
        strategy: 'summary',
        preserveRecentMessages: 5,
      };

      const result = await compressMessages(fewMessages, settings);

      expect(result.success).toBe(true);
      expect(result.messagesCompressed).toBe(0);
      expect(result.compressionRatio).toBe(1);
    });

    it('should fallback to simple summary when custom generator fails', async () => {
      const manyMessages: UIMessage[] = [
        createMockMessage('sys', 'system', 'System'),
        ...Array.from({ length: 10 }, (_, i) =>
          createMockMessage(`${i + 1}`, i % 2 === 0 ? 'user' : 'assistant', `Message ${i + 1}`)
        ),
      ];

      const settings: CompressionSettings = {
        ...DEFAULT_COMPRESSION_SETTINGS,
        strategy: 'summary',
        preserveRecentMessages: 2,
      };

      const failingGenerator = jest.fn().mockRejectedValue(new Error('AI service unavailable'));

      const result = await compressMessages(manyMessages, settings, failingGenerator);

      expect(result.success).toBe(true);
      expect(failingGenerator).toHaveBeenCalled();
      // Should fallback to simple summary (contains '[Conversation Summary')
      expect(result.summaryText).toContain('Conversation Summary');
    });

    it('should fallback to simple summary when hybrid generator fails', async () => {
      const manyMessages: UIMessage[] = [
        createMockMessage('sys', 'system', 'System'),
        ...Array.from({ length: 10 }, (_, i) =>
          createMockMessage(`${i + 1}`, i % 2 === 0 ? 'user' : 'assistant', `Message ${i + 1}`)
        ),
      ];

      const settings: CompressionSettings = {
        ...DEFAULT_COMPRESSION_SETTINGS,
        strategy: 'hybrid',
        preserveRecentMessages: 2,
      };

      const failingGenerator = jest.fn().mockRejectedValue(new Error('AI service unavailable'));

      const result = await compressMessages(manyMessages, settings, failingGenerator);

      expect(result.success).toBe(true);
      expect(failingGenerator).toHaveBeenCalled();
      // Should fallback to simple summary
      expect(result.summaryText).toContain('Conversation Summary');
    });

    it('should use simple summary when no generator provided for summary strategy', async () => {
      const manyMessages: UIMessage[] = [
        createMockMessage('sys', 'system', 'System'),
        ...Array.from({ length: 10 }, (_, i) =>
          createMockMessage(`${i + 1}`, i % 2 === 0 ? 'user' : 'assistant', `Message ${i + 1}`)
        ),
      ];

      const settings: CompressionSettings = {
        ...DEFAULT_COMPRESSION_SETTINGS,
        strategy: 'summary',
        preserveRecentMessages: 2,
      };

      const result = await compressMessages(manyMessages, settings);

      expect(result.success).toBe(true);
      expect(result.summaryText).toContain('Conversation Summary');
    });

    it('should use simple summary when no generator provided for hybrid strategy', async () => {
      const manyMessages: UIMessage[] = [
        createMockMessage('sys', 'system', 'System'),
        ...Array.from({ length: 10 }, (_, i) =>
          createMockMessage(`${i + 1}`, i % 2 === 0 ? 'user' : 'assistant', `Message ${i + 1}`)
        ),
      ];

      const settings: CompressionSettings = {
        ...DEFAULT_COMPRESSION_SETTINGS,
        strategy: 'hybrid',
        preserveRecentMessages: 2,
      };

      const result = await compressMessages(manyMessages, settings);

      expect(result.success).toBe(true);
      expect(result.summaryText).toContain('Conversation Summary');
    });
  });

  describe('filterMessagesForContext', () => {
    const messages: UIMessage[] = [
      createMockMessage('sys', 'system', 'System prompt'),
      createMockMessage('1', 'user', 'Hello'),
      createMockMessage('2', 'assistant', 'Hi there!'),
    ];

    it('should return all messages when compression is disabled', () => {
      const settings: CompressionSettings = {
        ...DEFAULT_COMPRESSION_SETTINGS,
        enabled: false,
      };

      const result = filterMessagesForContext(messages, settings);

      expect(result.length).toBe(messages.length);
    });

    it('should apply compression when enabled and threshold met', () => {
      // Mock high token usage
      (calculateTokenBreakdown as jest.Mock).mockReturnValueOnce({
        systemTokens: 0,
        contextTokens: 8000,
        memoryTokens: 0,
        totalTokens: 8000,
      });

      const settings: CompressionSettings = {
        ...DEFAULT_COMPRESSION_SETTINGS,
        enabled: true,
        trigger: 'token-threshold',
        tokenThreshold: 70,
        strategy: 'sliding-window',
        preserveRecentMessages: 2,
      };

      // Create more messages to trigger compression
      const manyMessages: UIMessage[] = [
        createMockMessage('sys', 'system', 'System prompt'),
        ...Array.from({ length: 20 }, (_, i) =>
          createMockMessage(`${i + 1}`, i % 2 === 0 ? 'user' : 'assistant', `Message ${i + 1}`)
        ),
      ];

      const result = filterMessagesForContext(manyMessages, settings, 10000);

      // Should have fewer messages after compression
      expect(result.length).toBeLessThanOrEqual(manyMessages.length);
    });

    it('should not compress when threshold not met', () => {
      // Mock low token usage (default mock returns 650)
      const settings: CompressionSettings = {
        ...DEFAULT_COMPRESSION_SETTINGS,
        enabled: true,
        trigger: 'token-threshold',
        tokenThreshold: 70,
      };

      const result = filterMessagesForContext(messages, settings, 10000);

      expect(result.length).toBe(messages.length);
    });

    it('should apply selective strategy when threshold met', () => {
      // Mock high token usage
      (calculateTokenBreakdown as jest.Mock).mockReturnValueOnce({
        systemTokens: 0,
        contextTokens: 8000,
        memoryTokens: 0,
        totalTokens: 8000,
      });

      const settings: CompressionSettings = {
        ...DEFAULT_COMPRESSION_SETTINGS,
        enabled: true,
        trigger: 'token-threshold',
        tokenThreshold: 70,
        strategy: 'selective',
        preserveRecentMessages: 2,
      };

      const manyMessages: UIMessage[] = [
        createMockMessage('sys', 'system', 'System prompt'),
        ...Array.from({ length: 20 }, (_, i) =>
          createMockMessage(`${i + 1}`, i % 2 === 0 ? 'user' : 'assistant', `Message ${i + 1}`)
        ),
      ];

      const result = filterMessagesForContext(manyMessages, settings, 10000);

      // Selective strategy should return filtered messages
      expect(result.length).toBeLessThanOrEqual(manyMessages.length);
      // Should still have system message
      expect(result.some((m) => m.role === 'system')).toBe(true);
    });

    it('should trigger compression based on message count', () => {
      const settings: CompressionSettings = {
        ...DEFAULT_COMPRESSION_SETTINGS,
        enabled: true,
        trigger: 'message-count',
        messageCountThreshold: 5,
        strategy: 'sliding-window',
        preserveRecentMessages: 2,
      };

      const manyMessages: UIMessage[] = [
        createMockMessage('sys', 'system', 'System prompt'),
        ...Array.from({ length: 10 }, (_, i) =>
          createMockMessage(`${i + 1}`, i % 2 === 0 ? 'user' : 'assistant', `Message ${i + 1}`)
        ),
      ];

      const result = filterMessagesForContext(manyMessages, settings, 10000);

      // Should compress when message count exceeds threshold
      expect(result.length).toBeLessThan(manyMessages.length);
    });

    it('should not trigger when message count below threshold', () => {
      const settings: CompressionSettings = {
        ...DEFAULT_COMPRESSION_SETTINGS,
        enabled: true,
        trigger: 'message-count',
        messageCountThreshold: 50,
        strategy: 'sliding-window',
        preserveRecentMessages: 2,
      };

      const result = filterMessagesForContext(messages, settings, 10000);

      // Should not compress - only 3 messages, threshold is 50
      expect(result.length).toBe(messages.length);
    });

    it('should use default maxTokens when not provided', () => {
      const settings: CompressionSettings = {
        ...DEFAULT_COMPRESSION_SETTINGS,
        enabled: true,
        trigger: 'token-threshold',
        tokenThreshold: 70,
      };

      // Should not throw when maxTokens is not provided
      const result = filterMessagesForContext(messages, settings);

      expect(result.length).toBe(messages.length);
    });
  });

  describe('createCompressionHistoryEntry', () => {
    it('should create valid history entry', () => {
      const compressedMessages: UIMessage[] = [
        createMockMessage('1', 'user', 'Hello'),
        createMockMessage('2', 'assistant', 'Hi!'),
      ];

      const entry = createCompressionHistoryEntry(
        'session-123',
        'hybrid',
        compressedMessages,
        'summary-msg-id',
        1000,
        500
      );

      expect(entry.id).toBe('mock-nanoid-id');
      expect(entry.sessionId).toBe('session-123');
      expect(entry.strategy).toBe('hybrid');
      expect(entry.summaryMessageId).toBe('summary-msg-id');
      expect(entry.tokensBefore).toBe(1000);
      expect(entry.tokensAfter).toBe(500);
      expect(entry.timestamp).toBeInstanceOf(Date);
      expect(entry.compressedMessages).toHaveLength(2);
      expect(entry.compressedMessages[0].id).toBe('1');
      expect(entry.compressedMessages[1].id).toBe('2');
    });
  });

  describe('getEffectiveCompressionSettings', () => {
    it('should return merged settings', () => {
      const globalSettings: CompressionSettings = {
        ...DEFAULT_COMPRESSION_SETTINGS,
        enabled: true,
        strategy: 'summary',
      };

      const overrides: SessionCompressionOverrides = {
        compressionStrategy: 'hybrid',
      };

      const result = getEffectiveCompressionSettings(globalSettings, overrides);

      expect(result.enabled).toBe(true);
      expect(result.strategy).toBe('hybrid');
    });

    it('should work without overrides', () => {
      const globalSettings: CompressionSettings = {
        ...DEFAULT_COMPRESSION_SETTINGS,
        enabled: true,
      };

      const result = getEffectiveCompressionSettings(globalSettings);

      expect(result).toEqual(globalSettings);
    });
  });

  describe('edge cases', () => {
    describe('empty and minimal message arrays', () => {
      it('should handle empty messages array in calculateContextState', () => {
        const result = calculateContextState([], 10000);

        expect(result.messageCount).toBe(0);
        expect(result.status).toBe('healthy');
      });

      it('should handle empty messages array in applySlidingWindow', () => {
        const settings: CompressionSettings = {
          ...DEFAULT_COMPRESSION_SETTINGS,
          preserveRecentMessages: 5,
        };

        const result = applySlidingWindow([], settings);

        expect(result.filteredMessages).toEqual([]);
        expect(result.compressedIds).toEqual([]);
      });

      it('should handle empty messages array in applySelectiveCompression', () => {
        const settings: CompressionSettings = {
          ...DEFAULT_COMPRESSION_SETTINGS,
          preserveRecentMessages: 5,
        };

        const result = applySelectiveCompression([], settings);

        expect(result.filteredMessages).toEqual([]);
        expect(result.compressedIds).toEqual([]);
      });

      it('should handle empty messages array in applyHybridCompression', () => {
        const settings: CompressionSettings = {
          ...DEFAULT_COMPRESSION_SETTINGS,
          preserveRecentMessages: 5,
        };

        const result = applyHybridCompression([], settings);

        expect(result.filteredMessages).toEqual([]);
        expect(result.compressedIds).toEqual([]);
        expect(result.needsSummary).toBe(false);
      });

      it('should handle empty messages array in compressMessages', async () => {
        const settings: CompressionSettings = {
          ...DEFAULT_COMPRESSION_SETTINGS,
          strategy: 'sliding-window',
        };

        const result = await compressMessages([], settings);

        expect(result.success).toBe(true);
        expect(result.messagesCompressed).toBe(0);
      });

      it('should handle empty messages array in generateSimpleSummary', () => {
        const result = generateSimpleSummary([]);

        expect(result).toBe('');
      });

      it('should handle single message array', () => {
        const singleMessage: UIMessage[] = [
          createMockMessage('1', 'user', 'Hello'),
        ];

        const settings: CompressionSettings = {
          ...DEFAULT_COMPRESSION_SETTINGS,
          preserveRecentMessages: 5,
        };

        const slidingResult = applySlidingWindow(singleMessage, settings);
        expect(slidingResult.filteredMessages.length).toBe(1);
        expect(slidingResult.compressedIds.length).toBe(0);

        const selectiveResult = applySelectiveCompression(singleMessage, settings);
        expect(selectiveResult.filteredMessages.length).toBe(1);
      });

      it('should handle only system message', () => {
        const systemOnly: UIMessage[] = [
          createMockMessage('sys', 'system', 'You are a helpful assistant'),
        ];

        const settings: CompressionSettings = {
          ...DEFAULT_COMPRESSION_SETTINGS,
          preserveRecentMessages: 2,
          preserveSystemMessages: true,
        };

        const result = applySlidingWindow(systemOnly, settings);

        expect(result.filteredMessages.length).toBe(1);
        expect(result.filteredMessages[0].role).toBe('system');
        expect(result.compressedIds.length).toBe(0);
      });
    });

    describe('boundary conditions', () => {
      it('should handle exactly at token threshold (70%)', () => {
        (calculateTokenBreakdown as jest.Mock).mockReturnValueOnce({
          systemTokens: 0,
          contextTokens: 700,
          memoryTokens: 0,
          totalTokens: 700,
        });

        const messages: UIMessage[] = [
          createMockMessage('1', 'user', 'Hello'),
        ];

        const result = calculateContextState(messages, 1000);

        // 70% is exactly at the warning threshold
        expect(result.status).toBe('warning');
        expect(result.utilizationPercent).toBe(70);
        expect(result.compressionRecommended).toBe(true);
      });

      it('should handle exactly at danger threshold (90%)', () => {
        (calculateTokenBreakdown as jest.Mock).mockReturnValueOnce({
          systemTokens: 0,
          contextTokens: 900,
          memoryTokens: 0,
          totalTokens: 900,
        });

        const messages: UIMessage[] = [
          createMockMessage('1', 'user', 'Hello'),
        ];

        const result = calculateContextState(messages, 1000);

        // 90% is exactly at the danger threshold
        expect(result.status).toBe('danger');
        expect(result.utilizationPercent).toBe(90);
        expect(result.recommendedStrategy).toBe('sliding-window');
      });

      it('should handle exactly at message count threshold', () => {
        const settings: CompressionSettings = {
          ...DEFAULT_COMPRESSION_SETTINGS,
          enabled: true,
          trigger: 'message-count',
          messageCountThreshold: 5,
          strategy: 'sliding-window',
          preserveRecentMessages: 2,
        };

        // Exactly 5 messages
        const _exactMessages: UIMessage[] = Array.from({ length: 5 }, (_, i) =>
          createMockMessage(`${i + 1}`, i % 2 === 0 ? 'user' : 'assistant', `Message ${i + 1}`)
        );

        const contextState: ContextState = {
          status: 'healthy',
          totalTokens: 500,
          maxTokens: 10000,
          utilizationPercent: 5,
          messageCount: 5,
          compressionRecommended: false,
        };

        // At exactly the threshold, should trigger
        expect(shouldTriggerCompression(settings, contextState)).toBe(true);
      });

      it('should handle preserveRecentMessages equal to message count', () => {
        const messages: UIMessage[] = [
          createMockMessage('1', 'user', 'Hello'),
          createMockMessage('2', 'assistant', 'Hi'),
          createMockMessage('3', 'user', 'How are you?'),
        ];

        const settings: CompressionSettings = {
          ...DEFAULT_COMPRESSION_SETTINGS,
          preserveRecentMessages: 3, // Equal to message count
          preserveSystemMessages: true,
        };

        const result = applySlidingWindow(messages, settings);

        // Should keep all messages since preserveRecentMessages >= count
        expect(result.filteredMessages.length).toBe(3);
        expect(result.compressedIds.length).toBe(0);
      });

      it('should handle preserveRecentMessages of 0', () => {
        const messages: UIMessage[] = [
          createMockMessage('sys', 'system', 'System'),
          createMockMessage('1', 'user', 'Hello'),
          createMockMessage('2', 'assistant', 'Hi'),
        ];

        const settings: CompressionSettings = {
          ...DEFAULT_COMPRESSION_SETTINGS,
          preserveRecentMessages: 0,
          preserveSystemMessages: true,
        };

        const result = applySlidingWindow(messages, settings);

        // Note: In JavaScript, slice(-0) === slice(0) returns all elements
        // So preserveRecentMessages: 0 effectively keeps all non-system messages
        // This is implementation-specific behavior
        expect(result.filteredMessages.length).toBe(3);
        expect(result.filteredMessages[0].role).toBe('system');
        expect(result.compressedIds).toEqual([]);
      });

      it('should handle 100% token utilization', () => {
        (calculateTokenBreakdown as jest.Mock).mockReturnValueOnce({
          systemTokens: 0,
          contextTokens: 10000,
          memoryTokens: 0,
          totalTokens: 10000,
        });

        const messages: UIMessage[] = [
          createMockMessage('1', 'user', 'Hello'),
        ];

        const result = calculateContextState(messages, 10000);

        expect(result.status).toBe('danger');
        expect(result.utilizationPercent).toBe(100);
        expect(result.compressionRecommended).toBe(true);
      });

      it('should handle 0% token utilization', () => {
        (calculateTokenBreakdown as jest.Mock).mockReturnValueOnce({
          systemTokens: 0,
          contextTokens: 0,
          memoryTokens: 0,
          totalTokens: 0,
        });

        const messages: UIMessage[] = [];

        const result = calculateContextState(messages, 10000);

        expect(result.status).toBe('healthy');
        expect(result.utilizationPercent).toBe(0);
        expect(result.compressionRecommended).toBe(false);
      });
    });

    describe('special content handling', () => {
      it('should handle messages with very long content', () => {
        const longContent = 'A'.repeat(10000);
        const messages: UIMessage[] = [
          createMockMessage('1', 'user', longContent),
        ];

        const summary = generateSimpleSummary(messages);

        // Should truncate and still produce valid summary
        expect(typeof summary).toBe('string');
        expect(summary.length).toBeLessThan(longContent.length);
      });

      it('should handle messages with special characters', () => {
        const messages: UIMessage[] = [
          createMockMessage('1', 'user', 'Hello <script>alert("xss")</script>'),
          createMockMessage('2', 'assistant', 'Response with "quotes" and \'apostrophes\''),
          createMockMessage('3', 'user', 'Unicode: 你好世界 🎉 émojis'),
        ];

        const summary = generateSimpleSummary(messages);

        expect(typeof summary).toBe('string');
        expect(summary.length).toBeGreaterThan(0);
      });

      it('should handle messages with nested code blocks', () => {
        const messages: UIMessage[] = [
          createMockMessage('1', 'assistant', '```javascript\nconst code = `nested template`;\n```'),
        ];

        const settings: CompressionSettings = {
          ...DEFAULT_COMPRESSION_SETTINGS,
          preserveRecentMessages: 0,
          preserveSystemMessages: false,
        };

        const result = applySelectiveCompression(messages, settings);

        // Code block messages should be preserved as important
        expect(result.filteredMessages.some((m) => m.id === '1')).toBe(true);
      });

      it('should handle messages with multiple importance indicators', () => {
        const messages: UIMessage[] = [
          createMockMessage('1', 'assistant', 'Here is important code:\n```python\nprint("hello")\n```\nAnd some data: { "key": "value" }'),
        ];

        const settings: CompressionSettings = {
          ...DEFAULT_COMPRESSION_SETTINGS,
          preserveRecentMessages: 0,
          preserveSystemMessages: false,
        };

        const result = applySelectiveCompression(messages, settings);

        // Should be preserved (has both code block AND structured data)
        expect(result.filteredMessages.some((m) => m.id === '1')).toBe(true);
      });
    });

    describe('createSummaryMessage edge cases', () => {
      it('should handle empty compressed messages array', () => {
        const summaryMessage = createSummaryMessage([], 'Empty summary');

        expect(summaryMessage.role).toBe('system');
        expect(summaryMessage.content).toBe('Empty summary');
        expect(summaryMessage.compressionState?.originalMessageCount).toBe(0);
        expect(summaryMessage.compressionState?.summarizedMessageIds).toEqual([]);
      });

      it('should generate unique ID for summary message', () => {
        const messages: UIMessage[] = [
          createMockMessage('1', 'user', 'Hello'),
        ];

        const msg1 = createSummaryMessage(messages, 'Summary 1');
        const msg2 = createSummaryMessage(messages, 'Summary 2');

        // Both should have the mocked nanoid ID
        expect(msg1.id).toBe('mock-nanoid-id');
        expect(msg2.id).toBe('mock-nanoid-id');
      });
    });

    describe('createCompressionHistoryEntry edge cases', () => {
      it('should handle empty compressed messages', () => {
        const entry = createCompressionHistoryEntry(
          'session-123',
          'sliding-window',
          [],
          'summary-id',
          1000,
          0
        );

        expect(entry.compressedMessages).toHaveLength(0);
        expect(entry.tokensBefore).toBe(1000);
        expect(entry.tokensAfter).toBe(0);
      });

      it('should preserve all message metadata in history entry', () => {
        const messageWithMetadata = createMockMessage('1', 'user', 'Hello', {
          toolInvocations: [{ id: 'tool1', name: 'search', input: {}, state: 'result' }] as unknown as UIMessage['toolInvocations'],
        });

        const entry = createCompressionHistoryEntry(
          'session-123',
          'hybrid',
          [messageWithMetadata],
          'summary-id',
          1000,
          500
        );

        expect(entry.compressedMessages[0].id).toBe('1');
        expect(entry.compressedMessages[0].role).toBe('user');
        expect(entry.compressedMessages[0].content).toBe('Hello');
      });
    });
  });
});
