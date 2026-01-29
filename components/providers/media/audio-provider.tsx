'use client';

/**
 * AudioProvider - Manages audio playback and recording for voice features
 * Provides text-to-speech, speech-to-text, and audio management capabilities
 */

import { createContext, useContext, useCallback, useEffect, ReactNode, useRef, useState, useMemo } from 'react';
import { useSettingsStore } from '@/stores/settings';
import type {
  RecordingState,
  PlaybackState,
  RecordingOptions,
  ISpeechRecognition,
  ISpeechRecognitionErrorEvent,
  ISpeechRecognitionEvent,
  ISpeechRecognitionResult,
} from '@/types';

// Re-export all audio types for backward compatibility
export type {
  RecordingState,
  PlaybackState,
  SpeechRecognitionResult,
  RecordingOptions,
  ISpeechRecognition,
  ISpeechRecognitionErrorEvent,
  ISpeechRecognitionEvent,
  ISpeechRecognitionResult,
  ISpeechRecognitionAlternative,
  SpeechRecognitionResultList,
} from '@/types';

// Type guard for Speech Recognition support
export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
}

// Get Speech Recognition constructor
export function getSpeechRecognition(): {
  SpeechRecognition: { new (): ISpeechRecognition };
} | null {
  if (!isSpeechRecognitionSupported()) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const SpeechRecognition = (window as any).SpeechRecognition ||
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            (window as any).webkitSpeechRecognition;

  return { SpeechRecognition };
}

// Type guard for Speech Synthesis support
export function isSpeechSynthesisSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'speechSynthesis' in window;
}

// Audio context value
interface AudioContextValue {
  // Speech-to-Text (STT)
  startRecording: (options?: RecordingOptions) => Promise<void>;
  stopRecording: () => Promise<string>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  recordingState: RecordingState;
  transcription: string;
  isSpeechRecognitionSupported: boolean;

  // Text-to-Speech (TTS)
  speak: (text: string, voice?: string) => Promise<void>;
  stopSpeaking: () => void;
  pauseSpeaking: () => void;
  resumeSpeaking: () => void;
  playbackState: PlaybackState;
  isSpeaking: boolean;
  availableVoices: SpeechSynthesisVoice[];

  // Audio playback
  playAudio: (url: string | Blob) => Promise<void>;
  stopAudio: () => void;
  pauseAudio: () => void;
  resumeAudio: () => void;

  // Utilities
  getAudioLevel: () => number;
  isAudioSupported: boolean;
}

// Create context (named AudioProviderContext to avoid conflict with Web Audio API AudioContext)
const AudioProviderContext = createContext<AudioContextValue | undefined>(undefined);

interface AudioProviderProps {
  children: ReactNode;
  /** Custom speech recognition implementation */
  customSpeechRecognition?: { new (): ISpeechRecognition };
  /** Custom speech synthesis implementation */
  customSpeechSynthesis?: typeof window.speechSynthesis;
  /** Callback when interim transcription is available */
  onTranscriptionInterim?: (text: string) => void;
  /** Callback when final transcription is available */
  onTranscriptionFinal?: (text: string) => void;
}

/**
 * Audio Provider Component
 */
