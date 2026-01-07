/**
 * Tests for useTTS hook
 */

import { renderHook } from '@testing-library/react';
import { useTTS } from './use-tts';

// Mock stores
jest.mock('@/stores', () => ({
  useSettingsStore: jest.fn((selector) => {
    const state = {
      speechSettings: {
        ttsProvider: 'system',
        ttsVoice: 'default',
        ttsRate: 1,
        ttsPitch: 1,
      },
      providerSettings: {
        openai: { apiKey: 'test-key' },
        google: { apiKey: null },
      },
    };
    return selector(state);
  }),
}));

// Mock toast
jest.mock('@/components/ui/sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

// Mock speechSynthesis
const mockSpeak = jest.fn();
const mockCancel = jest.fn();
const mockPause = jest.fn();
const mockResume = jest.fn();

const mockSpeechSynthesis = {
  speak: mockSpeak,
  cancel: mockCancel,
  pause: mockPause,
  resume: mockResume,
  speaking: false,
  paused: false,
  pending: false,
  getVoices: jest.fn(() => []),
};

Object.defineProperty(window, 'speechSynthesis', {
  value: mockSpeechSynthesis,
  writable: true,
});

// Mock SpeechSynthesisUtterance
class MockSpeechSynthesisUtterance {
  text: string;
  lang: string = 'en-US';
  rate: number = 1;
  pitch: number = 1;
  volume: number = 1;
  voice: SpeechSynthesisVoice | null = null;
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((e: { error: string }) => void) | null = null;

  constructor(text: string) {
    this.text = text;
  }
}

global.SpeechSynthesisUtterance = MockSpeechSynthesisUtterance as unknown as typeof SpeechSynthesisUtterance;

describe('useTTS', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    mockSpeechSynthesis.speaking = false;
    mockSpeechSynthesis.paused = false;
  });

  describe('initialization', () => {
    it('should return initial state', () => {
      const { result } = renderHook(() => useTTS());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isPlaying).toBe(false);
      expect(result.current.isPaused).toBe(false);
      expect(result.current.playbackState).toBe('idle');
      expect(result.current.progress).toBe(0);
      expect(result.current.error).toBeNull();
    });

    it('should return action functions', () => {
      const { result } = renderHook(() => useTTS());

      expect(typeof result.current.speak).toBe('function');
      expect(typeof result.current.stop).toBe('function');
      expect(typeof result.current.pause).toBe('function');
      expect(typeof result.current.resume).toBe('function');
    });

    it('should return current provider', () => {
      const { result } = renderHook(() => useTTS());

      expect(result.current.currentProvider).toBe('system');
    });

    it('should indicate support status', () => {
      const { result } = renderHook(() => useTTS());

      expect(result.current.isSupported).toBe(true);
    });
  });

  describe('speak', () => {
    it('should have speak function available', () => {
      const { result } = renderHook(() => useTTS());

      expect(typeof result.current.speak).toBe('function');
    });

    it('should use override provider when specified', () => {
      const { result } = renderHook(() => useTTS({ provider: 'openai' }));

      expect(result.current.currentProvider).toBe('openai');
    });
  });

  describe('stop', () => {
    it('should have stop function available', () => {
      const { result } = renderHook(() => useTTS());

      expect(typeof result.current.stop).toBe('function');
    });
  });

  describe('pause and resume', () => {
    it('should have pause function available', () => {
      const { result } = renderHook(() => useTTS());

      expect(typeof result.current.pause).toBe('function');
    });

    it('should have resume function available', () => {
      const { result } = renderHook(() => useTTS());

      expect(typeof result.current.resume).toBe('function');
    });
  });

  describe('options', () => {
    it('should respect useSettings option', () => {
      const { result } = renderHook(() => useTTS({ useSettings: false, provider: 'edge' }));

      expect(result.current.currentProvider).toBe('edge');
    });
  });
});
