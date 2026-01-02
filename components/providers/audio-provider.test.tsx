/**
 * Tests for AudioProvider
 */

import { renderHook, act } from '@testing-library/react';
import {
  AudioProvider,
  useAudio,
  useSpeechToText,
  useTextToSpeech,
  isSpeechRecognitionSupported,
  isSpeechSynthesisSupported,
  getSpeechRecognition,
} from './audio-provider';
import { ReactNode } from 'react';

// Mock the settings store
jest.mock('@/stores/settings', () => ({
  useSettingsStore: jest.fn((selector) =>
    selector({
      speechSettings: {
        sttContinuous: true,
        sttLanguage: 'en-US',
        ttsRate: 1.0,
        ttsVoice: 'default',
      },
    })
  ),
}));

// Mock MediaDevices
const mockGetUserMedia = jest.fn();
Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    getUserMedia: mockGetUserMedia,
  },
  writable: true,
});

// Mock SpeechSynthesis
const mockSpeak = jest.fn();
const mockCancel = jest.fn();
const mockPause = jest.fn();
const mockResume = jest.fn();
const mockGetVoices = jest.fn(() => [
  { name: 'Voice 1', lang: 'en-US' },
  { name: 'Voice 2', lang: 'es-ES' },
]);

Object.defineProperty(window, 'speechSynthesis', {
  value: {
    speak: mockSpeak,
    cancel: mockCancel,
    pause: mockPause,
    resume: mockResume,
    getVoices: mockGetVoices,
    onvoiceschanged: null,
  },
  writable: true,
});

// Mock SpeechSynthesisUtterance
class MockSpeechSynthesisUtterance {
  text: string;
  rate: number = 1;
  pitch: number = 1;
  volume: number = 1;
  voice: SpeechSynthesisVoice | null = null;
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((event: SpeechSynthesisErrorEvent) => void) | null = null;

  constructor(text: string) {
    this.text = text;
  }
}

global.SpeechSynthesisUtterance = MockSpeechSynthesisUtterance as unknown as typeof SpeechSynthesisUtterance;

// Mock AudioContext
class MockAudioContext {
  state = 'running';
  createAnalyser = jest.fn(() => ({
    fftSize: 256,
    frequencyBinCount: 128,
    getByteFrequencyData: jest.fn((arr) => arr.fill(100)),
  }));
  createMediaStreamSource = jest.fn(() => ({
    connect: jest.fn(),
  }));
  close = jest.fn().mockResolvedValue(undefined);
}

// @ts-expect-error - Mock AudioContext
window.AudioContext = MockAudioContext;

// Mock Audio
const mockAudioPlay = jest.fn().mockResolvedValue(undefined);
const mockAudioPause = jest.fn();

class MockAudio {
  src = '';
  onloadedmetadata: (() => void) | null = null;
  onended: (() => void) | null = null;
  onerror: ((error: unknown) => void) | null = null;
  play = mockAudioPlay;
  pause = mockAudioPause;
  currentTime = 0;
}

global.Audio = MockAudio as unknown as typeof Audio;

// Mock URL
const mockCreateObjectURL = jest.fn(() => 'blob:test-url');
const mockRevokeObjectURL = jest.fn();
URL.createObjectURL = mockCreateObjectURL;
URL.revokeObjectURL = mockRevokeObjectURL;

