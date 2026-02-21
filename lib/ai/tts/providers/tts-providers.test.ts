/**
 * Tests for TTS Providers
 */

import { generateOpenAITTS } from './openai-tts';
import { generateGeminiTTS } from './gemini-tts';
import { generateElevenLabsTTS } from './elevenlabs-tts';
import { generateLMNTTTS } from './lmnt-tts';
import { generateHumeTTS } from './hume-tts';
import { generateCartesiaTTS } from './cartesia-tts';
import { generateDeepgramTTS } from './deepgram-tts';

// Mock proxy-fetch
jest.mock('@/lib/network/proxy-fetch', () => ({
  proxyFetch: jest.fn(),
}));

const mockProxyFetch = jest.requireMock('@/lib/network/proxy-fetch').proxyFetch;

describe('TTS Providers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('OpenAI TTS', () => {
    it('should return error when API key is missing', async () => {
      const result = await generateOpenAITTS('Hello world', {
        apiKey: '',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('API');
    });

    it('should return error when text is too long', async () => {
      const longText = 'a'.repeat(5000);
      
      const result = await generateOpenAITTS(longText, {
        apiKey: 'test-key',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should make API request with correct parameters', async () => {
      const mockBlob = new Blob(['audio data'], { type: 'audio/mpeg' });
      mockProxyFetch.mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });

      await generateOpenAITTS('Hello world', {
        apiKey: 'test-key',
        voice: 'nova',
        model: 'tts-1-hd',
        speed: 1.2,
      });

      expect(mockProxyFetch).toHaveBeenCalledWith(
        expect.stringContaining('openai.com'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-key',
          }),
        })
      );
    });

    it('should handle API errors', async () => {
      mockProxyFetch.mockResolvedValue({
        ok: false,
        status: 429,
        text: () => Promise.resolve('Rate limited'),
      });

      const result = await generateOpenAITTS('Hello world', {
        apiKey: 'test-key',
      });

      expect(result.success).toBe(false);
    });

    it('should clamp speed to valid range', async () => {
      const mockBlob = new Blob(['audio'], { type: 'audio/mpeg' });
      mockProxyFetch.mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });

      await generateOpenAITTS('Test', {
        apiKey: 'test-key',
        speed: 10, // Should be clamped to 4.0
      });

      const callBody = JSON.parse(mockProxyFetch.mock.calls[0][1].body);
      expect(callBody.speed).toBeLessThanOrEqual(4.0);
    });
  });

  describe('Gemini TTS', () => {
    it('should return error when API key is missing', async () => {
      const result = await generateGeminiTTS('Hello world', {
        apiKey: '',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('API');
    });

    it('should make API request with correct parameters', async () => {
      const mockResponse = {
        audioContent: Buffer.from('audio data').toString('base64'),
      };
      mockProxyFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await generateGeminiTTS('Hello world', {
        apiKey: 'test-key',
        voice: 'Puck',
      });

      expect(mockProxyFetch).toHaveBeenCalled();
    });

    it('should handle network errors', async () => {
      mockProxyFetch.mockRejectedValue(new Error('Network error'));

      const result = await generateGeminiTTS('Hello', {
        apiKey: 'test-key',
      });

      expect(result.success).toBe(false);
    });
  });

  // Edge TTS and System TTS tests require Tauri runtime
  // These are integration tests that should run in the Tauri environment
  describe('Edge TTS', () => {
    it.skip('should generate speech - requires Tauri runtime', () => {
      // This test requires Tauri runtime
    });
  });

  describe('System TTS', () => {
    it.skip('should generate speech - requires Tauri runtime', () => {
      // This test requires Tauri runtime
    });
  });

  describe('ElevenLabs TTS', () => {
    it('should return error when API key is missing', async () => {
      const result = await generateElevenLabsTTS('Hello world', {
        apiKey: '',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('API');
    });

    it('should return error when text is too long', async () => {
      const longText = 'a'.repeat(6000);
      
      const result = await generateElevenLabsTTS(longText, {
        apiKey: 'test-key',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should make API request with correct parameters', async () => {
      mockProxyFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
      });

      await generateElevenLabsTTS('Hello world', {
        apiKey: 'test-key',
        voice: 'rachel',
        model: 'eleven_multilingual_v2',
      });

      expect(mockProxyFetch).toHaveBeenCalledWith(
        expect.stringContaining('elevenlabs.io'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'xi-api-key': 'test-key',
          }),
        })
      );
    });

    it('should handle API errors', async () => {
      mockProxyFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ detail: { message: 'Unauthorized' } }),
      });

      const result = await generateElevenLabsTTS('Hello world', {
        apiKey: 'invalid-key',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('LMNT TTS', () => {
    it('should return error when API key is missing', async () => {
      const result = await generateLMNTTTS('Hello world', {
        apiKey: '',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('API');
    });

    it('should return error when text is too long', async () => {
      const longText = 'a'.repeat(4000);
      
      const result = await generateLMNTTTS(longText, {
        apiKey: 'test-key',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should make API request with correct parameters', async () => {
      mockProxyFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
      });

      await generateLMNTTTS('Hello world', {
        apiKey: 'test-key',
        voice: 'lily',
        speed: 1.2,
      });

      expect(mockProxyFetch).toHaveBeenCalledWith(
        expect.stringContaining('lmnt.com'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'X-API-Key': 'test-key',
          }),
        })
      );
    });

    it('should clamp speed to valid range', async () => {
      mockProxyFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
      });

      await generateLMNTTTS('Test', {
        apiKey: 'test-key',
        speed: 10, // Should be clamped to 2.0
      });

      const callBody = JSON.parse(mockProxyFetch.mock.calls[0][1].body);
      expect(callBody.speed).toBeLessThanOrEqual(2.0);
    });
  });

  describe('Hume TTS', () => {
    it('should return error when API key is missing', async () => {
      const result = await generateHumeTTS('Hello world', {
        apiKey: '',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('API');
    });

    it('should return error when text is too long', async () => {
      const longText = 'a'.repeat(6000);
      
      const result = await generateHumeTTS(longText, {
        apiKey: 'test-key',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should make API request with correct parameters', async () => {
      mockProxyFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
      });

      await generateHumeTTS('Hello world', {
        apiKey: 'test-key',
        voice: 'kora',
      });

      expect(mockProxyFetch).toHaveBeenCalledWith(
        expect.stringContaining('hume.ai'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'X-Hume-Api-Key': 'test-key',
          }),
        })
      );
    });

    it('should include acting instructions when provided', async () => {
      mockProxyFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
      });

      await generateHumeTTS('Hello world', {
        apiKey: 'test-key',
        voice: 'kora',
        actingInstructions: 'Speak with enthusiasm',
      });

      const callBody = JSON.parse(mockProxyFetch.mock.calls[0][1].body);
      expect(callBody.utterances?.[0]?.description).toBe('Speak with enthusiasm');
    });
  });

  describe('OpenAI TTS - Instructions', () => {
    it('should include instructions for gpt-4o-mini-tts model', async () => {
      mockProxyFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
      });

      await generateOpenAITTS('Hello world', {
        apiKey: 'test-key',
        model: 'gpt-4o-mini-tts',
        instructions: 'Speak warmly',
      });

      const callBody = JSON.parse(mockProxyFetch.mock.calls[0][1].body);
      expect(callBody.instructions).toBe('Speak warmly');
      expect(callBody.model).toBe('gpt-4o-mini-tts');
    });

    it('should not include instructions for tts-1 model', async () => {
      mockProxyFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
      });

      await generateOpenAITTS('Hello world', {
        apiKey: 'test-key',
        model: 'tts-1',
        instructions: 'Speak warmly',
      });

      const callBody = JSON.parse(mockProxyFetch.mock.calls[0][1].body);
      expect(callBody.instructions).toBeUndefined();
    });
  });

  describe('Cartesia TTS', () => {
    it('should return error when API key is missing', async () => {
      const result = await generateCartesiaTTS('Hello world', {
        apiKey: '',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('API');
    });

    it('should return error when text is too long', async () => {
      const longText = 'a'.repeat(11000);
      
      const result = await generateCartesiaTTS(longText, {
        apiKey: 'test-key',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should make API request with correct parameters', async () => {
      mockProxyFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
      });

      await generateCartesiaTTS('Hello world', {
        apiKey: 'test-key',
        voice: 'a0e99841-438c-4a64-b679-ae501e7d6091',
        model: 'sonic-3',
        language: 'en',
      });

      expect(mockProxyFetch).toHaveBeenCalledWith(
        expect.stringContaining('cartesia.ai'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'X-API-Key': 'test-key',
          }),
        })
      );
    });

    it('should handle API errors', async () => {
      mockProxyFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'Unauthorized' }),
      });

      const result = await generateCartesiaTTS('Hello world', {
        apiKey: 'invalid-key',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('Deepgram TTS', () => {
    it('should return error when API key is missing', async () => {
      const result = await generateDeepgramTTS('Hello world', {
        apiKey: '',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('API');
    });

    it('should return error when text is too long', async () => {
      const longText = 'a'.repeat(11000);
      
      const result = await generateDeepgramTTS(longText, {
        apiKey: 'test-key',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should make API request with correct parameters', async () => {
      mockProxyFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
        headers: new Headers({ 'content-type': 'audio/mpeg' }),
      });

      await generateDeepgramTTS('Hello world', {
        apiKey: 'test-key',
        voice: 'aura-2-asteria-en',
      });

      expect(mockProxyFetch).toHaveBeenCalledWith(
        expect.stringContaining('deepgram.com'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Token test-key',
          }),
        })
      );
    });

    it('should handle API errors', async () => {
      mockProxyFetch.mockResolvedValue({
        ok: false,
        status: 403,
        json: () => Promise.resolve({ err_msg: 'Forbidden' }),
      });

      const result = await generateDeepgramTTS('Hello world', {
        apiKey: 'invalid-key',
      });

      expect(result.success).toBe(false);
    });
  });
});
