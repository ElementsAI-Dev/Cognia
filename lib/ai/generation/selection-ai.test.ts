/**
 * Tests for Selection AI Service
 */

import { type SelectionAIAction, type SelectionAIResult } from './selection-ai';

const mockGenerateText = jest.fn();
const mockGetProviderModelFromConfig = jest.fn();
const mockIsValidProvider = jest.fn();

let mockStoreState = {
  defaultProvider: 'openai',
  providerSettings: {
    openai: {
      enabled: true,
      apiKey: 'test-api-key',
      defaultModel: 'gpt-4o',
    },
  } as Record<string, { enabled?: boolean; apiKey?: string; apiKeys?: string[]; defaultModel?: string; baseURL?: string }>,
};

jest.mock('ai', () => ({
  generateText: (...args: unknown[]) => mockGenerateText(...args),
}));

jest.mock('@/lib/ai/core/client', () => ({
  getProviderModelFromConfig: (...args: unknown[]) => mockGetProviderModelFromConfig(...args),
  isValidProvider: (...args: unknown[]) => mockIsValidProvider(...args),
}));

jest.mock('@/stores/settings', () => ({
  useSettingsStore: {
    getState: jest.fn(() => mockStoreState),
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
    mockStoreState = {
      defaultProvider: 'openai',
      providerSettings: {
        openai: {
          enabled: true,
          apiKey: 'test-api-key',
          defaultModel: 'gpt-4o',
        },
      },
    };
    mockIsValidProvider.mockReturnValue(true);
    mockGetProviderModelFromConfig.mockReturnValue({
      model: { id: 'resolved-model' },
      provider: 'openai',
      modelId: 'gpt-4o',
    });
    mockGenerateText.mockResolvedValue({ text: 'AI response' });
  });

  it('uses shared provider model resolution', async () => {
    const { processSelectionWithAI } = await import('./selection-ai');

    const result = await processSelectionWithAI({
      action: 'explain',
      text: 'Test text to explain',
    });

    expect(result.success).toBe(true);
    expect(mockGetProviderModelFromConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'openai',
        model: 'gpt-4o',
        apiKey: 'test-api-key',
      })
    );
    expect(mockGenerateText).toHaveBeenCalled();
  });

  it('returns deterministic error when required API key is missing', async () => {
    mockStoreState = {
      defaultProvider: 'openai',
      providerSettings: {
        openai: {
          enabled: true,
          apiKey: '',
          defaultModel: 'gpt-4o',
        },
      },
    };

    const { processSelectionWithAI } = await import('./selection-ai');
    const result = await processSelectionWithAI({
      action: 'explain',
      text: 'Test text',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('requires an API key');
    expect(mockGetProviderModelFromConfig).not.toHaveBeenCalled();
  });

  it('allows local keyless providers when configured', async () => {
    mockStoreState = {
      defaultProvider: 'ollama',
      providerSettings: {
        ollama: {
          enabled: true,
          apiKey: '',
          defaultModel: 'llama3.2',
          baseURL: 'http://localhost:11434/v1',
        },
      },
    };

    const { processSelectionWithAI } = await import('./selection-ai');
    const result = await processSelectionWithAI({
      action: 'summarize',
      text: 'Long text to summarize',
    });

    expect(result.success).toBe(true);
    expect(mockGetProviderModelFromConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'ollama',
        apiKey: '',
      })
    );
  });

  it('returns error when provider is disabled', async () => {
    mockStoreState = {
      defaultProvider: 'openai',
      providerSettings: {
        openai: {
          enabled: false,
          apiKey: 'test-api-key',
          defaultModel: 'gpt-4o',
        },
      },
    };

    const { processSelectionWithAI } = await import('./selection-ai');
    const result = await processSelectionWithAI({
      action: 'rewrite',
      text: 'Please rewrite this.',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('disabled');
  });

  it('tracks processing time', async () => {
    const { processSelectionWithAI } = await import('./selection-ai');
    const result = await processSelectionWithAI({
      action: 'explain',
      text: 'Test text',
    });

    expect(result.processingTime).toBeGreaterThanOrEqual(0);
  });
});

describe('quickTranslate', () => {
  it('throws when provider config is invalid', async () => {
    mockStoreState = {
      defaultProvider: 'openai',
      providerSettings: {
        openai: {
          enabled: true,
          apiKey: '',
          defaultModel: 'gpt-4o',
        },
      },
    };

    const { quickTranslate } = await import('./selection-ai');
    await expect(quickTranslate('Hello', 'zh-CN')).rejects.toThrow('requires an API key');
  });
});
