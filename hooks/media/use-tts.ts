'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSettingsStore } from '@/stores';
import type { TTSProvider } from '@/types/media/tts';
import { DEFAULT_SPEECH_SETTINGS } from '@/types/media/speech';
import {
  ttsOrchestrator,
  type TTSActiveSource,
  type TTSOrchestratorState,
} from '@/lib/ai/tts/tts-orchestrator';

export type TTSPlaybackState = 'idle' | 'loading' | 'playing' | 'paused' | 'stopped' | 'error';

export interface UseTTSOptions {
  useSettings?: boolean;
  provider?: TTSProvider;
  source?: TTSActiveSource;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
  onProgress?: (progress: number) => void;
}

export interface UseTTSReturn {
  isLoading: boolean;
  isPlaying: boolean;
  isPaused: boolean;
  playbackState: TTSPlaybackState;
  progress: number;
  error: string | null;
  activeRequestId?: string;
  activeSource?: TTSActiveSource;

  speak: (text: string, overrideProvider?: TTSProvider) => Promise<void>;
  stop: () => void;
  pause: () => void;
  resume: () => void;

  currentProvider: TTSProvider;
  isSupported: boolean;
}

export function useTTS(options: UseTTSOptions = {}): UseTTSReturn {
  const { useSettings = true, provider, source = 'unknown', onStart, onEnd, onError, onProgress } = options;

  const speechSettings = useSettingsStore((state) => state.speechSettings) ?? DEFAULT_SPEECH_SETTINGS;
  const providerSettings = useSettingsStore((state) => state.providerSettings) as
    | Record<string, { apiKey?: string }>
    | undefined;

  const currentProvider: TTSProvider = provider ?? (useSettings ? speechSettings.ttsProvider : 'system');
  const [state, setState] = useState<TTSOrchestratorState>(ttsOrchestrator.getState());

  useEffect(() => {
    return ttsOrchestrator.subscribe(setState);
  }, []);

  const speak = useCallback(
    async (text: string, overrideProvider?: TTSProvider): Promise<void> => {
      const activeProvider = overrideProvider ?? currentProvider;

      await ttsOrchestrator.speak(text, {
        provider: activeProvider,
        source,
        speechSettings,
        providerSettings,
        onStart,
        onEnd,
        onError,
        onProgress,
      });
    },
    [
      currentProvider,
      source,
      speechSettings,
      providerSettings,
      onStart,
      onEnd,
      onError,
      onProgress,
    ]
  );

  const isSupported =
    typeof window !== 'undefined' &&
    (currentProvider !== 'system' || ('speechSynthesis' in window && 'SpeechSynthesisUtterance' in window));

  return {
    isLoading: state.isLoading,
    isPlaying: state.isPlaying,
    isPaused: state.isPaused,
    playbackState: state.playbackState,
    progress: state.progress,
    error: state.error,
    activeRequestId: state.activeRequestId,
    activeSource: state.activeSource,
    speak,
    stop: () => ttsOrchestrator.stop(),
    pause: () => ttsOrchestrator.pause(),
    resume: () => ttsOrchestrator.resume(),
    currentProvider,
    isSupported,
  };
}

export default useTTS;

