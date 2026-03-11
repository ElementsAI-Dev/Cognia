import { normalizeBridgeMessage, normalizeSandpackStatus } from './runtime-events';

describe('sandbox runtime event normalization', () => {
  it('normalizes sandpack status values', () => {
    expect(normalizeSandpackStatus('running')).toBe('loading');
    expect(normalizeSandpackStatus('ready')).toBe('ready');
    expect(normalizeSandpackStatus('timeout')).toBe('error');
    expect(normalizeSandpackStatus(undefined)).toBe('idle');
  });

  it('normalizes preview console bridge events', () => {
    expect(
      normalizeBridgeMessage({
        type: 'preview-console',
        level: 'warn',
        message: 'warn message',
        timestamp: 123,
      })
    ).toEqual({
      type: 'console',
      level: 'warn',
      message: 'warn message',
      timestamp: 123,
    });
  });

  it('normalizes preview runtime errors', () => {
    expect(
      normalizeBridgeMessage({
        type: 'preview-error',
        message: 'Boom',
        stack: 'stack',
      })
    ).toEqual({
      type: 'runtime-error',
      message: 'Boom',
      stack: 'stack',
    });
  });

  it('returns null for unsupported payloads', () => {
    expect(normalizeBridgeMessage(null)).toBeNull();
    expect(normalizeBridgeMessage({ type: 'unknown' })).toBeNull();
  });
});
