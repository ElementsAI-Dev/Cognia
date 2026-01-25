/**
 * Codec Detection Module
 *
 * Detects browser codec support and capabilities for video processing.
 */

import type { VideoCodec, AudioCodec } from '../workers/worker-types';

/**
 * Codec support information
 */
export interface CodecSupport {
  codec: VideoCodec | AudioCodec;
  supported: boolean;
  hardwareAccelerated: boolean;
  powerEfficient: boolean;
}

/**
 * Browser video capabilities
 */
export interface BrowserVideoCapabilities {
  supportsMediaRecorder: boolean;
  supportsMediaSource: boolean;
  supportsWebCodecs: boolean;
  supportsOffscreenCanvas: boolean;
  supportsImageCapture: boolean;
  maxVideoWidth: number;
  maxVideoHeight: number;
}

/**
 * Full codec detection result
 */
export interface CodecDetectionResult {
  videoCodecs: CodecSupport[];
  audioCodecs: CodecSupport[];
  capabilities: BrowserVideoCapabilities;
  recommendedVideoCodec: VideoCodec;
  recommendedAudioCodec: AudioCodec;
}

/**
 * Video codec MIME type mappings
 */
const VIDEO_CODEC_MIME_TYPES: Record<VideoCodec, string[]> = {
  h264: ['video/mp4; codecs="avc1.42E01E"', 'video/mp4; codecs="avc1.4D401E"', 'video/mp4; codecs="avc1.64001E"'],
  h265: ['video/mp4; codecs="hev1.1.6.L93.B0"', 'video/mp4; codecs="hvc1.1.6.L93.B0"'],
  vp8: ['video/webm; codecs="vp8"'],
  vp9: ['video/webm; codecs="vp9"', 'video/webm; codecs="vp09.00.10.08"'],
  av1: ['video/mp4; codecs="av01.0.01M.08"', 'video/webm; codecs="av01.0.01M.08"'],
  prores: ['video/quicktime; codecs="ap4h"'],
  dnxhd: ['video/mxf; codecs="dnxhd"'],
};

/**
 * Audio codec MIME type mappings
 */
const AUDIO_CODEC_MIME_TYPES: Record<AudioCodec, string[]> = {
  aac: ['audio/mp4; codecs="mp4a.40.2"', 'audio/aac'],
  opus: ['audio/webm; codecs="opus"', 'audio/ogg; codecs="opus"'],
  mp3: ['audio/mpeg', 'audio/mp3'],
  pcm: ['audio/wav', 'audio/wave'],
  flac: ['audio/flac'],
};

/**
 * Check if a MIME type is supported by MediaRecorder
 */
function isMediaRecorderSupported(mimeType: string): boolean {
  if (typeof MediaRecorder === 'undefined') return false;
  try {
    return MediaRecorder.isTypeSupported(mimeType);
  } catch {
    return false;
  }
}

/**
 * Check if a MIME type is supported by MediaSource
 */
function isMediaSourceSupported(mimeType: string): boolean {
  if (typeof MediaSource === 'undefined') return false;
  try {
    return MediaSource.isTypeSupported(mimeType);
  } catch {
    return false;
  }
}

/**
 * Check video codec support using WebCodecs API
 */
async function checkWebCodecsVideoSupport(codec: VideoCodec): Promise<CodecSupport> {
  const result: CodecSupport = {
    codec,
    supported: false,
    hardwareAccelerated: false,
    powerEfficient: false,
  };

  if (typeof VideoEncoder === 'undefined' || typeof VideoDecoder === 'undefined') {
    return result;
  }

  try {
    // Check encoder support
    const encoderConfig = getVideoEncoderConfig(codec);
    if (encoderConfig) {
      const encoderSupport = await VideoEncoder.isConfigSupported(encoderConfig);
      if (encoderSupport.supported) {
        result.supported = true;
        result.hardwareAccelerated = encoderSupport.config?.hardwareAcceleration === 'prefer-hardware';
      }
    }

    // Check decoder support
    const decoderConfig = getVideoDecoderConfig(codec);
    if (decoderConfig) {
      const decoderSupport = await VideoDecoder.isConfigSupported(decoderConfig);
      if (decoderSupport.supported) {
        result.supported = true;
      }
    }
  } catch {
    // WebCodecs not fully supported
  }

  return result;
}

