'use client';

/**
 * useTTS - Hook for multi-provider text-to-speech functionality
 *
 * Features:
 * - 9 TTS providers (System, OpenAI, Gemini, Edge, ElevenLabs, LMNT, Hume, Cartesia, Deepgram)
 * - Settings store integration
 * - Direct API calls (no API route dependency for static export)
 * - Audio playback management with progress tracking
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useSettingsStore } from '@/stores';
import type { TTSProvider } from '@/types/media/tts';
import type { TTSResponse } from '@/types/media/tts';
import { TTS_PROVIDERS } from '@/types/media/tts';
import { generateOpenAITTS } from '@/lib/ai/tts/providers/openai-tts';
import { generateGeminiTTS } from '@/lib/ai/tts/providers/gemini-tts';
import { generateEdgeTTS } from '@/lib/ai/tts/providers/edge-tts';
import { generateElevenLabsTTS } from '@/lib/ai/tts/providers/elevenlabs-tts';
import { generateLMNTTTS } from '@/lib/ai/tts/providers/lmnt-tts';
import { generateHumeTTS } from '@/lib/ai/tts/providers/hume-tts';
import { generateCartesiaTTS } from '@/lib/ai/tts/providers/cartesia-tts';
import { generateDeepgramTTS } from '@/lib/ai/tts/providers/deepgram-tts';
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
  const isSupported =
    typeof window !== 'undefined' &&
    ('speechSynthesis' in window || // System TTS
      !!providerSettings.openai?.apiKey || // OpenAI
      !!providerSettings.google?.apiKey || // Gemini
      true); // Edge TTS is always available

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
  const speakWithSystem = useCallback(
    (text: string): Promise<void> => {
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
          const voice = voices.find((v) => v.name === speechSettings.ttsVoice);
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
    },
    [speechSettings, onStart, onEnd, onError]
  );

  // Get API key for a provider from providerSettings
  const getApiKey = useCallback(
    (provider: TTSProvider): string => {
      const providerInfo = TTS_PROVIDERS[provider];
      if (!providerInfo.requiresApiKey) return '';
      const keyProvider = providerInfo.apiKeyProvider || provider;
      return providerSettings[keyProvider]?.apiKey || '';
    },
    [providerSettings]
  );

  // Generate TTS audio using provider functions directly
  const generateAudio = useCallback(
    async (text: string, provider: TTSProvider): Promise<TTSResponse> => {
      const apiKey = getApiKey(provider);

      switch (provider) {
        case 'openai':
          return generateOpenAITTS(text, {
            apiKey,
            voice: speechSettings.openaiTtsVoice,
            model: speechSettings.openaiTtsModel,
            speed: speechSettings.openaiTtsSpeed,
            instructions: speechSettings.openaiTtsInstructions,
          });

        case 'gemini':
          return generateGeminiTTS(text, {
            apiKey,
            voice: speechSettings.geminiTtsVoice,
          });

        case 'edge':
          return generateEdgeTTS(text, {
            voice: speechSettings.edgeTtsVoice,
            rate: speechSettings.edgeTtsRate,
            pitch: speechSettings.edgeTtsPitch,
          });

        case 'elevenlabs':
          return generateElevenLabsTTS(text, {
            apiKey,
            voice: speechSettings.elevenlabsTtsVoice,
            model: speechSettings.elevenlabsTtsModel,
            stability: speechSettings.elevenlabsTtsStability,
            similarityBoost: speechSettings.elevenlabsTtsSimilarityBoost,
          });

        case 'lmnt':
          return generateLMNTTTS(text, {
            apiKey,
            voice: speechSettings.lmntTtsVoice,
            speed: speechSettings.lmntTtsSpeed,
          });

        case 'hume':
          return generateHumeTTS(text, {
            apiKey,
            voice: speechSettings.humeTtsVoice,
          });

        case 'cartesia':
          return generateCartesiaTTS(text, {
            apiKey,
            voice: speechSettings.cartesiaTtsVoice,
            model: speechSettings.cartesiaTtsModel,
            language: speechSettings.cartesiaTtsLanguage,
            speed: speechSettings.cartesiaTtsSpeed,
            emotion: speechSettings.cartesiaTtsEmotion,
          });

        case 'deepgram':
          return generateDeepgramTTS(text, {
            apiKey,
            voice: speechSettings.deepgramTtsVoice,
          });

        default:
          return {
            success: false,
            error: `Unknown TTS provider: ${provider}`,
          };
      }
    },
    [speechSettings, getApiKey]
  );

  // Play audio data from a TTSResponse
  const playAudioResponse = useCallback(
    (response: TTSResponse): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (!response.success || !response.audioData) {
          reject(new Error(response.error || 'Failed to generate audio'));
          return;
        }

        // Create blob and URL
        const blob =
          response.audioData instanceof Blob
            ? response.audioData
            : new Blob([response.audioData], { type: response.mimeType || 'audio/mpeg' });
        audioUrlRef.current = URL.createObjectURL(blob);

        // Create and configure audio element
        audioRef.current = new Audio(audioUrlRef.current);
        audioRef.current.volume = speechSettings.ttsVolume;

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
    },
    [speechSettings.ttsVolume, cleanup, onStart, onEnd, onError, onProgress]
  );

  // Main speak function
  const speak = useCallback(
    async (text: string, overrideProvider?: TTSProvider): Promise<void> => {
      const provider: TTSProvider = overrideProvider ?? currentProvider;

      // Stop any current playback
      stop();

      setPlaybackState('loading');
      setError(null);
      setProgress(0);

      try {
        if (provider === 'system') {
          await speakWithSystem(text);
        } else {
          // Check API key for providers that require one
          const providerInfo = TTS_PROVIDERS[provider];
          if (providerInfo.requiresApiKey) {
            const apiKey = getApiKey(provider);
            if (!apiKey) {
              throw new Error(`API key required for ${providerInfo.name}. Please configure it in Settings > Providers.`);
            }
          }

          const response = await generateAudio(text, provider);
          await playAudioResponse(response);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to generate speech';
        setError(errorMsg);
        setPlaybackState('error');
        toast.error(errorMsg);
        throw err;
      }
    },
    [currentProvider, stop, speakWithSystem, getApiKey, generateAudio, playAudioResponse]
  );

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
