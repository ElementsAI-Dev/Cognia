/**
 * Speech Types - Type definitions for voice input/output functionality
 */

import type {
  TTSProvider,
  OpenAITTSVoice,
  OpenAITTSModel,
  GeminiTTSVoice,
  EdgeTTSVoice,
  ElevenLabsTTSVoice,
  ElevenLabsTTSModel,
  LMNTTTSVoice,
  HumeTTSVoice,
  CartesiaTTSVoice,
  CartesiaTTSModel,
  DeepgramTTSVoice,
} from './tts';

// Re-export TTSProvider from tts.ts (single source of truth)
export type { TTSProvider } from './tts';

// Re-export voice/model constants from tts.ts (single source of truth)
export {
  OPENAI_TTS_VOICES,
  type OpenAITTSVoice,
  GEMINI_TTS_VOICES,
  type GeminiTTSVoice,
  EDGE_TTS_VOICES,
  type EdgeTTSVoice,
  OPENAI_TTS_MODELS,
  ELEVENLABS_TTS_VOICES,
  ELEVENLABS_TTS_MODELS,
  LMNT_TTS_VOICES,
  HUME_TTS_VOICES,
  CARTESIA_TTS_VOICES,
  CARTESIA_TTS_MODELS,
  DEEPGRAM_TTS_VOICES,
} from './tts';

// Supported speech recognition languages
export const SPEECH_LANGUAGES = [
  { code: 'zh-CN', name: '中文 (简体)', flag: '🇨🇳' },
  { code: 'zh-TW', name: '中文 (繁體)', flag: '🇹🇼' },
  { code: 'en-US', name: 'English (US)', flag: '🇺🇸' },
  { code: 'en-GB', name: 'English (UK)', flag: '🇬🇧' },
  { code: 'ja-JP', name: '日本語', flag: '🇯🇵' },
  { code: 'ko-KR', name: '한국어', flag: '🇰🇷' },
  { code: 'es-ES', name: 'Español', flag: '🇪🇸' },
  { code: 'fr-FR', name: 'Français', flag: '🇫🇷' },
  { code: 'de-DE', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'it-IT', name: 'Italiano', flag: '🇮🇹' },
  { code: 'pt-BR', name: 'Português (Brasil)', flag: '🇧🇷' },
  { code: 'ru-RU', name: 'Русский', flag: '🇷🇺' },
  { code: 'ar-SA', name: 'العربية', flag: '🇸🇦' },
  { code: 'hi-IN', name: 'हिन्दी', flag: '🇮🇳' },
] as const;

export type SpeechLanguageCode = (typeof SPEECH_LANGUAGES)[number]['code'];

// Speech recognition provider types
export type SpeechProvider = 'system' | 'openai';

// Speech recognition settings interface
export interface SpeechSettings {
  // STT (Speech-to-Text) settings
  sttEnabled: boolean;
  sttLanguage: SpeechLanguageCode;
  sttProvider: SpeechProvider;
  sttContinuous: boolean;
  sttInterimResults: boolean;
  sttAutoSend: boolean;
  sttAutoStopSilence: number; // milliseconds of silence before auto-stop (0 = disabled)

  // TTS (Text-to-Speech) settings
  ttsEnabled: boolean;
  ttsProvider: TTSProvider;
  ttsVoice: string; // System voice name
  ttsRate: number; // 0.1 - 10
  ttsPitch: number; // 0 - 2
  ttsVolume: number; // 0 - 1
  ttsAutoPlay: boolean; // Auto-play AI responses

  // OpenAI TTS settings
  openaiTtsVoice: OpenAITTSVoice;
  openaiTtsModel: OpenAITTSModel;
  openaiTtsSpeed: number; // 0.25 - 4.0
  openaiTtsInstructions: string; // Voice style instructions (gpt-4o-mini-tts only)

  // Gemini TTS settings
  geminiTtsVoice: GeminiTTSVoice;

  // Edge TTS settings
  edgeTtsVoice: EdgeTTSVoice;
  edgeTtsRate: string; // e.g., '+0%', '-10%', '+20%'
  edgeTtsPitch: string; // e.g., '+0Hz', '-10Hz', '+20Hz'

  // ElevenLabs TTS settings
  elevenlabsTtsVoice: ElevenLabsTTSVoice;
  elevenlabsTtsModel: ElevenLabsTTSModel;
  elevenlabsTtsStability: number; // 0 - 1
  elevenlabsTtsSimilarityBoost: number; // 0 - 1

  // LMNT TTS settings
  lmntTtsVoice: LMNTTTSVoice;
  lmntTtsSpeed: number; // 0.5 - 2.0

  // Hume TTS settings
  humeTtsVoice: HumeTTSVoice;

  // Cartesia TTS settings
  cartesiaTtsVoice: CartesiaTTSVoice;
  cartesiaTtsModel: CartesiaTTSModel;
  cartesiaTtsLanguage: string;
  cartesiaTtsSpeed: number; // -1.0 to 1.0 (normal = 0)
  cartesiaTtsEmotion: string; // e.g., 'positivity:high'

