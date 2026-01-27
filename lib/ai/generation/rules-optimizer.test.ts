/**
 * Rules Optimizer Tests
 */

jest.mock('ai', () => ({
  generateText: jest.fn(),
}));

jest.mock('@ai-sdk/openai', () => ({
  createOpenAI: jest.fn(() => jest.fn(() => ({ id: 'mock-openai-model' }))),
}));

jest.mock('@ai-sdk/anthropic', () => ({
  createAnthropic: jest.fn(() => jest.fn(() => ({ id: 'mock-anthropic-model' }))),
}));

import { generateText } from 'ai';
import { optimizeRules } from './rules-optimizer';
import type { RulesOptimizeInput, RulesOptimizeConfig } from './rules-optimizer';

describe('optimizeRules', () => {
  const mockInput: RulesOptimizeInput = {
    content: '# Project Rules\n- Use TypeScript\n- Follow clean code',
    target: '.cursorrules',
    context: 'React/Next.js project',
  };

  const mockConfig: RulesOptimizeConfig = {
    provider: 'openai',
    model: 'gpt-4',
    apiKey: 'test-api-key',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should optimize rules with valid JSON response', async () => {
    const mockResponse = {
      optimizedContent: '# Optimized Rules\n- Use TypeScript strict mode\n- Follow SOLID principles',
      changes: ['Added strict mode', 'Updated coding principles'],
    };

    (generateText as jest.Mock).mockResolvedValue({
      text: JSON.stringify(mockResponse),
    });

    const result = await optimizeRules(mockInput, mockConfig);

    expect(result.optimizedContent).toBe(mockResponse.optimizedContent);
    expect(result.changes).toEqual(mockResponse.changes);
  });

  it('should handle JSON in code block', async () => {
    const mockResponse = {
      optimizedContent: '# Better Rules',
      changes: ['Simplified rules'],
    };

    (generateText as jest.Mock).mockResolvedValue({
      text: '```json\n' + JSON.stringify(mockResponse) + '\n```',
    });

    const result = await optimizeRules(mockInput, mockConfig);

    expect(result.optimizedContent).toBe('# Better Rules');
    expect(result.changes).toEqual(['Simplified rules']);
  });

  it('should return original content on parse error', async () => {
    (generateText as jest.Mock).mockResolvedValue({
      text: 'This is not valid JSON',
    });

    const result = await optimizeRules(mockInput, mockConfig);

    expect(result.optimizedContent).toBe('This is not valid JSON');
    expect(result.changes).toContain('AI optimization completed but failed to parse change log.');
  });

  it('should use anthropic provider when specified', async () => {
    const anthropicConfig: RulesOptimizeConfig = {
      ...mockConfig,
      provider: 'anthropic',
      model: 'claude-3-opus',
    };

    (generateText as jest.Mock).mockResolvedValue({
      text: JSON.stringify({ optimizedContent: 'test', changes: [] }),
    });

    await optimizeRules(mockInput, anthropicConfig);

    expect(generateText).toHaveBeenCalled();
  });

  it('should handle empty context', async () => {
    const inputWithoutContext: RulesOptimizeInput = {
      content: '# Rules',
      target: '.cursorrules',
    };

    (generateText as jest.Mock).mockResolvedValue({
      text: JSON.stringify({ optimizedContent: '# Rules', changes: [] }),
    });

    const result = await optimizeRules(inputWithoutContext, mockConfig);

    expect(result).toBeDefined();
  });

  it('should fallback to openai for unknown providers', async () => {
    const unknownProviderConfig: RulesOptimizeConfig = {
      ...mockConfig,
      provider: 'unknown' as never,
    };

    (generateText as jest.Mock).mockResolvedValue({
      text: JSON.stringify({ optimizedContent: 'test', changes: [] }),
    });

    await optimizeRules(mockInput, unknownProviderConfig);

    expect(generateText).toHaveBeenCalled();
  });

  it('should handle missing optimizedContent in response', async () => {
    (generateText as jest.Mock).mockResolvedValue({
      text: JSON.stringify({ changes: ['Some change'] }),
    });

    const result = await optimizeRules(mockInput, mockConfig);

    expect(result.optimizedContent).toBe(mockInput.content);
  });

  it('should handle missing changes in response', async () => {
    (generateText as jest.Mock).mockResolvedValue({
      text: JSON.stringify({ optimizedContent: 'New content' }),
    });

    const result = await optimizeRules(mockInput, mockConfig);

    expect(result.changes).toEqual([]);
  });

  it('should pass baseUrl when provided', async () => {
    const configWithBaseUrl: RulesOptimizeConfig = {
      ...mockConfig,
      baseUrl: 'https://custom-api.example.com',
    };

    (generateText as jest.Mock).mockResolvedValue({
      text: JSON.stringify({ optimizedContent: 'test', changes: [] }),
    });

    await optimizeRules(mockInput, configWithBaseUrl);

    expect(generateText).toHaveBeenCalled();
  });
});
