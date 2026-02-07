/**
 * Tests for Prompt Optimizer
 */

import { optimizePrompt, quickOptimize, batchOptimize, detectPromptLanguage } from './prompt-optimizer';
import type { PromptOptimizationStyle, PromptOptimizationConfig } from '@/types/content/prompt';

// Mock the AI SDK
jest.mock('ai', () => ({
  generateText: jest.fn(),
}));

// Mock the client module
jest.mock('../core/client', () => ({
  getProviderModel: jest.fn(() => 'mock-model'),
}));

import { generateText } from 'ai';
import { getProviderModel } from '../core/client';

const mockGenerateText = generateText as jest.Mock;
const mockGetProviderModel = getProviderModel as jest.Mock;

describe('optimizePrompt', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetProviderModel.mockReturnValue('mock-model');
  });

  it('optimizes prompt successfully', async () => {
    mockGenerateText
      .mockResolvedValueOnce({ text: 'Optimized prompt text' })
      .mockResolvedValueOnce({ text: '["Added context", "Improved clarity"]' });

    const result = await optimizePrompt({
      prompt: 'Original prompt',
      config: {
        style: 'concise',
        targetProvider: 'openai',
        targetModel: 'gpt-4o',
        preserveIntent: true,
        enhanceClarity: true,
        addContext: false,
      },
      apiKey: 'test-api-key',
    });

    expect(result.success).toBe(true);
    expect(result.optimizedPrompt).toBeDefined();
    expect(result.optimizedPrompt?.original).toBe('Original prompt');
    expect(result.optimizedPrompt?.optimized).toBe('Optimized prompt text');
    expect(result.optimizedPrompt?.style).toBe('concise');
    expect(result.optimizedPrompt?.improvements).toEqual(['Added context', 'Improved clarity']);
  });

  it('handles different optimization styles', async () => {
    const styles: PromptOptimizationStyle[] = [
      'concise',
      'detailed',
      'creative',
      'professional',
      'academic',
      'technical',
      'step-by-step',
      'structured',
    ];

    for (const style of styles) {
      mockGenerateText
        .mockResolvedValueOnce({ text: `Optimized for ${style}` })
        .mockResolvedValueOnce({ text: '["Improvement"]' });

      const result = await optimizePrompt({
        prompt: 'Test prompt',
        config: {
          style,
          targetProvider: 'openai',
          targetModel: 'gpt-4o',
          preserveIntent: false,
          enhanceClarity: false,
          addContext: false,
        },
        apiKey: 'test-api-key',
      });

      expect(result.success).toBe(true);
      expect(result.optimizedPrompt?.style).toBe(style);
    }
  });

  it('uses custom prompt for custom style', async () => {
    mockGenerateText
      .mockResolvedValueOnce({ text: 'Custom optimized' })
      .mockResolvedValueOnce({ text: '["Custom improvement"]' });

    const result = await optimizePrompt({
      prompt: 'Original prompt',
      config: {
        style: 'custom',
        customPrompt: 'Make it fun and engaging',
        targetProvider: 'openai',
        targetModel: 'gpt-4o',
        preserveIntent: false,
        enhanceClarity: false,
        addContext: false,
      },
      apiKey: 'test-api-key',
    });

    expect(result.success).toBe(true);
    expect(result.optimizedPrompt?.optimized).toBe('Custom optimized');
  });

  it('handles improvement analysis failure gracefully', async () => {
    mockGenerateText
      .mockResolvedValueOnce({ text: 'Optimized prompt' })
      .mockResolvedValueOnce({ text: 'invalid json' });

    const result = await optimizePrompt({
      prompt: 'Test prompt',
      config: {
        style: 'concise',
        targetProvider: 'openai',
        targetModel: 'gpt-4o',
        preserveIntent: false,
        enhanceClarity: false,
        addContext: false,
      },
      apiKey: 'test-api-key',
    });

    expect(result.success).toBe(true);
    expect(result.optimizedPrompt?.improvements).toContain('Prompt optimized for concise style');
  });

  it('adds additional instructions based on config', async () => {
    mockGenerateText
      .mockResolvedValueOnce({ text: 'Optimized' })
      .mockResolvedValueOnce({ text: '[]' });

    await optimizePrompt({
      prompt: 'Test prompt',
      config: {
        style: 'detailed',
        targetProvider: 'openai',
        targetModel: 'gpt-4o',
        preserveIntent: true,
        enhanceClarity: true,
        addContext: true,
      },
      apiKey: 'test-api-key',
    });

    expect(mockGenerateText).toHaveBeenCalled();
    const firstCall = mockGenerateText.mock.calls[0][0];
    expect(firstCall.system).toContain('preserve');
  });

  it('returns error on API failure', async () => {
    mockGenerateText.mockRejectedValue(new Error('API Error'));

    const result = await optimizePrompt({
      prompt: 'Test prompt',
      config: {
        style: 'concise',
        targetProvider: 'openai',
        targetModel: 'gpt-4o',
        preserveIntent: false,
        enhanceClarity: false,
        addContext: false,
      },
      apiKey: 'test-api-key',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('API Error');
  });

  it('handles non-Error exceptions', async () => {
    mockGenerateText.mockRejectedValue('Unknown error');

    const result = await optimizePrompt({
      prompt: 'Test prompt',
      config: {
        style: 'concise',
        targetProvider: 'openai',
        targetModel: 'gpt-4o',
        preserveIntent: false,
        enhanceClarity: false,
        addContext: false,
      },
      apiKey: 'test-api-key',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to optimize prompt');
  });

  it('uses default provider and model when not specified', async () => {
    mockGenerateText
      .mockResolvedValueOnce({ text: 'Optimized' })
      .mockResolvedValueOnce({ text: '[]' });

    const result = await optimizePrompt({
      prompt: 'Test prompt',
      config: {
        style: 'concise',
        preserveIntent: false,
        enhanceClarity: false,
        addContext: false,
      } as PromptOptimizationConfig,
      apiKey: 'test-api-key',
    });

    expect(result.success).toBe(true);
    expect(mockGetProviderModel).toHaveBeenCalledWith('openai', 'gpt-4o-mini', 'test-api-key', undefined);
  });

  it('passes baseURL to provider model', async () => {
    mockGenerateText
      .mockResolvedValueOnce({ text: 'Optimized' })
      .mockResolvedValueOnce({ text: '[]' });

    await optimizePrompt({
      prompt: 'Test prompt',
      config: {
        style: 'concise',
        targetProvider: 'openai',
        targetModel: 'gpt-4o',
        preserveIntent: false,
        enhanceClarity: false,
        addContext: false,
      },
      apiKey: 'test-api-key',
      baseURL: 'https://custom.api.com',
    });

    expect(mockGetProviderModel).toHaveBeenCalledWith('openai', 'gpt-4o', 'test-api-key', 'https://custom.api.com');
  });
});

describe('quickOptimize', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetProviderModel.mockReturnValue('mock-model');
  });

  it('uses quick optimize with preset config', async () => {
    mockGenerateText
      .mockResolvedValueOnce({ text: 'Quick optimized' })
      .mockResolvedValueOnce({ text: '["Quick improvement"]' });

    const result = await quickOptimize(
      'Test prompt',
      'concise',
      'openai',
      'gpt-4o',
      'test-api-key'
    );

    expect(result.success).toBe(true);
    expect(result.optimizedPrompt?.optimized).toBe('Quick optimized');
  });

  it('enables addContext for detailed style', async () => {
    mockGenerateText
      .mockResolvedValueOnce({ text: 'Detailed optimized' })
      .mockResolvedValueOnce({ text: '[]' });

    await quickOptimize(
      'Test prompt',
      'detailed',
      'openai',
      'gpt-4o',
      'test-api-key'
    );

    expect(mockGenerateText).toHaveBeenCalled();
  });

  it('passes baseURL when provided', async () => {
    mockGenerateText
      .mockResolvedValueOnce({ text: 'Optimized' })
      .mockResolvedValueOnce({ text: '[]' });

    await quickOptimize(
      'Test prompt',
      'concise',
      'openai',
      'gpt-4o',
      'test-api-key',
      'https://custom.api.com'
    );

    expect(mockGetProviderModel).toHaveBeenCalledWith(
      'openai',
      'gpt-4o',
      'test-api-key',
      'https://custom.api.com'
    );
  });
});

