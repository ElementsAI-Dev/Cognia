/**
 * Tests for useLatexAI hook
 */

import { renderHook, act } from '@testing-library/react';
import { useLatexAI } from './use-latex-ai';

// Mock dependencies
const mockSendMessage = jest.fn();
const mockStop = jest.fn();

jest.mock('@/stores/settings', () => ({
  useSettingsStore: jest.fn((selector) => {
    const state = {
      defaultProvider: 'openai',
      providerSettings: {
        openai: { enabled: true, apiKey: 'test-key', defaultModel: 'gpt-4o-mini' },
        anthropic: { enabled: false },
      },
    };
    return selector(state);
  }),
}));

jest.mock('@/lib/ai/generation/use-ai-chat', () => ({
  useAIChat: jest.fn(() => ({
    sendMessage: mockSendMessage,
    stop: mockStop,
  })),
}));

describe('useLatexAI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSendMessage.mockReset();
  });

  describe('initialization', () => {
    it('should return initial state', () => {
      const { result } = renderHook(() => useLatexAI());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.runTextAction).toBe('function');
      expect(typeof result.current.generateEquation).toBe('function');
      expect(typeof result.current.stop).toBe('function');
    });
  });

  describe('runTextAction', () => {
    it('should improve writing', async () => {
      mockSendMessage.mockResolvedValue('Improved text');

      const { result } = renderHook(() => useLatexAI());

      let output;
      await act(async () => {
        output = await result.current.runTextAction({
          action: 'improveWriting',
          text: 'Original text',
        });
      });

      expect(output).toBe('Improved text');
      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining('Improve the following text'),
            }),
          ]),
        })
      );
    });

    it('should fix grammar', async () => {
      mockSendMessage.mockResolvedValue('Fixed text');

      const { result } = renderHook(() => useLatexAI());

      let output;
      await act(async () => {
        output = await result.current.runTextAction({
          action: 'fixGrammar',
          text: 'Text with errrors',
        });
      });

      expect(output).toBe('Fixed text');
      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('Fix grammar'),
            }),
          ]),
        })
      );
    });

    it('should make text concise', async () => {
      mockSendMessage.mockResolvedValue('Concise text');

      const { result } = renderHook(() => useLatexAI());

      await act(async () => {
        await result.current.runTextAction({
          action: 'makeConcise',
          text: 'Very long and verbose text',
        });
      });

      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('more concise'),
            }),
          ]),
        })
      );
    });

    it('should expand text', async () => {
      mockSendMessage.mockResolvedValue('Expanded text with more details');

      const { result } = renderHook(() => useLatexAI());

      await act(async () => {
        await result.current.runTextAction({
          action: 'expandText',
          text: 'Short text',
        });
      });

      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('Expand the following text'),
            }),
          ]),
        })
      );
    });

    it('should translate text', async () => {
      mockSendMessage.mockResolvedValue('翻译后的文本');

      const { result } = renderHook(() => useLatexAI());

      await act(async () => {
        await result.current.runTextAction({
          action: 'translate',
          text: 'Text to translate',
          targetLanguage: 'Chinese',
        });
      });

      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('Translate'),
            }),
          ]),
        })
      );
    });

    it('should return null for empty text', async () => {
      const { result } = renderHook(() => useLatexAI());

      let output;
      await act(async () => {
        output = await result.current.runTextAction({
          action: 'improveWriting',
          text: '   ',
        });
      });

      expect(output).toBeNull();
      expect(mockSendMessage).not.toHaveBeenCalled();
    });

    it('should handle error', async () => {
      mockSendMessage.mockRejectedValue(new Error('AI request failed'));

      const { result } = renderHook(() => useLatexAI());

      let output;
      await act(async () => {
        output = await result.current.runTextAction({
          action: 'improveWriting',
          text: 'Test text',
        });
      });

      expect(output).toBeNull();
      expect(result.current.error).toBe('AI request failed');
    });

    it('should return null for empty result', async () => {
      mockSendMessage.mockResolvedValue('   ');

      const { result } = renderHook(() => useLatexAI());

      let output;
      await act(async () => {
        output = await result.current.runTextAction({
          action: 'improveWriting',
          text: 'Test text',
        });
      });

      expect(output).toBeNull();
    });
  });

  describe('generateEquation', () => {
    it('should generate LaTeX equation', async () => {
      mockSendMessage.mockResolvedValue('\\frac{a}{b}');

      const { result } = renderHook(() => useLatexAI());

      let output;
      await act(async () => {
        output = await result.current.generateEquation('a divided by b');
      });

      expect(output).toBe('\\frac{a}{b}');
      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('LaTeX'),
            }),
          ]),
          temperature: 0.2,
        })
      );
    });

    it('should return null for empty prompt', async () => {
      const { result } = renderHook(() => useLatexAI());

      let output;
      await act(async () => {
        output = await result.current.generateEquation('   ');
      });

      expect(output).toBeNull();
      expect(mockSendMessage).not.toHaveBeenCalled();
    });

    it('should handle error', async () => {
      mockSendMessage.mockRejectedValue(new Error('Generation failed'));

      const { result } = renderHook(() => useLatexAI());

      let output;
      await act(async () => {
        output = await result.current.generateEquation('invalid equation');
      });

      expect(output).toBeNull();
      expect(result.current.error).toBe('Generation failed');
    });

    it('should return null for empty result', async () => {
      mockSendMessage.mockResolvedValue('');

      const { result } = renderHook(() => useLatexAI());

      let output;
      await act(async () => {
        output = await result.current.generateEquation('test equation');
      });

      expect(output).toBeNull();
    });
  });

  describe('stop', () => {
    it('should call stop function', () => {
      const { result } = renderHook(() => useLatexAI());

      act(() => {
        result.current.stop();
      });

      expect(mockStop).toHaveBeenCalled();
    });
  });
});
