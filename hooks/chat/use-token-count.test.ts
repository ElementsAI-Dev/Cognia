/**
 * useTokenCount Hook Tests
 */

import { renderHook, act } from '@testing-library/react';
import {
  useTokenCount,
  countTokens,
  countTokensTiktoken,
  estimateTokens,
  estimateTokensFast,
  estimateTokensForClaude,
  getEncodingForModel,
  getTokenCountMethod,
  calculateTokenBreakdown,
  getContextUtilization,
  formatTokenCount,
  countChatMessageTokens,
  countConversationTokens,
} from './use-token-count';
import type { UIMessage } from '@/types/message';

// Mock js-tiktoken
jest.mock('js-tiktoken', () => ({
  getEncoding: jest.fn(() => ({
    encode: jest.fn((text: string) => {
      // Simple mock: split by spaces and punctuation
      return text.split(/[\s.,!?;:]+/).filter(Boolean);
    }),
  })),
}));

describe('useTokenCount', () => {
  describe('getEncodingForModel', () => {
    it('should return o200k_base for GPT-4o models', () => {
      expect(getEncodingForModel('gpt-4o')).toBe('o200k_base');
      expect(getEncodingForModel('gpt-4o-mini')).toBe('o200k_base');
    });

    it('should return o200k_base for o1/o3 models', () => {
      expect(getEncodingForModel('o1-preview')).toBe('o200k_base');
      expect(getEncodingForModel('o3-mini')).toBe('o200k_base');
    });

    it('should return cl100k_base for GPT-4 models', () => {
      expect(getEncodingForModel('gpt-4')).toBe('cl100k_base');
      expect(getEncodingForModel('gpt-4-turbo')).toBe('cl100k_base');
    });

    it('should return cl100k_base for GPT-3.5 models', () => {
      expect(getEncodingForModel('gpt-3.5-turbo')).toBe('cl100k_base');
    });

    it('should return p50k_base for older models', () => {
      expect(getEncodingForModel('text-davinci-003')).toBe('p50k_base');
      expect(getEncodingForModel('curie')).toBe('p50k_base');
    });

    it('should return o200k_base by default', () => {
      expect(getEncodingForModel()).toBe('o200k_base');
      expect(getEncodingForModel('unknown-model')).toBe('o200k_base');
    });
  });

  describe('getTokenCountMethod', () => {
    it('should return tiktoken for OpenAI providers', () => {
      expect(getTokenCountMethod('openai')).toBe('tiktoken');
      expect(getTokenCountMethod('azure')).toBe('tiktoken');
      expect(getTokenCountMethod('openrouter')).toBe('tiktoken');
    });

    it('should return claude-api for Anthropic', () => {
      expect(getTokenCountMethod('anthropic')).toBe('claude-api');
    });

    it('should return estimation for Google/Gemini', () => {
      expect(getTokenCountMethod('google')).toBe('estimation');
      expect(getTokenCountMethod('gemini')).toBe('estimation');
    });

    it('should detect method from model name', () => {
      expect(getTokenCountMethod('other', 'gpt-4o')).toBe('tiktoken');
      expect(getTokenCountMethod('other', 'claude-3-opus')).toBe('claude-api');
    });

    it('should return estimation by default', () => {
      expect(getTokenCountMethod()).toBe('estimation');
      expect(getTokenCountMethod('unknown')).toBe('estimation');
    });
  });

  describe('estimateTokensFast', () => {
    it('should return 0 for empty string', () => {
      expect(estimateTokensFast('')).toBe(0);
    });

    it('should estimate based on character count', () => {
      const text = 'Hello world'; // 11 chars
      const tokens = estimateTokensFast(text);
      expect(tokens).toBeGreaterThan(0);
      expect(tokens).toBeLessThan(text.length);
    });
  });

  describe('estimateTokens', () => {
    it('should return 0 for empty string', () => {
      expect(estimateTokens('')).toBe(0);
    });

    it('should add overhead for message formatting', () => {
      const text = 'Hello';
      const tokens = estimateTokens(text);
      expect(tokens).toBeGreaterThan(1);
    });

    it('should adjust for code blocks', () => {
      const plainText = 'Hello world';
      const codeText = '```javascript\nconst x = 1;\n```';
      
      const plainTokens = estimateTokens(plainText);
      const codeTokens = estimateTokens(codeText);
      
      // Code should have different token estimation
      expect(codeTokens).not.toBe(plainTokens);
    });

    it('should adjust for JSON content', () => {
      const jsonText = '{"key": "value", "number": 123}';
      const tokens = estimateTokens(jsonText);
      expect(tokens).toBeGreaterThan(0);
    });
  });

  describe('estimateTokensForClaude', () => {
    it('should return 0 for empty string', () => {
      expect(estimateTokensForClaude('')).toBe(0);
    });

    it('should estimate tokens for Claude', () => {
      const text = 'Hello, how are you today?';
      const tokens = estimateTokensForClaude(text);
      expect(tokens).toBeGreaterThan(0);
    });

    it('should add overhead for code blocks', () => {
      const text = '```python\nprint("hello")\n```';
      const tokens = estimateTokensForClaude(text);
      expect(tokens).toBeGreaterThan(0);
    });
  });

  describe('countTokensTiktoken', () => {
    it('should return 0 for empty string', () => {
      expect(countTokensTiktoken('')).toBe(0);
    });

    it('should count tokens using encoder', () => {
      const text = 'Hello world';
      const tokens = countTokensTiktoken(text);
      expect(tokens).toBeGreaterThan(0);
    });
  });

  describe('countTokens', () => {
    it('should use tiktoken method', () => {
      const tokens = countTokens('Hello world', 'tiktoken');
      expect(tokens).toBeGreaterThan(0);
    });

    it('should use estimation method', () => {
      const tokens = countTokens('Hello world', 'estimation');
      expect(tokens).toBeGreaterThan(0);
    });

    it('should use claude-api method', () => {
      const tokens = countTokens('Hello world', 'claude-api');
      expect(tokens).toBeGreaterThan(0);
    });

    it('should return 0 for empty content', () => {
      expect(countTokens('')).toBe(0);
    });
  });

  describe('countChatMessageTokens', () => {
    it('should count message tokens with role overhead', () => {
      const tokens = countChatMessageTokens('user', 'Hello');
      expect(tokens).toBeGreaterThan(1);
    });

    it('should add tokens for name if provided', () => {
      const withoutName = countChatMessageTokens('user', 'Hello');
      const withName = countChatMessageTokens('user', 'Hello', 'John');
      expect(withName).toBeGreaterThan(withoutName);
    });
  });

  describe('countConversationTokens', () => {
    it('should count all messages plus priming tokens', () => {
      const messages = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
      ];
      const tokens = countConversationTokens(messages);
      expect(tokens).toBeGreaterThan(0);
    });

    it('should return priming tokens for empty conversation', () => {
      const tokens = countConversationTokens([]);
      expect(tokens).toBe(3); // priming tokens
    });
  });

  describe('calculateTokenBreakdown', () => {
    const mockMessages: UIMessage[] = [
      { id: '1', role: 'user', content: 'Hello', createdAt: new Date() },
      { id: '2', role: 'assistant', content: 'Hi there!', createdAt: new Date() },
    ];

    it('should calculate breakdown for messages', () => {
      const breakdown = calculateTokenBreakdown(mockMessages);

      expect(breakdown.totalTokens).toBeGreaterThan(0);
      expect(breakdown.userTokens).toBeGreaterThan(0);
      expect(breakdown.assistantTokens).toBeGreaterThan(0);
      expect(breakdown.messageTokens).toHaveLength(2);
    });

    it('should include system prompt tokens', () => {
      const breakdown = calculateTokenBreakdown(mockMessages, {
        systemPrompt: 'You are a helpful assistant.',
      });

      expect(breakdown.systemTokens).toBeGreaterThan(0);
    });

    it('should include additional context tokens', () => {
      const withoutContext = calculateTokenBreakdown(mockMessages);
      const withContext = calculateTokenBreakdown(mockMessages, {
        additionalContext: 'Some additional context here.',
      });

      expect(withContext.systemTokens).toBeGreaterThan(withoutContext.systemTokens);
    });

    it('should use tiktoken for OpenAI', () => {
      const breakdown = calculateTokenBreakdown(mockMessages, {
        provider: 'openai',
        model: 'gpt-4o',
      });

      expect(breakdown.method).toBe('tiktoken');
    });

    it('should respect forced method', () => {
      const breakdown = calculateTokenBreakdown(mockMessages, {
        provider: 'openai',
        method: 'estimation',
      });

      expect(breakdown.method).toBe('estimation');
    });
  });

  describe('getContextUtilization', () => {
    it('should calculate percentage correctly', () => {
      const result = getContextUtilization(500, 1000);
      expect(result.percent).toBe(50);
      expect(result.status).toBe('healthy');
    });

    it('should return warning status at 70%+', () => {
      const result = getContextUtilization(750, 1000);
      expect(result.status).toBe('warning');
    });

    it('should return danger status at 90%+', () => {
      const result = getContextUtilization(950, 1000);
      expect(result.status).toBe('danger');
    });

    it('should cap at 100%', () => {
      const result = getContextUtilization(1500, 1000);
      expect(result.percent).toBe(100);
    });

    it('should respect limitPercent', () => {
      const result = getContextUtilization(400, 1000, 50);
      expect(result.percent).toBe(80);
      expect(result.status).toBe('warning');
    });
  });

  describe('formatTokenCount', () => {
    it('should format small numbers as-is', () => {
      expect(formatTokenCount(500)).toBe('500');
    });

    it('should format thousands with K', () => {
      expect(formatTokenCount(1500)).toBe('1.5K');
      expect(formatTokenCount(10000)).toBe('10.0K');
    });

    it('should format millions with M', () => {
      expect(formatTokenCount(1500000)).toBe('1.5M');
    });
  });

  describe('useTokenCount hook', () => {
    const mockMessages: UIMessage[] = [
      { id: '1', role: 'user', content: 'Hello', createdAt: new Date() },
    ];

    it('should return token breakdown', () => {
      const { result } = renderHook(() => useTokenCount(mockMessages));

      expect(result.current.totalTokens).toBeGreaterThan(0);
      expect(result.current.isLoading).toBe(false);
    });

    it('should update when messages change', () => {
      const { result, rerender } = renderHook(
        ({ messages }) => useTokenCount(messages),
        { initialProps: { messages: mockMessages } }
      );

      const initialTokens = result.current.totalTokens;

      const newMessages: UIMessage[] = [
        ...mockMessages,
        { id: '2', role: 'assistant', content: 'Hi there! How can I help?', createdAt: new Date() },
      ];

      rerender({ messages: newMessages });

      expect(result.current.totalTokens).toBeGreaterThan(initialTokens);
    });

    it('should support reload function', () => {
      const { result } = renderHook(() => useTokenCount(mockMessages));

      const initialTokens = result.current.totalTokens;

      act(() => {
        result.current.reload();
      });

      // Should recalculate (tokens may be same but function should work)
      expect(result.current.totalTokens).toBe(initialTokens);
    });
  });
});