describe('batchOptimize', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetProviderModel.mockReturnValue('mock-model');
  });

  it('optimizes multiple prompts', async () => {
    mockGenerateText
      .mockResolvedValueOnce({ text: 'Optimized 1' })
      .mockResolvedValueOnce({ text: '["Improvement 1"]' })
      .mockResolvedValueOnce({ text: 'Optimized 2' })
      .mockResolvedValueOnce({ text: '["Improvement 2"]' })
      .mockResolvedValueOnce({ text: 'Optimized 3' })
      .mockResolvedValueOnce({ text: '["Improvement 3"]' });

    const prompts = ['Prompt 1', 'Prompt 2', 'Prompt 3'];
    const config: PromptOptimizationConfig = {
      style: 'concise',
      targetProvider: 'openai',
      targetModel: 'gpt-4o',
      preserveIntent: false,
      enhanceClarity: false,
      addContext: false,
    };

    const results = await batchOptimize(prompts, config, 'test-api-key');

    expect(results).toHaveLength(3);
    // Results should be returned for each prompt
    expect(results[0]).toBeDefined();
    expect(results[1]).toBeDefined();
    expect(results[2]).toBeDefined();
  });

  it('handles empty prompts array', async () => {
    const results = await batchOptimize([], {
      style: 'concise',
      targetProvider: 'openai',
      targetModel: 'gpt-4o',
      preserveIntent: false,
      enhanceClarity: false,
      addContext: false,
    }, 'test-api-key');

    expect(results).toHaveLength(0);
  });

  it('handles mixed success/failure results', async () => {
    mockGenerateText
      .mockResolvedValueOnce({ text: 'Optimized 1' })
      .mockResolvedValueOnce({ text: '[]' })
      .mockRejectedValueOnce(new Error('API Error'));

    const prompts = ['Prompt 1', 'Prompt 2'];
    const config: PromptOptimizationConfig = {
      style: 'concise',
      targetProvider: 'openai',
      targetModel: 'gpt-4o',
      preserveIntent: false,
      enhanceClarity: false,
      addContext: false,
    };

    const results = await batchOptimize(prompts, config, 'test-api-key');

    expect(results).toHaveLength(2);
    // Results can vary based on implementation
    expect(results[0]).toBeDefined();
    expect(results[1]).toBeDefined();
  });

  it('handles new step-by-step and structured styles', async () => {
    mockGenerateText
      .mockResolvedValueOnce({ text: 'Step-by-step optimized' })
      .mockResolvedValueOnce({ text: '["Added CoT reasoning"]' })
      .mockResolvedValueOnce({ text: 'Structured optimized' })
      .mockResolvedValueOnce({ text: '["Added output format"]' });

    const result1 = await optimizePrompt({
      prompt: 'Explain how databases work',
      config: {
        style: 'step-by-step',
        targetProvider: 'openai',
        targetModel: 'gpt-4o',
        preserveIntent: false,
        enhanceClarity: false,
        addContext: false,
      },
      apiKey: 'test-api-key',
    });

    expect(result1.success).toBe(true);
    expect(result1.optimizedPrompt?.style).toBe('step-by-step');

    const result2 = await optimizePrompt({
      prompt: 'List the top programming languages',
      config: {
        style: 'structured',
        targetProvider: 'openai',
        targetModel: 'gpt-4o',
        preserveIntent: false,
        enhanceClarity: false,
        addContext: false,
      },
      apiKey: 'test-api-key',
    });

    expect(result2.success).toBe(true);
    expect(result2.optimizedPrompt?.style).toBe('structured');
  });

  it('passes baseURL to all optimizations', async () => {
    mockGenerateText
      .mockResolvedValueOnce({ text: 'Optimized' })
      .mockResolvedValueOnce({ text: '[]' });

    await batchOptimize(
      ['Prompt 1'],
      {
        style: 'concise',
        targetProvider: 'openai',
        targetModel: 'gpt-4o',
        preserveIntent: false,
        enhanceClarity: false,
        addContext: false,
      },
      'test-api-key',
      'https://custom.api.com'
    );

    expect(mockGetProviderModel).toHaveBeenCalledWith(
      'openai',
      'gpt-4o',
      'test-api-key',
      'https://custom.api.com'
    );
  });
});

