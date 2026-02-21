import type { SpeechSettings } from '@/types/media/speech';
import type {
  CartesiaTTSModel,
  CartesiaTTSVoice,
  DeepgramTTSVoice,
  EdgeTTSVoice,
  ElevenLabsTTSModel,
  ElevenLabsTTSVoice,
  GeminiTTSVoice,
  HumeTTSVoice,
  LMNTTTSVoice,
  OpenAITTSModel,
  OpenAITTSVoice,
  TTSProvider,
  TTSSettings,
} from '@/types/media/tts';

export function toTTSSettings(settings: SpeechSettings): TTSSettings {
  return {
    ttsProvider: settings.ttsProvider,
    systemVoice: settings.ttsVoice,
    openaiVoice: settings.openaiTtsVoice,
    openaiModel: settings.openaiTtsModel,
    openaiSpeed: settings.openaiTtsSpeed,
    openaiInstructions: settings.openaiTtsInstructions,
    geminiVoice: settings.geminiTtsVoice,
    edgeVoice: settings.edgeTtsVoice,
    edgeRate: settings.edgeTtsRate,
    edgePitch: settings.edgeTtsPitch,
    elevenlabsVoice: settings.elevenlabsTtsVoice,
    elevenlabsModel: settings.elevenlabsTtsModel,
    elevenlabsStability: settings.elevenlabsTtsStability,
    elevenlabsSimilarityBoost: settings.elevenlabsTtsSimilarityBoost,
    lmntVoice: settings.lmntTtsVoice,
    lmntSpeed: settings.lmntTtsSpeed,
    humeVoice: settings.humeTtsVoice,
    cartesiaVoice: settings.cartesiaTtsVoice,
    cartesiaModel: settings.cartesiaTtsModel,
    cartesiaLanguage: settings.cartesiaTtsLanguage,
    cartesiaSpeed: settings.cartesiaTtsSpeed,
    cartesiaEmotion: settings.cartesiaTtsEmotion,
    deepgramVoice: settings.deepgramTtsVoice,
    ttsEnabled: settings.ttsEnabled,
    ttsRate: settings.ttsRate,
    ttsPitch: settings.ttsPitch,
    ttsVolume: settings.ttsVolume,
    ttsAutoPlay: settings.ttsAutoPlay,
    ttsCacheEnabled: settings.ttsCacheEnabled,
  };
}

export function getProviderRuntimeOptions(settings: SpeechSettings, provider: TTSProvider): Record<string, unknown> {
  switch (provider) {
    case 'system':
      return {
        voice: settings.ttsVoice,
        rate: settings.ttsRate,
        pitch: settings.ttsPitch,
        volume: settings.ttsVolume,
        lang: settings.sttLanguage,
      };

    case 'openai':
      return {
        voice: settings.openaiTtsVoice as OpenAITTSVoice,
        model: settings.openaiTtsModel as OpenAITTSModel,
        speed: settings.openaiTtsSpeed,
        instructions: settings.openaiTtsInstructions,
      };

    case 'gemini':
      return {
        voice: settings.geminiTtsVoice as GeminiTTSVoice,
      };

    case 'edge':
      return {
        voice: settings.edgeTtsVoice as EdgeTTSVoice,
        rate: settings.edgeTtsRate,
        pitch: settings.edgeTtsPitch,
      };

    case 'elevenlabs':
      return {
        voice: settings.elevenlabsTtsVoice as ElevenLabsTTSVoice,
        model: settings.elevenlabsTtsModel as ElevenLabsTTSModel,
        stability: settings.elevenlabsTtsStability,
        similarityBoost: settings.elevenlabsTtsSimilarityBoost,
      };

    case 'lmnt':
      return {
        voice: settings.lmntTtsVoice as LMNTTTSVoice,
        speed: settings.lmntTtsSpeed,
      };

    case 'hume':
      return {
        voice: settings.humeTtsVoice as HumeTTSVoice,
      };

    case 'cartesia':
      return {
        voice: settings.cartesiaTtsVoice as CartesiaTTSVoice,
        model: settings.cartesiaTtsModel as CartesiaTTSModel,
        language: settings.cartesiaTtsLanguage,
        speed: settings.cartesiaTtsSpeed,
        emotion: settings.cartesiaTtsEmotion,
      };

    case 'deepgram':
      return {
        voice: settings.deepgramTtsVoice as DeepgramTTSVoice,
      };

    default:
      return {};
  }
}