/**
 * Get video encoder config for a codec
 */
function getVideoEncoderConfig(codec: VideoCodec): VideoEncoderConfig | null {
  const baseConfig = {
    width: 1920,
    height: 1080,
    bitrate: 8_000_000,
    framerate: 30,
  };

  switch (codec) {
    case 'h264':
      return { ...baseConfig, codec: 'avc1.42E01E' };
    case 'h265':
      return { ...baseConfig, codec: 'hev1.1.6.L93.B0' };
    case 'vp8':
      return { ...baseConfig, codec: 'vp8' };
    case 'vp9':
      return { ...baseConfig, codec: 'vp09.00.10.08' };
    case 'av1':
      return { ...baseConfig, codec: 'av01.0.01M.08' };
    default:
      return null;
  }
}

/**
 * Get video decoder config for a codec
 */
function getVideoDecoderConfig(codec: VideoCodec): VideoDecoderConfig | null {
  switch (codec) {
    case 'h264':
      return { codec: 'avc1.42E01E' };
    case 'h265':
      return { codec: 'hev1.1.6.L93.B0' };
    case 'vp8':
      return { codec: 'vp8' };
    case 'vp9':
      return { codec: 'vp09.00.10.08' };
    case 'av1':
      return { codec: 'av01.0.01M.08' };
    default:
      return null;
  }
}

/**
 * Check audio codec support using WebCodecs API
 */
async function checkWebCodecsAudioSupport(codec: AudioCodec): Promise<CodecSupport> {
  const result: CodecSupport = {
    codec,
    supported: false,
    hardwareAccelerated: false,
    powerEfficient: false,
  };

  if (typeof AudioEncoder === 'undefined' || typeof AudioDecoder === 'undefined') {
    return result;
  }

  try {
    const encoderConfig = getAudioEncoderConfig(codec);
    if (encoderConfig) {
      const support = await AudioEncoder.isConfigSupported(encoderConfig);
      result.supported = support.supported ?? false;
    }
  } catch {
    // WebCodecs not fully supported
  }

  return result;
}

/**
 * Get audio encoder config for a codec
 */
function getAudioEncoderConfig(codec: AudioCodec): AudioEncoderConfig | null {
  const baseConfig = {
    numberOfChannels: 2,
    sampleRate: 48000,
    bitrate: 128000,
  };

  switch (codec) {
    case 'aac':
      return { ...baseConfig, codec: 'mp4a.40.2' };
    case 'opus':
      return { ...baseConfig, codec: 'opus' };
    case 'mp3':
      return { ...baseConfig, codec: 'mp3' };
    case 'pcm':
      return { ...baseConfig, codec: 'pcm-s16le' };
    case 'flac':
      return { ...baseConfig, codec: 'flac' };
    default:
      return null;
  }
}

/**
 * Check basic video codec support (MediaRecorder + MediaSource)
 */
function checkBasicVideoCodecSupport(codec: VideoCodec): CodecSupport {
  const mimeTypes = VIDEO_CODEC_MIME_TYPES[codec] || [];
  const supported = mimeTypes.some(
    (mime) => isMediaRecorderSupported(mime) || isMediaSourceSupported(mime)
  );

  return {
    codec,
    supported,
    hardwareAccelerated: false,
    powerEfficient: false,
  };
}

/**
 * Check basic audio codec support
 */
function checkBasicAudioCodecSupport(codec: AudioCodec): CodecSupport {
  const mimeTypes = AUDIO_CODEC_MIME_TYPES[codec] || [];
  const supported = mimeTypes.some(
    (mime) => isMediaRecorderSupported(mime) || isMediaSourceSupported(mime)
  );

  return {
    codec,
    supported,
    hardwareAccelerated: false,
    powerEfficient: false,
  };
}

/**
 * Detect browser video capabilities
 */
