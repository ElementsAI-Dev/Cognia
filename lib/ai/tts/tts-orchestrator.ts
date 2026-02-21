import { DEFAULT_SPEECH_SETTINGS, type SpeechSettings } from '@/types/media/speech';
import type { TTSPlaybackState, TTSProvider, TTSResponse } from '@/types/media/tts';
import { TTS_PROVIDERS } from '@/types/media/tts';
import { toast } from '@/components/ui/sonner';
import { generateOpenAITTS, generateOpenAITTSViaApi, streamOpenAITTS } from '@/lib/ai/tts/providers/openai-tts';
import { generateGeminiTTS, generateGeminiTTSViaApi } from '@/lib/ai/tts/providers/gemini-tts';
import { generateEdgeTTS } from '@/lib/ai/tts/providers/edge-tts';
import { generateElevenLabsTTS, generateElevenLabsTTSViaApi, streamElevenLabsTTS } from '@/lib/ai/tts/providers/elevenlabs-tts';
import { generateLMNTTTS, generateLMNTTTSViaApi, streamLMNTTTS } from '@/lib/ai/tts/providers/lmnt-tts';
import { generateHumeTTS, generateHumeTTSViaApi } from '@/lib/ai/tts/providers/hume-tts';
import { generateCartesiaTTS, generateCartesiaTTSViaApi } from '@/lib/ai/tts/providers/cartesia-tts';
import { generateDeepgramTTS, generateDeepgramTTSViaApi, streamDeepgramTTS } from '@/lib/ai/tts/providers/deepgram-tts';
import { generateCacheKey, getCachedOrGenerate } from '@/lib/ai/tts/tts-cache';
import { preprocessTextForProvider, splitTextForTTS } from '@/lib/ai/tts/tts-text-utils';
import { getProviderRuntimeOptions, toTTSSettings } from '@/lib/ai/tts/speech-settings-adapter';

export type TTSActiveSource = 'chat' | 'chat-widget' | 'selection' | 'settings' | 'unknown';

export interface TTSOrchestratorState {
  playbackState: TTSPlaybackState;
  progress: number;
  error: string | null;
  isLoading: boolean;
  isPlaying: boolean;
  isPaused: boolean;
  currentProvider: TTSProvider;
  activeRequestId?: string;
  activeSource?: TTSActiveSource;
}

type ProviderSettingsMap = Record<string, { apiKey?: string } | undefined> | undefined;

export interface TTSOrchestratorSpeakOptions {
  provider?: TTSProvider;
  source?: TTSActiveSource;
  speechSettings?: SpeechSettings;
  providerSettings?: ProviderSettingsMap;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
  onProgress?: (progress: number) => void;
}

type Subscriber = (state: TTSOrchestratorState) => void;

const DEFAULT_STATE: TTSOrchestratorState = {
  playbackState: 'idle',
  progress: 0,
  error: null,
  isLoading: false,
  isPlaying: false,
  isPaused: false,
  currentProvider: 'system',
  activeSource: 'unknown',
};

export class TTSOrchestrator {
  private state: TTSOrchestratorState = { ...DEFAULT_STATE };
  private subscribers = new Set<Subscriber>();
  private audioRef: HTMLAudioElement | null = null;
  private audioUrlRef: string | null = null;
  private activeRequestId: string | null = null;

  subscribe(subscriber: Subscriber): () => void {
    this.subscribers.add(subscriber);
    subscriber(this.state);
    return () => {
      this.subscribers.delete(subscriber);
    };
  }

  getState(): TTSOrchestratorState {
    return this.state;
  }

