/**
 * Tests for Media Utilities
 */

import {
  SUPPORTED_AUDIO_FORMATS,
  SUPPORTED_VIDEO_FORMATS,
  isAudioFile,
  isVideoFile,
  isSupportedAudioFormat,
  isSupportedVideoFormat,
  getAudioFormat,
  isAudioModel,
  isVideoModel,
  isYouTubeUrl,
  getMediaFileSizeLimit,
  validateMediaFileSize,
  estimateVideoDuration,
} from './media-utils';

describe('SUPPORTED_AUDIO_FORMATS', () => {
  it('should contain common audio formats', () => {
    expect(SUPPORTED_AUDIO_FORMATS).toContain('audio/wav');
    expect(SUPPORTED_AUDIO_FORMATS).toContain('audio/mp3');
    expect(SUPPORTED_AUDIO_FORMATS).toContain('audio/mpeg');
    expect(SUPPORTED_AUDIO_FORMATS).toContain('audio/ogg');
  });
});

describe('SUPPORTED_VIDEO_FORMATS', () => {
  it('should contain common video formats', () => {
    expect(SUPPORTED_VIDEO_FORMATS).toContain('video/mp4');
    expect(SUPPORTED_VIDEO_FORMATS).toContain('video/webm');
    expect(SUPPORTED_VIDEO_FORMATS).toContain('video/quicktime');
  });
});

describe('isAudioFile', () => {
  it('should return true for audio mime types', () => {
    expect(isAudioFile('audio/wav')).toBe(true);
    expect(isAudioFile('audio/mp3')).toBe(true);
    expect(isAudioFile('audio/mpeg')).toBe(true);
  });

  it('should return false for non-audio mime types', () => {
    expect(isAudioFile('video/mp4')).toBe(false);
    expect(isAudioFile('image/png')).toBe(false);
    expect(isAudioFile('text/plain')).toBe(false);
  });
});

describe('isVideoFile', () => {
  it('should return true for video mime types', () => {
    expect(isVideoFile('video/mp4')).toBe(true);
    expect(isVideoFile('video/webm')).toBe(true);
    expect(isVideoFile('video/quicktime')).toBe(true);
  });

  it('should return false for non-video mime types', () => {
    expect(isVideoFile('audio/mp3')).toBe(false);
    expect(isVideoFile('image/png')).toBe(false);
    expect(isVideoFile('text/plain')).toBe(false);
  });
});

describe('isSupportedAudioFormat', () => {
  it('should return true for supported formats', () => {
    expect(isSupportedAudioFormat('audio/wav')).toBe(true);
    expect(isSupportedAudioFormat('audio/mp3')).toBe(true);
    expect(isSupportedAudioFormat('audio/mpeg')).toBe(true);
  });

  it('should handle case insensitivity', () => {
    expect(isSupportedAudioFormat('AUDIO/WAV')).toBe(true);
    expect(isSupportedAudioFormat('Audio/Mp3')).toBe(true);
  });

  it('should return true for audio subtypes', () => {
    expect(isSupportedAudioFormat('audio/x-custom')).toBe(true);
  });
});

describe('isSupportedVideoFormat', () => {
  it('should return true for supported formats', () => {
    expect(isSupportedVideoFormat('video/mp4')).toBe(true);
    expect(isSupportedVideoFormat('video/webm')).toBe(true);
  });

  it('should handle case insensitivity', () => {
    expect(isSupportedVideoFormat('VIDEO/MP4')).toBe(true);
  });

  it('should return true for video subtypes', () => {
    expect(isSupportedVideoFormat('video/x-custom')).toBe(true);
  });
});

describe('getAudioFormat', () => {
  it('should return format for known mime types', () => {
    expect(getAudioFormat('audio/wav')).toBe('wav');
    expect(getAudioFormat('audio/mp3')).toBe('mp3');
    expect(getAudioFormat('audio/mpeg')).toBe('mp3');
    expect(getAudioFormat('audio/ogg')).toBe('ogg');
    expect(getAudioFormat('audio/flac')).toBe('flac');
  });

  it('should handle x-wav format', () => {
    expect(getAudioFormat('audio/x-wav')).toBe('wav');
  });

  it('should extract format from unknown mime types', () => {
    expect(getAudioFormat('audio/custom')).toBe('custom');
  });

  it('should default to wav for invalid format', () => {
    expect(getAudioFormat('invalid')).toBe('wav');
  });
});

describe('isAudioModel', () => {
  it('should return true for audio-capable models', () => {
    expect(isAudioModel('gpt-4o')).toBe(true);
    expect(isAudioModel('gpt-4o-mini')).toBe(true);
    expect(isAudioModel('gemini-2.0-flash')).toBe(true);
    expect(isAudioModel('gemini-1.5-pro')).toBe(true);
    expect(isAudioModel('gemini-1.5-flash')).toBe(true);
  });

  it('should return false for non-audio models', () => {
    expect(isAudioModel('gpt-3.5-turbo')).toBe(false);
    expect(isAudioModel('claude-3-opus')).toBe(false);
    expect(isAudioModel('llama-2')).toBe(false);
  });

  it('should handle case insensitivity', () => {
    expect(isAudioModel('GPT-4O')).toBe(true);
    expect(isAudioModel('GEMINI-2.0-FLASH')).toBe(true);
  });

  it('should match partial model names', () => {
    expect(isAudioModel('gemini-1.5-pro-latest')).toBe(true);
    expect(isAudioModel('gpt-4o-2024-01-01')).toBe(true);
  });
});

