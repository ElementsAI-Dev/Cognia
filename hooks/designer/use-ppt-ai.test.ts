import { renderHook, act } from '@testing-library/react';
import {
  usePPTAI,
  parseAIJSON,
  type AISlideResult,
  type AIContentResult,
  type AISuggestionsResult,
} from './use-ppt-ai';
import type { PPTSlide, PPTPresentation } from '@/types/workflow';

// Helper: create a mock async iterable for streamText's textStream
function createMockTextStream(text: string) {
  return {
    async *[Symbol.asyncIterator]() {
      // Yield in chunks to simulate streaming
      const chunkSize = 20;
      for (let i = 0; i < text.length; i += chunkSize) {
        yield text.slice(i, i + chunkSize);
      }
    },
  };
}

// Mock streamText from 'ai'
const mockStreamText = jest.fn();
jest.mock('ai', () => ({
  streamText: (...args: unknown[]) => mockStreamText(...args),
}));

// Mock getProxyProviderModel
const mockGetProxyProviderModel = jest.fn().mockReturnValue('mock-model-instance');
jest.mock('@/lib/ai/core/proxy-client', () => ({
  getProxyProviderModel: (...args: unknown[]) => mockGetProxyProviderModel(...args),
}));

// Mock getNextApiKey
jest.mock('@/lib/ai/infrastructure/api-key-rotation', () => ({
  getNextApiKey: jest.fn().mockReturnValue({ apiKey: 'rotated-key', index: 1 }),
}));

// Mock settings store
const mockProviderSettings: Record<string, {
  apiKey: string;
  baseURL?: string;
  defaultModel: string;
  apiKeys?: string[];
  apiKeyRotationEnabled?: boolean;
  apiKeyRotationStrategy?: string;
  currentKeyIndex?: number;
  apiKeyUsageStats?: Record<string, unknown>;
}> = {
  openai: {
    apiKey: 'test-api-key',
    baseURL: undefined,
    defaultModel: 'gpt-4o',
  },
};

jest.mock('@/stores', () => ({
  useSettingsStore: Object.assign(
    jest.fn((selector: (state: Record<string, unknown>) => unknown) => {
      const state = {
        defaultProvider: 'openai',
        providerSettings: mockProviderSettings,
      };
      return selector(state);
    }),
    {
      getState: () => ({
        updateProviderSettings: jest.fn(),
      }),
    }
  ),
}));

// Mock PPT editor store
jest.mock('@/stores/tools/ppt-editor-store', () => ({
  usePPTEditorStore: Object.assign(
    jest.fn((selector: (state: Record<string, unknown>) => unknown) => {
      const state = {
        setGenerating: jest.fn(),
      };
      return selector(state);
    }),
    {
      getState: () => ({
        setGenerating: jest.fn(),
      }),
    }
  ),
}));

// Test data
const mockSlide: PPTSlide = {
  id: 'slide-1',
  layout: 'title-content',
  title: 'Test Title',
  subtitle: 'Test Subtitle',
  content: 'Test content here',
  bullets: ['Point 1', 'Point 2', 'Point 3'],
  notes: 'Original notes',
  order: 0,
  elements: [],
};

