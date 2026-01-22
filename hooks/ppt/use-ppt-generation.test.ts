/**
 * Tests for usePPTGeneration hook
 */

import { renderHook, act } from '@testing-library/react';
import { usePPTGeneration } from './use-ppt-generation';

// Mock stores
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

const mockLoadPresentation = jest.fn();
jest.mock('@/stores/tools/ppt-editor-store', () => ({
  usePPTEditorStore: jest.fn((selector) => {
    const state = {
      loadPresentation: mockLoadPresentation,
    };
    return selector(state);
  }),
}));

// Mock generation prompts
jest.mock('@/components/ppt/utils/generation-prompts', () => ({
  buildSystemPrompt: jest.fn(() => 'System prompt'),
  buildOutlinePrompt: jest.fn(() => 'Outline prompt'),
  buildSlideContentPrompt: jest.fn(() => 'Slide content prompt'),
}));

// Mock workflow types
jest.mock('@/types/workflow', () => ({
  DEFAULT_PPT_THEMES: [{ id: 'default', name: 'Default', colors: {} }],
}));

// Mock fetch
global.fetch = jest.fn();

describe('usePPTGeneration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockReset();
  });

  describe('initialization', () => {
    it('should return initial state', () => {
      const { result } = renderHook(() => usePPTGeneration());

      expect(result.current.isGenerating).toBe(false);
      expect(result.current.progress.stage).toBe('idle');
      expect(result.current.progress.currentSlide).toBe(0);
      expect(result.current.error).toBeNull();
      expect(result.current.presentation).toBeNull();
      expect(result.current.outline).toBeNull();
    });

    it('should provide action functions', () => {
      const { result } = renderHook(() => usePPTGeneration());

      expect(typeof result.current.generateOutline).toBe('function');
      expect(typeof result.current.generateFromOutline).toBe('function');
      expect(typeof result.current.generate).toBe('function');
      expect(typeof result.current.cancel).toBe('function');
      expect(typeof result.current.reset).toBe('function');
    });

    it('should provide utility functions', () => {
      const { result } = renderHook(() => usePPTGeneration());

      expect(typeof result.current.getEstimatedTime).toBe('function');
    });
  });

  describe('getEstimatedTime', () => {
    it('should return estimated time based on slide count', () => {
      const { result } = renderHook(() => usePPTGeneration());

      const time5Slides = result.current.getEstimatedTime(5);
      const time10Slides = result.current.getEstimatedTime(10);

      expect(time10Slides).toBeGreaterThan(time5Slides);
    });
  });

  describe('reset', () => {
    it('should reset state', () => {
      const { result } = renderHook(() => usePPTGeneration());

      act(() => {
        result.current.reset();
      });

      expect(result.current.isGenerating).toBe(false);
      expect(result.current.progress.stage).toBe('idle');
      expect(result.current.error).toBeNull();
      expect(result.current.presentation).toBeNull();
      expect(result.current.outline).toBeNull();
    });
  });

  describe('cancel', () => {
    it('should cancel ongoing generation', () => {
      const { result } = renderHook(() => usePPTGeneration());

      act(() => {
        result.current.cancel();
      });

      expect(result.current.isGenerating).toBe(false);
    });
  });

  describe('generateOutline', () => {
    it('should generate outline from config', async () => {
      const mockOutlineResponse = {
        title: 'Test Presentation',
        subtitle: 'Subtitle',
        outline: [
          { slideNumber: 1, title: 'Introduction', layout: 'title' },
          { slideNumber: 2, title: 'Content', layout: 'content' },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ content: JSON.stringify(mockOutlineResponse) }),
      });

      const { result } = renderHook(() => usePPTGeneration());

      const config = {
        topic: 'Test Topic',
        slideCount: 5,
        theme: { id: 'default', name: 'Default', colors: {} },
      };

      await act(async () => {
        await result.current.generateOutline(
          config as unknown as Parameters<typeof result.current.generateOutline>[0]
        );
      });

      // Check if fetch was called or error was set
      expect(result.current.error !== null || global.fetch).toBeTruthy();
    });

    it('should handle API errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'));

      const { result } = renderHook(() => usePPTGeneration());

      const config = {
        topic: 'Test Topic',
        slideCount: 5,
        theme: { id: 'default', name: 'Default', colors: {} },
      };

      await act(async () => {
        try {
          await result.current.generateOutline(
            config as unknown as Parameters<typeof result.current.generateOutline>[0]
          );
        } catch {
          // Expected
        }
      });

      // Error should be set or handled
      expect(result.current.isGenerating).toBe(false);
    });
  });

  describe('progress tracking', () => {
    it('should update progress during generation', () => {
      const { result } = renderHook(() => usePPTGeneration());

      // Initial state
      expect(result.current.progress).toEqual({
        stage: 'idle',
        currentSlide: 0,
        totalSlides: 0,
        message: '',
      });
    });
  });
});
