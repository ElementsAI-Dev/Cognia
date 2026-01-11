/**
 * TTS Service - Unified text-to-speech service with multi-provider support
 * Provides a single interface for all TTS providers
 */

import type {
  TTSProvider,
  TTSResponse,
  TTSPlaybackState,
  TTSError,
  TTSSettings,
} from '@/types/media/tts';
import { getTTSError, TTS_PROVIDERS } from '@/types/media/tts';
import {
  speakWithSystemTTS,
  stopSystemTTS,
  isSystemTTSSupported,
  getSystemVoices,
  type SystemTTSController,
} from './providers/system-tts';
import { generateOpenAITTS, generateOpenAITTSViaApi } from './providers/openai-tts';
import { generateGeminiTTS, generateGeminiTTSViaApi } from './providers/gemini-tts';
import { generateEdgeTTS } from './providers/edge-tts';

export interface TTSServiceOptions {
  settings: TTSSettings;
  apiKeys?: {
    openai?: string;
    google?: string;
  };
  onStateChange?: (state: TTSPlaybackState) => void;
  onError?: (error: TTSError) => void;
  onProgress?: (progress: number) => void;
}

export interface TTSServiceController {
  play: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  getState: () => TTSPlaybackState;
}

/**
 * TTS Service class for managing text-to-speech playback
 */
export class TTSService {
  private settings: TTSSettings;
  private apiKeys: { openai?: string; google?: string };
  private state: TTSPlaybackState = 'idle';
  private onStateChange?: (state: TTSPlaybackState) => void;
  private onError?: (error: TTSError) => void;
  private onProgress?: (progress: number) => void;
  
  // Playback references
  private systemController: SystemTTSController | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private audioUrl: string | null = null;

  constructor(options: TTSServiceOptions) {
    this.settings = options.settings;
    this.apiKeys = options.apiKeys || {};
    this.onStateChange = options.onStateChange;
    this.onError = options.onError;
    this.onProgress = options.onProgress;
  }

  /**
   * Update settings
   */
  updateSettings(settings: Partial<TTSSettings>): void {
    this.settings = { ...this.settings, ...settings };
  }

  /**
   * Update API keys
   */
  updateApiKeys(keys: { openai?: string; google?: string }): void {
    this.apiKeys = { ...this.apiKeys, ...keys };
  }

  /**
   * Get current playback state
   */
  getState(): TTSPlaybackState {
    return this.state;
  }

  /**
   * Set state and notify listeners
   */
  private setState(state: TTSPlaybackState): void {
    this.state = state;
    this.onStateChange?.(state);
  }

  /**
   * Speak text using the configured provider
   */
  async speak(text: string, overrideProvider?: TTSProvider): Promise<TTSServiceController> {
    const provider = overrideProvider || this.settings.ttsProvider;
    
    // Stop any current playback
    this.stop();
    
    this.setState('loading');

    try {
      switch (provider) {
        case 'system':
          return this.speakWithSystem(text);
        case 'openai':
          return this.speakWithOpenAI(text);
        case 'gemini':
          return this.speakWithGemini(text);
        case 'edge':
          return this.speakWithEdge(text);
        default:
          throw getTTSError('not-supported', `Unknown provider: ${provider}`);
      }
    } catch (error) {
      this.setState('error');
      const ttsError = error instanceof Error 
        ? getTTSError('api-error', error.message)
        : getTTSError('api-error');
      this.onError?.(ttsError);
      throw ttsError;
    }
  }

  /**
   * Speak using System TTS (browser)
   */
  private speakWithSystem(text: string): TTSServiceController {
    if (!isSystemTTSSupported()) {
      this.setState('error');
      const error = getTTSError('not-supported');
      this.onError?.(error);
      throw error;
    }

    this.systemController = speakWithSystemTTS(text, {
      voice: this.settings.systemVoice,
      rate: this.settings.ttsRate,
      pitch: this.settings.ttsPitch,
      volume: this.settings.ttsVolume,
    });

    this.systemController.onStart = () => this.setState('playing');
    this.systemController.onEnd = () => this.setState('stopped');
    this.systemController.onPause = () => this.setState('paused');
    this.systemController.onResume = () => this.setState('playing');
    this.systemController.onError = (error) => {
      this.setState('error');
      this.onError?.(error);
    };

    return this.createController();
  }

