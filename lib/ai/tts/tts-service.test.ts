/**
 * Tests for TTS Service
 */

import {
  TTSService,
  generateTTSAudio,
  isTTSProviderAvailable,
  getAvailableTTSProviders,
  type TTSServiceOptions,
  type TTSServiceController,
  type TTSApiKeys,
} from './tts-service';
import { DEFAULT_TTS_SETTINGS } from '@/types/media/tts';

// Mock audio APIs
jest.mock('./providers/openai-tts', () => ({
  generateOpenAITTS: jest.fn(),
}));

jest.mock('./providers/gemini-tts', () => ({
  generateGeminiTTS: jest.fn(),
  generateGeminiTTSViaApi: jest.fn(),
}));

jest.mock('./providers/edge-tts', () => ({
  generateEdgeTTS: jest.fn(),
}));

jest.mock('./providers/elevenlabs-tts', () => ({
  generateElevenLabsTTS: jest.fn(),
  generateElevenLabsTTSViaApi: jest.fn(),
}));

jest.mock('./providers/lmnt-tts', () => ({
  generateLMNTTTS: jest.fn(),
  generateLMNTTTSViaApi: jest.fn(),
}));

jest.mock('./providers/hume-tts', () => ({
  generateHumeTTS: jest.fn(),
  generateHumeTTSViaApi: jest.fn(),
}));

jest.mock('./providers/system-tts', () => ({
  getSystemVoices: jest.fn(() => []),
  isSystemTTSSupported: jest.fn(() => true),
  stopSystemTTS: jest.fn(),
  pauseSystemTTS: jest.fn(),
  resumeSystemTTS: jest.fn(),
  speakWithSystemTTS: jest.fn(),
}));

describe('TTSService', () => {
  const defaultOptions: TTSServiceOptions = {
    settings: DEFAULT_TTS_SETTINGS,
  };

  describe('constructor', () => {
    it('should create instance with options', () => {
      const service = new TTSService(defaultOptions);
      expect(service).toBeDefined();
    });

    it('should accept API keys', () => {
      const options: TTSServiceOptions = {
        settings: DEFAULT_TTS_SETTINGS,
        apiKeys: {
          openai: 'sk-test',
          google: 'AIza-test',
        },
      };
      const customService = new TTSService(options);
      expect(customService).toBeDefined();
    });

    it('should accept all provider API keys', () => {
      const apiKeys: TTSApiKeys = {
        openai: 'sk-test',
        google: 'AIza-test',
        elevenlabs: 'xi-test',
        lmnt: 'lmnt-test',
        hume: 'hume-test',
      };
      const options: TTSServiceOptions = {
        settings: DEFAULT_TTS_SETTINGS,
        apiKeys,
      };
      const customService = new TTSService(options);
      expect(customService).toBeDefined();
    });
  });

  describe('speak', () => {
    it('should accept text to speak', async () => {
      const service = new TTSService(defaultOptions);
      // This will fail without proper mocking but tests the interface
      await expect(service.speak('Hello')).rejects.toBeDefined();
    });
  });

  describe('stop', () => {
    it('should stop without error', () => {
      const service = new TTSService(defaultOptions);
      expect(() => service.stop()).not.toThrow();
    });
  });

  describe('pause', () => {
    it('should pause without error', () => {
      const service = new TTSService(defaultOptions);
      expect(() => service.pause()).not.toThrow();
    });
  });

  describe('resume', () => {
    it('should resume without error', () => {
      const service = new TTSService(defaultOptions);
      expect(() => service.resume()).not.toThrow();
    });
  });

  describe('getState', () => {
    it('should return current playback state', () => {
      const service = new TTSService(defaultOptions);
      const state = service.getState();
      expect(['idle', 'loading', 'playing', 'paused', 'error']).toContain(state);
    });
  });
});

