/**
 * Media (Image/Video/Speech/TTS) related hooks
 */

export {
  useImageGeneration,
  type UseImageGenerationOptions,
  type UseImageGenerationReturn,
} from './use-image-generation';
export {
  useVideoGeneration,
  type UseVideoGenerationOptions,
  type UseVideoGenerationReturn,
  type VideoGenerationJob,
} from './use-video-generation';
export { useSpeech, type UseSpeechOptions, type UseSpeechReturn, type SpeakOptions } from './use-speech';
export { useTTS, type UseTTSOptions, type UseTTSReturn, type TTSPlaybackState } from './use-tts';
