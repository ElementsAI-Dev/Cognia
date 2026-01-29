/**
 * TTS Types - Type definitions for Text-to-Speech functionality
 * Supports multiple providers: Browser (Web Speech API), OpenAI, Gemini, Edge-TTS,
 * ElevenLabs, LMNT, and Hume
 */

// TTS Provider types
export type TTSProvider = 'system' | 'openai' | 'gemini' | 'edge' | 'elevenlabs' | 'lmnt' | 'hume';

// TTS Provider display info
export interface TTSProviderInfo {
  id: TTSProvider;
  name: string;
  description: string;
  requiresApiKey: boolean;
  apiKeyProvider?: string; // Which provider's API key to use
  supportsStreaming: boolean;
  maxTextLength: number;
}

// Provider information
export const TTS_PROVIDERS: Record<TTSProvider, TTSProviderInfo> = {
  system: {
    id: 'system',
    name: 'System (Browser)',
    description: "Uses your browser's built-in speech synthesis",
    requiresApiKey: false,
    supportsStreaming: true,
    maxTextLength: 32767,
  },
  openai: {
    id: 'openai',
    name: 'OpenAI TTS',
    description: 'High-quality neural voices from OpenAI',
    requiresApiKey: true,
    apiKeyProvider: 'openai',
    supportsStreaming: true,
    maxTextLength: 4096,
  },
  gemini: {
    id: 'gemini',
    name: 'Google Gemini TTS',
    description: 'Native text-to-speech from Gemini 2.5',
    requiresApiKey: true,
    apiKeyProvider: 'google',
    supportsStreaming: false,
    maxTextLength: 8000,
  },
  edge: {
    id: 'edge',
    name: 'Edge TTS',
    description: 'Microsoft Edge neural voices (free)',
    requiresApiKey: false,
    supportsStreaming: true,
    maxTextLength: 10000,
  },
  elevenlabs: {
    id: 'elevenlabs',
    name: 'ElevenLabs',
    description: 'Industry-leading AI voice synthesis',
    requiresApiKey: true,
    apiKeyProvider: 'elevenlabs',
    supportsStreaming: true,
    maxTextLength: 5000,
  },
  lmnt: {
    id: 'lmnt',
    name: 'LMNT',
    description: 'Ultra-low latency voice synthesis',
    requiresApiKey: true,
    apiKeyProvider: 'lmnt',
    supportsStreaming: true,
    maxTextLength: 3000,
  },
  hume: {
    id: 'hume',
    name: 'Hume AI',
    description: 'Emotionally expressive voice synthesis',
    requiresApiKey: true,
    apiKeyProvider: 'hume',
    supportsStreaming: true,
    maxTextLength: 5000,
  },
};

// OpenAI TTS voices
export const OPENAI_TTS_VOICES = [
  { id: 'alloy', name: 'Alloy', description: 'Neutral and balanced' },
  { id: 'echo', name: 'Echo', description: 'Warm and engaging' },
  { id: 'fable', name: 'Fable', description: 'Expressive and dynamic' },
  { id: 'onyx', name: 'Onyx', description: 'Deep and authoritative' },
  { id: 'nova', name: 'Nova', description: 'Friendly and upbeat' },
  { id: 'shimmer', name: 'Shimmer', description: 'Clear and pleasant' },
] as const;

export type OpenAITTSVoice = (typeof OPENAI_TTS_VOICES)[number]['id'];

// OpenAI TTS models
export const OPENAI_TTS_MODELS = [
  { id: 'tts-1', name: 'TTS-1', description: 'Standard quality, faster' },
  { id: 'tts-1-hd', name: 'TTS-1 HD', description: 'High definition audio' },
] as const;

export type OpenAITTSModel = (typeof OPENAI_TTS_MODELS)[number]['id'];