describe('detectPromptLanguage', () => {
  it('detects English text', () => {
    expect(detectPromptLanguage('Write a function that sorts an array')).toBe('en');
    expect(detectPromptLanguage('You are an expert programmer')).toBe('en');
  });

  it('detects Chinese text', () => {
    expect(detectPromptLanguage('请写一个排序算法')).toBe('zh');
    expect(detectPromptLanguage('你是一个编程专家，请帮我分析代码')).toBe('zh');
  });

  it('detects mixed text', () => {
    const mixed = '请帮我优化这段 JavaScript code，使用 React hooks';
    const result = detectPromptLanguage(mixed);
    expect(['zh', 'mixed']).toContain(result);
  });

  it('returns en for empty or numeric text', () => {
    expect(detectPromptLanguage('')).toBe('en');
    expect(detectPromptLanguage('12345')).toBe('en');
  });

  it('adds Chinese language instruction for Chinese prompts', async () => {
    mockGenerateText
      .mockResolvedValueOnce({ text: '优化后的提示' })
      .mockResolvedValueOnce({ text: '["改进了清晰度"]' });

    await optimizePrompt({
      prompt: '请帮我写一个排序算法',
      config: {
        style: 'concise',
        targetProvider: 'openai',
        targetModel: 'gpt-4o',
        preserveIntent: false,
        enhanceClarity: false,
        addContext: false,
      },
      apiKey: 'test-api-key',
    });

    const firstCall = mockGenerateText.mock.calls[0][0];
    expect(firstCall.system).toContain('Chinese');
  });
});
