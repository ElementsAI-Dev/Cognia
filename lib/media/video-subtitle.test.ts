/**
 * Tests for video-subtitle.ts
 * Video subtitle processing and transcription
 */

import {
  getVideoSubtitleInfo,
  extractSubtitles,
  extractAudioFromVideo,
  transcribeVideo,
  getVideoSubtitles,
  analyzeVideoContent,
  formatTime,
} from './video-subtitle';
import { invoke } from '@tauri-apps/api/core';
import * as speechApi from '@/lib/ai/media/speech-api';
import * as subtitleParser from './subtitle-parser';

// Mock Tauri invoke
jest.mock('@tauri-apps/api/core', () => ({
  invoke: jest.fn(),
}));

// Mock speech API
jest.mock('@/lib/ai/media/speech-api', () => ({
  transcribeAudio: jest.fn(),
}));

// Mock subtitle parser
jest.mock('./subtitle-parser', () => ({
  parseSubtitle: jest.fn(),
  cuesToPlainText: jest.fn(),
}));

const mockedInvoke = invoke as jest.MockedFunction<typeof invoke>;
const mockedTranscribeAudio = speechApi.transcribeAudio as jest.MockedFunction<typeof speechApi.transcribeAudio>;
const mockedParseSubtitle = subtitleParser.parseSubtitle as jest.MockedFunction<typeof subtitleParser.parseSubtitle>;
const mockedCuesToPlainText = subtitleParser.cuesToPlainText as jest.MockedFunction<typeof subtitleParser.cuesToPlainText>;