// Gemini TTS voices (from the API docs)
export const GEMINI_TTS_VOICES = [
  { id: 'Zephyr', name: 'Zephyr', description: 'Bright' },
  { id: 'Puck', name: 'Puck', description: 'Upbeat' },
  { id: 'Charon', name: 'Charon', description: 'Informative' },
  { id: 'Kore', name: 'Kore', description: 'Firm' },
  { id: 'Fenrir', name: 'Fenrir', description: 'Excitable' },
  { id: 'Leda', name: 'Leda', description: 'Youthful' },
  { id: 'Orus', name: 'Orus', description: 'Firm' },
  { id: 'Aoede', name: 'Aoede', description: 'Breezy' },
  { id: 'Callirrhoe', name: 'Callirrhoe', description: 'Easy-going' },
  { id: 'Autonoe', name: 'Autonoe', description: 'Bright' },
  { id: 'Enceladus', name: 'Enceladus', description: 'Breathy' },
  { id: 'Iapetus', name: 'Iapetus', description: 'Clear' },
  { id: 'Umbriel', name: 'Umbriel', description: 'Easy-going' },
  { id: 'Algieba', name: 'Algieba', description: 'Smooth' },
  { id: 'Despina', name: 'Despina', description: 'Smooth' },
  { id: 'Erinome', name: 'Erinome', description: 'Clear' },
  { id: 'Algenib', name: 'Algenib', description: 'Gravelly' },
  { id: 'Rasalgethi', name: 'Rasalgethi', description: 'Informative' },
  { id: 'Laomedeia', name: 'Laomedeia', description: 'Upbeat' },
  { id: 'Achernar', name: 'Achernar', description: 'Soft' },
  { id: 'Alnilam', name: 'Alnilam', description: 'Firm' },
  { id: 'Schedar', name: 'Schedar', description: 'Even' },
  { id: 'Gacrux', name: 'Gacrux', description: 'Mature' },
  { id: 'Pulcherrima', name: 'Pulcherrima', description: 'Forward' },
  { id: 'Achird', name: 'Achird', description: 'Friendly' },
  { id: 'Zubenelgenubi', name: 'Zubenelgenubi', description: 'Casual' },
  { id: 'Vindemiatrix', name: 'Vindemiatrix', description: 'Gentle' },
  { id: 'Sadachbia', name: 'Sadachbia', description: 'Lively' },
  { id: 'Sadaltager', name: 'Sadaltager', description: 'Knowledgeable' },
  { id: 'Sulafat', name: 'Sulafat', description: 'Warm' },
] as const;

export type GeminiTTSVoice = (typeof GEMINI_TTS_VOICES)[number]['id'];

// Edge TTS popular voices
export const EDGE_TTS_VOICES = [
  // Chinese
  { id: 'zh-CN-XiaoxiaoNeural', name: 'Xiaoxiao (女)', language: 'zh-CN', gender: 'Female' },
  { id: 'zh-CN-YunxiNeural', name: 'Yunxi (男)', language: 'zh-CN', gender: 'Male' },
  { id: 'zh-CN-YunyangNeural', name: 'Yunyang (男)', language: 'zh-CN', gender: 'Male' },
  { id: 'zh-CN-XiaoyiNeural', name: 'Xiaoyi (女)', language: 'zh-CN', gender: 'Female' },
  { id: 'zh-TW-HsiaoChenNeural', name: 'HsiaoChen (女)', language: 'zh-TW', gender: 'Female' },
  { id: 'zh-TW-YunJheNeural', name: 'YunJhe (男)', language: 'zh-TW', gender: 'Male' },
  // English
  { id: 'en-US-JennyNeural', name: 'Jenny (Female)', language: 'en-US', gender: 'Female' },
  { id: 'en-US-GuyNeural', name: 'Guy (Male)', language: 'en-US', gender: 'Male' },
  { id: 'en-US-AriaNeural', name: 'Aria (Female)', language: 'en-US', gender: 'Female' },
  { id: 'en-US-DavisNeural', name: 'Davis (Male)', language: 'en-US', gender: 'Male' },
  { id: 'en-GB-SoniaNeural', name: 'Sonia (Female)', language: 'en-GB', gender: 'Female' },
  { id: 'en-GB-RyanNeural', name: 'Ryan (Male)', language: 'en-GB', gender: 'Male' },
  // Japanese
  { id: 'ja-JP-NanamiNeural', name: 'Nanami (Female)', language: 'ja-JP', gender: 'Female' },
  { id: 'ja-JP-KeitaNeural', name: 'Keita (Male)', language: 'ja-JP', gender: 'Male' },
  // Korean
  { id: 'ko-KR-SunHiNeural', name: 'SunHi (Female)', language: 'ko-KR', gender: 'Female' },
  { id: 'ko-KR-InJoonNeural', name: 'InJoon (Male)', language: 'ko-KR', gender: 'Male' },
  // French
  { id: 'fr-FR-DeniseNeural', name: 'Denise (Female)', language: 'fr-FR', gender: 'Female' },
  { id: 'fr-FR-HenriNeural', name: 'Henri (Male)', language: 'fr-FR', gender: 'Male' },
  // German
  { id: 'de-DE-KatjaNeural', name: 'Katja (Female)', language: 'de-DE', gender: 'Female' },
  { id: 'de-DE-ConradNeural', name: 'Conrad (Male)', language: 'de-DE', gender: 'Male' },
  // Spanish
  { id: 'es-ES-ElviraNeural', name: 'Elvira (Female)', language: 'es-ES', gender: 'Female' },
  { id: 'es-ES-AlvaroNeural', name: 'Alvaro (Male)', language: 'es-ES', gender: 'Male' },
] as const;

