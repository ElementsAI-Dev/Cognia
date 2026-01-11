/**
 * Video Processing Tests
 *
 * Tests for video processing API functions.
 */

jest.mock('@tauri-apps/api/core', () => ({
  invoke: jest.fn(),
}));

import { invoke } from '@tauri-apps/api/core';
import {
  trimVideo,
  convertVideo,
  getVideoInfo,
  generateThumbnail,
  checkEncodingSupport,
  formatDuration,
  generateOutputFilename,
  estimateFileSize,
  type VideoTrimOptions,
  type VideoConvertOptions,
  type VideoProcessingResult,
  type VideoInfo,
} from './video-processing';

const mockInvoke = invoke as jest.MockedFunction<typeof invoke>;

describe('Video Processing - Trim', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('trimVideo', () => {
    it('should call invoke with trim options', async () => {
      const options: VideoTrimOptions = {
        inputPath: '/path/to/input.mp4',
        outputPath: '/path/to/output.mp4',
        startTime: 10,
        endTime: 30,
      };

      const mockResult: VideoProcessingResult = {
        success: true,
        outputPath: '/path/to/output.mp4',
        fileSize: 1024000,
        durationMs: 20000,
      };
      mockInvoke.mockResolvedValue(mockResult);

      const result = await trimVideo(options);

      expect(mockInvoke).toHaveBeenCalledWith('video_trim', { options });
      expect(result).toEqual(mockResult);
    });

    it('should include optional format parameter', async () => {
      const options: VideoTrimOptions = {
        inputPath: '/path/to/input.mp4',
        outputPath: '/path/to/output.webm',
        startTime: 0,
        endTime: 60,
        format: 'webm',
      };

      mockInvoke.mockResolvedValue({} as VideoProcessingResult);
      await trimVideo(options);

      expect(mockInvoke).toHaveBeenCalledWith('video_trim', { options });
    });

    it('should include optional quality parameter', async () => {
      const options: VideoTrimOptions = {
        inputPath: '/path/to/input.mp4',
        outputPath: '/path/to/output.mp4',
        startTime: 5,
        endTime: 15,
        quality: 80,
      };

      mockInvoke.mockResolvedValue({} as VideoProcessingResult);
      await trimVideo(options);

      expect(mockInvoke).toHaveBeenCalledWith('video_trim', { options });
    });

    it('should include optional gifFps parameter for gif format', async () => {
      const options: VideoTrimOptions = {
        inputPath: '/path/to/input.mp4',
        outputPath: '/path/to/output.gif',
        startTime: 0,
        endTime: 5,
        format: 'gif',
        gifFps: 15,
      };

      mockInvoke.mockResolvedValue({} as VideoProcessingResult);
      await trimVideo(options);

      expect(mockInvoke).toHaveBeenCalledWith('video_trim', { options });
    });

    it('should handle error response', async () => {
      const options: VideoTrimOptions = {
        inputPath: '/nonexistent/input.mp4',
        outputPath: '/path/to/output.mp4',
        startTime: 0,
        endTime: 10,
      };

      const mockResult: VideoProcessingResult = {
        success: false,
        outputPath: '',
        fileSize: 0,
        durationMs: 0,
        error: 'Input file not found',
      };
      mockInvoke.mockResolvedValue(mockResult);

      const result = await trimVideo(options);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Input file not found');
    });
  });
});

