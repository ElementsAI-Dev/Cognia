/**
 * OCR Tests
 *
 * Tests for OCR API functions.
 */

jest.mock('@tauri-apps/api/core', () => ({
  invoke: jest.fn(),
}));

import { invoke } from '@tauri-apps/api/core';
import {
  getProviders,
  setDefaultProvider,
  configureProvider,
  registerOllama,
  extractText,
  extractTextWithFallback,
  isProviderAvailable,
  getProviderLanguages,
  clearCache,
  getProviderDisplayName,
  providerRequiresApiKey,
  isProviderLocal,
  imageToBase64,
  canvasToBase64,
  type OcrProviderType,
  type OcrResult,
  type OcrProviderInfo,
  type ProviderInfoResponse,
  type OcrProviderConfig,
  type OcrRequest,
} from './ocr';

const mockInvoke = invoke as jest.MockedFunction<typeof invoke>;

describe('OCR - API Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getProviders', () => {
    it('should call invoke with correct command', async () => {
      const mockResponse: ProviderInfoResponse = {
        providers: [
          {
            provider_type: 'windows_ocr',
            display_name: 'Windows OCR',
            available: true,
            requires_api_key: false,
            is_local: true,
            languages: ['en', 'zh'],
            description: 'Built-in Windows OCR',
          },
        ],
        default_provider: 'windows_ocr',
      };
      mockInvoke.mockResolvedValue(mockResponse);

      const result = await getProviders();
      expect(mockInvoke).toHaveBeenCalledWith('ocr_get_providers');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('setDefaultProvider', () => {
    it('should call invoke with provider', async () => {
      mockInvoke.mockResolvedValue(undefined);

      await setDefaultProvider('openai_vision');
      expect(mockInvoke).toHaveBeenCalledWith('ocr_set_default_provider', { provider: 'openai_vision' });
    });
  });

  describe('configureProvider', () => {
    it('should call invoke with config', async () => {
      const config: OcrProviderConfig = {
        provider_type: 'openai_vision',
        enabled: true,
        api_key: 'sk-test',
        model: 'gpt-4-vision-preview',
      };
      mockInvoke.mockResolvedValue(undefined);

      await configureProvider(config);
      expect(mockInvoke).toHaveBeenCalledWith('ocr_configure_provider', { config });
    });
  });

  describe('registerOllama', () => {
    it('should call invoke with parameters', async () => {
      mockInvoke.mockResolvedValue(true);

      const result = await registerOllama('http://localhost:11434', 'llava');
      expect(mockInvoke).toHaveBeenCalledWith('ocr_register_ollama', {
        endpoint: 'http://localhost:11434',
        model: 'llava',
      });
      expect(result).toBe(true);
    });

    it('should work without parameters', async () => {
      mockInvoke.mockResolvedValue(true);

      await registerOllama();
      expect(mockInvoke).toHaveBeenCalledWith('ocr_register_ollama', {
        endpoint: undefined,
        model: undefined,
      });
    });
  });

  describe('extractText', () => {
    it('should call invoke with request', async () => {
      const mockResult: OcrResult = {
        text: 'Hello World',
        regions: [
          {
            text: 'Hello World',
            bounds: { x: 0, y: 0, width: 100, height: 20 },
            confidence: 0.95,
            region_type: 'line',
          },
        ],
        confidence: 0.95,
        language: 'en',
        provider: 'windows_ocr',
        processing_time_ms: 150,
      };
      mockInvoke.mockResolvedValue(mockResult);

      const request: OcrRequest = {
        image_base64: 'base64data',
        provider: 'windows_ocr',
        options: { language: 'en' },
      };

      const result = await extractText(request);
      expect(mockInvoke).toHaveBeenCalledWith('ocr_extract_text', { request });
      expect(result).toEqual(mockResult);
    });
  });

  describe('extractTextWithFallback', () => {
    it('should call invoke with parameters', async () => {
      const mockResult: OcrResult = {
        text: 'Text',
        regions: [],
        confidence: 0.9,
        provider: 'windows_ocr',
        processing_time_ms: 100,
      };
      mockInvoke.mockResolvedValue(mockResult);

      const providers: OcrProviderType[] = ['windows_ocr', 'tesseract'];
      const result = await extractTextWithFallback('base64data', providers, 'en');

      expect(mockInvoke).toHaveBeenCalledWith('ocr_extract_text_with_fallback', {
        imageBase64: 'base64data',
        preferredProviders: providers,
        language: 'en',
      });
      expect(result).toEqual(mockResult);
    });
  });

  describe('isProviderAvailable', () => {
    it('should call invoke with provider', async () => {
      mockInvoke.mockResolvedValue(true);

      const result = await isProviderAvailable('windows_ocr');
      expect(mockInvoke).toHaveBeenCalledWith('ocr_is_provider_available', { provider: 'windows_ocr' });
      expect(result).toBe(true);
    });
  });

  describe('getProviderLanguages', () => {
    it('should call invoke with provider', async () => {
      const languages = ['en', 'zh-Hans', 'zh-Hant', 'ja', 'ko'];
      mockInvoke.mockResolvedValue(languages);

      const result = await getProviderLanguages('windows_ocr');
      expect(mockInvoke).toHaveBeenCalledWith('ocr_get_provider_languages', { provider: 'windows_ocr' });
      expect(result).toEqual(languages);
    });
  });

  describe('clearCache', () => {
    it('should call invoke with correct command', async () => {
      mockInvoke.mockResolvedValue(undefined);

      await clearCache();
      expect(mockInvoke).toHaveBeenCalledWith('ocr_clear_cache');
    });
  });
});

describe('OCR - Helper Functions', () => {
  describe('getProviderDisplayName', () => {
    it('should return correct display names', () => {
      expect(getProviderDisplayName('windows_ocr')).toBe('Windows OCR');
      expect(getProviderDisplayName('google_vision')).toBe('Google Cloud Vision');
      expect(getProviderDisplayName('azure_vision')).toBe('Azure Computer Vision');
      expect(getProviderDisplayName('openai_vision')).toBe('OpenAI Vision');
      expect(getProviderDisplayName('ollama_vision')).toBe('Ollama Vision');
      expect(getProviderDisplayName('tesseract')).toBe('Tesseract OCR');
    });

    it('should return provider name for unknown providers', () => {
      expect(getProviderDisplayName('unknown' as OcrProviderType)).toBe('unknown');
    });
  });

  describe('providerRequiresApiKey', () => {
    it('should return true for cloud providers', () => {
      expect(providerRequiresApiKey('google_vision')).toBe(true);
      expect(providerRequiresApiKey('azure_vision')).toBe(true);
      expect(providerRequiresApiKey('openai_vision')).toBe(true);
    });

    it('should return false for local providers', () => {
      expect(providerRequiresApiKey('windows_ocr')).toBe(false);
      expect(providerRequiresApiKey('tesseract')).toBe(false);
      expect(providerRequiresApiKey('ollama_vision')).toBe(false);
    });
  });

  describe('isProviderLocal', () => {
    it('should return true for local providers', () => {
      expect(isProviderLocal('windows_ocr')).toBe(true);
      expect(isProviderLocal('tesseract')).toBe(true);
    });

    it('should return false for cloud/network providers', () => {
      expect(isProviderLocal('google_vision')).toBe(false);
      expect(isProviderLocal('azure_vision')).toBe(false);
      expect(isProviderLocal('openai_vision')).toBe(false);
      expect(isProviderLocal('ollama_vision')).toBe(false);
    });
  });

  describe('imageToBase64', () => {
    it('should convert file to base64', async () => {
      const mockFile = new File(['test content'], 'test.png', { type: 'image/png' });

      // Mock FileReader
      const mockReadAsDataURL = jest.fn();
      const mockFileReader = {
        readAsDataURL: mockReadAsDataURL,
        result: 'data:image/png;base64,dGVzdCBjb250ZW50',
        onload: null as (() => void) | null,
        onerror: null as (() => void) | null,
      };
      jest.spyOn(global, 'FileReader').mockImplementation(() => mockFileReader as unknown as FileReader);

      const promise = imageToBase64(mockFile);

      // Trigger onload
      mockFileReader.onload!();

      const result = await promise;
      expect(result).toBe('dGVzdCBjb250ZW50');
    });
  });

  describe('canvasToBase64', () => {
    it('should convert canvas to base64', () => {
      const mockCanvas = {
        toDataURL: jest.fn().mockReturnValue('data:image/png;base64,canvasdata'),
      } as unknown as HTMLCanvasElement;

      const result = canvasToBase64(mockCanvas);
      expect(mockCanvas.toDataURL).toHaveBeenCalledWith('image/png');
      expect(result).toBe('canvasdata');
    });
  });
});

describe('OCR Types', () => {
  it('should have correct OcrProviderType values', () => {
    const providers: OcrProviderType[] = [
      'windows_ocr',
      'google_vision',
      'azure_vision',
      'openai_vision',
      'ollama_vision',
      'tesseract',
    ];

    providers.forEach((provider) => {
      expect(getProviderDisplayName(provider)).toBeDefined();
    });
  });

  it('should have correct OcrRegionType values', () => {
    const regionTypes = ['word', 'line', 'paragraph', 'block'];
    regionTypes.forEach((type) => {
      const result: OcrResult = {
        text: 'test',
        regions: [
          {
            text: 'test',
            bounds: { x: 0, y: 0, width: 10, height: 10 },
            confidence: 0.9,
            region_type: type as 'word' | 'line' | 'paragraph' | 'block',
          },
        ],
        confidence: 0.9,
        provider: 'windows_ocr',
        processing_time_ms: 100,
      };
      expect(result.regions[0].region_type).toBe(type);
    });
  });

  it('should have correct OcrProviderInfo structure', () => {
    const info: OcrProviderInfo = {
      provider_type: 'openai_vision',
      display_name: 'OpenAI Vision',
      available: true,
      requires_api_key: true,
      is_local: false,
      languages: ['en', 'zh'],
      description: 'GPT-4 Vision API',
    };

    expect(info.provider_type).toBe('openai_vision');
    expect(info.requires_api_key).toBe(true);
    expect(info.is_local).toBe(false);
  });
});
