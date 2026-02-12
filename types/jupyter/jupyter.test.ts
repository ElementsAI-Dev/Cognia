/**
 * Tests for Jupyter type helpers
 */

import {
  DEFAULT_KERNEL_CONFIG,
  DEFAULT_EXECUTION_OPTIONS,
  isExecutionSuccessful,
  getTextOutput,
  getHtmlOutput,
  getImageOutput,
  formatExecutionError,
  createDefaultSession,
  formatExecutionTime,
} from './jupyter';
import type { KernelSandboxExecutionResult, ExecutionError } from './jupyter';

const createMockResult = (
  overrides: Partial<KernelSandboxExecutionResult> = {}
): KernelSandboxExecutionResult => ({
  success: true,
  executionCount: 1,
  stdout: '',
  stderr: '',
  displayData: [],
  error: null,
  executionTimeMs: 100,
  ...overrides,
});

describe('DEFAULT_KERNEL_CONFIG', () => {
  it('has expected default values', () => {
    expect(DEFAULT_KERNEL_CONFIG.timeoutSecs).toBe(60);
    expect(DEFAULT_KERNEL_CONFIG.maxOutputSize).toBe(1024 * 1024);
    expect(DEFAULT_KERNEL_CONFIG.startupTimeoutSecs).toBe(30);
    expect(DEFAULT_KERNEL_CONFIG.idleTimeoutSecs).toBe(3600);
  });
});

describe('DEFAULT_EXECUTION_OPTIONS', () => {
  it('has expected default values', () => {
    expect(DEFAULT_EXECUTION_OPTIONS.stopOnError).toBe(true);
    expect(DEFAULT_EXECUTION_OPTIONS.timeout).toBe(60000);
    expect(DEFAULT_EXECUTION_OPTIONS.clearOutputs).toBe(true);
  });
});

describe('isExecutionSuccessful', () => {
  it('returns true for successful result with no error', () => {
    expect(isExecutionSuccessful(createMockResult())).toBe(true);
  });

  it('returns false when success is false', () => {
    expect(isExecutionSuccessful(createMockResult({ success: false }))).toBe(false);
  });

  it('returns false when error is present', () => {
    const result = createMockResult({
      success: true,
      error: { ename: 'Error', evalue: 'msg', traceback: [] },
    });
    expect(isExecutionSuccessful(result)).toBe(false);
  });

  it('returns false when both success is false and error is present', () => {
    const result = createMockResult({
      success: false,
      error: { ename: 'Error', evalue: 'msg', traceback: [] },
    });
    expect(isExecutionSuccessful(result)).toBe(false);
  });
});

describe('getTextOutput', () => {
  it('returns stdout when present', () => {
    expect(getTextOutput(createMockResult({ stdout: 'Hello' }))).toBe('Hello');
  });

  it('returns text/plain display data when no stdout', () => {
    const result = createMockResult({
      stdout: '',
      displayData: [{ mimeType: 'text/plain', data: 'display text' }],
    });
    expect(getTextOutput(result)).toBe('display text');
  });

  it('returns empty string when no text output', () => {
    expect(getTextOutput(createMockResult())).toBe('');
  });

  it('prefers stdout over display data', () => {
    const result = createMockResult({
      stdout: 'stdout text',
      displayData: [{ mimeType: 'text/plain', data: 'display text' }],
    });
    expect(getTextOutput(result)).toBe('stdout text');
  });
});

describe('getHtmlOutput', () => {
  it('returns HTML data when present', () => {
    const result = createMockResult({
      displayData: [{ mimeType: 'text/html', data: '<b>bold</b>' }],
    });
    expect(getHtmlOutput(result)).toBe('<b>bold</b>');
  });

  it('returns null when no HTML data', () => {
    expect(getHtmlOutput(createMockResult())).toBeNull();
  });

  it('returns null when only non-HTML display data exists', () => {
    const result = createMockResult({
      displayData: [{ mimeType: 'text/plain', data: 'plain' }],
    });
    expect(getHtmlOutput(result)).toBeNull();
  });
});

describe('getImageOutput', () => {
  it('returns PNG image data', () => {
    const result = createMockResult({
      displayData: [{ mimeType: 'image/png', data: 'pngbase64' }],
    });
    expect(getImageOutput(result)).toBe('pngbase64');
  });

  it('returns JPEG image data', () => {
    const result = createMockResult({
      displayData: [{ mimeType: 'image/jpeg', data: 'jpegbase64' }],
    });
    expect(getImageOutput(result)).toBe('jpegbase64');
  });

  it('returns null when no image data', () => {
    expect(getImageOutput(createMockResult())).toBeNull();
  });

  it('returns null for SVG (not matched)', () => {
    const result = createMockResult({
      displayData: [{ mimeType: 'image/svg+xml', data: '<svg/>' }],
    });
    expect(getImageOutput(result)).toBeNull();
  });
});

describe('formatExecutionError', () => {
  it('returns joined traceback when available', () => {
    const error: ExecutionError = {
      ename: 'ValueError',
      evalue: 'bad value',
      traceback: ['line 1', 'line 2', 'ValueError: bad value'],
    };
    expect(formatExecutionError(error)).toBe('line 1\nline 2\nValueError: bad value');
  });

  it('returns ename: evalue when no traceback', () => {
    const error: ExecutionError = {
      ename: 'TypeError',
      evalue: 'unsupported',
      traceback: [],
    };
    expect(formatExecutionError(error)).toBe('TypeError: unsupported');
  });
});

describe('createDefaultSession', () => {
  it('creates session with correct name and envPath', () => {
    const session = createDefaultSession('Test', '/env/path');
    expect(session.name).toBe('Test');
    expect(session.envPath).toBe('/env/path');
  });

  it('sets kernelId to null', () => {
    const session = createDefaultSession('Test', '/env');
    expect(session.kernelId).toBeNull();
  });

  it('sets lastActivityAt to null', () => {
    const session = createDefaultSession('Test', '/env');
    expect(session.lastActivityAt).toBeNull();
  });

  it('sets empty metadata', () => {
    const session = createDefaultSession('Test', '/env');
    expect(session.metadata).toEqual({});
  });

  it('sets createdAt to a valid ISO string', () => {
    const session = createDefaultSession('Test', '/env');
    expect(session.createdAt).toBeDefined();
    expect(() => new Date(session.createdAt!)).not.toThrow();
  });
});

describe('formatExecutionTime', () => {
  it('formats milliseconds for < 1 second', () => {
    expect(formatExecutionTime(500)).toBe('500ms');
    expect(formatExecutionTime(0)).toBe('0ms');
    expect(formatExecutionTime(999)).toBe('999ms');
  });

  it('formats seconds for 1s to < 60s', () => {
    expect(formatExecutionTime(1000)).toBe('1.00s');
    expect(formatExecutionTime(1500)).toBe('1.50s');
    expect(formatExecutionTime(59999)).toBe('60.00s');
  });

  it('formats minutes and seconds for >= 60s', () => {
    expect(formatExecutionTime(60000)).toBe('1m 0.0s');
    expect(formatExecutionTime(90000)).toBe('1m 30.0s');
    expect(formatExecutionTime(125000)).toBe('2m 5.0s');
  });
});
