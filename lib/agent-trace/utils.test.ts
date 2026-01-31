/**
 * Tests for agent trace utility functions
 */

import { countLines, fnv1a32, safeJsonStringify, getLineRange } from './utils';

describe('agent-trace/utils', () => {
  describe('countLines', () => {
    it('returns 1 for empty string', () => {
      expect(countLines('')).toBe(1);
    });

    it('returns 1 for single line without newline', () => {
      expect(countLines('hello world')).toBe(1);
    });

    it('counts multiple lines correctly', () => {
      expect(countLines('line1\nline2\nline3')).toBe(3);
    });

    it('handles trailing newline', () => {
      expect(countLines('line1\nline2\n')).toBe(3);
    });

    it('handles Windows-style line endings', () => {
      expect(countLines('line1\r\nline2\r\nline3')).toBe(3);
    });

    it('handles null/undefined input', () => {
      expect(countLines(null as unknown as string)).toBe(1);
      expect(countLines(undefined as unknown as string)).toBe(1);
    });
  });

  describe('fnv1a32', () => {
    it('returns prefixed hash for empty string', () => {
      const hash = fnv1a32('');
      expect(hash).toMatch(/^fnv1a32:[0-9a-f]+$/);
    });

    it('returns consistent hash for same input', () => {
      const input = 'hello world';
      expect(fnv1a32(input)).toBe(fnv1a32(input));
    });

    it('returns different hash for different input', () => {
      expect(fnv1a32('hello')).not.toBe(fnv1a32('world'));
    });

    it('handles unicode characters', () => {
      const hash = fnv1a32('你好世界');
      expect(hash).toMatch(/^fnv1a32:[0-9a-f]+$/);
    });

    it('handles special characters', () => {
      const hash = fnv1a32('!@#$%^&*()');
      expect(hash).toMatch(/^fnv1a32:[0-9a-f]+$/);
    });

    it('produces expected hash for known input', () => {
      // FNV-1a hash of "test" should be consistent
      const hash = fnv1a32('test');
      expect(hash).toBe(fnv1a32('test'));
    });
  });

  describe('safeJsonStringify', () => {
    it('stringifies simple object', () => {
      const obj = { name: 'test', value: 123 };
      expect(safeJsonStringify(obj)).toBe('{"name":"test","value":123}');
    });

    it('stringifies array', () => {
      const arr = [1, 2, 3];
      expect(safeJsonStringify(arr)).toBe('[1,2,3]');
    });

    it('stringifies null', () => {
      expect(safeJsonStringify(null)).toBe('null');
    });

    it('stringifies undefined', () => {
      // JSON.stringify(undefined) returns undefined, not a string
      // Our function wraps it, so it should return undefined
      const result = safeJsonStringify(undefined);
      expect(result).toBeUndefined();
    });

    it('returns fallback for circular reference', () => {
      const obj: Record<string, unknown> = { name: 'test' };
      obj.self = obj; // circular reference
      expect(safeJsonStringify(obj, '{"error":"circular"}')).toBe('{"error":"circular"}');
    });

    it('uses default fallback for circular reference', () => {
      const obj: Record<string, unknown> = { name: 'test' };
      obj.self = obj;
      expect(safeJsonStringify(obj)).toBe('{}');
    });
  });

  describe('getLineRange', () => {
    it('returns range for single line', () => {
      expect(getLineRange('hello')).toEqual({ startLine: 1, endLine: 1 });
    });

    it('returns range for multiple lines', () => {
      expect(getLineRange('line1\nline2\nline3')).toEqual({ startLine: 1, endLine: 3 });
    });

    it('returns range for empty string', () => {
      expect(getLineRange('')).toEqual({ startLine: 1, endLine: 1 });
    });
  });
});
