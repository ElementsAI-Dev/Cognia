/**
 * Speech API Tests
 */

import {
  isSupportedAudioFormat,
  formatDuration,
} from './speech-api';

describe('speech-api', () => {
  describe('isSupportedAudioFormat', () => {
    it('should return true for supported formats', () => {
      expect(isSupportedAudioFormat('audio/webm')).toBe(true);
      expect(isSupportedAudioFormat('audio/mp3')).toBe(true);
      expect(isSupportedAudioFormat('audio/wav')).toBe(true);
      expect(isSupportedAudioFormat('audio/ogg')).toBe(true);
      expect(isSupportedAudioFormat('audio/flac')).toBe(true);
    });

    it('should return false for unsupported formats', () => {
      expect(isSupportedAudioFormat('audio/aac')).toBe(false);
      expect(isSupportedAudioFormat('video/avi')).toBe(false);
      expect(isSupportedAudioFormat('text/plain')).toBe(false);
    });
  });

  describe('formatDuration', () => {
    it('should format 0 milliseconds correctly', () => {
      expect(formatDuration(0)).toBe('0:00');
    });

    it('should format seconds correctly', () => {
      expect(formatDuration(5000)).toBe('0:05');
      expect(formatDuration(30000)).toBe('0:30');
      expect(formatDuration(59000)).toBe('0:59');
    });

    it('should format minutes correctly', () => {
      expect(formatDuration(60000)).toBe('1:00');
      expect(formatDuration(90000)).toBe('1:30');
      expect(formatDuration(300000)).toBe('5:00');
    });

    it('should handle edge cases', () => {
      expect(formatDuration(1000)).toBe('0:01');
      expect(formatDuration(61000)).toBe('1:01');
      expect(formatDuration(3599000)).toBe('59:59');
    });
  });
});