describe('video-subtitle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getVideoSubtitleInfo', () => {
    it('should return subtitle info from video', async () => {
      mockedInvoke.mockResolvedValue({
        has_subtitles: true,
        tracks: [
          {
            stream_index: 0,
            codec: 'srt',
            language: 'en',
            title: 'English',
            is_default: true,
            is_forced: false,
          },
          {
            stream_index: 1,
            codec: 'ass',
            language: 'zh',
            title: 'Chinese',
            is_default: false,
            is_forced: false,
          },
        ],
      });

      const result = await getVideoSubtitleInfo('/path/to/video.mp4');

      expect(mockedInvoke).toHaveBeenCalledWith('video_get_subtitle_info', {
        videoPath: '/path/to/video.mp4',
      });
      expect(result.hasEmbeddedSubtitles).toBe(true);
      expect(result.embeddedTracks).toHaveLength(2);
      expect(result.embeddedTracks[0]).toMatchObject({
        streamIndex: 0,
        codec: 'srt',
        language: 'en',
        isDefault: true,
      });
    });

    it('should return empty info when no subtitles', async () => {
      mockedInvoke.mockResolvedValue({
        has_subtitles: false,
        tracks: [],
      });

      const result = await getVideoSubtitleInfo('/path/to/video.mp4');

      expect(result.hasEmbeddedSubtitles).toBe(false);
      expect(result.embeddedTracks).toHaveLength(0);
    });

    it('should handle errors gracefully', async () => {
      mockedInvoke.mockRejectedValue(new Error('Tauri error'));

      const result = await getVideoSubtitleInfo('/path/to/video.mp4');

      expect(result.hasEmbeddedSubtitles).toBe(false);
      expect(result.embeddedTracks).toHaveLength(0);
    });
  });

  describe('extractSubtitles', () => {
    it('should extract subtitles from video', async () => {
      mockedInvoke.mockResolvedValue({
        success: true,
        extracted_files: [
          {
            stream_index: 0,
            file_path: '/tmp/subtitles.srt',
            format: 'srt',
            language: 'en',
            cue_count: 100,
          },
        ],
      });

      const result = await extractSubtitles({
        videoPath: '/path/to/video.mp4',
        trackIndices: [0],
        outputFormat: 'srt',
      });

      expect(result.success).toBe(true);
      expect(result.extractedFiles).toHaveLength(1);
      expect(result.extractedFiles[0]).toMatchObject({
        streamIndex: 0,
        filePath: '/tmp/subtitles.srt',
        format: 'srt',
        cueCount: 100,
      });
    });

    it('should handle extraction errors', async () => {
      mockedInvoke.mockResolvedValue({
        success: false,
        extracted_files: [],
        error: 'No subtitle tracks found',
      });

      const result = await extractSubtitles({
        videoPath: '/path/to/video.mp4',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('No subtitle tracks found');
    });

    it('should handle Tauri errors', async () => {
      mockedInvoke.mockRejectedValue(new Error('FFmpeg not found'));

      const result = await extractSubtitles({
        videoPath: '/path/to/video.mp4',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('FFmpeg not found');
    });
  });

  describe('extractAudioFromVideo', () => {
    it('should extract audio from video', async () => {
      mockedInvoke.mockResolvedValue({
        success: true,
        audio_path: '/tmp/audio.mp3',
      });

      const result = await extractAudioFromVideo('/path/to/video.mp4');

      expect(mockedInvoke).toHaveBeenCalledWith('video_extract_audio', {
        videoPath: '/path/to/video.mp4',
        outputPath: undefined,
        format: 'mp3',
      });
      expect(result.success).toBe(true);
      expect(result.audioPath).toBe('/tmp/audio.mp3');
    });

    it('should use custom output path', async () => {
      mockedInvoke.mockResolvedValue({
        success: true,
        audio_path: '/custom/path/audio.mp3',
      });

      await extractAudioFromVideo('/path/to/video.mp4', '/custom/path/audio.mp3');

      expect(mockedInvoke).toHaveBeenCalledWith('video_extract_audio', {
        videoPath: '/path/to/video.mp4',
        outputPath: '/custom/path/audio.mp3',
        format: 'mp3',
      });
    });

    it('should handle extraction errors', async () => {
      mockedInvoke.mockRejectedValue(new Error('Audio extraction failed'));

      const result = await extractAudioFromVideo('/path/to/video.mp4');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Audio extraction failed');
    });
  });

  describe('transcribeVideo', () => {
    it('should transcribe video using Whisper', async () => {
      // Mock audio extraction
      mockedInvoke
        .mockResolvedValueOnce({ success: true, audio_path: '/tmp/audio.mp3' })
        .mockResolvedValueOnce([72, 101, 108, 108, 111]); // "Hello" as bytes

      mockedTranscribeAudio.mockResolvedValue({
        success: true,
        text: 'Hello world',
        language: 'en',
        duration: 60,
      });

      const result = await transcribeVideo('/path/to/video.mp4', 'api-key');

      expect(result.success).toBe(true);
      expect(result.text).toBe('Hello world');
      expect(result.language).toBe('en');
    });

    it('should handle audio extraction failure', async () => {
      mockedInvoke.mockResolvedValue({ success: false, error: 'No audio' });

      const result = await transcribeVideo('/path/to/video.mp4', 'api-key');

      expect(result.success).toBe(false);
      expect(result.error).toContain('No audio');
    });

    it('should handle transcription failure', async () => {
      mockedInvoke
        .mockResolvedValueOnce({ success: true, audio_path: '/tmp/audio.mp3' })
        .mockResolvedValueOnce([1, 2, 3]);

      mockedTranscribeAudio.mockResolvedValue({
        success: false,
        text: '',
        error: 'API error',
      });

      const result = await transcribeVideo('/path/to/video.mp4', 'api-key');

      expect(result.success).toBe(false);
      expect(result.error).toBe('API error');
    });

    it('should pass language option', async () => {
      mockedInvoke
        .mockResolvedValueOnce({ success: true, audio_path: '/tmp/audio.mp3' })
        .mockResolvedValueOnce([1, 2, 3]);

      mockedTranscribeAudio.mockResolvedValue({
        success: true,
        text: '你好',
        language: 'zh',
        duration: 30,
      });

      await transcribeVideo('/path/to/video.mp4', 'api-key', { language: 'zh' });

      expect(mockedTranscribeAudio).toHaveBeenCalledWith(
        expect.any(Blob),
        expect.objectContaining({ language: 'zh' })
      );
    });
  });

  describe('getVideoSubtitles', () => {
    it('should return embedded subtitles when available', async () => {
      mockedInvoke
        .mockResolvedValueOnce({
          has_subtitles: true,
          tracks: [{ stream_index: 0, codec: 'srt', is_default: true }],
        })
        .mockResolvedValueOnce({
          success: true,
          extracted_files: [{ stream_index: 0, file_path: '/tmp/sub.srt', format: 'srt', cue_count: 10 }],
        })
        .mockResolvedValueOnce('1\n00:00:00,000 --> 00:00:05,000\nHello');

      mockedParseSubtitle.mockReturnValue({
        tracks: [{
          id: 'track-1',
          label: 'English',
          language: 'en',
          format: 'srt',
          isDefault: true,
          isSDH: false,
          duration: 5000,
          cues: [{ id: '1', index: 1, startTime: 0, endTime: 5000, text: 'Hello' }],
        }],
      });

      const result = await getVideoSubtitles('/path/to/video.mp4', 'api-key');

      expect(result.success).toBe(true);
      expect(result.source).toBe('embedded');
      expect(result.track).toBeDefined();
    });

    it('should transcribe when no embedded subtitles', async () => {
      mockedInvoke
        .mockResolvedValueOnce({ has_subtitles: false, tracks: [] })
        .mockResolvedValueOnce({ success: true, audio_path: '/tmp/audio.mp3' })
        .mockResolvedValueOnce([1, 2, 3]);

      mockedTranscribeAudio.mockResolvedValue({
        success: true,
        text: 'Transcribed text',
        language: 'en',
        duration: 60,
      });

      const result = await getVideoSubtitles('/path/to/video.mp4', 'api-key', {
        transcribeIfMissing: true,
      });

      expect(result.success).toBe(true);
      expect(result.source).toBe('transcribed');
    });

    it('should return none when transcription disabled', async () => {
      mockedInvoke.mockResolvedValue({ has_subtitles: false, tracks: [] });

      const result = await getVideoSubtitles('/path/to/video.mp4', 'api-key', {
        transcribeIfMissing: false,
      });

      expect(result.success).toBe(false);
      expect(result.source).toBe('none');
    });

    it('should prefer language when specified', async () => {
      mockedInvoke
        .mockResolvedValueOnce({
          has_subtitles: true,
          tracks: [
            { stream_index: 0, codec: 'srt', language: 'en', is_default: true },
            { stream_index: 1, codec: 'srt', language: 'zh', is_default: false },
          ],
        })
        .mockResolvedValueOnce({
          success: true,
          extracted_files: [{ stream_index: 1, file_path: '/tmp/zh.srt', format: 'srt', cue_count: 10 }],
        })
        .mockResolvedValueOnce('1\n00:00:00,000 --> 00:00:05,000\n你好');

      mockedParseSubtitle.mockReturnValue({
        tracks: [{
          id: 'track-1',
          label: 'Chinese',
          language: 'zh',
          format: 'srt',
          isDefault: false,
          isSDH: false,
          duration: 5000,
          cues: [],
        }],
      });

      await getVideoSubtitles('/path/to/video.mp4', 'api-key', {
        preferredLanguage: 'zh',
      });

      // Should extract Chinese track (index 1)
      expect(mockedInvoke).toHaveBeenCalledWith(
        'video_extract_subtitles',
        expect.objectContaining({
          options: expect.objectContaining({ trackIndices: [1] }),
        })
      );
    });
  });

  describe('analyzeVideoContent', () => {
    beforeEach(() => {
      mockedCuesToPlainText.mockReturnValue('Sample transcript text');
    });

    it('should analyze video with subtitles', async () => {
      mockedInvoke
        .mockResolvedValueOnce({ has_subtitles: true, tracks: [{ stream_index: 0, codec: 'srt', is_default: true }] })
        .mockResolvedValueOnce({ success: true, extracted_files: [{ stream_index: 0, file_path: '/tmp/sub.srt', format: 'srt', cue_count: 10 }] })
        .mockResolvedValueOnce('subtitle content');

      mockedParseSubtitle.mockReturnValue({
        tracks: [{
          id: 'track-1',
          label: 'English',
          language: 'en',
          format: 'srt',
          isDefault: true,
          isSDH: false,
          duration: 5000,
          cues: [{ id: '1', index: 1, startTime: 0, endTime: 5000, text: 'Hello' }],
        }],
      });

      const analyzeCallback = jest.fn().mockResolvedValue('Analysis result');

      const result = await analyzeVideoContent(
        { videoPath: '/path/to/video.mp4', analysisType: 'summary' },
        'api-key',
        analyzeCallback
      );

      expect(result.success).toBe(true);
      expect(result.transcript).toBeDefined();
      expect(result.summary).toBe('Analysis result');
    });

    it('should return error when no transcript available', async () => {
      mockedInvoke.mockResolvedValue({ has_subtitles: false, tracks: [] });
      mockedCuesToPlainText.mockReturnValue('');

      const result = await analyzeVideoContent(
        { videoPath: '/path/to/video.mp4', analysisType: 'summary', useSubtitles: false, transcribeIfNeeded: false },
        'api-key'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Could not obtain video transcript');
    });

    it('should parse key moments from analysis', async () => {
      mockedInvoke
        .mockResolvedValueOnce({ has_subtitles: true, tracks: [{ stream_index: 0, codec: 'srt', is_default: true }] })
        .mockResolvedValueOnce({ success: true, extracted_files: [{ stream_index: 0, file_path: '/tmp/sub.srt', format: 'srt', cue_count: 10 }] })
        .mockResolvedValueOnce('subtitle content');

      mockedParseSubtitle.mockReturnValue({
        tracks: [{ id: 't1', label: 'En', language: 'en', format: 'srt', isDefault: true, isSDH: false, duration: 1000, cues: [] }],
      });

      const analyzeCallback = jest.fn().mockResolvedValue(
        '[0:00] Introduction - Welcome to the video\n[2:30] Main Topic - Discussing key points'
      );

      const result = await analyzeVideoContent(
        { videoPath: '/path/to/video.mp4', analysisType: 'key-moments' },
        'api-key',
        analyzeCallback
      );

      expect(result.keyMoments).toBeDefined();
      expect(result.keyMoments?.length).toBeGreaterThan(0);
    });
  });

  describe('formatTime', () => {
    it('should format seconds to mm:ss', () => {
      expect(formatTime(0)).toBe('0:00');
      expect(formatTime(5)).toBe('0:05');
      expect(formatTime(60)).toBe('1:00');
      expect(formatTime(65)).toBe('1:05');
      expect(formatTime(125)).toBe('2:05');
      expect(formatTime(600)).toBe('10:00');
    });

    it('should handle fractional seconds', () => {
      expect(formatTime(5.5)).toBe('0:05');
      expect(formatTime(65.9)).toBe('1:05');
    });
  });
});
