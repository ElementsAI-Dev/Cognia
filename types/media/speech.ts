/**
 * Speech Types - Type definitions for voice input/output functionality
 */

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

// TTS Provider types
export type TTSProvider = 'system' | 'openai' | 'gemini' | 'edge';

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

// Gemini TTS voices
export const GEMINI_TTS_VOICES = [
  { id: 'Zephyr', name: 'Zephyr', description: 'Bright' },
  { id: 'Puck', name: 'Puck', description: 'Upbeat' },
  { id: 'Charon', name: 'Charon', description: 'Informative' },
  { id: 'Kore', name: 'Kore', description: 'Firm' },
  { id: 'Fenrir', name: 'Fenrir', description: 'Excitable' },
  { id: 'Aoede', name: 'Aoede', description: 'Breezy' },
  { id: 'Enceladus', name: 'Enceladus', description: 'Breathy' },
  { id: 'Iapetus', name: 'Iapetus', description: 'Clear' },
  { id: 'Achernar', name: 'Achernar', description: 'Soft' },
  { id: 'Schedar', name: 'Schedar', description: 'Even' },
  { id: 'Gacrux', name: 'Gacrux', description: 'Mature' },
  { id: 'Sulafat', name: 'Sulafat', description: 'Warm' },
] as const;

export type GeminiTTSVoice = (typeof GEMINI_TTS_VOICES)[number]['id'];

// Edge TTS popular voices
export const EDGE_TTS_VOICES = [
  // Chinese
  { id: 'zh-CN-XiaoxiaoNeural', name: 'Xiaoxiao (女)', language: 'zh-CN', gender: 'Female' },
  { id: 'zh-CN-YunxiNeural', name: 'Yunxi (男)', language: 'zh-CN', gender: 'Male' },
  { id: 'zh-CN-YunyangNeural', name: 'Yunyang (男)', language: 'zh-CN', gender: 'Male' },
  { id: 'zh-TW-HsiaoChenNeural', name: 'HsiaoChen (女)', language: 'zh-TW', gender: 'Female' },
  // English
  { id: 'en-US-JennyNeural', name: 'Jenny (Female)', language: 'en-US', gender: 'Female' },
  { id: 'en-US-GuyNeural', name: 'Guy (Male)', language: 'en-US', gender: 'Male' },
  { id: 'en-US-AriaNeural', name: 'Aria (Female)', language: 'en-US', gender: 'Female' },
  { id: 'en-GB-SoniaNeural', name: 'Sonia (Female)', language: 'en-GB', gender: 'Female' },
  // Japanese
  { id: 'ja-JP-NanamiNeural', name: 'Nanami (Female)', language: 'ja-JP', gender: 'Female' },
  { id: 'ja-JP-KeitaNeural', name: 'Keita (Male)', language: 'ja-JP', gender: 'Male' },
  // Korean
  { id: 'ko-KR-SunHiNeural', name: 'SunHi (Female)', language: 'ko-KR', gender: 'Female' },
  { id: 'ko-KR-InJoonNeural', name: 'InJoon (Male)', language: 'ko-KR', gender: 'Male' },
] as const;

export type EdgeTTSVoice = (typeof EDGE_TTS_VOICES)[number]['id'];

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
  openaiTtsModel: 'tts-1' | 'tts-1-hd';
  openaiTtsSpeed: number; // 0.25 - 4.0

  // Gemini TTS settings
  geminiTtsVoice: GeminiTTSVoice;

  // Edge TTS settings
  edgeTtsVoice: EdgeTTSVoice;
  edgeTtsRate: string; // e.g., '+0%', '-10%', '+20%'
  edgeTtsPitch: string; // e.g., '+0Hz', '-10Hz', '+20Hz'
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
  openaiTtsModel: 'tts-1',
  openaiTtsSpeed: 1.0,

  // Gemini TTS defaults
  geminiTtsVoice: 'Kore',

  // Edge TTS defaults
  edgeTtsVoice: 'zh-CN-XiaoxiaoNeural',
  edgeTtsRate: '+0%',
  edgeTtsPitch: '+0Hz',
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
