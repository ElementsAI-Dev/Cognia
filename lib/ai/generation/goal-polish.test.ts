/**
 * Tests for goal-polish.ts
 * AI-powered goal refinement utility
 */

import { polishGoal, type GoalPolishInput, type GoalPolishConfig } from './goal-polish';
import { generateText } from 'ai';

// Mock ai module
jest.mock('ai', () => ({
  generateText: jest.fn(),
}));

// Mock AI SDK providers
jest.mock('@ai-sdk/openai', () => ({
  createOpenAI: jest.fn(() => jest.fn((model: string) => ({ model }))),
}));

jest.mock('@ai-sdk/anthropic', () => ({
  createAnthropic: jest.fn(() => jest.fn((model: string) => ({ model }))),
}));

const mockedGenerateText = generateText as jest.MockedFunction<typeof generateText>;

describe('goal-polish', () => {
  const defaultConfig: GoalPolishConfig = {
    provider: 'openai',
    model: 'gpt-4',
    apiKey: 'test-api-key',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('polishGoal', () => {
    it('should polish a goal and return structured output', async () => {
      const input: GoalPolishInput = {
        content: 'I want to learn programming',
      };

      mockedGenerateText.mockResolvedValue({
        text: JSON.stringify({
          polishedContent: 'Learn Python programming basics within 3 months',
          suggestedSteps: [
            'Install Python and set up development environment',
            'Complete a beginner Python course',
            'Build 3 small projects',
          ],
          improvements: [
            'Made goal time-bound',
            'Specified programming language',
          ],
        }),
      } as never);

      const result = await polishGoal(input, defaultConfig);

      expect(result.polishedContent).toBe('Learn Python programming basics within 3 months');
      expect(result.suggestedSteps).toHaveLength(3);
      expect(result.improvements).toHaveLength(2);
    });

    it('should handle JSON wrapped in code blocks', async () => {
      const input: GoalPolishInput = { content: 'Get fit' };

      mockedGenerateText.mockResolvedValue({
        text: '```json\n{"polishedContent": "Exercise 3 times per week", "suggestedSteps": ["Join gym"], "improvements": ["Added frequency"]}\n```',
      } as never);

      const result = await polishGoal(input, defaultConfig);

      expect(result.polishedContent).toBe('Exercise 3 times per week');
      expect(result.suggestedSteps).toEqual(['Join gym']);
    });

    it('should include context in the prompt when provided', async () => {
      const input: GoalPolishInput = {
        content: 'Improve my skills',
        context: 'I am a junior developer',
      };

      mockedGenerateText.mockResolvedValue({
        text: JSON.stringify({
          polishedContent: 'Improve JavaScript skills to mid-level within 6 months',
          suggestedSteps: [],
          improvements: [],
        }),
      } as never);

      await polishGoal(input, defaultConfig);

      expect(mockedGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining('Context: I am a junior developer'),
        })
      );
    });

    it('should use anthropic provider when specified', async () => {
      const anthropicConfig: GoalPolishConfig = {
        ...defaultConfig,
        provider: 'anthropic',
        model: 'claude-3-sonnet',
      };

      mockedGenerateText.mockResolvedValue({
        text: JSON.stringify({
          polishedContent: 'Polished goal',
          suggestedSteps: [],
          improvements: [],
        }),
      } as never);

      await polishGoal({ content: 'Test goal' }, anthropicConfig);

      expect(mockedGenerateText).toHaveBeenCalled();
    });

    it('should use custom baseUrl when provided', async () => {
      const configWithBaseUrl: GoalPolishConfig = {
        ...defaultConfig,
        baseUrl: 'https://custom-api.example.com',
      };

      mockedGenerateText.mockResolvedValue({
        text: JSON.stringify({
          polishedContent: 'Polished',
          suggestedSteps: [],
          improvements: [],
        }),
      } as never);

      await polishGoal({ content: 'Goal' }, configWithBaseUrl);

      expect(mockedGenerateText).toHaveBeenCalled();
    });

    it('should fallback to OpenAI-compatible API for unknown providers', async () => {
      const unknownProviderConfig: GoalPolishConfig = {
        provider: 'custom' as never,
        model: 'custom-model',
        apiKey: 'test-key',
      };

      mockedGenerateText.mockResolvedValue({
        text: JSON.stringify({
          polishedContent: 'Result',
          suggestedSteps: [],
          improvements: [],
        }),
      } as never);

      const result = await polishGoal({ content: 'Test' }, unknownProviderConfig);

      expect(result.polishedContent).toBe('Result');
    });

    it('should handle JSON parse errors gracefully', async () => {
      const input: GoalPolishInput = { content: 'My goal' };

      mockedGenerateText.mockResolvedValue({
        text: 'This is not valid JSON but a refined goal description',
      } as never);

      const result = await polishGoal(input, defaultConfig);

      expect(result.polishedContent).toBe('This is not valid JSON but a refined goal description');
      expect(result.suggestedSteps).toEqual([]);
      expect(result.improvements).toEqual([]);
    });

    it('should return original content when polishedContent is missing', async () => {
      const input: GoalPolishInput = { content: 'Original goal' };

      mockedGenerateText.mockResolvedValue({
        text: JSON.stringify({
          suggestedSteps: ['Step 1'],
          improvements: ['Improvement 1'],
        }),
      } as never);

      const result = await polishGoal(input, defaultConfig);

      expect(result.polishedContent).toBe('Original goal');
    });

    it('should handle empty response', async () => {
      const input: GoalPolishInput = { content: 'My goal' };

      mockedGenerateText.mockResolvedValue({
        text: '',
      } as never);

      const result = await polishGoal(input, defaultConfig);

      expect(result.polishedContent).toBe('My goal');
    });

    it('should handle partial JSON response', async () => {
      const input: GoalPolishInput = { content: 'Test goal' };

      mockedGenerateText.mockResolvedValue({
        text: JSON.stringify({
          polishedContent: 'Refined goal',
          // Missing suggestedSteps and improvements
        }),
      } as never);

      const result = await polishGoal(input, defaultConfig);

      expect(result.polishedContent).toBe('Refined goal');
      expect(result.suggestedSteps).toEqual([]);
      expect(result.improvements).toEqual([]);
    });
  });
});