  async speak(text: string, options: TTSOrchestratorSpeakOptions = {}): Promise<void> {
    const speechSettings = options.speechSettings ?? DEFAULT_SPEECH_SETTINGS;
    const providerSettings = options.providerSettings;
    const provider = options.provider ?? speechSettings.ttsProvider;
    const source = options.source ?? 'unknown';

    if (!speechSettings.ttsEnabled) {
      this.setState({
        playbackState: 'stopped',
        isLoading: false,
        isPlaying: false,
        isPaused: false,
        error: null,
        progress: 0,
      });
      return;
    }

    this.stop();

    const requestId = this.createRequestId();
    this.activeRequestId = requestId;
    this.setState({
      playbackState: 'loading',
      isLoading: true,
      isPlaying: false,
      isPaused: false,
      progress: 0,
      error: null,
      currentProvider: provider,
      activeRequestId: requestId,
      activeSource: source,
    });

    const normalizedText = preprocessTextForProvider(text, provider);
    const chunks = splitTextForTTS(normalizedText, provider);

    try {
      options.onStart?.();

      for (let index = 0; index < chunks.length; index++) {
        if (!this.isCurrentRequest(requestId)) return;

        const chunk = chunks[index];
        const chunkProgressBase = index / chunks.length;
        const chunkWeight = 1 / chunks.length;

        if (provider === 'system') {
          await this.playSystemChunk(chunk, speechSettings, requestId, (innerProgress) => {
            const overallProgress = chunkProgressBase + innerProgress * chunkWeight;
            this.updateProgress(overallProgress, options.onProgress);
          });
          continue;
        }

        const response = await this.generateChunkAudio({
          provider,
          chunk,
          speechSettings,
          providerSettings,
        });

        if (!response.success || !response.audioData) {
          throw new Error(response.error || 'Failed to generate speech audio');
        }

        await this.playAudioResponse(response, requestId, speechSettings.ttsVolume, (innerProgress) => {
          const overallProgress = chunkProgressBase + innerProgress * chunkWeight;
          this.updateProgress(overallProgress, options.onProgress);
        });
      }

      if (this.isCurrentRequest(requestId)) {
        this.setState({
          playbackState: 'stopped',
          isLoading: false,
          isPlaying: false,
          isPaused: false,
          progress: 1,
          activeRequestId: undefined,
          activeSource: undefined,
        });
        options.onEnd?.();
      }
    } catch (error) {
      if (!this.isCurrentRequest(requestId)) return;

      const message = error instanceof Error ? error.message : 'Failed to generate speech';
      this.setState({
        playbackState: 'error',
        isLoading: false,
        isPlaying: false,
        isPaused: false,
        error: message,
        activeRequestId: undefined,
        activeSource: undefined,
      });
      options.onError?.(message);
      toast.error(message);
      throw error;
    } finally {
      if (this.isCurrentRequest(requestId)) {
        this.activeRequestId = null;
      }
    }
  }

  stop(): void {
    this.activeRequestId = null;

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    if (this.audioRef) {
      this.audioRef.pause();
      this.audioRef = null;
    }
    if (this.audioUrlRef) {
      URL.revokeObjectURL(this.audioUrlRef);
      this.audioUrlRef = null;
    }

    this.setState({
      playbackState: 'stopped',
      isLoading: false,
      isPlaying: false,
      isPaused: false,
      progress: 0,
      activeRequestId: undefined,
      activeSource: undefined,
    });
  }

  pause(): void {
    if (this.state.playbackState !== 'playing') return;

    if (this.state.currentProvider === 'system' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.pause();
    } else if (this.audioRef) {
      this.audioRef.pause();
    }

    this.setState({
      playbackState: 'paused',
      isPlaying: false,
      isPaused: true,
      isLoading: false,
    });
  }

  resume(): void {
    if (this.state.playbackState !== 'paused') return;

    if (this.state.currentProvider === 'system' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.resume();
    } else if (this.audioRef) {
      this.audioRef.play().catch(() => {});
    }

    this.setState({
      playbackState: 'playing',
      isPlaying: true,
      isPaused: false,
      isLoading: false,
    });
  }

