/**
 * Media generation - Image, video, and speech
 */

// Image generation (SDK-compatible)
export {
  generateImageWithSDK,
  generateImagesBatchWithSDK,
  getAvailableImageModels as getSDKAvailableImageModels,
  validateSizeForModel as validateSDKSizeForModel,
  base64ToDataURL,
  uint8ArrayToBlob,
  downloadImage as downloadSDKImage,
  estimateImageCost as estimateSDKImageCost,
  ImageGenerationError,
  DEFAULT_IMAGE_MODELS,
  MODEL_SUPPORTED_SIZES,
  type SDKImageGenerationOptions,
  type SDKGeneratedImage,
  type SDKImageGenerationResult,
  type ImageProviderType,
  type ImageSizeOption,
  type AspectRatioOption,
  type ImageQualityOption,
  type ImageStyleOption,
} from './image-generation-sdk';

// Image utilities (excluding isVisionModel and buildMultimodalContent which are in core/client.ts)
export {
  fileToBase64,
  urlToBase64,
  extractBase64,
  isImageFile,
  resizeImageIfNeeded,
  type ImageContent,
  type TextContent,
  type MessageContent,
} from './image-utils';

// Audio/Video utilities
export {
  isAudioFile,
  isVideoFile,
  isAudioModel,
  isVideoModel,
  isSupportedAudioFormat,
  isSupportedVideoFormat,
  getAudioFormat,
  processAudioFile,
  processVideoFile,
  audioUrlToBase64,
  videoUrlToBase64,
  isYouTubeUrl,
  getMediaFileSizeLimit,
  validateMediaFileSize,
  estimateVideoDuration,
  SUPPORTED_AUDIO_FORMATS,
  SUPPORTED_VIDEO_FORMATS,
  type AudioContent,
  type VideoContent,
  type SupportedAudioFormat,
  type SupportedVideoFormat,
} from './media-utils';

// Legacy image generation
export * from './image-generation';

// Video generation
export * from './video-generation';

// Speech API
export * from './speech-api';
