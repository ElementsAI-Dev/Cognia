/**
 * Model Download Helpers Tests
 */

import {
  SOURCE_NAMES,
  CATEGORY_NAMES,
  CATEGORY_ICONS,
  formatFileSize,
  formatSpeed,
  formatEta,
} from './model-download-helpers';

describe('model-download-helpers', () => {
  describe('SOURCE_NAMES', () => {
    it('should have all expected source names', () => {
      expect(SOURCE_NAMES.hugging_face).toBe('HuggingFace');
      expect(SOURCE_NAMES.model_scope).toBe('ModelScope (CN)');
      expect(SOURCE_NAMES.git_hub).toBe('GitHub');
      expect(SOURCE_NAMES.ollama).toBe('Ollama');
      expect(SOURCE_NAMES.custom).toBe('Custom');
    });

    it('should return undefined for unknown source', () => {
      expect(SOURCE_NAMES['unknown']).toBeUndefined();
    });
  });

  describe('CATEGORY_NAMES', () => {
    it('should have all expected category names', () => {
      expect(CATEGORY_NAMES.ocr).toBe('OCR Models');
      expect(CATEGORY_NAMES.llm).toBe('Language Models');
      expect(CATEGORY_NAMES.embedding).toBe('Embedding');
      expect(CATEGORY_NAMES.vision).toBe('Vision');
      expect(CATEGORY_NAMES.speech).toBe('Speech');
      expect(CATEGORY_NAMES.other).toBe('Other');
    });
  });

  describe('CATEGORY_ICONS', () => {
    it('should have icons for main categories', () => {
      expect(CATEGORY_ICONS.ocr).toBeDefined();
      expect(CATEGORY_ICONS.llm).toBeDefined();
      expect(CATEGORY_ICONS.embedding).toBeDefined();
      expect(CATEGORY_ICONS.vision).toBeDefined();
    });

    it('should return undefined for categories without icons', () => {
      expect(CATEGORY_ICONS['speech']).toBeUndefined();
      expect(CATEGORY_ICONS['other']).toBeUndefined();
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(100)).toBe('100 B');
      expect(formatFileSize(512)).toBe('512 B');
      expect(formatFileSize(1023)).toBe('1023 B');
    });

    it('should format kilobytes correctly', () => {
      expect(formatFileSize(1024)).toBe('1.0 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(10240)).toBe('10.0 KB');
      expect(formatFileSize(1024 * 1024 - 1)).toBe('1024.0 KB');
    });

    it('should format megabytes correctly', () => {
      expect(formatFileSize(1024 * 1024)).toBe('1.0 MB');
      expect(formatFileSize(1024 * 1024 * 1.5)).toBe('1.5 MB');
      expect(formatFileSize(1024 * 1024 * 100)).toBe('100.0 MB');
      expect(formatFileSize(1024 * 1024 * 1024 - 1)).toBe('1024.0 MB');
    });

    it('should format gigabytes correctly', () => {
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1.00 GB');
      expect(formatFileSize(1024 * 1024 * 1024 * 1.5)).toBe('1.50 GB');
      expect(formatFileSize(1024 * 1024 * 1024 * 10)).toBe('10.00 GB');
      expect(formatFileSize(1024 * 1024 * 1024 * 100)).toBe('100.00 GB');
    });

    it('should handle edge cases', () => {
      expect(formatFileSize(1)).toBe('1 B');
      expect(formatFileSize(1024 * 1024 * 1024 * 1024)).toBe('1024.00 GB');
    });
  });

  describe('formatSpeed', () => {
    it('should format speed with bytes per second', () => {
      expect(formatSpeed(512)).toBe('512 B/s');
    });

    it('should format speed with kilobytes per second', () => {
      expect(formatSpeed(1024)).toBe('1.0 KB/s');
      expect(formatSpeed(1024 * 100)).toBe('100.0 KB/s');
    });

    it('should format speed with megabytes per second', () => {
      expect(formatSpeed(1024 * 1024)).toBe('1.0 MB/s');
      expect(formatSpeed(1024 * 1024 * 10)).toBe('10.0 MB/s');
    });

    it('should format speed with gigabytes per second', () => {
      expect(formatSpeed(1024 * 1024 * 1024)).toBe('1.00 GB/s');
    });

    it('should handle zero speed', () => {
      expect(formatSpeed(0)).toBe('0 B/s');
    });
  });

  describe('formatEta', () => {
    it('should format seconds correctly', () => {
      expect(formatEta(0)).toBe('0s');
      expect(formatEta(1)).toBe('1s');
      expect(formatEta(30)).toBe('30s');
      expect(formatEta(59)).toBe('59s');
    });

    it('should format minutes and seconds correctly', () => {
      expect(formatEta(60)).toBe('1m 0s');
      expect(formatEta(61)).toBe('1m 1s');
      expect(formatEta(90)).toBe('1m 30s');
      expect(formatEta(120)).toBe('2m 0s');
      expect(formatEta(3599)).toBe('59m 59s');
    });

    it('should format hours and minutes correctly', () => {
      expect(formatEta(3600)).toBe('1h 0m');
      expect(formatEta(3660)).toBe('1h 1m');
      expect(formatEta(7200)).toBe('2h 0m');
      expect(formatEta(7260)).toBe('2h 1m');
      expect(formatEta(3600 * 10 + 1800)).toBe('10h 30m');
    });

    it('should handle large values', () => {
      expect(formatEta(86400)).toBe('24h 0m');
      expect(formatEta(86400 + 3600 + 60)).toBe('25h 1m');
    });
  });
});