const mockPresentation: PPTPresentation = {
  id: 'pres-1',
  title: 'Test Presentation',
  description: 'A test presentation',
  slides: [mockSlide],
  theme: {
    id: 'default',
    name: 'default',
    primaryColor: '#007bff',
    secondaryColor: '#6c757d',
    accentColor: '#0056b3',
    backgroundColor: '#ffffff',
    textColor: '#212529',
    headingFont: 'Arial',
    bodyFont: 'Arial',
    codeFont: 'Consolas',
  },
  totalSlides: 1,
  aspectRatio: '16:9',
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Helper to set up mockStreamText to return a given JSON object
function setupMockStream(responseObj: unknown) {
  const text = JSON.stringify(responseObj);
  mockStreamText.mockReturnValue({
    textStream: createMockTextStream(text),
  });
}

describe('parseAIJSON', () => {
  it('should parse plain JSON string', () => {
    const result = parseAIJSON('{"key": "value"}');
    expect(result).toEqual({ key: 'value' });
  });

  it('should parse JSON wrapped in markdown code block', () => {
    const result = parseAIJSON('```json\n{"title": "Hello"}\n```');
    expect(result).toEqual({ title: 'Hello' });
  });

  it('should parse JSON in code block without language tag', () => {
    const result = parseAIJSON('```\n{"data": [1,2,3]}\n```');
    expect(result).toEqual({ data: [1, 2, 3] });
  });

  it('should extract JSON object from surrounding text', () => {
    const result = parseAIJSON('Here is the result: {"title": "Extracted"} and some extra text');
    expect(result).toEqual({ title: 'Extracted' });
  });

  it('should extract JSON array from surrounding text', () => {
    const result = parseAIJSON('The items are: [1, 2, 3] in the response');
    expect(result).toEqual([1, 2, 3]);
  });

  it('should handle nested JSON objects', () => {
    const nested = { outer: { inner: { deep: true } } };
    const result = parseAIJSON(JSON.stringify(nested));
    expect(result).toEqual(nested);
  });

  it('should throw on completely invalid input', () => {
    expect(() => parseAIJSON('no json here at all')).toThrow('Failed to parse AI response as JSON');
  });

  it('should throw on empty string', () => {
    expect(() => parseAIJSON('')).toThrow();
  });

  it('should handle JSON with whitespace padding', () => {
    const result = parseAIJSON('  \n  {"key": "value"}  \n  ');
    expect(result).toEqual({ key: 'value' });
  });

  it('should handle markdown code block with extra whitespace', () => {
    const result = parseAIJSON('```json  \n  {"key": "value"}  \n  ```');
    expect(result).toEqual({ key: 'value' });
  });

  it('should prefer code block content over raw text', () => {
    const input = 'Some text {"wrong": true} ```json\n{"right": true}\n``` more text';
    const result = parseAIJSON(input);
    expect(result).toEqual({ right: true });
  });

  it('should handle complex AI response with explanation + JSON', () => {
    const input = `Here's the optimized slide content:

\`\`\`json
{
  "title": "AI Revolution",
  "bullets": ["Point 1", "Point 2"],
  "layout": "title-content"
}
\`\`\`

This should work well for your presentation.`;
    const result = parseAIJSON(input) as Record<string, unknown>;
    expect(result.title).toBe('AI Revolution');
    expect(result.bullets).toEqual(['Point 1', 'Point 2']);
  });
});

describe('usePPTAI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStreamText.mockReset();
  });

  describe('initial state', () => {
    it('should return initial state with isProcessing false and no error', () => {
      const { result } = renderHook(() => usePPTAI());

      expect(result.current.isProcessing).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.streamingText).toBe('');
      expect(typeof result.current.cancelGeneration).toBe('function');
      expect(typeof result.current.regenerateSlide).toBe('function');
      expect(typeof result.current.optimizeContent).toBe('function');
      expect(typeof result.current.generateSuggestions).toBe('function');
      expect(typeof result.current.generateOutline).toBe('function');
      expect(typeof result.current.expandBullets).toBe('function');
      expect(typeof result.current.improveSlideNotes).toBe('function');
    });
  });

  describe('regenerateSlide', () => {
    it('should successfully regenerate a slide', async () => {
      const mockResponse = {
        title: 'New Title',
        subtitle: 'New Subtitle',
        content: 'New content',
        bullets: ['New Point 1', 'New Point 2'],
        layout: 'title-content',
        speakerNotes: 'New speaker notes',
      };
      setupMockStream(mockResponse);

      const { result } = renderHook(() => usePPTAI());

      let response: AISlideResult | undefined;
      await act(async () => {
        response = await result.current.regenerateSlide({ slide: mockSlide });
      });

      expect(response).toEqual({
        success: true,
        slide: {
          title: 'New Title',
          subtitle: 'New Subtitle',
          content: 'New content',
          bullets: ['New Point 1', 'New Point 2'],
          layout: 'title-content',
          notes: 'New speaker notes',
        },
      });
      expect(result.current.isProcessing).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should call getProxyProviderModel with correct args', async () => {
      setupMockStream({ title: 'Test' });

      const { result } = renderHook(() => usePPTAI());

      await act(async () => {
        await result.current.regenerateSlide({ slide: mockSlide });
      });

      expect(mockGetProxyProviderModel).toHaveBeenCalledWith(
        'openai',
        'gpt-4o',
        'test-api-key',
        undefined,
        true
      );
    });

    it('should call streamText with system prompt', async () => {
      setupMockStream({ title: 'Test' });

      const { result } = renderHook(() => usePPTAI());

      await act(async () => {
        await result.current.regenerateSlide({ slide: mockSlide });
      });

      expect(mockStreamText).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'mock-model-instance',
          system: 'You are an expert presentation designer. Always respond with valid JSON.',
          temperature: 0.7,
        })
      );
    });

    it('should handle stream errors', async () => {
      mockStreamText.mockReturnValue({
        textStream: (async function* () {
          throw new Error('Stream interrupted');
        })(),
      });

      const { result } = renderHook(() => usePPTAI());

      let response: AISlideResult | undefined;
      await act(async () => {
        response = await result.current.regenerateSlide({ slide: mockSlide });
      });

      expect(response?.success).toBe(false);
      expect(response?.error).toBe('Stream interrupted');
    });
  });

  describe('optimizeContent', () => {
    it('should successfully optimize content', async () => {
      setupMockStream({
        optimized: 'Optimized text here',
        alternatives: ['Alternative 1', 'Alternative 2'],
      });

      const { result } = renderHook(() => usePPTAI());

      let response: AIContentResult | undefined;
      await act(async () => {
        response = await result.current.optimizeContent({
          content: 'Original content',
          type: 'title',
        });
      });

      expect(response).toEqual({
        success: true,
        content: 'Optimized text here',
        alternatives: ['Alternative 1', 'Alternative 2'],
      });
    });

    it('should handle optimization errors', async () => {
      mockStreamText.mockImplementation(() => {
        throw new Error('Network error');
      });

      const { result } = renderHook(() => usePPTAI());

      let response: AIContentResult | undefined;
      await act(async () => {
        response = await result.current.optimizeContent({
          content: 'Test',
          type: 'title',
        });
      });

      expect(response?.success).toBe(false);
      expect(response?.error).toBe('Network error');
    });
  });

  describe('generateSuggestions', () => {
    it('should successfully generate suggestions', async () => {
      const mockSuggestions = {
        suggestions: [
          { type: 'content', description: 'Add more examples', action: 'Include case studies' },
          { type: 'layout', description: 'Use columns', action: 'Switch to two-column layout' },
        ],
      };
      setupMockStream(mockSuggestions);

      const { result } = renderHook(() => usePPTAI());

      let response: AISuggestionsResult | undefined;
      await act(async () => {
        response = await result.current.generateSuggestions({
          slide: mockSlide,
          presentation: mockPresentation,
          suggestionType: 'all',
        });
      });

      expect(response).toEqual({
        success: true,
        suggestions: mockSuggestions.suggestions,
      });
    });
  });

  describe('generateOutline', () => {
    it('should successfully generate an outline', async () => {
      setupMockStream({
        outline: [
          { title: 'Introduction', description: 'Opening', type: 'title', keyPoints: ['Welcome'] },
          { title: 'Main', description: 'Core', type: 'content', keyPoints: ['A', 'B'] },
        ],
      });

      const { result } = renderHook(() => usePPTAI());

      let response: { success: boolean; outline?: unknown[]; error?: string } | undefined;
      await act(async () => {
        response = await result.current.generateOutline('AI in Healthcare', 5);
      });

      expect(response?.success).toBe(true);
      expect(response?.outline).toHaveLength(2);
      expect(response?.outline?.[0]).toEqual({
        id: 'outline-0',
        title: 'Introduction',
        description: 'Opening',
        keyPoints: ['Welcome'],
        order: 0,
        type: 'title',
      });
    });

    it('should handle outline items without keyPoints', async () => {
      setupMockStream({
        outline: [{ title: 'No Points', description: 'Test', type: 'content' }],
      });

      const { result } = renderHook(() => usePPTAI());

      let response: { success: boolean; outline?: unknown[]; error?: string } | undefined;
      await act(async () => {
        response = await result.current.generateOutline('Test', 1);
      });

      const firstItem = response?.outline?.[0] as { keyPoints?: unknown[] } | undefined;
      expect(firstItem?.keyPoints).toEqual([]);
    });
  });

  describe('expandBullets', () => {
    it('should successfully expand bullet points', async () => {
      setupMockStream({
        bullets: ['Point 1', 'Point 2', 'Point 3', 'New 4', 'New 5'],
      });

      const { result } = renderHook(() => usePPTAI());

      let response: { success: boolean; bullets?: string[]; error?: string } | undefined;
      await act(async () => {
        response = await result.current.expandBullets(['Point 1', 'Point 2', 'Point 3'], 5);
      });

      expect(response?.success).toBe(true);
      expect(response?.bullets).toHaveLength(5);
    });
  });

  describe('improveSlideNotes', () => {
    it('should successfully improve slide notes', async () => {
      setupMockStream({
        notes: 'Improved speaker notes with timing.',
      });

      const { result } = renderHook(() => usePPTAI());

      let response: { success: boolean; notes?: string; error?: string } | undefined;
      await act(async () => {
        response = await result.current.improveSlideNotes(mockSlide);
      });

      expect(response).toEqual({
        success: true,
        notes: 'Improved speaker notes with timing.',
      });
    });
  });

  describe('API configuration', () => {
    it('should throw error when API key is not configured', async () => {
      const originalKey = mockProviderSettings.openai.apiKey;
      mockProviderSettings.openai.apiKey = '';

      const { result } = renderHook(() => usePPTAI());

      let response: AISlideResult | undefined;
      await act(async () => {
        response = await result.current.regenerateSlide({ slide: mockSlide });
      });

      expect(response?.success).toBe(false);
      expect(response?.error).toBe('API key not configured');

      mockProviderSettings.openai.apiKey = originalKey;
    });
  });

  describe('processing state', () => {
    it('should reset isProcessing after error', async () => {
      mockStreamText.mockImplementation(() => {
        throw new Error('Error');
      });

      const { result } = renderHook(() => usePPTAI());

      await act(async () => {
        await result.current.regenerateSlide({ slide: mockSlide });
      });

      expect(result.current.isProcessing).toBe(false);
      expect(result.current.error).toBe('Error');
    });

    it('should handle non-Error exceptions', async () => {
      mockStreamText.mockImplementation(() => {
        throw 'String error';
      });

      const { result } = renderHook(() => usePPTAI());

      let response: AISlideResult | undefined;
      await act(async () => {
        response = await result.current.regenerateSlide({ slide: mockSlide });
      });

      expect(response?.success).toBe(false);
      expect(response?.error).toBe('Failed to regenerate slide');
    });
  });
});