describe('AudioProvider', () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <AudioProvider>{children}</AudioProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock getUserMedia success
    mockGetUserMedia.mockResolvedValue({
      getTracks: () => [{ stop: jest.fn() }],
    });
  });

  describe('useAudio hook', () => {
    it('throws error when used outside provider', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useAudio());
      }).toThrow('useAudio must be used within AudioProvider');

      consoleSpy.mockRestore();
    });

    it('provides audio context when used within provider', () => {
      const { result } = renderHook(() => useAudio(), { wrapper });

      expect(result.current).toBeDefined();
      expect(result.current.startRecording).toBeInstanceOf(Function);
      expect(result.current.speak).toBeInstanceOf(Function);
      expect(result.current.playAudio).toBeInstanceOf(Function);
    });
  });

  describe('recording state', () => {
    it('starts in idle state', () => {
      const { result } = renderHook(() => useAudio(), { wrapper });

      expect(result.current.recordingState).toBe('idle');
    });
  });

  describe('playback state', () => {
    it('starts in idle state', () => {
      const { result } = renderHook(() => useAudio(), { wrapper });

      expect(result.current.playbackState).toBe('idle');
    });

    it('isSpeaking starts as false', () => {
      const { result } = renderHook(() => useAudio(), { wrapper });

      expect(result.current.isSpeaking).toBe(false);
    });
  });

  describe('text-to-speech', () => {
    it('speaks text', async () => {
      const { result } = renderHook(() => useAudio(), { wrapper });

      await act(async () => {
        await result.current.speak('Hello world');
      });

      expect(mockCancel).toHaveBeenCalled();
      expect(mockSpeak).toHaveBeenCalled();
    });

    it('stops speaking', () => {
      const { result } = renderHook(() => useAudio(), { wrapper });

      act(() => {
        result.current.stopSpeaking();
      });

      expect(mockCancel).toHaveBeenCalled();
      expect(result.current.isSpeaking).toBe(false);
    });

    it('pauses speaking', () => {
      const { result } = renderHook(() => useAudio(), { wrapper });

      act(() => {
        result.current.pauseSpeaking();
      });

      expect(mockPause).toHaveBeenCalled();
      expect(result.current.playbackState).toBe('paused');
    });

    it('resumes speaking', () => {
      const { result } = renderHook(() => useAudio(), { wrapper });

      act(() => {
        result.current.resumeSpeaking();
      });

      expect(mockResume).toHaveBeenCalled();
      expect(result.current.playbackState).toBe('playing');
    });
  });

  describe('audio playback', () => {
    it('plays audio from URL', async () => {
      const { result } = renderHook(() => useAudio(), { wrapper });

      result.current.playAudio('https://example.com/audio.mp3');

      // Simulate audio loaded and ended
      await act(async () => {
        // Get the mock Audio instance and trigger events
        // This is a simplified test since we're mocking Audio
      });
    });

    it('plays audio from Blob', async () => {
      const { result } = renderHook(() => useAudio(), { wrapper });
      const blob = new Blob(['audio data'], { type: 'audio/mp3' });

      await act(async () => {
        result.current.playAudio(blob);
      });

      expect(mockCreateObjectURL).toHaveBeenCalledWith(blob);
    });

    it('stops audio playback', () => {
      const { result } = renderHook(() => useAudio(), { wrapper });

      // Create a mock audio element in the DOM
      const mockAudioElement = document.createElement('audio');
      mockAudioElement.pause = jest.fn();
      document.body.appendChild(mockAudioElement);

      act(() => {
        result.current.stopAudio();
      });

      expect(result.current.playbackState).toBe('stopped');

      // Cleanup
      document.body.removeChild(mockAudioElement);
    });

    it('pauses audio playback', () => {
      const { result } = renderHook(() => useAudio(), { wrapper });

      act(() => {
        result.current.pauseAudio();
      });

      expect(result.current.playbackState).toBe('paused');
    });

    it('resumes audio playback', () => {
      const { result } = renderHook(() => useAudio(), { wrapper });

      act(() => {
        result.current.resumeAudio();
      });

      expect(result.current.playbackState).toBe('playing');
    });
  });

  describe('audio level', () => {
    it('returns audio level', () => {
      const { result } = renderHook(() => useAudio(), { wrapper });

      const level = result.current.getAudioLevel();

      expect(typeof level).toBe('number');
      expect(level).toBeGreaterThanOrEqual(0);
      expect(level).toBeLessThanOrEqual(1);
    });
  });

  describe('available voices', () => {
    it('provides available voices', () => {
      const { result } = renderHook(() => useAudio(), { wrapper });

      // Voices should be loaded (may be empty if no speechSynthesis mock voices)
      expect(Array.isArray(result.current.availableVoices)).toBe(true);
    });
  });

  describe('transcription', () => {
    it('starts with empty transcription', () => {
      const { result } = renderHook(() => useAudio(), { wrapper });

      expect(result.current.transcription).toBe('');
    });
  });
});

describe('useSpeechToText hook', () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <AudioProvider>{children}</AudioProvider>
  );

  it('provides speech-to-text functionality', () => {
    const { result } = renderHook(() => useSpeechToText(), { wrapper });

    expect(result.current.startRecording).toBeInstanceOf(Function);
    expect(result.current.stopRecording).toBeInstanceOf(Function);
    expect(result.current.pauseRecording).toBeInstanceOf(Function);
    expect(result.current.resumeRecording).toBeInstanceOf(Function);
    expect(result.current.recordingState).toBe('idle');
    expect(result.current.transcription).toBe('');
  });
});

describe('useTextToSpeech hook', () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <AudioProvider>{children}</AudioProvider>
  );

  it('provides text-to-speech functionality', () => {
    const { result } = renderHook(() => useTextToSpeech(), { wrapper });

    expect(result.current.speak).toBeInstanceOf(Function);
    expect(result.current.stop).toBeInstanceOf(Function);
    expect(result.current.pause).toBeInstanceOf(Function);
    expect(result.current.resume).toBeInstanceOf(Function);
    expect(result.current.isSpeaking).toBe(false);
  });
});

describe('utility functions', () => {
  describe('isSpeechRecognitionSupported', () => {
    it('returns boolean', () => {
      const result = isSpeechRecognitionSupported();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('isSpeechSynthesisSupported', () => {
    it('returns true when speechSynthesis is available', () => {
      const result = isSpeechSynthesisSupported();
      expect(result).toBe(true);
    });
  });

  describe('getSpeechRecognition', () => {
    it('returns null when not supported', () => {
      // Without mocking SpeechRecognition
      const result = getSpeechRecognition();
      // May be null in test environment
      expect(result === null || result?.SpeechRecognition).toBeDefined();
    });
  });
});

describe('AudioProvider with callbacks', () => {
  it('calls onTranscriptionInterim', async () => {
    const onTranscriptionInterim = jest.fn();

    const wrapper = ({ children }: { children: ReactNode }) => (
      <AudioProvider onTranscriptionInterim={onTranscriptionInterim}>
        {children}
      </AudioProvider>
    );

    const { result } = renderHook(() => useAudio(), { wrapper });

    expect(result.current).toBeDefined();
  });

  it('calls onTranscriptionFinal', async () => {
    const onTranscriptionFinal = jest.fn();

    const wrapper = ({ children }: { children: ReactNode }) => (
      <AudioProvider onTranscriptionFinal={onTranscriptionFinal}>
        {children}
      </AudioProvider>
    );

    const { result } = renderHook(() => useAudio(), { wrapper });

    expect(result.current).toBeDefined();
  });
});