  /**
   * Speak using OpenAI TTS
   */
  private async speakWithOpenAI(text: string): Promise<TTSServiceController> {
    let response: TTSResponse;

    if (this.apiKeys.openai) {
      response = await generateOpenAITTS(text, {
        apiKey: this.apiKeys.openai,
        voice: this.settings.openaiVoice,
        model: this.settings.openaiModel,
        speed: this.settings.openaiSpeed,
      });
    } else {
      // Use API route if no key provided (server-side key)
      response = await generateOpenAITTSViaApi(text, {
        voice: this.settings.openaiVoice,
        model: this.settings.openaiModel,
        speed: this.settings.openaiSpeed,
      });
    }

    if (!response.success || !response.audioData) {
      this.setState('error');
      const error = getTTSError('api-error', response.error);
      this.onError?.(error);
      throw error;
    }

    return this.playAudioData(response.audioData, response.mimeType || 'audio/mpeg');
  }

  /**
   * Speak using Gemini TTS
   */
  private async speakWithGemini(text: string): Promise<TTSServiceController> {
    let response: TTSResponse;

    if (this.apiKeys.google) {
      response = await generateGeminiTTS(text, {
        apiKey: this.apiKeys.google,
        voice: this.settings.geminiVoice,
      });
    } else {
      response = await generateGeminiTTSViaApi(text, {
        voice: this.settings.geminiVoice,
      });
    }

    if (!response.success || !response.audioData) {
      this.setState('error');
      const error = getTTSError('api-error', response.error);
      this.onError?.(error);
      throw error;
    }

    return this.playAudioData(response.audioData, response.mimeType || 'audio/wav');
  }

  /**
   * Speak using Edge TTS
   */
  private async speakWithEdge(text: string): Promise<TTSServiceController> {
    const response = await generateEdgeTTS(text, {
      voice: this.settings.edgeVoice,
      rate: this.settings.edgeRate,
      pitch: this.settings.edgePitch,
    });

    if (!response.success || !response.audioData) {
      this.setState('error');
      const error = getTTSError('api-error', response.error);
      this.onError?.(error);
      throw error;
    }

    return this.playAudioData(response.audioData, response.mimeType || 'audio/mpeg');
  }

  /**
   * Play audio data using HTML Audio element
   */
  private playAudioData(data: ArrayBuffer | Blob, mimeType: string): TTSServiceController {
    // Create blob and URL
    const blob = data instanceof Blob ? data : new Blob([data], { type: mimeType });
    this.audioUrl = URL.createObjectURL(blob);

    // Create audio element
    this.audioElement = new Audio(this.audioUrl);
    this.audioElement.volume = this.settings.ttsVolume;

    // Event handlers
    this.audioElement.onplay = () => this.setState('playing');
    this.audioElement.onpause = () => {
      if (this.audioElement && this.audioElement.currentTime < this.audioElement.duration) {
        this.setState('paused');
      }
    };
    this.audioElement.onended = () => {
      this.setState('stopped');
      this.cleanup();
    };
    this.audioElement.onerror = () => {
      this.setState('error');
      this.onError?.(getTTSError('audio-playback-error'));
      this.cleanup();
    };
    this.audioElement.ontimeupdate = () => {
      if (this.audioElement && this.audioElement.duration) {
        const progress = this.audioElement.currentTime / this.audioElement.duration;
        this.onProgress?.(progress);
      }
    };

    // Start playback
    this.audioElement.play().catch((error) => {
      this.setState('error');
      this.onError?.(getTTSError('audio-playback-error', error.message));
    });

    return this.createController();
  }

