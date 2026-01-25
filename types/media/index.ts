/**
 * Media types - audio, video, speech, TTS, subtitles, video processing
 */

export * from './audio';
export * from './video';
export * from './video-processing';
// speech.ts has some exports that duplicate tts.ts - export non-conflicting items
export {
  SPEECH_LANGUAGES,
  type SpeechLanguageCode,
  type SpeechProvider,
  type SpeechSettings,
  DEFAULT_SPEECH_SETTINGS,
  type SpeechRecognitionResult,
  type WhisperTranscriptionRequest,
  type WhisperTranscriptionResponse,
  type WhisperSegment,
  type AudioRecordingState,
  type SpeechErrorType,
  type SpeechError,
  SPEECH_ERROR_MESSAGES,
  getSpeechError,
  isSpeechRecognitionSupported,
  isSpeechSynthesisSupported,
  getSpeechLanguageName,
  getLanguageFlag,
} from './speech';
export * from './tts';
export * from './subtitle';
export * from './image-studio';
