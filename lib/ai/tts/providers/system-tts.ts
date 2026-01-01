/**
 * System TTS Provider - Browser's built-in Web Speech API
 */

import type { TTSResponse, TTSError } from '@/types/tts';
import { getTTSError } from '@/types/tts';

export interface SystemTTSOptions {
  voice?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  lang?: string;
}

export interface SystemTTSController {
  pause: () => void;
  resume: () => void;
  cancel: () => void;
  onEnd?: () => void;
  onError?: (error: TTSError) => void;
  onStart?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onBoundary?: (event: SpeechSynthesisEvent) => void;
}

/**
 * Check if Web Speech API is supported
 */
export function isSystemTTSSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
}

/**
 * Get available system voices
 */
export function getSystemVoices(): SpeechSynthesisVoice[] {
  if (!isSystemTTSSupported()) return [];
  return speechSynthesis.getVoices();
}

/**
 * Wait for voices to be loaded
 */
export function waitForVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (!isSystemTTSSupported()) {
      resolve([]);
      return;
    }

    const voices = speechSynthesis.getVoices();
    if (voices.length > 0) {
      resolve(voices);
      return;
    }

    // Wait for voices to load
    const handleVoicesChanged = () => {
      const loadedVoices = speechSynthesis.getVoices();
      if (loadedVoices.length > 0) {
        speechSynthesis.onvoiceschanged = null;
        resolve(loadedVoices);
      }
    };

    speechSynthesis.onvoiceschanged = handleVoicesChanged;

    // Timeout after 3 seconds
    setTimeout(() => {
      speechSynthesis.onvoiceschanged = null;
      resolve(speechSynthesis.getVoices());
    }, 3000);
  });
}

/**
 * Find a voice by name or language
 */
export function findSystemVoice(
  voiceName?: string,
  lang?: string
): SpeechSynthesisVoice | null {
  const voices = getSystemVoices();
  
  if (voiceName) {
    const voice = voices.find(v => v.name === voiceName);
    if (voice) return voice;
  }
  
  if (lang) {
    const langCode = lang.split('-')[0];
    const voice = voices.find(v => v.lang.startsWith(langCode));
    if (voice) return voice;
  }
  
  return voices[0] || null;
}

/**
 * Speak text using System TTS
 * Returns a controller for pause/resume/cancel
 */
export function speakWithSystemTTS(
  text: string,
  options: SystemTTSOptions = {}
): SystemTTSController {
  const controller: SystemTTSController = {
    pause: () => speechSynthesis.pause(),
    resume: () => speechSynthesis.resume(),
    cancel: () => speechSynthesis.cancel(),
  };

  if (!isSystemTTSSupported()) {
    setTimeout(() => {
      controller.onError?.(getTTSError('not-supported'));
    }, 0);
    return controller;
  }

  // Cancel any ongoing speech
  speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);

  // Set voice
  if (options.voice) {
    const voice = findSystemVoice(options.voice, options.lang);
    if (voice) {
      utterance.voice = voice;
    }
  } else if (options.lang) {
    const voice = findSystemVoice(undefined, options.lang);
    if (voice) {
      utterance.voice = voice;
    }
  }

  // Set parameters
  utterance.rate = options.rate ?? 1;
  utterance.pitch = options.pitch ?? 1;
  utterance.volume = options.volume ?? 1;
  if (options.lang) {
    utterance.lang = options.lang;
  }

  // Event handlers
  utterance.onstart = () => controller.onStart?.();
  utterance.onend = () => controller.onEnd?.();
  utterance.onerror = (event) => {
    if (event.error === 'canceled' || event.error === 'interrupted') {
      controller.onError?.(getTTSError('cancelled'));
    } else {
      controller.onError?.(getTTSError('audio-playback-error', event.error));
    }
  };
  utterance.onpause = () => controller.onPause?.();
  utterance.onresume = () => controller.onResume?.();
  utterance.onboundary = (event) => controller.onBoundary?.(event);

  // Speak
  speechSynthesis.speak(utterance);

  return controller;
}

/**
 * Stop all system TTS playback
 */
export function stopSystemTTS(): void {
  if (isSystemTTSSupported()) {
    speechSynthesis.cancel();
  }
}

/**
 * Check if system TTS is currently speaking
 */
export function isSystemTTSSpeaking(): boolean {
  if (!isSystemTTSSupported()) return false;
  return speechSynthesis.speaking;
}

/**
 * Check if system TTS is paused
 */
export function isSystemTTSPaused(): boolean {
  if (!isSystemTTSSupported()) return false;
  return speechSynthesis.paused;
}

/**
 * Generate audio blob using system TTS (not directly supported)
 * System TTS doesn't provide audio data, only real-time playback
 */
export async function generateSystemTTSAudio(
  _text: string,
  _options: SystemTTSOptions = {}
): Promise<TTSResponse> {
  return {
    success: false,
    error: 'System TTS does not support audio file generation. Use speakWithSystemTTS for real-time playback.',
  };
}
