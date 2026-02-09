/**
 * TTS Types - Type definitions for Text-to-Speech functionality
 * Supports multiple providers: Browser (Web Speech API), OpenAI, Gemini, Edge-TTS,
 * ElevenLabs, LMNT, Hume, Cartesia, and Deepgram
 */

// TTS Provider types
export type TTSProvider = 'system' | 'openai' | 'gemini' | 'edge' | 'elevenlabs' | 'lmnt' | 'hume' | 'cartesia' | 'deepgram';

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
  cartesia: {
    id: 'cartesia',
    name: 'Cartesia Sonic',
    description: 'Ultra-low latency streaming TTS with 42 languages',
    requiresApiKey: true,
    apiKeyProvider: 'cartesia',
    supportsStreaming: true,
    maxTextLength: 10000,
  },
  deepgram: {
    id: 'deepgram',
    name: 'Deepgram Aura',
    description: 'Enterprise-grade low-latency TTS',
    requiresApiKey: true,
    apiKeyProvider: 'deepgram',
    supportsStreaming: true,
    maxTextLength: 10000,
  },
};

// OpenAI TTS voices
export const OPENAI_TTS_VOICES = [
  { id: 'alloy', name: 'Alloy', description: 'Neutral and balanced' },
  { id: 'ash', name: 'Ash', description: 'Soft and conversational' },
  { id: 'ballad', name: 'Ballad', description: 'Warm and storytelling' },
  { id: 'coral', name: 'Coral', description: 'Clear and engaging' },
  { id: 'echo', name: 'Echo', description: 'Warm and engaging' },
  { id: 'fable', name: 'Fable', description: 'Expressive and dynamic' },
  { id: 'onyx', name: 'Onyx', description: 'Deep and authoritative' },
  { id: 'nova', name: 'Nova', description: 'Friendly and upbeat' },
  { id: 'sage', name: 'Sage', description: 'Wise and measured' },
  { id: 'shimmer', name: 'Shimmer', description: 'Clear and pleasant' },
  { id: 'verse', name: 'Verse', description: 'Versatile and expressive' },
  { id: 'marin', name: 'Marin', description: 'Natural and friendly' },
  { id: 'cedar', name: 'Cedar', description: 'Calm and grounded' },
] as const;

export type OpenAITTSVoice = (typeof OPENAI_TTS_VOICES)[number]['id'];

// OpenAI TTS models
export const OPENAI_TTS_MODELS = [
  { id: 'gpt-4o-mini-tts', name: 'GPT-4o Mini TTS', description: 'Best quality, supports instructions' },
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

// Cartesia TTS voices
export const CARTESIA_TTS_VOICES = [
  { id: 'a0e99841-438c-4a64-b679-ae501e7d6091', name: 'Barbershop Man', description: 'Warm male narrator' },
  { id: '79a125e8-cd45-4c13-8a67-188112f4dd22', name: 'British Lady', description: 'Elegant British female' },
  { id: '87748186-23bb-4571-8b7b-0e4be7e5fe10', name: 'Calm Lady', description: 'Soothing female' },
  { id: '41534e16-2966-4c6b-9670-111411def906', name: 'Confident Man', description: 'Confident male' },
  { id: 'c8f42367-f4d3-4127-91fc-6a005efeb11f', name: 'Friendly Sidekick', description: 'Friendly conversational' },
  { id: '63ff761f-c1e8-414b-b969-d1833d1c870c', name: 'Gentle Lady', description: 'Soft and gentle female' },
  { id: 'bf991597-6c13-47e4-8a8c-f35d0f7e2579', name: 'Laidback Woman', description: 'Relaxed female' },
  { id: 'ee7ea9f8-c0c1-498c-9f62-dc2627e1e3ef', name: 'Newsman', description: 'Professional news anchor' },
  { id: 'b7d50908-b89b-4ec4-b2c7-1c72b5ebb5fb', name: 'Reading Lady', description: 'Clear reading voice' },
  { id: '421b3369-f63f-4b03-8980-37a44df1d4e8', name: 'Reflective Woman', description: 'Thoughtful female' },
] as const;

export type CartesiaTTSVoice = (typeof CARTESIA_TTS_VOICES)[number]['id'];

// Cartesia TTS models
export const CARTESIA_TTS_MODELS = [
  { id: 'sonic-3', name: 'Sonic 3', description: 'Latest, highest quality' },
  { id: 'sonic-turbo', name: 'Sonic Turbo', description: 'Ultra-low latency (40ms)' },
] as const;

export type CartesiaTTSModel = (typeof CARTESIA_TTS_MODELS)[number]['id'];

// Deepgram TTS voices
export const DEEPGRAM_TTS_VOICES = [
  { id: 'aura-2-thalia-en', name: 'Thalia', description: 'Warm female', language: 'en' },
  { id: 'aura-2-andromeda-en', name: 'Andromeda', description: 'Bright female', language: 'en' },
  { id: 'aura-2-arcas-en', name: 'Arcas', description: 'Confident male', language: 'en' },
  { id: 'aura-2-luna-en', name: 'Luna', description: 'Soft female', language: 'en' },
  { id: 'aura-2-helios-en', name: 'Helios', description: 'Professional male', language: 'en' },
  { id: 'aura-2-athena-en', name: 'Athena', description: 'Clear female', language: 'en' },
  { id: 'aura-2-orion-en', name: 'Orion', description: 'Deep male', language: 'en' },
  { id: 'aura-2-stella-en', name: 'Stella', description: 'Friendly female', language: 'en' },
  { id: 'aura-2-zeus-en', name: 'Zeus', description: 'Authoritative male', language: 'en' },
  { id: 'aura-2-asteria-en', name: 'Asteria', description: 'Natural female', language: 'en' },
] as const;

export type DeepgramTTSVoice = (typeof DEEPGRAM_TTS_VOICES)[number]['id'];

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
  openaiInstructions: string; // Voice style instructions (gpt-4o-mini-tts only)

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

  // Cartesia TTS settings
  cartesiaVoice: CartesiaTTSVoice;
  cartesiaModel: CartesiaTTSModel;
  cartesiaLanguage: string;
  cartesiaSpeed: number; // -1.0 to 1.0 (normal = 0)
  cartesiaEmotion: string; // e.g., 'positivity:high', 'curiosity:high'

  // Deepgram TTS settings
  deepgramVoice: DeepgramTTSVoice;

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
  openaiModel: 'gpt-4o-mini-tts',
  openaiSpeed: 1.0,
  openaiInstructions: '',

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

  // Cartesia
  cartesiaVoice: 'a0e99841-438c-4a64-b679-ae501e7d6091',
  cartesiaModel: 'sonic-3',
  cartesiaLanguage: 'en',
  cartesiaSpeed: 0,
  cartesiaEmotion: '',

  // Deepgram
  deepgramVoice: 'aura-2-asteria-en',

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
