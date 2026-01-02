'use client';

/**
 * useTTS - Hook for multi-provider text-to-speech functionality
 * 
 * Features:
 * - Multiple TTS providers (System, OpenAI, Gemini, Edge)
 * - Settings store integration
 * - Audio playback management
 * - Progress tracking
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useSettingsStore } from '@/stores';
import type { TTSProvider } from '@/types/speech';
import { toast } from '@/components/ui/sonner';

export type TTSPlaybackState = 'idle' | 'loading' | 'playing' | 'paused' | 'stopped' | 'error';

export interface UseTTSOptions {
  // Use settings from store (default: true)
  useSettings?: boolean;
  // Override provider
  provider?: TTSProvider;
  // Callbacks
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
  onProgress?: (progress: number) => void;
}

export interface UseTTSReturn {
  // State
  isLoading: boolean;
  isPlaying: boolean;
  isPaused: boolean;
  playbackState: TTSPlaybackState;
  progress: number;
  error: string | null;
  
  // Actions
  speak: (text: string, overrideProvider?: TTSProvider) => Promise<void>;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  
  // Info
  currentProvider: TTSProvider;
  isSupported: boolean;
}

export function useTTS(options: UseTTSOptions = {}): UseTTSReturn {
  const { useSettings = true, onStart, onEnd, onError, onProgress } = options;

  // Get settings from store
  const speechSettings = useSettingsStore((state) => state.speechSettings);
  const providerSettings = useSettingsStore((state) => state.providerSettings);

  // Merge provider from options or settings
  const currentProvider = options.provider ?? (useSettings ? speechSettings.ttsProvider : 'system');

  // State
  const [playbackState, setPlaybackState] = useState<TTSPlaybackState>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Refs for audio management
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Check if TTS is supported
  const isSupported = typeof window !== 'undefined' && (
    'speechSynthesis' in window || // System TTS
    !!providerSettings.openai?.apiKey || // OpenAI
    !!providerSettings.google?.apiKey || // Gemini
    true // Edge TTS is always available
  );

  // Cleanup function
  const cleanup = useCallback(() => {
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // Stop playback
  const stop = useCallback(() => {
    // Stop system TTS
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    cleanup();
    setPlaybackState('stopped');
    setProgress(0);
  }, [cleanup]);

  // Pause playback
  const pause = useCallback(() => {
    if (playbackState !== 'playing') return;

    if (currentProvider === 'system' && typeof window !== 'undefined') {
      window.speechSynthesis.pause();
    } else if (audioRef.current) {
      audioRef.current.pause();
    }
    setPlaybackState('paused');
  }, [playbackState, currentProvider]);

  // Resume playback
  const resume = useCallback(() => {
    if (playbackState !== 'paused') return;

    if (currentProvider === 'system' && typeof window !== 'undefined') {
      window.speechSynthesis.resume();
    } else if (audioRef.current) {
      audioRef.current.play().catch(() => {});
    }
    setPlaybackState('playing');
  }, [playbackState, currentProvider]);

  // Speak with System TTS (browser)
  const speakWithSystem = useCallback((text: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        reject(new Error('System TTS is not supported'));
        return;
      }

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);

      // Apply settings
      if (speechSettings.ttsVoice) {
        const voices = window.speechSynthesis.getVoices();
        const voice = voices.find(v => v.name === speechSettings.ttsVoice);
        if (voice) utterance.voice = voice;
      }

      utterance.rate = speechSettings.ttsRate;
      utterance.pitch = speechSettings.ttsPitch;
      utterance.volume = speechSettings.ttsVolume;

      utterance.onstart = () => {
        setPlaybackState('playing');
        onStart?.();
      };

      utterance.onend = () => {
        setPlaybackState('stopped');
        onEnd?.();
        resolve();
      };

      utterance.onerror = (event) => {
        if (event.error === 'canceled' || event.error === 'interrupted') {
          setPlaybackState('stopped');
          resolve();
        } else {
          setPlaybackState('error');
          const errorMsg = `Speech synthesis error: ${event.error}`;
          setError(errorMsg);
          onError?.(errorMsg);
          reject(new Error(errorMsg));
        }
      };

      utterance.onpause = () => setPlaybackState('paused');
      utterance.onresume = () => setPlaybackState('playing');

      window.speechSynthesis.speak(utterance);
    });
  }, [speechSettings, onStart, onEnd, onError]);

  // Speak with API-based TTS (OpenAI, Gemini, Edge)
  const speakWithAPI = useCallback(async (text: string, provider: TTSProvider): Promise<void> => {
    cleanup();
    
    abortControllerRef.current = new AbortController();
    
    try {
      let apiUrl: string;
      let body: Record<string, unknown>;

      switch (provider) {
        case 'openai':
          apiUrl = '/api/tts/openai';
          body = {
            text,
            voice: speechSettings.openaiTtsVoice,
            model: speechSettings.openaiTtsModel,
            speed: speechSettings.openaiTtsSpeed,
          };
          break;
        
        case 'gemini':
          apiUrl = '/api/tts/gemini';
          body = {
            text,
            voice: speechSettings.geminiTtsVoice,
          };
          break;
        
        case 'edge':
          apiUrl = '/api/tts/edge';
          body = {
            text,
            voice: speechSettings.edgeTtsVoice,
            rate: speechSettings.edgeTtsRate,
            pitch: speechSettings.edgeTtsPitch,
          };
          break;
        
        default:
          throw new Error(`Unknown TTS provider: ${provider}`);
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `TTS API error: ${response.status}`);
      }

      const audioBlob = await response.blob();
      audioUrlRef.current = URL.createObjectURL(audioBlob);

      // Create and configure audio element
      audioRef.current = new Audio(audioUrlRef.current);
      audioRef.current.volume = speechSettings.ttsVolume;

      // Set up event handlers
      await new Promise<void>((resolve, reject) => {
        if (!audioRef.current) {
          reject(new Error('Audio element not created'));
          return;
        }

        audioRef.current.onplay = () => {
          setPlaybackState('playing');
          onStart?.();
        };

        audioRef.current.onended = () => {
          setPlaybackState('stopped');
          setProgress(0);
          onEnd?.();
          cleanup();
          resolve();
        };

        audioRef.current.onerror = () => {
          setPlaybackState('error');
          const errorMsg = 'Audio playback error';
          setError(errorMsg);
          onError?.(errorMsg);
          cleanup();
          reject(new Error(errorMsg));
        };

        audioRef.current.ontimeupdate = () => {
          if (audioRef.current && audioRef.current.duration) {
            const currentProgress = audioRef.current.currentTime / audioRef.current.duration;
            setProgress(currentProgress);
            onProgress?.(currentProgress);
          }
        };

        audioRef.current.onpause = () => {
          if (audioRef.current && audioRef.current.currentTime < audioRef.current.duration) {
            setPlaybackState('paused');
          }
        };

        // Start playback
        audioRef.current.play().catch(reject);
      });

    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setPlaybackState('stopped');
        return;
      }
      throw err;
    }
  }, [speechSettings, cleanup, onStart, onEnd, onError, onProgress]);

  // Main speak function
  const speak = useCallback(async (text: string, overrideProvider?: TTSProvider): Promise<void> => {
    const provider = overrideProvider ?? currentProvider;
    
    // Stop any current playback
    stop();
    
    setPlaybackState('loading');
    setError(null);
    setProgress(0);

    try {
      if (provider === 'system') {
        await speakWithSystem(text);
      } else {
        await speakWithAPI(text, provider);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to generate speech';
      setError(errorMsg);
      setPlaybackState('error');
      toast.error(errorMsg);
      throw err;
    }
  }, [currentProvider, stop, speakWithSystem, speakWithAPI]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [cleanup]);

  return {
    // State
    isLoading: playbackState === 'loading',
    isPlaying: playbackState === 'playing',
    isPaused: playbackState === 'paused',
    playbackState,
    progress,
    error,
    
    // Actions
    speak,
    stop,
    pause,
    resume,
    
    // Info
    currentProvider,
    isSupported,
  };
}

export default useTTS;