  private async generateChunkAudio(params: {
    provider: TTSProvider;
    chunk: string;
    speechSettings: SpeechSettings;
    providerSettings: ProviderSettingsMap;
  }): Promise<TTSResponse> {
    const { provider, chunk, speechSettings, providerSettings } = params;
    const apiKey = this.getApiKey(provider, providerSettings);
    const ttsSettings = toTTSSettings(speechSettings);
    const runtimeOptions = getProviderRuntimeOptions(speechSettings, provider);

    const key = generateCacheKey(chunk, provider, ttsSettings);
    const cached = await getCachedOrGenerate(
      key,
      async () => {
        const generated = await this.generateUncached(provider, chunk, runtimeOptions, apiKey, speechSettings);
        if (!generated.success || !generated.audioData) return null;
        return {
          audioData: generated.audioData,
          mimeType: generated.mimeType || 'audio/mpeg',
        };
      },
      provider,
      chunk,
      speechSettings.ttsCacheEnabled
    );

    if (!cached) {
      return {
        success: false,
        error: 'Failed to generate speech audio',
      };
    }

    return {
      success: true,
      audioData: cached.audioData,
      mimeType: cached.mimeType,
    };
  }

  private async generateUncached(
    provider: TTSProvider,
    text: string,
    runtimeOptions: Record<string, unknown>,
    apiKey: string,
    speechSettings: SpeechSettings
  ): Promise<TTSResponse> {
    const providerInfo = TTS_PROVIDERS[provider];
    let routeError: string | null = null;
    const shouldBypassRoute = this.isStaticExportRuntime();

    if (!shouldBypassRoute) {
      const viaApiResponse = await this.generateViaApi(provider, text, runtimeOptions);
      if (viaApiResponse.success) {
        return viaApiResponse;
      }
      routeError = viaApiResponse.error || 'Route generation failed';
    } else {
      routeError = 'API routes are unavailable in static export runtime';
    }

    if (providerInfo.requiresApiKey) {
      if (!apiKey) {
        return {
          success: false,
          error: routeError,
        };
      }
    }

    if (this.shouldUseStreamingFallback(provider, speechSettings, apiKey)) {
      const streamResponse = await this.generateDirectStreaming(provider, text, runtimeOptions, apiKey);
      if (streamResponse.success) {
        return streamResponse;
      }
    }

    const directResponse = await this.generateDirect(provider, text, runtimeOptions, apiKey);
    if (directResponse.success) return directResponse;

    return {
      success: false,
      error: directResponse.error || routeError || 'Failed to generate speech',
    };
  }

  private shouldUseStreamingFallback(
    provider: TTSProvider,
    speechSettings: SpeechSettings,
    apiKey: string
  ): boolean {
    if (!speechSettings.ttsStreamingEnabled) return false;
    if (!['openai', 'elevenlabs', 'lmnt', 'deepgram'].includes(provider)) return false;
    if (TTS_PROVIDERS[provider].requiresApiKey && !apiKey) return false;
    return true;
  }

  private isStaticExportRuntime(): boolean {
    if (typeof window === 'undefined') return false;
    if (window.location.protocol === 'file:') return true;
    return process.env.NEXT_PUBLIC_COGNIA_STATIC_EXPORT === 'true';
  }

  private async generateDirectStreaming(
    provider: TTSProvider,
    text: string,
    options: Record<string, unknown>,
    apiKey: string
  ): Promise<TTSResponse> {
    const onChunk = (_chunk: Uint8Array) => {};
    try {
      switch (provider) {
        case 'openai':
          return streamOpenAITTS(text, { ...(options as object), apiKey } as Parameters<typeof streamOpenAITTS>[1], onChunk);
        case 'elevenlabs':
          return streamElevenLabsTTS(
            text,
            { ...(options as object), apiKey } as Parameters<typeof streamElevenLabsTTS>[1],
            onChunk
          );
        case 'lmnt':
          return streamLMNTTTS(text, { ...(options as object), apiKey } as Parameters<typeof streamLMNTTTS>[1], onChunk);
        case 'deepgram':
          return streamDeepgramTTS(
            text,
            { ...(options as object), apiKey } as Parameters<typeof streamDeepgramTTS>[1],
            onChunk
          );
        default:
          return {
            success: false,
            error: `Streaming is not supported for provider ${provider}`,
          };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Direct streaming generation failed',
      };
    }
  }