  // Deepgram TTS settings
  deepgramTtsVoice: DeepgramTTSVoice;
}

// Default speech settings
export const DEFAULT_SPEECH_SETTINGS: SpeechSettings = {
  // STT defaults
  sttEnabled: true,
  sttLanguage: 'zh-CN',
  sttProvider: 'system',
  sttContinuous: true,
  sttInterimResults: true,
  sttAutoSend: false,
  sttAutoStopSilence: 3000,

  // TTS defaults
  ttsEnabled: false,
  ttsProvider: 'system',
  ttsVoice: '',
  ttsRate: 1.0,
  ttsPitch: 1.0,
  ttsVolume: 1.0,
  ttsAutoPlay: false,

  // OpenAI TTS defaults
  openaiTtsVoice: 'alloy',
  openaiTtsModel: 'gpt-4o-mini-tts',
  openaiTtsSpeed: 1.0,
  openaiTtsInstructions: '',

  // Gemini TTS defaults
  geminiTtsVoice: 'Kore',

  // Edge TTS defaults
  edgeTtsVoice: 'zh-CN-XiaoxiaoNeural',
  edgeTtsRate: '+0%',
  edgeTtsPitch: '+0Hz',

  // ElevenLabs TTS defaults
  elevenlabsTtsVoice: 'rachel',
  elevenlabsTtsModel: 'eleven_multilingual_v2',
  elevenlabsTtsStability: 0.5,
  elevenlabsTtsSimilarityBoost: 0.75,

  // LMNT TTS defaults
  lmntTtsVoice: 'lily',
  lmntTtsSpeed: 1.0,

  // Hume TTS defaults
  humeTtsVoice: 'kora',

  // Cartesia TTS defaults
  cartesiaTtsVoice: 'a0e99841-438c-4a64-b679-ae501e7d6091',
  cartesiaTtsModel: 'sonic-3',
  cartesiaTtsLanguage: 'en',
  cartesiaTtsSpeed: 0,
  cartesiaTtsEmotion: '',

  // Deepgram TTS defaults
  deepgramTtsVoice: 'aura-2-asteria-en',
};

// Speech recognition result
export interface SpeechRecognitionResult {
  transcript: string;
  isFinal: boolean;
  confidence: number;
}

// Speech API request/response types
export interface WhisperTranscriptionRequest {
  audio: Blob;
  language?: string;
  prompt?: string;
  temperature?: number;
}

export interface WhisperTranscriptionResponse {
  text: string;
  language?: string;
  duration?: number;
  segments?: WhisperSegment[];
}

export interface WhisperSegment {
  id: number;
  start: number;
  end: number;
  text: string;
}

// Audio recording state
export interface AudioRecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number; // milliseconds
  audioLevel: number; // 0-1 normalized volume level
}

// Speech recognition error types
export type SpeechErrorType =
  | 'not-supported'
  | 'no-speech'
  | 'audio-capture'
  | 'not-allowed'
  | 'network'
  | 'aborted'
  | 'language-not-supported'
  | 'service-not-allowed'
  | 'api-error';

export interface SpeechError {
  type: SpeechErrorType;
  message: string;
  recoverable: boolean;
}

// Speech error messages
export const SPEECH_ERROR_MESSAGES: Record<
  SpeechErrorType,
  { message: string; recoverable: boolean }
> = {
  'not-supported': {
    message: 'Speech recognition is not supported in this browser.',
    recoverable: false,
  },
  'no-speech': {
    message: 'No speech was detected. Please try again.',
    recoverable: true,
  },
  'audio-capture': {
    message: 'No microphone was found or microphone access was denied.',
    recoverable: false,
  },
  'not-allowed': {
    message: 'Microphone permission was denied. Please allow microphone access.',
    recoverable: false,
  },
  network: {
    message: 'Network error occurred during speech recognition.',
    recoverable: true,
  },
  aborted: {
    message: 'Speech recognition was aborted.',
    recoverable: true,
  },
  'language-not-supported': {
    message: 'The selected language is not supported.',
    recoverable: false,
  },
  'service-not-allowed': {
    message: 'Speech recognition service is not allowed.',
    recoverable: false,
  },
  'api-error': {
    message: 'Speech API error occurred.',
    recoverable: true,
  },
};

// Helper function to get error details
export function getSpeechError(type: SpeechErrorType): SpeechError {
  const errorInfo = SPEECH_ERROR_MESSAGES[type];
  return {
    type,
    ...errorInfo,
  };
}

// Helper function to check if speech recognition is supported
export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
}

// Helper function to check if speech synthesis is supported
export function isSpeechSynthesisSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'speechSynthesis' in window;
}

// Helper function to get language name by code
export function getSpeechLanguageName(code: SpeechLanguageCode): string {
  const lang = SPEECH_LANGUAGES.find((l) => l.code === code);
  return lang?.name || code;
}

// Helper function to get language flag by code
export function getLanguageFlag(code: SpeechLanguageCode): string {
  const lang = SPEECH_LANGUAGES.find((l) => l.code === code);
  return lang?.flag || '🌐';
}
