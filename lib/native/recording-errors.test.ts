/**
 * Recording Errors Tests
 */

import {
  parseRecordingError,
  getErrorMessage,
  getErrorSuggestion,
  formatRecordingError,
  isRecoverableError,
  requiresFFmpegInstall,
  type RecordingError,
  type RecordingErrorCode,
} from './recording-errors';

describe('recording-errors', () => {
  describe('parseRecordingError', () => {
    it('should parse JSON string error', () => {
      const jsonError = JSON.stringify({
        code: 'FFMPEG_NOT_FOUND',
        message: 'FFmpeg is not installed',
      });

      const result = parseRecordingError(jsonError);

      expect(result.code).toBe('FFMPEG_NOT_FOUND');
      expect(result.message).toBe('FFmpeg is not installed');
    });

    it('should parse JSON with details and suggestion', () => {
      const jsonError = JSON.stringify({
        code: 'PERMISSION_DENIED',
        message: 'Cannot access file',
        details: 'File: /path/to/file',
        suggestion: 'Run as administrator',
      });

      const result = parseRecordingError(jsonError);

      expect(result.code).toBe('PERMISSION_DENIED');
      expect(result.details).toBe('File: /path/to/file');
      expect(result.suggestion).toBe('Run as administrator');
    });

    it('should extract FFMPEG_NOT_FOUND from plain string', () => {
      const result = parseRecordingError('FFmpeg not found in PATH');
      expect(result.code).toBe('FFMPEG_NOT_FOUND');
    });

    it('should extract ALREADY_RECORDING from string', () => {
      const result = parseRecordingError('Error: already recording');
      expect(result.code).toBe('ALREADY_RECORDING');
    });

    it('should extract NOT_RECORDING from string', () => {
      const result = parseRecordingError('Cannot stop: not recording');
      expect(result.code).toBe('NOT_RECORDING');
    });

    it('should extract NOT_PAUSED from string', () => {
      const result = parseRecordingError('Cannot resume: recording is not paused');
      expect(result.code).toBe('NOT_PAUSED');
    });

    it('should extract NO_SAVE_DIRECTORY from string', () => {
      const result = parseRecordingError('Error: no save directory configured');
      expect(result.code).toBe('NO_SAVE_DIRECTORY');
    });

    it('should extract MONITOR_NOT_FOUND from string', () => {
      const result = parseRecordingError('Monitor with id 5 not found');
      expect(result.code).toBe('MONITOR_NOT_FOUND');
    });

    it('should extract WINDOW_NOT_FOUND from string', () => {
      const result = parseRecordingError('Window with handle not found');
      expect(result.code).toBe('WINDOW_NOT_FOUND');
    });

    it('should extract INSUFFICIENT_DISK_SPACE from string', () => {
      const result = parseRecordingError('Not enough disk space available');
      expect(result.code).toBe('INSUFFICIENT_DISK_SPACE');
    });

    it('should extract PERMISSION_DENIED from string', () => {
      const result = parseRecordingError('Permission denied: cannot write to file');
      expect(result.code).toBe('PERMISSION_DENIED');
    });

    it('should extract FFMPEG_TIMEOUT from string', () => {
      const result = parseRecordingError('Operation timeout after 30 seconds');
      expect(result.code).toBe('FFMPEG_TIMEOUT');
    });

    it('should extract FFMPEG_CRASHED from string', () => {
      const result = parseRecordingError('FFmpeg process crashed unexpectedly');
      expect(result.code).toBe('FFMPEG_CRASHED');
    });

    it('should parse Error object', () => {
      const error = new Error('FFmpeg not found');
      const result = parseRecordingError(error);
      expect(result.code).toBe('FFMPEG_NOT_FOUND');
      expect(result.message).toBe('FFmpeg not found');
    });

    it('should parse structured object payload', () => {
      const result = parseRecordingError({
        error: 'Failed to start recording',
        code: 'FFMPEG_START_FAILED',
        details: 'spawn ffmpeg failed',
      });
      expect(result.code).toBe('FFMPEG_START_FAILED');
      expect(result.message).toBe('Failed to start recording');
      expect(result.details).toBe('spawn ffmpeg failed');
    });

    it('should normalize camelCase backend code in object payload', () => {
      const result = parseRecordingError({
        error: 'No active recording',
        code: 'NotRecording',
      });
      expect(result.code).toBe('NOT_RECORDING');
    });

    it('should return UNKNOWN for unrecognized error', () => {
      const result = parseRecordingError('Some random error message');
      expect(result.code).toBe('UNKNOWN');
    });

    it('should handle non-string non-Error types', () => {
      const result = parseRecordingError(12345);
      expect(result.code).toBe('UNKNOWN');
      expect(result.message).toBe('12345');
    });

    it('should handle invalid JSON gracefully', () => {
      const result = parseRecordingError('{ invalid json }');
      expect(result.code).toBe('UNKNOWN');
    });
  });

  describe('getErrorMessage', () => {
    it('should return English message by default', () => {
      const error: RecordingError = { code: 'FFMPEG_NOT_FOUND', message: '' };
      const message = getErrorMessage(error);
      expect(message).toBe('FFmpeg is not installed');
    });

    it('should return Chinese message when locale is zh', () => {
      const error: RecordingError = { code: 'FFMPEG_NOT_FOUND', message: '' };
      const message = getErrorMessage(error, 'zh');
      expect(message).toBe('FFmpeg 未安装');
    });

    it('should return message for all error codes', () => {
      const codes: RecordingErrorCode[] = [
        'FFMPEG_NOT_FOUND',
        'FFMPEG_VERSION_TOO_OLD',
        'FFMPEG_START_FAILED',
        'FFMPEG_CRASHED',
        'FFMPEG_TIMEOUT',
        'MONITOR_NOT_FOUND',
        'WINDOW_NOT_FOUND',
        'INVALID_REGION',
        'ALREADY_RECORDING',
        'NOT_RECORDING',
        'NOT_PAUSED',
        'NO_SAVE_DIRECTORY',
        'CREATE_DIRECTORY_FAILED',
        'INSUFFICIENT_DISK_SPACE',
        'PERMISSION_DENIED',
        'FILE_WRITE_ERROR',
        'AUDIO_CAPTURE_FAILED',
        'SCREEN_CAPTURE_FAILED',
        'UNKNOWN',
      ];

      for (const code of codes) {
        const error: RecordingError = { code, message: '' };
        const enMessage = getErrorMessage(error, 'en');
        const zhMessage = getErrorMessage(error, 'zh');

        expect(enMessage).toBeTruthy();
        expect(zhMessage).toBeTruthy();
        expect(typeof enMessage).toBe('string');
        expect(typeof zhMessage).toBe('string');
      }
    });
  });

  describe('getErrorSuggestion', () => {
    it('should return English suggestion by default', () => {
      const error: RecordingError = { code: 'FFMPEG_NOT_FOUND', message: '' };
      const suggestion = getErrorSuggestion(error);
      expect(suggestion).toContain('ffmpeg.org');
    });

    it('should return Chinese suggestion when locale is zh', () => {
      const error: RecordingError = { code: 'FFMPEG_NOT_FOUND', message: '' };
      const suggestion = getErrorSuggestion(error, 'zh');
      expect(suggestion).toContain('ffmpeg.org');
      expect(suggestion).toContain('下载');
    });

    it('should use backend suggestion if available', () => {
      const error: RecordingError = {
        code: 'FFMPEG_NOT_FOUND',
        message: '',
        suggestion: 'Custom suggestion from backend',
      };
      const suggestion = getErrorSuggestion(error);
      expect(suggestion).toBe('Custom suggestion from backend');
    });

    it('should return suggestion for all error codes', () => {
      const codes: RecordingErrorCode[] = [
        'FFMPEG_NOT_FOUND',
        'ALREADY_RECORDING',
        'NOT_RECORDING',
        'PERMISSION_DENIED',
        'UNKNOWN',
      ];

      for (const code of codes) {
        const error: RecordingError = { code, message: '' };
        const suggestion = getErrorSuggestion(error);
        expect(suggestion).toBeTruthy();
      }
    });
  });

  describe('formatRecordingError', () => {
    it('should format error for display', () => {
      const error: RecordingError = {
        code: 'FFMPEG_NOT_FOUND',
        message: 'Raw error message',
        details: 'Some details',
      };

      const formatted = formatRecordingError(error, 'en');

      expect(formatted.title).toBe('FFmpeg is not installed');
      expect(formatted.description).toBe('Some details');
      expect(formatted.suggestion).toContain('ffmpeg.org');
    });

    it('should use message as description when no details', () => {
      const error: RecordingError = {
        code: 'PERMISSION_DENIED',
        message: 'Access denied to /path/to/file',
      };

      const formatted = formatRecordingError(error);

      expect(formatted.description).toBe('Access denied to /path/to/file');
    });

    it('should format error in Chinese', () => {
      const error: RecordingError = {
        code: 'ALREADY_RECORDING',
        message: 'Already recording',
      };

      const formatted = formatRecordingError(error, 'zh');

      expect(formatted.title).toBe('正在录制中');
      expect(formatted.suggestion).toContain('请先停止');
    });
  });

  describe('isRecoverableError', () => {
    it('should return false for non-recoverable errors', () => {
      const nonRecoverable: RecordingErrorCode[] = [
        'FFMPEG_NOT_FOUND',
        'FFMPEG_VERSION_TOO_OLD',
        'NO_SAVE_DIRECTORY',
        'PERMISSION_DENIED',
      ];

      for (const code of nonRecoverable) {
        const error: RecordingError = { code, message: '' };
        expect(isRecoverableError(error)).toBe(false);
      }
    });

    it('should return true for recoverable errors', () => {
      const recoverable: RecordingErrorCode[] = [
        'FFMPEG_START_FAILED',
        'FFMPEG_CRASHED',
        'FFMPEG_TIMEOUT',
        'MONITOR_NOT_FOUND',
        'WINDOW_NOT_FOUND',
        'INVALID_REGION',
        'ALREADY_RECORDING',
        'NOT_RECORDING',
        'NOT_PAUSED',
        'CREATE_DIRECTORY_FAILED',
        'INSUFFICIENT_DISK_SPACE',
        'FILE_WRITE_ERROR',
        'AUDIO_CAPTURE_FAILED',
        'SCREEN_CAPTURE_FAILED',
        'UNKNOWN',
      ];

      for (const code of recoverable) {
        const error: RecordingError = { code, message: '' };
        expect(isRecoverableError(error)).toBe(true);
      }
    });
  });

  describe('requiresFFmpegInstall', () => {
    it('should return true for FFMPEG_NOT_FOUND', () => {
      const error: RecordingError = { code: 'FFMPEG_NOT_FOUND', message: '' };
      expect(requiresFFmpegInstall(error)).toBe(true);
    });

    it('should return true for FFMPEG_VERSION_TOO_OLD', () => {
      const error: RecordingError = { code: 'FFMPEG_VERSION_TOO_OLD', message: '' };
      expect(requiresFFmpegInstall(error)).toBe(true);
    });

    it('should return false for other errors', () => {
      const otherCodes: RecordingErrorCode[] = [
        'FFMPEG_START_FAILED',
        'FFMPEG_CRASHED',
        'PERMISSION_DENIED',
        'UNKNOWN',
      ];

      for (const code of otherCodes) {
        const error: RecordingError = { code, message: '' };
        expect(requiresFFmpegInstall(error)).toBe(false);
      }
    });
  });
});