export function AudioProvider({
  children,
  customSpeechRecognition,
  customSpeechSynthesis: _customSpeechSynthesis,
  onTranscriptionInterim,
  onTranscriptionFinal,
}: AudioProviderProps) {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [transcription, setTranscription] = useState('');
  const [playbackState, setPlaybackState] = useState<PlaybackState>('idle');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const objectUrlsRef = useRef<Set<string>>(new Set());
  const transcriptionRef = useRef<string>('');
  const isPausedRef = useRef<boolean>(false);

  const speechSettings = useSettingsStore((s) => s.speechSettings);

  // Get Speech Recognition class (memoized)
  const SpeechRecognitionClass = useMemo(() => {
    if (customSpeechRecognition) {
      return customSpeechRecognition;
    }
    const result = getSpeechRecognition();
    return result?.SpeechRecognition;
  }, [customSpeechRecognition]);

  // Initialize speech recognition
  useEffect(() => {
    if (!SpeechRecognitionClass) return;

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = speechSettings.sttContinuous;
    recognition.interimResults = true;
    recognition.lang = speechSettings.sttLanguage;

    recognition.onresult = (event: ISpeechRecognitionEvent) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i] as ISpeechRecognitionResult;
        const alternative = result.item(0);
        const transcript = alternative.transcript;

        if (result.isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        setTranscription((prev) => {
          const newValue = prev + finalTranscript;
          transcriptionRef.current = newValue;
          return newValue;
        });

        // Emit final transcription
        onTranscriptionFinal?.(finalTranscript.trim());
      }

      // Emit interim results
      if (interimTranscript) {
        onTranscriptionInterim?.(interimTranscript);
      }
    };

    recognition.onerror = (event: ISpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      setRecordingState('idle');
    };

    recognition.onend = () => {
      if (recordingState === 'recording') {
        // Restart if still supposed to be recording (continuous mode)
        try {
          recognition.start();
        } catch (_error) {
          setRecordingState('stopped');
        }
      } else {
        setRecordingState('stopped');
      }
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.abort();
      } catch {
        // Ignore errors during cleanup
      }
    };
  }, [SpeechRecognitionClass, speechSettings.sttContinuous, speechSettings.sttLanguage, recordingState, onTranscriptionInterim, onTranscriptionFinal]);

  // Initialize speech synthesis voices
  useEffect(() => {
    if (!isSpeechSynthesisSupported()) return;

    const loadVoices = () => {
      const voices = speechSynthesis.getVoices();
      setAvailableVoices(voices);
    };

    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // Initialize audio context for level monitoring
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        audioContextRef.current = new AudioContext();
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
      }
    } catch (error) {
      console.error('Failed to initialize AudioContext:', error);
    }

    const objectUrls = objectUrlsRef.current;
    return () => {
      // Cleanup: revoke all object URLs
      objectUrls.forEach(url => URL.revokeObjectURL(url));
      objectUrls.clear();

      // Close audio context
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {
          // Ignore errors during cleanup
        });
      }
    };
  }, []);

  // Speech-to-Text functions
  const startRecording = useCallback(async (_options?: RecordingOptions) => {
    if (!SpeechRecognitionClass) {
      throw new Error('Speech recognition is not supported in this browser');
    }

    try {
      // Get microphone access for audio level monitoring
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      if (audioContextRef.current && analyserRef.current) {
        const source = audioContextRef.current.createMediaStreamSource(stream);
        source.connect(analyserRef.current);
      }

      // Start speech recognition
      if (recognitionRef.current) {
        recognitionRef.current.start();
        setRecordingState('recording');
        setTranscription(''); // Clear previous transcription
        transcriptionRef.current = ''; // Also reset ref
      }
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw error;
    }
  }, [SpeechRecognitionClass]);

  const stopRecording = useCallback(async (): Promise<string> => {
    if (!recognitionRef.current) return '';

    return new Promise((resolve) => {
      // Use ref to get the latest transcription value (avoids stale closure)
      const finalTranscript = transcriptionRef.current;

      try {
        recognitionRef.current?.stop();
      } catch {
        // Ignore errors
      }

      // Stop media stream
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }

      isPausedRef.current = false;
      setRecordingState('stopped');
      resolve(finalTranscript.trim());
    });
  }, []);

  const pauseRecording = useCallback(() => {
    try {
      // Use stop() instead of abort() to preserve transcription and allow resume
      recognitionRef.current?.stop();
      isPausedRef.current = true;
      setRecordingState('paused');
    } catch {
      // Ignore errors
    }
  }, []);

  const resumeRecording = useCallback(() => {
    try {
      if (recognitionRef.current && isPausedRef.current) {
        recognitionRef.current.start();
        isPausedRef.current = false;
        setRecordingState('recording');
      }
    } catch {
      // Ignore errors
    }
  }, []);

  // Text-to-Speech functions
  const speak = useCallback(async (text: string, voice?: string) => {
    if (!isSpeechSynthesisSupported()) {
      throw new Error('Speech synthesis is not supported in this browser');
    }

    // Cancel any ongoing speech
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    currentUtteranceRef.current = utterance;

    // Configure utterance
    utterance.rate = speechSettings.ttsRate;
    utterance.pitch = 1;
    utterance.volume = 1;

    // Set voice
    if (voice) {
      const selectedVoice = availableVoices.find((v) => v.name === voice);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
    } else if (speechSettings.ttsVoice) {
      const selectedVoice = availableVoices.find((v) => v.name === speechSettings.ttsVoice);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
      setPlaybackState('playing');
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setPlaybackState('stopped');
      currentUtteranceRef.current = null;
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      setIsSpeaking(false);
      setPlaybackState('stopped');
      currentUtteranceRef.current = null;
    };

    speechSynthesis.speak(utterance);
  }, [availableVoices, speechSettings.ttsRate, speechSettings.ttsVoice]);

  const stopSpeaking = useCallback(() => {
    speechSynthesis.cancel();
    setIsSpeaking(false);
    setPlaybackState('stopped');
    currentUtteranceRef.current = null;
  }, []);

  const pauseSpeaking = useCallback(() => {
    speechSynthesis.pause();
    setPlaybackState('paused');
  }, []);

  const resumeSpeaking = useCallback(() => {
    speechSynthesis.resume();
    setPlaybackState('playing');
  }, []);

  // Audio playback functions - with memory leak fix
  const playAudio = useCallback(async (url: string | Blob): Promise<void> => {
    // Cleanup previous object URLs to prevent memory leaks
    objectUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    objectUrlsRef.current.clear();

    const audio = new Audio();
    let objectUrl: string | null = null;

    return new Promise((resolve, reject) => {
      audio.onloadedmetadata = () => {
        audio.play();
        setPlaybackState('playing');
      };

      audio.onended = () => {
        // Revoke object URL if we created one (prevent memory leak)
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
          objectUrlsRef.current.delete(objectUrl);
        }
        setPlaybackState('stopped');
        resolve();
      };

      audio.onerror = (error) => {
        // Revoke on error too (prevent memory leak)
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
          objectUrlsRef.current.delete(objectUrl);
        }
        setPlaybackState('stopped');
        reject(error);
      };

      if (typeof url === 'string') {
        audio.src = url;
      } else {
        // Create object URL and track it for cleanup
        objectUrl = URL.createObjectURL(url);
        objectUrlsRef.current.add(objectUrl);
        audio.src = objectUrl;
      }
    });
  }, []);

  const stopAudio = useCallback(() => {
    // Stop any audio elements
    const audioElements = document.querySelectorAll('audio');
    audioElements.forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
    });
    setPlaybackState('stopped');
  }, []);

  const pauseAudio = useCallback(() => {
    const audioElements = document.querySelectorAll('audio');
    audioElements.forEach((audio) => audio.pause());
    setPlaybackState('paused');
  }, []);

  const resumeAudio = useCallback(() => {
    const audioElements = document.querySelectorAll('audio');
    audioElements.forEach((audio) => audio.play().catch(() => {
      // Ignore play() promise rejections
    }));
    setPlaybackState('playing');
  }, []);

  // Get current audio level (0-1)
  const getAudioLevel = useCallback((): number => {
    if (!analyserRef.current) return 0;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Calculate average
    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
    return average / 255;
  }, []);

  const value: AudioContextValue = {
    // STT
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    recordingState,
    transcription,
    isSpeechRecognitionSupported: isSpeechRecognitionSupported(),

    // TTS
    speak,
    stopSpeaking,
    pauseSpeaking,
    resumeSpeaking,
    playbackState,
    isSpeaking,
    availableVoices,

    // Audio playback
    playAudio,
    stopAudio,
    pauseAudio,
    resumeAudio,

    // Utilities
    getAudioLevel,
    isAudioSupported: isSpeechRecognitionSupported() || isSpeechSynthesisSupported(),
  };

  return <AudioProviderContext.Provider value={value}>{children}</AudioProviderContext.Provider>;
}

/**
 * Hook to access audio functionality
 */
export function useAudio(): AudioContextValue {
  const context = useContext(AudioProviderContext);
  if (!context) {
    throw new Error('useAudio must be used within AudioProvider');
  }
  return context;
}

/**
 * Hook for speech-to-text only
 */
export function useSpeechToText() {
  const {
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    recordingState,
    transcription,
    isSpeechRecognitionSupported,
  } = useAudio();

  return {
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    recordingState,
    transcription,
    isSupported: isSpeechRecognitionSupported,
  };
}

/**
 * Hook for text-to-speech only
 */
export function useTextToSpeech() {
  const {
    speak,
    stopSpeaking,
    pauseSpeaking,
    resumeSpeaking,
    playbackState,
    isSpeaking,
    availableVoices,
  } = useAudio();

  return {
    speak,
    stop: stopSpeaking,
    pause: pauseSpeaking,
    resume: resumeSpeaking,
    playbackState,
    isSpeaking,
    availableVoices,
  };
}

export default AudioProvider;
