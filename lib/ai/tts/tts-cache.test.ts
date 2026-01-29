/**
 * Tests for TTS Cache
 */

import { generateCacheKey } from './tts-cache';

// Mock IndexedDB
const mockIDBDatabase = {
  transaction: jest.fn(() => ({
    objectStore: jest.fn(() => ({
      get: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn(),
      getAll: jest.fn(),
      index: jest.fn(() => ({
        openCursor: jest.fn(),
      })),
    })),
  })),
  objectStoreNames: {
    contains: jest.fn(() => false),
  },
  createObjectStore: jest.fn(() => ({
    createIndex: jest.fn(),
  })),
};

const mockIDBRequest = {
  result: mockIDBDatabase,
  onerror: null as ((this: IDBRequest, ev: Event) => void) | null,
  onsuccess: null as ((this: IDBRequest, ev: Event) => void) | null,
  onupgradeneeded: null as ((this: IDBOpenDBRequest, ev: IDBVersionChangeEvent) => void) | null,
};

// Mock indexedDB
Object.defineProperty(global, 'indexedDB', {
  value: {
    open: jest.fn(() => mockIDBRequest),
  },
  writable: true,
});

describe('TTS Cache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateCacheKey', () => {
    it('should generate consistent keys for same input', () => {
      const key1 = generateCacheKey('Hello world', 'openai', { openaiVoice: 'alloy' });
      const key2 = generateCacheKey('Hello world', 'openai', { openaiVoice: 'alloy' });
      expect(key1).toBe(key2);
    });

    it('should generate different keys for different text', () => {
      const key1 = generateCacheKey('Hello', 'openai', { openaiVoice: 'alloy' });
      const key2 = generateCacheKey('World', 'openai', { openaiVoice: 'alloy' });
      expect(key1).not.toBe(key2);
    });

    it('should generate different keys for different providers', () => {
      const key1 = generateCacheKey('Hello', 'openai', {});
      const key2 = generateCacheKey('Hello', 'edge', {});
      expect(key1).not.toBe(key2);
    });

    it('should generate different keys for different voices', () => {
      const key1 = generateCacheKey('Hello', 'openai', { openaiVoice: 'alloy' });
      const key2 = generateCacheKey('Hello', 'openai', { openaiVoice: 'nova' });
      expect(key1).not.toBe(key2);
    });

    it('should include provider-specific settings in key', () => {
      // OpenAI settings
      const openaiKey = generateCacheKey('Hello', 'openai', {
        openaiVoice: 'alloy',
        openaiModel: 'tts-1',
        openaiSpeed: 1.0,
      });
      expect(openaiKey).toMatch(/^tts_/);

      // ElevenLabs settings
      const elevenLabsKey = generateCacheKey('Hello', 'elevenlabs', {
        elevenlabsVoice: 'rachel',
        elevenlabsModel: 'eleven_multilingual_v2',
        elevenlabsStability: 0.5,
        elevenlabsSimilarityBoost: 0.75,
      });
      expect(elevenLabsKey).toMatch(/^tts_/);

      // LMNT settings
      const lmntKey = generateCacheKey('Hello', 'lmnt', {
        lmntVoice: 'lily',
        lmntSpeed: 1.0,
      });
      expect(lmntKey).toMatch(/^tts_/);

      // Hume settings
      const humeKey = generateCacheKey('Hello', 'hume', {
        humeVoice: 'kora',
      });
      expect(humeKey).toMatch(/^tts_/);
    });

    it('should handle Edge TTS settings', () => {
      const key = generateCacheKey('Hello', 'edge', {
        edgeVoice: 'en-US-JennyNeural',
        edgeRate: '+10%',
        edgePitch: '+0Hz',
      });
      expect(key).toMatch(/^tts_/);
    });

    it('should handle Gemini settings', () => {
      const key = generateCacheKey('Hello', 'gemini', {
        geminiVoice: 'Kore',
      });
      expect(key).toMatch(/^tts_/);
    });

    it('should generate valid key format', () => {
      const key = generateCacheKey('Test text', 'openai', {});
      expect(key).toMatch(/^tts_[a-z0-9]+$/);
    });
  });

  describe('TTSCacheEntry structure', () => {
    it('should define correct entry structure', () => {
      const entry = {
        key: 'tts_abc123',
        audioBlob: new Blob(['audio'], { type: 'audio/mpeg' }),
        mimeType: 'audio/mpeg',
        createdAt: Date.now(),
        expiresAt: Date.now() + 86400000,
        provider: 'openai' as const,
        text: 'Hello world',
        size: 1024,
      };

      expect(entry.key).toBeDefined();
      expect(entry.audioBlob).toBeInstanceOf(Blob);
      expect(entry.mimeType).toBe('audio/mpeg');
      expect(entry.provider).toBe('openai');
    });
  });
});
