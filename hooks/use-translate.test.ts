/**
 * Tests for useTranslate hook
 */

import { renderHook, act } from '@testing-library/react';
import { useTranslate } from './use-translate';
import * as translateLib from '@/lib/ai/translate';

// Mock dependencies
jest.mock('@/lib/ai/translate', () => ({
  translateText: jest.fn(),
  detectLanguage: jest.fn(),
  SUPPORTED_LANGUAGES: {
    en: 'English',
    es: 'Spanish',
    fr: 'French',
    de: 'German',
    zh: 'Chinese',
    ja: 'Japanese',
  },
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

const mockTranslateText = translateLib.translateText as jest.MockedFunction<typeof translateLib.translateText>;
const mockDetectLanguage = translateLib.detectLanguage as jest.MockedFunction<typeof translateLib.detectLanguage>;

describe('useTranslate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useTranslate());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.result).toBeNull();
      expect(result.current.detectedLanguage).toBeNull();
    });
  });

  describe('translate', () => {
    it('should translate text successfully', async () => {
      const mockResult = {
        success: true,
        translatedText: 'Hola mundo',
        sourceLanguage: 'en' as const,
        targetLanguage: 'es' as const,
      };
      mockTranslateText.mockResolvedValue(mockResult);

      const { result } = renderHook(() => useTranslate());

      let translationResult;
      await act(async () => {
        translationResult = await result.current.translate('Hello world', 'es');
      });

      expect(translationResult).toEqual(mockResult);
      expect(result.current.result).toEqual(mockResult);
      expect(result.current.error).toBeNull();
      expect(mockTranslateText).toHaveBeenCalledWith(
        'Hello world',
        'es',
        expect.objectContaining({
          provider: 'openai',
          model: 'gpt-4o',
          apiKey: 'test-api-key',
        })
      );
    });

    it('should handle translation failure', async () => {
      const mockResult = {
        success: false,
        error: 'Translation failed',
        translatedText: '',
        sourceLanguage: 'en' as const,
        targetLanguage: 'es' as const,
      };
      mockTranslateText.mockResolvedValue(mockResult);

      const { result } = renderHook(() => useTranslate());

      await act(async () => {
        await result.current.translate('Hello', 'es');
      });

      expect(result.current.error).toBe('Translation failed');
    });

    it('should handle translation errors', async () => {
      mockTranslateText.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useTranslate());

      let translationResult;
      await act(async () => {
        translationResult = await result.current.translate('Hello', 'es');
      });

      expect(translationResult).toBeNull();
      expect(result.current.error).toBe('Network error');
    });

    it('should set loading state during translation', async () => {
      mockTranslateText.mockResolvedValue({
        success: true,
        translatedText: 'Hola',
        sourceLanguage: 'en',
        targetLanguage: 'es',
      });

      const { result } = renderHook(() => useTranslate());

      // Start translation
      const translatePromise = act(async () => {
        return result.current.translate('Hello', 'es');
      });

      await translatePromise;

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('detect', () => {
    it('should detect language successfully', async () => {
      const mockDetection = { code: 'en' as const, confidence: 0.95 };
      mockDetectLanguage.mockResolvedValue(mockDetection);

      const { result } = renderHook(() => useTranslate());

      let detection;
      await act(async () => {
        detection = await result.current.detect('Hello world');
      });

      expect(detection).toEqual(mockDetection);
      expect(result.current.detectedLanguage).toEqual(mockDetection);
    });

    it('should handle detection errors', async () => {
      mockDetectLanguage.mockRejectedValue(new Error('Detection failed'));

      const { result } = renderHook(() => useTranslate());

      let detection;
      await act(async () => {
        detection = await result.current.detect('Hello');
      });

      expect(detection).toBeNull();
      expect(result.current.error).toBe('Detection failed');
    });
  });

  describe('translateBatch', () => {
    it('should translate multiple texts', async () => {
      mockTranslateText
        .mockResolvedValueOnce({ success: true, translatedText: 'Hola', sourceLanguage: 'en', targetLanguage: 'es' })
        .mockResolvedValueOnce({ success: true, translatedText: 'Mundo', sourceLanguage: 'en', targetLanguage: 'es' });

      const { result } = renderHook(() => useTranslate());

      let results;
      await act(async () => {
        results = await result.current.translateBatch(['Hello', 'World'], 'es');
      });

      expect(results).toHaveLength(2);
      expect(results![0].translatedText).toBe('Hola');
      expect(results![1].translatedText).toBe('Mundo');
    });

    it('should handle batch translation errors', async () => {
      mockTranslateText.mockRejectedValue(new Error('Batch failed'));

      const { result } = renderHook(() => useTranslate());

      let results;
      await act(async () => {
        results = await result.current.translateBatch(['Hello', 'World'], 'es');
      });

      expect(results).toBeNull();
      expect(result.current.error).toBe('Batch failed');
    });
  });

  describe('getSupportedLanguages', () => {
    it('should return supported languages', () => {
      const { result } = renderHook(() => useTranslate());

      const languages = result.current.getSupportedLanguages();

      expect(languages).toHaveProperty('en');
      expect(languages).toHaveProperty('es');
      expect(languages).toHaveProperty('fr');
    });
  });

  describe('reset', () => {
    it('should reset all state', async () => {
      mockTranslateText.mockResolvedValue({
        success: true,
        translatedText: 'Hola',
        sourceLanguage: 'en',
        targetLanguage: 'es',
      });

      const { result } = renderHook(() => useTranslate());

      await act(async () => {
        await result.current.translate('Hello', 'es');
      });

      expect(result.current.result).not.toBeNull();

      act(() => {
        result.current.reset();
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.result).toBeNull();
      expect(result.current.detectedLanguage).toBeNull();
    });
  });

  describe('with custom options', () => {
    it('should use override provider and model', async () => {
      mockTranslateText.mockResolvedValue({
        success: true,
        translatedText: 'Hola',
        sourceLanguage: 'en',
        targetLanguage: 'es',
      });

      const { result } = renderHook(() => useTranslate({
        provider: 'anthropic',
        model: 'claude-3',
      }));

      await act(async () => {
        await result.current.translate('Hello', 'es');
      });

      expect(mockTranslateText).toHaveBeenCalledWith(
        'Hello',
        'es',
        expect.objectContaining({
          provider: 'anthropic',
          model: 'claude-3',
        })
      );
    });
  });
});