describe('Video Processing - Convert', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('convertVideo', () => {
    it('should call invoke with convert options', async () => {
      const options: VideoConvertOptions = {
        inputPath: '/path/to/input.mp4',
        outputPath: '/path/to/output.webm',
        format: 'webm',
      };

      const mockResult: VideoProcessingResult = {
        success: true,
        outputPath: '/path/to/output.webm',
        fileSize: 2048000,
        durationMs: 60000,
      };
      mockInvoke.mockResolvedValue(mockResult);

      const result = await convertVideo(options);

      expect(mockInvoke).toHaveBeenCalledWith('video_convert', { options });
      expect(result).toEqual(mockResult);
    });

    it('should include optional quality parameter', async () => {
      const options: VideoConvertOptions = {
        inputPath: '/path/to/input.mp4',
        outputPath: '/path/to/output.mp4',
        format: 'mp4',
        quality: 90,
      };

      mockInvoke.mockResolvedValue({} as VideoProcessingResult);
      await convertVideo(options);

      expect(mockInvoke).toHaveBeenCalledWith('video_convert', { options });
    });

    it('should include optional width parameter for resizing', async () => {
      const options: VideoConvertOptions = {
        inputPath: '/path/to/input.mp4',
        outputPath: '/path/to/output.mp4',
        format: 'mp4',
        width: 720,
      };

      mockInvoke.mockResolvedValue({} as VideoProcessingResult);
      await convertVideo(options);

      expect(mockInvoke).toHaveBeenCalledWith('video_convert', { options });
    });

    it('should handle gif conversion with gifFps', async () => {
      const options: VideoConvertOptions = {
        inputPath: '/path/to/input.mp4',
        outputPath: '/path/to/output.gif',
        format: 'gif',
        gifFps: 10,
      };

      mockInvoke.mockResolvedValue({} as VideoProcessingResult);
      await convertVideo(options);

      expect(mockInvoke).toHaveBeenCalledWith('video_convert', { options });
    });
  });
});

describe('Video Processing - Info', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getVideoInfo', () => {
    it('should call invoke with file path', async () => {
      const mockInfo: VideoInfo = {
        durationMs: 120000,
        width: 1920,
        height: 1080,
        fps: 30,
        codec: 'h264',
        fileSize: 10485760,
        hasAudio: true,
      };
      mockInvoke.mockResolvedValue(mockInfo);

      const result = await getVideoInfo('/path/to/video.mp4');

      expect(mockInvoke).toHaveBeenCalledWith('video_get_info', { filePath: '/path/to/video.mp4' });
      expect(result).toEqual(mockInfo);
    });

    it('should return video without audio', async () => {
      const mockInfo: VideoInfo = {
        durationMs: 60000,
        width: 1280,
        height: 720,
        fps: 24,
        codec: 'vp9',
        fileSize: 5242880,
        hasAudio: false,
      };
      mockInvoke.mockResolvedValue(mockInfo);

      const result = await getVideoInfo('/path/to/silent.webm');

      expect(result.hasAudio).toBe(false);
      expect(result.codec).toBe('vp9');
    });
  });
});

describe('Video Processing - Thumbnail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateThumbnail', () => {
    it('should call invoke with default timestamp', async () => {
      mockInvoke.mockResolvedValue('/path/to/thumbnail.png');

      const result = await generateThumbnail('/path/to/video.mp4', '/path/to/thumbnail.png');

      expect(mockInvoke).toHaveBeenCalledWith('video_generate_thumbnail', {
        videoPath: '/path/to/video.mp4',
        outputPath: '/path/to/thumbnail.png',
        timestampMs: 0,
      });
      expect(result).toBe('/path/to/thumbnail.png');
    });

    it('should call invoke with custom timestamp', async () => {
      mockInvoke.mockResolvedValue('/path/to/thumbnail.png');

      await generateThumbnail('/path/to/video.mp4', '/path/to/thumbnail.png', 5000);

      expect(mockInvoke).toHaveBeenCalledWith('video_generate_thumbnail', {
        videoPath: '/path/to/video.mp4',
        outputPath: '/path/to/thumbnail.png',
        timestampMs: 5000,
      });
    });
  });
});

describe('Video Processing - Encoding Support', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkEncodingSupport', () => {
    it('should return encoding capabilities', async () => {
      const mockSupport = {
        h264: true,
        h265: true,
        vp9: true,
        gif: true,
      };
      mockInvoke.mockResolvedValue(mockSupport);

      const result = await checkEncodingSupport();

      expect(mockInvoke).toHaveBeenCalledWith('video_check_encoding_support');
      expect(result).toEqual(mockSupport);
    });

    it('should handle partial support', async () => {
      const mockSupport = {
        h264: true,
        h265: false,
        vp9: false,
        gif: true,
      };
      mockInvoke.mockResolvedValue(mockSupport);

      const result = await checkEncodingSupport();

      expect(result.h264).toBe(true);
      expect(result.h265).toBe(false);
      expect(result.vp9).toBe(false);
      expect(result.gif).toBe(true);
    });
  });
});

