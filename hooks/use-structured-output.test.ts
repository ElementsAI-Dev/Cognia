/**
 * Tests for useStructuredOutput hook
 */

import { renderHook, act } from '@testing-library/react';
import { useStructuredOutput } from './use-structured-output';
import { z } from 'zod';
import * as structuredOutputLib from '@/lib/ai/structured-output';

// Mock dependencies
jest.mock('@/lib/ai/structured-output', () => ({
  generateStructuredObject: jest.fn(),
  streamStructuredObject: jest.fn(),
  generateStructuredArray: jest.fn(),
  EntityExtractionSchema: { parse: jest.fn() },
  SentimentAnalysisSchema: { parse: jest.fn() },
  TextClassificationSchema: { parse: jest.fn() },
  CodeAnalysisSchema: { parse: jest.fn() },
}));

jest.mock('@/stores', () => ({
  useSettingsStore: jest.fn((selector) => {
    const state = {
      defaultProvider: 'openai',
      providerSettings: {
        openai: {
          apiKey: 'test-api-key',
          defaultModel: 'gpt-4o',
        },
      },
    };
    return selector(state);
  }),
}));

const mockGenerateObject = structuredOutputLib.generateStructuredObject as jest.MockedFunction<typeof structuredOutputLib.generateStructuredObject>;
const mockStreamObject = structuredOutputLib.streamStructuredObject as jest.MockedFunction<typeof structuredOutputLib.streamStructuredObject>;
const mockGenerateArray = structuredOutputLib.generateStructuredArray as jest.MockedFunction<typeof structuredOutputLib.generateStructuredArray>;

