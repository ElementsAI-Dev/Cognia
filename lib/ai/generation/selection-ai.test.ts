/**
 * Tests for Selection AI Service
 */

import { type SelectionAIAction, type SelectionAIResult } from './selection-ai';

// Mock dependencies
jest.mock('ai', () => ({
  generateText: jest.fn(),
}));

jest.mock('@ai-sdk/openai', () => ({
  createOpenAI: jest.fn(() => jest.fn()),
}));

jest.mock('@ai-sdk/anthropic', () => ({
  createAnthropic: jest.fn(() => jest.fn()),
}));

jest.mock('@ai-sdk/google', () => ({
  createGoogleGenerativeAI: jest.fn(() => jest.fn()),
}));

jest.mock('@/stores/settings', () => ({
  useSettingsStore: {
    getState: jest.fn(() => ({
      defaultProvider: 'openai',
      providerSettings: {
        openai: {
          apiKey: 'test-api-key',
          defaultModel: 'gpt-4',
        },
      },
    })),
  },
}));

describe('SelectionAIAction type', () => {
  it('should accept valid action types', () => {
    const actions: SelectionAIAction[] = [
      'explain',
      'translate',
      'extract',
      'summarize',
      'define',
      'rewrite',
      'grammar',
    ];
    expect(actions).toHaveLength(7);
  });
});

describe('SelectionAIResult type', () => {
  it('should have correct structure for success', () => {
    const result: SelectionAIResult = {
      success: true,
      result: 'Test result',
      action: 'explain',
      originalText: 'Test text',
      processingTime: 100,
    };
    expect(result.success).toBe(true);
  });

  it('should have correct structure for failure', () => {
    const result: SelectionAIResult = {
      success: false,
      error: 'Test error',
      action: 'translate',
      originalText: 'Test text',
      processingTime: 50,
    };
    expect(result.success).toBe(false);
    expect(result.error).toBe('Test error');
  });
});

describe('processSelectionWithAI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should process explain action', async () => {
    const { generateText } = await import('ai');
    (generateText as jest.Mock).mockResolvedValue({ text: 'Explanation result' });

    const { processSelectionWithAI } = await import('./selection-ai');
    const result = await processSelectionWithAI({
      action: 'explain',
      text: 'Test text to explain',
    });

    expect(result.action).toBe('explain');
    expect(result.originalText).toBe('Test text to explain');
  });

  it('should process translate action with target language', async () => {
    const { generateText } = await import('ai');
    (generateText as jest.Mock).mockResolvedValue({ text: '翻译结果' });

    const { processSelectionWithAI } = await import('./selection-ai');
    const result = await processSelectionWithAI({
      action: 'translate',
      text: 'Text to translate',
      targetLanguage: 'Chinese (Simplified)',
    });

    expect(result.action).toBe('translate');
  });

  it('should process summarize action', async () => {
    const { generateText } = await import('ai');
    (generateText as jest.Mock).mockResolvedValue({ text: 'Summary result' });

    const { processSelectionWithAI } = await import('./selection-ai');
    const result = await processSelectionWithAI({
      action: 'summarize',
      text: 'Long text to summarize',
    });

    expect(result.action).toBe('summarize');
  });

  it('should use custom prompt when provided', async () => {
    const { generateText } = await import('ai');
    (generateText as jest.Mock).mockResolvedValue({ text: 'Custom result' });

    const { processSelectionWithAI } = await import('./selection-ai');
    const result = await processSelectionWithAI({
      action: 'explain',
      text: 'Test text',
      customPrompt: 'Custom prompt: {text}',
    });

    expect(generateText).toHaveBeenCalled();
    expect(result.action).toBe('explain');
  });

  it('should return error when no API key configured', async () => {
    const { useSettingsStore } = await import('@/stores/settings');
    (useSettingsStore.getState as jest.Mock).mockReturnValue({
      defaultProvider: 'openai',
      providerSettings: {
        openai: { apiKey: '' },
      },
    });

    // Re-import to pick up the new mock
    jest.resetModules();
    jest.mock('@/stores/settings', () => ({
      useSettingsStore: {
        getState: jest.fn(() => ({
          defaultProvider: 'openai',
          providerSettings: {
            openai: { apiKey: '' },
          },
        })),
      },
    }));

    const { processSelectionWithAI } = await import('./selection-ai');
    const result = await processSelectionWithAI({
      action: 'explain',
      text: 'Test text',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('API key');
  });

  it('should handle API errors', async () => {
    const { processSelectionWithAI } = await import('./selection-ai');
    const result = await processSelectionWithAI({
      action: 'explain',
      text: 'Test text',
    });

    // Without proper API key setup, it returns an error
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should track processing time', async () => {
    const { generateText } = await import('ai');
    (generateText as jest.Mock).mockResolvedValue({ text: 'Result' });

    const { processSelectionWithAI } = await import('./selection-ai');
    const result = await processSelectionWithAI({
      action: 'explain',
      text: 'Test text',
    });

    expect(result.processingTime).toBeGreaterThanOrEqual(0);
  });
});

describe('quickTranslate', () => {
  it('should throw when API key not configured', async () => {
    const { quickTranslate } = await import('./selection-ai');
    await expect(quickTranslate('Hello', 'zh-CN')).rejects.toThrow();
  });
});

describe('quickExplain', () => {
  it('should throw when API key not configured', async () => {
    const { quickExplain } = await import('./selection-ai');
    await expect(quickExplain('Complex term')).rejects.toThrow();
  });
});

describe('quickSummarize', () => {
  it('should throw when API key not configured', async () => {
    const { quickSummarize } = await import('./selection-ai');
    await expect(quickSummarize('Long text')).rejects.toThrow();
  });
});