describe('Video Processing - Utility Functions', () => {
  describe('formatDuration', () => {
    it('should format seconds under a minute', () => {
      expect(formatDuration(0)).toBe('0:00');
      expect(formatDuration(5)).toBe('0:05');
      expect(formatDuration(30)).toBe('0:30');
      expect(formatDuration(59)).toBe('0:59');
    });

    it('should format minutes and seconds', () => {
      expect(formatDuration(60)).toBe('1:00');
      expect(formatDuration(65)).toBe('1:05');
      expect(formatDuration(90)).toBe('1:30');
      expect(formatDuration(599)).toBe('9:59');
      expect(formatDuration(600)).toBe('10:00');
      expect(formatDuration(3599)).toBe('59:59');
    });

    it('should format hours, minutes, and seconds', () => {
      expect(formatDuration(3600)).toBe('1:00:00');
      expect(formatDuration(3661)).toBe('1:01:01');
      expect(formatDuration(7200)).toBe('2:00:00');
      expect(formatDuration(36000)).toBe('10:00:00');
      expect(formatDuration(86399)).toBe('23:59:59');
    });

    it('should handle decimal seconds by flooring', () => {
      expect(formatDuration(5.5)).toBe('0:05');
      expect(formatDuration(59.9)).toBe('0:59');
      expect(formatDuration(60.1)).toBe('1:00');
    });
  });

  describe('generateOutputFilename', () => {
    it('should generate output filename with default suffix', () => {
      expect(generateOutputFilename('/path/to/video.mp4', 'mp4'))
        .toBe('/path/to/video_edited.mp4');
    });

    it('should generate output filename with custom suffix', () => {
      expect(generateOutputFilename('/path/to/video.mp4', 'webm', '_converted'))
        .toBe('/path/to/video_converted.webm');
    });

    it('should handle different formats', () => {
      expect(generateOutputFilename('/videos/clip.mov', 'gif'))
        .toBe('/videos/clip_edited.gif');
      expect(generateOutputFilename('/videos/clip.avi', 'webm'))
        .toBe('/videos/clip_edited.webm');
    });

    it('should handle Windows-style paths', () => {
      expect(generateOutputFilename('C:\\Videos\\test.mp4', 'mp4'))
        .toBe('C:\\Videos\\test_edited.mp4');
    });

    it('should handle filenames without extension', () => {
      expect(generateOutputFilename('/path/to/video', 'mp4'))
        .toBe('/path/to/video_edited.mp4');
    });

    it('should handle filenames with multiple dots', () => {
      expect(generateOutputFilename('/path/to/my.video.file.mp4', 'webm'))
        .toBe('/path/to/my.video.file_edited.webm');
    });

    it('should handle path with no directory', () => {
      expect(generateOutputFilename('video.mp4', 'gif'))
        .toBe('video_edited.gif');
    });
  });

  describe('estimateFileSize', () => {
    it('should estimate mp4 file size', () => {
      // 10 seconds at quality 50 should be ~250KB
      const result = estimateFileSize(10, 50, 'mp4');
      expect(result).toBe(250000);
    });

    it('should estimate webm file size', () => {
      // 10 seconds at quality 50 should be ~200KB
      const result = estimateFileSize(10, 50, 'webm');
      expect(result).toBe(200000);
    });

    it('should estimate gif file size (larger than video)', () => {
      // 10 seconds at quality 50 should be ~1MB for gif
      const result = estimateFileSize(10, 50, 'gif');
      expect(result).toBe(1000000);
    });

    it('should scale with duration', () => {
      const short = estimateFileSize(10, 100, 'mp4');
      const long = estimateFileSize(20, 100, 'mp4');
      expect(long).toBe(short * 2);
    });

    it('should scale with quality', () => {
      const lowQuality = estimateFileSize(10, 50, 'mp4');
      const highQuality = estimateFileSize(10, 100, 'mp4');
      expect(highQuality).toBe(lowQuality * 2);
    });

    it('should return 0 for zero duration', () => {
      expect(estimateFileSize(0, 100, 'mp4')).toBe(0);
    });

    it('should return 0 for zero quality', () => {
      expect(estimateFileSize(10, 0, 'mp4')).toBe(0);
    });

    it('should round result to integer', () => {
      const result = estimateFileSize(7, 33, 'mp4');
      expect(Number.isInteger(result)).toBe(true);
    });
  });
});