  private async generateViaApi(
    provider: TTSProvider,
    text: string,
    options: Record<string, unknown>
  ): Promise<TTSResponse> {
    try {
      switch (provider) {
        case 'openai':
          return generateOpenAITTSViaApi(text, options as Parameters<typeof generateOpenAITTSViaApi>[1]);
        case 'gemini':
          return generateGeminiTTSViaApi(text, options as Parameters<typeof generateGeminiTTSViaApi>[1]);
        case 'edge':
          return generateEdgeTTS(text, options as Parameters<typeof generateEdgeTTS>[1]);
        case 'elevenlabs':
          return generateElevenLabsTTSViaApi(text, options as Parameters<typeof generateElevenLabsTTSViaApi>[1]);
        case 'lmnt':
          return generateLMNTTTSViaApi(text, options as Parameters<typeof generateLMNTTTSViaApi>[1]);
        case 'hume':
          return generateHumeTTSViaApi(text, options as Parameters<typeof generateHumeTTSViaApi>[1]);
        case 'cartesia':
          return generateCartesiaTTSViaApi(text, options as Parameters<typeof generateCartesiaTTSViaApi>[1]);
        case 'deepgram':
          return generateDeepgramTTSViaApi(text, options as Parameters<typeof generateDeepgramTTSViaApi>[1]);
        default:
          return {
            success: false,
            error: `Provider ${provider} does not support API route generation`,
          };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Route generation failed',
      };
    }
  }

  private async generateDirect(
    provider: TTSProvider,
    text: string,
    options: Record<string, unknown>,
    apiKey: string
  ): Promise<TTSResponse> {
    try {
      switch (provider) {
        case 'openai':
          return generateOpenAITTS(text, { ...(options as object), apiKey } as Parameters<typeof generateOpenAITTS>[1]);
        case 'gemini':
          return generateGeminiTTS(text, { ...(options as object), apiKey } as Parameters<typeof generateGeminiTTS>[1]);
        case 'edge':
          return generateEdgeTTS(text, options as Parameters<typeof generateEdgeTTS>[1]);
        case 'elevenlabs':
          return generateElevenLabsTTS(text, { ...(options as object), apiKey } as Parameters<typeof generateElevenLabsTTS>[1]);
        case 'lmnt':
          return generateLMNTTTS(text, { ...(options as object), apiKey } as Parameters<typeof generateLMNTTTS>[1]);
        case 'hume':
          return generateHumeTTS(text, { ...(options as object), apiKey } as Parameters<typeof generateHumeTTS>[1]);
        case 'cartesia':
          return generateCartesiaTTS(text, { ...(options as object), apiKey } as Parameters<typeof generateCartesiaTTS>[1]);
        case 'deepgram':
          return generateDeepgramTTS(text, { ...(options as object), apiKey } as Parameters<typeof generateDeepgramTTS>[1]);
        default:
          return {
            success: false,
            error: `Provider ${provider} is not supported`,
          };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Direct generation failed',
      };
    }
  }

  private playAudioResponse(
    response: TTSResponse,
    requestId: string,
    volume: number,
    onProgress: (progress: number) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!response.success || !response.audioData) {
        reject(new Error(response.error || 'Audio generation failed'));
        return;
      }

      const blob =
        response.audioData instanceof Blob
          ? response.audioData
          : new Blob([response.audioData], { type: response.mimeType || 'audio/mpeg' });