describe('useStructuredOutput', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useStructuredOutput());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.result).toBeNull();
    });

    it('should provide generation methods', () => {
      const { result } = renderHook(() => useStructuredOutput());

      expect(typeof result.current.generate).toBe('function');
      expect(typeof result.current.generateArray).toBe('function');
      expect(typeof result.current.streamGenerate).toBe('function');
    });

    it('should provide preset methods', () => {
      const { result } = renderHook(() => useStructuredOutput());

      expect(typeof result.current.extractEntities).toBe('function');
      expect(typeof result.current.analyzeSentiment).toBe('function');
      expect(typeof result.current.classifyText).toBe('function');
      expect(typeof result.current.summarize).toBe('function');
      expect(typeof result.current.analyzeCode).toBe('function');
    });
  });

  describe('generate', () => {
    const TestSchema = z.object({
      name: z.string(),
      age: z.number(),
    });

    it('should generate structured object', async () => {
      const mockResult = { name: 'John', age: 30 };
      mockGenerateObject.mockResolvedValue({ object: mockResult });

      const { result } = renderHook(() => useStructuredOutput());

      let generateResult;
      await act(async () => {
        generateResult = await result.current.generate('Create a person', TestSchema);
      });

      expect(generateResult).toEqual(mockResult);
      expect(result.current.result).toEqual(mockResult);
      expect(result.current.error).toBeNull();
    });

    it('should handle generation errors', async () => {
      mockGenerateObject.mockRejectedValue(new Error('API error'));

      const { result } = renderHook(() => useStructuredOutput());

      let generateResult;
      await act(async () => {
        generateResult = await result.current.generate('Create a person', TestSchema);
      });

      expect(generateResult).toBeNull();
      expect(result.current.error).toBe('API error');
    });

    it('should pass system prompt to generator', async () => {
      mockGenerateObject.mockResolvedValue({ object: { name: 'Test', age: 25 } });

      const { result } = renderHook(() => useStructuredOutput());

      await act(async () => {
        await result.current.generate('Create a person', TestSchema, 'You are helpful');
      });

      expect(mockGenerateObject).toHaveBeenCalledWith(
        expect.objectContaining({
          systemPrompt: 'You are helpful',
        })
      );
    });

    it('should set loading state during generation', async () => {
      mockGenerateObject.mockResolvedValue({ object: { name: 'Test', age: 25 } });

      const { result } = renderHook(() => useStructuredOutput());

      const promise = act(async () => {
        return result.current.generate('Create a person', TestSchema);
      });

      await promise;

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('generateArray', () => {
    const ItemSchema = z.object({ id: z.number(), name: z.string() });

    it('should generate array of structured objects', async () => {
      const mockResult = [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
      ];
      mockGenerateArray.mockResolvedValue({ object: mockResult });

      const { result } = renderHook(() => useStructuredOutput());

      let generateResult;
      await act(async () => {
        generateResult = await result.current.generateArray('Create items', ItemSchema);
      });

      expect(generateResult).toEqual(mockResult);
      expect(generateResult).toHaveLength(2);
    });

    it('should handle array generation errors', async () => {
      mockGenerateArray.mockRejectedValue(new Error('Array generation failed'));

      const { result } = renderHook(() => useStructuredOutput());

      let generateResult;
      await act(async () => {
        generateResult = await result.current.generateArray('Create items', ItemSchema);
      });

      expect(generateResult).toBeNull();
      expect(result.current.error).toBe('Array generation failed');
    });
  });

  describe('streamGenerate', () => {
    const TestSchema = z.object({ content: z.string() });

    it('should stream structured object with partial updates', async () => {
      const mockResult = { content: 'Complete content' };
      mockStreamObject.mockResolvedValue(mockResult);

      const { result } = renderHook(() => useStructuredOutput());
      const onPartial = jest.fn();

      let streamResult;
      await act(async () => {
        streamResult = await result.current.streamGenerate('Generate content', TestSchema, onPartial);
      });

      expect(streamResult).toEqual(mockResult);
      expect(mockStreamObject).toHaveBeenCalledWith(
        expect.objectContaining({
          onPartial,
        })
      );
    });

    it('should handle streaming errors', async () => {
      mockStreamObject.mockRejectedValue(new Error('Stream failed'));

      const { result } = renderHook(() => useStructuredOutput());

      let streamResult;
      await act(async () => {
        streamResult = await result.current.streamGenerate('Generate', TestSchema, jest.fn());
      });

      expect(streamResult).toBeNull();
      expect(result.current.error).toBe('Stream failed');
    });
  });

  describe('preset methods', () => {
    beforeEach(() => {
      mockGenerateObject.mockResolvedValue({ object: {} });
    });

    it('should extract entities', async () => {
      const { result } = renderHook(() => useStructuredOutput());

      await act(async () => {
        await result.current.extractEntities('John works at Microsoft in Seattle.');
      });

      expect(mockGenerateObject).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining('Extract all entities'),
        })
      );
    });

    it('should analyze sentiment', async () => {
      const { result } = renderHook(() => useStructuredOutput());

      await act(async () => {
        await result.current.analyzeSentiment('I love this product!');
      });

      expect(mockGenerateObject).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining('Analyze the sentiment'),
        })
      );
    });

    it('should classify text', async () => {
      const { result } = renderHook(() => useStructuredOutput());

      await act(async () => {
        await result.current.classifyText('Breaking news about tech', ['sports', 'tech', 'politics']);
      });

      expect(mockGenerateObject).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining('sports, tech, politics'),
        })
      );
    });

    it('should summarize with max length', async () => {
      const { result } = renderHook(() => useStructuredOutput());

      await act(async () => {
        await result.current.summarize('Long text here...', 100);
      });

      expect(mockGenerateObject).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining('under 100 words'),
        })
      );
    });

    it('should analyze code with language', async () => {
      const { result } = renderHook(() => useStructuredOutput());

      await act(async () => {
        await result.current.analyzeCode('function test() {}', 'javascript');
      });

      expect(mockGenerateObject).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining('javascript'),
        })
      );
    });
  });

  describe('reset', () => {
    it('should reset all state', async () => {
      mockGenerateObject.mockResolvedValue({ object: { data: 'test' } });

      const { result } = renderHook(() => useStructuredOutput());

      await act(async () => {
        await result.current.generate('test', z.object({ data: z.string() }));
      });

      expect(result.current.result).not.toBeNull();

      act(() => {
        result.current.reset();
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.result).toBeNull();
    });
  });

  describe('custom options', () => {
    it('should use custom provider and model', async () => {
      mockGenerateObject.mockResolvedValue({ object: {} });

      const { result } = renderHook(() => useStructuredOutput({
        provider: 'anthropic',
        model: 'claude-3',
        temperature: 0.5,
      }));

      await act(async () => {
        await result.current.generate('test', z.object({ x: z.string() }));
      });

      expect(mockGenerateObject).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            provider: 'anthropic',
            model: 'claude-3',
            temperature: 0.5,
          }),
        })
      );
    });
  });
});