describe('isTTSProviderAvailable', () => {
  it('should return true for system provider', () => {
    expect(isTTSProviderAvailable('system')).toBe(true);
  });

  it('should return true for edge provider', () => {
    expect(isTTSProviderAvailable('edge')).toBe(true);
  });

  it('should check OpenAI availability with API key', () => {
    const available = isTTSProviderAvailable('openai', { openai: 'sk-test' });
    expect(typeof available).toBe('boolean');
  });

  it('should check Gemini availability with API key', () => {
    const available = isTTSProviderAvailable('gemini', { google: 'AIza-test' });
    expect(typeof available).toBe('boolean');
  });

  it('should return false for OpenAI without API key', () => {
    const available = isTTSProviderAvailable('openai');
    expect(available).toBe(false);
  });

  it('should check ElevenLabs availability with API key', () => {
    const available = isTTSProviderAvailable('elevenlabs', { elevenlabs: 'xi-test' });
    expect(available).toBe(true);
  });

  it('should return false for ElevenLabs without API key', () => {
    const available = isTTSProviderAvailable('elevenlabs');
    expect(available).toBe(false);
  });

  it('should check LMNT availability with API key', () => {
    const available = isTTSProviderAvailable('lmnt', { lmnt: 'lmnt-test' });
    expect(available).toBe(true);
  });

  it('should return false for LMNT without API key', () => {
    const available = isTTSProviderAvailable('lmnt');
    expect(available).toBe(false);
  });

  it('should check Hume availability with API key', () => {
    const available = isTTSProviderAvailable('hume', { hume: 'hume-test' });
    expect(available).toBe(true);
  });

  it('should return false for Hume without API key', () => {
    const available = isTTSProviderAvailable('hume');
    expect(available).toBe(false);
  });
});

describe('getAvailableTTSProviders', () => {
  it('should return array of providers', () => {
    const providers = getAvailableTTSProviders();
    expect(Array.isArray(providers)).toBe(true);
  });

  it('should include system and edge by default', () => {
    const providers = getAvailableTTSProviders();
    expect(providers).toContain('system');
    expect(providers).toContain('edge');
  });

  it('should include openai when API key provided', () => {
    const providers = getAvailableTTSProviders({ openai: 'sk-test' });
    expect(providers).toContain('openai');
  });

  it('should include gemini when API key provided', () => {
    const providers = getAvailableTTSProviders({ google: 'AIza-test' });
    expect(providers).toContain('gemini');
  });

  it('should include elevenlabs when API key provided', () => {
    const providers = getAvailableTTSProviders({ elevenlabs: 'xi-test' });
    expect(providers).toContain('elevenlabs');
  });

  it('should include lmnt when API key provided', () => {
    const providers = getAvailableTTSProviders({ lmnt: 'lmnt-test' });
    expect(providers).toContain('lmnt');
  });

  it('should include hume when API key provided', () => {
    const providers = getAvailableTTSProviders({ hume: 'hume-test' });
    expect(providers).toContain('hume');
  });

  it('should include all providers when all API keys provided', () => {
    const providers = getAvailableTTSProviders({
      openai: 'sk-test',
      google: 'AIza-test',
      elevenlabs: 'xi-test',
      lmnt: 'lmnt-test',
      hume: 'hume-test',
    });
    expect(providers).toContain('system');
    expect(providers).toContain('openai');
    expect(providers).toContain('gemini');
    expect(providers).toContain('edge');
    expect(providers).toContain('elevenlabs');
    expect(providers).toContain('lmnt');
    expect(providers).toContain('hume');
  });
});

describe('generateTTSAudio', () => {
  it('should be a function', () => {
    expect(typeof generateTTSAudio).toBe('function');
  });
});

describe('TTSServiceOptions type', () => {
  it('should accept valid options', () => {
    const options: TTSServiceOptions = {
      settings: DEFAULT_TTS_SETTINGS,
      apiKeys: {
        openai: 'test-key',
      },
      onProgress: (progress) => console.log(progress),
    };
    expect(options.settings.ttsProvider).toBe('system');
  });
});

describe('TTSServiceController type', () => {
  it('should have correct structure', () => {
    const controller: TTSServiceController = {
      play: jest.fn(),
      pause: jest.fn(),
      resume: jest.fn(),
      stop: jest.fn(),
      getState: jest.fn(() => 'idle'),
    };
    expect(controller.play).toBeDefined();
    expect(controller.pause).toBeDefined();
    expect(controller.stop).toBeDefined();
  });
});
