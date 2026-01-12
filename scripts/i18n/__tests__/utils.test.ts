/**
 * Unit tests for i18n utility functions
 */

import {
  flattenKeys,
  parseArgs,
  generateKey,
  containsChinese,
  isUserFacingText,
  sortKeys,
  progressBar,
  getTimeString,
} from '../utils';

describe('i18n utils', () => {
  describe('flattenKeys', () => {
    it('should flatten nested translation object', () => {
      const obj = {
        common: {
          save: 'Save',
          cancel: 'Cancel',
        },
        settings: {
          theme: {
            light: 'Light',
            dark: 'Dark',
          },
        },
      };

      const result = flattenKeys(obj);

      expect(result.get('common.save')).toBe('Save');
      expect(result.get('common.cancel')).toBe('Cancel');
      expect(result.get('settings.theme.light')).toBe('Light');
      expect(result.get('settings.theme.dark')).toBe('Dark');
      expect(result.size).toBe(4);
    });

    it('should handle empty object', () => {
      const result = flattenKeys({});
      expect(result.size).toBe(0);
    });

    it('should handle single-level object', () => {
      const obj = {
        key1: 'value1',
        key2: 'value2',
      };

      const result = flattenKeys(obj);

      expect(result.get('key1')).toBe('value1');
      expect(result.get('key2')).toBe('value2');
    });

    it('should use prefix when provided', () => {
      const obj = { key: 'value' };
      const result = flattenKeys(obj, 'prefix');

      expect(result.get('prefix.key')).toBe('value');
    });
  });

  describe('parseArgs', () => {
    it('should parse command', () => {
      const result = parseArgs(['extract']);

      expect(result.command).toBe('extract');
      expect(result.positional).toEqual([]);
      expect(result.options).toEqual({});
    });

    it('should parse long options with values', () => {
      const result = parseArgs(['extract', '--namespace', 'common']);

      expect(result.command).toBe('extract');
      expect(result.options.namespace).toBe('common');
    });

    it('should parse boolean flags', () => {
      const result = parseArgs(['validate', '--verbose', '--ci']);

      expect(result.command).toBe('validate');
      expect(result.options.verbose).toBe(true);
      expect(result.options.ci).toBe(true);
    });

    it('should parse short flags', () => {
      const result = parseArgs(['-h']);

      expect(result.options.h).toBe(true);
    });

    it('should parse positional arguments', () => {
      const result = parseArgs(['backup', 'create']);

      expect(result.command).toBe('backup');
      expect(result.positional).toEqual(['create']);
    });

    it('should handle empty args', () => {
      const result = parseArgs([]);

      expect(result.command).toBeNull();
      expect(result.positional).toEqual([]);
      expect(result.options).toEqual({});
    });

    it('should parse mixed arguments', () => {
      const result = parseArgs([
        'cleanup',
        '--dry-run',
        '--namespace',
        'chat',
        'extra',
      ]);

      expect(result.command).toBe('cleanup');
      expect(result.options['dry-run']).toBe(true);
      expect(result.options.namespace).toBe('chat');
      expect(result.positional).toEqual(['extra']);
    });
  });

  describe('generateKey', () => {
    it('should convert string to lowercase with underscores', () => {
      expect(generateKey('Hello World')).toBe('hello_world');
    });

    it('should remove special characters', () => {
      expect(generateKey("Hello! World?")).toBe('hello_world');
    });

    it('should respect max length', () => {
      const longString = 'This is a very long string that should be truncated';
      const result = generateKey(longString, 20);

      expect(result.length).toBeLessThanOrEqual(20);
    });

    it('should handle empty string', () => {
      expect(generateKey('')).toBe('');
    });

    it('should handle numbers', () => {
      expect(generateKey('Item 123')).toBe('item_123');
    });

    it('should use default max length of 50', () => {
      const longString = 'a'.repeat(100);
      const result = generateKey(longString);

      expect(result.length).toBe(50);
    });
  });

  describe('containsChinese', () => {
    it('should detect Chinese characters', () => {
      expect(containsChinese('你好')).toBe(true);
      expect(containsChinese('Hello 世界')).toBe(true);
    });

    it('should return false for non-Chinese text', () => {
      expect(containsChinese('Hello World')).toBe(false);
      expect(containsChinese('123')).toBe(false);
      expect(containsChinese('')).toBe(false);
    });

    it('should detect mixed content', () => {
      expect(containsChinese('abc中文def')).toBe(true);
    });
  });

  describe('isUserFacingText', () => {
    it('should return true for regular text', () => {
      expect(isUserFacingText('Hello World')).toBe(true);
      expect(isUserFacingText('Save changes')).toBe(true);
    });

    it('should return true for Chinese text', () => {
      expect(isUserFacingText('保存')).toBe(true);
      expect(isUserFacingText('你好世界')).toBe(true);
    });

    it('should return false for numbers only', () => {
      expect(isUserFacingText('12345')).toBe(false);
      expect(isUserFacingText('100.00')).toBe(false);
    });

    it('should return false for symbols only', () => {
      expect(isUserFacingText('---')).toBe(false);
      expect(isUserFacingText('...')).toBe(false);
    });

    it('should return false if letters are less than 30%', () => {
      expect(isUserFacingText('123456789a')).toBe(false);
    });
  });

  describe('sortKeys', () => {
    it('should sort object keys alphabetically', () => {
      const obj = { z: 1, a: 2, m: 3 };
      const result = sortKeys(obj);

      expect(Object.keys(result)).toEqual(['a', 'm', 'z']);
    });

    it('should sort nested objects', () => {
      const obj = {
        z: { b: 1, a: 2 },
        a: { z: 1, a: 2 },
      };
      const result = sortKeys(obj);

      expect(Object.keys(result)).toEqual(['a', 'z']);
      expect(Object.keys(result.a as Record<string, unknown>)).toEqual(['a', 'z']);
    });

    it('should handle empty object', () => {
      expect(sortKeys({})).toEqual({});
    });

    it('should return non-object values unchanged', () => {
      expect(sortKeys(null as never)).toBeNull();
      expect(sortKeys([] as never)).toEqual([]);
    });
  });

  describe('progressBar', () => {
    it('should show 100% for complete progress', () => {
      const result = progressBar(10, 10);
      expect(result).toContain('100.0%');
    });

    it('should show 0% for no progress', () => {
      const result = progressBar(0, 10);
      expect(result).toContain('0.0%');
    });

    it('should show 50% for half progress', () => {
      const result = progressBar(5, 10);
      expect(result).toContain('50.0%');
    });

    it('should handle zero total', () => {
      const result = progressBar(0, 0);
      expect(result).toContain('0.0%');
    });

    it('should respect custom width', () => {
      const result = progressBar(5, 10, 10);
      // 10 characters for bar + percentage
      expect(result).toContain('█████░░░░░');
    });
  });

  describe('getTimeString', () => {
    it('should return time in HH:MM:SS format', () => {
      const result = getTimeString();

      // Should match HH:MM:SS format
      expect(result).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    });
  });
});
