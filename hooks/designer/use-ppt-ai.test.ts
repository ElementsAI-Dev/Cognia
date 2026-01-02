import { renderHook, act, waitFor } from '@testing-library/react';
import { usePPTAI } from './use-ppt-ai';
import type { PPTSlide, PPTPresentation } from '@/types/workflow';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock settings store
const mockProviderSettings = {
  openai: {
    apiKey: 'test-api-key',
    baseURL: undefined,
    defaultModel: 'gpt-4o',
  },
};

jest.mock('@/stores', () => ({
  useSettingsStore: jest.fn((selector) => {
    const state = {
      defaultProvider: 'openai',
      providerSettings: mockProviderSettings,
    };
    return selector(state);
  }),
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
};

const mockPresentation: PPTPresentation = {
  id: 'pres-1',
  title: 'Test Presentation',
  description: 'A test presentation',
  slides: [mockSlide],
  theme: {
    name: 'default',
    primaryColor: '#007bff',
    secondaryColor: '#6c757d',
    backgroundColor: '#ffffff',
    textColor: '#212529',
    fontFamily: 'Arial',
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('usePPTAI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  describe('initial state', () => {
    it('should return initial state with isProcessing false and no error', () => {
      const { result } = renderHook(() => usePPTAI());

      expect(result.current.isProcessing).toBe(false);
      expect(result.current.error).toBeNull();
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

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: JSON.stringify(mockResponse) } }],
        }),
      });

      const { result } = renderHook(() => usePPTAI());

      let response;
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

    it('should handle regeneration with context', async () => {
      const mockResponse = {
        title: 'Contextual Title',
        subtitle: 'Contextual Subtitle',
        content: 'Contextual content',
        bullets: ['Context Point 1'],
        layout: 'title-content',
        speakerNotes: 'Contextual notes',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: JSON.stringify(mockResponse) } }],
        }),
      });

      const { result } = renderHook(() => usePPTAI());

      const previousSlide: PPTSlide = { ...mockSlide, id: 'prev', title: 'Previous Slide' };
      const nextSlide: PPTSlide = { ...mockSlide, id: 'next', title: 'Next Slide' };

      await act(async () => {
        await result.current.regenerateSlide({
          slide: mockSlide,
          context: {
            presentationTitle: 'My Presentation',
            presentationDescription: 'A great presentation',
            previousSlide,
            nextSlide,
          },
          instructions: 'Make it more engaging',
          keepLayout: true,
        });
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.messages[1].content).toContain('My Presentation');
      expect(callBody.messages[1].content).toContain('Make it more engaging');
      expect(callBody.messages[1].content).toContain('Previous Slide');
      expect(callBody.messages[1].content).toContain('Next Slide');
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: { message: 'Internal server error' } }),
      });

      const { result } = renderHook(() => usePPTAI());

      let response;
      await act(async () => {
        response = await result.current.regenerateSlide({ slide: mockSlide });
      });

      expect(response).toEqual({
        success: false,
        error: 'Internal server error',
      });
      expect(result.current.error).toBe('Internal server error');
    });

    it('should handle JSON parse errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'invalid json' } }],
        }),
      });

      const { result } = renderHook(() => usePPTAI());

      let response;
      await act(async () => {
        response = await result.current.regenerateSlide({ slide: mockSlide });
      });

      expect(response?.success).toBe(false);
      expect(response?.error).toBeDefined();
    });
  });

  describe('optimizeContent', () => {
    it('should successfully optimize content', async () => {
      const mockResponse = {
        optimized: 'Optimized text here',
        alternatives: ['Alternative 1', 'Alternative 2'],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: JSON.stringify(mockResponse) } }],
        }),
      });

      const { result } = renderHook(() => usePPTAI());

      let response;
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

    it('should handle different content types and styles', async () => {
      const mockResponse = {
        optimized: 'Professional bullet point',
        alternatives: ['Alt 1'],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: JSON.stringify(mockResponse) } }],
        }),
      });

      const { result } = renderHook(() => usePPTAI());

      await act(async () => {
        await result.current.optimizeContent({
          content: 'Test bullet',
          type: 'bullets',
          style: 'professional',
          maxLength: 100,
        });
      });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.messages[1].content).toContain('bullets');
      expect(callBody.messages[1].content).toContain('formal and business-appropriate');
      expect(callBody.messages[1].content).toContain('100 characters');
    });

    it('should handle all style options', async () => {
      const styles = ['concise', 'detailed', 'professional', 'casual'] as const;
      const styleDescriptions = {
        concise: 'short, punchy, and to the point',
        detailed: 'comprehensive with supporting details',
        professional: 'formal and business-appropriate',
        casual: 'friendly and conversational',
      };

      for (const style of styles) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            choices: [{ message: { content: JSON.stringify({ optimized: 'test', alternatives: [] }) } }],
          }),
        });

        const { result } = renderHook(() => usePPTAI());

        await act(async () => {
          await result.current.optimizeContent({
            content: 'Test',
            type: 'content',
            style,
          });
        });

        const callBody = JSON.parse(mockFetch.mock.calls[mockFetch.mock.calls.length - 1][1].body);
        expect(callBody.messages[1].content).toContain(styleDescriptions[style]);
      }
    });

    it('should handle optimization errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => usePPTAI());

      let response;
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
      const mockResponse = {
        suggestions: [
          { type: 'content', description: 'Add more examples', action: 'Include case studies' },
          { type: 'layout', description: 'Use columns', action: 'Switch to two-column layout' },
          { type: 'design', description: 'Add visuals', action: 'Include relevant images' },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: JSON.stringify(mockResponse) } }],
        }),
      });

      const { result } = renderHook(() => usePPTAI());

      let response;
      await act(async () => {
        response = await result.current.generateSuggestions({
          slide: mockSlide,
          presentation: mockPresentation,
          suggestionType: 'all',
        });
      });

      expect(response).toEqual({
        success: true,
        suggestions: mockResponse.suggestions,
      });
    });

    it('should handle specific suggestion types', async () => {
      const suggestionTypes = ['content', 'layout', 'design'] as const;

      for (const suggestionType of suggestionTypes) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            choices: [{ message: { content: JSON.stringify({ suggestions: [] }) } }],
          }),
        });

        const { result } = renderHook(() => usePPTAI());

        await act(async () => {
          await result.current.generateSuggestions({
            slide: mockSlide,
            presentation: mockPresentation,
            suggestionType,
          });
        });

        const callBody = JSON.parse(mockFetch.mock.calls[mockFetch.mock.calls.length - 1][1].body);
        expect(callBody.messages[1].content).toContain(`Suggestion focus: ${suggestionType}`);
      }
    });

    it('should handle suggestion generation errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: () => Promise.resolve({ error: { message: 'Rate limit exceeded' } }),
      });

      const { result } = renderHook(() => usePPTAI());

      let response;
      await act(async () => {
        response = await result.current.generateSuggestions({
          slide: mockSlide,
          presentation: mockPresentation,
          suggestionType: 'all',
        });
      });

      expect(response?.success).toBe(false);
      expect(response?.error).toBe('Rate limit exceeded');
    });
  });

  describe('generateOutline', () => {
    it('should successfully generate an outline', async () => {
      const mockResponse = {
        outline: [
          { title: 'Introduction', description: 'Opening slide', type: 'title', keyPoints: ['Welcome', 'Overview'] },
          { title: 'Main Topic', description: 'Core content', type: 'content', keyPoints: ['Point A', 'Point B'] },
          { title: 'Conclusion', description: 'Closing slide', type: 'closing', keyPoints: ['Summary', 'Call to action'] },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: JSON.stringify(mockResponse) } }],
        }),
      });

      const { result } = renderHook(() => usePPTAI());

      let response;
      await act(async () => {
        response = await result.current.generateOutline('AI in Healthcare', 5);
      });

      expect(response?.success).toBe(true);
      expect(response?.outline).toHaveLength(3);
      expect(response?.outline?.[0]).toEqual({
        id: 'outline-0',
        title: 'Introduction',
        description: 'Opening slide',
        keyPoints: ['Welcome', 'Overview'],
        order: 0,
        type: 'title',
      });
    });

    it('should include slide count in prompt', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: JSON.stringify({ outline: [] }) } }],
        }),
      });

      const { result } = renderHook(() => usePPTAI());

      await act(async () => {
        await result.current.generateOutline('Test Topic', 10);
      });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.messages[1].content).toContain('exactly 10 slides');
      expect(callBody.messages[1].content).toContain('Test Topic');
    });

    it('should handle outline items without keyPoints', async () => {
      const mockResponse = {
        outline: [
          { title: 'No Key Points', description: 'Test', type: 'content' },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: JSON.stringify(mockResponse) } }],
        }),
      });

      const { result } = renderHook(() => usePPTAI());

      let response;
      await act(async () => {
        response = await result.current.generateOutline('Test', 1);
      });

      expect(response?.outline?.[0].keyPoints).toEqual([]);
    });

    it('should handle outline generation errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Timeout'));

      const { result } = renderHook(() => usePPTAI());

      let response;
      await act(async () => {
        response = await result.current.generateOutline('Test', 5);
      });

      expect(response?.success).toBe(false);
      expect(response?.error).toBe('Timeout');
    });
  });

  describe('expandBullets', () => {
    it('should successfully expand bullet points', async () => {
      const mockResponse = {
        bullets: ['Point 1', 'Point 2', 'Point 3', 'New Point 4', 'New Point 5'],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: JSON.stringify(mockResponse) } }],
        }),
      });

      const { result } = renderHook(() => usePPTAI());

      let response;
      await act(async () => {
        response = await result.current.expandBullets(['Point 1', 'Point 2', 'Point 3'], 5);
      });

      expect(response).toEqual({
        success: true,
        bullets: mockResponse.bullets,
      });
    });

    it('should include correct count in prompt', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: JSON.stringify({ bullets: [] }) } }],
        }),
      });

      const { result } = renderHook(() => usePPTAI());

      await act(async () => {
        await result.current.expandBullets(['A', 'B'], 6);
      });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.messages[1].content).toContain('Expand these bullet points to 6 items');
      expect(callBody.messages[1].content).toContain('Add 4 more related bullet points');
    });

    it('should handle expand bullets errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: { message: 'Bad request' } }),
      });

      const { result } = renderHook(() => usePPTAI());

      let response;
      await act(async () => {
        response = await result.current.expandBullets(['Test'], 5);
      });

      expect(response?.success).toBe(false);
      expect(response?.error).toBe('Bad request');
    });
  });

  describe('improveSlideNotes', () => {
    it('should successfully improve slide notes', async () => {
      const mockResponse = {
        notes: 'Comprehensive speaker notes with talking points and timing suggestions.',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: JSON.stringify(mockResponse) } }],
        }),
      });

      const { result } = renderHook(() => usePPTAI());

      let response;
      await act(async () => {
        response = await result.current.improveSlideNotes(mockSlide);
      });

      expect(response).toEqual({
        success: true,
        notes: mockResponse.notes,
      });
    });

    it('should handle slides without content', async () => {
      const emptySlide: PPTSlide = {
        id: 'empty',
        layout: 'blank',
        order: 0,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: JSON.stringify({ notes: 'Generated notes' }) } }],
        }),
      });

      const { result } = renderHook(() => usePPTAI());

      await act(async () => {
        await result.current.improveSlideNotes(emptySlide);
      });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.messages[1].content).toContain('Title: Untitled');
      expect(callBody.messages[1].content).toContain('Content: None');
      expect(callBody.messages[1].content).toContain('Bullets: None');
      expect(callBody.messages[1].content).toContain('Current notes: None');
    });

    it('should handle improve notes errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Service unavailable'));

      const { result } = renderHook(() => usePPTAI());

      let response;
      await act(async () => {
        response = await result.current.improveSlideNotes(mockSlide);
      });

      expect(response?.success).toBe(false);
      expect(response?.error).toBe('Service unavailable');
    });
  });

  describe('API configuration', () => {
    it('should throw error when API key is not configured', async () => {
      // Temporarily mock empty API key
      const originalSettings = mockProviderSettings.openai.apiKey;
      mockProviderSettings.openai.apiKey = '';

      const { result } = renderHook(() => usePPTAI());

      let response;
      await act(async () => {
        response = await result.current.regenerateSlide({ slide: mockSlide });
      });

      expect(response?.success).toBe(false);
      expect(response?.error).toBe('API key not configured');

      // Restore
      mockProviderSettings.openai.apiKey = originalSettings;
    });

    it('should use custom baseURL when provided', async () => {
      mockProviderSettings.openai.baseURL = 'https://custom-api.example.com';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: JSON.stringify({ optimized: 'test', alternatives: [] }) } }],
        }),
      });

      const { result } = renderHook(() => usePPTAI());

      await act(async () => {
        await result.current.optimizeContent({ content: 'Test', type: 'title' });
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://custom-api.example.com/chat/completions',
        expect.any(Object)
      );

      // Restore
      mockProviderSettings.openai.baseURL = undefined;
    });

    it('should use default OpenAI endpoint when no baseURL', async () => {
      mockProviderSettings.openai.baseURL = undefined;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: JSON.stringify({ optimized: 'test', alternatives: [] }) } }],
        }),
      });

      const { result } = renderHook(() => usePPTAI());

      await act(async () => {
        await result.current.optimizeContent({ content: 'Test', type: 'title' });
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.any(Object)
      );
    });

    it('should include correct headers in API request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: JSON.stringify({ optimized: 'test', alternatives: [] }) } }],
        }),
      });

      const { result } = renderHook(() => usePPTAI());

      await act(async () => {
        await result.current.optimizeContent({ content: 'Test', type: 'title' });
      });

      const callOptions = mockFetch.mock.calls[0][1];
      expect(callOptions.headers).toEqual({
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-api-key',
      });
    });

    it('should use correct model in API request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: JSON.stringify({ optimized: 'test', alternatives: [] }) } }],
        }),
      });

      const { result } = renderHook(() => usePPTAI());

      await act(async () => {
        await result.current.optimizeContent({ content: 'Test', type: 'title' });
      });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.model).toBe('gpt-4o');
      expect(callBody.temperature).toBe(0.7);
      expect(callBody.response_format).toEqual({ type: 'json_object' });
    });
  });

  describe('processing state', () => {
    it('should set isProcessing during API calls', async () => {
      let resolvePromise: (value: unknown) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockFetch.mockReturnValueOnce(pendingPromise);

      const { result } = renderHook(() => usePPTAI());

      expect(result.current.isProcessing).toBe(false);

      let responsePromise: Promise<unknown>;
      act(() => {
        responsePromise = result.current.optimizeContent({ content: 'Test', type: 'title' });
      });

      await waitFor(() => {
        expect(result.current.isProcessing).toBe(true);
      });

      // Resolve the pending promise
      act(() => {
        resolvePromise!({
          ok: true,
          json: () => Promise.resolve({
            choices: [{ message: { content: JSON.stringify({ optimized: 'test', alternatives: [] }) } }],
          }),
        });
      });

      await act(async () => {
        await responsePromise;
      });

      expect(result.current.isProcessing).toBe(false);
    });

    it('should reset isProcessing after error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Error'));

      const { result } = renderHook(() => usePPTAI());

      await act(async () => {
        await result.current.regenerateSlide({ slide: mockSlide });
      });

      expect(result.current.isProcessing).toBe(false);
      expect(result.current.error).toBe('Error');
    });
  });

  describe('error handling', () => {
    it('should handle API response without error message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('Invalid JSON')),
      });

      const { result } = renderHook(() => usePPTAI());

      let response;
      await act(async () => {
        response = await result.current.regenerateSlide({ slide: mockSlide });
      });

      expect(response?.success).toBe(false);
      expect(response?.error).toBe('API error: 500');
    });

    it('should handle empty API response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [],
        }),
      });

      const { result } = renderHook(() => usePPTAI());

      let response;
      await act(async () => {
        response = await result.current.regenerateSlide({ slide: mockSlide });
      });

      // Empty response will cause JSON parse error
      expect(response?.success).toBe(false);
    });

    it('should handle non-Error exceptions', async () => {
      mockFetch.mockImplementationOnce(() => {
        throw 'String error';
      });

      const { result } = renderHook(() => usePPTAI());

      let response;
      await act(async () => {
        response = await result.current.regenerateSlide({ slide: mockSlide });
      });

      expect(response?.success).toBe(false);
      expect(response?.error).toBe('Failed to regenerate slide');
    });
  });
});