describe('isVideoModel', () => {
  it('should return true for video-capable models', () => {
    expect(isVideoModel('gemini-2.0-flash')).toBe(true);
    expect(isVideoModel('gemini-1.5-pro')).toBe(true);
    expect(isVideoModel('gemini-1.5-flash')).toBe(true);
  });

  it('should return false for non-video models', () => {
    expect(isVideoModel('gpt-4o')).toBe(false);
    expect(isVideoModel('claude-3-opus')).toBe(false);
  });

  it('should handle case insensitivity', () => {
    expect(isVideoModel('GEMINI-2.0-FLASH')).toBe(true);
  });
});

describe('isYouTubeUrl', () => {
  it('should detect www.youtube.com URLs', () => {
    expect(isYouTubeUrl('https://www.youtube.com/watch?v=123')).toBe(true);
    expect(isYouTubeUrl('http://www.youtube.com/watch?v=abc')).toBe(true);
  });

  it('should detect youtube.com URLs', () => {
    expect(isYouTubeUrl('https://youtube.com/watch?v=123')).toBe(true);
  });

  it('should detect youtu.be URLs', () => {
    expect(isYouTubeUrl('https://youtu.be/123abc')).toBe(true);
  });

  it('should detect m.youtube.com URLs', () => {
    expect(isYouTubeUrl('https://m.youtube.com/watch?v=123')).toBe(true);
  });

  it('should return false for non-YouTube URLs', () => {
    expect(isYouTubeUrl('https://vimeo.com/123')).toBe(false);
    expect(isYouTubeUrl('https://example.com')).toBe(false);
    expect(isYouTubeUrl('https://notyoutube.com')).toBe(false);
  });

  it('should return false for invalid URLs', () => {
    expect(isYouTubeUrl('not-a-url')).toBe(false);
    expect(isYouTubeUrl('')).toBe(false);
  });
});

describe('getMediaFileSizeLimit', () => {
  it('should return 50MB limit for audio', () => {
    const limit = getMediaFileSizeLimit('audio');
    expect(limit).toBe(50 * 1024 * 1024);
  });

  it('should return 50MB limit for video', () => {
    const limit = getMediaFileSizeLimit('video');
    expect(limit).toBe(50 * 1024 * 1024);
  });
});

describe('validateMediaFileSize', () => {
  it('should return valid for small files', () => {
    const file = new Blob(['test'], { type: 'audio/mp3' });
    Object.defineProperty(file, 'size', { value: 1000 });

    const result = validateMediaFileSize(file as File, 'audio');

    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should return invalid for large audio files', () => {
    const file = new Blob(['test'], { type: 'audio/mp3' });
    Object.defineProperty(file, 'size', { value: 60 * 1024 * 1024 }); // 60MB

    const result = validateMediaFileSize(file as File, 'audio');

    expect(result.valid).toBe(false);
    expect(result.error).toContain('Audio');
    expect(result.error).toContain('50MB');
  });

  it('should return invalid for large video files', () => {
    const file = new Blob(['test'], { type: 'video/mp4' });
    Object.defineProperty(file, 'size', { value: 60 * 1024 * 1024 }); // 60MB

    const result = validateMediaFileSize(file as File, 'video');

    expect(result.valid).toBe(false);
    expect(result.error).toContain('Video');
  });

  it('should return valid for files at exactly the limit', () => {
    const file = new Blob(['test'], { type: 'audio/mp3' });
    Object.defineProperty(file, 'size', { value: 50 * 1024 * 1024 }); // exactly 50MB

    const result = validateMediaFileSize(file as File, 'audio');

    expect(result.valid).toBe(true);
  });
});

describe('estimateVideoDuration', () => {
  it('should estimate duration based on file size', () => {
    const fileSize = 10 * 1024 * 1024; // 10MB
    const duration = estimateVideoDuration(fileSize, 'video/mp4');

    // ~100KB/s average, so 10MB should be about 100 seconds
    expect(duration).toBeGreaterThan(50);
    expect(duration).toBeLessThan(200);
  });

  it('should return 0 for empty file', () => {
    const duration = estimateVideoDuration(0, 'video/mp4');
    expect(duration).toBe(0);
  });

  it('should scale linearly with file size', () => {
    const duration1 = estimateVideoDuration(1 * 1024 * 1024, 'video/mp4');
    const duration2 = estimateVideoDuration(2 * 1024 * 1024, 'video/mp4');

    expect(duration2).toBe(duration1 * 2);
  });
});