function detectBrowserCapabilities(): BrowserVideoCapabilities {
  return {
    supportsMediaRecorder: typeof MediaRecorder !== 'undefined',
    supportsMediaSource: typeof MediaSource !== 'undefined',
    supportsWebCodecs:
      typeof VideoEncoder !== 'undefined' && typeof VideoDecoder !== 'undefined',
    supportsOffscreenCanvas: typeof OffscreenCanvas !== 'undefined',
    supportsImageCapture: typeof ImageCapture !== 'undefined',
    maxVideoWidth: 7680, // 8K
    maxVideoHeight: 4320,
  };
}

/**
 * Get recommended video codec based on browser support
 */
function getRecommendedVideoCodec(codecs: CodecSupport[]): VideoCodec {
  // Prefer hardware-accelerated codecs
  const hwAccelerated = codecs.find((c) => c.supported && c.hardwareAccelerated);
  if (hwAccelerated) return hwAccelerated.codec as VideoCodec;

  // Prefer modern codecs in order: AV1 > VP9 > H.265 > H.264 > VP8
  const preference: VideoCodec[] = ['av1', 'vp9', 'h265', 'h264', 'vp8'];
  for (const codec of preference) {
    const support = codecs.find((c) => c.codec === codec && c.supported);
    if (support) return codec;
  }

  // Fallback to H.264 (most compatible)
  return 'h264';
}

/**
 * Get recommended audio codec based on browser support
 */
function getRecommendedAudioCodec(codecs: CodecSupport[]): AudioCodec {
  // Prefer Opus > AAC > MP3
  const preference: AudioCodec[] = ['opus', 'aac', 'mp3', 'flac', 'pcm'];
  for (const codec of preference) {
    const support = codecs.find((c) => c.codec === codec && c.supported);
    if (support) return codec;
  }

  return 'aac';
}

/**
 * Detect all codec support
 */
export async function detectCodecSupport(): Promise<CodecDetectionResult> {
  const videoCodecs: VideoCodec[] = ['h264', 'h265', 'vp8', 'vp9', 'av1'];
  const audioCodecs: AudioCodec[] = ['aac', 'opus', 'mp3', 'pcm', 'flac'];

  const capabilities = detectBrowserCapabilities();

  // Check video codecs
  const videoCodecResults: CodecSupport[] = [];
  for (const codec of videoCodecs) {
    if (capabilities.supportsWebCodecs) {
      const webCodecsResult = await checkWebCodecsVideoSupport(codec);
      if (webCodecsResult.supported) {
        videoCodecResults.push(webCodecsResult);
        continue;
      }
    }
    videoCodecResults.push(checkBasicVideoCodecSupport(codec));
  }

  // Check audio codecs
  const audioCodecResults: CodecSupport[] = [];
  for (const codec of audioCodecs) {
    if (capabilities.supportsWebCodecs) {
      const webCodecsResult = await checkWebCodecsAudioSupport(codec);
      if (webCodecsResult.supported) {
        audioCodecResults.push(webCodecsResult);
        continue;
      }
    }
    audioCodecResults.push(checkBasicAudioCodecSupport(codec));
  }

  return {
    videoCodecs: videoCodecResults,
    audioCodecs: audioCodecResults,
    capabilities,
    recommendedVideoCodec: getRecommendedVideoCodec(videoCodecResults),
    recommendedAudioCodec: getRecommendedAudioCodec(audioCodecResults),
  };
}

/**
 * Check if a specific video codec is supported
 */
export async function isVideoCodecSupported(codec: VideoCodec): Promise<boolean> {
  const result = await detectCodecSupport();
  const codecSupport = result.videoCodecs.find((c) => c.codec === codec);
  return codecSupport?.supported ?? false;
}

/**
 * Check if a specific audio codec is supported
 */
export async function isAudioCodecSupported(codec: AudioCodec): Promise<boolean> {
  const result = await detectCodecSupport();
  const codecSupport = result.audioCodecs.find((c) => c.codec === codec);
  return codecSupport?.supported ?? false;
}

/**
 * Get the best available video codec
 */
export async function getBestVideoCodec(): Promise<VideoCodec> {
  const result = await detectCodecSupport();
  return result.recommendedVideoCodec;
}

/**
 * Get the best available audio codec
 */
export async function getBestAudioCodec(): Promise<AudioCodec> {
  const result = await detectCodecSupport();
  return result.recommendedAudioCodec;
}