export type EdgeTTSVoice = (typeof EDGE_TTS_VOICES)[number]['id'];

// ElevenLabs TTS voices
export const ELEVENLABS_TTS_VOICES = [
  { id: 'rachel', name: 'Rachel', description: 'Calm, young female' },
  { id: 'domi', name: 'Domi', description: 'Strong, young female' },
  { id: 'bella', name: 'Bella', description: 'Soft, young female' },
  { id: 'antoni', name: 'Antoni', description: 'Well-rounded, young male' },
  { id: 'elli', name: 'Elli', description: 'Emotional, young female' },
  { id: 'josh', name: 'Josh', description: 'Deep, young male' },
  { id: 'arnold', name: 'Arnold', description: 'Crisp, middle-aged male' },
  { id: 'adam', name: 'Adam', description: 'Deep, middle-aged male' },
  { id: 'sam', name: 'Sam', description: 'Raspy, young male' },
] as const;

export type ElevenLabsTTSVoice = (typeof ELEVENLABS_TTS_VOICES)[number]['id'];

// ElevenLabs TTS models
export const ELEVENLABS_TTS_MODELS = [
  { id: 'eleven_multilingual_v2', name: 'Multilingual v2', description: 'Best quality, 29 languages' },
  { id: 'eleven_turbo_v2_5', name: 'Turbo v2.5', description: 'Low latency, high quality' },
  { id: 'eleven_turbo_v2', name: 'Turbo v2', description: 'Low latency' },
  { id: 'eleven_monolingual_v1', name: 'Monolingual v1', description: 'English only, fast' },
] as const;

export type ElevenLabsTTSModel = (typeof ELEVENLABS_TTS_MODELS)[number]['id'];

// LMNT TTS voices
export const LMNT_TTS_VOICES = [
  { id: 'lily', name: 'Lily', description: 'Friendly, conversational female' },
  { id: 'daniel', name: 'Daniel', description: 'Professional, male' },
  { id: 'mia', name: 'Mia', description: 'Warm, female' },
  { id: 'morgan', name: 'Morgan', description: 'Neutral, androgynous' },
  { id: 'zoe', name: 'Zoe', description: 'Energetic, young female' },
] as const;

export type LMNTTTSVoice = (typeof LMNT_TTS_VOICES)[number]['id'];

// Hume TTS voices
export const HUME_TTS_VOICES = [
  { id: 'ito', name: 'Ito', description: 'Calm, male' },
  { id: 'kora', name: 'Kora', description: 'Warm, female' },
  { id: 'dacher', name: 'Dacher', description: 'Friendly, male' },
  { id: 'aura', name: 'Aura', description: 'Soothing, female' },
  { id: 'finn', name: 'Finn', description: 'Energetic, male' },
] as const;

export type HumeTTSVoice = (typeof HUME_TTS_VOICES)[number]['id'];

// TTS Settings interface (extends existing speech settings)
export interface TTSSettings {
  // Provider configuration
  ttsProvider: TTSProvider;

  // System (Browser) TTS settings
  systemVoice: string;

  // OpenAI TTS settings
  openaiVoice: OpenAITTSVoice;
  openaiModel: OpenAITTSModel;
  openaiSpeed: number; // 0.25 - 4.0

  // Gemini TTS settings
  geminiVoice: GeminiTTSVoice;