      this.audioUrlRef = URL.createObjectURL(blob);
      this.audioRef = new Audio(this.audioUrlRef);

      this.audioRef.onplay = () => {
        if (!this.isCurrentRequest(requestId)) return;
        this.setState({
          playbackState: 'playing',
          isLoading: false,
          isPlaying: true,
          isPaused: false,
        });
      };

      this.audioRef.onended = () => {
        this.cleanupAudio();
        resolve();
      };

      this.audioRef.onerror = () => {
        this.cleanupAudio();
        reject(new Error('Audio playback error'));
      };

      this.audioRef.onpause = () => {
        if (this.audioRef && this.audioRef.currentTime < this.audioRef.duration && this.isCurrentRequest(requestId)) {
          this.setState({
            playbackState: 'paused',
            isPlaying: false,
            isPaused: true,
          });
        }
      };

      this.audioRef.ontimeupdate = () => {
        if (!this.audioRef || !this.audioRef.duration || !this.isCurrentRequest(requestId)) return;
        onProgress(this.audioRef.currentTime / this.audioRef.duration);
      };

      this.audioRef.volume = Math.max(0, Math.min(1, volume));
      this.audioRef.play().catch((error) => reject(error));
    });
  }

  private playSystemChunk(
    text: string,
    speechSettings: SpeechSettings,
    requestId: string,
    onProgress: (progress: number) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        reject(new Error('System TTS is not supported'));
        return;
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);

      if (speechSettings.ttsVoice) {
        const voice = window.speechSynthesis.getVoices().find((candidate) => candidate.name === speechSettings.ttsVoice);
        if (voice) {
          utterance.voice = voice;
        }
      }

      utterance.rate = speechSettings.ttsRate;
      utterance.pitch = speechSettings.ttsPitch;
      utterance.volume = speechSettings.ttsVolume;
      utterance.lang = speechSettings.sttLanguage;

      utterance.onstart = () => {
        if (!this.isCurrentRequest(requestId)) return;
        this.setState({
          playbackState: 'playing',
          isLoading: false,
          isPlaying: true,
          isPaused: false,
        });
      };

      utterance.onboundary = () => {
        if (!this.isCurrentRequest(requestId)) return;
        onProgress(Math.min(0.98, this.state.progress + 0.01));
      };

      utterance.onend = () => {
        onProgress(1);
        resolve();
      };

      utterance.onerror = (event) => {
        if (event.error === 'canceled' || event.error === 'interrupted') {
          resolve();
          return;
        }
        reject(new Error(`Speech synthesis error: ${event.error}`));
      };

      window.speechSynthesis.speak(utterance);
    });
  }

  private getApiKey(provider: TTSProvider, providerSettings: ProviderSettingsMap): string {
    const providerInfo = TTS_PROVIDERS[provider];
    if (!providerInfo.requiresApiKey) return '';
    const keyProvider = providerInfo.apiKeyProvider || provider;
    return providerSettings?.[keyProvider]?.apiKey || '';
  }

  private cleanupAudio(): void {
    if (this.audioRef) {
      this.audioRef.pause();
      this.audioRef = null;
    }
    if (this.audioUrlRef) {
      URL.revokeObjectURL(this.audioUrlRef);
      this.audioUrlRef = null;
    }
  }

  private updateProgress(progress: number, onProgress?: (progress: number) => void): void {
    const normalized = Math.max(0, Math.min(1, progress));
    this.setState({ progress: normalized });
    onProgress?.(normalized);
  }

  private setState(partialState: Partial<TTSOrchestratorState>): void {
    this.state = { ...this.state, ...partialState };
    for (const subscriber of this.subscribers) {
      subscriber(this.state);
    }
  }

  private isCurrentRequest(requestId: string): boolean {
    return this.activeRequestId === requestId;
  }

  private createRequestId(): string {
    return `tts_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }
}

export const ttsOrchestrator = new TTSOrchestrator();
