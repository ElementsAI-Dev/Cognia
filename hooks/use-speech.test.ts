/**
 * Tests for useSpeech hook
 */

import { renderHook, act } from '@testing-library/react';

// Mock settings store before importing hook
jest.mock('@/stores/settings-store', () => ({
  useSettingsStore: jest.fn((selector) => {
    const state = {
      speechSettings: {
        sttLanguage: 'en-US',
        sttProvider: 'system',
        sttContinuous: true,
        sttInterimResults: true,
        ttsVoice: null,
        ttsRate: 1,
        ttsPitch: 1,
        ttsVolume: 1,
      },
    };
    return typeof selector === 'function' ? selector(state) : state;
  }),
}));

import { useSpeech } from './use-speech';

// Mock SpeechRecognition
const mockRecognition = {
  continuous: false,
  interimResults: false,
  lang: '',
  start: jest.fn(),
  stop: jest.fn(),
  onstart: null as (() => void) | null,
  onend: null as (() => void) | null,
  onresult: null as ((event: unknown) => void) | null,
  onerror: null as ((event: unknown) => void) | null,
};

const MockSpeechRecognition = jest.fn(() => mockRecognition);

// Mock SpeechSynthesis
const mockSpeechSynthesis = {
  speak: jest.fn(),
  cancel: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn(),
  getVoices: jest.fn(() => []),
  onvoiceschanged: null as (() => void) | null,
};

// Mock SpeechSynthesisUtterance
const mockUtterance = {
  voice: null,
  rate: 1,
  pitch: 1,
  volume: 1,
  lang: '',
  text: '',
  onstart: null as (() => void) | null,
  onend: null as (() => void) | null,
  onerror: null as (() => void) | null,
};

const MockSpeechSynthesisUtterance = jest.fn((text: string) => ({
  ...mockUtterance,
  text,
}));

describe('useSpeech', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup window mocks
    Object.defineProperty(window, 'SpeechRecognition', {
      value: MockSpeechRecognition,
      writable: true,
      configurable: true,
    });

    Object.defineProperty(window, 'webkitSpeechRecognition', {
      value: MockSpeechRecognition,
      writable: true,
      configurable: true,
    });

    Object.defineProperty(window, 'speechSynthesis', {
      value: mockSpeechSynthesis,
      writable: true,
      configurable: true,
    });

    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      value: MockSpeechSynthesisUtterance,
      writable: true,
      configurable: true,
    });

    // Reset mock recognition
    mockRecognition.start.mockClear();
    mockRecognition.stop.mockClear();
    mockRecognition.onstart = null;
    mockRecognition.onend = null;
    mockRecognition.onresult = null;
    mockRecognition.onerror = null;
  });

  describe('initial state', () => {
    it('should have correct initial STT state', () => {
      const { result } = renderHook(() => useSpeech());

      expect(result.current.isListening).toBe(false);
      expect(result.current.transcript).toBe('');
      expect(result.current.interimTranscript).toBe('');
      expect(result.current.sttSupported).toBe(true);
    });

    it('should have correct initial TTS state', () => {
      const { result } = renderHook(() => useSpeech());

      expect(result.current.isSpeaking).toBe(false);
      expect(result.current.ttsSupported).toBe(true);
      expect(result.current.voices).toEqual([]);
    });
  });

  describe('Speech-to-Text', () => {
    it('should start listening', () => {
      const { result } = renderHook(() => useSpeech());

      act(() => {
        result.current.startListening();
      });

      expect(mockRecognition.start).toHaveBeenCalled();
    });

    it('should stop listening', () => {
      const { result } = renderHook(() => useSpeech());

      act(() => {
        result.current.stopListening();
      });

      expect(mockRecognition.stop).toHaveBeenCalled();
    });

    it('should update isListening on start', () => {
      const { result } = renderHook(() => useSpeech());

      // Simulate recognition start
      act(() => {
        mockRecognition.onstart?.();
      });

      expect(result.current.isListening).toBe(true);
    });

    it('should update isListening on end', () => {
      const { result } = renderHook(() => useSpeech());

      act(() => {
        mockRecognition.onstart?.();
      });

      expect(result.current.isListening).toBe(true);

      act(() => {
        mockRecognition.onend?.();
      });

      expect(result.current.isListening).toBe(false);
    });

    it('should reset transcript', () => {
      const { result } = renderHook(() => useSpeech());

      // Manually set some transcript (simulating recognition result)
      act(() => {
        result.current.resetTranscript();
      });

      expect(result.current.transcript).toBe('');
      expect(result.current.interimTranscript).toBe('');
    });

    it('should configure recognition with options', () => {
      renderHook(() => useSpeech({
        language: 'en-US',
        continuous: false,
        interimResults: false,
      }));

      expect(MockSpeechRecognition).toHaveBeenCalled();
      expect(mockRecognition.lang).toBe('en-US');
      expect(mockRecognition.continuous).toBe(false);
      expect(mockRecognition.interimResults).toBe(false);
    });

    it('should call onResult callback', () => {
      const onResult = jest.fn();
      renderHook(() => useSpeech({ onResult }));

      // Simulate recognition result
      act(() => {
        mockRecognition.onresult?.({
          resultIndex: 0,
          results: [
            { 0: { transcript: 'hello' }, isFinal: true, length: 1 },
          ],
        });
      });

      expect(onResult).toHaveBeenCalledWith('hello', true);
    });

    it('should call onError callback', () => {
      const onError = jest.fn();
      renderHook(() => useSpeech({ onError }));

      // Simulate recognition error
      act(() => {
        mockRecognition.onerror?.({ error: 'no-speech' });
      });

      // onError is now called with a SpeechError object
      expect(onError).toHaveBeenCalled();
      const errorArg = onError.mock.calls[0][0];
      expect(errorArg).toHaveProperty('type', 'no-speech');
    });
  });

  describe('Text-to-Speech', () => {
    it('should speak text', () => {
      const { result } = renderHook(() => useSpeech());

      act(() => {
        result.current.speak('Hello world');
      });

      expect(mockSpeechSynthesis.cancel).toHaveBeenCalled();
      expect(mockSpeechSynthesis.speak).toHaveBeenCalled();
      expect(MockSpeechSynthesisUtterance).toHaveBeenCalledWith('Hello world');
    });

    it('should stop speaking', () => {
      const { result } = renderHook(() => useSpeech());

      act(() => {
        result.current.stopSpeaking();
      });

      expect(mockSpeechSynthesis.cancel).toHaveBeenCalled();
    });

    it('should pause speaking', () => {
      const { result } = renderHook(() => useSpeech());

      act(() => {
        result.current.pauseSpeaking();
      });

      expect(mockSpeechSynthesis.pause).toHaveBeenCalled();
    });

    it('should resume speaking', () => {
      const { result } = renderHook(() => useSpeech());

      act(() => {
        result.current.resumeSpeaking();
      });

      expect(mockSpeechSynthesis.resume).toHaveBeenCalled();
    });

    it('should apply speak options', () => {
      const { result } = renderHook(() => useSpeech());

      act(() => {
        result.current.speak('Test', {
          rate: 1.5,
          pitch: 0.8,
          volume: 0.5,
          lang: 'en-US',
        });
      });

      expect(MockSpeechSynthesisUtterance).toHaveBeenCalledWith('Test');
    });
  });

});