  // Edge TTS settings
  edgeVoice: EdgeTTSVoice;
  edgeRate: string; // e.g., '+0%', '-10%', '+20%'
  edgePitch: string; // e.g., '+0Hz', '-10Hz', '+20Hz'

  // ElevenLabs TTS settings
  elevenlabsVoice: ElevenLabsTTSVoice;
  elevenlabsModel: ElevenLabsTTSModel;
  elevenlabsStability: number; // 0 - 1
  elevenlabsSimilarityBoost: number; // 0 - 1

  // LMNT TTS settings
  lmntVoice: LMNTTTSVoice;
  lmntSpeed: number; // 0.5 - 2.0

  // Hume TTS settings
  humeVoice: HumeTTSVoice;

  // Common settings
  ttsEnabled: boolean;
  ttsRate: number; // 0.1 - 10
  ttsPitch: number; // 0 - 2
  ttsVolume: number; // 0 - 1
  ttsAutoPlay: boolean; // Auto-play AI responses
  ttsCacheEnabled: boolean; // Enable audio caching
}

// Default TTS settings
export const DEFAULT_TTS_SETTINGS: TTSSettings = {
  ttsProvider: 'system',

  // System
  systemVoice: '',

  // OpenAI
  openaiVoice: 'alloy',
  openaiModel: 'tts-1',
  openaiSpeed: 1.0,

  // Gemini
  geminiVoice: 'Kore',

  // Edge
  edgeVoice: 'en-US-JennyNeural',
  edgeRate: '+0%',
  edgePitch: '+0Hz',

  // ElevenLabs
  elevenlabsVoice: 'rachel',
  elevenlabsModel: 'eleven_multilingual_v2',
  elevenlabsStability: 0.5,
  elevenlabsSimilarityBoost: 0.75,

  // LMNT
  lmntVoice: 'lily',
  lmntSpeed: 1.0,

  // Hume
  humeVoice: 'kora',

  // Common
  ttsEnabled: false,
  ttsRate: 1.0,
  ttsPitch: 1.0,
  ttsVolume: 1.0,
  ttsAutoPlay: false,
  ttsCacheEnabled: true,
};

// TTS Request options
export interface TTSRequest {
  text: string;
  provider: TTSProvider;
  voice?: string;
  model?: string;
  speed?: number;
  rate?: number;
  pitch?: number;
  volume?: number;
}

// TTS Response
export interface TTSResponse {
  success: boolean;
  audioData?: ArrayBuffer | Blob;
  audioUrl?: string;
  mimeType?: string;
  duration?: number;
  error?: string;
}

// TTS playback state
export type TTSPlaybackState = 'idle' | 'loading' | 'playing' | 'paused' | 'stopped' | 'error';

// TTS Error types
export type TTSErrorType =
  | 'not-supported'
  | 'api-key-missing'
  | 'api-error'
  | 'network-error'
  | 'text-too-long'
  | 'voice-not-found'
  | 'audio-playback-error'
  | 'cancelled';

export interface TTSError {
  type: TTSErrorType;
  message: string;
  details?: string;
}

// Helper to get TTS error
export function getTTSError(type: TTSErrorType, details?: string): TTSError {
  const messages: Record<TTSErrorType, string> = {
    'not-supported': 'Text-to-speech is not supported in this browser',
    'api-key-missing': 'API key is required for this TTS provider',
    'api-error': 'TTS API returned an error',
    'network-error': 'Network error occurred while generating speech',
    'text-too-long': 'Text exceeds maximum length for this provider',
    'voice-not-found': 'Selected voice is not available',
    'audio-playback-error': 'Failed to play audio',
    cancelled: 'Speech synthesis was cancelled',
  };

  return {
    type,
    message: messages[type],
    details,
  };
}

// Helper to get voices by language
export function getEdgeVoicesByLanguage(langCode: string): (typeof EDGE_TTS_VOICES)[number][] {
  const lang = langCode.split('-')[0];
  return EDGE_TTS_VOICES.filter((v) => v.language.startsWith(lang));
}

// Helper to check if provider requires API key
export function providerRequiresApiKey(provider: TTSProvider): boolean {
  return TTS_PROVIDERS[provider].requiresApiKey;
}

// Helper to get API key provider name
export function getApiKeyProvider(provider: TTSProvider): string | undefined {
  return TTS_PROVIDERS[provider].apiKeyProvider;
}
