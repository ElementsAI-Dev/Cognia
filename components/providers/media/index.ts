/**
 * Media Providers - Audio and speech features
 *
 * Handles text-to-speech, speech-to-text, and audio playback capabilities
 */

export {
  AudioProvider,
  useAudio,
  useSpeechToText,
  useTextToSpeech,
  type RecordingState,
  type PlaybackState,
  type SpeechRecognitionResult,
  type RecordingOptions,
  // Type definitions
  type ISpeechRecognition,
  type ISpeechRecognitionErrorEvent,
  type ISpeechRecognitionEvent,
  type ISpeechRecognitionResult,
  type ISpeechRecognitionAlternative,
  type SpeechRecognitionResultList,
  // Type guards
  isSpeechRecognitionSupported,
  getSpeechRecognition,
  isSpeechSynthesisSupported,
} from './audio-provider';

// Default export for convenience
export { default } from './audio-provider';