  /**
   * Create playback controller
   */
  private createController(): TTSServiceController {
    return {
      play: () => this.play(),
      pause: () => this.pause(),
      resume: () => this.resume(),
      stop: () => this.stop(),
      getState: () => this.getState(),
    };
  }

  /**
   * Play/resume playback
   */
  play(): void {
    if (this.settings.ttsProvider === 'system' && this.systemController) {
      this.systemController.resume();
    } else if (this.audioElement) {
      this.audioElement.play().catch(() => {});
    }
  }

  /**
   * Pause playback
   */
  pause(): void {
    if (this.settings.ttsProvider === 'system' && this.systemController) {
      this.systemController.pause();
    } else if (this.audioElement) {
      this.audioElement.pause();
    }
    this.setState('paused');
  }

  /**
   * Resume playback
   */
  resume(): void {
    this.play();
  }

  /**
   * Stop playback
   */
  stop(): void {
    if (this.settings.ttsProvider === 'system') {
      stopSystemTTS();
    }
    
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
    }
    
    this.cleanup();
    this.setState('stopped');
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    if (this.audioUrl) {
      URL.revokeObjectURL(this.audioUrl);
      this.audioUrl = null;
    }
    this.audioElement = null;
    this.systemController = null;
  }

  /**
   * Destroy service instance
   */
  destroy(): void {
    this.stop();
    this.cleanup();
  }
}

/**
 * Generate TTS audio without playback (for download or processing)
 */
export async function generateTTSAudio(
  text: string,
  provider: TTSProvider,
  settings: TTSSettings,
  apiKeys?: { openai?: string; google?: string }
): Promise<TTSResponse> {
  switch (provider) {
    case 'system':
      return {
        success: false,
        error: 'System TTS does not support audio file generation',
      };
    
    case 'openai':
      if (apiKeys?.openai) {
        return generateOpenAITTS(text, {
          apiKey: apiKeys.openai,
          voice: settings.openaiVoice,
          model: settings.openaiModel,
          speed: settings.openaiSpeed,
        });
      }
      return generateOpenAITTSViaApi(text, {
        voice: settings.openaiVoice,
        model: settings.openaiModel,
        speed: settings.openaiSpeed,
      });
    
    case 'gemini':
      if (apiKeys?.google) {
        return generateGeminiTTS(text, {
          apiKey: apiKeys.google,
          voice: settings.geminiVoice,
        });
      }
      return generateGeminiTTSViaApi(text, {
        voice: settings.geminiVoice,
      });
    
    case 'edge':
      return generateEdgeTTS(text, {
        voice: settings.edgeVoice,
        rate: settings.edgeRate,
        pitch: settings.edgePitch,
      });
    
    default:
      return {
        success: false,
        error: `Unknown provider: ${provider}`,
      };
  }
}

/**
 * Check if a TTS provider is available
 */
export function isTTSProviderAvailable(
  provider: TTSProvider,
  apiKeys?: { openai?: string; google?: string }
): boolean {
  const providerInfo = TTS_PROVIDERS[provider];
  
  if (!providerInfo.requiresApiKey) {
    if (provider === 'system') {
      return isSystemTTSSupported();
    }
    return true; // Edge TTS is always available via API route
  }
  
  // Check for API key
  if (provider === 'openai') {
    return !!apiKeys?.openai;
  }
  if (provider === 'gemini') {
    return !!apiKeys?.google;
  }
  
  return false;
}

/**
 * Get available TTS providers based on API keys
 */
export function getAvailableTTSProviders(
  apiKeys?: { openai?: string; google?: string }
): TTSProvider[] {
  const providers: TTSProvider[] = [];
  
  if (isSystemTTSSupported()) {
    providers.push('system');
  }
  
  if (apiKeys?.openai) {
    providers.push('openai');
  }
  
  if (apiKeys?.google) {
    providers.push('gemini');
  }
  
  // Edge TTS is always available (free, no API key)
  providers.push('edge');
  
  return providers;
}

// Re-export utilities
export { getSystemVoices, isSystemTTSSupported };
